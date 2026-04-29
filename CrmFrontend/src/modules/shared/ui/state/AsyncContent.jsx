import EmptyState from './EmptyState.jsx'
import { ErrorState } from './ErrorState.jsx'
import { SectionLoadingState } from './LoadingState.jsx'
import { MotionSurface } from '../motion/index.js'

export default function AsyncContent({ isLoading = false, error = null, isEmpty = false, emptyTitle, emptyMessage, onRetry, compact = false, children, loadingTitle, loadingMessage }) {
  if (isLoading) return <SectionLoadingState compact={compact} title={loadingTitle} message={loadingMessage} />
  if (error) return <ErrorState compact={compact} message={error?.message || 'Unable to load this section.'} onRetry={onRetry} />
  if (isEmpty) return <EmptyState compact={compact} title={emptyTitle} message={emptyMessage} />
  return <MotionSurface>{children}</MotionSurface>
}
