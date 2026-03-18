/**
 * GyneCRM — StaffLayout
 * Phase 7.6 — AppShell Layout System
 *
 * Role-specific layout wrapper.
 * Renders AppShell with <Outlet /> — all staff routes render inside.
 *
 * Route chain:
 *   ProtectedRoute(['staff'])
 *     └── StaffLayout (this file)
 *           └── AppShell (Sidebar + Header + main)
 *                 └── Outlet (AdminDashboard, AdminUsers, etc.)
 */

import { AppShell } from './AppShell';

export function StaffLayout() {
  return <AppShell />;
}
