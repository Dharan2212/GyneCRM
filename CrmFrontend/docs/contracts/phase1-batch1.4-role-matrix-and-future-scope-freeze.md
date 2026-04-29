# Phase 1 — Batch 1.4
# Role Matrix and Future-Scope Freeze

Status: Contract freeze only

This document freezes the role matrix and scope boundaries for the frontend rebuild.
It does not implement new runtime flows.
It preserves Batch 1.1 auth/session and Batch 1.2 / 1.3 contract-freeze work.

---

## A. Current frontend files relevant to this batch

### Shell / route / navigation
- `src/App.jsx`
- `src/crm/JijauCRM.jsx`
- `src/crm/layout/Topbar.jsx`
- `src/crm/layout/Sidebar.jsx`
- `src/crm/data.js`

### Doctor-facing pages present in template
- `src/crm/pages/DocDash.jsx`
- `src/crm/pages/PatientHub.jsx`
- `src/crm/pages/FirstConsult.jsx`
- `src/crm/pages/Consult.jsx`
- `src/crm/pages/JourneyPlan.jsx`
- `src/crm/pages/TestReports.jsx`
- `src/crm/pages/Prescription.jsx`
- `src/crm/pages/CatTracker.jsx`
- `src/crm/pages/IVFTracker.jsx`
- `src/crm/pages/Analytics.jsx`
- `src/crm/pages/AutoHub.jsx`
- `src/crm/pages/Billing.jsx`

### Reception-facing pages present in template
- `src/crm/pages/RxQueue.jsx`
- `src/crm/pages/RxRegister.jsx`
- `src/crm/pages/RxUpload.jsx`
- `src/crm/pages/Placeholders.jsx`
- `src/crm/pages/Billing.jsx`

### Current UI role assumptions still embedded in template
- Doctor nav still includes: Journey Plan, IVF Tracker, Analytics, Automation Hub, Billing
- Reception nav still includes: Appointments, Billing, WhatsApp Reminders
- Template shell is still page-state-driven inside `JijauCRM.jsx`
- Batch 1.1 removed the fake role toggle from runtime access, but page availability inside the shell still reflects template assumptions rather than frozen implementation scope

---

## B. Current backend files and endpoints relevant to this batch

### Role and auth control
- `src/constants/roles.js`
- `src/middleware/auth.js`
- `src/middleware/require-role.js`
- `src/routes/index.js`

### Active route groups used to freeze role visibility
- `src/modules/dashboard/doctor.dashboard.routes.js`
- `src/modules/dashboard/reception.dashboard.routes.js`
- `src/modules/doctors/doctors.routes.js`
- `src/modules/patients/patients.routes.js`
- `src/modules/appointments/appointments.routes.js`
- `src/modules/consultations/consultations.routes.js`
- `src/modules/pregnancies/pregnancies.routes.js`
- `src/modules/prescriptions/prescriptions.routes.js`
- `src/modules/test-orders/test-orders.routes.js`
- `src/modules/documents/documents.routes.js`
- `src/modules/billing/billing.routes.js`
- `src/modules/send-history/send-history.routes.js`
- `src/modules/notifications/notifications.routes.js`
- `src/modules/events/events.routes.js`
- `src/modules/jobs/jobs.routes.js`
- `src/modules/masters/masters.routes.js`

### Mounted route groups actually present in runtime
- `/api/v1/auth`
- `/api/v1/doctors`
- `/api/v1/masters`
- `/api/v1/patients`
- `/api/v1/appointments`
- `/api/v1/dashboard/doctor`
- `/api/v1/dashboard/receptionist`
- `/api/v1/consultations`
- `/api/v1/pregnancies`
- `/api/v1/prescriptions`
- `/api/v1/test-orders`
- `/api/v1/documents`
- `/api/v1/billing`
- `/api/v1/send-history`
- `/api/v1/notifications`
- `/api/v1/events`
- `/api/v1/jobs`

### Placeholder or future-scope backend structures present but not route-exposed for primary UI
- `src/models/JourneyPlan.js`
- `src/models/IvfCycle.js`
- `src/models/HospitalProtocol.js`

---

## C. Final frozen role matrix

