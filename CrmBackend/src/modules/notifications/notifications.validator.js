const {
  Joi,
  objectIdSchema,
  nullableString,
  nullableNumber,
  nullableDate,
  paginationSchema,
  emptyObjectSchema,
} = require('../../utils/validation');
const {
  SOURCE_TYPE_ENUM,
  CHANNEL_ENUM,
  PRIORITY_ENUM,
  STATUS_ENUM,
  RECIPIENT_TYPE_ENUM,
} = require('./notifications.query');



const createNotificationSchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  patient_id: objectIdSchema.optional(),
  doctor_id: objectIdSchema.optional(),
  source_type: Joi.string().trim().valid(...SOURCE_TYPE_ENUM).required(),
  source_id: objectIdSchema.required(),
  source_number: Joi.string().trim().allow('', null).optional(),
  channel: Joi.string().trim().valid(...CHANNEL_ENUM).required(),
  recipient: Joi.string().trim().min(1).required(),
  recipient_type: Joi.string().trim().valid(...RECIPIENT_TYPE_ENUM).optional(),
  subject: Joi.string().trim().allow('', null).optional(),
  body_summary: Joi.string().trim().allow('', null).optional(),
  template_key: Joi.string().trim().allow('', null).optional(),
  payload_snapshot: Joi.any().optional(),
  priority: Joi.string().trim().valid(...PRIORITY_ENUM).optional(),
  scheduled_for: Joi.date().iso().optional(),
  queue_name: Joi.string().trim().allow('', null).optional(),
  queue_key: Joi.string().trim().allow('', null).optional(),
  provider: Joi.string().trim().allow('', null).optional(),
  metadata: Joi.any().optional(),
  send_history_id: objectIdSchema.optional(),
  expires_at: Joi.date().iso().optional(),
  max_attempts: Joi.number().integer().min(1).max(25).optional(),
});

const listNotificationsSchema = Joi.object({
  patient_id: objectIdSchema.optional(),
  source_type: Joi.string().trim().valid(...SOURCE_TYPE_ENUM).optional(),
  channel: Joi.string().trim().valid(...CHANNEL_ENUM).optional(),
  priority: Joi.string().trim().valid(...PRIORITY_ENUM).optional(),
  status: Joi.string().trim().valid(...STATUS_ENUM).optional(),
  scheduled_from: Joi.date().iso().optional(),
  scheduled_to: Joi.date().iso().optional(),
  ...paginationSchema,
});

const notificationDetailParamSchema = Joi.object({
  id: objectIdSchema.required(),
});

const cancelNotificationSchema = Joi.object({}).optional();

module.exports = {
  createNotificationSchema,
  listNotificationsSchema,
  notificationDetailParamSchema,
  cancelNotificationSchema,
};
