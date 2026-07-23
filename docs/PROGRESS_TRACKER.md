# PathCare Backend Progress Tracker

This tracker reflects the current implementation status of the backend project against the execution plan.

## Status Legend
- ✅ Completed
- 🔄 In Progress
- ⏳ Todo / Not Started

---

## Month 1 — Foundation & Infrastructure

### Week 1 — Project Setup + Tooling
- ✅ NestJS project initialized with TypeScript strict mode
- ✅ Core backend structure created under src/
- ✅ Docker Compose configured for PostgreSQL and Redis
- ✅ Environment configuration with .env and .env.example
- ✅ Swagger configured and reachable via /api-docs
- ✅ Basic health endpoints implemented
- ✅ CI workflow added for build/lint/typecheck/tests
- ✅ Backend runs locally on port 3001
- ⏳ Railway / staging deployment setup
- ✅ Full seed data for demo tenant expanded beyond basic placeholder

### Week 2 — Multi-Tenancy Core
- ✅ Public data source initialization implemented
- ✅ Tenant-aware controller and service scaffold added
- ✅ Tenant module created
- ✅ Swagger docs exposed
- ✅ Tenant middleware implemented with X-Tenant-Slug header validation
- ✅ TenantDataSourceService wired up (tenant-specific schema factory)
- ✅ Isolation proof endpoint created (queries tenant-specific schemas)
- ✅ Seed script extended for second tenant (demo + test2)
- 🔄 Multi-tenant isolation proof verification with real data separation (runtime/Postman validation pending)
- ⏳ Isolation integration tests

### Week 3 — Authentication System
- ✅ Auth module scaffold created
- ✅ Login / refresh / logout endpoints exposed
- ✅ Real JWT auth implementation (access/refresh tokens generated and validated)
- ✅ Argon2 password hashing implemented for auth and seed users
- ✅ Refresh token handling and secure cookies wired (basic flow in place; DB-backed rotation pending)
- ✅ RBAC and audit logging

#### Extension (2026-07-23) — OTP-verified registration + lazy tenant provisioning
*Replaces immediate-provisioning signup with a deferred flow: signup → OTP → admin approval → schema provisioned on first login.*
- ✅ Step 1: `public.tenants` extended with full status lifecycle
  (`unverified` → `pending_approval` → `approved` → `provisioning` → `active`,
  plus `provisioning_failed`/`suspended`/`expired`) and new columns for
  admin credentials, OTP state, and labCode — migration added
- ✅ Step 2: Signup rewritten to be lightweight — validates input, reserves a
  unique slug, hashes password (Argon2), inserts a single `unverified`
  `public.tenants` row; no tenant datasource/schema/user created at signup
- ✅ Step 3: OTP module implemented — `OtpDeliveryChannel` interface with
  `EmailOtpChannel`, generation/hashing/expiry (10 min)/attempt limit
  (5)/resend cooldown (60s, max 5/hour), emails queued via BullMQ
- 🔄 Step 4: `POST /auth/verify-otp` + labCode generation service — not started
- ⏳ Step 5: Login rewrite for labCode+email+password resolution and
  status-specific responses — not started
- ⏳ Step 6: Tenant provisioning service with Postgres advisory lock +
  first-login credential migration into tenant `users` table — not started

### Week 4 — Lab Config + Queue + Socket.io
- ✅ Basic health and tenant endpoints available
- ✅ Docker + Redis foundation present
- ✅ BullMQ queue integration
- ✅ Socket.io gateway and tenant room handling
- ✅ Lab profile / department / sample type CRUD implemented with tenant-scoped entities, repositories, services, DTOs, controllers, and module wiring
- ⏳ S3 presigned URL flow : skipped

---

## Month 2 — Core Modules

### Week 5 — Test Catalog
- ✅ Test catalog entities and migrations
- ✅ CRUD endpoints for tests and parameters
- ✅ Search and CSV import flow
- ✅ Seed data for realistic test catalog 

### Week 6 — Doctor Master + Patient Registration
- ✅ Doctor module and CRUD
- ✅ Patient module and UID generation
- ✅ Patient search and history endpoints
- ✅ Seed data for doctors and patients

### Week 7 — Booking Screen Part 1
- ✅ Booking and booking_tests schema
- ✅ Atomic booking creation flow
- ✅ Barcode and QR generation
- ✅ Payment validation and booking number generation

### Week 8 — Booking Screen Part 2 + Balance Receipt
- ✅ Booking list filters and pagination
- ✅ Cancellation flow and audit logging
- ✅ Balance receipt handling

---

## Month 3 — Results, Reports, Delivery

### Week 9 — Result Entry + Workload Dashboard
- ✅ Result entry endpoints
- ✅ Abnormal and critical value handling
- ✅ Workload dashboard data flow

### Week 10 — PDF Report Engine
- ✅ PDF generation pipeline (queue-backed, tenant-scoped report persistence)
- ✅ Report status and public verification endpoints

### Week 11 — Notifications Delivery
- ✅ Queue-backed SMS / WhatsApp / email notification flow
- ✅ Notification log persistence with tenant-scoped status tracking

### Week 12 — MIS + Day Collection
- ✅ MIS reporting endpoints implemented for day collection summary, day register, and export queue integration
- ✅ Excel export flow implemented with ExcelJS workbook generation wired to the MIS export job
- ✅ Seed-data validation added for MIS totals against real tenant booking, receipt, and test rows

---

## Must-Have Missing for MVP Launch
These are the highest-priority gaps still worth closing before the first launch, without expanding scope beyond the MVP:
- ⏳ Add the last layer of production hardening: real rate limiting, stricter secret/env validation, and safer error handling for production responses
- ⏳ Add real end-to-end smoke tests for the core flow: booking → receipt → report/notification and tenant-isolation verification with seeded data

## Month 4 — Polish, Security, Launch

### Week 13 — Integration Testing + Bug Sprint
- ✅ End-to-end flow validation scaffolding added for booking → receipt → report/notification and tenant-isolation scenarios
- 🔄 Local DB-backed smoke execution and final seed/runtime compatibility validation still pending
- ✅ Query performance review started with targeted repository and processor improvements already implemented
- 🔄 Runtime profiling and follow-up optimization pass still pending
- ✅ API contract test suite added and wired into the backend test workflow
- 🔄 Final CI/local verification run for the contract and smoke suites still pending

### Week 14 — Security Hardening
- ⏳ Helmet + rate limiting + input sanitization
- ⏳ JWT and tenant security checks

### Week 15 — Performance + QA
- ⏳ Performance profiling and indexes
- ⏳ Playwright / k6 tests

### Week 16 — Production Launch
- ⏳ Production deployment prep
- ⏳ Tenant onboarding support
- ⏳ AWS production setup

---

