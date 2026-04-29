# Phase 1 · Batch 1.3 Contract Freeze
## Pregnancies · Prescriptions · Test Orders · Documents · Billing

This file freezes the frontend-to-backend implementation contract for the next implementation batches.

Status: approved contract freeze only. No feature integration is implemented in this batch.

---

## 1) Frontend files currently relevant

### Shared shell / layout
- `src/App.jsx`
- `src/crm/JijauCRM.jsx`
- `src/crm/layout/Topbar.jsx`
- `src/crm/layout/Sidebar.jsx`

### Local mock / state sources
- `src/crm/data.js`

### Pregnancy-related screens / components
- `src/crm/pages/DocDash.jsx`
- `src/crm/pages/Consult.jsx`
- `src/crm/pages/CatTracker.jsx`
- `src/crm/pages/JourneyPlan.jsx`

### Prescription-related screens / components
- `src/crm/pages/Prescription.jsx`
- `src/crm/pages/Consult.jsx`

### Test report / result review / upload screens
- `src/crm/pages/TestReports.jsx`
- `src/crm/pages/RxUpload.jsx`
- `src/crm/pages/DocDash.jsx`
- `src/crm/pages/RxQueue.jsx`

### Billing-related screens / components
- `src/crm/pages/Billing.jsx`
- `src/crm/pages/RxQueue.jsx`
- `src/crm/pages/DocDash.jsx`

### Explicit placeholder / future-scope screens that must remain controlled
- `src/crm/pages/JourneyPlan.jsx`
- `src/crm/pages/IVFTracker.jsx`
- `src/crm/pages/Placeholders.jsx`

---

## 2) Backend files currently relevant

### Global routing / RBAC
- `src/routes/index.js`
- `src/constants/roles.js`
- `src/middleware/auth.js`
- `src/middleware/require-role.js`

### Pregnancies
- `src/models/Pregnancy.js`
- `src/modules/pregnancies/pregnancies.routes.js`
- `src/modules/pregnancies/pregnancies.controller.js`
- `src/modules/pregnancies/pregnancies.service.js`
- `src/modules/pregnancies/pregnancies.validator.js`
- `src/modules/pregnancies/pregnancies.query.js`
- `src/modules/pregnancies/pregnancies.milestones.js`

### Prescriptions
- `src/models/Prescription.js`
- `src/modules/prescriptions/prescriptions.routes.js`
- `src/modules/prescriptions/prescriptions.controller.js`
- `src/modules/prescriptions/prescriptions.service.js`
- `src/modules/prescriptions/prescriptions.validator.js`
- `src/modules/prescriptions/prescriptions.query.js`
- `src/modules/prescriptions/prescriptions.pdf.js`
- `src/modules/prescriptions/prescriptions.send.js`

### Test orders
- `src/models/TestOrder.js`
- `src/modules/test-orders/test-orders.routes.js`
- `src/modules/test-orders/test-orders.controller.js`
- `src/modules/test-orders/test-orders.service.js`
- `src/modules/test-orders/test-orders.validator.js`
- `src/modules/test-orders/test-orders.query.js`
- `src/modules/test-orders/test-orders.workflow.js`

### Documents
- `src/models/PatientDocument.js`
- `src/modules/documents/documents.routes.js`
- `src/modules/documents/documents.controller.js`
- `src/modules/documents/documents.service.js`
- `src/modules/documents/documents.validator.js`
- `src/modules/documents/documents.query.js`
- `src/modules/documents/documents.upload.js`

### Billing
- `src/models/Invoice.js`
- `src/modules/billing/billing.routes.js`
- `src/modules/billing/billing.controller.js`
- `src/modules/billing/billing.service.js`
- `src/modules/billing/billing.validator.js`
- `src/modules/billing/billing.query.js`
- `src/modules/billing/billing.pdf.js`
- `src/modules/billing/billing.send.js`
- `src/modules/billing/billing.calculations.js`

### Direct send-flow dependency used by prescription / test / billing send actions
- `src/modules/send-history/send-history.logging.js`
- `src/modules/send-history/send-history.routes.js`
- `src/modules/send-history/send-history.validator.js`

### Dashboard dependencies that affect these flows indirectly
- `src/modules/dashboard/doctor.dashboard.*`
- `src/modules/dashboard/reception.dashboard.*`

---

## 3) Frozen implementation contract

## 3.1 Pregnancies

### Standard frontend routes to use later
- `POST /api/v1/pregnancies`
- `GET /api/v1/pregnancies/:id`
- `PUT /api/v1/pregnancies/:id`
- `PATCH /api/v1/pregnancies/:id/high-risk`
- `GET /api/v1/pregnancies/:id/milestones`

### Additional pregnancy milestone routes that exist but are secondary for the first frontend pass
- `PATCH /api/v1/pregnancies/:id/milestones`
- `PATCH /api/v1/pregnancies/:id/milestones/:milestoneCode/status`

### Request contracts

