'use strict';

/**
 * Analytics Repository — Phase 5 Batch 7
 *
 * Rules enforced:
 * - All queries scoped by hospital_id ($1 always)
 * - branch_id filter applied only where table has branch_id column
 * - Parameterized queries only — no string interpolation
 * - Read-only SELECT queries only
 * - No analytics cache — live PostgreSQL data
 *
 * Branch-awareness per DB spec:
 * - appointments         → HAS branch_id ✓
 * - invoices/payments    → payments has branch_id ✓
 * - pregnancies          → NO branch_id (hospital-scoped only)
 * - deliveries           → NO branch_id (hospital-scoped only)
 * - patient_test_orders  → NO branch_id (hospital-scoped only)
 * - day_close_summaries  → HAS branch_id ✓
 * - consultations        → HAS branch_id (via doctor_branch_assignments)
 * - doctor_branch_assignments → HAS branch_id ✓
 */

const { db } = require('../../db/connection');

// ─── Utility: get today's date string YYYY-MM-DD ──────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Utility: get first day of current month as YYYY-MM-DD ───────────────────
function monthStartStr() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

// ─── Utility: get start of current week (Sunday) as YYYY-MM-DD ───────────────
function weekStartStr() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  return new Date(now.getFullYear(), now.getMonth(), diff).toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. OVERVIEW KPIs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns 4 KPI counters:
 * - total_patients (hospital-wide, no branch filter)
 * - today_appointments (branch-aware)
 * - active_pregnancies (hospital-wide — pregnancies has no branch_id)
 * - deliveries_this_month (hospital-wide — deliveries has no branch_id)
 */
