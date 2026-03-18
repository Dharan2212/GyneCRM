/**
 * GyneCRM Frontend Constants
 * Phase 7.1 — All values are derived from the backend enums,
 * migrations, and architecture document.
 *
 * Source of truth: hospital_crm_architecture_v4_complete.docx
 */

// ─────────────────────────────────────────────────────────────────────────────
// ROLES
// Source: db/migrations/002_create_roles.js + architecture Part 3
// ─────────────────────────────────────────────────────────────────────────────
export const ROLES = {
  ADMIN:        'admin',
  DOCTOR:       'doctor',
  RECEPTIONIST: 'receptionist',
  STAFF:        'staff',
};

/** Human-readable role labels */
export const ROLE_LABELS = {
  [ROLES.ADMIN]:        'Administrator',
  [ROLES.DOCTOR]:       'Doctor',
  [ROLES.RECEPTIONIST]: 'Receptionist',
  [ROLES.STAFF]:        'Staff',
};

/** Role to dashboard route mapping */
export const ROLE_DASHBOARD_PATHS = {
  [ROLES.ADMIN]:        '/admin/dashboard',
  [ROLES.DOCTOR]:       '/doctor/dashboard',
  [ROLES.RECEPTIONIST]: '/reception/dashboard',
  [ROLES.STAFF]:        '/staff/dashboard',
};

/** All valid role values as array */
export const ALL_ROLES = Object.values(ROLES);