#### Create pregnancy
Body:
- `hospital_id?`
- `patient_id` required
- `doctor_id` required
- `source_consultation_id?`
- `pregnancy_number?`
- `conception_type?` = `spontaneous | assisted | ivf | unknown`
- `lmp_date?` ISO date or `null`
- `edd?` ISO date or `null`
- at least one of `lmp_date` or `edd` must remain available
- `gravida?`
- `para?`
- `abortions?`
- `living_children?`
- `pregnancy_notes?`
- `current_weight_kg?`
- `pre_pregnancy_weight_kg?`
- `blood_group?`
- `rh_factor?` = `positive | negative | unknown`
- `high_risk?`
- `high_risk_flags?[]`
  - `code?`
  - `label?`
  - `notes?`
- `high_risk_notes?`
- `milestones?[]`
  - `code` required
  - `title?`
  - `target_week?`
  - `actual_date?`
  - `status?` = `pending | completed | skipped`
  - `notes?`

#### Update pregnancy
Body:
- editable fields only:
  - `pregnancy_number?`
  - `conception_type?`
  - `lmp_date?`
  - `edd?`
  - `gravida?`
  - `para?`
  - `abortions?`
  - `living_children?`
  - `pregnancy_notes?`
  - `current_weight_kg?`
  - `pre_pregnancy_weight_kg?`
  - `blood_group?`
  - `rh_factor?`
  - `status?` = `active | delivered | aborted | ectopic | transferred | closed`

#### Update high-risk state
Body:
- `high_risk` required boolean
- `high_risk_flags?[]`
- `high_risk_notes?`

Constraint:
- if `high_risk === false`, `high_risk_flags` must be empty

#### Get milestones
No body.

#### Update milestones (secondary route)
Body:
- `milestones` required array with unique `code`

#### Update milestone status (secondary route)
Body:
- `status` required = `pending | completed | skipped`
- `actual_date?`
- `notes?`

### Response contract
Pregnancy routes return a structured object, not a flat pregnancy row.

```json
{
  "success": true,
  "message": "Pregnancy detail fetched successfully.",
  "data": {
    "pregnancy": {
      "_id": "...",
      "hospital_id": "...",
      "patient_id": "...",
      "doctor_id": "...",
      "source_consultation_id": "...",
      "pregnancy_number": 1,
      "status": "active",
      "conception_type": "unknown",
      "lmp_date": "...",
      "edd": "...",
      "gestational_age_weeks": 0,
      "gestational_age_days": 0,
      "current_gestational_age": { "weeks": 0, "days": 0, "total_days": 0 },
      "trimester": 1,
      "gravida": null,
      "para": null,
      "abortions": null,
      "living_children": null,
      "high_risk": false,
      "high_risk_flags": [],
      "high_risk_notes": null,
      "pregnancy_notes": null,
      "current_weight_kg": null,
      "pre_pregnancy_weight_kg": null,
      "blood_group": null,
      "rh_factor": "unknown",
      "milestones": [],
      "created_by": "...",
      "updated_by": "...",
      "closed_at": null,
      "closed_by": null,
      "is_active": true,
      "created_at": "...",
      "updated_at": "..."
    },
    "patient_summary": {
      "_id": "...",
      "patient_code": "PAT000001",
      "full_name": "...",
      "phone": "...",
      "category": "pregnancy",
      "is_active": true
    },
    "doctor_summary": {
      "_id": "...",
      "full_name": "...",
      "speciality": "...",
      "registration_number": "..."
    },
    "source_consultation_summary": {
      "_id": "...",
      "status": "finalised",
      "appointment_id": "...",
      "follow_up_required": false,
      "follow_up_date": null,
      "created_at": "..."
    }
  }
}
```

Milestones endpoint returns:
```json
{
  "success": true,
  "message": "Pregnancy milestones fetched successfully.",
  "data": [
    {
      "code": "nt_scan",
      "title": "NT Scan",
      "target_week": 12,
      "actual_date": null,
      "status": "pending",
      "notes": null
    }
  ]
}
```

### Enum / status contract
- pregnancy status = `active | delivered | aborted | ectopic | transferred | closed`
- conception type = `spontaneous | assisted | ivf | unknown`
- rh factor = `positive | negative | unknown`
- milestone status = `pending | completed | skipped`

### RBAC
- all pregnancy routes = `admin`, `doctor`
- receptionist has no pregnancy route access in current runtime

### Frozen frontend mapping rules
- There is **no pregnancy list endpoint** mounted in the active backend.
- Later frontend pregnancy lists must come from patient hub, doctor dashboard, category tracker aggregation, or explicitly passed pregnancy ids.
- `JourneyPlan.jsx` must **not** be treated as a live backend-backed journey engine in the first implementation pass.
- Current backend pregnancy contract is for a **pregnancy record + milestone array**, not for the broader future-scope journey-plan / IVF modules.
- High-risk UI must map to `high_risk` + `high_risk_flags[]` + `high_risk_notes`, not a single boolean badge only.
- Current pregnancy high-risk route updates state only; frontend must not assume event / reminder dispatch side-effects from this route.

