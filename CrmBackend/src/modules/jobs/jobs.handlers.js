const Appointment = require('../../models/Appointment');
const Consultation = require('../../models/Consultation');
const Invoice = require('../../models/Invoice');
const FollowUp = require('../../models/FollowUp');
const Pregnancy = require('../../models/Pregnancy');
const Waitlist = require('../../models/Waitlist');
const Notification = require('../../models/Notification');
const Event = require('../../models/Event');
const { EVENT_TYPES } = require('../events/events.types');
const { getScopeDayParts, createEventAndNotifications } = require('./jobs.helpers');

async function runAppointmentReminders({ hospitalId, job, currentUser }) {
  const { start, end } = getScopeDayParts(job.scope_date || new Date());
  const appointments = await Appointment.find({
    hospital_id: hospitalId,
    status: 'scheduled',
    is_active: true,
    scheduled_at: { $gte: start, $lte: end },
  }).sort({ scheduled_at: 1 }).lean();

  const result = {
    scanned_count: appointments.length,
    queued_count: 0,
    skipped_count: 0,
    failed_count: 0,
  };
  const relatedEventIds = [];
  const relatedNotificationIds = [];

  for (const appointment of appointments) {
    const existing = await Event.countDocuments({
      hospital_id: hospitalId,
      source_type: 'appointment',
      source_id: appointment._id,
      event_type: EVENT_TYPES.APPOINTMENT_REMINDER,
      dispatch_requested_at: { $gte: start, $lte: end },
    });

    if (existing > 0) {
      result.skipped_count += 1;
      continue;
    }

    try {
      const dispatchResult = await createEventAndNotifications({
        hospitalId,
        eventType: EVENT_TYPES.APPOINTMENT_REMINDER,
        sourceType: 'appointment',
        sourceId: appointment._id,
        patientId: appointment.patient_id,
        doctorId: appointment.doctor_id,
        sourceNumber: null,
        payloadSnapshot: {
          body_summary: 'Appointment reminder queued from job foundation.',
          scheduled_at: appointment.scheduled_at,
          reason_for_visit: appointment.reason_for_visit || null,
        },
        metadata: {
          priority: 'normal',
          scheduled_for: null,
          job_id: job._id,
        },
        currentUser,
      });

      if (dispatchResult.skipped_reason) {
        result.skipped_count += 1;
        continue;
      }

      relatedEventIds.push(dispatchResult.event._id);
      relatedNotificationIds.push(...dispatchResult.notifications.map((item) => item._id));
      result.queued_count += dispatchResult.notifications.length;
    } catch (error) {
      result.failed_count += 1;
    }
  }

  return {
    status: result.scanned_count === 0 ? 'skipped' : 'completed',
    result_summary: {
      rule: 'Scheduled appointments on scope_date with status=scheduled are scanned. One appointment_reminder event per appointment per scope day is queued at most once.',
    },
    result_counts: result,
    related_event_ids: relatedEventIds,
    related_notification_ids: relatedNotificationIds,
    related_send_history_ids: [],
  };
}

