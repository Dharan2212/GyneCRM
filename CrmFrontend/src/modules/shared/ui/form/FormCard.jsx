import { C } from '../../../../crm/data.js'
import { S } from '../../../../crm/styles.js'
import { MotionSurface } from '../motion/index.js'

export default function FormCard({ title, subtitle, children, tone = 'default', style = {}, actions }) {
  const toneStyle = tone === 'soft' ? { background: '#FBFDFF', border: `1px solid ${C.tL}` } : {}

  return (
    <MotionSurface style={{ borderRadius: 16 }}>
    <div style={{ ...S.card(toneStyle), ...style }}>
      {title ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: C.kS, marginBottom: subtitle ? 5 : 0 }}>
                {title}
              </div>
              {subtitle ? <div style={{ fontSize: 12, color: C.kS, lineHeight: 1.55 }}>{subtitle}</div> : null}
            </div>
            {actions ? <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div> : null}
          </div>
          <div style={{ height: 1, background: C.bd, marginTop: 12 }} />
        </div>
      ) : null}
      {children}
    </div>
    </MotionSurface>
  )
}
