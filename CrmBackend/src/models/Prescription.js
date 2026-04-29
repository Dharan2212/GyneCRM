const mongoose = require('mongoose');

const { Schema } = mongoose;

const ISSUE_STATUS_ENUM = ['draft', 'issued'];
const SEND_STATUS_ENUM = ['not_sent', 'sent'];
const SEND_CHANNEL_ENUM = ['print', 'whatsapp', 'email', 'sms'];
const ITEM_STATUS_ENUM = ['active', 'stopped', 'substituted'];
const DURATION_UNIT_ENUM = ['day', 'days', 'week', 'weeks', 'month', 'months'];

const prescriptionItemSchema = new Schema(
  {
    item_no: {
      type: Number,
      default: null,
      min: 1,
    },
    medicine_name: {
      type: String,
      trim: true,
      required: true,
    },
    generic_name: {
      type: String,
      trim: true,
      default: null,
    },
    formulation: {
      type: String,
      trim: true,
      default: null,
    },
    strength: {
      type: String,
      trim: true,
      default: null,
    },
    dose: {
      type: String,
      trim: true,
      default: null,
    },
    route: {
      type: String,
      trim: true,
      default: null,
    },
    frequency: {
      type: String,
      trim: true,
      default: null,
    },
    duration_value: {
      type: Number,
      default: null,
      min: 0,
    },
    duration_unit: {
      type: String,
      enum: DURATION_UNIT_ENUM,
      default: null,
    },
    quantity: {
      type: Number,
      default: null,
      min: 0,
    },
    instructions: {
      type: String,
      trim: true,
      default: null,
    },
    before_food: {
      type: Boolean,
      default: false,
    },
    after_food: {
      type: Boolean,
      default: false,
    },
    morning: {
      type: Boolean,
      default: false,
    },
    afternoon: {
      type: Boolean,
      default: false,
    },
    evening: {
      type: Boolean,
      default: false,
    },
    night: {
      type: Boolean,
      default: false,
    },
    is_prn: {
      type: Boolean,
      default: false,
    },
    prn_reason: {
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
      enum: ITEM_STATUS_ENUM,
      default: 'active',
    },
  },
  {
    _id: false,
  },
);

const prescriptionSchema = new Schema(
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
    appointment_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcAppointment',
      default: null,
      index: true,
    },
    prescription_date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    diagnosis_summary: {
      type: String,
      trim: true,
      default: null,
    },
    advice_notes: {
      type: String,
      trim: true,
      default: null,
    },
    general_instructions: {
      type: String,
      trim: true,
      default: null,
    },
    items: {
      type: [prescriptionItemSchema],
      default: [],
    },
    issue_status: {
      type: String,
      enum: ISSUE_STATUS_ENUM,
      default: 'draft',
      index: true,
    },
    issued_at: {
      type: Date,
      default: null,
    },
    issued_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      default: null,
    },
    void_status: {
      type: Boolean,
      default: false,
      index: true,
    },
    voided_at: {
      type: Date,
      default: null,
    },
    voided_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      default: null,
    },
    void_reason: {
      type: String,
      trim: true,
      default: null,
    },
    send_status: {
      type: String,
      enum: SEND_STATUS_ENUM,
      default: 'not_sent',
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
    sent_at: {
      type: Date,
      default: null,
    },
    sent_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      default: null,
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

prescriptionSchema.index({ hospital_id: 1, patient_id: 1, createdAt: -1 });
prescriptionSchema.index({ hospital_id: 1, consultation_id: 1 });
prescriptionSchema.index({ hospital_id: 1, doctor_id: 1, createdAt: -1 });
prescriptionSchema.index({ prescription_date: -1 });
prescriptionSchema.index({ issue_status: 1, createdAt: -1 });
prescriptionSchema.index({ send_status: 1, createdAt: -1 });

prescriptionSchema.virtual('total_items').get(function getTotalItems() {
  return Array.isArray(this.items) ? this.items.length : 0;
});

prescriptionSchema.virtual('is_issued').get(function getIsIssued() {
  return this.issue_status === 'issued';
});

prescriptionSchema.virtual('is_voided').get(function getIsVoided() {
  return Boolean(this.void_status);
});

prescriptionSchema.virtual('is_sent').get(function getIsSent() {
  return this.send_status === 'sent';
});

prescriptionSchema.virtual('is_send_ready').get(function getIsSendReady() {
  return this.issue_status === 'issued' && !this.void_status && (this.items?.length || 0) > 0;
});

prescriptionSchema.methods.getActiveItemsCount = function getActiveItemsCount() {
  return Array.isArray(this.items)
    ? this.items.filter((item) => item && item.status === 'active').length
    : 0;
};

prescriptionSchema.pre('validate', function normalizeItems(next) {
  if (Array.isArray(this.items)) {
    this.items = this.items.map((item, index) => ({
      ...item,
      item_no: index + 1,
    }));
  }

  next();
});

module.exports =
  mongoose.models.SrcPrescription ||
  mongoose.model('SrcPrescription', prescriptionSchema, 'prescriptions');
