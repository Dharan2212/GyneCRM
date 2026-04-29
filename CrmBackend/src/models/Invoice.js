const mongoose = require('mongoose');

const { Schema } = mongoose;

const STATUS_ENUM = ['draft', 'issued', 'partially_paid', 'paid', 'void'];
const CURRENCY_ENUM = ['INR', 'USD', 'EUR', 'GBP', 'OTHER'];
const ITEM_TYPE_ENUM = ['consultation', 'procedure', 'medicine', 'lab_test', 'document', 'service', 'other'];
const SOURCE_TYPE_ENUM = ['consultation', 'prescription', 'test_order', 'patient_document', 'appointment', 'service', 'other'];
const ITEM_STATUS_ENUM = ['active', 'cancelled', 'waived'];
const PAYMENT_METHOD_ENUM = ['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'other'];
const PAYMENT_STATUS_ENUM = ['recorded', 'confirmed', 'failed', 'reversed'];
const SEND_STATUS_ENUM = ['not_sent', 'sent'];
const SEND_CHANNEL_ENUM = ['print', 'whatsapp', 'email', 'sms'];

const roundMoney = (value) => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Math.round((numberValue + Number.EPSILON) * 100) / 100;
};

const invoiceItemSchema = new Schema(
  {
    item_no: {
      type: Number,
      default: null,
      min: 1,
    },
    item_type: {
      type: String,
      enum: ITEM_TYPE_ENUM,
      default: 'other',
    },
    label: {
      type: String,
      trim: true,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    source_type: {
      type: String,
      enum: SOURCE_TYPE_ENUM,
      default: null,
    },
    source_id: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 0,
    },
    unit_price: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    line_total: {
      type: Number,
      default: 0,
      min: 0,
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
    versionKey: false,
  },
);

const paymentSchema = new Schema(
  {
    payment_no: {
      type: Number,
      default: null,
      min: 1,
    },
    payment_date: {
      type: Date,
      default: Date.now,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    method: {
      type: String,
      enum: PAYMENT_METHOD_ENUM,
      default: 'other',
    },
    reference_number: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: PAYMENT_STATUS_ENUM,
      default: 'recorded',
    },
    collected_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
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
    versionKey: false,
  },
);

const invoiceSchema = new Schema(
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
    appointment_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcAppointment',
      default: null,
      index: true,
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
      index: true,
    },
    test_order_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcTestOrder',
      default: null,
    },
    patient_document_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcPatientDocument',
      default: null,
      index: true,
    },
    invoice_number: {
      type: String,
      trim: true,
      default: null,
    },
    invoice_date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    due_date: {
      type: Date,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: STATUS_ENUM,
      default: 'draft',
      index: true,
    },
    currency: {
      type: String,
      enum: CURRENCY_ENUM,
      default: 'INR',
    },
    subtotal_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    amount_paid: {
      type: Number,
      default: 0,
      min: 0,
    },
    amount_due: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    internal_notes: {
      type: String,
      trim: true,
      default: null,
    },
    items: {
      type: [invoiceItemSchema],
      default: [],
    },
    payments: {
      type: [paymentSchema],
      default: [],
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

invoiceSchema.index({ hospital_id: 1, patient_id: 1, createdAt: -1 });
invoiceSchema.index(
  { hospital_id: 1, invoice_number: 1 },
  {
    unique: true,
    partialFilterExpression: {
      invoice_number: { $exists: true, $type: 'string' },
    },
  },
);
invoiceSchema.index({ hospital_id: 1, status: 1, createdAt: -1 });
invoiceSchema.index({ invoice_date: -1 });
invoiceSchema.index({ due_date: -1 });
invoiceSchema.index({ consultation_id: 1 });
invoiceSchema.index({ test_order_id: 1 });
invoiceSchema.index({ send_status: 1, createdAt: -1 });

invoiceSchema.statics.getCounterKey = function getCounterKey() {
  return 'invoice_number';
};

invoiceSchema.virtual('total_items').get(function getTotalItems() {
  return Array.isArray(this.items) ? this.items.length : 0;
});

invoiceSchema.virtual('is_fully_paid').get(function getIsFullyPaid() {
  return !this.void_status && roundMoney(this.amount_due) <= 0 && roundMoney(this.total_amount) > 0;
});

invoiceSchema.virtual('is_partially_paid').get(function getIsPartiallyPaid() {
  return !this.void_status && roundMoney(this.amount_paid) > 0 && roundMoney(this.amount_due) > 0;
});

invoiceSchema.virtual('is_voided').get(function getIsVoided() {
  return Boolean(this.void_status) || this.status === 'void';
});

invoiceSchema.virtual('is_sent').get(function getIsSent() {
  return this.send_status === 'sent';
});

invoiceSchema.methods.getRecordedPaymentsTotal = function getRecordedPaymentsTotal() {
  if (!Array.isArray(this.payments)) {
    return 0;
  }

  return roundMoney(
    this.payments.reduce((sum, payment) => {
      if (!payment) {
        return sum;
      }

      if (payment.status === 'failed' || payment.status === 'reversed') {
        return sum;
      }

      return sum + roundMoney(payment.amount);
    }, 0),
  );
};

invoiceSchema.pre('validate', function normalizeInvoice(next) {
  if (!Array.isArray(this.items)) {
    this.items = [];
  }

  if (!Array.isArray(this.payments)) {
    this.payments = [];
  }

  this.items = this.items.map((item, index) => {
    const quantity = roundMoney(item.quantity === null || item.quantity === undefined ? 1 : item.quantity);
    const unitPrice = roundMoney(item.unit_price);
    const discountAmount = roundMoney(item.discount_amount);
    const taxAmount = roundMoney(item.tax_amount);
    const computedLineTotal = roundMoney((quantity * unitPrice) - discountAmount + taxAmount);

    return {
      ...item,
      item_no: index + 1,
      quantity,
      unit_price: unitPrice,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      line_total: computedLineTotal < 0 ? 0 : computedLineTotal,
    };
  });

  this.payments = this.payments.map((payment, index) => ({
    ...payment,
    payment_no: index + 1,
    amount: roundMoney(payment.amount),
  }));

  const activeItems = this.items.filter((item) => item && item.status !== 'cancelled');
  const subtotalAmount = roundMoney(
    activeItems.reduce((sum, item) => sum + roundMoney(item.quantity) * roundMoney(item.unit_price), 0),
  );
  const discountAmount = roundMoney(
    activeItems.reduce((sum, item) => sum + roundMoney(item.discount_amount), 0),
  );
  const taxAmount = roundMoney(
    activeItems.reduce((sum, item) => sum + roundMoney(item.tax_amount), 0),
  );
  const totalAmount = roundMoney(subtotalAmount - discountAmount + taxAmount);
  const amountPaid = this.getRecordedPaymentsTotal();
  const amountDue = roundMoney(totalAmount - amountPaid);

  this.subtotal_amount = subtotalAmount;
  this.discount_amount = discountAmount;
  this.tax_amount = taxAmount;
  this.total_amount = totalAmount < 0 ? 0 : totalAmount;
  this.amount_paid = amountPaid < 0 ? 0 : amountPaid;
  this.amount_due = amountDue < 0 ? 0 : amountDue;

  if (this.status === 'void' || this.void_status) {
    this.status = 'void';
    this.void_status = true;
    this.is_active = false;
  } else if (!this.status) {
    this.status = 'draft';
  }

  if (!this.void_status) {
    this.voided_at = null;
    this.voided_by = null;
    this.void_reason = null;
  }

  if (!this.send_status) {
    this.send_status = 'not_sent';
  }

  next();
});

module.exports = mongoose.models.SrcInvoice || mongoose.model('SrcInvoice', invoiceSchema, 'invoices');
