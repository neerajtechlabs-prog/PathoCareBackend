# Implemented API Contract (Quick Reference)

This document is meant as a frontend handoff guide for the backend project. It summarizes the endpoints exposed in Swagger at http://localhost:3001/api-docs and highlights the request/response shape that a frontend developer will actually use.

## Common notes for frontend integration
- Base URL (local): `http://localhost:3001`
- Every tenant-scoped request should include the header: `x-tenant-slug: demo` (or another tenant slug)
- Most protected endpoints need a Bearer access token from `/api/auth/login`
- Use `Content-Type: application/json` for POST/PUT/PATCH requests
- For local testing, the seeded admin user is usually: `admin@demo.pathcare.local` with password `Password123!`

Replace placeholders like `<ACCESS_TOKEN>` or `<BOOKING_ID>` before running the examples.

## Recommended first-flow for frontend
1. Login with `/api/auth/login`
2. Save the `accessToken`
3. Call `/api/tests`, `/api/patients`, `/api/doctors` to load master data
4. Create a booking via `/api/bookings`
5. Create a receipt via `/api/bookings/:id/receipts`
6. Create a report through `/api/reports`
7. Send a notification via `/api/notifications`

## Auth payloads and responses
### Login request body
```json
{
  "email": "admin@demo.pathcare.local",
  "password": "Password123!"
}
```

### Login response
```json
{
  "accessToken": "<JWT>",
  "refreshToken": "<JWT>",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

### Auth headers
```http
Authorization: Bearer <ACCESS_TOKEN>
x-tenant-slug: demo
```

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

Frontend use case: load available lab tests and their parameter definitions.

- GET /api/tests?q=<query> — List tests (auth required)
- GET /api/tests/:id — Get a test
- POST /api/tests — Create test (LAB_ADMIN / SUPER_ADMIN)
- PUT /api/tests/:id — Update test (LAB_ADMIN / SUPER_ADMIN)
- DELETE /api/tests/:id — Delete test (SUPER_ADMIN)

- GET /api/tests/:id/parameters — List parameters for a test
- POST /api/tests/:id/parameters — Create parameter (LAB_ADMIN / SUPER_ADMIN)
- PUT /api/tests/parameters/:parameterId — Update parameter (LAB_ADMIN / SUPER_ADMIN)
- DELETE /api/tests/parameters/:parameterId — Delete parameter (SUPER_ADMIN)

Typical response shape:
```json
{
  "id": "<test-id>",
  "name": "Hemogram",
  "code": "HEM01",
  "department": "Hematology",
  "specimenType": "Blood",
  "unit": "panel"
}
```

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

Frontend use case: booking flow from patient selection to payment and receipt.

- GET /api/bookings — List bookings (filters: q, status, fromDate, toDate, page, perPage)
- GET /api/bookings/:id — Get booking
- POST /api/bookings — Create booking (RECEPTIONIST, LAB_ADMIN, SUPER_ADMIN)
- PUT /api/bookings/:id/cancel — Cancel booking (LAB_ADMIN, SUPER_ADMIN)
- POST /api/bookings/:id/receipts — Create receipt (RECEPTIONIST, LAB_ADMIN, SUPER_ADMIN)
- POST /api/bookings/:id/payment/validate — Validate payment (RECEPTIONIST, LAB_ADMIN, SUPER_ADMIN)

Typical booking request body:
```json
{
  "patientId": "<patient-id>",
  "amount": 1000,
  "paymentMode": "CASH",
  "preferredDate": "2026-07-12",
  "testIds": ["<test-id>"]
}
```

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

Frontend use case: patient lookup, registration, and history for booking forms.

- GET /api/patients?q=<query> — List patients
- GET /api/patients/:id — Get patient
- GET /api/patients/:id/history — Get patient history
- POST /api/patients — Create patient (RECEPTIONIST, LAB_ADMIN, SUPER_ADMIN)
- PUT /api/patients/:id — Update patient (RECEPTIONIST, LAB_ADMIN, SUPER_ADMIN)
- DELETE /api/patients/:id — Delete (SUPER_ADMIN)

Typical patient request body:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+911234567890",
  "dateOfBirth": "1990-01-01"
}
```

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

Frontend use case: doctor selection and doctor master data in booking and result workflows.

