const mongoose = require('mongoose');

const { Schema } = mongoose;
const { normalizeTrimmedStringArray } = require('../utils/schema-validation');

const DOCUMENT_TYPE_ENUM = [
  'test_result',
  'prescription_pdf',
  'scan',
  'report',
  'consent',
  'discharge_summary',
  'other',
];

const CATEGORY_ENUM = [
  'lab',
  'radiology',
  'consultation',
  'pregnancy',
  'delivery',
  'administrative',
  'other',
];

const STATUS_ENUM = ['active', 'archived', 'superseded'];
const UPLOAD_STATUS_ENUM = ['pending', 'uploaded', 'failed'];
const SEND_STATUS_ENUM = ['not_sent', 'sent'];
const SEND_CHANNEL_ENUM = ['print', 'whatsapp', 'email', 'sms'];
const STORAGE_PROVIDER_ENUM = ['local', 's3', 'gcs', 'azure', 'other'];
const REVIEW_STATUS_ENUM = ['not_required', 'pending', 'reviewed'];

const doctorReviewSchema = new Schema(
  {
    review_required: {
      type: Boolean,
      default: false,
    },
    review_status: {
      type: String,
      enum: REVIEW_STATUS_ENUM,
      default: 'not_required',
    },
    review_requested_at: {
      type: Date,
      default: null,
    },
    review_requested_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
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
    abnormal_flag: {
      type: Boolean,
      default: false,
    },
    findings_summary: {
      type: String,
      trim: true,
      default: null,
    },
    remarks: {
      type: String,
      trim: true,
      default: null,
    },
    action_required: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const patientDocumentSchema = new Schema(
  {
    hospital_id: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
    },
    patient_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcPatient',
      required: true,
    },
    doctor_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcDoctor',
      default: null,
    },
    consultation_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcConsultation',
      default: null,
    },
    prescription_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcPrescription',
      default: null,
    },
    appointment_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcAppointment',
      default: null,
    },
    test_order_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcTestOrder',
      default: null,
    },
    document_type: {
      type: String,
      enum: DOCUMENT_TYPE_ENUM,
      required: true,
      default: 'other',
    },
    category: {
      type: String,
      enum: CATEGORY_ENUM,
      required: true,
      default: 'other',
    },
    title: {
      type: String,
      trim: true,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
      set: normalizeTrimmedStringArray,
    },
    status: {
      type: String,
      enum: STATUS_ENUM,
      default: 'active',
    },
    upload_status: {
      type: String,
      enum: UPLOAD_STATUS_ENUM,
      default: 'pending',
    },
    send_status: {
      type: String,
      enum: SEND_STATUS_ENUM,
      default: 'not_sent',
    },
    storage_provider: {
      type: String,
      enum: STORAGE_PROVIDER_ENUM,
      default: null,
    },
    storage_bucket: {
      type: String,
      trim: true,
      default: null,
    },
    storage_key: {
      type: String,
      trim: true,
      default: null,
    },
    original_file_name: {
      type: String,
      trim: true,
      default: null,
    },
    stored_file_name: {
      type: String,
      trim: true,
      default: null,
    },
    mime_type: {
      type: String,
      trim: true,
      default: null,
    },
    file_extension: {
      type: String,
      trim: true,
      default: null,
    },
    file_size_bytes: {
      type: Number,
      min: 0,
      default: null,
    },
    checksum: {
      type: String,
      trim: true,
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
    sent_at: {
      type: Date,
      default: null,
    },
    sent_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      default: null,
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
    clinical_summary: {
      type: String,
      trim: true,
      default: null,
    },
    doctor_review: {
      type: doctorReviewSchema,
      default: () => ({}),
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      required: true,
    },
    updated_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      default: null,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

patientDocumentSchema.index({ hospital_id: 1, patient_id: 1, createdAt: -1 });
patientDocumentSchema.index({ hospital_id: 1, consultation_id: 1 });
patientDocumentSchema.index({ hospital_id: 1, test_order_id: 1 });
patientDocumentSchema.index({ hospital_id: 1, document_type: 1, createdAt: -1 });
patientDocumentSchema.index({ hospital_id: 1, status: 1, createdAt: -1 });
patientDocumentSchema.index({ upload_status: 1, createdAt: -1 });
patientDocumentSchema.index({ send_status: 1, createdAt: -1 });

patientDocumentSchema.virtual('is_uploaded').get(function getIsUploaded() {
  return this.upload_status === 'uploaded';
});

patientDocumentSchema.virtual('is_review_pending').get(function getIsReviewPending() {
  return this.doctor_review?.review_status === 'pending';
});

patientDocumentSchema.virtual('is_reviewed').get(function getIsReviewed() {
  return this.doctor_review?.review_status === 'reviewed';
});

patientDocumentSchema.virtual('is_sent').get(function getIsSent() {
  return this.send_status === 'sent';
});

patientDocumentSchema.pre('validate', function normalizePatientDocument(next) {
  this.tags = Array.isArray(this.tags)
    ? this.tags
        .map((tag) => String(tag || '').trim())
        .filter(Boolean)
    : [];

  if (this.upload_status !== 'uploaded') {
    this.uploaded_at = this.upload_status === 'failed' ? this.uploaded_at : null;
    if (this.upload_status !== 'failed') {
      this.uploaded_by = null;
    }
  }

  if (this.send_status !== 'sent') {
    this.sent_at = null;
    this.sent_by = null;
    this.send_channels = [];
  }

  if (this.doctor_review?.review_required) {
    if (!this.doctor_review.review_status || this.doctor_review.review_status === 'not_required') {
      this.doctor_review.review_status = 'pending';
    }
  } else {
    this.doctor_review.review_status = 'not_required';
    this.doctor_review.review_requested_at = null;
    this.doctor_review.review_requested_by = null;
    this.doctor_review.reviewed_at = null;
    this.doctor_review.reviewed_by = null;
    this.doctor_review.abnormal_flag = false;
    this.doctor_review.findings_summary = null;
    this.doctor_review.remarks = null;
    this.doctor_review.action_required = false;
  }

  if (this.doctor_review?.review_status !== 'reviewed') {
    this.doctor_review.reviewed_at = null;
    this.doctor_review.reviewed_by = null;
  }

  if (this.status !== 'active') {
    this.is_active = false;
  }

  next();
});

module.exports =
  mongoose.models.SrcPatientDocument ||
  mongoose.model('SrcPatientDocument', patientDocumentSchema, 'patient_documents');
