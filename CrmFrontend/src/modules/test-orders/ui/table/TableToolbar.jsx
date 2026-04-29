import { S } from '../../../../crm/styles.js'

export default function TableToolbar({ search, filters, actions }) {
  return (
    <div style={{ ...S.card({ marginBottom: 11 }), padding: '10px 13px' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: search ? '1 1 220px' : '0 0 auto', minWidth: search ? 180 : 'auto' }}>{search}</div>
        {filters ? <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{filters}</div> : null}
        {actions ? <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div> : null}
      </div>
    </div>
  )
}
