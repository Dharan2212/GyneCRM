# Phase 1 · Batch 1.2 Contract Freeze
## Patients · Appointments · Consultations

This file freezes the frontend-to-backend implementation contract for the next implementation batches.

Status: approved contract freeze only. No feature integration is implemented in this batch.

## 1) Frontend files currently relevant

### Shared shell / layout
- `src/App.jsx`
- `src/crm/JijauCRM.jsx`
- `src/crm/layout/Topbar.jsx`
- `src/crm/layout/Sidebar.jsx`

### Local mock / state sources
- `src/crm/data.js`

### Patient-related screens
- `src/crm/pages/DocDash.jsx`
- `src/crm/pages/PatientHub.jsx`
- `src/crm/pages/RxQueue.jsx`
- `src/crm/pages/RxRegister.jsx`

### Consultation-related screens
- `src/crm/pages/FirstConsult.jsx`
- `src/crm/pages/Consult.jsx`

### Appointment-related screens
- `src/crm/pages/Placeholders.jsx`
- `src/crm/pages/DocDash.jsx`
- `src/crm/pages/RxQueue.jsx`

## 2) Backend files currently relevant

### Global routing / RBAC
- `src/routes/index.js`
- `src/constants/roles.js`
- `src/middleware/auth.js`
- `src/middleware/require-role.js`

### Patients
- `src/models/Patient.js`
- `src/models/PatientCategoryHistory.js`
- `src/modules/patients/patients.routes.js`
- `src/modules/patients/patients.controller.js`
- `src/modules/patients/patients.service.js`
- `src/modules/patients/patients.validator.js`
- `src/modules/patients/patients.query.js`
- `src/modules/patients/patients.hub.js`

### Appointments
- `src/models/Appointment.js`
- `src/models/Waitlist.js`
- `src/modules/appointments/appointments.routes.js`
- `src/modules/appointments/appointments.controller.js`
- `src/modules/appointments/appointments.service.js`
- `src/modules/appointments/appointments.validator.js`
- `src/modules/appointments/appointments.query.js`
- `src/modules/appointments/appointments.waitlist.query.js`

### Consultations
- `src/models/Consultation.js`
- `src/models/FollowUp.js`
- `src/modules/consultations/consultations.routes.js`
- `src/modules/consultations/consultations.controller.js`
- `src/modules/consultations/consultations.service.js`
- `src/modules/consultations/consultations.validator.js`
- `src/modules/consultations/consultations.query.js`
- `src/modules/consultations/consultations.workspace.js`
- `src/modules/consultations/consultations.followup.query.js`

## 3) Frozen implementation contract

### 3.1 Patients

#### Standard frontend routes to use later
- `GET /api/v1/patients`
- `POST /api/v1/patients`
- `GET /api/v1/patients/:id`
- `PUT /api/v1/patients/:id`
- `GET /api/v1/patients/:id/hub`
- `PATCH /api/v1/patients/:id/category`
- `GET /api/v1/patients/:id/category-history`
- `GET /api/v1/patients/category-counts`

#### Request contracts

##### List patients
Query:
- `hospital_id?`
- `category?` = `pregnancy | ivf | gynac | uncategorized`
- `is_active?` = boolean
- `search?`
- `page?`
- `limit?`

##### Register patient
Body:
- `hospital_id?`
- `full_name` required
- `date_of_birth?` ISO date or `null`
- `phone` required
- `alternate_phone?`
- `address?` object
  - `line_1?`, `line_2?`, `area?`, `city?`, `state?`, `postal_code?`, `country?`
- `blood_group?` = `A+ | A- | B+ | B- | AB+ | AB- | O+ | O- | null`
- `emergency_contact?` object
  - `name?`, `relation?`, `phone?`
- `family_whatsapp?`
- `category?` optional but frontend must default to not sending category from receptionist registration
- `medical_history?` object
  - `existing_conditions?[]`
  - `surgical_history?`
  - `allergies?[]`
  - `current_medications?[]`
  - `family_history?`
  - `notes?`
