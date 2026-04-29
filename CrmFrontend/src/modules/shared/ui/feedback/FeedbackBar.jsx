import { C } from '../../../../crm/data.js'
import { S } from '../../../../crm/styles.js'
import { Icon } from '../icons.jsx'
import { MotionSurface } from '../motion/index.js'

const TONES = {
  info: { bg: '#F7FBFD', border: C.tL, accent: C.t, icon: 'info' },
  success: { bg: C.okL, border: `${C.ok}33`, accent: C.ok, icon: 'check' },
  warning: { bg: C.wnL, border: `${C.wn}33`, accent: C.wn, icon: 'alert' },
  error: { bg: C.erL, border: `${C.er}33`, accent: C.er, icon: 'alert' },
}

export default function FeedbackBar({
  tone = 'info',
  title,
  message,
  actionLabel,
  onAction,
  onDismiss,
  compact = false,
  style = {},
}) {
  const theme = TONES[tone] || TONES.info

  return (
    <MotionSurface
      style={{
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        borderRadius: compact ? 10 : 12,
        padding: compact ? '10px 12px' : '12px 14px',
        boxShadow: '0 10px 18px rgba(26,24,40,.05)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span
          style={{
            width: compact ? 28 : 32,
            height: compact ? 28 : 32,
            borderRadius: 10,
            background: `${theme.accent}16`,
            color: theme.accent,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name={theme.icon} size={16} color={theme.accent} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {title ? <div style={{ fontSize: compact ? 12 : 13, fontWeight: 700, color: theme.accent, marginBottom: message ? 3 : 0 }}>{title}</div> : null}
          {message ? <div style={{ fontSize: compact ? 12 : 13, color: C.kB, lineHeight: 1.55 }}>{message}</div> : null}
          {(actionLabel && onAction) || onDismiss ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
              {actionLabel && onAction ? <button type="button" onClick={onAction} style={S.btn('outline', true)}>{actionLabel}</button> : null}
              {onDismiss ? <button type="button" onClick={onDismiss} style={S.btn('ghost', true)}>Dismiss</button> : null}
            </div>
          ) : null}
        </div>
      </div>
    </MotionSurface>
  )
}