Legend for final frontend action:
- **Integrate now** = active module in early implementation
- **Read-only later** = active backend exists, but current frontend should not expose write ownership for that role
- **Hide** = do not show to that role in rebuilt navigation
- **Placeholder** = keep non-operational placeholder or low-commitment stub only
- **Defer** = not part of early implementation; move to later phase
- **Admin-only** = visible only under admin area
- **Remove from primary nav** = page may exist later, but not in early doctor/reception primary nav

### Module matrix

| Module / screen | Frontend page exists | Backend route group exists | Backend RBAC actual | Approved business scope | Final frontend action | Reason |
|---|---|---|---|---|---|---|
| Doctor dashboard | Yes (`DocDash`) | Yes | `admin`, `doctor` | Doctor full | Integrate now | Core doctor home screen is active and backed |
| Reception dashboard / desk | Yes (`RxQueue`) | Yes | `admin`, `receptionist` | Reception full | Integrate now | Core receptionist home screen is active and backed |
| Patient hub | Yes (`PatientHub`) | Yes | list/detail/hub shared to `admin`, `doctor`, `receptionist`; category-only to `admin`, `doctor` | Shared visibility, doctor category ownership | Integrate now | Core shared record access; action-level RBAC must differ by role |
| Register patient | Yes (`RxRegister`) | Yes | `admin`, `receptionist` write | Reception full | Integrate now | Primary receptionist workflow |
| Appointments | Partial placeholder (`RxAppointments`, calendar placeholder) | Yes | list/detail shared; create/check-in/status/reschedule/waitlist = `admin`, `receptionist` | Reception full, doctor read visibility | Integrate now for receptionist; read-only summary for doctor | Backend active; polished slot UX still placeholder |
| First consultation | Yes (`FirstConsult`) | Yes | `admin`, `doctor` | Doctor full | Integrate now | Core doctor workflow |
| Follow-up consultation | Yes (`Consult`) | Yes | `admin`, `doctor` | Doctor full | Integrate now | Core doctor workflow |
| Pregnancies | Partial through `Consult`, `CatTracker`, `JourneyPlan` visuals | Yes | `admin`, `doctor` | Doctor full | Integrate now | Active backend module and core doctor scope |
| Journey Plan | Yes (`JourneyPlan`) | No dedicated route group | No dedicated runtime route | Approved in scope but dedicated collection/routes are future | Keep controlled placeholder; remove from primary nav for early build | Use pregnancy milestones and hub data first; dedicated journey module is not ready |
| Test reports / test orders review | Yes (`TestReports`) | Yes | create/review/send = `admin`, `doctor`; list/detail shared incl. receptionist; pending-upload shared | Doctor full review/send, reception upload only | Integrate now for doctor review; receptionist read/upload handoff only | Active workflow but role-owned stages differ |
| Upload reports | Yes (`RxUpload`) | Yes | document upload/create/url = `admin`, `doctor`, `receptionist`; doctor review routes separate | Reception full upload, doctor review/send | Integrate now for receptionist upload | Active operational reception workflow |
| Prescriptions | Yes (`Prescription`) | Yes | `admin`, `doctor` | Doctor full | Integrate now | Active doctor workflow |
| Category tracker | Yes (`CatTracker`) | Partial foundation via patient category counts / pregnancy summaries | `admin`, `doctor` for category counts/history | Doctor full | Integrate now in reduced form | Supported through patient category and pregnancy/test summaries, not as separate backend module |
| IVF tracker | Yes (`IVFTracker`) | No dedicated route group | No dedicated runtime route | Full in design scope, placeholder in backend reality | Keep placeholder; remove from primary nav for early build | Dedicated IVF cycle routes do not exist yet |
| Analytics | Yes (`Analytics`) | No dedicated doctor analytics route group | Separate analytics noted as admin-scoped in planning/code direction | Doctor-facing analytics approved in scope but not current frontend blocker | Defer; remove from primary nav for early build | Use dashboard KPIs only first |
| Automation Hub | Yes (`AutoHub`) | No dedicated doctor control route | Notifications/events/jobs exist, but doctor automation control screen not isolated | Design scope only | Defer; remove from primary nav for early build | Backend foundation exists, not a role-safe doctor product screen yet |
| Billing (doctor view) | Yes (`Billing`) | Yes (`/billing/invoices`) | `admin`, `receptionist` only | Doctor visibility approved in business scope, not in runtime RBAC | Hide from doctor in early build | Prevent role contradiction until backend or approved read-only endpoint exists |
| Billing (reception/admin) | Yes (`Billing`) | Yes (`/billing/invoices`) | `admin`, `receptionist` | Reception full | Integrate now for receptionist/admin | Active operational module |
| WhatsApp reminders | Placeholder (`RxMessages`) | No dedicated receptionist reminder route | Notifications create exists broadly; notifications list/detail/cancel = admin-only | Placeholder in client scope | Keep placeholder for reception; not active integration scope | Messaging foundation exists, but no isolated reminder UI contract |
| Send history / communication timeline | No dedicated page | Yes | `admin`, `doctor`, `receptionist` | Shared operational visibility | Integrate later as shared patient subview, not top-level nav | Active backend support but should appear inside patient profile/hub, not as separate early nav |
| Notifications | No dedicated admin page in template | Yes | create = shared roles; list/detail/cancel = `admin` | Admin operational scope | Admin-only, later phase | Template is doctor/reception-centric; add under admin workspace later |
| Events | No | Yes | `admin` only | Admin operational scope | Admin-only, later phase | Operational tool, not doctor/reception primary module |
| Jobs | No | Yes | `admin` only | Admin operational scope | Admin-only, later phase | Operational tool, not doctor/reception primary module |
| Masters | No doctor/reception page | Yes | list authenticated; mutate `admin` only | Admin support scope | Admin-only, later phase | Needed for admin configuration, not early template nav |
| Doctors list/detail | No dedicated template screen | Yes | shared to `admin`, `doctor`, `receptionist` | Shared dependency | Hidden from primary nav; consume as lookup/dependency | Needed by appointments and context, not as standalone early screen |

