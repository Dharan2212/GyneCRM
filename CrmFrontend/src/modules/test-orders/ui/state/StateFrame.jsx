import { C } from '../../../../crm/data.js'
import { S } from '../../../../crm/styles.js'

const tones = {
  neutral: { bg: C.bg, border: C.bd, accent: C.m, subtle: C.kS },
  loading: { bg: C.bg, border: C.bd, accent: C.t, subtle: C.kS },
  error: { bg: '#fff3f2', border: '#f0c7c2', accent: C.er, subtle: '#8b3d34' },
  empty: { bg: '#fbfdff', border: C.bd, accent: C.kB, subtle: C.kS },
}

export default function StateFrame({
  tone = 'neutral',
  title,
  message,
  icon,
  action,
  compact = false,
  padded = true,
}) {
  const palette = tones[tone] || tones.neutral

  return (
    <div
      style={{
        ...S.card({
          background: palette.bg,
          border: `1.5px solid ${palette.border}`,
          padding: padded ? (compact ? 16 : 22) : 0,
          boxShadow: 'none',
        }),
        textAlign: compact ? 'left' : 'center',
      }}
    >
      {icon ? (
        <div
          style={{
            width: compact ? 34 : 40,
            height: compact ? 34 : 40,
            borderRadius: 12,
            background: `${palette.accent}18`,
            color: palette.accent,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: compact ? 16 : 18,
            fontWeight: 700,
            marginBottom: compact ? 8 : 10,
          }}
        >
          {icon}
        </div>
      ) : null}

      {title ? (
        <div style={{ fontSize: compact ? 13 : 14, fontWeight: 700, color: palette.accent, marginBottom: 4 }}>{title}</div>
      ) : null}

      {message ? (
        <div style={{ fontSize: compact ? 12 : 13, color: palette.subtle, lineHeight: 1.65, maxWidth: compact ? 'none' : 520, margin: compact ? 0 : '0 auto' }}>
          {message}
        </div>
      ) : null}

      {action ? <div style={{ marginTop: 12 }}>{action}</div> : null}
    </div>
  )
}
