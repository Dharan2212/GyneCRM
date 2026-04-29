const mongoose = require('mongoose');

const { Schema } = mongoose;
const { normalizeTrimmedStringArray } = require('../utils/schema-validation');

const STATUS_ENUM = ['draft', 'in_progress', 'completed', 'finalised'];

const vitalsSchema = new Schema(
  {
    height_cm: {
      type: Number,
      default: null,
      min: 0,
    },
    weight_kg: {
      type: Number,
      default: null,
      min: 0,
    },
    bmi: {
      type: Number,
      default: null,
      min: 0,
    },
    blood_pressure: {
      type: String,
      trim: true,
      default: null,
    },
    pulse: {
      type: Number,
      default: null,
      min: 0,
    },
    temperature_c: {
      type: Number,
      default: null,
      min: 0,
    },
    spo2: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    respiratory_rate: {
      type: Number,
      default: null,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const examinationSchema = new Schema(
  {
    general_examination: {
      type: String,
      trim: true,
      default: null,
    },
    systemic_examination: {
      type: String,
      trim: true,
      default: null,
    },
    abdominal_examination: {
      type: String,
      trim: true,
      default: null,
    },
    pelvic_examination: {
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

const diagnosisSchema = new Schema(
  {
    primary: {
      type: String,
      trim: true,
      default: null,
    },
    secondary: {
      type: [String],
      default: [],
      set: normalizeTrimmedStringArray,
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

const consultationSchema = new Schema(
  {
    hospital_id: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
      index: true,
    },
    patient_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcPatient',
      required: true,
      index: true,
    },
    doctor_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcDoctor',
      required: true,
      index: true,
    },
    appointment_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcAppointment',
      default: null,
      index: true,
    },
    started_at: {
      type: Date,
      default: null,
    },
    ended_at: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: STATUS_ENUM,
      default: 'draft',
      index: true,
    },
    chief_complaint: {
      type: String,
      trim: true,
      default: null,
    },
    history_of_present_illness: {
      type: String,
      trim: true,
      default: null,
    },
    vitals: {
      type: vitalsSchema,
      default: () => ({}),
    },
    examination: {
      type: examinationSchema,
      default: () => ({}),
    },
    diagnosis: {
      type: diagnosisSchema,
      default: () => ({}),
    },
    provisional_diagnosis: {
      type: String,
      trim: true,
      default: null,
    },
    advice: {
      type: String,
      trim: true,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    follow_up_required: {
      type: Boolean,
      default: false,
    },
    follow_up_date: {
      type: Date,
      default: null,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      required: true,
      index: true,
    },
    updated_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      default: null,
    },
    finalised_at: {
      type: Date,
      default: null,
    },
    finalised_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      default: null,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

consultationSchema.index({ hospital_id: 1, patient_id: 1, createdAt: -1 });
consultationSchema.index({ hospital_id: 1, doctor_id: 1, createdAt: -1 });
consultationSchema.index({ status: 1, createdAt: -1 });

module.exports =
  mongoose.models.SrcConsultation ||
  mongoose.model('SrcConsultation', consultationSchema, 'consultations');