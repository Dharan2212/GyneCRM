const mongoose = require('mongoose');

const { Schema } = mongoose;

const STATUS_ENUM = ['waiting', 'contacted', 'converted', 'expired', 'cancelled'];
const PRIORITY_ENUM = ['low', 'normal', 'high', 'urgent'];

const preferredTimeRangeSchema = new Schema(
  {
    start_time: {
      type: String,
      trim: true,
      default: null,
    },
    end_time: {
      type: String,
      trim: true,
      default: null,
    },
    label: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    _id: false,
    id: false,
  },
);

const waitlistSchema = new Schema(
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
    preferred_doctor_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcDoctor',
      default: null,
      index: true,
    },
    appointment_type_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcAppointmentType',
      default: null,
      index: true,
    },
    desired_date: {
      type: Date,
      required: true,
      index: true,
    },
    preferred_time_range: {
      type: preferredTimeRangeSchema,
      default: () => ({}),
    },
    reason_for_visit: {
      type: String,
      trim: true,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    priority: {
      type: String,
      enum: PRIORITY_ENUM,
      default: 'normal',
      index: true,
    },
    status: {
      type: String,
      enum: STATUS_ENUM,
      default: 'waiting',
      index: true,
    },
    source_appointment_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcAppointment',
      default: null,
      index: true,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      required: true,
      index: true,
    },
    contacted_at: {
      type: Date,
      default: null,
    },
    contacted_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      default: null,
    },
    converted_to_appointment_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcAppointment',
      default: null,
      index: true,
    },
    converted_at: {
      type: Date,
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

waitlistSchema.index({ hospital_id: 1, status: 1, createdAt: -1 });
waitlistSchema.index({ patient_id: 1, createdAt: -1 });
waitlistSchema.index({ preferred_doctor_id: 1, desired_date: 1 });

module.exports =
  mongoose.models.SrcWaitlist || mongoose.model('SrcWaitlist', waitlistSchema, 'waitlist');
