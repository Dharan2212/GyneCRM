'use strict';

const Joi = require('joi');

/**
 * Joi schema for updating hospital settings.
 * Accepts an array of key-value pairs so the admin can bulk-update
 * multiple settings in a single request.
 */
const updateSettingsSchema = Joi.object({
  settings: Joi.array()
    .items(
      Joi.object({
        key: Joi.string().max(100).required(),
        value: Joi.string().max(1000).required(),
        description: Joi.string().max(500).optional().allow('', null),
      })
    )
    .min(1)
    .required(),
});

module.exports = { updateSettingsSchema };
