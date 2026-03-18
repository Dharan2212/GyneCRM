/**
 * GyneCRM — Application Router
 * Phase 7.6 — AppShell Layout Integration
 *
 * Route chain per role:
 *
 *   ProtectedRoute (auth + role guard)
 *       → RoleLayout (AdminLayout / DoctorLayout / ReceptionLayout / StaffLayout)
 *            → Page component
 *
 * Shared pages:
 *
 *   ProtectedRoute
 *       → AppShell
 *            → Page component
 */

import { createBrowserRouter, Navigate } from 'react-router-dom';

// Guards
import { ProtectedRoute } from './ProtectedRoute';

// Layouts
import { AuthLayout }      from '@layouts/AuthLayout';
import { AdminLayout }     from '@layouts/AdminLayout';
import { DoctorLayout }    from '@layouts/DoctorLayout';
import { ReceptionLayout } from '@layouts/ReceptionLayout';
import { StaffLayout }     from '@layouts/StaffLayout';
import { AppShell }        from '@layouts/AppShell';

// Public pages
import LoginPage from '@pages/auth/LoginPage';
import NotFound  from '@pages/NotFound';

// Admin pages
import AdminDashboard     from '@pages/admin/AdminDashboard';
import AdminAnalytics     from '@pages/admin/AdminAnalytics';
import AdminUsers         from '@pages/admin/AdminUsers';
import AdminSettings      from '@pages/admin/AdminSettings';
import AdminNotifications from '@pages/admin/AdminNotifications';
import AdminAuditLog      from '@pages/admin/AdminAuditLog';
import AdminWaitlist      from '@pages/admin/AdminWaitlist';

// Doctor pages
import DoctorDashboard      from '@pages/doctor/DoctorDashboard';
import DoctorAppointments   from '@pages/doctor/DoctorAppointments';
import DoctorPatients       from '@pages/doctor/DoctorPatients';
import DoctorConsultations  from '@pages/doctor/DoctorConsultations';
import DoctorPregnancies    from '@pages/doctor/DoctorPregnancies';
import DoctorDocumentReview from '@pages/doctor/DoctorDocumentReview';

// Reception pages
import ReceptionDashboard    from '@pages/reception/ReceptionDashboard';
import ReceptionQueue        from '@pages/reception/ReceptionQueue';
import ReceptionPatients     from '@pages/reception/ReceptionPatients';
import ReceptionAppointments from '@pages/reception/ReceptionAppointments';
import ReceptionBilling      from '@pages/reception/ReceptionBilling';
import ReceptionDocuments    from '@pages/reception/ReceptionDocuments';

// Staff pages
import StaffDashboard from '@pages/staff/StaffDashboard';
import StaffDocuments from '@pages/staff/StaffDocuments';

// Shared pages
import PatientProfile from '@pages/patients/PatientProfile';

// Helpers
import { useAuth } from '@hooks/useAuth';
import { ROLE_DASHBOARD_PATHS, ALL_ROLES } from '@constants';

/**
 * RootRedirect
 * Redirects "/" to the correct role dashboard.
 */
function RootRedirect() {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) return null;

  if (isAuthenticated && role) {
    const dashboard = ROLE_DASHBOARD_PATHS[role];
    if (dashboard) return <Navigate to={dashboard} replace />;
  }

  return <Navigate to="/login" replace />;
}

export const router = createBrowserRouter([

  /**
   * Public routes
   */
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
    ],
  },

  /**
   * Root redirect
   */
  {
    path: '/',
    element: <ProtectedRoute allowedRoles={ALL_ROLES} />,
    children: [
      { index: true, element: <RootRedirect /> },
    ],
  },

  /**
   * Admin routes
   */
  {
    path: '/admin',
    element: <ProtectedRoute allowedRoles={['admin']} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="/admin/dashboard" replace /> },
          { path: 'dashboard', element: <AdminDashboard /> },
          { path: 'analytics', element: <AdminAnalytics /> },
          { path: 'users', element: <AdminUsers /> },
          { path: 'settings', element: <AdminSettings /> },
          { path: 'notifications', element: <AdminNotifications /> },
          { path: 'audit-log', element: <AdminAuditLog /> },
          { path: 'waitlist', element: <AdminWaitlist /> },
        ],
      },
    ],
  },

  /**
   * Doctor routes
   */
  {
    path: '/doctor',
    element: <ProtectedRoute allowedRoles={['doctor']} />,
    children: [
      {
        element: <DoctorLayout />,
        children: [
          { index: true, element: <Navigate to="/doctor/dashboard" replace /> },
          { path: 'dashboard', element: <DoctorDashboard /> },
          { path: 'appointments', element: <DoctorAppointments /> },
          { path: 'patients', element: <DoctorPatients /> },
          { path: 'consultations', element: <DoctorConsultations /> },
          { path: 'pregnancies', element: <DoctorPregnancies /> },
          { path: 'documents-review', element: <DoctorDocumentReview /> },
        ],
      },
    ],
  },

  /**
   * Reception routes
   */
  {
    path: '/reception',
    element: <ProtectedRoute allowedRoles={['receptionist']} />,
    children: [
      {
        element: <ReceptionLayout />,
        children: [
          { index: true, element: <Navigate to="/reception/dashboard" replace /> },
          { path: 'dashboard', element: <ReceptionDashboard /> },
          { path: 'queue', element: <ReceptionQueue /> },
          { path: 'patients', element: <ReceptionPatients /> },
          { path: 'appointments', element: <ReceptionAppointments /> },
          { path: 'billing', element: <ReceptionBilling /> },
          { path: 'documents', element: <ReceptionDocuments /> },
        ],
      },
    ],
  },

  /**
   * Staff routes
   */
  {
    path: '/staff',
    element: <ProtectedRoute allowedRoles={['staff']} />,
    children: [
      {
        element: <StaffLayout />,
        children: [
          { index: true, element: <Navigate to="/staff/dashboard" replace /> },
          { path: 'dashboard', element: <StaffDashboard /> },
          { path: 'documents', element: <StaffDocuments /> },
        ],
      },
    ],
  },

  /**
   * Shared Patient Profile
   */
  {
    path: '/patients',
    element: <ProtectedRoute allowedRoles={['admin', 'doctor', 'receptionist', 'staff']} />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: ':id', element: <PatientProfile /> },
        ],
      },
    ],
  },

  /**
   * 404
   */
  {
    path: '*',
    element: <NotFound />,
  },

]);