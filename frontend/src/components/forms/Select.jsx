/**
 * GyneCRM — Select
 * Phase 7.4 — Shared Form Components
 *
 * Custom single-select with search and clear.
 * Works with React Hook Form via Controller (controlled pattern).
 *
 * Option shape:
 *   { value: string|number, label: string, disabled?: boolean }
 *
 * Usage with RHF Controller:
 *   <Controller
 *     name="visitType"
 *     control={control}
 *     render={({ field, fieldState }) => (
 *       <Select
 *         label="Visit type"
 *         options={VISIT_TYPE_OPTIONS}
 *         value={field.value}
 *         onChange={field.onChange}
 *         error={fieldState.error?.message}
 *         required
 *       />
 *     )}
 *   />
 *
 * Standalone:
 *   <Select options={opts} value={val} onChange={setVal} />
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@utils';
import { FormField } from './FormField';

// ─────────────────────────────────────────────────────────────────────────────

export function Select({
  // FormField props
  label,
  hint,
  error,
  required = false,
  hideLabel = false,
  // Select props
  id,
  name,
  options = [],
  value,
  onChange,
  placeholder = 'Select an option…',
  disabled = false,
  clearable = false,
  searchable = true,
  loading = false,
  // Layout
  className,
}) {
  const inputId = id || name || 'select';
  const [open, setOpen]           = useState(false);
  const [search, setSearch]       = useState('');
  const containerRef              = useRef(null);
  const searchRef                 = useRef(null);
  const [activeIdx, setActiveIdx] = useState(-1);

  const selected = options.find((o) => o.value === value) ?? null;

  // Filter options by search query
  const filtered = search.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()),
      )
    : options;

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Auto-focus search on open
  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
    if (!open) {
      setSearch('');
      setActiveIdx(-1);
    }
  }, [open, searchable]);

  function selectOption(option) {
    if (option.disabled) return;
    onChange?.(option.value);
    setOpen(false);
    setSearch('');
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange?.(null);
  }

  function handleKeyDown(e) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && filtered[activeIdx]) {
        selectOption(filtered[activeIdx]);
      }
    }
  }

  return (
    <FormField
      label={label}
      htmlFor={inputId}
      required={required}
      error={error}
      hint={hint}
      className={className}
      hideLabel={hideLabel}
    >
      <div
        ref={containerRef}
        className="select-container"
        onKeyDown={handleKeyDown}
      >
        {/* Trigger */}
        <div
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={`${inputId}-listbox`}
          aria-invalid={error ? 'true' : 'false'}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : 0}
          onClick={() => !disabled && setOpen((v) => !v)}
          className={cn(
            'select-control',
            open && 'select-control-open',
            error && 'input-error',
            disabled && 'bg-surface-subtle text-content-disabled cursor-not-allowed',
          )}
        >
          <span
            className={cn(
              'truncate text-sm',
              !selected && 'text-content-disabled',
            )}
          >
            {loading ? 'Loading…' : selected ? selected.label : placeholder}
          </span>

          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {clearable && selected && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="text-content-disabled hover:text-content-secondary"
                aria-label="Clear selection"
                tabIndex={-1}
              >
                <ClearIcon />
              </button>
            )}
            <ChevronIcon open={open} />
          </span>
        </div>

        {/* Dropdown */}
        {open && (
          <div
            id={`${inputId}-listbox`}
            role="listbox"
            aria-label={label || 'Options'}
            className="select-dropdown max-h-60 overflow-y-auto"
          >
            {/* Search */}
            {searchable && (
              <div className="sticky top-0 bg-white border-b border-surface-border">
                <input
                  ref={searchRef}
                  type="text"
                  role="searchbox"
                  aria-label="Search options"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setActiveIdx(-1); }}
                  placeholder="Search…"
                  className="select-search"
                />
              </div>
            )}

            {/* Options */}
            {filtered.length === 0 ? (
              <p className="select-empty">No options found</p>
            ) : (
              filtered.map((option, idx) => (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled}
                  onClick={() => selectOption(option)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className={cn(
                    'select-option',
                    idx === activeIdx && 'select-option-active',
                    option.value === value && 'select-option-selected',
                    option.disabled && 'select-option-disabled',
                  )}
                >
                  {option.value === value && <CheckIcon />}
                  <span className={cn('flex-1', option.value !== value && 'pl-5')}>
                    {option.label}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </FormField>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────

function ChevronIcon({ open }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true"
      className={cn('text-content-disabled transition-transform duration-150', open && 'rotate-180')}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" className="text-primary-500 shrink-0">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
