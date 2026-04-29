const DATE_FALLBACK = '--'

function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value, options = {}) {
  const date = toDate(value)
  if (!date) return options.fallback || DATE_FALLBACK

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(date)
}

export function formatTime(value, options = {}) {
  const date = toDate(value)
  if (!date) return options.fallback || DATE_FALLBACK

  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options,
  }).format(date)
}

export function formatDateTime(value, options = {}) {
  const date = toDate(value)
  if (!date) return options.fallback || DATE_FALLBACK

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options,
  }).format(date)
}

export function calculateAge(dateOfBirth) {
  const date = toDate(dateOfBirth)
  if (!date) return null

  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const monthDelta = today.getMonth() - date.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < date.getDate())) {
    age -= 1
  }

  return age
}
