/**
 * GyneCRM — DoctorLayout
 * Phase 7.6 — AppShell Layout System
 *
 * Role-specific layout wrapper.
 * Renders AppShell with <Outlet /> — all doctor routes render inside.
 *
 * Route chain:
 *   ProtectedRoute(['doctor'])
 *     └── DoctorLayout (this file)
 *           └── AppShell (Sidebar + Header + main)
 *                 └── Outlet (AdminDashboard, AdminUsers, etc.)
 */

import { AppShell } from './AppShell';

export function DoctorLayout() {
  return <AppShell />;
}
