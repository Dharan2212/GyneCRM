const {
  Joi,
  objectIdSchema,
  nullableString,
  nullableNumber,
  nullableDate,
  paginationSchema,
  emptyObjectSchema,
} = require('../../utils/validation');

const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(8).required(),
});

const refreshSchema = Joi.object({
  refresh_token: Joi.string().trim().optional().allow('', null),
}).unknown(true);

const logoutSchema = Joi.object({}).unknown(true);

const changePasswordSchema = Joi.object({
  current_password: Joi.string().min(8).required(),
  new_password: Joi.string().min(8).invalid(Joi.ref('current_password')).required(),
});

module.exports = {
  loginSchema,
  refreshSchema,
  logoutSchema,
  changePasswordSchema,
};
