/**
 * GyneCRM — Header
 * Phase 7.6 — AppShell Layout System
 *
 * Fixed top bar spanning from sidebar edge to screen right.
 * Adjusts left offset based on sidebar collapsed state.
 *
 * Left slot:  mobile hamburger | desktop collapse toggle hint | breadcrumbs
 * Right slot: hospital name | role badge | user name | logout shortcut
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@utils';
import { useAuth } from '@hooks/useAuth';
import { RoleBadge } from '@components/ui/StatusBadge';
import { Breadcrumbs } from './Breadcrumbs';
import toast from 'react-hot-toast';

export function Header({ collapsed, onMobileMenuOpen, breadcrumbs }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      toast.error('Logout failed.');
    }
  }, [logout, navigate]);

  return (
    <header
      className="shell-header"
      style={{
        left: collapsed ? 64 : 256,
      }}
      aria-label="Application header"
    >
      {/* ── Left slot ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile: hamburger — visible < lg */}
        <button
          type="button"
          onClick={onMobileMenuOpen}
          className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-content-secondary hover:bg-surface-subtle transition-colors"
          aria-label="Open navigation menu"
        >
          <HamburgerIcon />
        </button>

        {/* Breadcrumbs slot */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs items={breadcrumbs} />
        )}
      </div>

      {/* ── Right slot ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Role badge */}
        {role && <RoleBadge role={role} />}

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 bg-surface-border" aria-hidden="true" />

        {/* User info */}
        {user && (
          <div className="hidden sm:flex items-center gap-2.5">
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary-600" aria-hidden="true">
                {(user.name ?? user.email ?? '?')
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-semibold text-content-primary leading-none">
                {user.name ?? user.email}
              </p>
            </div>
          </div>
        )}

        {/* Logout button */}
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
            'text-content-tertiary border border-surface-border',
            'hover:bg-danger-50 hover:text-danger-600 hover:border-danger-200',
            'transition-colors duration-150',
          )}
          aria-label="Sign out"
        >
          <LogoutIcon />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
