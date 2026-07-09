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
- ⏳ Doctor module and CRUD
- ⏳ Patient module and UID generation
- ⏳ Patient search and history endpoints
- ⏳ Seed data for doctors and patients

### Week 7 — Booking Screen Part 1
- ⏳ Booking and booking_tests schema
- ⏳ Atomic booking creation flow
- ⏳ Barcode and QR generation
- ⏳ Payment validation and booking number generation

### Week 8 — Booking Screen Part 2 + Balance Receipt
- ⏳ Booking list filters and pagination
- ⏳ Cancellation flow and audit logging
- ⏳ Balance receipt handling

---

## Month 3 — Results, Reports, Delivery

### Week 9 — Result Entry + Workload Dashboard
- ⏳ Result entry endpoints
- ⏳ Abnormal and critical value handling
- ⏳ Workload dashboard data flow

### Week 10 — PDF Report Engine
- ⏳ PDF generation pipeline
- ⏳ Report status and public verification endpoints

### Week 11 — Notifications Delivery
- ⏳ SMS / WhatsApp / email notification flow
- ⏳ Notification log persistence

### Week 12 — MIS + Day Collection
- ⏳ MIS reporting endpoints
- ⏳ Excel export flow

---

## Month 4 — Polish, Security, Launch

### Week 13 — Integration Testing + Bug Sprint
- ⏳ End-to-end flow validation
- ⏳ Query performance review
- ⏳ API contract CI enforcement

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

## Current Focus Recommendation

### Next Highest-Value Tasks
1. Add RBAC guards and role-based access enforcement
2. Implement audit logging for auth and tenant-sensitive actions
3. Verify JWT login/refresh flow end-to-end with seeded tenant users
4. Add rate limiting and brute-force protection
5. Add BullMQ queue wiring and Socket.IO gateway for health events
6. Create the first real domain modules: tests, patients, doctors

### Suggested Daily Execution Rule
- Pick one task from the tracker
- Implement it fully
- Verify it locally
- Move it to completed
- Then pick the next task