- `consents?[]`
- `is_active?`

##### Update patient
Body = same editable demographics shape as register, except:
- no category update here
- no `patient_code`
- no `registered_by`
- no delete fields

##### Update category
Body:
- `category` required = `pregnancy | ivf | gynac | uncategorized`
- `reason?`

#### Response contracts

##### List response
```json
{
  "success": true,
  "message": "Patients fetched successfully.",
  "data": [
    {
      "_id": "...",
      "hospital_id": "...",
      "patient_code": "PAT000001",
      "full_name": "...",
      "date_of_birth": "...",
      "phone": "...",
      "alternate_phone": null,
      "address": { ... },
      "blood_group": null,
      "emergency_contact": { ... },
      "family_whatsapp": null,
      "category": "uncategorized",
      "medical_history": { ... },
      "consents": [],
      "registered_by": "...",
      "is_active": true,
      "is_deleted": false,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 10,
    "total_pages": 1
  }
}
```

##### Detail response
Same patient document shape as list item.

##### Hub response
```json
{
  "success": true,
  "message": "Patient hub fetched successfully.",
  "data": {
    "patient": { ...full patient document... },
    "category": {
      "current": "uncategorized",
      "history_summary": {
        "total_changes": 0,
        "latest_change": null
      }
    },
    "recent_appointments": {
      "total_recent": 0,
      "items": [
        {
          "_id": "...",
          "scheduled_at": "...",
          "status": "scheduled",
          "visit_type": "new",
          "doctor_id": "...",
          "appointment_type_id": "...",
          "reason_for_visit": null
        }
      ]
    },
    "summary": {
      "patient_id": "...",
      "patient_code": "PAT000001",
      "full_name": "...",
      "current_category": "uncategorized",
      "is_active": true,
      "registered_at": "...",
      "updated_at": "..."
    }
  }
}
```

##### Category counts response
```json
{
  "success": true,
  "message": "Patient category counts fetched successfully.",
  "data": {
    "counts": {
      "pregnancy": 0,
      "ivf": 0,
      "gynac": 0,
      "uncategorized": 0
    },
    "total": 0
  }
}
```

#### RBAC
- list/detail/hub: `admin`, `doctor`, `receptionist`
- register/update demographics: `admin`, `receptionist`
- category update/category history/category counts: `admin`, `doctor`

#### Frozen frontend mapping rules
- frontend display label `Pregnancy` maps to backend enum `pregnancy`
- frontend display label `IVF` maps to backend enum `ivf`
- frontend display label `Gynac` maps to backend enum `gynac`
- uncategorized patients must be treated as backend `uncategorized`, not `null`
- patient primary key for API work is `_id`, not template `id`
- `patient_code` replaces template MR number assumptions
- age must be derived for display from `date_of_birth`, not stored as an editable main field

### 3.2 Appointments

#### Standard frontend routes to use later
- `GET /api/v1/appointments`
- `POST /api/v1/appointments`
- `GET /api/v1/appointments/:id`
- `POST /api/v1/appointments/:id/check-in` ← standard frontend route
- `PATCH /api/v1/appointments/:id/status`
- `PATCH /api/v1/appointments/:id/reschedule`

#### Optional later receptionist-only waitlist routes
- `GET /api/v1/appointments/waitlist`
- `POST /api/v1/appointments/waitlist`
- `PATCH /api/v1/appointments/waitlist/:id/status`

Waitlist remains backend-supported but frontend-placeholder for now.

#### Request contracts

##### List appointments
Query:
- `hospital_id?`
- `doctor_id?`
- `patient_id?`
- `appointment_type_id?`
- `status?` = `scheduled | checked_in | completed | cancelled | no_show | rescheduled`
- `date?`
- `scheduled_from?`
- `scheduled_to?`
- `page?`
- `limit?`

