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
  EVENT_TYPE_VALUES,
  SOURCE_TYPE_VALUES,
  CHANNEL_ENUM,
  STATUS_ENUM,
  DISPATCH_MODE_ENUM,
} = require('./events.query');



const dispatchEventSchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  patient_id: objectIdSchema.optional(),
  doctor_id: objectIdSchema.optional(),
  source_type: Joi.string().trim().valid(...SOURCE_TYPE_VALUES).required(),
  source_id: objectIdSchema.required(),
  source_number: Joi.string().trim().allow('', null).optional(),
  event_type: Joi.string().trim().valid(...EVENT_TYPE_VALUES).required(),
  template_key: Joi.string().trim().allow('', null).optional(),
  template_version: Joi.number().integer().min(1).optional(),
  channels: Joi.array().items(Joi.string().trim().valid(...CHANNEL_ENUM)).min(1).optional(),
  recipient_snapshot: Joi.any().optional(),
  payload_snapshot: Joi.any().optional(),
  dispatch_mode: Joi.string().trim().valid(...DISPATCH_MODE_ENUM).optional(),
  metadata: Joi.any().optional(),
});

const listEventsSchema = Joi.object({
  event_type: Joi.string().trim().valid(...EVENT_TYPE_VALUES).optional(),
  source_type: Joi.string().trim().valid(...SOURCE_TYPE_VALUES).optional(),
  status: Joi.string().trim().valid(...STATUS_ENUM).optional(),
  patient_id: objectIdSchema.optional(),
  requested_from: Joi.date().iso().optional(),
  requested_to: Joi.date().iso().optional(),
  ...paginationSchema,
});

const eventDetailParamSchema = Joi.object({
  id: objectIdSchema.required(),
});

module.exports = {
  dispatchEventSchema,
  listEventsSchema,
  eventDetailParamSchema,
};