async function runDayClose({ hospitalId, job }) {
  const { start, end } = getScopeDayParts(job.scope_date || new Date());

  const [appointmentsScheduled, appointmentsCheckedIn, appointmentsCancelled, appointmentsNoShow, consultationsInProgress, consultationsFinalised, invoicesCreated, invoicesPaid] = await Promise.all([
    Appointment.countDocuments({ hospital_id: hospitalId, scheduled_at: { $gte: start, $lte: end }, status: 'scheduled' }),
    Appointment.countDocuments({ hospital_id: hospitalId, scheduled_at: { $gte: start, $lte: end }, status: 'checked_in' }),
    Appointment.countDocuments({ hospital_id: hospitalId, scheduled_at: { $gte: start, $lte: end }, status: 'cancelled' }),
    Appointment.countDocuments({ hospital_id: hospitalId, scheduled_at: { $gte: start, $lte: end }, status: 'no_show' }),
    Consultation.countDocuments({ hospital_id: hospitalId, status: 'in_progress' }),
    Consultation.countDocuments({ hospital_id: hospitalId, status: 'finalised', finalised_at: { $gte: start, $lte: end } }),
    Invoice.countDocuments({ hospital_id: hospitalId, createdAt: { $gte: start, $lte: end } }),
    Invoice.countDocuments({ hospital_id: hospitalId, status: 'paid', updatedAt: { $gte: start, $lte: end } }),
  ]);

  return {
    status: 'completed',
    result_summary: {
      rule: 'Non-destructive operational summary only. Invoice paid count is approximated using paid status records updated within scope_date because the current invoice model does not store a dedicated paid_at field.',
      scope_date: start.toISOString(),
    },
    result_counts: {
      appointments_scheduled: appointmentsScheduled,
      appointments_checked_in: appointmentsCheckedIn,
      appointments_cancelled: appointmentsCancelled,
      appointments_no_show: appointmentsNoShow,
      consultations_in_progress: consultationsInProgress,
      consultations_finalised: consultationsFinalised,
      invoices_created_today: invoicesCreated,
      invoices_paid_today_by_status_update: invoicesPaid,
    },
    related_event_ids: [],
    related_notification_ids: [],
    related_send_history_ids: [],
  };
}

async function runPregnancyWeekUpdate({ hospitalId, job }) {
  const pregnancies = await Pregnancy.find({ hospital_id: hospitalId, status: 'active', is_active: true });
  const counts = { scanned_count: pregnancies.length, updated_count: 0, skipped_count: 0, failed_count: 0 };

  for (const pregnancy of pregnancies) {
    try {
      if (!pregnancy.lmp_date) {
        counts.skipped_count += 1;
        continue;
      }

      const current = pregnancy.getCurrentGestationalAge();
      const trimester = pregnancy.getCurrentTrimester();
      const changed = (
        pregnancy.gestational_age_weeks !== current.weeks ||
        pregnancy.gestational_age_days !== current.days ||
        pregnancy.trimester !== trimester
      );

      if (!changed) {
        counts.skipped_count += 1;
        continue;
      }

      pregnancy.gestational_age_weeks = current.weeks;
      pregnancy.gestational_age_days = current.days;
      pregnancy.trimester = trimester;
      await pregnancy.save();
      counts.updated_count += 1;
    } catch (error) {
      counts.failed_count += 1;
    }
  }

  return {
    status: counts.scanned_count === 0 ? 'skipped' : 'completed',
    result_summary: {
      rule: 'Only active pregnancies with lmp_date are recalculated and saved when stored gestational values drift.',
    },
    result_counts: counts,
    related_event_ids: [],
    related_notification_ids: [],
    related_send_history_ids: [],
  };
}

async function runFollowUpDue({ hospitalId, job, currentUser }) {
  const { end, start } = getScopeDayParts(job.scope_date || new Date());
  const followUps = await FollowUp.find({
    hospital_id: hospitalId,
    status: 'pending',
    is_active: true,
    due_date: { $lte: end },
  }).sort({ due_date: 1 }).lean();

  const result = { scanned_count: followUps.length, queued_count: 0, skipped_count: 0, failed_count: 0 };
  const relatedEventIds = [];
  const relatedNotificationIds = [];

  for (const followUp of followUps) {
    const existing = await Event.countDocuments({
      hospital_id: hospitalId,
      source_type: 'follow_up',
      source_id: followUp._id,
      event_type: EVENT_TYPES.FOLLOW_UP_DUE,
      dispatch_requested_at: { $gte: start, $lte: end },
    });

    if (existing > 0) {
      result.skipped_count += 1;
      continue;
    }

    try {
      const dispatchResult = await createEventAndNotifications({
        hospitalId,
        eventType: EVENT_TYPES.FOLLOW_UP_DUE,
        sourceType: 'follow_up',
        sourceId: followUp._id,
        patientId: followUp.patient_id,
        doctorId: followUp.doctor_id,
        sourceNumber: null,
        payloadSnapshot: {
          body_summary: 'Follow-up due reminder queued from job foundation.',
          due_date: followUp.due_date,
          reason: followUp.reason || null,
        },
        metadata: {
          priority: followUp.priority || 'normal',
          scheduled_for: null,
          job_id: job._id,
        },
        currentUser,
      });

      if (dispatchResult.skipped_reason) {
        result.skipped_count += 1;
        continue;
      }

      relatedEventIds.push(dispatchResult.event._id);
      relatedNotificationIds.push(...dispatchResult.notifications.map((item) => item._id));
      result.queued_count += dispatchResult.notifications.length;
    } catch (error) {
      result.failed_count += 1;
    }
  }

  return {
    status: result.scanned_count === 0 ? 'skipped' : 'completed',
    result_summary: {
      rule: 'Pending follow-ups due on or before scope_date are evaluated. One follow_up_due event per follow-up per scope day is queued at most once.',
    },
    result_counts: result,
    related_event_ids: relatedEventIds,
    related_notification_ids: relatedNotificationIds,
    related_send_history_ids: [],
  };
}

