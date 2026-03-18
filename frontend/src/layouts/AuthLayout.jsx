/**
 * GyneCRM — AuthLayout
 * Phase 7.6 — AppShell Layout System
 *
 * Wrapper for unauthenticated screens (currently /login only).
 * Dark gradient background matching LoginPage's own styling.
 * LoginPage renders as a direct child — this layout provides the
 * document-level background and any future shared auth chrome.
 *
 * Used in routes/index.jsx as the parent element for /login.
 * Currently LoginPage handles its own full-screen render,
 * so AuthLayout is a pass-through that adds the correct body bg.
 */

import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-primary-950">
      <Outlet />
    </div>
  );
}
