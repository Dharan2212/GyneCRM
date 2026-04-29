import { S } from '../../../../crm/styles.js'
import { Icon } from '../icons.jsx'
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
      icon={<Icon name="file" size={18} />}
      title={title}
      message={message}
      compact={compact}
      action={actionLabel && onAction ? <button type="button" onClick={onAction} style={S.btn('ghost', true)}>{actionLabel}</button> : null}
    />
  )
}
