'use strict';

const Joi = require('joi');

// ─── Enum constants matching DB migrations ────────────────────────────────────

/**
 * Prescription status values from migration 025 ENUM definition.
 */
const PRESCRIPTION_STATUS = {
  DRAFT: 'draft',
  ISSUED: 'issued',
  VOID: 'void',
};

/**
 * Medicine administration route values.
 */
const MEDICINE_ROUTES = [
  'oral',
  'topical',
  'sublingual',
  'intravenous',
  'intramuscular',
  'subcutaneous',
  'inhalation',
  'nasal',
  'ophthalmic',
  'otic',
  'rectal',
  'vaginal',
  'transdermal',
  'other',
];

// ─── Prescription item sub-schema (shared between add + update) ───────────────

const prescriptionItemBaseSchema = Joi.object({
  medicine_name: Joi.string().max(500).required(),
  dosage: Joi.string().max(200).required(),
  frequency: Joi.string().max(200).required(),
  duration: Joi.string().max(200).required(),
  route: Joi.string()
    .valid(...MEDICINE_ROUTES)
    .required(),
  instructions: Joi.string().max(2000).allow(null, ''),
  sort_order: Joi.number().integer().min(0).default(0),
});

// ─── Request schemas ──────────────────────────────────────────────────────────

/**
 * POST /api/v1/prescriptions
 * Create a new prescription draft linked to a consultation.
 */
const createPrescriptionSchema = Joi.object({
  consultation_id: Joi.string().uuid().required(),
  notes: Joi.string().max(3000).allow(null, ''),
});

/**
 * PUT /api/v1/prescriptions/:id
 * Update prescription-level fields while in draft state.
 * Items are managed through separate item endpoints.
 */
const updatePrescriptionSchema = Joi.object({
  notes: Joi.string().max(3000).allow(null, ''),
})
  .min(1)
  .options({ stripUnknown: true });

/**
 * POST /api/v1/prescriptions/:id/items
 * Add a medicine line item to a draft prescription.
 */
const addItemSchema = prescriptionItemBaseSchema;

/**
 * PUT /api/v1/prescriptions/:id/items/:itemId
 * Update an existing item on a draft prescription.
 * All fields optional — at least one must be present.
 */
const updateItemSchema = Joi.object({
  medicine_name: Joi.string().max(500),
  dosage: Joi.string().max(200),
  frequency: Joi.string().max(200),
  duration: Joi.string().max(200),
  route: Joi.string().valid(...MEDICINE_ROUTES),
  instructions: Joi.string().max(2000).allow(null, ''),
  sort_order: Joi.number().integer().min(0),
})
  .min(1)
  .options({ stripUnknown: true });

/**
 * POST /api/v1/prescriptions/:id/issue
 * Issue (lock) the prescription.
 * No body required — but validate empty/unexpected payloads.
 */
const issuePrescriptionSchema = Joi.object({}).options({ allowUnknown: false });

/**
 * POST /api/v1/prescriptions/:id/void
 * Void an issued prescription with a mandatory reason.
 */
const voidPrescriptionSchema = Joi.object({
  void_reason: Joi.string().min(5).max(2000).required(),
});

/**
 * POST /api/v1/prescriptions/:id/reissue
 * Create a corrected prescription referencing the voided one.
 * At minimum, carries a new set of items or updated notes.
 * Items are added after creation through the items endpoint.
 */
const reissuePrescriptionSchema = Joi.object({
  notes: Joi.string().max(3000).allow(null, ''),
});

/**
 * GET /api/v1/patients/:patientId/prescriptions
 */
const listPatientPrescriptionsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort_by: Joi.string()
    .valid('created_at', 'issued_at', 'status')
    .default('created_at'),
  sort_dir: Joi.string().valid('asc', 'desc').default('desc'),
  status: Joi.string().valid(...Object.values(PRESCRIPTION_STATUS)),
});

module.exports = {
  createPrescriptionSchema,
  updatePrescriptionSchema,
  addItemSchema,
  updateItemSchema,
  issuePrescriptionSchema,
  voidPrescriptionSchema,
  reissuePrescriptionSchema,
  listPatientPrescriptionsSchema,
  PRESCRIPTION_STATUS,
  MEDICINE_ROUTES,
};