---

## D. Final future-scope / placeholder freeze

| Module / area | Why it is placeholder / future-scope | Visible now? | Frozen action | Later phase owner |
|---|---|---|---|---|
| Journey Plan dedicated module | Dedicated `journey_plans` collection exists only as scaffold; routes are not exposed; current real journey logic lives inside pregnancy milestones and protocol foundations | Do not keep in early primary nav | Controlled placeholder only or hidden from early primary nav | Phase 4+ doctor workflow enhancement |
| IVF Tracker dedicated module | `ivf_cycles` model exists but no dedicated active routes; current category and stage ideas are design-time only | Do not keep in early primary nav | Controlled placeholder only or hidden from early primary nav | Phase 4+ fertility / IVF scope |
| Reception appointment booking polish | Backend appointments and waitlist are active, but polished calendar-slot UX is explicitly still evolving | Yes | Integrate core create/list/check-in/reschedule; keep advanced slot polish as later enhancement | Phase 5 receptionist workflow polish |
| Reception WhatsApp reminders | Messaging foundations exist, but no dedicated receptionist reminder screen contract is isolated | Keep lightweight placeholder only | Do not wire as active reminder console yet | Later operations / messaging phase |
| Analytics | Dashboard KPIs exist, but dedicated analytics views are not current backend-safe doctor UI | Hide from early primary nav | Defer | Later doctor/admin insights phase |
| Automation Hub | Notifications/events/jobs foundations exist, but not as a dedicated doctor control panel | Hide from early primary nav | Defer | Later admin/ops phase; possible doctor subview later |
| Admin operational tools | Backend has real notifications/events/jobs/masters operational routes, but template has no admin workspace | Not in current primary template | Add as admin-only later | Admin operations phase |
| Doctor billing view | Business scope says shared finance visibility, but runtime RBAC does not allow doctor invoice access | No in early doctor nav | Hide until runtime RBAC and screen contract align | Later only if backend/read-only scope is approved |
| Reception document review / send controls | Reception owns upload, not review/send | No | Keep hidden from receptionist | Never unless business scope changes |

---

## E. Contradictions to resolve before implementation

1. **Doctor billing contradiction**
   - Template: doctor nav includes Billing
   - Approved business scope: doctor financial visibility is approved in principle
   - Runtime code: billing routes are `admin` / `receptionist` only
   - Freeze: hide billing from doctor in early implementation

