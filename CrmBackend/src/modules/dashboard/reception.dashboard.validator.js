const {
  Joi,
  objectIdSchema,
  nullableString,
  nullableNumber,
  nullableDate,
  paginationSchema,
  emptyObjectSchema,
} = require('../../utils/validation');

const receptionistDashboardQuerySchema = Joi.object({
  date: Joi.date().iso().optional(),
});

module.exports = {
  receptionistDashboardQuerySchema,
};
