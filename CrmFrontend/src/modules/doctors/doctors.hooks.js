import { useCallback, useEffect, useMemo, useState } from 'react'
import { listDoctors } from './doctors.api.js'
import { adaptDoctorLookupItem } from './doctors.adapters.js'

export function useDoctorsLookup(filters = {}) {
  const query = useMemo(() => ({
    search: filters.search || undefined,
    speciality: filters.speciality || undefined,
    is_active: filters.isActive ?? true,
    page: filters.page || 1,
    limit: filters.limit || 20,
  }), [filters.search, filters.speciality, filters.isActive, filters.page, filters.limit])

  const [state, setState] = useState({ data: { items: [], meta: null }, isLoading: true, error: null })

  const load = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }))
    try {
      const response = await listDoctors({ query })
      setState({
        data: {
          items: (response.items || []).map(adaptDoctorLookupItem),
          meta: response.meta || null,
        },
        isLoading: false,
        error: null,
      })
    } catch (error) {
      setState({ data: { items: [], meta: null }, isLoading: false, error })
    }
  }, [JSON.stringify(query)])

  useEffect(() => {
    load()
  }, [load])

  return {
    ...state,
    reload: load,
  }
}
