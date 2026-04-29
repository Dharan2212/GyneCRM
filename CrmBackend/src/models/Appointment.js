const mongoose = require('mongoose');

const { Schema } = mongoose;

const STATUS_ENUM = ['scheduled', 'checked_in', 'completed', 'cancelled', 'no_show', 'rescheduled'];
const VISIT_TYPE_ENUM = ['new', 'follow_up', 'review', 'procedure', 'other'];

const appointmentSchema = new Schema(
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
    appointment_type_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcAppointmentType',
      required: true,
      index: true,
    },
    scheduled_at: {
      type: Date,
      required: true,
      index: true,
    },
    duration_minutes: {
      type: Number,
      required: true,
      min: 1,
      max: 480,
      default: 15,
    },
    visit_type: {
      type: String,
      enum: VISIT_TYPE_ENUM,
      default: 'new',
    },
    status: {
      type: String,
      enum: STATUS_ENUM,
      default: 'scheduled',
      index: true,
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
    booked_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      required: true,
      index: true,
    },
    checked_in_at: {
      type: Date,
      default: null,
    },
    checked_in_by: {
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
    completed_at: {
      type: Date,
      default: null,
    },
    completed_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      default: null,
    },
    no_show_marked_at: {
      type: Date,
      default: null,
    },
    no_show_marked_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      default: null,
    },
    rescheduled_from: {
      type: Schema.Types.ObjectId,
      ref: 'SrcAppointment',
      default: null,
      index: true,
    },
    rescheduled_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      default: null,
    },
    reschedule_reason: {
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

appointmentSchema.index({ hospital_id: 1, scheduled_at: 1 });
appointmentSchema.index({ doctor_id: 1, scheduled_at: 1 });
appointmentSchema.index({ patient_id: 1, scheduled_at: 1 });
appointmentSchema.index({ status: 1, scheduled_at: 1 });
appointmentSchema.index({ hospital_id: 1, status: 1, scheduled_at: 1 });
appointmentSchema.index({ hospital_id: 1, doctor_id: 1, status: 1, scheduled_at: 1 });

module.exports =
  mongoose.models.SrcAppointment || mongoose.model('SrcAppointment', appointmentSchema, 'appointments');
