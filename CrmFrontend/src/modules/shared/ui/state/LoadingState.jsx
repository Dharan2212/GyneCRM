import { C } from '../../../../crm/data.js'
import { Icon } from '../icons.jsx'
import StateFrame from './StateFrame.jsx'

export function InlineLoader({ label = 'Loading...' }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.kS }}>
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          border: `2px solid ${C.tL}`,
          borderTopColor: C.t,
          animation: 'uiSpin .8s linear infinite',
        }}
      />
      <span>{label}</span>
      <style>{`@keyframes uiSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export function PageLoadingState({ title = 'Loading page', message = 'Please wait while the latest data is being prepared.' }) {
  return <StateFrame tone="loading" icon={<Icon name="refresh" size={18} />} title={title} message={message} />
}

export function SectionLoadingState({ title = 'Loading section', message = 'Content for this section is being prepared.', compact = false }) {
  return <StateFrame tone="loading" icon={<Icon name="refresh" size={18} />} title={title} message={message} compact={compact} />
}

export function TableLoadingState({ columns = 5, rows = 4, label = 'Loading records...' }) {
  return (
    <tbody>
      <tr>
        <td colSpan={columns} style={{ padding: 0 }}>
          <div style={{ padding: 18 }}>
            <InlineLoader label={label} />
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              {Array.from({ length: rows }).map((_, index) => (
                <div key={index} style={{ height: 40, borderRadius: 10, background: index % 2 === 0 ? '#f7f9fc' : '#fbfdff', border: `1px solid ${C.bd}` }} />
              ))}
            </div>
          </div>
        </td>
      </tr>
    </tbody>
  )
}
