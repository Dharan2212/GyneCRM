const mongoose = require('mongoose');

const { Schema } = mongoose;

const SOURCE_TYPE_ENUM = ['prescription', 'test_order', 'patient_document', 'invoice', 'appointment', 'follow_up'];
const CHANNEL_ENUM = ['whatsapp', 'email', 'sms', 'print', 'manual'];
const RECIPIENT_TYPE_ENUM = ['patient', 'family', 'doctor', 'other'];
const PRIORITY_ENUM = ['low', 'normal', 'high', 'urgent'];
const STATUS_ENUM = ['queued', 'scheduled', 'processing', 'sent', 'delivered', 'failed', 'cancelled', 'dead_letter'];

const notificationSchema = new Schema(
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
    channel: {
      type: String,
      enum: CHANNEL_ENUM,
      required: true,
      index: true,
    },
    recipient: {
      type: String,
      trim: true,
      required: true,
    },
    recipient_type: {
      type: String,
      enum: RECIPIENT_TYPE_ENUM,
      default: 'patient',
    },
    subject: {
      type: String,
      trim: true,
      default: null,
    },
    body_summary: {
      type: String,
      trim: true,
      default: null,
    },
    template_key: {
      type: String,
      trim: true,
      default: null,
    },
    payload_snapshot: {
      type: Schema.Types.Mixed,
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
      default: 'queued',
      index: true,
    },
    queue_name: {
      type: String,
      trim: true,
      default: 'notifications_outbound',
      index: true,
    },
    queue_key: {
      type: String,
      trim: true,
      default: null,
    },
    scheduled_for: {
      type: Date,
      default: null,
      index: true,
    },
    available_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    reserved_at: {
      type: Date,
      default: null,
    },
    started_at: {
      type: Date,
      default: null,
    },
    completed_at: {
      type: Date,
      default: null,
    },
    failed_at: {
      type: Date,
      default: null,
    },
    cancelled_at: {
      type: Date,
      default: null,
    },
    expires_at: {
      type: Date,
      default: null,
    },
    provider: {
      type: String,
      trim: true,
      default: 'internal',
    },
    provider_message_id: {
      type: String,
      trim: true,
      default: null,
    },
    attempt_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    max_attempts: {
      type: Number,
      default: 3,
      min: 1,
    },
    last_error_code: {
      type: String,
      trim: true,
      default: null,
    },
    last_error_message: {
      type: String,
      trim: true,
      default: null,
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
    send_history_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcSendHistory',
      default: null,
      index: true,
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

notificationSchema.index({ hospital_id: 1, patient_id: 1, createdAt: -1 });
notificationSchema.index({ hospital_id: 1, source_type: 1, source_id: 1 });
notificationSchema.index({ hospital_id: 1, channel: 1, status: 1, createdAt: -1 });
notificationSchema.index({ hospital_id: 1, queue_name: 1, status: 1, available_at: 1 });
notificationSchema.index({ hospital_id: 1, status: 1, createdAt: -1 });
notificationSchema.index({ hospital_id: 1, scheduled_for: 1 });

notificationSchema.pre('validate', function normalizeQueueFields(next) {
  if (!this.available_at) {
    this.available_at = this.scheduled_for || new Date();
  }

  if (this.status === 'scheduled' && !this.scheduled_for) {
    this.scheduled_for = this.available_at;
  }

  if (this.status === 'cancelled') {
    this.is_active = false;
    if (!this.cancelled_at) {
      this.cancelled_at = new Date();
    }
  }

  next();
});

notificationSchema.virtual('is_terminal').get(function getIsTerminal() {
  return ['sent', 'delivered', 'failed', 'cancelled', 'dead_letter'].includes(this.status);
});

notificationSchema.virtual('is_ready_to_process').get(function getIsReadyToProcess() {
  if (!['queued', 'scheduled'].includes(this.status)) {
    return false;
  }

  const now = Date.now();
  const availableAt = this.available_at ? new Date(this.available_at).getTime() : now;
  const expiresAt = this.expires_at ? new Date(this.expires_at).getTime() : null;

  if (expiresAt && expiresAt < now) {
    return false;
  }

  return availableAt <= now;
});

module.exports =
  mongoose.models.SrcNotification ||
  mongoose.model('SrcNotification', notificationSchema, 'notifications');
