import assert from 'node:assert/strict'
import { AUTH_ROLES } from '../../src/modules/auth/auth.constants.js'
import { ROLE_HOME_PATHS, isAllowedPathForRole } from '../../src/modules/rbac/roleIdentity.js'
import { doctorPagePathMap, receptionistPagePathMap } from '../../src/modules/rbac/moduleVisibility.js'
import {
  PATIENT_CATEGORY_LABELS,
  APPOINTMENT_STATUS_LABELS,
  CONSULTATION_STATUS_LABELS,
  PREGNANCY_STATUS_LABELS,
  PRESCRIPTION_STATUS_LABELS,
  TEST_ORDER_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from '../../src/modules/shared/enums/index.js'

function ensureKeys(map, keys, label) {
  for (const key of keys) {
    assert.ok(map[key], `${label} is missing key: ${key}`)
  }
}

assert.equal(ROLE_HOME_PATHS[AUTH_ROLES.DOCTOR], '/crm/doctor/dashboard')
assert.equal(ROLE_HOME_PATHS[AUTH_ROLES.RECEPTIONIST], '/crm/receptionist/desk')
assert.equal(ROLE_HOME_PATHS[AUTH_ROLES.ADMIN], '/crm/admin')

assert.equal(isAllowedPathForRole('doctor', '/crm/doctor/test-reports'), true)
assert.equal(isAllowedPathForRole('doctor', '/crm/receptionist/desk'), false)
assert.equal(isAllowedPathForRole('receptionist', '/crm/receptionist/billing'), true)
assert.equal(isAllowedPathForRole('receptionist', '/crm/doctor/patients'), false)

ensureKeys(doctorPagePathMap, ['doc-dash', 'patient-hub', 'first-consult', 'consultation', 'test-reports', 'prescription', 'cat-tracker'], 'doctorPagePathMap')
ensureKeys(receptionistPagePathMap, ['rx-queue', 'rx-register', 'rx-appointments', 'rx-upload', 'rx-billing'], 'receptionistPagePathMap')

ensureKeys(PATIENT_CATEGORY_LABELS, ['pregnancy', 'ivf', 'gynac', 'uncategorized'], 'PATIENT_CATEGORY_LABELS')
ensureKeys(APPOINTMENT_STATUS_LABELS, ['scheduled', 'checked_in', 'completed', 'cancelled', 'no_show', 'rescheduled'], 'APPOINTMENT_STATUS_LABELS')
ensureKeys(CONSULTATION_STATUS_LABELS, ['draft', 'in_progress', 'completed', 'finalised'], 'CONSULTATION_STATUS_LABELS')
ensureKeys(PREGNANCY_STATUS_LABELS, ['active', 'delivered', 'aborted'], 'PREGNANCY_STATUS_LABELS')
ensureKeys(PRESCRIPTION_STATUS_LABELS, ['draft', 'issued', 'voided'], 'PRESCRIPTION_STATUS_LABELS')
ensureKeys(TEST_ORDER_STATUS_LABELS, ['ordered', 'pending_upload', 'uploaded', 'pending_review', 'reviewed', 'sent'], 'TEST_ORDER_STATUS_LABELS')
ensureKeys(INVOICE_STATUS_LABELS, ['draft', 'issued', 'partially_paid', 'paid'], 'INVOICE_STATUS_LABELS')
ensureKeys(PAYMENT_STATUS_LABELS, ['recorded', 'confirmed', 'failed', 'reversed'], 'PAYMENT_STATUS_LABELS')

console.log('GyneCRM frontend regression smoke checks passed.')
