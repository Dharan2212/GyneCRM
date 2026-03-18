'use strict';

const Joi = require('joi');

/**
 * USERS VALIDATOR
 * Joi schemas enforced at controller layer before any service call.
 */

const VALID_ROLES = ['admin', 'doctor', 'receptionist', 'staff'];

/** Create a new user (Admin only). */
const createUserSchema = Joi.object({
  name: Joi.string().max(200).required(),
  email: Joi.string().email().max(200).required(),
  phone: Joi.string()
    .pattern(/^\+?[0-9]{7,20}$/)
    .optional()
    .allow('', null),
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string()
    .valid(...VALID_ROLES)
    .required(),
  branch_id: Joi.string().uuid().optional().allow(null),
});

/** Update an existing user (Admin only). */
const updateUserSchema = Joi.object({
  name: Joi.string().max(200).optional(),
  email: Joi.string().email().max(200).optional(),
  phone: Joi.string()
    .pattern(/^\+?[0-9]{7,20}$/)
    .optional()
    .allow('', null),
  role: Joi.string()
    .valid(...VALID_ROLES)
    .optional(),
  branch_id: Joi.string().uuid().optional().allow(null),
}).min(1);

/** Query params for listing users. */
const listUsersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  role: Joi.string()
    .valid(...VALID_ROLES)
    .optional(),
  is_active: Joi.boolean().optional(),
  search: Joi.string().max(200).optional().allow(''),
});

module.exports = { createUserSchema, updateUserSchema, listUsersSchema };