##### Create appointment
Body:
- `hospital_id?`
- `patient_id` required
- `doctor_id` required
- `appointment_type_id` required
- `scheduled_at` required ISO datetime
- `duration_minutes` required integer `1..480`
- `visit_type` required = `new | follow_up | review | procedure | other`
- `reason_for_visit?`
- `notes?`

##### Check-in
Body: empty object `{}`

##### Status update
Body:
- `status` required = `cancelled | no_show`
- `cancellation_reason?`

##### Reschedule
Body:
- `scheduled_at` required ISO datetime
- `duration_minutes?`
- `reschedule_reason?`
- `notes?`

#### Response contracts

##### List/detail/create/check-in/status responses
All return appointment documents populated with:
- `patient_id` → `{ _id, patient_code, full_name, phone, category, is_active }`
- `doctor_id` → `{ _id, full_name, speciality, registration_number }`
- `appointment_type_id` → `{ _id, name, code, is_active }`

Primary fields:
- `_id`
- `hospital_id`
- `patient_id`
- `doctor_id`
- `appointment_type_id`
- `scheduled_at`
- `duration_minutes`
- `visit_type`
- `status`
- `reason_for_visit`
- `notes`
- `booked_by`
- `checked_in_at`
- `checked_in_by`
- `cancelled_at`
- `cancelled_by`
- `cancellation_reason`
- `completed_at`
- `completed_by`
- `no_show_marked_at`
- `no_show_marked_by`
- `rescheduled_from`
- `rescheduled_by`
- `reschedule_reason`
- `is_active`
- `createdAt`
- `updatedAt`

##### Reschedule response
```json
{
  "success": true,
  "message": "Appointment rescheduled successfully.",
  "data": {
    "old_appointment": { ...populated appointment... },
    "new_appointment": { ...populated appointment... }
  }
}
```

#### RBAC
- list/detail: `admin`, `receptionist`, `doctor`
- create/check-in/status/reschedule/waitlist: `admin`, `receptionist`
- doctor is read-only for appointments in current runtime

#### Frozen frontend mapping rules
- frontend appointment booking must use `scheduled_at`, not split date/time placeholders
- frontend cannot assume calendar slot UX contract; it must first bind to list/create/detail/check-in/reschedule APIs
- frontend queue badges such as `Waiting`, `Done`, `Urgent`, `New` are UI labels only and must not be sent as API statuses
- frontend standard check-in route is `POST /appointments/:id/check-in`
- backend also exposes `PATCH /appointments/:id/check-in`, but frontend must not depend on both
- waitlist stays placeholder in UI until later receptionist appointment module work

### 3.3 Consultations

#### Standard frontend routes to use later
- `POST /api/v1/consultations`
- `GET /api/v1/consultations/:id`
- `PUT /api/v1/consultations/:id`
- `PATCH /api/v1/consultations/:id/status`
- `PATCH /api/v1/consultations/:id/finalise`
- `GET /api/v1/consultations/:id/workspace`
- `GET /api/v1/consultations/:id/follow-up`
- `GET /api/v1/consultations/follow-ups`
- `PATCH /api/v1/consultations/follow-ups/:id/status`

#### Request contracts

##### Create consultation
Body:
- `hospital_id?`
- `patient_id` required
- `doctor_id` required
- `appointment_id?`
- `chief_complaint?`
- `history_of_present_illness?`
- `vitals?` object
  - `height_cm?`
  - `weight_kg?`
  - `bmi?`
  - `blood_pressure?`
  - `pulse?`
  - `temperature_c?`
  - `spo2?`
  - `respiratory_rate?`
- `examination?` object
  - `general_examination?`
  - `systemic_examination?`
  - `abdominal_examination?`
  - `pelvic_examination?`
  - `notes?`
- `diagnosis?` object
  - `primary?`
  - `secondary?[]`
  - `notes?`
