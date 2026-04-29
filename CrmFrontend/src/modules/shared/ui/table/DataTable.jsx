import { C } from '../../../../crm/data.js'
import { S } from '../../../../crm/styles.js'
import EmptyState from '../state/EmptyState.jsx'
import { ErrorState } from '../state/ErrorState.jsx'
import { TableLoadingState } from '../state/LoadingState.jsx'
import { MotionSurface } from '../motion/index.js'

export function TableActions({ children }) {
  return <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>{children}</div>
}

export function TableEmptyRow({ columns, title, message, actionLabel, onAction }) {
  return (
    <tbody>
      <tr>
        <td colSpan={columns} style={{ padding: 14 }}>
          <EmptyState title={title} message={message} actionLabel={actionLabel} onAction={onAction} compact />
        </td>
      </tr>
    </tbody>
  )
}

export default function DataTable({ headers, children, isLoading = false, error = null, empty = false, emptyTitle = 'No records found', emptyMessage = 'Rows will appear here once data is available.', emptyActionLabel, onEmptyAction, onRetry, style = {}, dense = false }) {
  const columnCount = headers.length

  return (
    <MotionSurface style={{ borderRadius: 16 }}>
    <div style={{ ...S.card({ padding: 0, overflow: 'hidden' }), ...style }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: dense ? 680 : 720 }}>
          <thead>
            <tr>
              {headers.map((header) => (
                <th
                  key={header.key || header.label}
                  style={{
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '.08em',
                    color: C.kS,
                    padding: dense ? '12px 12px' : '13px 14px',
                    borderBottom: `1px solid ${C.bd}`,
                    textAlign: header.align || 'left',
                    whiteSpace: 'nowrap',
                    background: '#FAFBFE',
                    fontWeight: 700,
                  }}
                >
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>

          {isLoading ? <TableLoadingState columns={columnCount} /> : null}
          {!isLoading && error ? (
            <tbody>
              <tr>
                <td colSpan={columnCount} style={{ padding: 14 }}>
                  <ErrorState title="Unable to load records" message={error?.message || 'The list could not be loaded.'} onRetry={onRetry} compact />
                </td>
              </tr>
            </tbody>
          ) : null}
          {!isLoading && !error && empty ? <TableEmptyRow columns={columnCount} title={emptyTitle} message={emptyMessage} actionLabel={emptyActionLabel} onAction={onEmptyAction} /> : null}
          {!isLoading && !error && !empty ? children : null}
        </table>
      </div>
    </div>
    </MotionSurface>
  )
}
