# GyneCRM Frontend Release Handoff

## Scope
This handoff covers the deployable frontend only. It assumes the backend continues to expose the current `/api/v1` contract and the refresh session remains cookie-based.

## Required frontend environment values

| Variable | Required | Purpose |
|---|---|---|
| `VITE_APP_ENV` | recommended | environment label only |
| `VITE_API_BASE_URL` | required for cross-origin deploys | full backend API origin + `/api/v1` |
| `VITE_API_TIMEOUT_MS` | optional | request timeout |
| `VITE_API_CREDENTIALS_MODE` | yes | keep `include` for refresh-cookie auth |
| `VITE_DEV_HOST` | local only | local dev server host |
| `VITE_DEV_PORT` | local only | local dev server port |
| `VITE_PREVIEW_HOST` | optional | preview host |
| `VITE_PREVIEW_PORT` | optional | preview port |
| `VITE_BUILD_SOURCEMAP` | optional | build sourcemap toggle |

## API base URL strategy

### Same-origin deployment
If the frontend and backend are served from the same origin, the frontend can safely omit `VITE_API_BASE_URL` in production. The app will default to:

`window.location.origin + /api/v1`

### Cross-origin deployment
If the frontend and backend are on different origins, `VITE_API_BASE_URL` must be set explicitly, for example:

`https://api.example.com/api/v1`

## Cookie / refresh session requirements
The frontend always sends requests with `credentials: 'include'` while auth refresh is cookie-based.

For production to work, the backend must be configured to:

1. allow the deployed frontend origin in CORS
2. return `Access-Control-Allow-Credentials: true`
3. set refresh cookie attributes that match the deployment topology
4. keep the refresh cookie path compatible with `/api/v1/auth/refresh`

### Current backend risk
The current backend CORS allowlist is hardcoded to localhost-style origins. A deployed frontend origin will fail until the backend allowlist is updated.

### Current backend cookie settings used by the frontend
- cookie name: `gynecrm_refresh_token` unless overridden
- `COOKIE_SECURE` must be `true` on HTTPS production deployments
- `COOKIE_SAME_SITE` must match deployment topology
- `COOKIE_DOMAIN` must be set correctly if required by the deployment domain structure

### Failure mode if cookie/CORS are wrong
- login may appear to succeed initially because the access token is returned
- browser refresh or session restore will fail
- protected routes will fall back to login because refresh cannot complete

## SPA routing and refresh safety
This app is a single-page application using protected routes under:
- `/crm/login`
- `/crm/doctor/*`
- `/crm/receptionist/*`
- `/crm/admin`

Your hosting provider must route all non-file requests to `index.html`.

See `SPA_FALLBACK_EXAMPLES.md` for examples.

## Upload / read URL behavior
Upload and document access are currently foundation-style behaviors.

What the frontend expects today:
- upload URL endpoint can return a foundation payload instead of a complete hosted upload flow
- read URL endpoint can return a foundation/access payload instead of a final hosted file URL
- the UI treats these honestly and does not assume a seamless CDN/file-hosting product

Host handoff caveats:
- backend/object storage integration must be fully configured before promising seamless upload/read behavior
- upload size/MIME rules are enforced by backend constraints returned to the UI
- cross-origin storage/signing behavior must be verified separately from standard API auth

## Build and release commands

Install:

```bash
npm ci
```

Build:

```bash
npm run build
```

Preview locally:

```bash
npm run preview
```

Optional config verification:

```bash
node scripts/release/check-release-config.mjs
```

## Route refresh checklist
Verify refresh works on:
- `/crm/login`
- `/crm/doctor/dashboard`
- `/crm/receptionist/desk`
- `/crm/admin`
- any deep linked active production page

## Known intentional limitations
- upload/read URL behavior may still be foundation-only depending on backend/storage setup
- billing/document PDF behaviors may return foundation payloads rather than binary download product behavior
- deferred modules remain deferred and are not part of release scope
