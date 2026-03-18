/**
 * GyneCRM — ReceptionLayout
 * Phase 7.6 — AppShell Layout System
 *
 * Role-specific layout wrapper.
 * Renders AppShell with <Outlet /> — all reception routes render inside.
 *
 * Route chain:
 *   ProtectedRoute(['reception'])
 *     └── ReceptionLayout (this file)
 *           └── AppShell (Sidebar + Header + main)
 *                 └── Outlet (AdminDashboard, AdminUsers, etc.)
 */

import { AppShell } from './AppShell';

export function ReceptionLayout() {
  return <AppShell />;
}
