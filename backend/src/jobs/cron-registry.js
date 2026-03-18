'use strict';

const cron   = require('node-cron');
const logger = require('../utils/logger');

const { runReminderJob24h }         = require('./reminderJob24h');
const { runReminderJob2h }          = require('./reminderJob2h');
const { runNoShowJob }              = require('./noShowJob');
const { runPregnancyWeekJob }       = require('./pregnancyWeekJob');
const { runTestOverdueJob }         = require('./testOverdueJob');
const { runPostpartumDueJob }       = require('./postpartumDueJob');
const { runFollowupDueJob }         = require('./followupDueJob');
const { runWaitlistExpiryJob }      = require('./waitlistExpiryJob');
const { runDayCloseJob }            = require('./dayCloseJob');
const { runWeeklyPregnancyTipsJob } = require('./weeklyPregnancyTipsJob');

const TIMEZONE = 'Asia/Kolkata';
let registered = false;

/**
 * Safely wraps a job runner so one failure does not crash the process
 * or affect other cron registrations.
 */
function safeRun(jobName, fn) {
  return async () => {
    try {
      logger.info(`[CRON] Starting job: ${jobName}`);
      await fn();
      logger.info(`[CRON] Completed job: ${jobName}`);
    } catch (err) {
      logger.error(`[CRON] Job failed: ${jobName}`, {
        message: err.message,
        stack:   err.stack,
      });
    }
  };
}

/**
 * Register all background cron jobs.
 * Safe to call once at application startup.
 * Idempotent guard prevents double-registration.
 */
function registerCronJobs() {
  if (registered) {
    logger.warn('[CRON] registerCronJobs() called more than once — skipping duplicate registration');
    return;
  }

  // ── Appointment reminder: 24-hour window ─────────────────────────────────
  cron.schedule('*/15 * * * *', safeRun('reminderJob24h', runReminderJob24h), {
    scheduled: true, timezone: TIMEZONE, name: 'reminderJob24h',
  });

  // ── Appointment reminder: 2-hour window ──────────────────────────────────
  cron.schedule('*/15 * * * *', safeRun('reminderJob2h', runReminderJob2h), {
    scheduled: true, timezone: TIMEZONE, name: 'reminderJob2h',
  });

  // ── No-show / missed appointment detector ────────────────────────────────
  cron.schedule('*/30 * * * *', safeRun('noShowJob', runNoShowJob), {
    scheduled: true, timezone: TIMEZONE, name: 'noShowJob',
  });

  // ── Pregnancy week recalculator + milestone trigger ───────────────────────
  cron.schedule('0 0 * * *', safeRun('pregnancyWeekJob', runPregnancyWeekJob), {
    scheduled: true, timezone: TIMEZONE, name: 'pregnancyWeekJob',
  });

  // ── Test overdue checker ──────────────────────────────────────────────────
  cron.schedule('0 1 * * *', safeRun('testOverdueJob', runTestOverdueJob), {
    scheduled: true, timezone: TIMEZONE, name: 'testOverdueJob',
  });

  // ── Postpartum follow-up due checker ──────────────────────────────────────
  cron.schedule('0 2 * * *', safeRun('postpartumDueJob', runPostpartumDueJob), {
    scheduled: true, timezone: TIMEZONE, name: 'postpartumDueJob',
  });

  // ── Clinical follow-up due checker (Phase 6 Batch 4) ─────────────────────
  // Fires FOLLOWUP_DUE for follow_ups table rows due in 2 days.
  cron.schedule('0 3 * * *', safeRun('followupDueJob', runFollowupDueJob), {
    scheduled: true, timezone: TIMEZONE, name: 'followupDueJob',
  });

  // ── Waitlist offer expiry ─────────────────────────────────────────────────
  cron.schedule('0 * * * *', safeRun('waitlistExpiryJob', runWaitlistExpiryJob), {
    scheduled: true, timezone: TIMEZONE, name: 'waitlistExpiryJob',
  });

  // ── Day-close summary generator ───────────────────────────────────────────
  cron.schedule('55 23 * * *', safeRun('dayCloseJob', runDayCloseJob), {
    scheduled: true, timezone: TIMEZONE, name: 'dayCloseJob',
  });

  // ── Weekly pregnancy tips ─────────────────────────────────────────────────
  cron.schedule('0 8 * * 1', safeRun('weeklyPregnancyTipsJob', runWeeklyPregnancyTipsJob), {
    scheduled: true, timezone: TIMEZONE, name: 'weeklyPregnancyTipsJob',
  });

  registered = true;

  logger.info('[CRON] All 10 background jobs registered successfully', {
    timezone: TIMEZONE,
    jobs: [
      'reminderJob24h          → */15 * * * *',
      'reminderJob2h           → */15 * * * *',
      'noShowJob               → */30 * * * *',
      'pregnancyWeekJob        → 0 0 * * *',
      'testOverdueJob          → 0 1 * * *',
      'postpartumDueJob        → 0 2 * * *',
      'followupDueJob          → 0 3 * * *',
      'waitlistExpiryJob       → 0 * * * *',
      'dayCloseJob             → 55 23 * * *',
      'weeklyPregnancyTipsJob  → 0 8 * * 1',
    ],
  });
}

module.exports = { registerCronJobs };
