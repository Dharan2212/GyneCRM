import { useCallback, useEffect, useState } from 'react'
import { getDoctorDashboard } from './doctorDashboard.api.js'
import { adaptDoctorDashboard } from './doctorDashboard.adapters.js'

export function useDoctorDashboard(query = {}) {
  const [state, setState] = useState({
    data: null,
    isLoading: true,
    error: null,
  })

  const load = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }))

    try {
      const response = await getDoctorDashboard({ query })
      setState({
        data: adaptDoctorDashboard(response),
        isLoading: false,
        error: null,
      })
    } catch (error) {
      setState({
        data: null,
        isLoading: false,
        error,
      })
    }
  }, [JSON.stringify(query || {})])

  useEffect(() => {
    load()
  }, [load])

  return {
    ...state,
    reload: load,
  }
}
