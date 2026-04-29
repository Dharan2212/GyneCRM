import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPagePathForRole } from '../rbac/navPolicy.js'

export function useCrmPageNavigation(role) {
  const navigate = useNavigate()

  return useCallback((pageId) => {
    navigate(getPagePathForRole(role, pageId))
  }, [navigate, role])
}
