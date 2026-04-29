import { C } from '../../../../crm/data.js'
import { S } from '../../../../crm/styles.js'
import { MotionSurface } from '../motion/index.js'

const tones = {
  neutral: { bg: C.bg, border: C.bd, accent: C.m, subtle: C.kS },
  loading: { bg: '#F7FBFD', border: C.bd, accent: C.t, subtle: C.kS },
  error: { bg: '#FFF5F4', border: '#F0D3CF', accent: C.er, subtle: '#8B3D34' },
  empty: { bg: '#FBFCFF', border: C.bd, accent: C.kB, subtle: C.kS },
}

export default function StateFrame({ tone = 'neutral', title, message, icon, action, compact = false, padded = true }) {
  const palette = tones[tone] || tones.neutral

  return (
    <MotionSurface>
    <div
      style={{
        ...S.card({
          background: palette.bg,
          border: `1px solid ${palette.border}`,
          padding: padded ? (compact ? 16 : 24) : 0,
          boxShadow: 'none',
        }),
        textAlign: compact ? 'left' : 'center',
      }}
    >
      {icon ? (
        <div
          style={{
            width: compact ? 38 : 46,
            height: compact ? 38 : 46,
            borderRadius: 14,
            background: `${palette.accent}14`,
            color: palette.accent,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: compact ? 10 : 12,
          }}
        >
          {icon}
        </div>
      ) : null}
      {title ? <div style={{ fontSize: compact ? 13 : 15, fontWeight: 700, color: palette.accent, marginBottom: 5 }}>{title}</div> : null}
      {message ? (
        <div style={{ fontSize: compact ? 12 : 13, color: palette.subtle, lineHeight: 1.65, maxWidth: compact ? 'none' : 520, margin: compact ? 0 : '0 auto' }}>
          {message}
        </div>
      ) : null}
      {action ? <div style={{ marginTop: 14 }}>{action}</div> : null}
    </div>
    </MotionSurface>
  )
}
