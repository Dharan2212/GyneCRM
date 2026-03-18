/**
 * GyneCRM — Sidebar
 * Phase 7.6 — AppShell Layout System
 *
 * Features:
 *   - Role-filtered navigation from ROLE_NAV constant
 *   - Collapsible to icon-only mode (256px → 64px)
 *   - Smooth CSS transition
 *   - Active route highlight via NavLink
 *   - Section group labels
 *   - Hospital brand mark at top
 *   - User info + logout at bottom
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@utils';
import { useAuth } from '@hooks/useAuth';
import { ROLE_NAV, ROLE_LABELS } from '@constants';
import { NavItem, NavIcon } from './NavItem';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar (desktop/tablet — fixed position)
// ─────────────────────────────────────────────────────────────────────────────

export function Sidebar({ collapsed, onToggle }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = ROLE_NAV[role] ?? [];
  const initials = user
    ? ((user.name ?? '').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?')
    : '?';

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      toast.error('Logout failed. Please try again.');
    }
  }, [logout, navigate]);

  return (
    <aside
      className={cn(
        'sidebar flex-col',
        collapsed ? 'sidebar-collapsed' : 'sidebar-expanded',
      )}
      aria-label="Main navigation"
    >
      {/* ── Brand header ─────────────────────────────────── */}
      <div className={cn('sidebar-brand', collapsed && 'justify-center px-2')}>
        {/* Logo mark */}
        <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </div>

        {/* Name — hidden when collapsed */}
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-content-primary truncate leading-none">
              GyneCRM
            </p>
            <p className="text-2xs text-content-tertiary mt-0.5 truncate">
              Hospital System
            </p>
          </div>
        )}

        {/* Collapse toggle — desktop only */}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'hidden lg:flex items-center justify-center w-6 h-6 rounded-md',
            'text-content-disabled hover:text-content-secondary hover:bg-surface-subtle',
            'transition-colors duration-100 shrink-0',
            collapsed && 'mt-0',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <NavIcon name={collapsed ? 'chevronRight' : 'chevronLeft'} className="w-4 h-4" />
        </button>
      </div>

      {/* ── Navigation items ──────────────────────────────── */}
      <nav className="sidebar-nav" aria-label="Module navigation">
        {navItems.map((item, idx) => {
          // Section separator
          if (item.section) {
            return collapsed ? (
              <div key={idx} className="mx-3 my-2 border-t border-surface-divider" />
            ) : (
              <p key={idx} className="nav-section-label">{item.section}</p>
            );
          }

          return (
            <NavItem
              key={item.path + item.label}
              label={item.label}
              path={item.path}
              icon={item.icon}
              collapsed={collapsed}
            />
          );
        })}
      </nav>

      {/* ── User footer ───────────────────────────────────── */}
      <div className="sidebar-footer">
        {/* User info row */}
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-2.5 py-2 mb-1 rounded-lg">
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary-600">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-content-primary truncate leading-none">
                {user.name ?? user.email}
              </p>
              <p className="text-2xs text-content-tertiary mt-0.5 capitalize">{ROLE_LABELS[role] ?? role}</p>
            </div>
          </div>
        )}

        {/* Logout button */}
        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? 'Sign out' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-lg w-full px-2.5 py-2.5 text-sm font-medium',
            'text-content-tertiary hover:bg-danger-50 hover:text-danger-600',
            'transition-colors duration-100',
            collapsed && 'justify-center px-0',
          )}
          aria-label="Sign out"
        >
          <NavIcon name="logout" className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MobileSidebar — full-width overlay panel for small screens
// ─────────────────────────────────────────────────────────────────────────────

export function MobileSidebar({ open, onClose }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = ROLE_NAV[role] ?? [];
  const initials = user
    ? ((user.name ?? '').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?')
    : '?';

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      toast.error('Logout failed. Please try again.');
    }
  }, [logout, navigate]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="sidebar-mobile-overlay"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <aside className="sidebar-mobile" aria-label="Mobile navigation">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-content-primary">GyneCRM</p>
            <p className="text-2xs text-content-tertiary">Hospital System</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-content-disabled hover:text-content-secondary p-1 rounded-md"
            aria-label="Close menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav" onClick={onClose}>
          {navItems.map((item, idx) => {
            if (item.section) {
              return <p key={idx} className="nav-section-label">{item.section}</p>;
            }
            return (
              <NavItem
                key={item.path + item.label}
                label={item.label}
                path={item.path}
                icon={item.icon}
                collapsed={false}
              />
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {user && (
            <div className="flex items-center gap-2.5 px-2.5 py-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary-600">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-content-primary truncate">{user.name ?? user.email}</p>
                <p className="text-2xs text-content-tertiary capitalize">{ROLE_LABELS[role] ?? role}</p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-lg w-full px-2.5 py-2.5 text-sm font-medium text-content-tertiary hover:bg-danger-50 hover:text-danger-600 transition-colors duration-100"
          >
            <NavIcon name="logout" className="w-[18px] h-[18px]" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
