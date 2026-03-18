/**
 * GyneCRM — Utility Functions
 * Phase 7.1 Foundation utilities — date, format, class merging.
 * Extended in later batches as needed.
 */

import { format, formatDistanceToNow, parseISO, isValid, differenceInWeeks } from 'date-fns';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DATE_FORMATS, STATUS_COLORS } from '@constants';

// ─────────────────────────────────────────────────────────────────────────────
// CLASS NAME UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Merge Tailwind CSS classes safely.
 * Resolves conflicts (e.g. bg-red-100 + bg-green-100 → bg-green-100).
 *
 * @param {...(string|undefined|null|false)} inputs
 * @returns {string}
 */
export function cn(...inputs) {
  return twMerge(clsx(...inputs));
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE / TIME UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format an ISO date string to display format.
 * @param {string|Date|null} dateInput
 * @param {string} [fmt=DATE_FORMATS.DISPLAY]
 * @returns {string}
 */
export function formatDate(dateInput, fmt = DATE_FORMATS.DISPLAY) {
  if (!dateInput) return '—';
  try {
    const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    if (!isValid(date)) return '—';
    return format(date, fmt);
  } catch {
    return '—';
  }
}

/**
 * Format a datetime ISO string to display with time.
 * @param {string|Date|null} dateInput
 * @returns {string}
 */
export function formatDateTime(dateInput) {
  return formatDate(dateInput, DATE_FORMATS.DISPLAY_TIME);
}

/**
 * Format time only from ISO string or Date.
 * @param {string|Date|null} dateInput
 * @returns {string}
 */
export function formatTime(dateInput) {
  return formatDate(dateInput, DATE_FORMATS.TIME);
}

/**
 * Relative time (e.g. "3 days ago", "in 2 hours").
 * @param {string|Date|null} dateInput
 * @returns {string}
 */
export function timeAgo(dateInput) {
  if (!dateInput) return '—';
  try {
    const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    if (!isValid(date)) return '—';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return '—';
  }
}

/**
 * Calculate gestational age in weeks from LMP date.
 * @param {string|Date|null} lmpDate — Last Menstrual Period date
 * @returns {number|null}
 */
export function getGestationalWeeks(lmpDate) {
  if (!lmpDate) return null;
  try {
    const lmp = typeof lmpDate === 'string' ? parseISO(lmpDate) : lmpDate;
    if (!isValid(lmp)) return null;
    const weeks = differenceInWeeks(new Date(), lmp);
    return weeks > 0 ? weeks : null;
  } catch {
    return null;
  }
}

/**
 * Calculate estimated due date (LMP + 280 days).
 * @param {string|Date|null} lmpDate
 * @returns {string} — formatted EDD
 */
export function getEDD(lmpDate) {
  if (!lmpDate) return '—';
  try {
    const lmp = typeof lmpDate === 'string' ? parseISO(lmpDate) : lmpDate;
    if (!isValid(lmp)) return '—';
    const edd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
    return formatDate(edd);
  } catch {
    return '—';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CURRENCY / NUMBER FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a number as Indian Rupees.
 * @param {number|string|null} amount
 * @param {boolean} [showSymbol=true]
 * @returns {string}
 */
export function formatCurrency(amount, showSymbol = true) {
  if (amount === null || amount === undefined || amount === '') return '—';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '—';
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
  return showSymbol ? `₹${formatted}` : formatted;
}

/**
 * Format number with locale-aware commas (Indian format).
 * @param {number|string|null} value
 * @returns {string}
 */
export function formatNumber(value) {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('en-IN').format(num);
}

// ─────────────────────────────────────────────────────────────────────────────
// STRING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Capitalize the first letter of a string.
 * @param {string|null} str
 * @returns {string}
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert snake_case to Title Case.
 * e.g. 'no_show' → 'No Show'
 * @param {string|null} str
 * @returns {string}
 */
export function snakeToTitle(str) {
  if (!str) return '';
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Truncate a string to maxLength with ellipsis.
 * @param {string|null} str
 * @param {number} [maxLength=50]
 * @returns {string}
 */
export function truncate(str, maxLength = 50) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength - 3)}...`;
}

/**
 * Get patient initials for avatar placeholder.
 * @param {string|null} firstName
 * @param {string|null} lastName
 * @returns {string}
 */
export function getInitials(firstName, lastName) {
  const first = (firstName || '').charAt(0).toUpperCase();
  const last  = (lastName  || '').charAt(0).toUpperCase();
  return `${first}${last}` || '??';
}

/**
 * Format a full name from parts.
 * @param {string|null} firstName
 * @param {string|null} lastName
 * @returns {string}
 */
export function fullName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(' ') || 'Unknown';
}

/**
 * Mask a phone number for display (last 4 digits visible).
 * e.g. '9876543210' → '******3210'
 * @param {string|null} phone
 * @returns {string}
 */
export function maskPhone(phone) {
  if (!phone) return '—';
  if (phone.length <= 4) return phone;
  return `${'*'.repeat(phone.length - 4)}${phone.slice(-4)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get status color classes from STATUS_COLORS constant.
 * Falls back to 'unknown' if status is not defined.
 * @param {string|null} status
 * @returns {{ bg: string, text: string, label: string }}
 */
export function getStatusConfig(status) {
  if (!status) return STATUS_COLORS.unknown;
  return STATUS_COLORS[status] || STATUS_COLORS.unknown;
}

/**
 * Get the combined Tailwind classes for a status badge.
 * @param {string|null} status
 * @returns {string}
 */
export function getStatusClasses(status) {
  const config = getStatusConfig(status);
  return cn('badge', config.bg, config.text);
}

// ─────────────────────────────────────────────────────────────────────────────
// API RESPONSE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract the first error message from the backend error envelope.
 * Backend format: { success: false, message: string, errors: [{code, field, detail}] }
 *
 * @param {unknown} error — Axios error object
 * @returns {string}
 */
export function extractApiError(error) {
  // Axios error with response
  if (error?.response?.data) {
    const data = error.response.data;
    // Prefer the first errors[].detail
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors[0].detail || data.message || 'An error occurred.';
    }
    // Fall back to top-level message
    if (data.message) return data.message;
  }
  // Network error or timeout
  if (error?.message === 'Network Error') {
    return 'Unable to connect to the server. Please check your connection.';
  }
  // Generic fallback
  return error?.message || 'An unexpected error occurred.';
}

/**
 * Extract all field-level errors from backend envelope.
 * Returns a record of { fieldName: errorMessage } for React Hook Form.
 *
 * @param {unknown} error — Axios error object
 * @returns {Record<string, string>}
 */
export function extractFieldErrors(error) {
  const fieldErrors = {};
  if (error?.response?.data?.errors) {
    for (const err of error.response.data.errors) {
      if (err.field) {
        fieldErrors[err.field] = err.detail || err.code;
      }
    }
  }
  return fieldErrors;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate an Indian mobile number (10 digits, starts with 6-9).
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidIndianPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone?.replace(/\s/g, ''));
}

/**
 * Validate email format.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─────────────────────────────────────────────────────────────────────────────
// MISCELLANEOUS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sleep for a given number of milliseconds (useful in tests/dev).
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a URL-safe file download trigger.
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Clamp a number between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