- `provisional_diagnosis?`
- `advice?`
- `notes?`
- `follow_up_required?`
- `follow_up_date?`

##### Update consultation
Same editable shape as create, but at least one field is required.

##### Update consultation status
Body:
- `status` required = `draft | in_progress | completed`

##### Finalise consultation
Body:
- `follow_up_required?`
- `follow_up_date?`
- `follow_up_reason?`
- `follow_up_notes?`
- `follow_up_priority?` = `low | normal | high | urgent`

##### Follow-up status update
Body:
- `status` required = `completed | cancelled | missed`
- `notes?`
- `cancellation_reason?`

#### Response contracts

##### Detail response
Consultation detail returns the consultation document populated with:
- `patient_id` → `{ _id, patient_code, full_name, phone, category, is_active }`
- `doctor_id` → `{ _id, full_name, speciality, registration_number }`
- `appointment_id` → `{ _id, scheduled_at, status, visit_type, appointment_type_id, is_active }`
- `created_by` / `updated_by` / `finalised_by` → `{ _id, full_name, role, email }`

And includes `follow_up_summary` appended by service:
```json
{
  "follow_up_summary": {
    "_id": "...",
    "due_date": "...",
    "status": "pending",
    "priority": "normal",
    "notes": null
  }
}
```

##### Workspace response
```json
{
  "success": true,
  "message": "Consultation workspace fetched successfully.",
  "data": {
    "consultation": {
      "_id": "...",
      "hospital_id": "...",
      "patient_id": "...",
      "doctor_id": "...",
      "appointment_id": "...",
      "started_at": "...",
      "ended_at": "...",
      "status": "draft",
      "created_at": "...",
      "updated_at": "...",
      "finalised_at": null,
      "finalised_by": null,
      "is_active": true
    },
    "patient_summary": {
      "_id": "...",
      "patient_code": "PAT000001",
      "full_name": "...",
      "phone": "...",
      "category": "uncategorized",
      "is_active": true
    },
    "doctor_summary": {
      "_id": "...",
      "full_name": "...",
      "speciality": "...",
      "registration_number": "..."
    },
    "appointment_summary": {
      "_id": "...",
      "scheduled_at": "...",
      "status": "scheduled",
      "visit_type": "new",
      "appointment_type_id": "...",
      "is_active": true
    },
    "editable_sections": {
      "chief_complaint": null,
      "history_of_present_illness": null,
      "vitals": { ... },
      "examination": { ... },
      "diagnosis": { ... },
      "provisional_diagnosis": null,
      "advice": null,
      "notes": null,
      "follow_up_required": false,
      "follow_up_date": null
    },
    "current_status": "draft",
    "follow_up_summary": null
  }
}
```

##### Follow-up list response
`data` array of populated follow-up items plus pagination meta.

#### Status rules
- consultation status enum = `draft | in_progress | completed | finalised`
- writable status route only accepts `draft | in_progress | completed`
- valid transitions:
  - `draft -> in_progress | completed`
  - `in_progress -> completed`
  - `completed ->` no writable transitions except finalise route
- frontend must use `PATCH /consultations/:id/finalise` to finalise
- frontend must not invent `/finalize`

#### RBAC
- all consultation and follow-up routes in current runtime are `admin`, `doctor`
- receptionist has no consultation write or read access in the current consultation module

#### Frozen frontend mapping rules
- current template `FirstConsult` cannot be used as the real create-consultation contract directly
- doctor category decision is not part of consultation create/update API; it must call `PATCH /patients/:id/category`
- current template `Consult` save action must later split into:
  1. create consultation
  2. update consultation
  3. update status to `in_progress` / `completed`
  4. finalise via `PATCH /:id/finalise`
- current template “follow-up date” is not enough by itself; finalise can create or update the linked `follow_ups` record
- `finalise` spelling is authoritative for frontend integration

## 4) Major frontend mismatches frozen in this batch

