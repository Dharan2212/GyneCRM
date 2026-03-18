'use strict';

const Joi = require('joi');

const uuid = Joi.string().uuid();

const createDeliverySchema = Joi.object({
  pregnancy_id: uuid.required(),
  patient_id: uuid.required(),
  doctor_id: uuid.required(),
  delivery_date: Joi.date().iso().required(),
  delivery_time: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
    .required(),
  delivery_type: Joi.string()
    .valid('normal', 'c_section', 'assisted', 'vacuum', 'forceps', 'other')
    .required(),
  gestational_age_weeks: Joi.number().integer().min(20).max(45).required(),
  onset_of_labour: Joi.string()
    .valid('spontaneous', 'induced', 'elective_c_section', 'unknown')
    .allow(null),
  anaesthesia_type: Joi.string()
    .valid('none', 'local', 'spinal', 'epidural', 'general', 'other')
    .allow(null),
  complications: Joi.array().items(Joi.string().trim()).default([]),
  birth_outcome: Joi.string()
    .valid('live_birth', 'still_birth', 'neonatal_death', 'mixed')
    .required(),
  notes: Joi.string().allow('', null),
  neonates: Joi.array()
    .items(
      Joi.object({
        birth_order: Joi.number().integer().min(1).required(),
        sex: Joi.string().valid('male', 'female', 'other', 'unknown').required(),
        weight_kg: Joi.number().precision(3).min(0).max(10).allow(null),
        apgar_1min: Joi.number().integer().min(0).max(10).allow(null),
        apgar_5min: Joi.number().integer().min(0).max(10).allow(null),
        status: Joi.string()
          .valid('alive', 'nicu', 'stillborn', 'deceased')
          .required(),
        notes: Joi.string().allow('', null),
      })
    )
    .min(1)
    .required(),
});

const updateDeliverySchema = Joi.object({
  delivery_date: Joi.date().iso(),
  delivery_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/),
  delivery_type: Joi.string().valid('normal', 'c_section', 'assisted', 'vacuum', 'forceps', 'other'),
  gestational_age_weeks: Joi.number().integer().min(20).max(45),
  onset_of_labour: Joi.string().valid('spontaneous', 'induced', 'elective_c_section', 'unknown', null),
  anaesthesia_type: Joi.string().valid('none', 'local', 'spinal', 'epidural', 'general', 'other', null),
  complications: Joi.array().items(Joi.string().trim()),
  birth_outcome: Joi.string().valid('live_birth', 'still_birth', 'neonatal_death', 'mixed'),
  notes: Joi.string().allow('', null),
}).min(1).required();

const getDeliveryParamsSchema = Joi.object({
  id: uuid.required(),
});

const listPatientDeliveriesParamsSchema = Joi.object({
  patientId: uuid.required(),
});

const listPatientPostpartumParamsSchema = Joi.object({
  patientId: uuid.required(),
});

const listPostpartumQuerySchema = Joi.object({
  delivery_id: uuid.optional(),
  status: Joi.string().valid('scheduled', 'completed', 'missed').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const postpartumFollowupParamsSchema = Joi.object({
  id: uuid.required(),
});

const updatePostpartumFollowupSchema = Joi.object({
  due_date: Joi.date().iso(),
  visit_type: Joi.string().valid('day7', 'week6', 'week12'),
  status: Joi.string().valid('scheduled', 'completed', 'missed'),
  completed_at: Joi.date().iso().allow(null),
  notes: Joi.string().allow('', null),
}).min(1).required();

module.exports = {
  createDeliverySchema,
  updateDeliverySchema,
  getDeliveryParamsSchema,
  listPatientDeliveriesParamsSchema,
  listPatientPostpartumParamsSchema,
  listPostpartumQuerySchema,
  postpartumFollowupParamsSchema,
  updatePostpartumFollowupSchema,
};