### Exact current frontend mismatch
- Template pregnancy state is stored directly on the patient object (`lmp`, `gpa`, `highRisk`, `pregnancyDates`) instead of a separate pregnancy document.
- `JourneyPlan.jsx` renders a handcrafted category timeline for pregnancy / IVF / gynac, but backend pregnancy module only owns the pregnancy record and milestone array.
- `CatTracker.jsx` mixes category tracker visuals with pregnancy progress assumptions that are not backed by a pregnancy list API.
- `DocDash.jsx` and `Consult.jsx` infer pregnancy week from local `calcPreg()` data rather than backend pregnancy detail.
- Frontend high-risk display uses a simple `highRisk` flag with no support for `high_risk_flags[]` and `high_risk_notes`.

---

## 3.2 Prescriptions

### Standard frontend routes to use later
- `POST /api/v1/prescriptions`
- `GET /api/v1/prescriptions/:id`
- `POST /api/v1/prescriptions/:id/issue`
- `PATCH /api/v1/prescriptions/:id/void`
- `GET /api/v1/prescriptions/:id/pdf`
- `POST /api/v1/prescriptions/:id/send`

### Route-method note
The backend accepts both `PATCH` and `POST` for some action routes. Standardize frontend usage later to:
- `POST /:id/issue`
- `POST /:id/send`
- `PATCH /:id/void`

### Request contracts

#### Create prescription
Body:
- `hospital_id?`
- `patient_id` required
- `doctor_id` required
- `consultation_id` required
- `appointment_id?`
- `prescription_date?`
- `diagnosis_summary?`
- `advice_notes?`
- `general_instructions?`
- `items` required array
  - `item_no?`
  - `medicine_name` required
  - `generic_name?`
  - `formulation?`
  - `strength?`
  - `dose?`
  - `route?`
  - `frequency?`
  - `duration_value?`
  - `duration_unit?` = `day | days | week | weeks | month | months`
  - `quantity?`
  - `instructions?`
  - `before_food?`
  - `after_food?`
  - `morning?`
  - `afternoon?`
  - `evening?`
  - `night?`
  - `is_prn?`
  - `prn_reason?`
  - `notes?`
  - `status?` = `active | stopped | substituted`

#### Get detail
No body.

#### Issue
Body: `{}`

Constraint:
- at least one valid item with a non-empty `medicine_name` is required before issue

#### Void
Body:
- `void_reason` required

#### PDF
No body.

#### Send
Body:
- `send_channels` required array
  - `print | whatsapp | email | sms`
- `send_notes?`

### Response contract
Prescription detail response is flat with enriched computed fields.

```json
{
  "success": true,
  "message": "Prescription detail fetched successfully.",
  "data": {
    "_id": "...",
    "hospital_id": "...",
    "patient_id": { ...populated patient summary... },
    "doctor_id": { ...populated doctor summary... },
    "consultation_id": { ...populated consultation summary... },
    "appointment_id": { ...populated appointment summary or null... },
    "prescription_date": "...",
    "diagnosis_summary": null,
    "advice_notes": null,
    "general_instructions": null,
    "items": [ ...embedded items... ],
    "issue_status": "draft",
    "issued_at": null,
    "issued_by": null,
    "void_status": false,
    "voided_at": null,
    "voided_by": null,
    "void_reason": null,
    "send_status": "not_sent",
    "send_channels": [],
    "sent_at": null,
    "sent_by": null,
    "send_notes": null,
    "created_by": "...",
    "updated_by": "...",
    "is_active": true,
    "createdAt": "...",
    "updatedAt": "...",
    "total_items": 3,
    "active_items_count": 3,
    "is_issued": false,
    "is_voided": false,
    "is_sent": false,
    "is_send_ready": false
  }
}
```

PDF endpoint returns a **JSON payload foundation**, not a binary PDF file:
```json
{
  "success": true,
  "message": "Prescription PDF foundation fetched successfully.",
  "data": {
    "foundation_type": "pdf_ready_payload",
    "filename": "prescription-<id>.pdf",
    "content_type": "application/json",
    "issued_only_rule": true,
    "document": {
      "title": "Prescription",
      "prescription_id": "...",
      "patient_summary": { ... },
      "doctor_summary": { ... },
      "consultation_summary": { ... },
      "appointment_summary": { ... },
      "items": [ ... ],
      "total_items": 3
    }
  }
}
```

### Enum / status contract
- prescription issue status = `draft | issued`
- item status = `active | stopped | substituted`
- duration unit = `day | days | week | weeks | month | months`
- send status = `not_sent | sent`
- send channels = `print | whatsapp | email | sms`
- void state is represented by `void_status` boolean, not a dedicated enum string

### RBAC
- all prescription routes = `admin`, `doctor`
- receptionist has no prescription authoring / send / PDF route access in current runtime

### Frozen frontend mapping rules
- There is **no prescription list or update route** in the active runtime for this batch.
- Later frontend should treat prescription creation as a create-then-detail workflow, not an arbitrary edit-after-save module.
- PDF endpoint is foundation-only JSON for now.
- Send action creates send-history entries; frontend should show send state from prescription detail after send completes.
- Doctor-only authorship is strict.

