import { C } from '../../../../crm/data.js'
import { S } from '../../../../crm/styles.js'

export function LoadingButton({ label, loadingLabel, loading = false, variant = 'primary', small = false, style = {}, ...buttonProps }) {
  return (
    <button
      type="button"
      {...buttonProps}
      disabled={loading || buttonProps.disabled}
      style={{ ...S.btn(variant, small), ...style }}
    >
      {loading ? (<>
        <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', display: 'inline-block', animation: 'uiSpin .7s linear infinite' }} />
        <span>{loadingLabel || label}</span>
      </>) : label}
      {loading ? <style>{`@keyframes uiSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style> : null}
    </button>
  )
}

export default function FormActions({ children, align = 'flex-start', helper }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        marginTop: 16,
        paddingTop: 14,
        borderTop: '1px solid #E6E9F0',
        justifyContent: align,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      {helper ? <div style={{ marginRight: align === 'space-between' ? 'auto' : 0, fontSize: 11, color: C.kS, lineHeight: 1.5 }}>{helper}</div> : null}
      {children}
    </div>
  )
}
