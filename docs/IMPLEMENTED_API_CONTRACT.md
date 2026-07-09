# Implemented API Contract (Quick Reference)

This document lists the backend API endpoints implemented so far (as of Week 11), with example curl requests to help new developers get started quickly.

Common notes
- Base URL (local): `http://localhost:3001`
- All tenant-scoped endpoints require header: `x-tenant-slug: <tenant-slug>` (e.g. `demo`).
- Auth: many endpoints require a Bearer access token. Obtain tokens using `/api/auth/login`.
- Content type: use `Content-Type: application/json` for JSON bodies.

Replace placeholders (`<...>`) in examples before running.

-------------------------------------------------

1) Auth

- POST /api/auth/login — Login (returns `accessToken` and sets `refreshToken` cookie)

curl:
```
curl -X POST 'http://localhost:3001/api/auth/login' \
  -H 'Content-Type: application/json' \
  -H 'x-tenant-slug: demo' \
  -d '{"email":"user@example.com","password":"secret"}'
```

- POST /api/auth/refresh — Refresh access token (uses `refreshToken` cookie)

curl:
```
curl -X POST 'http://localhost:3001/api/auth/refresh' \
  -H 'x-tenant-slug: demo' \
  --cookie "refreshToken=<REFRESH_TOKEN_COOKIE>"
```

- POST /api/auth/logout — Logout (requires Bearer token)

curl:
```
curl -X POST 'http://localhost:3001/api/auth/logout' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'x-tenant-slug: demo'
```

- GET /api/auth/me — Get profile (requires Bearer token)

curl:
```
curl 'http://localhost:3001/api/auth/me' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'x-tenant-slug: demo'
```

-------------------------------------------------

2) Health

- GET /health/db — DB health
- GET /health/queues — Queue stats
- GET /health/redis — Redis health

curl example:
```
curl 'http://localhost:3001/health/db'
curl 'http://localhost:3001/health/queues'
curl 'http://localhost:3001/health/redis'
```

-------------------------------------------------

3) Tests (Test catalog + parameters)

- GET /api/tests?q=<query> — List tests (auth required)
- GET /api/tests/:id — Get a test
- POST /api/tests — Create test (LAB_ADMIN / SUPER_ADMIN)
- PUT /api/tests/:id — Update test (LAB_ADMIN / SUPER_ADMIN)
- DELETE /api/tests/:id — Delete test (SUPER_ADMIN)

- GET /api/tests/:id/parameters — List parameters for a test
- POST /api/tests/:id/parameters — Create parameter (LAB_ADMIN / SUPER_ADMIN)
- PUT /api/tests/parameters/:parameterId — Update parameter (LAB_ADMIN / SUPER_ADMIN)
- DELETE /api/tests/parameters/:parameterId — Delete parameter (SUPER_ADMIN)

Create test example:
```
curl -X POST 'http://localhost:3001/api/tests' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'x-tenant-slug: demo' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Hemogram","code":"HEM01","department":"Hematology","specimenType":"Blood"}'
```

Create parameter example:
```
curl -X POST 'http://localhost:3001/api/tests/<TEST_ID>/parameters' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'x-tenant-slug: demo' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Hemoglobin","unit":"g/dL","referenceRange":"12-16","normalMin":12,"normalMax":16,"criticalMin":6,"criticalMax":25}'
```

-------------------------------------------------

4) Bookings

- GET /api/bookings — List bookings (filters: q, status, fromDate, toDate, page, perPage)
- GET /api/bookings/:id — Get booking
- POST /api/bookings — Create booking (RECEPTIONIST, LAB_ADMIN, SUPER_ADMIN)
- PUT /api/bookings/:id/cancel — Cancel booking (LAB_ADMIN, SUPER_ADMIN)
- POST /api/bookings/:id/receipts — Create receipt (RECEPTIONIST, LAB_ADMIN, SUPER_ADMIN)
- POST /api/bookings/:id/payment/validate — Validate payment (RECEPTIONIST, LAB_ADMIN, SUPER_ADMIN)

Create booking example:
```
curl -X POST 'http://localhost:3001/api/bookings' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'x-tenant-slug: demo' \
  -H 'Content-Type: application/json' \
  -d '{"patientId":"<PATIENT_ID>","tests":[{"testId":"<TEST_ID>"}],"preferredDate":"2026-07-10"}'
```

Create receipt example:
```
curl -X POST 'http://localhost:3001/api/bookings/<BOOKING_ID>/receipts' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'x-tenant-slug: demo' \
  -H 'Content-Type: application/json' \
  -d '{"amount": 500.00, "method":"CASH"}'
```

-------------------------------------------------

5) Patients

- GET /api/patients?q=<query> — List patients
- GET /api/patients/:id — Get patient
- GET /api/patients/:id/history — Get patient history
- POST /api/patients — Create patient (RECEPTIONIST, LAB_ADMIN, SUPER_ADMIN)
- PUT /api/patients/:id — Update patient (RECEPTIONIST, LAB_ADMIN, SUPER_ADMIN)
- DELETE /api/patients/:id — Delete (SUPER_ADMIN)

