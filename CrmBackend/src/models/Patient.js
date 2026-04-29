const mongoose = require('mongoose');

const { Schema } = mongoose;
const { normalizeTrimmedStringArray } = require('../utils/schema-validation');

const CATEGORY_ENUM = ['pregnancy', 'ivf', 'gynac', 'uncategorized'];
const BLOOD_GROUP_ENUM = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const addressSchema = new Schema(
  {
    line_1: {
      type: String,
      trim: true,
      default: null,
    },
    line_2: {
      type: String,
      trim: true,
      default: null,
    },
    area: {
      type: String,
      trim: true,
      default: null,
    },
    city: {
      type: String,
      trim: true,
      default: null,
    },
    state: {
      type: String,
      trim: true,
      default: null,
    },
    postal_code: {
      type: String,
      trim: true,
      default: null,
    },
    country: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const emergencyContactSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      default: null,
    },
    relation: {
      type: String,
      trim: true,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const medicalHistorySchema = new Schema(
  {
    existing_conditions: {
      type: [String],
      default: [],
      set: normalizeTrimmedStringArray,
    },
    surgical_history: {
      type: String,
      trim: true,
      default: null,
    },
    allergies: {
      type: [String],
      default: [],
      set: normalizeTrimmedStringArray,
    },
    current_medications: {
      type: [String],
      default: [],
      set: normalizeTrimmedStringArray,
    },
    family_history: {
      type: String,
      trim: true,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const consentSchema = new Schema(
  {
    consent_type: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['granted', 'revoked', 'pending'],
      default: 'granted',
    },
    recorded_at: {
      type: Date,
      default: Date.now,
    },
    recorded_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const patientSchema = new Schema(
  {
    hospital_id: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
      index: true,
    },
    patient_code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    full_name: {
      type: String,
      required: true,
      trim: true,
    },
    date_of_birth: {
      type: Date,
      default: null,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    alternate_phone: {
      type: String,
      trim: true,
      default: null,
    },
    address: {
      type: addressSchema,
      default: () => ({}),
    },
    blood_group: {
      type: String,
      enum: BLOOD_GROUP_ENUM,
      default: null,
    },
    emergency_contact: {
      type: emergencyContactSchema,
      default: () => ({}),
    },
    family_whatsapp: {
      type: String,
      trim: true,
      default: null,
    },
    category: {
      type: String,
      enum: CATEGORY_ENUM,
      default: 'uncategorized',
      index: true,
    },
    medical_history: {
      type: medicalHistorySchema,
      default: () => ({}),
    },
    consents: {
      type: [consentSchema],
      default: [],
    },
    registered_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      required: true,
      index: true,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
    deleted_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

patientSchema.index({ hospital_id: 1, patient_code: 1 }, { unique: true });
patientSchema.index({ hospital_id: 1, phone: 1 });
patientSchema.index({ hospital_id: 1, alternate_phone: 1 });
patientSchema.index({ hospital_id: 1, family_whatsapp: 1 });
patientSchema.index({ hospital_id: 1, category: 1, is_active: 1, is_deleted: 1 });
patientSchema.index({ hospital_id: 1, createdAt: -1 });
patientSchema.index({ full_name: 'text', phone: 'text' });

module.exports = mongoose.models.SrcPatient || mongoose.model('SrcPatient', patientSchema, 'patients');
