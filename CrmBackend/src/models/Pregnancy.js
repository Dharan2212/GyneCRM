const mongoose = require('mongoose');

const { Schema } = mongoose;

const STATUS_ENUM = ['active', 'delivered', 'aborted', 'ectopic', 'transferred', 'closed'];
const CONCEPTION_TYPE_ENUM = ['spontaneous', 'assisted', 'ivf', 'unknown'];
const RH_FACTOR_ENUM = ['positive', 'negative', 'unknown'];
const MILESTONE_STATUS_ENUM = ['pending', 'completed', 'skipped'];

const highRiskFlagSchema = new Schema(
  {
    code: {
      type: String,
      trim: true,
      default: null,
    },
    label: {
      type: String,
      trim: true,
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
  },
);

const milestoneSchema = new Schema(
  {
    code: {
      type: String,
      trim: true,
      default: null,
    },
    title: {
      type: String,
      trim: true,
      default: null,
    },
    target_week: {
      type: Number,
      default: null,
      min: 0,
    },
    actual_date: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: MILESTONE_STATUS_ENUM,
      default: 'pending',
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    _id: false,
  },
);

function normalizeToUtcDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function addDays(baseDate, days) {
  const date = new Date(baseDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function getGestationalAgeParts(lmpDate, referenceDate = new Date()) {
  const lmp = normalizeToUtcDate(lmpDate);
  const reference = normalizeToUtcDate(referenceDate);

  if (!lmp || !reference) {
    return {
      weeks: null,
      days: null,
      totalDays: null,
    };
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const diffInDays = Math.max(0, Math.floor((reference.getTime() - lmp.getTime()) / msPerDay));

  return {
    weeks: Math.floor(diffInDays / 7),
    days: diffInDays % 7,
    totalDays: diffInDays,
  };
}

function getTrimesterFromWeeks(weeks) {
  if (typeof weeks !== 'number' || Number.isNaN(weeks) || weeks < 0) {
    return null;
  }

  if (weeks <= 13) {
    return 1;
  }

  if (weeks <= 27) {
    return 2;
  }

  return 3;
}

const pregnancySchema = new Schema(
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
    source_consultation_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcConsultation',
      default: null,
      index: true,
    },
    pregnancy_number: {
      type: Number,
      default: 1,
      min: 1,
    },
    status: {
      type: String,
      enum: STATUS_ENUM,
      default: 'active',
      index: true,
    },
    conception_type: {
      type: String,
      enum: CONCEPTION_TYPE_ENUM,
      default: 'unknown',
    },
    lmp_date: {
      type: Date,
      default: null,
    },
    edd: {
      type: Date,
      default: null,
    },
    gestational_age_weeks: {
      type: Number,
      default: null,
      min: 0,
    },
    gestational_age_days: {
      type: Number,
      default: null,
      min: 0,
      max: 6,
    },
    gravida: {
      type: Number,
      default: null,
      min: 0,
    },
    para: {
      type: Number,
      default: null,
      min: 0,
    },
    abortions: {
      type: Number,
      default: null,
      min: 0,
    },
    living_children: {
      type: Number,
      default: null,
      min: 0,
    },
    trimester: {
      type: Number,
      default: null,
      min: 1,
      max: 3,
    },
    high_risk: {
      type: Boolean,
      default: false,
    },
    high_risk_flags: {
      type: [highRiskFlagSchema],
      default: [],
    },
    high_risk_notes: {
      type: String,
      trim: true,
      default: null,
    },
    pregnancy_notes: {
      type: String,
      trim: true,
      default: null,
    },
    current_weight_kg: {
      type: Number,
      default: null,
      min: 0,
    },
    pre_pregnancy_weight_kg: {
      type: Number,
      default: null,
      min: 0,
    },
    blood_group: {
      type: String,
      trim: true,
      default: null,
    },
    rh_factor: {
      type: String,
      enum: RH_FACTOR_ENUM,
      default: 'unknown',
    },
    milestones: {
      type: [milestoneSchema],
      default: [],
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
    closed_at: {
      type: Date,
      default: null,
    },
    closed_by: {
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

pregnancySchema.statics.calculateEddFromLmp = function calculateEddFromLmp(lmpDate) {
  const lmp = normalizeToUtcDate(lmpDate);

  if (!lmp) {
    return null;
  }

  return addDays(lmp, 280);
};

pregnancySchema.statics.calculateGestationalAge = function calculateGestationalAge(lmpDate, referenceDate = new Date()) {
  return getGestationalAgeParts(lmpDate, referenceDate);
};

pregnancySchema.statics.deriveTrimester = function deriveTrimester(weeks) {
  return getTrimesterFromWeeks(weeks);
};

pregnancySchema.methods.getCurrentGestationalAge = function getCurrentGestationalAge(referenceDate = new Date()) {
  return getGestationalAgeParts(this.lmp_date, referenceDate);
};

pregnancySchema.methods.getCurrentTrimester = function getCurrentTrimester(referenceDate = new Date()) {
  const { weeks } = getGestationalAgeParts(this.lmp_date, referenceDate);
  return getTrimesterFromWeeks(weeks);
};

pregnancySchema.virtual('current_gestational_age').get(function currentGestationalAgeVirtual() {
  const { weeks, days } = getGestationalAgeParts(this.lmp_date, new Date());

  if (weeks === null || days === null) {
    return null;
  }

  return {
    weeks,
    days,
  };
});

pregnancySchema.pre('validate', function pregnancyPreValidate(next) {
  const hasLmp = !!normalizeToUtcDate(this.lmp_date);

  if (hasLmp) {
    const gestationalAge = getGestationalAgeParts(this.lmp_date, new Date());
    this.gestational_age_weeks = gestationalAge.weeks;
    this.gestational_age_days = gestationalAge.days;
    this.trimester = getTrimesterFromWeeks(gestationalAge.weeks);

    if (!this.edd) {
      this.edd = this.constructor.calculateEddFromLmp(this.lmp_date);
    }
  }

  if (!hasLmp && !this.edd) {
    this.gestational_age_weeks = null;
    this.gestational_age_days = null;
    this.trimester = null;
  }

  if (this.high_risk_flags && this.high_risk_flags.length > 0) {
    this.high_risk = true;
  }

  if (!this.high_risk) {
    this.high_risk_notes = this.high_risk_notes || null;
  }

  next();
});

pregnancySchema.index({ hospital_id: 1, patient_id: 1, createdAt: -1 });
pregnancySchema.index({ hospital_id: 1, status: 1, createdAt: -1 });
pregnancySchema.index({ patient_id: 1, status: 1 });
pregnancySchema.index({ doctor_id: 1, status: 1 });
pregnancySchema.index({ edd: 1 });
pregnancySchema.index({ lmp_date: 1 });

module.exports = mongoose.models.SrcPregnancy || mongoose.model('SrcPregnancy', pregnancySchema, 'pregnancies');
