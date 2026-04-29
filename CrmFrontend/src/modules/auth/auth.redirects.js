function normalizeRole(input) {
  if (!input) return null
  if (typeof input === 'string') return input
  return input.role || null
}

const ROLE_HOME_PATHS = {
  doctor: '/crm/doctor/dashboard',
  receptionist: '/crm/receptionist/desk',
  admin: '/crm/admin',
}

function getRoleRootPath(role) {
  switch (role) {
    case 'doctor':
      return '/crm/doctor'
    case 'receptionist':
      return '/crm/receptionist'
    case 'admin':
      return '/crm/admin'
    default:
      return '/crm/login'
  }
}

export function getRoleHomePath(roleOrUser) {
  const role = normalizeRole(roleOrUser)
  return ROLE_HOME_PATHS[role] || '/crm/login'
}

export function getRoleHomePathForUser(user) {
  return getRoleHomePath(user)
}

export function isRolePathAllowed(roleOrUser, path = '') {
  const role = normalizeRole(roleOrUser)
  const safePath = String(path || '')
  const allowedRoot = getRoleRootPath(role)

  if (!role || !safePath.startsWith('/crm/')) {
    return false
  }

  return safePath === allowedRoot || safePath.startsWith(`${allowedRoot}/`)
}

export function resolvePostLoginPath(userOrRole, from) {
  const requestedPath =
    typeof from === 'string'
      ? from
      : from?.pathname || from?.state?.from?.pathname || null

  if (
    requestedPath &&
    requestedPath !== '/crm' &&
    requestedPath !== '/crm/login' &&
    isRolePathAllowed(userOrRole, requestedPath)
  ) {
    return requestedPath
  }

  return getRoleHomePath(userOrRole)
}

export function resolveRoleHomePath(userOrRole) {
  return getRoleHomePath(userOrRole)
}

export default {
  getRoleHomePath,
  getRoleHomePathForUser,
  isRolePathAllowed,
  resolvePostLoginPath,
  resolveRoleHomePath,
}
