const mongoose = require('mongoose');

const { Schema } = mongoose;

const workWindowSchema = new Schema(
  {
    day_of_week: {
      type: Number,
      min: 0,
      max: 6,
      required: true,
    },
    start_time: {
      type: String,
      required: true,
      trim: true,
    },
    end_time: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const leaveSchema = new Schema(
  {
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const scheduleBlockSchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    start_time: {
      type: String,
      required: true,
      trim: true,
    },
    end_time: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const doctorSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      required: true,
    },
    hospital_id: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
      index: true,
    },
    full_name: {
      type: String,
      required: true,
      trim: true,
    },
    speciality: {
      type: String,
      required: true,
      trim: true,
    },
    qualification: {
      type: String,
      trim: true,
      default: null,
    },
    registration_number: {
      type: String,
      trim: true,
      default: null,
    },
    schedule_settings: {
      slot_duration_minutes: {
        type: Number,
        min: 1,
        default: 15,
      },
      work_windows: {
        type: [workWindowSchema],
        default: [],
      },
    },
    leaves: {
      type: [leaveSchema],
      default: [],
    },
    schedule_blocks: {
      type: [scheduleBlockSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

doctorSchema.index({ hospital_id: 1, full_name: 1 });
doctorSchema.index({ hospital_id: 1, speciality: 1 });
doctorSchema.index({ hospital_id: 1, registration_number: 1 }, { sparse: true });
doctorSchema.index({ user_id: 1 }, { unique: true });

module.exports = mongoose.models.SrcDoctor || mongoose.model('SrcDoctor', doctorSchema, 'doctors');
