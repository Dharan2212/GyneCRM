import { AUTH_ROLES } from '../auth/auth.constants.js'

export const ROLE_LABELS = {
  [AUTH_ROLES.DOCTOR]: 'Doctor',
  [AUTH_ROLES.RECEPTIONIST]: 'Receptionist',
  [AUTH_ROLES.ADMIN]: 'Admin',
}

export const ROLE_FALLBACK_DISPLAY_NAMES = {
  [AUTH_ROLES.DOCTOR]: 'Doctor User',
  [AUTH_ROLES.RECEPTIONIST]: 'Reception Desk',
  [AUTH_ROLES.ADMIN]: 'Admin User',
}

export const ROLE_HOME_PATHS = {
  [AUTH_ROLES.DOCTOR]: '/crm/doctor/dashboard',
  [AUTH_ROLES.RECEPTIONIST]: '/crm/receptionist/desk',
  [AUTH_ROLES.ADMIN]: '/crm/admin',
}

export function normalizeRole(role) {
  return Object.values(AUTH_ROLES).includes(role) ? role : null
}

export function getResolvedRole(userRole, fallbackRole) {
  return normalizeRole(userRole) || normalizeRole(fallbackRole) || null
}

export function getRoleLabel(role) {
  const resolvedRole = normalizeRole(role)
  return (resolvedRole && ROLE_LABELS[resolvedRole]) || 'User'
}

export function getRoleFallbackDisplayName(role) {
  const resolvedRole = normalizeRole(role)
  return (resolvedRole && ROLE_FALLBACK_DISPLAY_NAMES[resolvedRole]) || 'GyneCRM User'
}

export function getRoleHomePath(role) {
  const resolvedRole = normalizeRole(role)
  return (resolvedRole && ROLE_HOME_PATHS[resolvedRole]) || '/crm/login'
}

export function getUserDisplayName(user, fallbackRole) {
  const resolvedRole = getResolvedRole(user?.role, fallbackRole)
  const fullName = typeof user?.full_name === 'string' ? user.full_name.trim() : ''
  return fullName || getRoleFallbackDisplayName(resolvedRole)
}

export function getUserRoleLabel(user, fallbackRole) {
  return getRoleLabel(getResolvedRole(user?.role, fallbackRole))
}

export function getUserInitials(user, fallbackRole) {
  const fullName = getUserDisplayName(user, fallbackRole)
  const words = String(fullName).split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase() || '').join('') || 'U'
}

export function isAllowedPathForRole(role, pathname) {
  const resolvedRole = normalizeRole(role)
  const value = typeof pathname === 'string' ? pathname.trim() : ''

  if (!resolvedRole || !value) {
    return false
  }

  switch (resolvedRole) {
    case AUTH_ROLES.DOCTOR:
      return value === '/crm/doctor' || value.startsWith('/crm/doctor/')
    case AUTH_ROLES.RECEPTIONIST:
      return value === '/crm/receptionist' || value.startsWith('/crm/receptionist/')
    case AUTH_ROLES.ADMIN:
      return value === '/crm/admin' || value.startsWith('/crm/admin/')
    default:
      return false
  }
}
