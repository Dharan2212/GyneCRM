export function unwrapApiData(payload) {
  return payload?.data ?? null
}

export function unwrapApiItems(payload, candidateKeys = ['items', 'results', 'rows', 'records']) {
  const data = unwrapApiData(payload)

  if (Array.isArray(data)) {
    return data
  }

  if (!data || typeof data !== 'object') {
    return []
  }

  for (const key of candidateKeys) {
    if (Array.isArray(data[key])) {
      return data[key]
    }
  }

  return []
}

export function unwrapApiMeta(payload) {
  if (payload && typeof payload === 'object' && payload.meta) {
    return payload.meta
  }

  const data = unwrapApiData(payload)
  if (!data || typeof data !== 'object') return null
  return data.meta || data.pagination || null
}
