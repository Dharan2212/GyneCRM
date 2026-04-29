const mongoose = require('mongoose');

const { Schema } = mongoose;

const appointmentTypeSchema = new Schema(
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
    description: {
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

appointmentTypeSchema.index({ hospital_id: 1, code: 1 }, { unique: true });
appointmentTypeSchema.index({ hospital_id: 1, name: 1 });

module.exports = mongoose.models.SrcAppointmentType || mongoose.model('SrcAppointmentType', appointmentTypeSchema, 'appointment_types');