async function getOverviewKPIs(hospitalId, branchId) {
  // 1a. Total patients — hospital-wide
  const patientsResult = await db.query(
    `SELECT COUNT(*)::int AS total_patients
     FROM patients
     WHERE hospital_id = $1
       AND is_deleted = false`,
    [hospitalId]
  );

  // 1b. Today's appointments — branch-aware
  const apptParams = [hospitalId, todayStr()];
  let apptBranchClause = '';
  if (branchId) {
    apptParams.push(branchId);
    apptBranchClause = `AND branch_id = $${apptParams.length}`;
  }
  const apptResult = await db.query(
    `SELECT COUNT(*)::int AS today_appointments
     FROM appointments
     WHERE hospital_id = $1
       AND appointment_date = $2
       AND status NOT IN ('cancelled', 'no_show')
       AND is_deleted = false
       ${apptBranchClause}`,
    apptParams
  );

  // 1c. Active pregnancies — hospital-wide (no branch_id column)
  const pregResult = await db.query(
    `SELECT COUNT(*)::int AS active_pregnancies
     FROM pregnancies
     WHERE hospital_id = $1
       AND status = 'active'`,
    [hospitalId]
  );

  // 1d. Deliveries this month — hospital-wide (no branch_id column)
  const delivResult = await db.query(
    `SELECT COUNT(*)::int AS deliveries_this_month
     FROM deliveries
     WHERE hospital_id = $1
       AND delivery_date >= $2`,
    [hospitalId, monthStartStr()]
  );

  return {
    total_patients: patientsResult.rows[0].total_patients,
    today_appointments: apptResult.rows[0].today_appointments,
    active_pregnancies: pregResult.rows[0].active_pregnancies,
    deliveries_this_month: delivResult.rows[0].deliveries_this_month,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. REVENUE SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Revenue summary: today / this week / this month + optional custom range.
 * Payment mode breakdown included.
 * Branch-aware via payments.branch_id.
 */
async function getRevenueSummary(hospitalId, branchId, dateFrom, dateTo) {
  const buildQuery = (fromDate, toDate) => {
    const params = [hospitalId, fromDate, toDate];
    let branchClause = '';
    if (branchId) {
      params.push(branchId);
      branchClause = `AND p.branch_id = $${params.length}`;
    }
    const sql = `
      SELECT
        COALESCE(SUM(p.amount_paid), 0)::numeric(14,2)                                    AS total_collected,
        COUNT(p.id)::int                                                                   AS payment_count,
        COALESCE(SUM(p.amount_paid) FILTER (WHERE p.payment_mode = 'cash'),         0)::numeric(14,2) AS cash,
        COALESCE(SUM(p.amount_paid) FILTER (WHERE p.payment_mode = 'card'),         0)::numeric(14,2) AS card,
        COALESCE(SUM(p.amount_paid) FILTER (WHERE p.payment_mode = 'upi'),          0)::numeric(14,2) AS upi,
        COALESCE(SUM(p.amount_paid) FILTER (WHERE p.payment_mode = 'bank_transfer'),0)::numeric(14,2) AS bank_transfer,
        COALESCE(SUM(p.amount_paid) FILTER (WHERE p.payment_mode = 'insurance'),    0)::numeric(14,2) AS insurance,
        COALESCE(SUM(p.amount_paid) FILTER (WHERE p.payment_mode = 'online'),       0)::numeric(14,2) AS online
      FROM payments p
      WHERE p.hospital_id = $1
        AND DATE(p.created_at) >= $2
        AND DATE(p.created_at) <= $3
        AND p.status = 'completed'
        AND p.is_voided = false
        ${branchClause}
    `;
    return { sql, params };
  };

  const formatRow = (row) => ({
    total_collected: parseFloat(row.total_collected),
    payment_count: row.payment_count,
    breakdown: {
      cash: parseFloat(row.cash),
      card: parseFloat(row.card),
      upi: parseFloat(row.upi),
      bank_transfer: parseFloat(row.bank_transfer),
      insurance: parseFloat(row.insurance),
      online: parseFloat(row.online),
    },
  });

  const today = todayStr();
  const weekStart = weekStartStr();
  const monthStart = monthStartStr();

  const [todayRes, weekRes, monthRes] = await Promise.all([
    db.query(buildQuery(today, today).sql, buildQuery(today, today).params),
    db.query(buildQuery(weekStart, today).sql, buildQuery(weekStart, today).params),
    db.query(buildQuery(monthStart, today).sql, buildQuery(monthStart, today).params),
  ]);

  let customRange = null;
  if (dateFrom && dateTo) {
    const customQ = buildQuery(dateFrom, dateTo);
    const customRes = await db.query(customQ.sql, customQ.params);
    customRange = {
      from: dateFrom,
      to: dateTo,
      ...formatRow(customRes.rows[0]),
    };
  }

  return {
    today: formatRow(todayRes.rows[0]),
    this_week: { from: weekStart, to: today, ...formatRow(weekRes.rows[0]) },
    this_month: { from: monthStart, to: today, ...formatRow(monthRes.rows[0]) },
    custom_range: customRange,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. APPOINTMENT STATS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Appointment stats: totals by status, missed/cancelled counts,
 * daily breakdown for chart rendering.
 * Branch-aware and doctor-filterable.
 */
async function getAppointmentStats(hospitalId, branchId, dateFrom, dateTo, doctorId) {
  const from = dateFrom || monthStartStr();
  const to   = dateTo   || todayStr();

  const params = [hospitalId, from, to];
  const filters = [];

  if (branchId) {
    params.push(branchId);
    filters.push(`AND branch_id = $${params.length}`);
  }
  if (doctorId) {
    params.push(doctorId);
    filters.push(`AND doctor_id = $${params.length}`);
  }

  const filterStr = filters.join(' ');

  const [summaryRes, dailyRes] = await Promise.all([
    db.query(
      `SELECT
         COUNT(*)::int                                                      AS total,
         COUNT(*) FILTER (WHERE status = 'completed')::int                AS completed,
         COUNT(*) FILTER (WHERE status = 'confirmed')::int                AS confirmed,
         COUNT(*) FILTER (WHERE status = 'pending')::int                  AS pending,
         COUNT(*) FILTER (WHERE status = 'cancelled')::int                AS cancelled,
         COUNT(*) FILTER (WHERE status = 'no_show')::int                  AS no_show,
         COUNT(*) FILTER (WHERE status = 'rescheduled')::int              AS rescheduled,
         COUNT(*) FILTER (WHERE status IN ('no_show','cancelled'))::int   AS missed_or_cancelled
       FROM appointments
       WHERE hospital_id = $1
         AND appointment_date >= $2
         AND appointment_date <= $3
         AND is_deleted = false
         ${filterStr}`,
      params
    ),
    db.query(
      `SELECT
         appointment_date::text                                            AS date,
         COUNT(*)::int                                                     AS total,
         COUNT(*) FILTER (WHERE status = 'completed')::int               AS completed,
         COUNT(*) FILTER (WHERE status IN ('no_show','cancelled'))::int  AS missed_or_cancelled
       FROM appointments
       WHERE hospital_id = $1
         AND appointment_date >= $2
         AND appointment_date <= $3
         AND is_deleted = false
         ${filterStr}
       GROUP BY appointment_date
       ORDER BY appointment_date ASC`,
      params
    ),
  ]);

  return {
    date_range: { from, to },
    summary: summaryRes.rows[0],
    daily_breakdown: dailyRes.rows,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DOCTOR WORKLOAD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Consultations per doctor in last N weeks.
 * Branch filter via doctor_branch_assignments JOIN.
 */
async function getDoctorWorkload(hospitalId, branchId, weeks) {
  const numWeeks = parseInt(weeks, 10) || 4;
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - numWeeks * 7);
  const fromDateStr = fromDate.toISOString().slice(0, 10);

  const params = [hospitalId, fromDateStr];
  let branchJoin  = '';
  let branchFilter = '';

  if (branchId) {
    params.push(branchId);
    branchJoin = `
      JOIN doctor_branch_assignments dba
        ON dba.doctor_id = d.id
       AND dba.hospital_id = $1
       AND dba.branch_id = $${params.length}
       AND dba.is_active = true`;
    branchFilter = `AND c.branch_id = $${params.length}`;
  }

  const result = await db.query(
    `SELECT
       d.id                                                             AS doctor_id,
       u.full_name                                                      AS doctor_name,
       d.specialization,
       COUNT(c.id)::int                                                 AS total_consultations,
       COUNT(c.id) FILTER (WHERE DATE(c.created_at) = CURRENT_DATE)::int AS today_consultations
     FROM doctors d
     JOIN users u ON u.id = d.user_id AND u.is_deleted = false
     ${branchJoin}
     LEFT JOIN consultations c
       ON  c.doctor_id    = d.id
       AND c.hospital_id  = $1
       AND DATE(c.created_at) >= $2
       AND c.status       = 'finalized'
       ${branchFilter}
     WHERE d.hospital_id = $1
       AND d.is_active   = true
     GROUP BY d.id, u.full_name, d.specialization
     ORDER BY total_consultations DESC`,
    params
  );

  const rows = result.rows.map((row) => ({
    ...row,
    avg_per_week:
      numWeeks > 0
        ? parseFloat((row.total_consultations / numWeeks).toFixed(1))
        : 0,
  }));

  return {
    period_weeks: numWeeks,
    from_date: fromDateStr,
    to_date: todayStr(),
    doctors: rows,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PATIENT RETENTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Patients with >1 completed appointment in last 90 days as % of
 * total patients who had at least one completed appointment in that period.
 * Branch-aware.
 */
async function getPatientRetention(hospitalId, branchId) {
  const params = [hospitalId];
  let branchClause = '';
  if (branchId) {
    params.push(branchId);
    branchClause = `AND branch_id = $${params.length}`;
  }

  const result = await db.query(
    `WITH recent_visits AS (
       SELECT patient_id, COUNT(id) AS visit_count
       FROM appointments
       WHERE hospital_id = $1
         AND appointment_date >= CURRENT_DATE - INTERVAL '90 days'
         AND status = 'completed'
         AND is_deleted = false
         ${branchClause}
       GROUP BY patient_id
     )
     SELECT
       COUNT(*)::int                                            AS total_active_patients,
       COUNT(*) FILTER (WHERE visit_count > 1)::int            AS retained_patients,
       CASE
         WHEN COUNT(*) = 0 THEN 0
         ELSE ROUND(
           COUNT(*) FILTER (WHERE visit_count > 1)::numeric
           / COUNT(*) * 100, 1
         )
       END                                                      AS retention_rate_pct
     FROM recent_visits`,
    params
  );

  return {
    period_days: 90,
    ...result.rows[0],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. HIGH-RISK PREGNANCIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Active high-risk pregnancies count + list.
 * pregnancies table has no branch_id — hospital-wide only.
 */
async function getHighRiskPregnancies(hospitalId) {
  const [countRes, listRes] = await Promise.all([
    db.query(
      `SELECT COUNT(*)::int AS high_risk_count
       FROM pregnancies
       WHERE hospital_id = $1
         AND status = 'active'
         AND is_high_risk = true`,
      [hospitalId]
    ),
    db.query(
      `SELECT
         pr.id                    AS pregnancy_id,
         pr.patient_id,
         u.full_name              AS patient_name,
         pat.phone                AS patient_phone,
         pr.lmp_date,
         pr.edd,
         pr.pregnancy_week,
         pr.gravida,
         pr.para,
         pr.high_risk_reason,
         pr.created_at,
         doc_u.full_name          AS managing_doctor_name,
         d.specialization
       FROM pregnancies pr
       JOIN patients pat ON pat.id = pr.patient_id
       JOIN users u      ON u.id   = pat.user_id
       LEFT JOIN doctors d     ON d.id     = pr.doctor_id
       LEFT JOIN users doc_u   ON doc_u.id = d.user_id
       WHERE pr.hospital_id = $1
         AND pr.status      = 'active'
         AND pr.is_high_risk = true
       ORDER BY pr.created_at DESC
       LIMIT 200`,
      [hospitalId]
    ),
  ]);

  return {
    high_risk_count: countRes.rows[0].high_risk_count,
    pregnancies: listRes.rows,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. TEST COMPLETION RATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * % of ordered tests with results uploaded on time.
 * patient_test_orders has no branch_id — hospital-wide only.
 */
async function getTestCompletionRate(hospitalId, dateFrom, dateTo) {
  const from = dateFrom || monthStartStr();
  const to   = dateTo   || todayStr();

  const result = await db.query(
    `SELECT
       COUNT(*)::int                                                                               AS total_ordered,
       COUNT(*) FILTER (WHERE status = 'result_uploaded')::int                                   AS completed,
       COUNT(*) FILTER (WHERE status = 'result_uploaded'
                          AND DATE(result_uploaded_at) <= due_date)::int                          AS completed_on_time,
       COUNT(*) FILTER (WHERE status != 'result_uploaded'
                          AND due_date < CURRENT_DATE
                          AND status != 'skipped')::int                                           AS overdue,
       COUNT(*) FILTER (WHERE status = 'skipped')::int                                           AS skipped,
       COUNT(*) FILTER (WHERE status = 'pending')::int                                           AS pending,
       CASE
         WHEN COUNT(*) FILTER (WHERE status != 'skipped') = 0 THEN 0
         ELSE ROUND(
           COUNT(*) FILTER (WHERE status = 'result_uploaded')::numeric
           / NULLIF(COUNT(*) FILTER (WHERE status != 'skipped'), 0) * 100, 1
         )
       END                                                                                        AS completion_rate_pct,
       CASE
         WHEN COUNT(*) FILTER (WHERE status = 'result_uploaded') = 0 THEN 0
         ELSE ROUND(
           COUNT(*) FILTER (WHERE status = 'result_uploaded'
                              AND DATE(result_uploaded_at) <= due_date)::numeric
           / NULLIF(COUNT(*) FILTER (WHERE status = 'result_uploaded'), 0) * 100, 1
         )
       END                                                                                        AS on_time_rate_pct
     FROM patient_test_orders
     WHERE hospital_id = $1
       AND DATE(created_at) >= $2
       AND DATE(created_at) <= $3`,
    [hospitalId, from, to]
  );

  return {
    date_range: { from, to },
    ...result.rows[0],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. DAY CLOSE SUMMARIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieve day_close_summaries for a date range, optionally filtered by branch.
 */
async function getDayCloseSummaries(hospitalId, branchId, dateFrom, dateTo) {
  const from = dateFrom || monthStartStr();
  const to   = dateTo   || todayStr();

  const params = [hospitalId, from, to];
  let branchClause = '';
  if (branchId) {
    params.push(branchId);
    branchClause = `AND dcs.branch_id = $${params.length}`;
  }

  const result = await db.query(
    `SELECT
       dcs.*,
       b.branch_name,
       u.full_name AS closed_by_name
     FROM day_close_summaries dcs
     LEFT JOIN branches b ON b.id    = dcs.branch_id
     LEFT JOIN users    u ON u.id    = dcs.closed_by
     WHERE dcs.hospital_id   = $1
       AND dcs.summary_date >= $2
       AND dcs.summary_date <= $3
       ${branchClause}
     ORDER BY dcs.summary_date DESC, b.branch_name ASC`,
    params
  );

  return {
    date_range: { from, to },
    total_records: result.rows.length,
    summaries: result.rows,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. DELIVERY STATS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Delivery stats with type and outcome breakdown + 6-month trend.
 * deliveries table has no branch_id — hospital-wide only.
 */
async function getDeliveryStats(hospitalId, dateFrom, dateTo) {
  const from = dateFrom || monthStartStr();
  const to   = dateTo   || todayStr();

  const [summaryRes, trendRes] = await Promise.all([
    db.query(
      `SELECT
         COUNT(*)::int                                                               AS total_deliveries,
         COUNT(*) FILTER (WHERE delivery_type = 'normal_vaginal')::int             AS normal_vaginal,
         COUNT(*) FILTER (WHERE delivery_type = 'instrumental')::int               AS instrumental,
         COUNT(*) FILTER (WHERE delivery_type = 'elective_cs')::int               AS elective_cs,
         COUNT(*) FILTER (WHERE delivery_type = 'emergency_cs')::int              AS emergency_cs,
         COUNT(*) FILTER (WHERE delivery_type = 'water_birth')::int               AS water_birth,
         COUNT(*) FILTER (WHERE birth_outcome = 'live_birth')::int                AS live_births,
         COUNT(*) FILTER (WHERE birth_outcome = 'stillbirth')::int                AS stillbirths,
         COUNT(*) FILTER (WHERE birth_outcome = 'neonatal_death')::int            AS neonatal_deaths
       FROM deliveries
       WHERE hospital_id = $1
         AND delivery_date >= $2
         AND delivery_date <= $3`,
      [hospitalId, from, to]
    ),
    db.query(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', delivery_date::timestamp), 'YYYY-MM') AS month,
         COUNT(*)::int AS total
       FROM deliveries
       WHERE hospital_id = $1
         AND delivery_date >= CURRENT_DATE - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', delivery_date::timestamp)
       ORDER BY DATE_TRUNC('month', delivery_date::timestamp) ASC`,
      [hospitalId]
    ),
  ]);

  return {
    date_range: { from, to },
    summary: summaryRes.rows[0],
    monthly_trend_6m: trendRes.rows,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. BRANCH ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregated KPIs for a specific branch.
 * Verifies branch belongs to hospital before querying.
 */
async function getBranchAnalytics(hospitalId, branchId) {
  // Verify branch ownership
  const branchRes = await db.query(
    `SELECT id, branch_name, address, phone, is_active
     FROM branches
     WHERE id = $2 AND hospital_id = $1`,
    [hospitalId, branchId]
  );

  if (!branchRes.rows.length) {
    return null; // Service layer throws 404
  }

  const today      = todayStr();
  const monthStart = monthStartStr();

  const [apptRes, revenueRes, doctorRes] = await Promise.all([
    db.query(
      `SELECT
         COUNT(*)::int                                                      AS total_this_month,
         COUNT(*) FILTER (WHERE status = 'completed')::int                AS completed,
         COUNT(*) FILTER (WHERE status IN ('no_show','cancelled'))::int   AS missed_or_cancelled,
         COUNT(*) FILTER (WHERE appointment_date = $3)::int               AS today_total
       FROM appointments
       WHERE hospital_id   = $1
         AND branch_id     = $2
         AND appointment_date >= $4
         AND is_deleted    = false`,
      [hospitalId, branchId, today, monthStart]
    ),
    db.query(
      `SELECT
         COALESCE(SUM(amount_paid), 0)::numeric(14,2) AS revenue_this_month,
         COUNT(id)::int                               AS payment_count
       FROM payments
       WHERE hospital_id = $1
         AND branch_id   = $2
         AND DATE(created_at) >= $3
         AND status      = 'completed'
         AND is_voided   = false`,
      [hospitalId, branchId, monthStart]
    ),
    db.query(
      `SELECT COUNT(DISTINCT doctor_id)::int AS active_doctors
       FROM doctor_branch_assignments
       WHERE hospital_id = $1
         AND branch_id   = $2
         AND is_active   = true`,
      [hospitalId, branchId]
    ),
  ]);

  return {
    branch: branchRes.rows[0],
    period_month_start: monthStart,
    appointments: apptRes.rows[0],
    revenue: {
      revenue_this_month: parseFloat(revenueRes.rows[0].revenue_this_month),
      payment_count: revenueRes.rows[0].payment_count,
    },
    active_doctors: doctorRes.rows[0].active_doctors,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  getOverviewKPIs,
  getRevenueSummary,
  getAppointmentStats,
  getDoctorWorkload,
  getPatientRetention,
  getHighRiskPregnancies,
  getTestCompletionRate,
  getDayCloseSummaries,
  getDeliveryStats,
  getBranchAnalytics,
};