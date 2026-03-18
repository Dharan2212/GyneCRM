'use strict';

const { db } = require('../db/connection');
const logger = require('../utils/logger');

/**
 * dayCloseJob
 *
 * Architecture 23.2 + Phase 2 Migration 045:
 *   Cron at 23:55 daily (Asia/Kolkata).
 *   Generates a daily close summary per hospital/branch combination.
 *   Inserts into day_close_summaries. Upserts by unique key (hospital_id, branch_id, summary_date).
 *
 * Summary fields (Phase 2 locked):
 *   - total_invoices         : COUNT of invoices for the branch/date
 *   - total_revenue          : SUM of invoices.total_amount
 *   - total_paid             : SUM of payments.amount for invoices of this branch/date
 *   - total_pending          : total_revenue - total_paid
 *   - payment_mode_breakdown : JSONB {cash, card, upi, ...} from payments.payment_mode
 *   - total_appointments     : COUNT of appointments for the branch/date
 *   - total_completed        : COUNT of appointments WHERE status = 'completed'
 *   - total_missed           : COUNT of appointments WHERE status IN ('no_show', 'missed')
 *   - generated_at           : NOW()
 *
 * Safety:
 *   - Uses INSERT ... ON CONFLICT (hospital_id, branch_id, summary_date) DO UPDATE
 *     so the job is safe to re-run if needed (admin regeneration).
 *   - No event dispatch required (architecture 23.2 does not specify one for day-close).
 *   - Processes one branch at a time to keep queries isolated.
 *
 * Schema (Phase 2 locked):
 *   invoices: id, hospital_id, branch_id, total_amount, created_at, is_deleted
 *   payments: id, invoice_id, amount, payment_mode, created_at
 *   appointments: id, hospital_id, branch_id, appointment_date, status, is_deleted
 *   branches: id, hospital_id, is_active
 *   day_close_summaries: id, hospital_id, branch_id, summary_date,
 *                        total_invoices, total_revenue, total_paid, total_pending,
 *                        payment_mode_breakdown, total_appointments, total_completed,
 *                        total_missed, generated_at
 */
async function runDayCloseJob() {
  // Summary date is today in IST. Since we run at 23:55, this is the current date.
  const now = new Date();
  const summaryDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD

  logger.info('[dayCloseJob] Running.', { summaryDate: summaryDateStr });

  // Get all active branches across all hospitals.
  const branches = await db('branches as b')
    .join('hospitals as h', 'h.id', 'b.hospital_id')
    .where('b.is_active', true)
    .select('b.id as branch_id', 'b.hospital_id');

  if (branches.length === 0) {
    logger.info('[dayCloseJob] No active branches found. Exiting.');
    return;
  }

  logger.info(`[dayCloseJob] Generating summaries for ${branches.length} branch(es).`);

  let successCount = 0;
  let failCount = 0;

  for (const branch of branches) {
    try {
      // ── Invoice summary ──────────────────────────────────────────────────
      const invoiceSummary = await db('invoices')
        .where('hospital_id', branch.hospital_id)
        .where('branch_id', branch.branch_id)
        .whereRaw(`DATE(created_at AT TIME ZONE 'Asia/Kolkata') = ?`, [summaryDateStr])
        .where('is_deleted', false)
        .select(
          db.raw('COUNT(*) as total_invoices'),
          db.raw('COALESCE(SUM(total_amount), 0) as total_revenue'),
        )
        .first();

      const totalInvoices = parseInt(invoiceSummary.total_invoices, 10) || 0;
      const totalRevenue = parseFloat(invoiceSummary.total_revenue) || 0;

      // ── Payment summary ──────────────────────────────────────────────────
      // Join payments to invoices of this branch/date.
      const paymentRows = await db('payments as pay')
        .join('invoices as inv', 'inv.id', 'pay.invoice_id')
        .where('inv.hospital_id', branch.hospital_id)
        .where('inv.branch_id', branch.branch_id)
        .whereRaw(`DATE(pay.created_at AT TIME ZONE 'Asia/Kolkata') = ?`, [summaryDateStr])
        .where('inv.is_deleted', false)
        .select(
          db.raw('COALESCE(SUM(pay.amount), 0) as total_paid'),
          'pay.payment_mode',
          db.raw('SUM(pay.amount) as mode_total'),
        )
        .groupBy('pay.payment_mode');

      let totalPaid = 0;
      const paymentModeBreakdown = {};

      for (const row of paymentRows) {
        const modeTotal = parseFloat(row.mode_total) || 0;
        totalPaid += modeTotal;
        if (row.payment_mode) {
          paymentModeBreakdown[row.payment_mode] = parseFloat(modeTotal.toFixed(2));
        }
      }

      totalPaid = parseFloat(totalPaid.toFixed(2));
      const totalPending = parseFloat((totalRevenue - totalPaid).toFixed(2));

      // ── Appointment summary ──────────────────────────────────────────────
      const apptSummary = await db('appointments')
        .where('hospital_id', branch.hospital_id)
        .where('branch_id', branch.branch_id)
        .whereRaw(`appointment_date = ?`, [summaryDateStr])
        .where('is_deleted', false)
        .select(
          db.raw('COUNT(*) as total_appointments'),
          db.raw(`COUNT(*) FILTER (WHERE status = 'completed') as total_completed`),
          db.raw(`COUNT(*) FILTER (WHERE status IN ('no_show')) as total_missed`),
        )
        .first();

      const totalAppointments = parseInt(apptSummary.total_appointments, 10) || 0;
      const totalCompleted = parseInt(apptSummary.total_completed, 10) || 0;
      const totalMissed = parseInt(apptSummary.total_missed, 10) || 0;

      // ── Upsert into day_close_summaries ──────────────────────────────────
      await db('day_close_summaries')
        .insert({
          hospital_id: branch.hospital_id,
          branch_id: branch.branch_id,
          summary_date: summaryDateStr,
          total_invoices: totalInvoices,
          total_revenue: totalRevenue,
          total_paid: totalPaid,
          total_pending: totalPending,
          payment_mode_breakdown: JSON.stringify(paymentModeBreakdown),
          total_appointments: totalAppointments,
          total_completed: totalCompleted,
          total_missed: totalMissed,
          generated_at: db.fn.now(),
        })
        .onConflict(['hospital_id', 'branch_id', 'summary_date'])
        .merge([
          'total_invoices',
          'total_revenue',
          'total_paid',
          'total_pending',
          'payment_mode_breakdown',
          'total_appointments',
          'total_completed',
          'total_missed',
          'generated_at',
        ]);

      successCount++;
      logger.debug(`[dayCloseJob] Summary generated for branch ${branch.branch_id}`, {
        hospitalId: branch.hospital_id,
        summaryDate: summaryDateStr,
        totalInvoices,
        totalRevenue,
        totalPaid,
        totalPending,
        totalAppointments,
        totalCompleted,
        totalMissed,
      });
    } catch (err) {
      failCount++;
      logger.error(`[dayCloseJob] Failed for branch ${branch.branch_id}`, {
        hospitalId: branch.hospital_id,
        message: err.message,
      });
    }
  }

  logger.info(`[dayCloseJob] Done. Summaries generated: ${successCount} | Failed: ${failCount}`);
}

module.exports = { runDayCloseJob };
