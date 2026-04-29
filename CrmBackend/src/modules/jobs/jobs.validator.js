const {
  Joi,
  objectIdSchema,
  nullableString,
  nullableNumber,
  nullableDate,
  paginationSchema,
  emptyObjectSchema,
} = require('../../utils/validation');
const { JOB_TYPE_VALUES, JOB_STATUS_VALUES, RUN_MODE_VALUES } = require('./jobs.types');



const dispatchJobSchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  job_type: Joi.string().trim().valid(...JOB_TYPE_VALUES).required(),
  scope_date: Joi.date().iso().optional(),
  run_mode: Joi.string().trim().valid(...RUN_MODE_VALUES).optional(),
  payload_snapshot: Joi.any().optional(),
  scheduled_for: Joi.date().iso().optional(),
  metadata: Joi.any().optional(),
  queue_key: Joi.string().trim().allow('', null).optional(),
  max_attempts: Joi.number().integer().min(1).max(25).optional(),
});

const runJobSchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  scope_date: Joi.date().iso().optional(),
  payload_snapshot: Joi.any().optional(),
  metadata: Joi.any().optional(),
  queue_key: Joi.string().trim().allow('', null).optional(),
});

const runJobParamSchema = Joi.object({
  jobType: Joi.string().trim().valid(...JOB_TYPE_VALUES).required(),
});

const listJobsSchema = Joi.object({
  job_type: Joi.string().trim().valid(...JOB_TYPE_VALUES).optional(),
  status: Joi.string().trim().valid(...JOB_STATUS_VALUES).optional(),
  scope_date: Joi.date().iso().optional(),
  scheduled_from: Joi.date().iso().optional(),
  scheduled_to: Joi.date().iso().optional(),
  ...paginationSchema,
});

const jobDetailParamSchema = Joi.object({
  id: objectIdSchema.required(),
});

const cancelJobSchema = Joi.object({}).optional();

module.exports = {
  dispatchJobSchema,
  runJobSchema,
  runJobParamSchema,
  listJobsSchema,
  jobDetailParamSchema,
  cancelJobSchema,
};
