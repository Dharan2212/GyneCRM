import { C } from '../../../../crm/data.js'
import { S } from '../../../../crm/styles.js'
import { Icon } from '../icons.jsx'

function normalizeItems(items) {
  if (!items) return []
  return Array.isArray(items) ? items.filter(Boolean) : [items].filter(Boolean)
}

function SearchControl({ value, onChange, placeholder = 'Search records' }) {
  return (
    <div style={{ position: 'relative', minWidth: 220, width: '100%', maxWidth: 360 }}>
      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.kS }}>
        <Icon name="search" size={15} color={C.kS} />
      </span>
      <input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        style={{ ...S.inp, minHeight: 38, paddingLeft: 38, background: '#fff' }}
      />
    </div>
  )
}

function FilterSelect({ value, onChange, options = [] }) {
  return (
    <select value={value} onChange={(event) => onChange?.(event.target.value)} style={{ ...S.inp, minHeight: 38, minWidth: 150, background: '#fff' }}>
      {options.map((option) => (
        <option key={option.value ?? option.v ?? option.label ?? option.l ?? 'opt'} value={option.value ?? option.v ?? ''}>
          {option.label ?? option.l ?? option.value ?? option.v}
        </option>
      ))}
    </select>
  )
}

export default function TableToolbar({
  search,
  filters,
  actions,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filterValue,
  onFilterChange,
  filterOptions,
  secondaryFilters,
  summary,
}) {
  const searchNode = search ?? (typeof onSearchChange === 'function' ? <SearchControl value={searchValue || ''} onChange={onSearchChange} placeholder={searchPlaceholder} /> : null)
  const filterNodes = [
    ...normalizeItems(filters),
    ...(filterOptions ? [<FilterSelect key="toolbar-filter" value={filterValue || ''} onChange={onFilterChange} options={filterOptions} />] : []),
    ...normalizeItems(secondaryFilters),
  ]
  const actionNodes = [...normalizeItems(actions), ...normalizeItems(summary)]

  return (
    <div style={{ ...S.card({ marginBottom: 14, padding: '12px 14px' }), boxShadow: '0 8px 18px rgba(26,24,40,.05)', borderRadius: 14 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {searchNode ? <div style={{ flex: '1 1 260px', minWidth: 220 }}>{searchNode}</div> : null}
        {filterNodes.length ? <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{filterNodes}</div> : null}
        {actionNodes.length ? <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>{actionNodes}</div> : null}
      </div>
    </div>
  )
}
