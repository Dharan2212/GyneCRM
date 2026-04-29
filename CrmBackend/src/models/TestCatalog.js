const mongoose = require('mongoose');

const { Schema } = mongoose;

const testCatalogSchema = new Schema(
  {
    hospital_id: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    category: {
      type: String,
      trim: true,
      default: null,
    },
    reference_unit: {
      type: String,
      trim: true,
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

testCatalogSchema.index({ hospital_id: 1, code: 1 }, { unique: true });
testCatalogSchema.index({ hospital_id: 1, name: 1 });

module.exports = mongoose.models.SrcTestCatalog || mongoose.model('SrcTestCatalog', testCatalogSchema, 'test_catalog');
