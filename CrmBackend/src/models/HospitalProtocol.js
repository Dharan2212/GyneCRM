const mongoose = require('mongoose');

const { Schema } = mongoose;

const protocolMilestoneSchema = new Schema(
  {
    week: {
      type: Number,
      required: true,
      min: 0,
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
    test_rule: {
      type: String,
      trim: true,
      default: null,
    },
    message_template_id: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const hospitalProtocolSchema = new Schema(
  {
    hospital_id: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
      index: true,
    },
    protocol_name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['pregnancy', 'ivf', 'gynac', 'uncategorized'],
      index: true,
    },
    milestones: {
      type: [protocolMilestoneSchema],
      default: [],
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

hospitalProtocolSchema.index({ hospital_id: 1, category: 1, is_active: 1 });
hospitalProtocolSchema.index({ hospital_id: 1, protocol_name: 1 });

module.exports = mongoose.models.SrcHospitalProtocol || mongoose.model('SrcHospitalProtocol', hospitalProtocolSchema, 'hospital_protocols');