### Exact current frontend mismatch
- `Prescription.jsx` uses a simplified row schema: `name`, `dose`, `freq`, `dur`, `instr`.
- Backend items are richer and use `medicine_name`, `generic_name`, `formulation`, `strength`, `route`, `frequency`, `duration_value`, `duration_unit`, boolean timing flags, PRN flags, and item `status`.
- Template assumes direct Print + WhatsApp actions with no issue/void gating.
- Template has no concept of `issue_status`, `void_status`, `send_status`, or doctor-only backend ownership.
- Template Rx preview should not assume PDF download exists as a binary endpoint in the first pass.

---

## 3.3 Test orders

### Standard frontend routes to use later
- `GET /api/v1/test-orders`
- `POST /api/v1/test-orders`
- `GET /api/v1/test-orders/:id`
- `GET /api/v1/test-orders/pending-upload`
- `GET /api/v1/test-orders/review-inbox`
- `PATCH /api/v1/test-orders/:id/link-result`
- `PATCH /api/v1/test-orders/:id/review-result`
- `PATCH /api/v1/test-orders/:id/send-result`

### Secondary / restricted helper route that exists in runtime
- `POST /api/v1/test-orders/:id/pending-upload`
- `PATCH /api/v1/test-orders/:id/pending-upload`

Use this later only as an explicit admin / doctor helper if needed. Do not design the main receptionist upload UX around it.

### Request contracts

#### List test orders
Query:
- `doctor_id?`
- `patient_id?`
- `consultation_id?`
- `status?`
- `priority?` = `routine | urgent | stat`
- `ordered_from?`
- `ordered_to?`
- `abnormal_flag?`
- `page?`
- `limit?`

#### Create test order
Body:
- `hospital_id?`
- `patient_id` required
- `doctor_id` required
- `consultation_id` required
- `prescription_id?`
- `appointment_id?`
- `test_catalog_id` required
- `priority?` = `routine | urgent | stat`
- `clinical_notes?`
- `indication?`
- `specimen_type?`
- `expected_upload_at?`

#### Pending upload list
Query:
- `doctor_id?`
- `patient_id?`
- `priority?`
- `ordered_from?`
- `ordered_to?`
- `page?`
- `limit?`

#### Move to pending upload (secondary helper)
Body: `{}`

#### Link result
Body:
- `document_id` required

#### Review inbox
Query:
- `doctor_id?`
- `patient_id?`
- `status?` = `uploaded | pending_review | reviewed | sent`
- `abnormal_flag?`
- `due_from?`
- `due_to?`
- `page?`
- `limit?`

#### Review result
Body:
- `abnormal_flag?`
- `findings_summary?`
- `remarks?`
- `action_required?`
- `result_summary?`

#### Send result
Body:
- `send_channels` required array
  - `print | whatsapp | email | sms`
- `send_notes?`

### Response contract
Test-order endpoints return enriched order rows with linked document summary.

```json
{
  "success": true,
  "message": "Test order detail fetched successfully.",
  "data": {
    "_id": "...",
    "hospital_id": "...",
    "patient_id": "... or populated object",
    "doctor_id": "... or populated object",
    "consultation_id": "... or populated object",
    "prescription_id": null,
    "appointment_id": null,
    "test_catalog_id": "... or populated object",
    "ordered_at": "...",
    "ordered_by": "...",
    "status": "ordered",
    "priority": "routine",
    "clinical_notes": null,
    "indication": null,
    "specimen_type": null,
    "expected_upload_at": null,
    "uploaded_at": null,
    "uploaded_by": null,
    "review_requested_at": null,
    "reviewed_at": null,
    "reviewed_by": null,
    "sent_at": null,
    "sent_by": null,
    "result_summary": null,
    "abnormal_flag": false,
    "send_channels": [],
    "send_notes": null,
    "created_by": "...",
    "updated_by": "...",
    "is_active": true,
    "patient_summary": { ... },
    "doctor_summary": { ... },
    "consultation_summary": { ... },
    "test_catalog_summary": { ... },
    "linked_document_summary": {
      "_id": "...",
      "title": "...",
      "document_type": "test_result",
      "category": "lab",
      "upload_status": "uploaded",
      "send_status": "not_sent",
      "doctor_review": {
        "review_required": true,
        "review_status": "pending",
        "abnormal_flag": false
      }
    }
  }
}
```

List, pending-upload, and review-inbox responses are paginated:
```json
{
  "success": true,
  "message": "Test orders fetched successfully.",
  "data": [ ...items... ],
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 20,
    "total_pages": 1
  }
}
```

### Enum / status contract
#### Canonical UI lifecycle to preserve
- `ordered`
- `pending_upload`
- `uploaded`
- `pending_review`
- `reviewed`
- `sent`

#### Current runtime reality to freeze carefully
- model status enum includes: `ordered | pending_upload | uploaded | pending_review | reviewed | sent`
- validator list enum currently includes: `ordered | pending_upload | pending_review | reviewed | sent | cancelled`
- service transition logic currently uses:
  - `ordered -> pending_upload` via helper route
  - `ordered -> pending_review` or `pending_upload -> pending_review` via `link-result`
  - `pending_review -> reviewed`
  - `reviewed -> sent`