- GET /api/doctors — List doctors
- GET /api/doctors/:id — Get doctor
- POST /api/doctors — Create doctor (LAB_ADMIN, SUPER_ADMIN)
- PUT /api/doctors/:id — Update doctor (LAB_ADMIN, SUPER_ADMIN)
- DELETE /api/doctors/:id — Delete (SUPER_ADMIN)

Typical doctor request body:
```json
{
  "name": "Dr. Kumar",
  "email": "kumar@example.com",
  "phone": "+911098765432"
}
```

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

Frontend use case: result entry workflow after booking is complete.

- POST /api/results — Create test result (LAB_TECHNICIAN, LAB_ADMIN)
  - Body: `{ bookingId, testId, parameters: [{ parameterId, value }, ...] }`
- PUT /api/results/:id/verify — Verify a result (LAB_ADMIN)

Typical result request body:
```json
{
  "bookingId": "<booking-id>",
  "testId": "<test-id>",
  "parameters": [
    { "parameterId": "<parameter-id>", "value": "12.5" }
  ]
}
```

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
- GET /api/dashboard/summary — Consolidated dashboard summary (RECEPTIONIST, LAB_TECHNICIAN, LAB_ADMIN, SUPER_ADMIN)

curl:
```
curl 'http://localhost:3001/api/dashboard/workload' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'x-tenant-slug: demo'
```

Example summary response shape:
```json
{
  "stats": {
    "totalPatients": { "value": 12, "trend": "+10.0%" },
    "pendingResults": { "value": 3, "trend": "-5.0%" },
    "dueReceipts": { "value": 2, "trend": "N/A" },
    "outstandingTests": { "value": 7, "trend": "+20.0%" }
  },
  "workload": [
    { "department": "Hematology", "progress": 75 },
    { "department": "Biochemistry", "progress": 50 }
  ],
  "today": {
    "bookings": 10,
    "reportsPending": 3,
    "receiptsDue": 2
  },
  "recentActivity": []
}
```

curl summary:
```
curl 'http://localhost:3001/api/dashboard/summary' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'x-tenant-slug: demo'
```

-------------------------------------------------

10) Reports

Frontend use case: trigger report generation once results are ready.

- POST /api/reports — Request a report generation job (LAB_TECHNICIAN, LAB_ADMIN, SUPER_ADMIN)
- GET /api/reports/:id — Get report status by ID (auth required)
- GET /api/reports/public/:token — Get public report status (no auth required)

Typical report request body:
```json
{
  "bookingId": "<booking-id>",
  "reportType": "RESULTS",
  "patientEmail": "patient@example.com",
  "patientPhone": "+911234567890"
}
```

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

12) Tenant + Admin Utilities

- GET /tenants/:slug — Get tenant metadata
- GET /tenants/:slug/isolation-proof — Verify tenant data isolation
- GET /audit — List recent tenant audit logs (SUPER_ADMIN / LAB_ADMIN)
- GET /users — List users (SUPER_ADMIN / LAB_ADMIN)
- PATCH /users/:id/role — Update a user's role (SUPER_ADMIN / LAB_ADMIN)
- PATCH /users/:id — Update user profile flags (SUPER_ADMIN / LAB_ADMIN)
- DELETE /users/:id — Delete a user (SUPER_ADMIN / LAB_ADMIN)
- GET /api/mis/day-collection — MIS day collection summary
- GET /api/mis/day-register — MIS day register view
- POST /api/mis/day-collection/export — Export MIS day collection data

Example:
```
curl 'http://localhost:3001/tenants/demo' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'x-tenant-slug: demo'
```

-------------------------------------------------

13) MIS / Reporting Utilities

- GET /api/mis/day-collection
- GET /api/mis/day-register
- POST /api/mis/day-collection/export

Example:
```
curl 'http://localhost:3001/api/mis/day-collection' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'x-tenant-slug: demo'
```

-------------------------------------------------

Notes & next steps for docs
- This file now covers the routes exposed by the current backend implementation and Swagger setup.
- Keep this document aligned with the live Swagger UI at http://localhost:3001/api-docs as new routes are added.
- For frontend work, start with the auth → tests/patients/doctors → booking → receipt → report → notification flow.
- Convert these examples to a Postman/Insomnia collection if you want an importable set.
