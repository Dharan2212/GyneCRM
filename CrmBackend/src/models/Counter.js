const mongoose = require('mongoose');

const { Schema } = mongoose;

const counterSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

counterSchema.index({ key: 1 }, { unique: true });

module.exports = mongoose.models.SrcCounter || mongoose.model('SrcCounter', counterSchema, 'counters');