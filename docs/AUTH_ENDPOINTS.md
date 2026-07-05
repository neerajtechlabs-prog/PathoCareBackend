# Auth Endpoints

## Overview

Phase 2 JWT auth is now wired for tenant-aware login and token refresh.

## Endpoints

### POST /auth/login
- Requires header: `X-Tenant-Slug`
- Body:
  ```json
  {
    "email": "admin@demo.pathcare.local",
    "password": "Password123!"
  }
  ```
- Returns access token, refresh token, and expiry.
- Stores the refresh token in an `HttpOnly` cookie named `refreshToken`.

### POST /auth/refresh
- Reads the refresh token from the `refreshToken` cookie.
- Returns a fresh access/refresh token pair.

### POST /auth/logout
- Clears the refresh token cookie.

## Example

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: demo" \
  -d '{"email":"admin@demo.pathcare.local","password":"Password123!"}'
```

## Notes
- JWT secrets are configured in `.env`.
- Tenant isolation is enforced by resolving the tenant datasource from the `X-Tenant-Slug` header.
