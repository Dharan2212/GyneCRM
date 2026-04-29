const mongoose = require('mongoose');

const { Schema } = mongoose;

const JOB_TYPE_ENUM = [
  'appointment_reminders',
  'day_close',
  'pregnancy_week_update',
  'follow_up_due',
  'waitlist_expiry',
  'retry_notifications',
];

const RUN_MODE_ENUM = ['manual', 'scheduled'];
const STATUS_ENUM = ['queued', 'scheduled', 'running', 'completed', 'failed', 'cancelled', 'skipped'];

const jobSchema = new Schema(
  {
    hospital_id: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
      index: true,
    },
    job_type: {
      type: String,
      enum: JOB_TYPE_ENUM,
      required: true,
      index: true,
    },
    scope_date: {
      type: Date,
      default: null,
      index: true,
    },
    run_mode: {
      type: String,
      enum: RUN_MODE_ENUM,
      default: 'manual',
    },
    status: {
      type: String,
      enum: STATUS_ENUM,
      default: 'queued',
      index: true,
    },
    payload_snapshot: {
      type: Schema.Types.Mixed,
      default: null,
    },
    scheduled_for: {
      type: Date,
      default: null,
      index: true,
    },
    available_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    started_at: {
      type: Date,
      default: null,
    },
    completed_at: {
      type: Date,
      default: null,
    },
    failed_at: {
      type: Date,
      default: null,
    },
    cancelled_at: {
      type: Date,
      default: null,
    },
    result_summary: {
      type: Schema.Types.Mixed,
      default: null,
    },
    result_counts: {
      type: Schema.Types.Mixed,
      default: null,
    },
    related_event_ids: {
      type: [{ type: Schema.Types.ObjectId, ref: 'SrcEvent' }],
      default: [],
    },
    related_notification_ids: {
      type: [{ type: Schema.Types.ObjectId, ref: 'SrcNotification' }],
      default: [],
    },
    related_send_history_ids: {
      type: [{ type: Schema.Types.ObjectId, ref: 'SrcSendHistory' }],
      default: [],
    },
    queue_key: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    attempt_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    max_attempts: {
      type: Number,
      default: 3,
      min: 1,
    },
    last_error_code: {
      type: String,
      trim: true,
      default: null,
    },
    last_error_message: {
      type: String,
      trim: true,
      default: null,
    },
    triggered_by: {
      type: Schema.Types.ObjectId,
      ref: 'SrcUser',
      default: null,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
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

jobSchema.index({ hospital_id: 1, job_type: 1, createdAt: -1 });
jobSchema.index({ hospital_id: 1, status: 1, createdAt: -1 });
jobSchema.index({ hospital_id: 1, scheduled_for: 1 });
jobSchema.index({ hospital_id: 1, scope_date: 1 });
jobSchema.index({ hospital_id: 1, queue_key: 1, status: 1 });

jobSchema.pre('validate', function normalizeJob(next) {
  if (!this.available_at) {
    this.available_at = this.scheduled_for || new Date();
  }

  if (this.status === 'scheduled' && !this.scheduled_for) {
    this.scheduled_for = this.available_at;
  }

  if (this.status === 'cancelled') {
    this.is_active = false;
    if (!this.cancelled_at) {
      this.cancelled_at = new Date();
    }
  }

  if (['completed', 'failed', 'skipped'].includes(this.status)) {
    this.is_active = false;
  }

  if (this.result_counts && typeof this.result_counts === 'object') {
    const normalized = {};
    Object.entries(this.result_counts).forEach(([key, value]) => {
      normalized[key] = Number.isFinite(Number(value)) ? Number(value) : value;
    });
    this.result_counts = normalized;
  }

  next();
});

jobSchema.virtual('is_terminal').get(function getIsTerminal() {
  return ['completed', 'failed', 'cancelled', 'skipped'].includes(this.status);
});

jobSchema.virtual('has_errors').get(function getHasErrors() {
  return Boolean(this.last_error_code || this.last_error_message || this.failed_at);
});

module.exports = mongoose.models.SrcJob || mongoose.model('SrcJob', jobSchema, 'jobs');
