import { S } from '../../../../crm/styles.js'
import { CH } from '../../../../crm/atoms.jsx'

export default function SectionCard({ title, right, children, style = {}, icon, subtitle }) {
  return (
    <div style={{ ...S.card(), ...style }}>
      {title ? <CH title={title} right={right} icon={icon} subtitle={subtitle} /> : null}
      {children}
    </div>
  )
}
