/**
 * GyneCRM — AdminLayout
 * Phase 7.6 — AppShell Layout System
 *
 * Role-specific layout wrapper.
 * Renders AppShell with <Outlet /> — all admin routes render inside.
 *
 * Route chain:
 *   ProtectedRoute(['admin'])
 *     └── AdminLayout (this file)
 *           └── AppShell (Sidebar + Header + main)
 *                 └── Outlet (AdminDashboard, AdminUsers, etc.)
 */

import { AppShell } from './AppShell';

export function AdminLayout() {
  return <AppShell />;
}
