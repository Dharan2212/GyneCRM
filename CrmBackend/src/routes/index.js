const express = require('express');
const { sendSuccess } = require('../utils/api-response');
const authRoutes = require('../modules/auth/auth.routes');
const doctorsRoutes = require('../modules/doctors/doctors.routes');
const mastersRoutes = require('../modules/masters/masters.routes');
const patientsRoutes = require('../modules/patients/patients.routes');
const appointmentsRoutes = require('../modules/appointments/appointments.routes');
const receptionDashboardRoutes = require('../modules/dashboard/reception.dashboard.routes');
const doctorDashboardRoutes = require('../modules/dashboard/doctor.dashboard.routes');
const consultationsRoutes = require('../modules/consultations/consultations.routes');
const pregnanciesRoutes = require('../modules/pregnancies/pregnancies.routes');
const prescriptionsRoutes = require('../modules/prescriptions/prescriptions.routes');
const testOrdersRoutes = require('../modules/test-orders/test-orders.routes');
const documentsRoutes = require('../modules/documents/documents.routes');
const billingRoutes = require('../modules/billing/billing.routes');
const sendHistoryRoutes = require('../modules/send-history/send-history.routes');
const notificationsRoutes = require('../modules/notifications/notifications.routes');
const eventsRoutes = require('../modules/events/events.routes');
const jobsRoutes = require('../modules/jobs/jobs.routes');

const router = express.Router();

router.get('/health', (req, res) => {
  return sendSuccess(res, {
    message: 'GyneCRM src API is healthy.',
    data: {
      timestamp: new Date().toISOString(),
    },
  });
});

router.use('/auth', authRoutes);
router.use('/doctors', doctorsRoutes);
router.use('/masters', mastersRoutes);
router.use('/patients', patientsRoutes);
router.use('/appointments', appointmentsRoutes);
router.use('/dashboard', receptionDashboardRoutes);
router.use('/dashboard', doctorDashboardRoutes);
router.use('/consultations', consultationsRoutes);
router.use('/pregnancies', pregnanciesRoutes);
router.use('/prescriptions', prescriptionsRoutes);
router.use('/test-orders', testOrdersRoutes);
router.use('/documents', documentsRoutes);
router.use('/billing', billingRoutes);
router.use('/send-history', sendHistoryRoutes.historyRouter);
router.use('/patients', sendHistoryRoutes.patientHistoryRouter);
router.use('/notifications', notificationsRoutes);
router.use('/events', eventsRoutes);
router.use('/jobs', jobsRoutes);

module.exports = router;
