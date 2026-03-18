/**
 * GyneCRM — AppShell
 * Phase 7.6 — AppShell Layout System
 *
 * Core layout frame. Coordinates:
 *   - Fixed sidebar (desktop/tablet)
 *   - Mobile overlay sidebar
 *   - Fixed header (right of sidebar)
 *   - Scrollable main content area
 *   - Sidebar collapsed state (persisted to localStorage)
 *
 * Used by all role layouts:
 *   AdminLayout / DoctorLayout / ReceptionLayout / StaffLayout
 *
 * Layout anatomy (desktop):
 *   ┌──────────────────────────────────────────────────────┐
 *   │  [Sidebar 256px] │  [Header — fills remaining width] │
 *   │                  ├──────────────────────────────────  │
 *   │                  │  [Scrollable page content]         │
 *   └──────────────────┴──────────────────────────────────  ┘
 *
 * Collapsed (desktop):
 *   ┌────────────────────────────────────────────────────── ┐
 *   │  [64px] │  [Header]                                   │
 *   │         ├─────────────────────────────────────────    │
 *   │  icons  │  [Page content — wider]                     │
 *   └─────────┴─────────────────────────────────────────    ┘
 */

import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, MobileSidebar } from '@components/layout/Sidebar';
import { Header } from '@components/layout/Header';
import { STORAGE_KEYS } from '@constants';

const SIDEBAR_STORAGE_KEY = STORAGE_KEYS.SIDEBAR_COLLAPSED;

export function AppShell({ children, breadcrumbs }) {
  // ── Sidebar collapsed state — persisted ──────────────────────────────────
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // ── Mobile sidebar open state ─────────────────────────────────────────────
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Close mobile sidebar on route change (nav click already closes via onClick)
  useEffect(() => {
    setMobileOpen(false);
  }, []);

  const sidebarWidth = collapsed ? 64 : 256;

  return (
    <div className="shell-root">
      {/* ── Desktop/Tablet Sidebar — hidden on mobile (< lg) ── */}
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
      </div>

      {/* ── Mobile Sidebar — overlay drawer ───────────────── */}
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* ── Main area (header + content) ──────────────────── */}
      <div
        className="shell-main"
        style={{ marginLeft: sidebarWidth }}
      >
        {/* Fixed header */}
        <Header
          collapsed={collapsed}
          onMobileMenuOpen={() => setMobileOpen(true)}
          breadcrumbs={breadcrumbs}
        />

        {/* Scrollable page content */}
        <main className="shell-page" id="main-content" tabIndex={-1}>
          {/* children prop OR Outlet for route-nested usage */}
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
