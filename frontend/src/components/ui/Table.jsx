/**
 * GyneCRM — Table
 * Phase 7.5 — Shared UI Components
 *
 * Column definition:
 *   {
 *     key: string,              — data key (or 'actions')
 *     header: string,           — column header label
 *     sortable?: boolean,       — enable sort indicator
 *     width?: string,           — Tailwind width class e.g. 'w-40'
 *     align?: 'left'|'center'|'right',
 *     render?: (value, row) => ReactNode  — custom cell renderer
 *   }
 *
 * Usage:
 *   <Table
 *     columns={columns}
 *     data={patients}
 *     loading={isFetching}
 *     onSort={(key, dir) => setSort({ key, dir })}
 *     sort={{ key: 'name', dir: 'asc' }}
 *     pagination={{ page, limit, total, totalPages, onPageChange }}
 *     emptyTitle="No patients found"
 *     onRowClick={(row) => navigate(`/patients/${row.id}`)}
 *   />
 */

import { cn } from '@utils';
import { Spinner } from './Spinner';
import { EmptyState } from './EmptyState';
import { Button } from './Button';

const ALIGN = {
  left:   'text-left',
  center: 'text-center',
  right:  'text-right',
};

export function Table({
  columns = [],
  data = [],
  loading = false,
  sort,             // { key: string, dir: 'asc'|'desc' }
  onSort,           // (key) => void
  pagination,       // { page, limit, total, totalPages, onPageChange }
  emptyTitle = 'No records found',
  emptyDescription,
  emptyAction,
  onRowClick,
  rowClassName,
  stickyHeader = true,
  striped = true,
  className,
}) {
  function handleSortClick(col) {
    if (!col.sortable || !onSort) return;
    const nextDir =
      sort?.key === col.key && sort?.dir === 'asc' ? 'desc' : 'asc';
    onSort(col.key, nextDir);
  }

  return (
    <div className={cn('table-container', className)}>
      {/* Scroll wrapper */}
      <div className="overflow-x-auto">
        <table className="table-base">
          {/* Head */}
          <thead className={cn('table-thead', stickyHeader && 'sticky top-0 z-sticky')}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'table-th',
                    ALIGN[col.align ?? 'left'],
                    col.width,
                    col.sortable && 'cursor-pointer select-none hover:text-content-secondary',
                  )}
                  onClick={() => handleSortClick(col)}
                  aria-sort={
                    sort?.key === col.key
                      ? sort.dir === 'asc' ? 'ascending' : 'descending'
                      : col.sortable ? 'none' : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <SortIcon
                        active={sort?.key === col.key}
                        dir={sort?.key === col.key ? sort.dir : null}
                      />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="table-tbody">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center">
                  <div className="flex items-center justify-center gap-2 text-content-tertiary">
                    <Spinner size="sm" />
                    <span className="text-sm">Loading…</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                    compact
                  />
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={row.id ?? rowIdx}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'table-tr',
                    onRowClick && 'cursor-pointer',
                    striped && rowIdx % 2 !== 0 && 'bg-surface-muted/40',
                    typeof rowClassName === 'function' ? rowClassName(row) : rowClassName,
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn('table-td', ALIGN[col.align ?? 'left'])}
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : (row[col.key] ?? <span className="text-content-disabled">—</span>)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      {pagination && !loading && data.length > 0 && (
        <Pagination {...pagination} />
      )}
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, limit, total, totalPages, onPageChange }) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border bg-white">
      <p className="text-xs text-content-tertiary">
        Showing <span className="font-medium text-content-secondary">{start}–{end}</span> of{' '}
        <span className="font-medium text-content-secondary">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeftIcon />
        </Button>
        {/* Page number buttons (show up to 5) */}
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          let p;
          if (totalPages <= 5) {
            p = i + 1;
          } else if (page <= 3) {
            p = i + 1;
          } else if (page >= totalPages - 2) {
            p = totalPages - 4 + i;
          } else {
            p = page - 2 + i;
          }
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cn(
                'h-7 w-7 rounded-md text-xs font-medium transition-colors',
                p === page
                  ? 'bg-primary-500 text-white'
                  : 'text-content-secondary hover:bg-surface-subtle',
              )}
            >
              {p}
            </button>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────
function SortIcon({ active, dir }) {
  return (
    <span aria-hidden="true" className="inline-flex flex-col gap-0.5 opacity-60">
      <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
        <path d="M4 0L7.464 4.5H.536L4 0z" fill={active && dir === 'asc' ? '#0D7E8A' : '#9ca3af'} />
      </svg>
      <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
        <path d="M4 5L.536.5H7.464L4 5z" fill={active && dir === 'desc' ? '#0D7E8A' : '#9ca3af'} />
      </svg>
    </span>
  );
}

function ChevronLeftIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>;
}

function ChevronRightIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>;
}