// ─────────────────────────────────────────────────────────────────────────────
// STATUS COLORS
// Source: architecture Part 5.7 (Design System) + 000_create_enums.js
// Used by StatusBadge component to map status strings to Tailwind classes.
// ─────────────────────────────────────────────────────────────────────────────
export const STATUS_COLORS = {
  // ── appointment_status_enum ───────────────────────────────────────────────
  draft:            { bg: 'bg-gray-100',   text: 'text-gray-700',   label: 'Draft' },
  scheduled:        { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Scheduled' },
  confirmed:        { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Confirmed' },
  arrived:          { bg: 'bg-teal-100',   text: 'text-teal-800',   label: 'Arrived' },
  checked_in:       { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Checked In' },
  waiting:          { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Waiting' },
  with_doctor:      { bg: 'bg-purple-100', text: 'text-purple-800', label: 'With Doctor' },
  completed:        { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Completed' },
  cancelled:        { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Cancelled' },
  rescheduled:      { bg: 'bg-amber-100',  text: 'text-amber-800',  label: 'Rescheduled' },
  no_show:          { bg: 'bg-orange-100', text: 'text-orange-800', label: 'No Show' },
  emergency:        { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Emergency' },
  blocked:          { bg: 'bg-gray-100',   text: 'text-gray-700',   label: 'Blocked' },
  doctor_unavailable:{ bg: 'bg-gray-100',  text: 'text-gray-700',   label: 'Doctor Unavailable' },

  // ── invoice_status_enum ───────────────────────────────────────────────────
  pending:          { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  paid:             { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Paid' },
  partially_paid:   { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Partially Paid' },
  refunded:         { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Refunded' },
  void:             { bg: 'bg-gray-100',   text: 'text-gray-700',   label: 'Void' },

  // ── prescription_status_enum ──────────────────────────────────────────────
  issued:           { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Issued' },

  // ── pregnancy_status_enum ─────────────────────────────────────────────────
  active:           { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Active' },
  delivered:        { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Delivered' },
  miscarriage:      { bg: 'bg-gray-100',   text: 'text-gray-700',   label: 'Miscarriage' },
  terminated:       { bg: 'bg-gray-100',   text: 'text-gray-700',   label: 'Terminated' },

  // ── test_order_status_enum ────────────────────────────────────────────────
  ordered:          { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Ordered' },
  result_uploaded:  { bg: 'bg-teal-100',   text: 'text-teal-800',   label: 'Result Uploaded' },
  reviewed:         { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Reviewed' },
  overdue:          { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Overdue' },
  skipped:          { bg: 'bg-gray-100',   text: 'text-gray-700',   label: 'Skipped' },

  // ── followup_status_enum ──────────────────────────────────────────────────
  missed:           { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Missed' },

  // ── doc_review_status_enum ────────────────────────────────────────────────
  pending_review:      { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending Review' },
  no_review_required:  { bg: 'bg-gray-100',   text: 'text-gray-700',   label: 'No Review Required' },

  // ── notification_status_enum ──────────────────────────────────────────────
  sent:             { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Sent' },
  failed:           { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Failed' },
  suppressed:       { bg: 'bg-gray-100',   text: 'text-gray-700',   label: 'Suppressed' },

  // ── consultation_status_enum ──────────────────────────────────────────────
  in_progress:      { bg: 'bg-purple-100', text: 'text-purple-800', label: 'In Progress' },

  // ── waitlist_status_enum ──────────────────────────────────────────────────
  waiting:          { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Waiting' },
  offered:          { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Offered' },
  accepted:         { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Accepted' },
  expired:          { bg: 'bg-gray-100',   text: 'text-gray-700',   label: 'Expired' },
  bypassed:         { bg: 'bg-amber-100',  text: 'text-amber-800',  label: 'Bypassed' },
  removed:          { bg: 'bg-gray-100',   text: 'text-gray-700',   label: 'Removed' },

  // ── High-risk special ─────────────────────────────────────────────────────
  high_risk:        { bg: 'bg-red-100',    text: 'text-red-800',    label: 'High Risk' },

  // ── Fallback ──────────────────────────────────────────────────────────────
  unknown:          { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Unknown' },
};

// ─────────────────────────────────────────────────────────────────────────────
// VISIT TYPES
// Source: db/migrations/000_create_enums.js (visit_type_enum)
// ─────────────────────────────────────────────────────────────────────────────
export const VISIT_TYPES = {
  NEW:        'new',
  FOLLOW_UP:  'follow_up',
  ANTENATAL:  'antenatal',
  POSTNATAL:  'postnatal',
  EMERGENCY:  'emergency',
};

export const VISIT_TYPE_LABELS = {
  [VISIT_TYPES.NEW]:        'New Patient',
  [VISIT_TYPES.FOLLOW_UP]:  'Follow-up',
  [VISIT_TYPES.ANTENATAL]:  'Antenatal',
  [VISIT_TYPES.POSTNATAL]:  'Postnatal',
  [VISIT_TYPES.EMERGENCY]:  'Emergency',
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT TYPES
// Source: db/migrations/000_create_enums.js (document_type_enum)
// ─────────────────────────────────────────────────────────────────────────────
export const DOCUMENT_TYPES = {
  LAB_REPORT:          'lab_report',
  ULTRASOUND:          'ultrasound',
  PRESCRIPTION_PDF:    'prescription_pdf',
  INVOICE_PDF:         'invoice_pdf',
  SCAN:                'scan',
  CONSENT_FORM:        'consent_form',
  IDENTITY_DOCUMENT:   'identity_document',
  OTHER:               'other',
};

export const DOCUMENT_TYPE_LABELS = {
  [DOCUMENT_TYPES.LAB_REPORT]:        'Lab Report',
  [DOCUMENT_TYPES.ULTRASOUND]:        'Ultrasound',
  [DOCUMENT_TYPES.PRESCRIPTION_PDF]:  'Prescription PDF',
  [DOCUMENT_TYPES.INVOICE_PDF]:       'Invoice PDF',
  [DOCUMENT_TYPES.SCAN]:              'Scan',
  [DOCUMENT_TYPES.CONSENT_FORM]:      'Consent Form',
  [DOCUMENT_TYPES.IDENTITY_DOCUMENT]: 'Identity Document',
  [DOCUMENT_TYPES.OTHER]:             'Other',
};

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT MODES
// Source: db/migrations/000_create_enums.js (payment_mode_enum)
// ─────────────────────────────────────────────────────────────────────────────
export const PAYMENT_MODES = {
  CASH:      'cash',
  CARD:      'card',
  UPI:       'upi',
  INSURANCE: 'insurance',
  ONLINE:    'online',
};

export const PAYMENT_MODE_LABELS = {
  [PAYMENT_MODES.CASH]:      'Cash',
  [PAYMENT_MODES.CARD]:      'Card',
  [PAYMENT_MODES.UPI]:       'UPI',
  [PAYMENT_MODES.INSURANCE]: 'Insurance',
  [PAYMENT_MODES.ONLINE]:    'Online',
};

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE CATEGORIES
// Source: db/migrations/000_create_enums.js (service_category_enum)
// ─────────────────────────────────────────────────────────────────────────────
export const SERVICE_CATEGORIES = {
  CONSULTATION: 'consultation',
  TEST:         'test',
  PROCEDURE:    'procedure',
  PACKAGE:      'package',
  OTHER:        'other',
};

// ─────────────────────────────────────────────────────────────────────────────
// API ENDPOINTS
// Source: backend src/routes/index.js + all module route files
// Base: /api/v1
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE = '/api/v1';

export const API_ENDPOINTS = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    CHANGE_PASSWORD: '/auth/change-password',
  },

  // ── Hospital ──────────────────────────────────────────────────────────────
  HOSPITAL: {
    PROFILE: '/hospital',
    SETTINGS: '/hospital/settings',
    BRANCHES: '/hospital/branches',
    BRANCH: (id) => `/hospital/branches/${id}`,
  },

  // ── Users ─────────────────────────────────────────────────────────────────
  USERS: {
    LIST: '/users',
    CREATE: '/users',
    DETAIL: (id) => `/users/${id}`,
    UPDATE: (id) => `/users/${id}`,
    DEACTIVATE: (id) => `/users/${id}/deactivate`,
    REACTIVATE: (id) => `/users/${id}/reactivate`,
    CHANGE_ROLE: (id) => `/users/${id}/role`,
  },

  // ── Doctors ───────────────────────────────────────────────────────────────
  DOCTORS: {
    LIST: '/doctors',
    CREATE: '/doctors',
    DETAIL: (id) => `/doctors/${id}`,
    UPDATE: (id) => `/doctors/${id}`,
    SCHEDULE: (id) => `/doctors/${id}/schedule`,
    LEAVES: (id) => `/doctors/${id}/leaves`,
    AVAILABILITY: (id) => `/doctors/${id}/availability`,
    BRANCHES: (id) => `/doctors/${id}/branches`,
  },

  // ── Patients ──────────────────────────────────────────────────────────────
  PATIENTS: {
    LIST: '/patients',
    CREATE: '/patients',
    DETAIL: (id) => `/patients/${id}`,
    UPDATE: (id) => `/patients/${id}`,
    DELETE: (id) => `/patients/${id}`,
    HISTORY: (id) => `/patients/${id}/medical-history`,
    CONSENTS: (id) => `/patients/${id}/consents`,
  },

  // ── Appointments ──────────────────────────────────────────────────────────
  APPOINTMENTS: {
    LIST: '/appointments',
    CREATE: '/appointments',
    DETAIL: (id) => `/appointments/${id}`,
    STATUS: (id) => `/appointments/${id}/status`,
    CHECK_IN: (id) => `/appointments/${id}/check-in`,
    RESCHEDULE: (id) => `/appointments/${id}/reschedule`,
    DELETE: (id) => `/appointments/${id}`,
  },

  // ── Consultations ─────────────────────────────────────────────────────────
  CONSULTATIONS: {
    CREATE: '/consultations',
    DETAIL: (id) => `/consultations/${id}`,
    UPDATE: (id) => `/consultations/${id}`,
    FINALIZE: (id) => `/consultations/${id}/finalize`,
    OVERRIDE: (id) => `/consultations/${id}/override`,
    PDF: (id) => `/consultations/${id}/pdf`,
  },

  // ── Prescriptions ─────────────────────────────────────────────────────────
  PRESCRIPTIONS: {
    CREATE: '/prescriptions',
    DETAIL: (id) => `/prescriptions/${id}`,
    UPDATE: (id) => `/prescriptions/${id}`,
    ITEMS: (id) => `/prescriptions/${id}/items`,
    ITEM: (id, itemId) => `/prescriptions/${id}/items/${itemId}`,
    ISSUE: (id) => `/prescriptions/${id}/issue`,
    VOID: (id) => `/prescriptions/${id}/void`,
    REISSUE: (id) => `/prescriptions/${id}/reissue`,
    PDF: (id) => `/prescriptions/${id}/pdf`,
  },

  // ── Pregnancies ───────────────────────────────────────────────────────────
  PREGNANCIES: {
    LIST: '/pregnancies',
    CREATE: '/pregnancies',
    DETAIL: (id) => `/pregnancies/${id}`,
    UPDATE: (id) => `/pregnancies/${id}`,
    HIGH_RISK: '/pregnancies/high-risk',
    BY_PATIENT: (patientId) => `/pregnancies/patient/${patientId}`,
    FOLLOW_UPS: (id) => `/pregnancies/${id}/follow-ups`,
  },

  // ── Test Orders ───────────────────────────────────────────────────────────
  TEST_ORDERS: {
    LIST: '/test-orders',
    CREATE: '/test-orders',
    DETAIL: (id) => `/test-orders/${id}`,
    UPDATE: (id) => `/test-orders/${id}`,
    UPLOAD_RESULT: (id) => `/test-orders/${id}/result`,
    BY_PATIENT: (patientId) => `/test-orders/patient/${patientId}`,
    OVERDUE: '/test-orders/overdue',
  },

  // ── Documents ─────────────────────────────────────────────────────────────
  DOCUMENTS: {
    LIST: '/documents',
    UPLOAD_URL: '/documents/upload-url',
    CREATE: '/documents',
    DETAIL_URL: (id) => `/documents/${id}/url`,
    REVIEW_INBOX: '/documents/review-inbox',
    REVIEW_DETAIL: (id) => `/documents/${id}`,
    SUBMIT_REVIEW: (id) => `/documents/${id}/review`,
    FLAG: (id) => `/documents/${id}/flag`,
    DELETE: (id) => `/documents/${id}`,
  },

  // ── Billing / Invoices ────────────────────────────────────────────────────
  INVOICES: {
    LIST: '/invoices',
    CREATE: '/invoices',
    DETAIL: (id) => `/invoices/${id}`,
    UPDATE: (id) => `/invoices/${id}`,
    FINALIZE: (id) => `/invoices/${id}/finalize`,
    ITEMS: (id) => `/invoices/${id}/items`,
    ITEM: (id, itemId) => `/invoices/${id}/items/${itemId}`,
    PDF: (id) => `/invoices/${id}/pdf`,
    PAYMENTS: (id) => `/invoices/${id}/payments`,
    REFUND: (id) => `/invoices/${id}/refund`,
    VOID: (id) => `/invoices/${id}/void`,
    BY_PATIENT: (patientId) => `/invoices/patient/${patientId}`,
  },

  // ── Deliveries ────────────────────────────────────────────────────────────
  DELIVERIES: {
    LIST: '/deliveries',
    CREATE: '/deliveries',
    DETAIL: (id) => `/deliveries/${id}`,
    UPDATE: (id) => `/deliveries/${id}`,
    BY_PATIENT: (patientId) => `/deliveries/patient/${patientId}`,
    POSTPARTUM: (id) => `/deliveries/${id}/postpartum`,
  },

  // ── Analytics ─────────────────────────────────────────────────────────────
  ANALYTICS: {
    OVERVIEW: '/analytics/overview',
    REVENUE: '/analytics/revenue',
    APPOINTMENTS: '/analytics/appointments',
    DOCTOR_WORKLOAD: '/analytics/doctor-workload',
    PATIENT_RETENTION: '/analytics/patient-retention',
    HIGH_RISK: '/analytics/high-risk',
    TEST_COMPLETION: '/analytics/test-completion',
    DAY_CLOSE: '/analytics/day-close',
    DELIVERIES: '/analytics/deliveries',
    BRANCH: (branchId) => `/analytics/branch/${branchId}`,
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  NOTIFICATIONS: {
    LIST: '/notifications',
    FAILED: '/notifications/failed',
    DETAIL: (id) => `/notifications/${id}`,
    RETRY: (id) => `/notifications/${id}/retry`,
    AUTOMATION_STATUS: '/notifications/automation-status',
  },

  // ── Health ────────────────────────────────────────────────────────────────
  HEALTH: {
    LIVENESS: '/health',
    READINESS: '/health/ready',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION DEFAULTS
// Source: architecture pattern — page-based, limit 20
// ─────────────────────────────────────────────────────────────────────────────
export const PAGINATION = {
  DEFAULT_PAGE:  1,
  DEFAULT_LIMIT: 20,
  LIMIT_OPTIONS: [10, 20, 50, 100],
};

// ─────────────────────────────────────────────────────────────────────────────
// QUERY KEYS — used by TanStack Query
// Stable keys for cache management and invalidation.
// ─────────────────────────────────────────────────────────────────────────────
export const QUERY_KEYS = {
  // Auth
  AUTH:                    ['auth', 'me'],
  // Hospital
  HOSPITAL:                ['hospital'],
  HOSPITAL_SETTINGS:       ['hospital', 'settings'],
  BRANCHES:                ['hospital', 'branches'],
  // Users
  USERS:                   ['users'],
  USER:                    (id) => ['users', id],
  // Doctors
  DOCTORS:                 ['doctors'],
  DOCTOR:                  (id) => ['doctors', id],
  DOCTOR_SCHEDULE:         (id) => ['doctors', id, 'schedule'],
  // Patients
  PATIENTS:                ['patients'],
  PATIENT:                 (id) => ['patients', id],
  PATIENT_HISTORY:         (id) => ['patients', id, 'medical-history'],
  PATIENT_CONSENTS:        (id) => ['patients', id, 'consents'],
  // Appointments
  APPOINTMENTS:            ['appointments'],
  APPOINTMENT:             (id) => ['appointments', id],
  TODAY_APPTS:             (params) => ['appointments', 'today', params],
  SLOTS:                   (doctorId, date) => ['slots', doctorId, date],
  // Consultations
  CONSULTATIONS:           ['consultations'],
  CONSULTATION:            (id) => ['consultations', id],
  // Prescriptions
  PRESCRIPTIONS:           ['prescriptions'],
  PRESCRIPTION:            (id) => ['prescriptions', id],
  // Pregnancies
  PREGNANCIES:             ['pregnancies'],
  PREGNANCY:               (id) => ['pregnancies', id],
  PREGNANCY_MILESTONES:    (id) => ['pregnancies', id, 'milestones'],
  HIGH_RISK:               ['pregnancies', 'high-risk'],
  // Test Orders
  TEST_ORDERS:             ['test-orders'],
  TEST_ORDERS_OVERDUE:     ['test-orders', 'overdue'],
  // Documents
  DOCUMENTS:               ['documents'],
  DOCUMENT:                (id) => ['documents', id],
  REVIEW_INBOX:            ['documents', 'review-inbox'],
  // Invoices / Billing
  INVOICES:                ['invoices'],
  INVOICE:                 (id) => ['invoices', id],
  // Deliveries
  DELIVERIES:              ['deliveries'],
  PATIENT_DELIVERIES:      (patientId) => ['deliveries', 'patient', patientId],
  PATIENT_POSTPARTUM:      (patientId) => ['postpartum', 'patient', patientId],
  // Analytics
  ANALYTICS_OVERVIEW:      (params) => ['analytics', 'overview', params],
  ANALYTICS_REVENUE:       (params) => ['analytics', 'revenue', params],
  ANALYTICS_APPOINTMENTS:  (params) => ['analytics', 'appointments', params],
  ANALYTICS_WORKLOAD:      (params) => ['analytics', 'doctor-workload', params],
  ANALYTICS_RETENTION:     (params) => ['analytics', 'patient-retention', params],
  ANALYTICS_HIGH_RISK:     (params) => ['analytics', 'high-risk', params],
  ANALYTICS_TEST_COMPLETION: (params) => ['analytics', 'test-completion', params],
  ANALYTICS_DELIVERIES:    (params) => ['analytics', 'deliveries', params],
  // Notifications
  NOTIFICATIONS:           ['notifications'],
  NOTIFICATION:            (id) => ['notifications', id],
  NOTIFICATIONS_FAILED:    ['notifications', 'failed'],
  AUTOMATION_STATUS:       ['notifications', 'automation-status'],
  // Waitlist (within appointments module on backend)
  WAITLIST:                (params) => ['appointments', 'waitlist', params],
  // Activity / Override logs — backend serves from analytics module queries
  ACTIVITY_LOGS:           (params) => ['activity-logs', params],
  OVERRIDE_LOGS:           (params) => ['override-logs', params],
};

// ─────────────────────────────────────────────────────────────────────────────
// FILE UPLOAD CONSTRAINTS
// Source: architecture document Part 9 (Document Management)
// ─────────────────────────────────────────────────────────────────────────────
export const FILE_UPLOAD = {
  MAX_SIZE_MB:   10,
  MAX_SIZE_BYTES: 10 * 1024 * 1024,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.pdf'],
};

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENT STATUS GROUPS
// Useful for filtering / display grouping in the UI
// ─────────────────────────────────────────────────────────────────────────────
export const APPOINTMENT_STATUS_GROUPS = {
  ACTIVE:      ['scheduled', 'confirmed', 'arrived', 'checked_in', 'waiting', 'with_doctor'],
  TERMINAL:    ['completed', 'cancelled', 'no_show'],
  RESCHEDULED: ['rescheduled'],
  BLOCKED:     ['blocked', 'doctor_unavailable', 'emergency'],
};

// ─────────────────────────────────────────────────────────────────────────────
// DATE / TIME FORMATS (used with date-fns)
// ─────────────────────────────────────────────────────────────────────────────
export const DATE_FORMATS = {
  DISPLAY:        'dd MMM yyyy',           // 01 Jan 2025
  DISPLAY_TIME:   'dd MMM yyyy, h:mm a',   // 01 Jan 2025, 9:30 AM
  ISO:            "yyyy-MM-dd",            // 2025-01-01
  TIME:           'h:mm a',               // 9:30 AM
  TIME_24:        'HH:mm',                // 09:30
  MONTH_YEAR:     'MMMM yyyy',            // January 2025
  DAY_MONTH:      'dd MMM',               // 01 Jan
};

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL STORAGE KEYS
// NOTE: Access token is stored in memory only (security requirement).
// Only non-sensitive preferences go in localStorage.
// ─────────────────────────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  SIDEBAR_COLLAPSED: 'gynecrm_sidebar_collapsed',
  PREFERRED_BRANCH:  'gynecrm_preferred_branch',
  TABLE_PAGE_SIZE:   'gynecrm_table_page_size',
};

// ─────────────────────────────────────────────────────────────────────────────
// ERROR CODES — from backend error contract
// Source: response-helper.js, error middleware
// ─────────────────────────────────────────────────────────────────────────────
export const ERROR_CODES = {
  VALIDATION_ERROR:        'VALIDATION_ERROR',
  UNAUTHORIZED:            'UNAUTHORIZED',
  FORBIDDEN:               'FORBIDDEN',
  NOT_FOUND:               'NOT_FOUND',
  CONFLICT:                'CONFLICT',
  INTERNAL_SERVER_ERROR:   'INTERNAL_SERVER_ERROR',
  TOKEN_EXPIRED:           'TOKEN_EXPIRED',
  INVALID_CREDENTIALS:     'INVALID_CREDENTIALS',
};

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR NAVIGATION CONFIG (used by Sidebar component in Batch 7.6)
// Defines which nav items are visible per role.
// ─────────────────────────────────────────────────────────────────────────────
export const NAV_ITEMS = [
  {
    label: 'Dashboard',
    icon:  'LayoutDashboard',
    roles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.STAFF],
    pathFn: (role) => ROLE_DASHBOARD_PATHS[role],
  },
  {
    label: 'Patients',
    icon:  'Users',
    roles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.STAFF],
    path:  '/patients',
  },
  {
    label: 'Appointments',
    icon:  'Calendar',
    roles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST],
    path:  '/appointments',
  },
  {
    label: 'Consultations',
    icon:  'Stethoscope',
    roles: [ROLES.ADMIN, ROLES.DOCTOR],
    path:  '/consultations',
  },
  {
    label: 'Prescriptions',
    icon:  'Pill',
    roles: [ROLES.ADMIN, ROLES.DOCTOR],
    path:  '/prescriptions',
  },
  {
    label: 'Pregnancies',
    icon:  'Heart',
    roles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST],
    path:  '/pregnancies',
  },
  {
    label: 'Billing',
    icon:  'CreditCard',
    roles: [ROLES.ADMIN, ROLES.RECEPTIONIST],
    path:  '/billing',
  },
  {
    label: 'Documents',
    icon:  'FileText',
    roles: [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.STAFF],
    path:  '/documents',
  },
  {
    label: 'Analytics',
    icon:  'BarChart2',
    roles: [ROLES.ADMIN],
    path:  '/admin/analytics',
  },
  {
    label: 'Notifications',
    icon:  'Bell',
    roles: [ROLES.ADMIN, ROLES.RECEPTIONIST],
    path:  '/notifications',
  },
  {
    label: 'Settings',
    icon:  'Settings',
    roles: [ROLES.ADMIN],
    path:  '/admin/settings',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ROLE NAV CONFIG
// Per-role sidebar navigation. Each item:
//   { label, path, icon, section? }
// icon is a key into the ICONS map in NavItem.jsx.
// section groups items under a separator label.
// ─────────────────────────────────────────────────────────────────────────────
export const ROLE_NAV = {
  admin: [
    { label: 'Dashboard',     path: '/admin/dashboard',     icon: 'home' },
    { section: 'Clinical' },
    { label: 'Patients',      path: '/admin/users',         icon: 'users' },
    { label: 'Appointments',  path: '/admin/waitlist',      icon: 'calendar' },
    { section: 'Finance' },
    { label: 'Billing',       path: '/reception/billing',   icon: 'creditCard' },
    { section: 'System' },
    { label: 'Analytics',     path: '/admin/analytics',     icon: 'barChart' },
    { label: 'Notifications', path: '/admin/notifications', icon: 'bell' },
    { label: 'Audit Log',     path: '/admin/audit-log',     icon: 'fileText' },
    { label: 'Settings',      path: '/admin/settings',      icon: 'settings' },
  ],

  doctor: [
    { label: 'Dashboard',       path: '/doctor/dashboard',        icon: 'home' },
    { section: 'Clinical' },
    { label: 'Appointments',    path: '/doctor/appointments',     icon: 'calendar' },
    { label: 'Patients',        path: '/doctor/patients',         icon: 'users' },
    { label: 'Consultations',   path: '/doctor/consultations',    icon: 'stethoscope' },
    { label: 'Prescriptions',   path: '/doctor/consultations',    icon: 'pill' },
    { label: 'Pregnancies',     path: '/doctor/pregnancies',      icon: 'heart' },
    { section: 'Documents' },
    { label: 'Review Inbox',    path: '/doctor/documents-review', icon: 'inbox' },
  ],

  receptionist: [
    { label: 'Dashboard',     path: '/reception/dashboard',    icon: 'home' },
    { section: 'Daily Work' },
    { label: 'Queue',         path: '/reception/queue',        icon: 'list' },
    { label: 'Appointments',  path: '/reception/appointments', icon: 'calendar' },
    { section: 'Patients' },
    { label: 'Patients',      path: '/reception/patients',     icon: 'users' },
    { section: 'Finance & Docs' },
    { label: 'Billing',       path: '/reception/billing',      icon: 'creditCard' },
    { label: 'Documents',     path: '/reception/documents',    icon: 'fileText' },
  ],

  staff: [
    { label: 'Dashboard', path: '/staff/dashboard', icon: 'home' },
    { section: 'Work' },
    { label: 'Documents', path: '/staff/documents', icon: 'fileText' },
  ],
};
