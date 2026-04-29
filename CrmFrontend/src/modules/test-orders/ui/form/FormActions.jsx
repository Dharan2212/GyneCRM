import { S } from '../../../../crm/styles.js'

export function LoadingButton({
  label,
  loadingLabel,
  loading = false,
  variant = 'primary',
  small = false,
  style = {},
  ...buttonProps
}) {
  return (
    <button
      type="button"
      {...buttonProps}
      disabled={loading || buttonProps.disabled}
      style={{ ...S.btn(variant, small), ...style }}
    >
      {loading ? (loadingLabel || label) : label}
    </button>
  )
}

export default function FormActions({ children, align = 'flex-start' }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        marginTop: 11,
        paddingTop: 9,
        borderTop: '2px solid #E6E9F0',
        justifyContent: align,
        flexWrap: 'wrap',
      }}
    >
      {children}
    </div>
  )
}
