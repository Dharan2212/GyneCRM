import { C } from '../../../../crm/data.js'
import { S } from '../../../../crm/styles.js'

export default function FormCard({ title, children, tone = 'default', style = {} }) {
  const toneStyle = tone === 'soft'
    ? { background: C.tP, border: `1.5px solid ${C.tL}` }
    : {}

  return (
    <div style={{ ...S.card(toneStyle), ...style }}>
      {title ? (
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.kS, borderBottom: `2px solid ${C.bd}`, paddingBottom: 8, marginBottom: 13 }}>
          {title}
        </div>
      ) : null}
      {children}
    </div>
  )
}
