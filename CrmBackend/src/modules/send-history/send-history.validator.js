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
  STATUS_ENUM,
} = require('./send-history.query');



const listSendHistorySchema = Joi.object({
  patient_id: objectIdSchema.optional(),
  source_type: Joi.string().trim().valid(...SOURCE_TYPE_ENUM).optional(),
  channel: Joi.string().trim().valid(...CHANNEL_ENUM).optional(),
  status: Joi.string().trim().valid(...STATUS_ENUM).optional(),
  requested_from: Joi.date().iso().optional(),
  requested_to: Joi.date().iso().optional(),
  ...paginationSchema,
});

const sendHistoryDetailParamSchema = Joi.object({
  id: objectIdSchema.required(),
});

const patientSendHistoryParamSchema = Joi.object({
  id: objectIdSchema.required(),
});

const patientSendHistoryAliasParamSchema = Joi.object({
  patientId: objectIdSchema.required(),
});

module.exports = {
  listSendHistorySchema,
  sendHistoryDetailParamSchema,
  patientSendHistoryParamSchema,
  patientSendHistoryAliasParamSchema,
};
