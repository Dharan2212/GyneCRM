const Joi = require('joi');
const { isValidObjectId } = require('./object-id');

const objectIdSchema = Joi.string()
  .trim()
  .custom((value, helpers) => {
    if (!isValidObjectId(value)) {
      return helpers.error('objectId.base');
    }

    return value;
  }, 'ObjectId validation')
  .messages({
    'objectId.base': '{{#label}} must be a valid ObjectId.',
  });

const nullableString = Joi.string().trim().allow('', null);
const nullableNumber = Joi.number().allow(null);
const nullableDate = Joi.date().iso().allow(null);
const paginationSchema = Object.freeze({
  page: Joi.number().integer().min(1).max(100000).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});
const emptyObjectSchema = Joi.object({}).max(0);

module.exports = {
  Joi,
  objectIdSchema,
  nullableString,
  nullableNumber,
  nullableDate,
  paginationSchema,
  emptyObjectSchema,
};
