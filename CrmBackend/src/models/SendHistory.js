const mongoose = require('mongoose');

const { Schema } = mongoose;

const SOURCE_TYPE_ENUM = ['prescription', 'test_order', 'patient_document', 'invoice'];
const CHANNEL_ENUM = ['whatsapp', 'email', 'sms', 'print', 'manual'];
const STATUS_ENUM = ['requested', 'queued', 'sent', 'delivered', 'failed', 'cancelled'];
const RECIPIENT_TYPE_ENUM = ['patient', 'family', 'doctor', 'other'];

const sendHistorySchema = new Schema(
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
      default: null,
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
    message_summary: {
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
    status: {
      type: String,
      enum: STATUS_ENUM,
      default: 'requested',
      index: true,
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
    attempt_number: {
      type: Number,
      default: 1,
      min: 1,
    },
    requested_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    queued_at: {
      type: Date,
      default: null,
    },
    sent_at: {
      type: Date,
      default: null,
    },
    delivered_at: {
      type: Date,
      default: null,
    },
    failed_at: {
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

sendHistorySchema.index({ hospital_id: 1, patient_id: 1, createdAt: -1 });
sendHistorySchema.index({ hospital_id: 1, source_type: 1, createdAt: -1 });
sendHistorySchema.index({ hospital_id: 1, status: 1, createdAt: -1 });
sendHistorySchema.index({ hospital_id: 1, source_type: 1, source_id: 1 });
sendHistorySchema.index({ requested_at: -1 });

sendHistorySchema.virtual('is_sent').get(function getIsSent() {
  return this.status === 'sent' || this.status === 'delivered';
});

sendHistorySchema.virtual('is_failed').get(function getIsFailed() {
  return this.status === 'failed';
});

module.exports =
  mongoose.models.SrcSendHistory ||
  mongoose.model('SrcSendHistory', sendHistorySchema, 'send_history');
