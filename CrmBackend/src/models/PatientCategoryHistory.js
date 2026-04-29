const mongoose = require('mongoose');

const { Schema } = mongoose;

const patientCategoryHistorySchema = new Schema(
  {
    patient_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcPatient',
      required: true,
      index: true,
    },
    hospital_id: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
      index: true,
    },
    previous_category: {
      type: String,
      required: true,
      enum: ['pregnancy', 'ivf', 'gynac', 'uncategorized'],
    },
    new_category: {
      type: String,
      required: true,
      enum: ['pregnancy', 'ivf', 'gynac', 'uncategorized'],
    },
    changed_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      default: null,
    },
    changed_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

patientCategoryHistorySchema.index({ patient_id: 1, changed_at: -1 });
patientCategoryHistorySchema.index({ hospital_id: 1, patient_id: 1, changed_at: -1 });
patientCategoryHistorySchema.index({ hospital_id: 1, new_category: 1, changed_at: -1 });

module.exports = mongoose.models.SrcPatientCategoryHistory
  || mongoose.model('SrcPatientCategoryHistory', patientCategoryHistorySchema, 'patient_category_history');
