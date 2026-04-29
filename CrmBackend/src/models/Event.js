const mongoose = require('mongoose');

const { Schema } = mongoose;

const SOURCE_TYPE_ENUM = ['prescription', 'test_order', 'patient_document', 'invoice', 'appointment', 'follow_up'];
const CHANNEL_ENUM = ['whatsapp', 'email', 'sms', 'print', 'manual'];
const STATUS_ENUM = ['received', 'mapped', 'queued', 'ignored', 'failed'];
const DISPATCH_MODE_ENUM = ['queue_only', 'queue_and_log', 'log_only'];

const eventSchema = new Schema(
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
      default: null,
      index: true,
    },
    doctor_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcDoctor',
      default: null,
      index: true,
    },
    source_type: {
      type: String,
      enum: SOURCE_TYPE_ENUM,
      required: true,
      index: true,
    },
    source_id: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    source_number: {
      type: String,
      trim: true,
      default: null,
    },
    event_type: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    template_key: {
      type: String,
      trim: true,
      default: null,
    },
    template_version: {
      type: Number,
      default: 1,
      min: 1,
    },
    channels: {
      type: [
        {
          type: String,
          enum: CHANNEL_ENUM,
          trim: true,
        },
      ],
      default: [],
    },
    recipient_snapshot: {
      type: Schema.Types.Mixed,
      default: null,
    },
    payload_snapshot: {
      type: Schema.Types.Mixed,
      default: null,
    },
    status: {
      type: String,
      enum: STATUS_ENUM,
      default: 'received',
      index: true,
    },
    dispatch_mode: {
      type: String,
      enum: DISPATCH_MODE_ENUM,
      default: 'queue_only',
    },
    dispatch_requested_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    dispatch_started_at: {
      type: Date,
      default: null,
    },
    dispatch_completed_at: {
      type: Date,
      default: null,
    },
    dispatch_failed_at: {
      type: Date,
      default: null,
    },
    error_code: {
      type: String,
      trim: true,
      default: null,
    },
    error_message: {
      type: String,
      trim: true,
      default: null,
    },
    queued_notification_ids: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'SrcNotification',
        },
      ],
      default: [],
    },
    send_history_ids: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'SrcSendHistory',
        },
      ],
      default: [],
    },
    initiated_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      default: null,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

eventSchema.index({ hospital_id: 1, event_type: 1, createdAt: -1 });
eventSchema.index({ hospital_id: 1, source_type: 1, source_id: 1 });
eventSchema.index({ hospital_id: 1, status: 1, createdAt: -1 });
eventSchema.index({ hospital_id: 1, patient_id: 1, createdAt: -1 });
eventSchema.index({ dispatch_requested_at: -1 });

eventSchema.pre('validate', function normalizeEvent(next) {
  this.channels = Array.from(new Set((this.channels || []).filter(Boolean)));

  if (!this.dispatch_requested_at) {
    this.dispatch_requested_at = new Date();
  }

  if (['ignored', 'failed'].includes(this.status)) {
    this.is_active = false;
  }

  next();
});

eventSchema.virtual('queued_count').get(function getQueuedCount() {
  return Array.isArray(this.queued_notification_ids) ? this.queued_notification_ids.length : 0;
});

eventSchema.virtual('has_send_history').get(function getHasSendHistory() {
  return Array.isArray(this.send_history_ids) && this.send_history_ids.length > 0;
});

module.exports =
  mongoose.models.SrcEvent ||
  mongoose.model('SrcEvent', eventSchema, 'events');