Create patient example:
```
curl -X POST 'http://localhost:3001/api/patients' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'x-tenant-slug: demo' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Jane Doe","email":"jane@example.com","phone":"+911234567890","dateOfBirth":"1990-01-01"}'
```

-------------------------------------------------

6) Doctors

- GET /api/doctors — List doctors
- GET /api/doctors/:id — Get doctor
- POST /api/doctors — Create doctor (LAB_ADMIN, SUPER_ADMIN)
- PUT /api/doctors/:id — Update doctor (LAB_ADMIN, SUPER_ADMIN)
- DELETE /api/doctors/:id — Delete (SUPER_ADMIN)

Create doctor example:
```
curl -X POST 'http://localhost:3001/api/doctors' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'x-tenant-slug: demo' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Dr. Kumar","email":"kumar@example.com","phone":"+911098765432"}'
```

-------------------------------------------------

7) Lab profile / Departments / Sample Types

- Labs: GET /api/labs, GET /api/labs/:id, POST /api/labs, PUT /api/labs/:id, DELETE /api/labs/:id
- Departments: GET /api/departments, POST /api/departments, PUT /api/departments/:id, DELETE /api/departments/:id
- Sample types: GET /api/sample-types, POST /api/sample-types, PUT /api/sample-types/:id, DELETE /api/sample-types/:id

Create lab example:
```
curl -X POST 'http://localhost:3001/api/labs' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'x-tenant-slug: demo' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Downtown Lab","email":"lab@example.com","phone":"+911112223334"}'
```

-------------------------------------------------

8) Results

- POST /api/results — Create test result (LAB_TECHNICIAN, LAB_ADMIN)
  - Body: `{ bookingId, testId, parameters: [{ parameterId, value }, ...] }`
- PUT /api/results/:id/verify — Verify a result (LAB_ADMIN)

Create result example:
```
curl -X POST 'http://localhost:3001/api/results' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'x-tenant-slug: demo' \
  -H 'Content-Type: application/json' \
  -d '{"bookingId":"<BOOKING_ID>","testId":"<TEST_ID>","parameters":[{"parameterId":"<PARAM_ID>","value":"12.5"}] }'
```

Verify result example:
```
curl -X PUT 'http://localhost:3001/api/results/<RESULT_ID>/verify' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'x-tenant-slug: demo'
```

-------------------------------------------------

9) Dashboard

- GET /api/dashboard/workload — Workload KPIs (auth required)

curl:
```
curl 'http://localhost:3001/api/dashboard/workload' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'x-tenant-slug: demo'
```

-------------------------------------------------

10) Reports

- POST /api/reports — Request a report generation job (LAB_TECHNICIAN, LAB_ADMIN, SUPER_ADMIN)
- GET /api/reports/:id — Get report status by ID (auth required)
- GET /api/reports/public/:token — Get public report status (no auth required)

Create report example:
```
curl -X POST 'http://localhost:3001/api/reports' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'x-tenant-slug: demo' \
  -H 'Content-Type: application/json' \
  -d '{"bookingId":"<BOOKING_ID>","reportType":"RESULTS","patientEmail":"patient@example.com","patientPhone":"+911234567890"}'
```

Get report status example:
```
curl 'http://localhost:3001/api/reports/<REPORT_ID>' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'x-tenant-slug: demo'
```

Public report status example:
```
curl 'http://localhost:3001/api/reports/public/<PUBLIC_TOKEN>' \
  -H 'x-tenant-slug: demo'
```

-------------------------------------------------

11) Notifications

- POST /api/notifications — Queue a notification for delivery (RECEPTIONIST, LAB_TECHNICIAN, LAB_ADMIN, SUPER_ADMIN)
- GET /api/notifications — List notification logs for the current tenant (auth required)
- GET /api/notifications/:id — Get one notification log (auth required)

Send email example:
```
curl -X POST 'http://localhost:3001/api/notifications' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'x-tenant-slug: demo' \
  -H 'Content-Type: application/json' \
  -d '{"channel":"email","recipient":"patient@example.com","subject":"PathCare update","message":"Your report is ready","template":"report_ready","referenceId":"<BOOKING_ID>"}'
```

Send SMS example:
```
curl -X POST 'http://localhost:3001/api/notifications' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'x-tenant-slug: demo' \
  -H 'Content-Type: application/json' \
  -d '{"channel":"sms","recipient":"+911234567890","message":"Your report is ready","referenceId":"<BOOKING_ID>"}'
```

List notification logs example:
```
curl 'http://localhost:3001/api/notifications' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'x-tenant-slug: demo'
```

-------------------------------------------------

Notes & next steps for docs
- This file now covers endpoints implemented through Week 11.
- Convert these examples to Postman/Insomnia collection if you want an importable set.
- Consider adding response schema examples (OpenAPI/Swagger is available at `/api-docs`).
