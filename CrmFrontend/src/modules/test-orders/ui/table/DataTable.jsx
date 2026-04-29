import { C } from '../../../../crm/data.js'
import { S } from '../../../../crm/styles.js'
import EmptyState from '../state/EmptyState.jsx'
import { ErrorState } from '../state/ErrorState.jsx'
import { TableLoadingState } from '../state/LoadingState.jsx'

export function TableActions({ children }) {
  return <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>
}

export function TableEmptyRow({ columns, title, message, actionLabel, onAction }) {
  return (
    <tbody>
      <tr>
        <td colSpan={columns} style={{ padding: 12 }}>
          <EmptyState title={title} message={message} actionLabel={actionLabel} onAction={onAction} compact />
        </td>
      </tr>
    </tbody>
  )
}

export default function DataTable({
  headers,
  children,
  isLoading = false,
  error = null,
  empty = false,
  emptyTitle = 'No records found',
  emptyMessage = 'Rows will appear here once data is available.',
  emptyActionLabel,
  onEmptyAction,
  onRetry,
}) {
  const columnCount = headers.length

  return (
    <div style={S.card()}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header.key || header.label}
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  color: C.kS,
                  padding: '8px 10px',
                  borderBottom: `2px solid ${C.bd}`,
                  textAlign: header.align || 'left',
                  whiteSpace: 'nowrap',
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
              <td colSpan={columnCount} style={{ padding: 12 }}>
                <ErrorState title="Unable to load records" message={error?.message || 'The list could not be loaded.'} onRetry={onRetry} compact />
              </td>
            </tr>
          </tbody>
        ) : null}
        {!isLoading && !error && empty ? (
          <TableEmptyRow columns={columnCount} title={emptyTitle} message={emptyMessage} actionLabel={emptyActionLabel} onAction={onEmptyAction} />
        ) : null}
        {!isLoading && !error && !empty ? children : null}
      </table>
    </div>
  )
}
