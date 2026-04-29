const mongoose = require('mongoose');

const { Schema } = mongoose;

const serviceCatalogSchema = new Schema(
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
    category: {
      type: String,
      trim: true,
      default: null,
    },
    default_price: {
      type: Number,
      default: 0,
      min: 0,
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

serviceCatalogSchema.index({ hospital_id: 1, name: 1 });
serviceCatalogSchema.index({ hospital_id: 1, category: 1 });

module.exports = mongoose.models.SrcServiceCatalog || mongoose.model('SrcServiceCatalog', serviceCatalogSchema, 'service_catalog');