### Patients
- template uses `id`, backend uses `_id` and `patient_code`
- template uses `name`, backend uses `full_name`
- template stores `age`; backend stores `date_of_birth`
- template uses `cat: null | Pregnancy | Infertility | Gynac`; backend uses `category: uncategorized | pregnancy | ivf | gynac`
- template registration form asks `chiefComplaint`, `husband`, `refBy`; backend patient register does not accept those fields in the patient module
- template patient hub is table-only; backend also supports detail + hub + category history summary

### Appointments
- template has no real appointment module yet, only placeholders and dashboard-style schedule widgets
- template assumes queue-like labels rather than real appointment statuses
- template does not capture `doctor_id`, `appointment_type_id`, `scheduled_at`, `duration_minutes`, `visit_type`
- template has no detail/check-in/status/reschedule contract
- backend waitlist exists but should remain placeholder in UI for now

### Consultations
- template first consultation mixes category assignment, journey plan generation, and automation start into one local wizard
- backend consultation create does not create journey plans and does not assign patient category
- template follow-up consultation uses local notes/vitals only; backend requires ObjectId-linked consultation workflow
- template has no status machine for `draft -> in_progress -> completed -> finalised`
- template uses journey-plan next step; backend consultation module ends with finalise and optional follow-up creation

## 5) Frozen enum / label map

### Patient category
- `Pregnancy` ↔ `pregnancy`
- `IVF` / `Infertility` frontend labels ↔ `ivf`
- `Gynac` ↔ `gynac`
- `Uncategorized` ↔ `uncategorized`

### Appointment status
- backend: `scheduled`, `checked_in`, `completed`, `cancelled`, `no_show`, `rescheduled`
- frontend queue labels such as `Waiting`, `Done`, `Urgent`, `New` are presentation-only and must be derived or replaced later

### Appointment visit type
- backend: `new`, `follow_up`, `review`, `procedure`, `other`

### Consultation status
- backend: `draft`, `in_progress`, `completed`, `finalised`

### Follow-up status
- backend: `pending`, `completed`, `cancelled`, `missed`

### Follow-up priority
- backend: `low`, `normal`, `high`, `urgent`

## 6) Files to create later (implementation batches, not this batch)
- `src/modules/patients/patients.api.js`
- `src/modules/patients/patients.adapters.js`
- `src/modules/patients/patients.hooks.js`
- `src/modules/patients/patients.validation.js`
- `src/modules/appointments/appointments.api.js`
- `src/modules/appointments/appointments.adapters.js`
- `src/modules/appointments/appointments.hooks.js`
- `src/modules/appointments/appointments.validation.js`
- `src/modules/consultations/consultations.api.js`
- `src/modules/consultations/consultations.adapters.js`
- `src/modules/consultations/consultations.hooks.js`
- `src/modules/consultations/consultations.validation.js`
- `src/modules/shared/enums/clinical.enums.js`
- `src/modules/shared/enums/reception.enums.js`
- `src/modules/shared/formatters/patient.formatters.js`

## 7) Files to modify later (implementation batches, not this batch)
- `src/crm/JijauCRM.jsx`
- `src/crm/data.js`
- `src/crm/layout/Topbar.jsx`
- `src/crm/layout/Sidebar.jsx`
- `src/crm/pages/DocDash.jsx`
- `src/crm/pages/PatientHub.jsx`
- `src/crm/pages/RxQueue.jsx`
- `src/crm/pages/RxRegister.jsx`
- `src/crm/pages/FirstConsult.jsx`
- `src/crm/pages/Consult.jsx`
- `src/crm/pages/Placeholders.jsx`
- `src/App.jsx` (only when route-driven page split begins later)

## 8) Files intentionally untouched in Batch 1.2
- all Batch 1.1 auth/session files
- all pregnancy files
- all prescription files
- all test-order / document files
- all billing files
- all analytics / automation / IVF placeholder files

