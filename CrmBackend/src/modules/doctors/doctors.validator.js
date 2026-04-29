const {
  Joi,
  objectIdSchema,
  nullableString,
  nullableNumber,
  nullableDate,
  paginationSchema,
  emptyObjectSchema,
} = require('../../utils/validation');

const optionalNullableString = Joi.string().trim().allow('', null);

const timeStringSchema = Joi.string().trim().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).messages({
  'string.pattern.base': 'Time must be in HH:mm format.',
});

const listDoctorsSchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  speciality: Joi.string().trim().max(120).optional(),
  search: Joi.string().trim().max(120).optional(),
  is_active: Joi.boolean().optional(),
  ...paginationSchema,
});

const doctorDetailSchema = Joi.object({
  id: objectIdSchema.required(),
});

const workWindowSchema = Joi.object({
  day_of_week: Joi.number().integer().min(0).max(6).required(),
  start_time: timeStringSchema.required(),
  end_time: timeStringSchema.required(),
});

const leaveSchema = Joi.object({
  start_date: Joi.date().required(),
  end_date: Joi.date().required(),
  reason: optionalNullableString.max(255).optional(),
});

const scheduleBlockSchema = Joi.object({
  date: Joi.date().required(),
  start_time: timeStringSchema.required(),
  end_time: timeStringSchema.required(),
  reason: optionalNullableString.max(255).optional(),
});

const doctorBodyFields = {
  user_id: objectIdSchema.optional(),
  hospital_id: objectIdSchema.optional(),
  full_name: Joi.string().trim().min(2).max(150).optional(),
  speciality: Joi.string().trim().min(2).max(120).optional(),
  qualification: optionalNullableString.max(150).optional(),
  registration_number: optionalNullableString.max(80).optional(),
  schedule_settings: Joi.object({
    slot_duration_minutes: Joi.number().integer().min(1).max(240).optional(),
    work_windows: Joi.array().items(workWindowSchema).max(20).optional(),
  }).optional(),
  leaves: Joi.array().items(leaveSchema).max(100).optional(),
  schedule_blocks: Joi.array().items(scheduleBlockSchema).max(100).optional(),
};

const createDoctorSchema = Joi.object({
  ...doctorBodyFields,
  user_id: objectIdSchema.required(),
  full_name: Joi.string().trim().min(2).max(150).required(),
  speciality: Joi.string().trim().min(2).max(120).required(),
});

const updateDoctorSchema = Joi.object(doctorBodyFields).min(1);

module.exports = {
  listDoctorsSchema,
  doctorDetailSchema,
  createDoctorSchema,
  updateDoctorSchema,
};
