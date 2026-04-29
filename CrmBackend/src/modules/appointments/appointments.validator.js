const {
  Joi,
  objectIdSchema,
  nullableString,
  nullableNumber,
  nullableDate,
  paginationSchema,
  emptyObjectSchema,
} = require('../../utils/validation');

const STATUS_ENUM = ['scheduled', 'checked_in', 'completed', 'cancelled', 'no_show', 'rescheduled'];
const WRITABLE_STATUS_ENUM = ['cancelled', 'no_show'];
const VISIT_TYPE_ENUM = ['new', 'follow_up', 'review', 'procedure', 'other'];
const WAITLIST_STATUS_ENUM = ['waiting', 'contacted', 'converted', 'expired', 'cancelled'];
const WAITLIST_WRITABLE_STATUS_ENUM = ['contacted', 'expired', 'cancelled'];
const WAITLIST_PRIORITY_ENUM = ['low', 'normal', 'high', 'urgent'];

const listAppointmentsSchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  doctor_id: objectIdSchema.optional(),
  patient_id: objectIdSchema.optional(),
  appointment_type_id: objectIdSchema.optional(),
  status: Joi.string().trim().valid(...STATUS_ENUM).optional(),
  date: Joi.date().iso().optional(),
  scheduled_from: Joi.date().iso().optional(),
  scheduled_to: Joi.date().iso().optional(),
  ...paginationSchema,
});

const createAppointmentSchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  patient_id: objectIdSchema.required(),
  doctor_id: objectIdSchema.required(),
  appointment_type_id: objectIdSchema.required(),
  scheduled_at: Joi.date().iso().required(),
  duration_minutes: Joi.number().integer().min(1).max(480).required(),
  visit_type: Joi.string().trim().valid(...VISIT_TYPE_ENUM).required(),
  reason_for_visit: nullableString.max(500).optional(),
  notes: nullableString.max(2000).optional(),
});

const appointmentDetailSchema = Joi.object({
  id: objectIdSchema.required(),
});

const updateAppointmentStatusSchema = Joi.object({
  status: Joi.string().trim().valid(...WRITABLE_STATUS_ENUM).required(),
  cancellation_reason: nullableString.max(500).optional(),
});

const checkInAppointmentSchema = emptyObjectSchema;

const rescheduleAppointmentSchema = Joi.object({
  scheduled_at: Joi.date().iso().required(),
  duration_minutes: Joi.number().integer().min(1).max(480).optional(),
  reschedule_reason: nullableString.max(500).optional(),
  notes: nullableString.max(2000).optional(),
}).required();

const listWaitlistSchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  status: Joi.string().trim().valid(...WAITLIST_STATUS_ENUM).optional(),
  preferred_doctor_id: objectIdSchema.optional(),
  desired_date: Joi.date().iso().optional(),
  priority: Joi.string().trim().valid(...WAITLIST_PRIORITY_ENUM).optional(),
  is_active: Joi.boolean().optional(),
  ...paginationSchema,
});

const preferredTimeRangeSchema = Joi.object({
  start_time: nullableString.max(30).optional(),
  end_time: nullableString.max(30).optional(),
  label: nullableString.max(120).optional(),
}).optional();

const createWaitlistSchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  patient_id: objectIdSchema.required(),
  preferred_doctor_id: objectIdSchema.optional(),
  appointment_type_id: objectIdSchema.optional(),
  desired_date: Joi.date().iso().required(),
  preferred_time_range: preferredTimeRangeSchema,
  reason_for_visit: nullableString.max(500).optional(),
  notes: nullableString.max(2000).optional(),
  priority: Joi.string().trim().valid(...WAITLIST_PRIORITY_ENUM).optional(),
  source_appointment_id: objectIdSchema.optional(),
});

const waitlistDetailSchema = Joi.object({
  id: objectIdSchema.required(),
});

const updateWaitlistStatusSchema = Joi.object({
  status: Joi.string().trim().valid(...WAITLIST_WRITABLE_STATUS_ENUM).required(),
  notes: nullableString.max(2000).optional(),
});

module.exports = {
  listAppointmentsSchema,
  createAppointmentSchema,
  appointmentDetailSchema,
  updateAppointmentStatusSchema,
  checkInAppointmentSchema,
  rescheduleAppointmentSchema,
  listWaitlistSchema,
  createWaitlistSchema,
  waitlistDetailSchema,
  updateWaitlistStatusSchema,
};