- current service code does **not** actively set `test_order.status = uploaded`
- current service code does **not** use `cancelled` in the model lifecycle

### Frozen frontend mapping rules
- Preserve UI support for the canonical statuses the business flow expects.
- For the first implementation pass, treat `linked_document_summary.upload_status === 'uploaded'` as the reliable representation of uploaded file state.
- Do **not** build the frontend around `cancelled` for test orders in this phase.
- `pending-upload` list is receptionist-readable, but status-transition helper route is not receptionist-owned.

### RBAC
- list/detail/pending-upload list = `admin`, `doctor`, `receptionist`
- create test order = `admin`, `doctor`
- move to pending-upload = `admin`, `doctor`
- link-result = `admin`, `doctor`
- review-result = `admin`, `doctor`
- send-result = `admin`, `doctor`

### Exact current frontend mismatch
- `TestReports.jsx` uses local test rows with template statuses: `ordered`, `uploaded`, `reviewed`, `sent-to-patient`.
- Backend uses a stricter test-order lifecycle plus linked document state.
- Template allows doctor to upload and send in one screen, while backend splits upload/document creation, link-result, review-result, and send-result into separate steps.
- `RxUpload.jsx` assumes receptionist can complete upload and notify doctor immediately, but current backend requires doctor/admin for `link-result` and `review-result`.
- Template stores tests under patient local state with fields like `name`, `orderedDate`, `dueDate`, `result`, `file`, `doctorNotes`, `sentToPatient`; backend uses separate `test_order` + `patient_document` structures.

---

## 3.4 Documents

### Standard frontend routes to use later
- `POST /api/v1/documents/upload-url`
- `POST /api/v1/documents`
- `GET /api/v1/documents/review-inbox`
- `POST /api/v1/documents/:id/review`
- `POST /api/v1/documents/:id/flag`
- `GET /api/v1/documents/:id/url`

### Important mounted-route reality
There is **no public `GET /api/v1/documents/:id` detail route** mounted in the current runtime.

Document detail is currently obtained indirectly from:
- create-document response
- review response
- flag response
- review inbox rows
- test-order linked-document summary

### Request contracts

#### Upload URL
Body:
- `hospital_id?`
- `document_type` required = `test_result | prescription_pdf | scan | report | consent | discharge_summary | other`
- `original_file_name` required
- `mime_type` required and must match allowed upload config
- `file_size_bytes` required and must be within max upload config size
- `test_order_id?`
- `storage_provider?` = `local | s3 | gcs | azure | other`
- `storage_bucket?`

#### Create document
Body:
- `hospital_id?`
- `patient_id` required
- `doctor_id?`
- `consultation_id?`
- `prescription_id?`
- `appointment_id?`
- `test_order_id?`
- `document_type` required
- `category` required = `lab | radiology | consultation | pregnancy | delivery | administrative | other`
- `title` required
- `description?`
- `tags?[]`
- `status?` = `active | archived | superseded`
- `upload_status?` = `pending | uploaded | failed`
- `send_status?` = `not_sent | sent`
- `storage_provider?`
- `storage_bucket?`
- `storage_key?`
- `original_file_name?`
- `stored_file_name?`
- `mime_type?`
- `file_extension?`
- `file_size_bytes?`
- `checksum?`
- `uploaded_at?`
- `clinical_summary?`

#### Review inbox
Query:
- `doctor_id?`
- `patient_id?`
- `review_status?` = `pending | reviewed`
- `abnormal_flag?`
- `page?`
- `limit?`

#### Review document
Body:
- `abnormal_flag?`
- `findings_summary?`
- `remarks?`
- `action_required?`

#### Flag document
Body:
- `abnormal_flag` required
- `remarks?`
- `action_required?`

#### Get document URL
No body.

### Response contract
#### Upload URL response
Upload URL endpoint returns a **foundation descriptor**, not a cloud-provider signed URL guarantee.

```json
{
  "success": true,
  "message": "Document upload foundation fetched successfully.",
  "data": {
    "mode": "foundation_only",
    "upload_method": "direct_upload_placeholder",
    "storage_provider": "s3",
    "storage_bucket": "...",
    "storage_key": "hospital/year/timestamp_filename.pdf",
    "expires_in_seconds": 900,
    "headers": {},
    "metadata": {
      "document_type": "test_result",
      "original_file_name": "cbc.pdf",
      "mime_type": "application/pdf",
      "file_size_bytes": 12345,
      "test_order_id": "..."
    },
    "constraints": {
      "max_file_size_bytes": 10485760,
      "allowed_mime_types": [ ... ]
    },
    "finalize_required": true
  }
}
```

