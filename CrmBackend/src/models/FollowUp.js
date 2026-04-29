const mongoose = require('mongoose');

const { Schema } = mongoose;

const STATUS_ENUM = ['pending', 'completed', 'cancelled', 'missed'];
const PRIORITY_ENUM = ['low', 'normal', 'high', 'urgent'];

const followUpSchema = new Schema(
  {
    hospital_id: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
      index: true,
    },
    consultation_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcConsultation',
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
    due_date: {
      type: Date,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: STATUS_ENUM,
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: PRIORITY_ENUM,
      default: 'normal',
      index: true,
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
    completed_at: {
      type: Date,
      default: null,
    },
    completed_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      default: null,
    },
    cancelled_at: {
      type: Date,
      default: null,
    },
    cancelled_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      default: null,
    },
    cancellation_reason: {
      type: String,
      trim: true,
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

followUpSchema.index({ hospital_id: 1, status: 1, due_date: 1 });
followUpSchema.index({ patient_id: 1, due_date: 1 });
followUpSchema.index({ doctor_id: 1, due_date: 1 });
followUpSchema.index(
  { consultation_id: 1, is_active: 1 },
  {
    unique: true,
    partialFilterExpression: { is_active: true },
  },
);

module.exports =
  mongoose.models.SrcFollowUp || mongoose.model('SrcFollowUp', followUpSchema, 'follow_ups');