2. **Reception upload vs doctor review/send contradiction**
   - Template: receptionist upload page exists, doctor test report page also exists
   - Business scope: reception uploads, doctor reviews and sends
   - Runtime code: aligns overall, but `test-orders/:id/link-result` is currently doctor/admin only, not receptionist
   - Freeze: receptionist upload remains active, but any review/send action stays doctor-only; upload workflow must respect backend handoff boundaries

3. **Analytics visibility contradiction**
   - Template: Analytics is in doctor nav
   - Planning docs: analytics is full in design scope
   - Backend/runtime reality: no dedicated doctor analytics route group ready for direct product UI; dashboard KPIs are the safe current surface
   - Freeze: remove Analytics from early primary nav and defer

4. **Automation Hub contradiction**
   - Template: Automation Hub is in doctor nav
   - Planning docs: automation foundations exist
   - Runtime reality: notifications/events/jobs are operational/admin foundations, not a finalized doctor self-serve control hub
   - Freeze: defer and remove from early primary nav

5. **Journey Plan contradiction**
   - Template: Journey Plan is a full doctor page and automatic outcome of first consultation
   - Planning docs: full in scope, but dedicated collection/routes are future
   - Runtime reality: pregnancy milestones and protocols exist, dedicated journey routes do not
   - Freeze: keep as controlled later-phase module; do not make it a required early doctor screen

6. **IVF Tracker contradiction**
   - Template: IVF Tracker is a full doctor screen
   - Planning docs: design scope only; dedicated IVF routes are future
   - Runtime reality: no dedicated active IVF route group
   - Freeze: keep placeholder or hide from early primary nav

7. **Admin scope contradiction**
   - Template: current product shell is doctor/reception-centric
   - Runtime reality: admin has real routes for notifications, events, jobs, masters, doctor management, and dashboard access to both dashboard families
   - Freeze: admin needs a dedicated operational workspace later; not a doctor/reception mirror

8. **Notifications visibility contradiction**
   - Runtime code allows notification creation for doctor and receptionist, but listing/detail/cancel is admin-only
   - Freeze: no general notifications list screen for doctor/reception in early implementation

9. **Appointments placeholder contradiction**
   - Template: appointment booking is placeholder
   - Runtime reality: appointments are active and should be implemented for receptionist workflow
   - Freeze: receptionist appointments move into early implementation, but advanced slot/calendar polish stays later

10. **Send history placement contradiction**
   - Runtime route exists and is shared across roles
   - Template has no dedicated communication timeline page
   - Freeze: implement as patient-profile / patient-hub subview later, not as top-level role nav

---

## F. Exact modules/pages to actively integrate in early implementation

### Doctor early implementation scope
- Dashboard (`DocDash`)
- Patient Hub (`PatientHub`)
- First Consultation (`FirstConsult`)
- Follow-up Consultation (`Consult`)
- Pregnancy flows via consultation / patient hub / reduced tracker support
- Test Reports doctor review flow (`TestReports`)
- Prescription (`Prescription`)
- Category Tracker (`CatTracker`) in reduced backend-aligned form
- Send history / communication timeline as embedded patient subview later in early integration sequence

### Receptionist early implementation scope
- Reception Desk (`RxQueue`)
- Register Patient (`RxRegister`)
- Appointments (replace placeholder with real appointment workflow)
- Upload Test Report (`RxUpload`)
- Billing (`Billing`)
- Patient hub read / operational access aligned to role
- Send history / communication timeline as embedded patient subview later in early integration sequence

### Admin early implementation scope
- Admin home placeholder already exists from Batch 1.1
- Admin operational area later should include notifications, events, jobs, masters, doctor management views

---

## G. Exact modules/pages to keep placeholder

- `JourneyPlan.jsx` as controlled later-phase placeholder or reduced informational view only
- `IVFTracker.jsx` as controlled later-phase placeholder only
- `Placeholders.jsx -> RxMessages` as lightweight placeholder only
- advanced appointment calendar-slot polish as placeholder behavior until later phase

---

## H. Exact modules/pages to defer or hide

