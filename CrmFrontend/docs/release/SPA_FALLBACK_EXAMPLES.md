# SPA Fallback Examples

The frontend requires SPA fallback so protected CRM routes refresh correctly.

## Netlify
Create `_redirects` with:

```text
/* /index.html 200
```

## Vercel
Create `vercel.json` with:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## Nginx
Example:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## Apache
Example `.htaccess`:

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
```

## Important note
If the frontend is deployed under a subpath instead of `/`, the current app shell is not configured for a non-root basename. Deploy at the domain root unless the router and asset base are updated intentionally.
