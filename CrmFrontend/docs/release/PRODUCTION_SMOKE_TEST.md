# Production Smoke Test

## Public / auth
- landing page loads
- Book Appointment CTA opens `/crm/login`
- invalid login shows clean error
- valid doctor login works
- valid receptionist login works
- valid admin login works

## Protected route refresh
- refresh on `/crm/doctor/dashboard`
- refresh on `/crm/receptionist/desk`
- refresh on `/crm/admin`
- refresh on one deep doctor workflow route
- refresh on one deep receptionist workflow route

## Doctor checks
- dashboard opens
- patient hub opens
- consultation flow opens
- pregnancy flow opens
- prescription flow opens
- test review page opens

## Receptionist checks
- dashboard opens
- register patient opens
- appointments opens
- upload report opens
- billing opens

## Session checks
- logout works
- change-password forces safe re-login
- stale session falls back to login cleanly

## Upload / document checks
- upload foundation request works
- create document metadata works
- upload/read behavior is shown honestly if still foundation-only

## Billing checks
- create invoice draft
- add item
- finalize
- record payment
- send
- PDF behavior is shown honestly if foundation-style

## Final checks
- no broken assets
- no route fallback 404s
- no wrong-role nav leakage
