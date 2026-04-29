const {
  Joi,
  objectIdSchema,
  nullableString,
  nullableNumber,
  nullableDate,
  paginationSchema,
  emptyObjectSchema,
} = require('../../utils/validation');


const doctorDashboardQuerySchema = Joi.object({
  date: Joi.date().iso().optional(),
  doctor_id: objectIdSchema.optional(),
});

module.exports = {
  doctorDashboardQuerySchema,
};