#### Create / review / flag response
These routes return a populated patient-document detail shape:
```json
{
  "success": true,
  "message": "Document created successfully.",
  "data": {
    "_id": "...",
    "hospital_id": "...",
    "patient_id": "... or populated object",
    "doctor_id": "... or populated object",
    "consultation_id": "... or populated object",
    "prescription_id": null,
    "appointment_id": null,
    "test_order_id": "... or populated object",
    "document_type": "test_result",
    "category": "lab",
    "title": "CBC report",
    "description": null,
    "tags": [],
    "status": "active",
    "upload_status": "uploaded",
    "send_status": "not_sent",
    "storage_provider": "s3",
    "storage_bucket": "...",
    "storage_key": "...",
    "original_file_name": "cbc.pdf",
    "stored_file_name": null,
    "mime_type": "application/pdf",
    "file_extension": ".pdf",
    "file_size_bytes": 12345,
    "checksum": null,
    "uploaded_at": "...",
    "uploaded_by": "...",
    "sent_at": null,
    "sent_by": null,
    "send_channels": [],
    "send_notes": null,
    "clinical_summary": null,
    "doctor_review": {
      "review_required": true,
      "review_status": "pending",
      "review_requested_at": "...",
      "review_requested_by": "...",
      "reviewed_at": null,
      "reviewed_by": null,
      "abnormal_flag": false,
      "findings_summary": null,
      "remarks": null,
      "action_required": false
    },
    "patient_summary": { ... },
    "doctor_summary": { ... },
    "consultation_summary": { ... },
    "test_order_summary": { ... }
  }
}
```

#### Get document URL response
This route is also foundation-only:
```json
{
  "success": true,
  "message": "Document access foundation fetched successfully.",
  "data": {
    "mode": "read_url_foundation_only",
    "access_url": null,
    "storage_provider": "s3",
    "storage_bucket": "...",
    "storage_key": "...",
    "mime_type": "application/pdf",
    "original_file_name": "cbc.pdf",
    "expires_in_seconds": 900,
    "notes": "Signed-read URL generation is a future/provider-specific step. Current runtime returns document access foundation only."
  }
}
```

### Enum / status contract
- document type = `test_result | prescription_pdf | scan | report | consent | discharge_summary | other`
- category = `lab | radiology | consultation | pregnancy | delivery | administrative | other`
- document status = `active | archived | superseded`
- upload status = `pending | uploaded | failed`
- send status = `not_sent | sent`
- review status = `not_required | pending | reviewed`
- storage provider = `local | s3 | gcs | azure | other`

### RBAC
- upload-url = `admin`, `doctor`, `receptionist`
- create document = `admin`, `doctor`, `receptionist`
- get document URL = `admin`, `doctor`, `receptionist`
- review inbox = `admin`, `doctor`
- review document = `admin`, `doctor`
- flag document = `admin`, `doctor`

### Production-ready vs foundation-only freeze
#### Production-ready enough for first integration pass
- create-document metadata flow
- doctor review block shape
- doctor flag block shape
- review inbox list contract
- linked-document summary inside test-order responses

#### Foundation-only / not yet host-final behavior
- upload-url returns a foundation descriptor, not a guaranteed provider-signed PUT URL implementation
- get document URL returns a foundation descriptor, not an actual access URL
- frontend must not promise full binary download / preview flow until backend upload/read-url is hardened

### Exact current frontend mismatch
- `RxUpload.jsx` assumes a direct attach-and-upload action with a fake filename, no provider/storage descriptor handling.
- `TestReports.jsx` assumes doctor-side upload + send in the same screen.
- Template has no distinct document entity and no nested `doctor_review` block.
- Current frontend status chips do not model `upload_status`, `send_status`, and `doctor_review.review_status` separately.
- Frontend currently treats file attachment as complete upload success, while backend clearly separates upload foundation, create document, review, and access-url foundation.

---

## 3.5 Billing

### Standard frontend routes to use later
- `POST /api/v1/billing/invoices`
- `GET /api/v1/billing/invoices`
- `GET /api/v1/billing/invoices/:id`
- `PUT /api/v1/billing/invoices/:id`
- `POST /api/v1/billing/invoices/:id/items`
- `POST /api/v1/billing/invoices/:id/finalize`
- `POST /api/v1/billing/invoices/:id/payments`
- `GET /api/v1/billing/invoices/:id/pdf`
- `POST /api/v1/billing/invoices/:id/send`

### Mounted-path freeze
Frontend must use the **actual mounted path**:
- `/api/v1/billing/invoices`

Do **not** build against `/api/v1/invoices`.

### Route-method note
The backend accepts both `POST` and `PATCH` on some action routes. Standardize frontend later to:
- `POST /:id/items`
- `POST /:id/finalize`
- `POST /:id/payments`
- `POST /:id/send`

### Request contracts

#### Create invoice
Body:
- `hospital_id?`
- `patient_id` required
- `doctor_id?`
- `appointment_id?`
- `consultation_id?`
- `prescription_id?`
- `test_order_id?`
- `patient_document_id?`
- `invoice_date?`
- `due_date?`
- `currency?` = `INR | USD | EUR | GBP | OTHER`
- `notes?`
- `internal_notes?`
- `items?[]`
  - `item_no?`
  - `item_type?` = `consultation | procedure | medicine | lab_test | document | service | other`
  - `label` required
  - `description?`
  - `source_type?` = `consultation | prescription | test_order | patient_document | appointment | service | other`
  - `source_id?`
  - `quantity?`
  - `unit_price?`
  - `discount_amount?`
  - `tax_amount?`
  - `line_total?`
  - `notes?`
  - `status?` = `active | cancelled | waived`

