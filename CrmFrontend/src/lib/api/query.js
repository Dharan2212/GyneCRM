function normalizeValue(value) {
  if (value === undefined || value === null || value === '') return null
  if (value instanceof Date) return value.toISOString()
  return value
}

export function buildQueryString(query = {}) {
  const params = new URLSearchParams()

  Object.entries(query || {}).forEach(([key, rawValue]) => {
    const value = normalizeValue(rawValue)
    if (value === null) return

    if (Array.isArray(value)) {
      value
        .map((item) => normalizeValue(item))
        .filter((item) => item !== null)
        .forEach((item) => params.append(key, String(item)))
      return
    }

    params.append(key, String(value))
  })

  const queryString = params.toString()
  return queryString ? `?${queryString}` : ''
}
