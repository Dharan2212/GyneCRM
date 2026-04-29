const mongoose = require('mongoose');

const { Schema } = mongoose;

const STATUS_ENUM = ['draft', 'active', 'paused', 'completed', 'cancelled', 'archived'];
const PLAN_TYPE_ENUM = ['care_plan', 'follow_up_plan', 'treatment_plan', 'communication_plan', 'custom'];
const PRIORITY_ENUM = ['low', 'normal', 'high', 'urgent'];
const MILESTONE_STATUS_ENUM = ['pending', 'in_progress', 'completed', 'skipped', 'cancelled'];
const LINKED_ENTITY_TYPE_ENUM = [
  'appointment',
  'consultation',
  'pregnancy',
  'follow_up',
  'prescription',
  'test_order',
  'invoice',
  'document',
  'other',
];

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
    description: {
      type: String,
      trim: true,
      default: null,
    },
    target_date: {
      type: Date,
      default: null,
    },
    completed_at: {
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

const linkedEntitySchema = new Schema(
  {
    entity_type: {
      type: String,
      enum: LINKED_ENTITY_TYPE_ENUM,
      default: 'other',
    },
    entity_id: {
      type: Schema.Types.ObjectId,
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

const journeyPlanSchema = new Schema(
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
    owner_doctor_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcDoctor',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    plan_type: {
      type: String,
      enum: PLAN_TYPE_ENUM,
      default: 'custom',
      index: true,
    },
    status: {
      type: String,
      enum: STATUS_ENUM,
      default: 'draft',
      index: true,
    },
    priority: {
      type: String,
      enum: PRIORITY_ENUM,
      default: 'normal',
    },
    start_date: {
      type: Date,
      default: null,
    },
    target_date: {
      type: Date,
      default: null,
      index: true,
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
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    milestones: {
      type: [milestoneSchema],
      default: [],
    },
    linked_entities: {
      type: [linkedEntitySchema],
      default: [],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      default: null,
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
  },
);

journeyPlanSchema.index({ hospital_id: 1, patient_id: 1, createdAt: -1 });
journeyPlanSchema.index({ hospital_id: 1, status: 1, createdAt: -1 });
journeyPlanSchema.index({ owner_doctor_id: 1, status: 1 });
journeyPlanSchema.index({ plan_type: 1, status: 1 });
journeyPlanSchema.index({ target_date: 1 });

module.exports =
  mongoose.models.SrcJourneyPlan ||
  mongoose.model('SrcJourneyPlan', journeyPlanSchema, 'journey_plans');
