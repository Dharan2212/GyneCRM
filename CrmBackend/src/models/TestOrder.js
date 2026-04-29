const mongoose = require('mongoose');

const { Schema } = mongoose;

const STATUS_ENUM = [
  'ordered',
  'pending_upload',
  'uploaded',
  'pending_review',
  'reviewed',
  'sent',
];

const PRIORITY_ENUM = ['routine', 'urgent', 'stat'];
const SEND_CHANNEL_ENUM = ['print', 'whatsapp', 'email', 'sms'];

const testOrderSchema = new Schema(
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
    consultation_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcConsultation',
      required: true,
      index: true,
    },
    prescription_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcPrescription',
      default: null,
      index: true,
    },
    appointment_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcAppointment',
      default: null,
      index: true,
    },
    test_catalog_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcTestCatalog',
      required: true,
      index: true,
    },
    ordered_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    ordered_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: STATUS_ENUM,
      default: 'ordered',
      index: true,
    },
    priority: {
      type: String,
      enum: PRIORITY_ENUM,
      default: 'routine',
      index: true,
    },
    clinical_notes: {
      type: String,
      trim: true,
      default: null,
    },
    indication: {
      type: String,
      trim: true,
      default: null,
    },
    specimen_type: {
      type: String,
      trim: true,
      default: null,
    },
    sample_collected_at: {
      type: Date,
      default: null,
    },
    expected_upload_at: {
      type: Date,
      default: null,
    },
    uploaded_at: {
      type: Date,
      default: null,
    },
    uploaded_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      default: null,
    },
    review_requested_at: {
      type: Date,
      default: null,
    },
    reviewed_at: {
      type: Date,
      default: null,
    },
    reviewed_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      default: null,
    },
    sent_at: {
      type: Date,
      default: null,
    },
    sent_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      default: null,
    },
    result_summary: {
      type: String,
      trim: true,
      default: null,
    },
    abnormal_flag: {
      type: Boolean,
      default: false,
      index: true,
    },
    send_channels: {
      type: [
        {
          type: String,
          enum: SEND_CHANNEL_ENUM,
        },
      ],
      default: [],
    },
    send_notes: {
      type: String,
      trim: true,
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

testOrderSchema.index({ hospital_id: 1, patient_id: 1, createdAt: -1 });
testOrderSchema.index({ hospital_id: 1, consultation_id: 1 });
testOrderSchema.index({ hospital_id: 1, doctor_id: 1, createdAt: -1 });
testOrderSchema.index({ hospital_id: 1, status: 1, createdAt: -1 });
testOrderSchema.index({ test_catalog_id: 1, createdAt: -1 });
testOrderSchema.index({ ordered_at: -1 });

testOrderSchema.virtual('is_upload_pending').get(function getIsUploadPending() {
  return this.status === 'ordered' || this.status === 'pending_upload';
});

testOrderSchema.virtual('is_review_pending').get(function getIsReviewPending() {
  return this.status === 'uploaded' || this.status === 'pending_review';
});

testOrderSchema.virtual('is_reviewed').get(function getIsReviewed() {
  return this.status === 'reviewed' || this.status === 'sent';
});

testOrderSchema.virtual('is_sent').get(function getIsSent() {
  return this.status === 'sent';
});

testOrderSchema.methods.isTerminalReviewState = function isTerminalReviewState() {
  return this.status === 'reviewed' || this.status === 'sent';
};

module.exports =
  mongoose.models.SrcTestOrder ||
  mongoose.model('SrcTestOrder', testOrderSchema, 'test_orders');
