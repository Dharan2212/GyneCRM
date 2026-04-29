import { S } from '../../../../crm/styles.js'
import { Icon } from '../icons.jsx'
import StateFrame from './StateFrame.jsx'

export function ErrorState({
  title = 'Something went wrong',
  message = 'The requested data could not be loaded right now.',
  onRetry,
  retryLabel = 'Try again',
  compact = false,
}) {
  return (
    <StateFrame
      tone="error"
      icon={<Icon name="alert" size={18} />}
      title={title}
      message={message}
      compact={compact}
      action={onRetry ? <button type="button" onClick={onRetry} style={S.btn('danger', true)}>{retryLabel}</button> : null}
    />
  )
}

export function InlineErrorState({ message, onRetry }) {
  return <ErrorState title="Unable to continue" message={message} onRetry={onRetry} compact />
}
