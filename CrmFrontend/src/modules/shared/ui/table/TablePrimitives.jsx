import { C } from '../../../../crm/data.js'
import { S } from '../../../../crm/styles.js'

export function TableRow({ active = false, onClick, children, style = {} }) {
  return (
    <tr
      onClick={onClick}
      style={{
        background: active ? C.mP : 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background .14s ease, transform .14s ease',
        ...style,
      }}
    >
      {children}
    </tr>
  )
}

export function TableCell({ children, align = 'left', strong = false, subtle = false, noBorder = false, style = {} }) {
  return (
    <td
      style={{
        padding: '12px 12px',
        borderBottom: noBorder ? 'none' : `1px solid ${C.bd}`,
        textAlign: align,
        verticalAlign: 'top',
        fontSize: 12.5,
        color: subtle ? C.kS : C.kB,
        fontWeight: strong ? 600 : 400,
        ...style,
      }}
    >
      {children}
    </td>
  )
}

export function TableStack({ title, subtitle, titleColor, subtitleColor, titleWeight = 600, compact = false }) {
  return (
    <div style={{ display: 'grid', gap: compact ? 2 : 3 }}>
      {title ? <div style={{ fontWeight: titleWeight, fontSize: compact ? 12 : 13, color: titleColor || C.k }}>{title}</div> : null}
      {subtitle ? <div style={{ fontSize: 11, color: subtitleColor || C.kS, lineHeight: 1.45 }}>{subtitle}</div> : null}
    </div>
  )
}

export function TableActionButton({ label, variant = 'ghost', onClick, active = false, style = {}, ...buttonProps }) {
  const actualVariant = active ? 'primary' : variant
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...S.btn(actualVariant, true), minHeight: 30, padding: '0 10px', fontSize: 11, ...style }}
      {...buttonProps}
    >
      {label}
    </button>
  )
}