#### List invoices
Query:
- `patient_id?`
- `doctor_id?`
- `status?` = `draft | issued | partially_paid | paid | void`
- `invoice_date_from?`
- `invoice_date_to?`
- `due_date_from?`
- `due_date_to?`
- `search?`
- `page?`
- `limit?`

#### Update invoice
Body:
- `invoice_date?`
- `due_date?`
- `currency?`
- `notes?`
- `internal_notes?`
- `items?[]`

Constraint:
- only draft invoices are editable in this batch

#### Add item(s)
Body:
- `items` required array of invoice items

Constraint:
- only draft invoices are editable in this batch

#### Finalize invoice
Body: `{}`

Constraint:
- invoice must be `draft`
- invoice must have at least one item

#### Record payment
Body:
- `payment_date?`
- `amount` required positive number
- `method` required = `cash | card | upi | bank_transfer | cheque | other`
- `reference_number?`
- `status?` = `recorded | confirmed | failed | reversed`
- `notes?`

Constraint:
- payment allowed only for `issued | partially_paid`
- overpayment is rejected in this batch

#### PDF
No body.

#### Send
Body:
- `send_channels` required array
  - `print | whatsapp | email | sms`
- `send_notes?`

### Response contract
Invoice list is paginated and enriched:
```json
{
  "success": true,
  "message": "Invoices fetched successfully.",
  "data": [
    {
      "_id": "...",
      "hospital_id": "...",
      "patient_id": "... or populated object",
      "doctor_id": "... or populated object",
      "appointment_id": null,
      "consultation_id": null,
      "prescription_id": null,
      "test_order_id": null,
      "patient_document_id": null,
      "invoice_number": "INV000001",
      "invoice_date": "...",
      "due_date": null,
      "status": "issued",
      "currency": "INR",
      "subtotal_amount": 0,
      "discount_amount": 0,
      "tax_amount": 0,
      "total_amount": 0,
      "amount_paid": 0,
      "amount_due": 0,
      "items": [],
      "payments": [],
      "void_status": false,
      "send_status": "not_sent",
      "item_count": 0,
      "patient_summary": { ... },
      "doctor_summary": { ... },
      "linked_summary": {
        "appointment": null,
        "consultation": null,
        "prescription": null,
        "test_order": null,
        "patient_document": null
      }
    }
  ],
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 20,
    "total_pages": 1
  }
}
```

Invoice detail response uses the same base shape but with populated linked entities and payments.

Invoice PDF endpoint returns a **JSON foundation payload**, not a binary PDF file:
```json
{
  "success": true,
  "message": "Invoice PDF foundation fetched successfully.",
  "data": {
    "mode": "pdf_foundation_payload",
    "filename": "INV000001.pdf",
    "content_type": "application/json",
    "invoice": {
      "_id": "...",
      "invoice_number": "INV000001",
      "status": "issued",
      "currency": "INR",
      "subtotal_amount": 1000,
      "discount_amount": 0,
      "tax_amount": 0,
      "total_amount": 1000,
      "amount_paid": 0,
      "amount_due": 1000,
      "total_items": 1
    },
    "patient": { ... },
    "doctor": { ... },
    "linked_summary": { ... },
    "items": [ ... ],
    "payments": [ ... ]
  }
}
```

### Enum / status contract
- invoice status = `draft | issued | partially_paid | paid | void`
- item type = `consultation | procedure | medicine | lab_test | document | service | other`
- source type = `consultation | prescription | test_order | patient_document | appointment | service | other`
- item status = `active | cancelled | waived`
- payment method = `cash | card | upi | bank_transfer | cheque | other`
- payment status = `recorded | confirmed | failed | reversed`
- send status = `not_sent | sent`
- send channels = `print | whatsapp | email | sms`

### RBAC
- all billing routes = `admin`, `receptionist`
- doctor billing visibility is approved in business scope documents, but **doctor does not have code-level route access in current runtime**

### Frozen frontend mapping rules
- Build later against `/api/v1/billing/invoices`, not `/api/v1/invoices`.
- Treat billing as receptionist / admin operational UI in the first real integration pass.
- Doctor-facing billing visibility, if shown later, must be read-only and only after backend RBAC is aligned.
- PDF endpoint is foundation-only JSON for now.
- Finalize changes `draft -> issued`.
- Payment updates move invoice toward `partially_paid` or `paid` based on computed totals.
- Void state is represented as `status: void` plus `void_status: true` in the model.

### Exact current frontend mismatch
- `Billing.jsx` uses a local bill form with fields `desc`, `qty`, `rate`, percentage discount, and free payment-mode selection.
- Backend invoice item schema uses `label`, `item_type`, `source_type`, `source_id`, `quantity`, `unit_price`, `discount_amount`, `tax_amount`, item `status`, and embedded payment objects.
- Template statuses `pending`, `partial`, `paid` do not match backend `draft`, `issued`, `partially_paid`, `paid`, `void`.
- Template assumes direct Print + WhatsApp bill actions; backend separates finalize, send, and PDF foundation endpoints.
- Template dashboard cards imply doctor-side billing visibility, but current route RBAC is receptionist/admin only.

