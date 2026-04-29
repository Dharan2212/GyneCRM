const mongoose = require('mongoose');

const { Schema } = mongoose;

const labReferenceRangeSchema = new Schema(
  {
    hospital_id: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
      index: true,
    },
    test_catalog_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcTestCatalog',
      required: true,
      index: true,
    },
    parameter_name: {
      type: String,
      required: true,
      trim: true,
    },
    normal_min: {
      type: Number,
      default: null,
    },
    normal_max: {
      type: Number,
      default: null,
    },
    unit: {
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
    timestamps: true,
    versionKey: false,
  },
);

labReferenceRangeSchema.index({ hospital_id: 1, test_catalog_id: 1, parameter_name: 1 });

module.exports = mongoose.models.SrcLabReferenceRange || mongoose.model('SrcLabReferenceRange', labReferenceRangeSchema, 'lab_reference_ranges');
