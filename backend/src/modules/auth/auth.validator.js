// src/modules/auth/auth.validator.js
'use strict';

const Joi = require('joi');
const { createError } = require('../../utils/errors');

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'A valid email address is required.',
    'any.required': 'Email is required.',
  }),
  password: Joi.string().min(1).required().messages({
    'any.required': 'Password is required.',
  }),
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required().messages({
    'any.required': 'Current password is required.',
  }),
  new_password: Joi.string()
    .min(8)
    .max(72)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters.',
      'string.max': 'New password must not exceed 72 characters.',
      'string.pattern.base':
        'New password must contain at least one uppercase letter, one lowercase letter, and one number.',
      'any.required': 'New password is required.',
    }),
  confirm_password: Joi.string()
    .valid(Joi.ref('new_password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match.',
      'any.required': 'Password confirmation is required.',
    }),
});

// ---------------------------------------------------------------------------
// Validator factory
// ---------------------------------------------------------------------------

/**
 * Builds an Express middleware that validates req.body against a Joi schema.
 * On failure, creates a typed error via the shared createError utility
 * and passes it to the next error handler.
 *
 * @param {import('joi').Schema} schema
 * @returns {import('express').RequestHandler}
 */
const validate = (schema) => (req, _res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));
    return next(createError(400, 'VALIDATION_ERROR', 'Validation failed.', details));
  }

  req.body = value;
  return next();
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  validateLogin: validate(loginSchema),
  validateChangePassword: validate(changePasswordSchema),
};
