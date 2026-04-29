import { useCallback, useEffect, useState } from 'react'

export default function useFeedbackState(timeoutMs = 3200) {
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    if (!feedback || feedback.persistent) return undefined
    const timer = window.setTimeout(() => setFeedback(null), timeoutMs)
    return () => window.clearTimeout(timer)
  }, [feedback, timeoutMs])

  const showFeedback = useCallback((next) => setFeedback(next), [])
  const showSuccess = useCallback((message, title = 'Saved successfully') => setFeedback({ tone: 'success', title, message }), [])
  const showError = useCallback((message, title = 'Unable to continue') => setFeedback({ tone: 'error', title, message, persistent: true }), [])
  const showInfo = useCallback((message, title = 'Heads up') => setFeedback({ tone: 'info', title, message }), [])
  const showWarning = useCallback((message, title = 'Check this') => setFeedback({ tone: 'warning', title, message }), [])
  const clearFeedback = useCallback(() => setFeedback(null), [])

  return { feedback, setFeedback: showFeedback, showSuccess, showError, showInfo, showWarning, clearFeedback }
}
