import { useCallback, useEffect, useState } from 'react'
import { getReceptionDashboard } from './receptionDashboard.api.js'
import { adaptReceptionDashboard } from './receptionDashboard.adapters.js'

export function useReceptionDashboard(query = {}) {
  const [state, setState] = useState({
    data: null,
    isLoading: true,
    error: null,
  })

  const load = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }))

    try {
      const response = await getReceptionDashboard({ query })
      setState({
        data: adaptReceptionDashboard(response),
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