---

## 4) Cross-domain hidden mismatch freeze

### 4.1 Pregnancy / Journey / Category boundary
- Do not merge pregnancy record implementation with the future-scope `JourneyPlan` or IVF cycle modules.
- `JourneyPlan.jsx` remains a controlled placeholder / visual planning surface until an approved backend contract exists for it.
- `CatTracker.jsx` later may read category counts and pregnancy summaries, but must not assume a dedicated pregnancy list endpoint exists.

### 4.2 Prescription authoring boundary
- Prescription authoring, issue, void, send, and PDF are doctor-only in current runtime.
- Receptionist can see shared operational context later only if exposed through other approved endpoints, not through prescription routes.

### 4.3 Test-order vs document boundary
- A test order and a patient document are different entities.
- Uploaded-file state belongs more reliably to the linked document (`upload_status`) than to the order status in the current runtime.
- Reception can create document metadata, but cannot currently complete `link-result` or `review-result` because those routes are admin/doctor only.

### 4.4 Billing mounted-path boundary
- All invoice routes are mounted under `/api/v1/billing/invoices`.
- Frontend must not guess or alias this path during implementation.

---

## 5) Exact files to create later

### Pregnancy
- `src/modules/pregnancies/pregnancies.api.js`
- `src/modules/pregnancies/pregnancies.adapters.js`
- `src/modules/pregnancies/pregnancies.hooks.js`
- `src/modules/pregnancies/pregnancies.validation.js`

### Prescriptions
- `src/modules/prescriptions/prescriptions.api.js`
- `src/modules/prescriptions/prescriptions.adapters.js`
- `src/modules/prescriptions/prescriptions.hooks.js`
- `src/modules/prescriptions/prescriptions.validation.js`

### Test orders
- `src/modules/test-orders/testOrders.api.js`
- `src/modules/test-orders/testOrders.adapters.js`
- `src/modules/test-orders/testOrders.hooks.js`
- `src/modules/test-orders/testOrders.validation.js`

### Documents
- `src/modules/documents/documents.api.js`
- `src/modules/documents/documents.adapters.js`
- `src/modules/documents/documents.hooks.js`
- `src/modules/documents/documents.validation.js`

### Billing
- `src/modules/billing/billing.api.js`
- `src/modules/billing/billing.adapters.js`
- `src/modules/billing/billing.hooks.js`
- `src/modules/billing/billing.validation.js`

### Shared helpers
- `src/modules/shared/enums/pregnancy.enums.js`
- `src/modules/shared/enums/prescription.enums.js`
- `src/modules/shared/enums/testDocument.enums.js`
- `src/modules/shared/enums/billing.enums.js`
- `src/modules/shared/formatters/clinical.formatters.js`
- `src/modules/shared/formatters/finance.formatters.js`

---

## 6) Exact files to modify later

### Shared / mock replacement
- `src/crm/JijauCRM.jsx`
- `src/crm/data.js`
- `src/crm/layout/Topbar.jsx`
- `src/crm/layout/Sidebar.jsx`

### Pregnancy / tracker surfaces
- `src/crm/pages/DocDash.jsx`
- `src/crm/pages/Consult.jsx`
- `src/crm/pages/CatTracker.jsx`
- `src/crm/pages/JourneyPlan.jsx` (keep controlled / milestone-view only unless scope expands)

### Prescription surfaces
- `src/crm/pages/Prescription.jsx`
- `src/crm/pages/Consult.jsx`

### Test / upload / review surfaces
- `src/crm/pages/TestReports.jsx`
- `src/crm/pages/RxUpload.jsx`
- `src/crm/pages/DocDash.jsx`
- `src/crm/pages/RxQueue.jsx`

### Billing surfaces
- `src/crm/pages/Billing.jsx`
- `src/crm/pages/RxQueue.jsx`
- `src/crm/pages/DocDash.jsx`

---

## 7) Exact files intentionally untouched in this batch

- all Batch 1.1 auth/session files
- all Batch 1.2 patient / appointment / consultation contract-freeze files
- `src/pages/auth/*`
- patient registration / patient hub runtime integration files not in this domain batch
- appointment booking runtime integration files not in this domain batch
- consultation runtime integration files not in this domain batch except for direct dependency references only
- `src/crm/pages/Analytics.jsx`
- `src/crm/pages/AutoHub.jsx`
- `src/crm/pages/IVFTracker.jsx`
- `src/crm/pages/Placeholders.jsx`
- website files

---

## 8) Batch outcome

This batch is successful when later implementation can proceed with zero guessing on:
- pregnancy detail / milestones / high-risk shapes
- prescription item schema and action gating
- test order lifecycle vs document lifecycle separation
- document upload / access foundation-only limits
- billing mounted path and invoice status model

No runtime feature implementation is included in this batch.
