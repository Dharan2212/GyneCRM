'use strict';

const { Router } = require('express');
const healthRouter = require('./health.route');

/**
 * Central API Router — GyneCRM
 *
 * Mounted in app.js at: app.use('/api/v1', routes)
 * All routes below are available at /api/v1/<path>
 *
 * Route group structure (architecture-locked):
 *   /api/v1/health              — Liveness/readiness probe (unauthenticated)
 *   /api/v1/auth                — Login, logout, token refresh, password ops
 *   /api/v1/hospital            — Hospital profile and settings
 *   /api/v1/users               — User CRUD, role assignment, activation
 *   /api/v1/doctors             — Doctor profile and schedule management
 *   /api/v1/patients            — Patient registration, search, profile
 *   /api/v1/appointments        — Schedule, reschedule, cancel, check-in
 *   /api/v1/pregnancies         — Pregnancy tracking, milestones, high-risk
 *   /api/v1/consultations       — Doctor consultation notes
 *   /api/v1/prescriptions       — Digital prescriptions + PDF generation
 *   /api/v1/test-orders         — Lab/test order management
 *   /api/v1/documents           — File upload/retrieval (S3) + document reviews
 *   /api/v1/invoices            — Billing, payments, invoice management
 *   /api/v1/analytics           — Admin KPI dashboard (Phase 5 Batch 7)
 *   /api/v1/webhooks            — Inbound N8N webhook endpoints (Phase 6)
 *
 * ROUTE ORDERING FOR /documents:
 *   documentReview router MUST be mounted before documentUpload router.
 *   documentReview handles: GET /review-inbox, GET /:id, POST /:id/review,
 *   POST /:id/flag, DELETE /:id
 *   documentUpload handles: POST /upload-url, POST /, GET /:id/url
 *   Express evaluates in registration order; static paths win over params.
 */

const router = Router();

// ─── Health (unauthenticated) ─────────────────────────────────────────────────
router.use('/health', healthRouter);

// ─── Phase 3: Auth ────────────────────────────────────────────────────────────
const authRouter = require('../modules/auth/auth.routes');
router.use('/auth', authRouter);

// ─── Phase 4: Core Modules ────────────────────────────────────────────────────
const hospitalRouter = require('../modules/hospital/hospital.routes');
router.use('/hospital', hospitalRouter);

const usersRouter = require('../modules/users/users.routes');
router.use('/users', usersRouter);

const doctorsRouter = require('../modules/doctors/doctors.routes');
router.use('/doctors', doctorsRouter);

const patientsRouter = require('../modules/patients/patients.routes');
router.use('/patients', patientsRouter);

const appointmentsRouter = require('../modules/appointments/appointments.routes');
router.use('/appointments', appointmentsRouter);

// ─── Phase 5 Batch 1: Consultations ──────────────────────────────────────────
const consultationsRouter = require('../modules/consultations/consultation.routes');
router.use('/consultations', consultationsRouter);

// ─── Phase 5 Batch 2: Prescriptions ──────────────────────────────────────────
const prescriptionsRouter = require('../modules/prescriptions/prescription.routes');
router.use('/prescriptions', prescriptionsRouter);

// ─── Phase 5 Batch 3: Pregnancies ────────────────────────────────────────────
const pregnanciesRouter = require('../modules/pregnancies/pregnancy.routes');
router.use('/pregnancies', pregnanciesRouter);

// ─── Phase 5 Batch 4: Test Orders ────────────────────────────────────────────
const testOrdersRouter = require('../modules/test-orders/testOrder.routes');
router.use('/test-orders', testOrdersRouter);

// ─── Phase 5 Batch 4 + 6: Documents (review + upload) ────────────────────────
// ORDERING IS CRITICAL:
//   1. documentReview router first — handles /review-inbox, /:id, /:id/review, /:id/flag, DELETE /:id
//   2. document router second     — handles /upload-url, POST /, /:id/url
// Both are mounted under /documents. Express will try each in order.
const documentReviewRouter = require('../modules/document-reviews/documentReview.routes');
const documentUploadRouter = require('../modules/documents/document.routes');
router.use('/documents', documentReviewRouter);
router.use('/documents', documentUploadRouter);

// ─── Phase 5 Batch 5: Billing / Invoices ─────────────────────────────────────
const invoicesRouter = require('../modules/billing/invoice.routes');
router.use('/invoices', invoicesRouter);

// ─── Phase 5 Batch 7: Analytics (placeholder — uncomment when built) ─────────
const analyticsRouter = require('../modules/analytics/analytics.routes');
router.use('/analytics', analyticsRouter);

//─── Phase 5 Batch 8: Delivery & Postpartum (placeholder) ────────────────────
const deliveryRouter = require('../modules/deliveries/delivery.routes');
router.use('/deliveries', deliveryRouter);

// ─── Phase 6 Batch 1: Notifications ──────────────────────────────────────────
// GET /           — paginated list (admin, doctor)
// GET /failed     — failed rows for retry dashboard (admin)
// GET /:id        — single record (admin, doctor)
// POST /:id/retry — re-dispatch failed notification to N8N (admin)
// GET /automation-status — automation readiness check (admin)
const notificationsRouter = require('../modules/notifications/notifications.routes');
router.use('/notifications', notificationsRouter);

// ─── Phase 6 Batch 1: Webhooks ────────────────────────────────────────────────
// POST /n8n-callback — inbound N8N delivery status callback
//                      NOT JWT-authenticated; verified by X-Webhook-Secret header
const webhooksRouter = require('../modules/webhooks/webhooks.routes');
router.use('/webhooks', webhooksRouter);

module.exports = router;
