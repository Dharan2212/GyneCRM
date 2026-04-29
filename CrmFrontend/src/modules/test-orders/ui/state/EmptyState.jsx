import { S } from '../../../../crm/styles.js'
import StateFrame from './StateFrame.jsx'

export default function EmptyState({
  title = 'No data available',
  message = 'Records will appear here once information is added.',
  actionLabel,
  onAction,
  compact = false,
}) {
  return (
    <StateFrame
      tone="empty"
      icon="○"
      title={title}
      message={message}
      compact={compact}
      action={actionLabel && onAction ? <button type="button" onClick={onAction} style={S.btn('ghost', true)}>{actionLabel}</button> : null}
    />
  )
}
