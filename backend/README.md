# GyneCRM Backend

**Gynecology Hospital CRM & Automation System — Backend API**

## Tech Stack

- Node.js 20 + Express.js
- PostgreSQL 16 + Knex.js
- JWT Authentication (access + refresh tokens)
- Joi validation
- AWS S3 (pre-signed URL file storage)
- N8N automation webhooks
- Winston structured logging
- Jest + Supertest

## Quick Start

### Prerequisites

- Node.js >= 20
- PostgreSQL 16 running locally
- Database `gynecrm` created

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
copy .env.example .env
# Edit .env: set DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET

# 3. Run all database migrations (49 total)
npm run migrate

# 4. Seed bootstrap data (hospital + roles + admin user)
npm run seed

# 5. Start development server
npm run dev
```

Server starts at: **http://localhost:4000**

## Bootstrap Admin Credentials

Created by seed `03_admin_user.js`:

| Field    | Value                  |
|----------|------------------------|
| Email    | admin@gynecrm.local    |
| Password | Admin@GyneCRM1         |
| Role     | admin                  |

> ⚠️ Change these credentials before deploying to any non-local environment.

## API Endpoints

| Module          | Base Path                    |
|-----------------|------------------------------|
| Health          | GET /api/v1/health           |
| Auth            | /api/v1/auth                 |
| Users           | /api/v1/users                |
| Hospital        | /api/v1/hospital             |
| Doctors         | /api/v1/doctors              |
| Patients        | /api/v1/patients             |
| Appointments    | /api/v1/appointments         |
| Consultations   | /api/v1/consultations        |
| Prescriptions   | /api/v1/prescriptions        |
| Pregnancies     | /api/v1/pregnancies          |
| Test Orders     | /api/v1/test-orders          |
| Billing         | /api/v1/invoices             |
| Analytics       | /api/v1/analytics            |
| Deliveries      | /api/v1/deliveries           |
| Documents       | /api/v1/documents            |
| Notifications   | /api/v1/notifications        |
| Webhooks        | /api/v1/webhooks             |

## Test Health Endpoint

```bash
curl http://localhost:4000/api/v1/health
```

Expected response:
```json
{
  "success": true,
  "message": "Service is healthy",
  "data": { "status": "ok", "database": "ok" }
}
```

## Test Login

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gynecrm.local","password":"Admin@GyneCRM1"}'
```

## Available Scripts

| Script              | Description                        |
|---------------------|------------------------------------|
| `npm run dev`       | Start with nodemon (hot reload)    |
| `npm start`         | Start production server            |
| `npm run migrate`   | Run all pending migrations         |
| `npm run migrate:rollback` | Rollback last migration batch |
| `npm run seed`      | Run all seed files                 |
| `npm test`          | Run all Jest tests                 |
| `npm run lint`      | Run ESLint                         |

## Architecture

```
src/
├── app.js                 # Express app factory (middleware, routes)
├── server.js              # HTTP server bootstrap, graceful shutdown
├── config/
│   ├── env.js             # Centralised environment config
│   ├── jwt.js             # JWT sign/verify helpers
│   └── s3.js              # S3 client singleton
├── db/
│   ├── connection.js      # Knex instance + verifyConnection()
│   ├── knexfile.js        # Knex config (dev/test/production)
│   ├── migrations/        # 49 migration files (000–049)
│   └── seeds/             # 3 bootstrap seed files
├── middleware/
│   ├── auth.middleware.js         # JWT verification
│   ├── role-check.middleware.js   # RBAC enforcement
│   ├── hospital-scope.middleware.js # Multi-tenant scoping
│   ├── rate-limiter.middleware.js # Express rate limiting
│   └── error-handler.middleware.js # Global error handler
├── modules/               # Feature modules (controller/service/repository)
├── routes/
│   ├── index.js           # Central route registration
│   └── health.route.js    # Unauthenticated health probe
├── validators/            # Shared Joi validators
├── utils/
│   ├── errors.js          # AppError classes + createError()
│   ├── response-helper.js # Standardised response helpers
│   ├── logger.js          # Winston logger
│   ├── s3-helper.js       # S3 pre-signed URL utilities
│   └── pdfGenerator.*.js  # PDF generation (4 files)
├── jobs/                  # Background cron jobs
└── events/                # N8N event dispatch
```

## Fixes Applied (Engineering Report)

1. `createError()` factory added to `errors.js` and exported
2. JWT config aliases fixed in `auth.service.js` (`accessSecret`, `accessExpiresIn`)
3. JWT `verify()` now passes `issuer` and `audience` in `auth.middleware.js`
4. `is_deleted` column used correctly (was `deleted_at IS NULL`)
5. `user_agent` removed from `activity_logs` DB insert (column doesn't exist)
6. `analytics.routes.js` fixed: `authMiddleware` → `authenticate`, `'Admin'` → `'admin'`
7. `sendSuccess()` supports both positional and object call styles
8. CORS reads `env.CORS_ORIGIN_LIST` (was reading non-existent `CORS_ORIGINS`)
9. Delivery routes use relative paths (was double-prefixing `/deliveries/deliveries/`)
10. Migration 049 adds missing `role_id`, `failed_login_attempts`, `locked_until` columns

## Environment Notes

- **S3**: Leave `AWS_ACCESS_KEY_ID` empty for local dev. S3 operations fail gracefully.
- **N8N**: Leave `N8N_BASE_URL` empty for local dev. Events log as pending/failed.
- **CORS**: Use `ALLOWED_ORIGINS` (not `CORS_ORIGINS`) — comma-separated.
