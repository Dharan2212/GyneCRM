const {
  Joi,
  objectIdSchema,
  nullableString,
  nullableNumber,
  nullableDate,
  paginationSchema,
  emptyObjectSchema,
} = require('../../utils/validation');

const CATEGORY_ENUM = ['pregnancy', 'ivf', 'gynac', 'uncategorized'];
const BLOOD_GROUP_ENUM = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function normalizeStringArray(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized ? [normalized] : [];
  }

  return value;
}

const flexibleStringArraySchema = Joi.alternatives()
  .try(
    Joi.array().items(Joi.string().trim().max(120)).max(100),
    nullableString.max(120),
  )
  .custom((value) => normalizeStringArray(value), 'flexible string-array normalization');

const phoneSchema = Joi.string()
  .trim()
  .pattern(/^[0-9+()\-\s]{7,20}$/)
  .custom((value, helpers) => {
    const digits = value.replace(/\D/g, '');

    if (digits.length < 7 || digits.length > 15) {
      return helpers.error('string.phone');
    }

    return value;
  }, 'phone validation')
  .messages({
    'string.pattern.base': 'Phone number format is invalid.',
    'string.phone': 'Phone number must contain between 7 and 15 digits.',
  });

const addressSchema = Joi.object({
  line_1: nullableString.max(150).optional(),
  line_2: nullableString.max(150).optional(),
  area: nullableString.max(120).optional(),
  city: nullableString.max(120).optional(),
  state: nullableString.max(120).optional(),
  postal_code: nullableString.max(20).optional(),
  country: nullableString.max(120).optional(),
}).unknown(false).optional();

const emergencyContactSchema = Joi.object({
  name: nullableString.max(120).optional(),
  relation: nullableString.max(80).optional(),
  phone: phoneSchema.allow('', null).optional(),
}).unknown(false).optional();

const medicalHistorySchema = Joi.object({
  existing_conditions: flexibleStringArraySchema.optional(),
  surgical_history: nullableString.max(500).optional(),
  allergies: flexibleStringArraySchema.optional(),
  current_medications: flexibleStringArraySchema.optional(),
  family_history: nullableString.max(500).optional(),
  notes: nullableString.max(1000).optional(),
}).unknown(false).optional();

const consentSchema = Joi.object({
  consent_type: Joi.string().trim().min(1).max(120).required(),
  status: Joi.string().trim().valid('granted', 'revoked', 'pending').required(),
  recorded_at: Joi.date().iso().optional(),
  recorded_by: objectIdSchema.optional().allow(null),
  notes: nullableString.max(500).optional(),
}).unknown(false);

const listPatientsSchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  category: Joi.string().trim().valid(...CATEGORY_ENUM).optional(),
  is_active: Joi.boolean().optional(),
  search: Joi.string().trim().max(120).allow('').optional(),
  ...paginationSchema,
});

const registerPatientSchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  full_name: Joi.string().trim().min(2).max(150).required(),
  date_of_birth: Joi.date().iso().allow(null).optional(),
  phone: phoneSchema.required(),
  alternate_phone: phoneSchema.allow('', null).optional(),
  address: addressSchema,
  blood_group: Joi.string().trim().valid(...BLOOD_GROUP_ENUM).allow(null).optional(),
  emergency_contact: emergencyContactSchema,
  family_whatsapp: phoneSchema.allow('', null).optional(),
  category: Joi.string().trim().valid(...CATEGORY_ENUM).optional(),
  medical_history: medicalHistorySchema,
  consents: Joi.array().items(consentSchema).max(100).optional(),
  is_active: Joi.boolean().optional(),
});

const patientDetailSchema = Joi.object({
  id: objectIdSchema.required(),
});

const updatePatientSchema = Joi.object({
  full_name: Joi.string().trim().min(2).max(150).optional(),
  date_of_birth: Joi.date().iso().allow(null).optional(),
  phone: phoneSchema.optional(),
  alternate_phone: phoneSchema.allow('', null).optional(),
  address: addressSchema,
  blood_group: Joi.string().trim().valid(...BLOOD_GROUP_ENUM).allow(null).optional(),
  emergency_contact: emergencyContactSchema,
  family_whatsapp: phoneSchema.allow('', null).optional(),
  medical_history: medicalHistorySchema,
  consents: Joi.array().items(consentSchema).max(100).optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

const updatePatientCategorySchema = Joi.object({
  category: Joi.string().trim().valid(...CATEGORY_ENUM).required(),
  reason: nullableString.max(500).optional(),
});

const categoryCountQuerySchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  is_active: Joi.boolean().optional(),
});

module.exports = {
  listPatientsSchema,
  registerPatientSchema,
  patientDetailSchema,
  updatePatientSchema,
  updatePatientCategorySchema,
  categoryCountQuerySchema,
};
