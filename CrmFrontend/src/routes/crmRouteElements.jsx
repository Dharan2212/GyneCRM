import { Fragment } from 'react'
import { Navigate, Route } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute.jsx'
import GuestRoute from './GuestRoute.jsx'
import RoleHomeRedirect from './RoleHomeRedirect.jsx'
import LoginPage from '../pages/auth/LoginPage.jsx'
import ChangePasswordPage from '../pages/auth/ChangePasswordPage.jsx'
import AdminHomePage from '../pages/admin/AdminHomePage.jsx'
import DoctorLayout from '../layouts/DoctorLayout.jsx'
import ReceptionistLayout from '../layouts/ReceptionistLayout.jsx'
import AdminLayout from '../layouts/AdminLayout.jsx'
import DoctorDashboardPage from '../pages/doctor/DoctorDashboardPage.jsx'
import DoctorPatientHubPage from '../pages/doctor/DoctorPatientHubPage.jsx'
import DoctorFirstConsultationPage from '../pages/doctor/DoctorFirstConsultationPage.jsx'
import DoctorFollowUpConsultationPage from '../pages/doctor/DoctorFollowUpConsultationPage.jsx'
import DoctorTestReportsPage from '../pages/doctor/DoctorTestReportsPage.jsx'
import DoctorPrescriptionPage from '../pages/doctor/DoctorPrescriptionPage.jsx'
import DoctorCategoryTrackerPage from '../pages/doctor/DoctorCategoryTrackerPage.jsx'
import ReceptionDeskPage from '../pages/reception/ReceptionDeskPage.jsx'
import RegisterPatientPage from '../pages/reception/RegisterPatientPage.jsx'
import ReceptionAppointmentsPage from '../pages/reception/ReceptionAppointmentsPage.jsx'
import UploadReportsPage from '../pages/reception/UploadReportsPage.jsx'
import ReceptionBillingPage from '../pages/reception/ReceptionBillingPage.jsx'
import DeferredPage from '../modules/shared/DeferredPage.jsx'
import { deferredRouteMeta } from '../modules/rbac/navPolicy.js'

export const crmRouteElements = (
  <Fragment>
    <Route path="/crm" element={<RoleHomeRedirect />} />
    <Route
      path="/crm/login"
      element={(
        <GuestRoute>
          <LoginPage />
        </GuestRoute>
      )}
    />
    <Route
      path="/crm/change-password"
      element={(
        <ProtectedRoute>
          <ChangePasswordPage />
        </ProtectedRoute>
      )}
    />

    <Route
      path="/crm/doctor"
      element={(
        <ProtectedRoute allowedRoles={['doctor']}>
          <DoctorLayout />
        </ProtectedRoute>
      )}
    >
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<DoctorDashboardPage />} />
      <Route path="patients" element={<DoctorPatientHubPage />} />
      <Route path="consultations/first" element={<DoctorFirstConsultationPage />} />
      <Route path="consultations/follow-up" element={<DoctorFollowUpConsultationPage />} />
      <Route path="test-reports" element={<DoctorTestReportsPage />} />
      <Route path="prescriptions" element={<DoctorPrescriptionPage />} />
      <Route path="category-tracker" element={<DoctorCategoryTrackerPage />} />
      <Route path="journey-plan" element={<DeferredPage {...deferredRouteMeta.doctorJourneyPlan} />} />
      <Route path="ivf-tracker" element={<DeferredPage {...deferredRouteMeta.doctorIvfTracker} />} />
      <Route path="analytics" element={<DeferredPage {...deferredRouteMeta.doctorAnalytics} />} />
      <Route path="automation" element={<DeferredPage {...deferredRouteMeta.doctorAutomation} />} />
      <Route path="billing" element={<DeferredPage {...deferredRouteMeta.doctorBilling} />} />
      <Route path="appointments" element={<DeferredPage {...deferredRouteMeta.doctorAppointments} />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Route>

    <Route
      path="/crm/receptionist"
      element={(
        <ProtectedRoute allowedRoles={['receptionist']}>
          <ReceptionistLayout />
        </ProtectedRoute>
      )}
    >
      <Route index element={<Navigate to="desk" replace />} />
      <Route path="desk" element={<ReceptionDeskPage />} />
      <Route path="register-patient" element={<RegisterPatientPage />} />
      <Route path="appointments" element={<ReceptionAppointmentsPage />} />
      <Route path="upload-report" element={<UploadReportsPage />} />
      <Route path="billing" element={<ReceptionBillingPage />} />
      <Route path="reminders" element={<DeferredPage {...deferredRouteMeta.receptionistReminders} />} />
      <Route path="*" element={<Navigate to="desk" replace />} />
    </Route>

    <Route
      path="/crm/admin"
      element={(
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminLayout />
        </ProtectedRoute>
      )}
    >
      <Route index element={<AdminHomePage />} />
      <Route path="*" element={<AdminHomePage />} />
    </Route>
  </Fragment>
)
