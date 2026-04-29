# GyneCRM Active API Reference

## Base
- Base path: `/api/v1`
- Auth: Bearer token for protected routes
- Refresh flow: cookie-based on `/auth/refresh`

## Runtime and local setup
1. Copy `.env.example` to `.env`
2. Fill MongoDB and JWT placeholder values
3. Run:
   - `npm install`
   - `npm run seed:reference-data`
   - `npm run seed:auth-users`
   - `npm run start:new`

## Health
- `GET /health`
- `GET /api/v1/health`

## Auth
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/change-password`

## Doctors
- `GET /doctors`
- `GET /doctors/:id`
- `POST /doctors`
- `PUT /doctors/:id`

## Masters
- `GET|POST|PUT /masters/appointment-types`
- `GET|POST|PUT /masters/service-catalog`
- `GET|POST|PUT /masters/test-catalog`
- `GET|POST|PUT /masters/lab-reference-ranges`
- `GET|POST|PUT /masters/hospital-protocols`

## Patients
- `GET /patients`
- `POST /patients`
- `GET /patients/:id`
- `PUT /patients/:id`
- `GET /patients/:id/hub`
- `PATCH /patients/:id/category`
- `GET /patients/:id/category-history`
- `GET /patients/category-counts`

## Appointments
- `GET /appointments`
- `POST /appointments`
- `GET /appointments/:id`
- `PATCH /appointments/:id/status`
- `PATCH /appointments/:id/check-in`
- `PATCH /appointments/:id/reschedule`
- `GET /appointments/waitlist`
- `POST /appointments/waitlist`
- `PATCH /appointments/waitlist/:id/status`

## Dashboard
- `GET /dashboard/receptionist`
- `GET /dashboard/doctor`

## Consultations
- `POST /consultations`
- `GET /consultations/:id`
- `PUT /consultations/:id`
- `PATCH /consultations/:id/status`
- `PATCH /consultations/:id/finalise`
- `GET /consultations/:id/workspace`
- `GET /consultations/:id/follow-up`
- `GET /consultations/follow-ups`
- `PATCH /consultations/follow-ups/:id/status`

## Pregnancies
- `POST /pregnancies`
- `GET /pregnancies/:id`
- `PUT /pregnancies/:id`
- `PATCH /pregnancies/:id/high-risk`
- `PATCH /pregnancies/:id/milestones`
- `PATCH /pregnancies/:id/milestones/:milestoneCode/status`

## Prescriptions
- `POST /prescriptions`
- `GET /prescriptions/:id`
- `PATCH /prescriptions/:id/issue`
- `PATCH /prescriptions/:id/void`
- `GET /prescriptions/:id/pdf`
- `PATCH /prescriptions/:id/send`

## Test orders
- `GET /test-orders/pending-review`
- `GET /test-orders/review-inbox`
- `POST /test-orders`
- `PATCH /test-orders/:id/pending-upload`
- `PATCH /test-orders/:id/link-result`
- `PATCH|POST /test-orders/:id/review-result`
- `PATCH|POST /test-orders/:id/send-result`

## Documents
- `POST /documents/upload-url`
- `POST /documents`

Upload foundation notes:
- current runtime exposes upload-url foundation only
- file size and mime-type validation are enforced before metadata creation
- supported defaults: PDF, common image formats, and Word documents

## Billing
- `POST /billing/invoices`
- `GET /billing/invoices`
- `GET /billing/invoices/:id`
- `PUT /billing/invoices/:id`
- `PATCH /billing/invoices/:id/items`
- `PATCH /billing/invoices/:id/finalize`
- `PATCH /billing/invoices/:id/payments`
- `GET /billing/invoices/:id/pdf`
- `PATCH /billing/invoices/:id/send`

## Send history
- `GET /send-history`
- `GET /send-history/:id`
- `GET /patients/:id/send-history`

## Notifications
- `POST /notifications`
- `GET /notifications`
- `GET /notifications/:id`
- `PATCH /notifications/:id/cancel`

## Events
- `POST /events/dispatch`
- `GET /events/types`
- `GET /events/template-map`
- `GET /events`
- `GET /events/:id`

## Jobs
- `POST /jobs/dispatch`
- `POST /jobs/run/:jobType`
- `GET /jobs/types`
- `GET /jobs`
- `GET /jobs/:id`
- `PATCH /jobs/:id/cancel`

## Error response shape
All errors use the same top-level structure:

```json
{
  "success": false,
  "message": "Validation failed.",
  "request_id": "...",
  "details": []
}
```

Validation and rate-limit errors include a `details` array. Internal errors avoid stack leakage in production.
