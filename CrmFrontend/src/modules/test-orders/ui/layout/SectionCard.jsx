import { S } from '../../../../crm/styles.js'
import { CH } from '../../../../crm/atoms.jsx'

export default function SectionCard({ title, right, children, style = {} }) {
  return (
    <div style={{ ...S.card(), ...style }}>
      {title ? <CH title={title} right={right} /> : null}
      {children}
    </div>
  )
}
