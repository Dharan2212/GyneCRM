import { ErrorState } from './ErrorState.jsx'
import EmptyState from './EmptyState.jsx'
import { SectionLoadingState } from './LoadingState.jsx'

export default function AsyncContent({
  isLoading = false,
  error = null,
  isEmpty = false,
  loadingTitle,
  loadingMessage,
  errorTitle,
  errorMessage,
  emptyTitle,
  emptyMessage,
  onRetry,
  children,
  compact = false,
}) {
  if (isLoading) {
    return <SectionLoadingState title={loadingTitle} message={loadingMessage} compact={compact} />
  }

  if (error) {
    return <ErrorState title={errorTitle} message={errorMessage || error?.message || 'The section could not be loaded.'} onRetry={onRetry} compact={compact} />
  }

  if (isEmpty) {
    return <EmptyState title={emptyTitle} message={emptyMessage} compact={compact} />
  }

  return children
}
