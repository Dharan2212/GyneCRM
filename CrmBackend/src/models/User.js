const mongoose = require('mongoose');
const ROLES = require('../constants/roles');

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    hospital_id: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      index: true,
      default: null,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    password_hash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: Object.values(ROLES),
      index: true,
    },
    full_name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    is_locked: {
      type: Boolean,
      default: false,
      index: true,
    },
    failed_login_attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockout_until: {
      type: Date,
      default: null,
    },
    last_login_at: {
      type: Date,
      default: null,
    },
    refresh_token_hash: {
      type: String,
      select: false,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(doc, ret) {
        delete ret.password_hash;
        delete ret.refresh_token_hash;
        return ret;
      },
    },
    toObject: {
      transform(doc, ret) {
        delete ret.password_hash;
        delete ret.refresh_token_hash;
        return ret;
      },
    },
  },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ hospital_id: 1, role: 1 });
userSchema.index({ hospital_id: 1, is_active: 1 });

module.exports = mongoose.models.SrcUser || mongoose.model('SrcUser', userSchema, 'users');
