import { AUTH_ROLES } from '../auth/auth.constants.js'

export const doctorPagePathMap = {
  'doc-dash': '/crm/doctor/dashboard',
  'patient-hub': '/crm/doctor/patients',
  'first-consult': '/crm/doctor/consultations/first',
  consultation: '/crm/doctor/consultations/follow-up',
  'test-reports': '/crm/doctor/test-reports',
  prescription: '/crm/doctor/prescriptions',
  'cat-tracker': '/crm/doctor/category-tracker',
  'journey-plan': '/crm/doctor/journey-plan',
  'ivf-tracker': '/crm/doctor/ivf-tracker',
  analytics: '/crm/doctor/analytics',
  automation: '/crm/doctor/automation',
  billing: '/crm/doctor/billing',
  appointments: '/crm/doctor/appointments',
}

export const receptionistPagePathMap = {
  'rx-queue': '/crm/receptionist/desk',
  'rx-register': '/crm/receptionist/register-patient',
  'rx-appointments': '/crm/receptionist/appointments',
  'rx-upload': '/crm/receptionist/upload-report',
  'rx-billing': '/crm/receptionist/billing',
  'rx-messages': '/crm/receptionist/reminders',
}

export const ROLE_PAGE_PATHS = {
  [AUTH_ROLES.DOCTOR]: doctorPagePathMap,
  [AUTH_ROLES.RECEPTIONIST]: receptionistPagePathMap,
}

function doctorNavigation(metrics = {}) {
  return [
    {
      label: 'Overview',
      items: [
        { id: 'doc-dash', icon: 'dashboard', label: 'Dashboard', badge: metrics.newPatients > 0 ? metrics.newPatients : null },
      ],
    },
    {
      label: 'Patient Flow',
      items: [
        { id: 'patient-hub', icon: 'patients', label: 'Patient Hub' },
        { id: 'first-consult', icon: 'firstConsult', label: 'First Consultation', badge: metrics.newPatients > 0 ? metrics.newPatients : null, bw: true },
        { id: 'consultation', icon: 'followUp', label: 'Follow-up Consult' },
        { id: 'test-reports', icon: 'test', label: 'Test Reports', badge: metrics.pendingReview > 0 ? metrics.pendingReview : null, bw: true },
        { id: 'prescription', icon: 'prescription', label: 'Prescription' },
      ],
    },
    {
      label: 'Trackers',
      items: [
        { id: 'cat-tracker', icon: 'category', label: 'Category Tracker' },
      ],
    },
  ]
}

function receptionistNavigation(metrics = {}) {
  return [
    {
      label: 'Main',
      items: [
        { id: 'rx-queue', icon: 'reception', label: 'Reception Desk' },
        { id: 'rx-register', icon: 'register', label: 'Register New Patient' },
      ],
    },
    {
      label: 'Actions',
      items: [
        { id: 'rx-appointments', icon: 'appointments', label: 'Appointments' },
        { id: 'rx-upload', icon: 'upload', label: 'Upload Test Report', badge: metrics.pendingUpload > 0 ? metrics.pendingUpload : null, bw: true },
      ],
    },
    {
      label: 'Finance',
      items: [
        { id: 'rx-billing', icon: 'billing', label: 'Billing', bw: true },
      ],
    },
  ]
}

const ROLE_NAVIGATION_BUILDERS = {
  [AUTH_ROLES.DOCTOR]: doctorNavigation,
  [AUTH_ROLES.RECEPTIONIST]: receptionistNavigation,
}

export const deferredRouteMeta = {
  doctorJourneyPlan: {
    title: 'Journey Plan',
    subtitle: 'Controlled placeholder. Dedicated journey-plan routes are deferred to a later phase.',
  },
  doctorIvfTracker: {
    title: 'IVF Tracker',
    subtitle: 'Controlled placeholder. Dedicated IVF workflow integration is deferred for a later phase.',
  },
  doctorAnalytics: {
    title: 'Analytics',
    subtitle: 'Deferred screen. Use dashboard KPIs for now until the analytics phase starts.',
  },
  doctorAutomation: {
    title: 'Automation Hub',
    subtitle: 'Deferred screen. Messaging and automation foundations exist, but the doctor-facing control hub is later scope.',
  },
  doctorBilling: {
    title: 'Billing Visibility',
    subtitle: 'Hidden from early doctor scope. Current runtime billing access is receptionist/admin only.',
  },
  doctorAppointments: {
    title: 'Appointments Calendar',
    subtitle: 'Controlled placeholder. Advanced doctor calendar experience is deferred while core modules are integrated first.',
  },
  receptionistReminders: {
    title: 'WhatsApp Reminders',
    subtitle: 'Controlled placeholder. Reminder foundations exist, but the receptionist reminder console is later scope.',
  },
}

function findActivePageId(pathname, entries, fallbackId) {
  const exactMatch = Object.entries(entries).find(([, path]) => pathname === path)
  if (exactMatch) {
    return exactMatch[0]
  }

  const prefixMatch = Object.entries(entries).find(([, path]) => pathname.startsWith(`${path}/`))
  if (prefixMatch) {
    return prefixMatch[0]
  }

  return fallbackId
}

export function getRoleNavigation(role, metrics = {}) {
  const buildNavigation = ROLE_NAVIGATION_BUILDERS[role]
  return buildNavigation ? buildNavigation(metrics) : []
}

export function getRolePagePath(role, pageId) {
  const pageMap = ROLE_PAGE_PATHS[role]

  if (!pageMap) {
    return '/crm'
  }

  const fallbackId = role === AUTH_ROLES.DOCTOR ? 'doc-dash' : 'rx-queue'
  return pageMap[pageId] || pageMap[fallbackId]
}

export function getRoleActivePageId(role, pathname) {
  const pageMap = ROLE_PAGE_PATHS[role]

  if (!pageMap) {
    return null
  }

  const fallbackId = role === AUTH_ROLES.DOCTOR ? 'doc-dash' : 'rx-queue'
  return findActivePageId(pathname, pageMap, fallbackId)
}
