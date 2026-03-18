/**
 * GyneCRM — SearchInput
 * Phase 7.4 — Shared Form Components
 *
 * Optimized for fast receptionist search workflows.
 * Debounce is handled by the CALLER via useDebounce() (added in Batch 7.2+).
 * This component is a pure controlled input.
 *
 * Usage:
 *   <SearchInput
 *     value={query}
 *     onChange={setQuery}
 *     onClear={() => setQuery('')}
 *     placeholder="Search by name or phone…"
 *     loading={isFetching}
 *   />
 */

import { forwardRef } from 'react';
import { cn } from '@utils';

export const SearchInput = forwardRef(function SearchInput(
  {
    value = '',
    onChange,
    onClear,
    placeholder = 'Search…',
    loading = false,
    disabled = false,
    autoFocus = false,
    className,
    inputClassName,
    id,
    name,
    'aria-label': ariaLabel,
    ...rest
  },
  ref,
) {
  const inputId = id || name || 'search-input';

  function handleChange(e) {
    onChange?.(e.target.value);
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape' && value) {
      e.preventDefault();
      onClear?.();
    }
  }

  return (
    <div className={cn('search-input-wrap', className)}>
      {/* Search icon */}
      <span className="search-icon" aria-hidden="true">
        <SearchIcon />
      </span>

      <input
        ref={ref}
        id={inputId}
        name={name}
        type="search"
        role="searchbox"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={ariaLabel || placeholder}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={cn(
          'search-input',
          /* native search cancel button hidden via CSS in index.css */
          '[&::-webkit-search-cancel-button]:hidden',
          '[&::-webkit-search-decoration]:hidden',
          inputClassName,
        )}
        {...rest}
      />

      {/* Right slot: spinner or clear button */}
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
        {loading ? (
          <span className="spinner w-4 h-4 text-content-disabled" aria-label="Searching…" />
        ) : value ? (
          <button
            type="button"
            onClick={onClear}
            className="search-clear"
            aria-label="Clear search"
            tabIndex={-1}
          >
            <ClearIcon />
          </button>
        ) : null}
      </span>
    </div>
  );
});

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