### Remove from early doctor primary nav
- `Analytics.jsx`
- `AutoHub.jsx`
- `Billing.jsx`
- `JourneyPlan.jsx` as primary nav destination
- `IVFTracker.jsx` as primary nav destination

### Hide from receptionist
- `FirstConsult.jsx`
- `Consult.jsx`
- `Prescription.jsx`
- `CatTracker.jsx`
- `IVFTracker.jsx`
- doctor review/send actions in `TestReports.jsx`
- Journey Plan
- Analytics
- Automation Hub

### Admin-only later
- Notifications operational screens
- Events operational screens
- Jobs operational screens
- Masters management screens
- Doctor management screens

---

## I. Exact files to create later

### Role / navigation / policy scaffolding
- `src/modules/rbac/roleMatrix.js`
- `src/modules/rbac/moduleVisibility.js`
- `src/modules/rbac/navPolicy.js`
- `src/modules/rbac/actionPolicy.js`
- `src/modules/admin/AdminLayout.jsx`
- `src/modules/admin/AdminNav.jsx`
- `src/pages/admin/NotificationsPage.jsx`
- `src/pages/admin/EventsPage.jsx`
- `src/pages/admin/JobsPage.jsx`
- `src/pages/admin/MastersPage.jsx`
- `src/pages/admin/DoctorsPage.jsx`
- `src/pages/shared/SendHistoryPanel.jsx`

### Optional controlled placeholders
- `src/pages/placeholders/JourneyPlanPlaceholder.jsx`
- `src/pages/placeholders/IVFTrackerPlaceholder.jsx`
- `src/pages/placeholders/AnalyticsDeferredPage.jsx`
- `src/pages/placeholders/AutomationDeferredPage.jsx`

---

## J. Exact files to modify later

- `src/App.jsx`
- `src/crm/JijauCRM.jsx`
- `src/crm/layout/Sidebar.jsx`
- `src/crm/layout/Topbar.jsx`
- `src/crm/data.js`
- `src/crm/pages/DocDash.jsx`
- `src/crm/pages/PatientHub.jsx`
- `src/crm/pages/FirstConsult.jsx`
- `src/crm/pages/Consult.jsx`
- `src/crm/pages/JourneyPlan.jsx`
- `src/crm/pages/TestReports.jsx`
- `src/crm/pages/Prescription.jsx`
- `src/crm/pages/CatTracker.jsx`
- `src/crm/pages/IVFTracker.jsx`
- `src/crm/pages/Analytics.jsx`
- `src/crm/pages/AutoHub.jsx`
- `src/crm/pages/Billing.jsx`
- `src/crm/pages/RxQueue.jsx`
- `src/crm/pages/RxRegister.jsx`
- `src/crm/pages/RxUpload.jsx`
- `src/crm/pages/Placeholders.jsx`
- `src/pages/admin/AdminHomePage.jsx`

---

## K. Exact files intentionally untouched in this batch

- All Batch 1.1 auth/session runtime files
- All Batch 1.2 contract-freeze files
- All Batch 1.3 contract-freeze files
- Runtime API / service-layer implementation files not yet started in frontend
- Website files
- Backend runtime files

---

## L. Final frozen navigation decision for early implementation

### Doctor primary navigation — early implementation
- Dashboard
- Patient Hub
- First Consultation
- Follow-up Consultation
- Test Reports
- Prescription
- Category Tracker

### Doctor not in early primary navigation
- Journey Plan
- IVF Tracker
- Analytics
- Automation Hub
- Billing

### Receptionist primary navigation — early implementation
- Reception Desk
- Register Patient
- Appointments
- Upload Test Report
- Billing

### Receptionist not in early primary navigation
- WhatsApp Reminders remains placeholder only
- Any clinical authoring screen remains hidden

### Admin primary navigation — later dedicated workspace
- Notifications
- Events
- Jobs
- Masters
- Doctors

---

## M. Batch 1.4 result

Role/scope freeze is complete when implementation proceeds using these rules:
- doctor screens only for doctor-owned clinical and doctor-shared read flows
- receptionist screens only for front-desk owned operational flows
- admin gets a separate operations workspace later
- placeholder modules are not treated as active integration scope
- business-scope vs runtime contradictions are resolved in favor of current backend RBAC for early implementation
