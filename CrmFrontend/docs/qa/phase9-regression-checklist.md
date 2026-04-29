# GyneCRM Frontend Phase 9 Regression Checklist

## Scope
This checklist covers only the active production flows that are live in the frontend through Phase 8.
Deferred screens such as Journey Plan, IVF Tracker, Analytics, Automation Hub, and Reception Reminders are **not** part of the active regression pass beyond confirming they stay controlled placeholders.

## Public / Unauthenticated
- Website `/` renders correctly.
- Landing page appointment CTA opens `/crm/login`.
- Guest users cannot access `/crm/doctor/*`, `/crm/receptionist/*`, or `/crm/admin`.
- Guest route sends authenticated users away from `/crm/login` to their safe role home.

## Auth / Session
- Valid doctor login succeeds.
- Valid receptionist login succeeds.
- Valid admin login succeeds.
- Invalid credentials show a clean error.
- Browser refresh restores session when refresh-cookie remains valid.
- Expired/stale session falls back to `/crm/login`.
- Logout clears identity and protected access.
- Change password forces safe re-login.
- Wrong-role deep-link after login resolves to the authenticated role home.

## Doctor Flow
- Doctor dashboard loads live data.
- Patient hub list/detail/hub load live data.
- Consultation create/update/finalise works.
- Category update writes through patient category endpoint.
- Pregnancy create/update/high-risk/milestones work.
- Prescription create/issue/void/send works.
- Prescription PDF action stays foundation-honest.
- Test review flow stays role-correct:
  - link result
  - review result
  - send result
- Patient-context communication history is visible where used.

## Receptionist Flow
- Reception dashboard loads live data.
- Register patient uses real backend create flow.
- Doctor lookup and appointment desk flow works:
  - create appointment
  - list/detail
  - check-in
  - status update
  - reschedule
- Upload/report flow stays honest:
  - upload foundation request
  - metadata create
  - no fake doctor review/send in receptionist UI
- Billing flow works:
  - create draft
  - list/detail
  - add item
  - finalize
  - record payment
  - send
  - PDF foundation action stays honest

## Admin Visibility
- Admin login succeeds.
- `/crm/admin` renders the minimal admin shell.
- Admin does not inherit doctor-only or receptionist-only primary nav assumptions.

## Role-leak Prevention
- Receptionist cannot access doctor write flows.
- Doctor does not get receptionist billing write actions.
- Deferred modules do not appear in active primary nav.
- Topbar label and sidebar/nav stay aligned to the authenticated role after login, refresh, and logout.

## Upload / Document / Billing High-Risk Checks
- Upload foundation behavior is clearly represented as foundation-only.
- Document read access behavior is represented honestly if foundation-only.
- Linked document and test order remain separate entities in UI.
- Invoice status labels remain backend-aligned.
- Payment status labels remain backend-aligned.
- Send history remains patient-context aligned.

## Error / Empty / Loading
- Active pages show proper loading states.
- Active pages show retryable error states on network failure.
- Empty datasets show intentional empty states, not blank panels.
- 401/403 handling routes back safely through auth/session flow.

## Known intentional limitations
- Journey Plan is controlled placeholder.
- IVF Tracker is controlled placeholder.
- Analytics is deferred.
- Automation Hub is deferred.
- Reception Reminders is deferred.
- Upload/read/PDF flows may still be foundation-only depending on backend environment behavior.
