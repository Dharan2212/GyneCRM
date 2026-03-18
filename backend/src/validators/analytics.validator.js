'use strict';

/**
 * Analytics Validator — Phase 5 Batch 7
 * Uses Joi for schema validation matching existing project convention.
 * All analytics routes are Admin-only, read-only, hospital-scoped.
 */

const Joi = require('joi');

// ─── Reusable field schemas ───────────────────────────────────────────────────

const uuidSchema = Joi.string().uuid({ version: ['uuidv4'] });

const dateSchema = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .messages({ 'string.pattern.base': '{{#label}} must be in YYYY-MM-DD format' });

// ─── 1. Overview KPIs ─────────────────────────────────────────────────────────
const overviewSchema = Joi.object({
  branch_id: uuidSchema.optional(),
});

// ─── 2. Revenue Summary ───────────────────────────────────────────────────────
const revenueSchema = Joi.object({
  branch_id: uuidSchema.optional(),
  date_from: dateSchema.optional(),
  date_to: dateSchema.optional(),
});

// ─── 3. Appointment Stats ─────────────────────────────────────────────────────
const appointmentsSchema = Joi.object({
  branch_id: uuidSchema.optional(),
  date_from: dateSchema.optional(),
  date_to: dateSchema.optional(),
  doctor_id: uuidSchema.optional(),
});

// ─── 4. Doctor Workload ───────────────────────────────────────────────────────
const doctorWorkloadSchema = Joi.object({
  branch_id: uuidSchema.optional(),
  weeks: Joi.number().integer().min(1).max(52).optional().default(4),
});

// ─── 5. Patient Retention ─────────────────────────────────────────────────────
const patientRetentionSchema = Joi.object({
  branch_id: uuidSchema.optional(),
});

// ─── 6. High-Risk Pregnancies ─────────────────────────────────────────────────
const highRiskSchema = Joi.object({
  branch_id: uuidSchema.optional(),
});

// ─── 7. Test Completion ───────────────────────────────────────────────────────
const testCompletionSchema = Joi.object({
  branch_id: uuidSchema.optional(),
  date_from: dateSchema.optional(),
  date_to: dateSchema.optional(),
});

// ─── 8. Day Close ─────────────────────────────────────────────────────────────
const dayCloseSchema = Joi.object({
  branch_id: uuidSchema.optional(),
  date_from: dateSchema.optional(),
  date_to: dateSchema.optional(),
});

// ─── 9. Deliveries ────────────────────────────────────────────────────────────
const deliveriesSchema = Joi.object({
  branch_id: uuidSchema.optional(),
  date_from: dateSchema.optional(),
  date_to: dateSchema.optional(),
});

// ─── Branch param schema (route param) ────────────────────────────────────────
const branchParamSchema = Joi.object({
  branchId: uuidSchema.required().messages({
    'string.guid': 'branchId must be a valid UUID',
    'any.required': 'branchId is required',
  }),
});

// ─── Validator middleware factory ─────────────────────────────────────────────

/**
 * Validates req.query against a Joi schema.
 * Returns 400 with structured error array on failure.
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map((d) => ({
          field: d.path.join('.'),
          message: d.message,
        })),
      });
    }

    // Replace req.query with validated + coerced values
    req.query = value;
    return next();
  };
}

/**
 * Validates req.params against a Joi schema.
 */
function validateParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map((d) => ({
          field: d.path.join('.'),
          message: d.message,
        })),
      });
    }

    req.params = value;
    return next();
  };
}

// ─── Exported validators ──────────────────────────────────────────────────────

module.exports = {
  validateOverview: validateQuery(overviewSchema),
  validateRevenue: validateQuery(revenueSchema),
  validateAppointments: validateQuery(appointmentsSchema),
  validateDoctorWorkload: validateQuery(doctorWorkloadSchema),
  validatePatientRetention: validateQuery(patientRetentionSchema),
  validateHighRisk: validateQuery(highRiskSchema),
  validateTestCompletion: validateQuery(testCompletionSchema),
  validateDayClose: validateQuery(dayCloseSchema),
  validateDeliveries: validateQuery(deliveriesSchema),
  validateBranchParams: validateParams(branchParamSchema),
};