async function runWaitlistExpiry({ hospitalId, job }) {
  const { start } = getScopeDayParts(job.scope_date || new Date());
  const candidates = await Waitlist.find({
    hospital_id: hospitalId,
    status: 'waiting',
    is_active: true,
    desired_date: { $lt: start },
  });

  const counts = { scanned_count: candidates.length, expired_count: 0, skipped_count: 0, failed_count: 0 };

  for (const item of candidates) {
    try {
      item.status = 'expired';
      item.is_active = false;
      await item.save();
      counts.expired_count += 1;
    } catch (error) {
      counts.failed_count += 1;
    }
  }

  return {
    status: counts.scanned_count === 0 ? 'skipped' : 'completed',
    result_summary: {
      rule: 'Waiting waitlist entries with desired_date earlier than the start of scope_date are expired.',
    },
    result_counts: counts,
    related_event_ids: [],
    related_notification_ids: [],
    related_send_history_ids: [],
  };
}

async function runRetryNotifications({ hospitalId }) {
  const now = new Date();
  const retryable = await Notification.find({
    hospital_id: hospitalId,
    status: 'failed',
    is_active: true,
  });

  const counts = { scanned_count: retryable.length, requeued_count: 0, dead_lettered_count: 0, skipped_count: 0, failed_count: 0 };
  const relatedNotificationIds = [];

  for (const notification of retryable) {
    try {
      if (notification.attempt_count >= notification.max_attempts) {
        notification.status = 'dead_letter';
        notification.is_active = false;
        await notification.save();
        counts.dead_lettered_count += 1;
        relatedNotificationIds.push(notification._id);
        continue;
      }

      notification.status = notification.scheduled_for && new Date(notification.scheduled_for).getTime() > now.getTime() ? 'scheduled' : 'queued';
      notification.available_at = notification.status === 'scheduled' ? notification.scheduled_for : now;
      notification.reserved_at = null;
      notification.started_at = null;
      notification.is_active = true;
      notification.metadata = {
        ...(notification.metadata || {}),
        last_requeued_at: now,
      };
      await notification.save();
      counts.requeued_count += 1;
      relatedNotificationIds.push(notification._id);
    } catch (error) {
      counts.failed_count += 1;
    }
  }

  return {
    status: retryable.length === 0 ? 'skipped' : 'completed',
    result_summary: {
      rule: 'Only failed notifications with attempt_count < max_attempts are requeued. Failed notifications at or above max_attempts are moved to dead_letter.',
      retry_semantics: 'attempt_count is preserved and not incremented by the retry job; it is treated as actual delivery-attempt history rather than requeue count.',
    },
    result_counts: counts,
    related_event_ids: [],
    related_notification_ids: relatedNotificationIds,
    related_send_history_ids: [],
  };
}

module.exports = {
  runAppointmentReminders,
  runDayClose,
  runPregnancyWeekUpdate,
  runFollowUpDue,
  runWaitlistExpiry,
  runRetryNotifications,
};
