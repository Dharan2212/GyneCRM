# Dev Bootstrap Note

Use this as the current concise local bootstrap note for the active `src` runtime.

## 1) Copy environment file

```bash
cp .env.example .env
```

Fill these manually before starting the runtime:
- MongoDB connection values
- JWT / auth secrets
- any mail, S3, geocoder, payment, or media placeholders your local setup actually uses

Local and non-production MongoDB should run with replica set enabled if later transaction-based flows are exercised.

## 2) Install dependencies

```bash
npm install
```

## 3) Seed local/dev bootstrap data

```bash
npm run seed:reference-data
npm run seed:auth-users
```

Or run both with:

```bash
npm run seed:bootstrap
```

## 4) Start runtime

```bash
npm run start:new
```

## 5) Optional automated tests

```bash
npm test
```

## Canonical sample users

All current local/dev sample users use the same password:

- Password: `Dev@12345`
- Admin: `dev.admin@gynecrm.com`
- Receptionist: `dev.reception@gynecrm.com`
- Doctor: `dev.doctor@gynecrm.com`

## Reference/master data seeded

- Appointment type: `CONSULT` / `Consultation`
- Service catalog: `OPD Consultation`
- Test catalog: `HB` / `Hemoglobin`
- Lab reference range: `Hemoglobin`
- Hospital protocol: `Default Pregnancy Protocol`

## Seed behavior notes

- Seeds are idempotent.
- Seeds reuse the existing hospital context when one is already present.
- If no hospital-linked doctor, patient, or user exists yet, a bootstrap hospital ObjectId context is generated and reused safely for the canonical dev users and the sample doctor record.
- No production secrets or production credentials are seeded.
