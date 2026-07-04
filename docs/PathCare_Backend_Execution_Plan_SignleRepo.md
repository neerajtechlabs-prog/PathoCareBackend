# PathCare Labs — Backend Execution Plan
### Senior Architect Edition | Solo Dev | 15–20 hrs/week | 20-Week Realistic Timeline

> **Companion document to `PathCare_Frontend_Execution_Plan_v2.md`.** Together, these two files are the sole source of truth for development. They supersede `PathCare_SaaS_Master_Plan_v3.md` — that file remains useful as historical architecture reference only, but day-to-day build decisions come from these two plans.
>
> **Sequencing rule:** Backend runs **1 week ahead** of frontend at all times. The frontend plan's Week N always consumes APIs the backend finished in its own Week N (or earlier). Do not start a frontend module until the matching backend module's "Done Criteria" are met and the backend is running locally with seed data.

---

## 🏛️ ARCHITECT'S DECISIONS (Locked)

| # | Decision | Choice | Reason |
|---|---|---|---|
| 1 | Framework | **NestJS + TypeScript (strict)** | Modular, DI-first, first-party TypeORM + Swagger + BullMQ integration |
| 2 | ORM | **TypeORM + TenantDataSource Map** | Schema-per-tenant isolation, connection pool per tenant, cached |
| 3 | Repo | **`pathcare-api`** — independent repo, no monorepo tooling | No shared build tooling overhead for a solo dev |
| 4 | Auth | **JWT (access 15min + refresh 7d, httpOnly cookies)** | `Domain=.pathcare.com`, `SameSite=Lax`, `Secure` — works across subdomains |
| 5 | Password hashing | **Argon2id** | Current OWASP recommendation, memory-hard |
| 6 | Tenant resolution | **`X-Tenant-Slug` header**, validated against JWT claim | Frontend reads hostname, backend never trusts header alone |
| 7 | Queue | **BullMQ (Redis-backed)** | Report generation + notifications, both async, both need retry |
| 8 | PDF engine | **Puppeteer**, singleton browser pool | Full HTML/CSS control, QR + watermark trivial |
| 9 | Real-time | **Socket.io**, JWT on handshake, tenant rooms | Live workload dashboard, report-ready pings |
| 10 | API docs / contract | **`@nestjs/swagger`** → `GET /api-docs-json` | Single source of truth frontend codegen reads from |
| 11 | Notifications | **MSG91 (SMS)** + **Twilio (WhatsApp)** + **AWS SES (email, optional)** | India-first, DLT compliant |
| 12 | File storage | **AWS S3**, private bucket, presigned URLs only | Reports/logos never public |
| 13 | Dev environment | **Docker Compose (Postgres 16 + Redis 7)** | Zero AWS cost during development |
| 14 | Staging | **Railway** (managed Postgres + Redis + Node) | Free tier, mirrors RDS behavior better than local Docker |
| 15 | Production | **AWS EC2 t3.medium + RDS + ElastiCache** | Predictable cost, scales to ECS later |
| 16 | Testing | **Jest (unit, critical services only) + Playwright (E2E, Week 15, shared with frontend)** | Solo dev — no exhaustive unit test suite, focus on money/security paths |

---

## ⚠️ REALISTIC TIMELINE

> Master plan: 16 weeks total, backend + frontend implied in parallel with multiple devs.
> You: Solo, 15–20 hrs/week, backend + DevOps.
> **Adjusted: 20 weeks with a 4-week buffer — mirrors the frontend plan exactly, so both tracks stay in lockstep.**

**Average: ~17 hrs/week × 20 weeks = 340 hrs total**

Backend is the **critical path** for the first 4 weeks (frontend cannot do anything real without tenant resolution + auth). From Week 5 onward, backend stays **one module ahead** so frontend always has a live, seeded API to build against — never a mock.

---

## 🔑 NON-NEGOTIABLE RULE: NO FRONTEND MOCKING

The frontend plan does **not** build against hardcoded/mock JSON, Storybook fixtures, or a mock service worker at any point. Every module — from Week 1 skeleton to Week 16 launch — is built against **this real backend, running locally via Docker Compose, seeded with realistic dummy data.**

This means:
- Backend Week 1 ships a working `demo` tenant with a seed script before frontend Week 1 needs any data.
- Every backend module ships its seed data (`npm run seed`) **in the same week** the corresponding frontend screen is built — see the seed checklist at the end of each week below.
- `openapi-typescript` codegen runs against the **local backend** (`gen:api-types:local`), not against a spec written by hand — so frontend types can never drift from what the backend actually returns.
- The only "fixture" data anywhere in the system is the `demo` tenant's seed data, and it lives in this repo (`pathcare-api/src/database/seeds/`), not in the frontend repo.

---

## 📚 PRE-WORK: Study Before Week 1
*(2–3 days per topic)*

### Must Know (In This Order)

**1. NestJS Fundamentals** — Modules, Controllers, Providers, DI container, Guards, Interceptors, Pipes. If already comfortable with NestJS from prior QA/dev exposure, skim and move on.

**2. TypeORM Multi-DataSource Pattern** — Read: `DataSource` API, `Repository` pattern, migrations (`typeorm migration:generate` / `:run`). Focus on running the **same entity set against different schemas at runtime** — this is not the default TypeORM tutorial pattern, budget extra time here.

**3. BullMQ** — Read: Queue/Worker/Job basics, retries + backoff, `@nestjs/bullmq` decorators (`@Processor`, `@Process`). This powers both PDF generation and notifications.

**4. Puppeteer** — Read: `page.setContent()`, `page.pdf()`, browser reuse patterns (do **not** learn the "launch per request" pattern — it will be actively unlearned in Week 10).

**5. Socket.io Server** — Read: `@WebSocketGateway`, rooms, handshake auth, `server.to(room).emit()`.

**6. Argon2 + JWT** — Read: `argon2.hash()` / `argon2.verify()`, JWT signing with short-lived access + rotating refresh tokens, httpOnly cookie mechanics across subdomains.

---

## 🗓️ MONTH 1 — Foundation & Infrastructure (Weeks 1–4)
*Goal: Repo running, multi-tenancy proven, auth working, first seed data live*

---

### WEEK 1 — Project Setup + Tooling 🔴 BLOCKER
**18–20 hrs | Output: CI green, Docker Compose running, skeleton structure, `demo` tenant seeded**

#### Day 1 (3 hrs) — Repo + Framework Init
```bash
npx @nestjs/cli new pathcare-api --strict --package-manager npm
cd pathcare-api
git init && git remote add origin <your-repo>
npm install --save-dev eslint prettier husky lint-staged tsc-files
npx husky init
```
`.husky/pre-commit`:
```bash
npx lint-staged
```
`package.json`:
```json
"lint-staged": {
  "*.ts": ["eslint --fix", "tsc-files --noEmit"]
}
```

#### Day 2 (3.5 hrs) — Docker Compose + Config Validation
```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    ports: ['5432:5432']
    environment:
      POSTGRES_USER: pathcare
      POSTGRES_PASSWORD: localpass
      POSTGRES_DB: pathcare_db
    volumes: ['pgdata:/var/lib/postgresql/data']
  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
    command: redis-server --appendonly yes
    volumes: ['redisdata:/data']
volumes: { pgdata: {}, redisdata: {} }
```
Install `@nestjs/config` + `joi`, validate every env var on boot — app must **fail fast** if a required var is missing, never fall back to silent defaults in production mode.

`.env.example` — commit this, document every var (see Section 8 of the master plan for the full list: `DB_HOST`, `DB_PORT`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_DOMAIN`, `AWS_S3_BUCKET`, `MSG91_AUTH_KEY`, `TWILIO_ACCOUNT_SID`, etc.)

#### Day 3 (3 hrs) — Folder Structure + CI

Create the full `src/modules/*` skeleton from the master plan (Section 2, Repo 1) — every module folder with an empty `.module.ts` even if not implemented yet. This makes every future week additive, not restructuring.

```yaml
# .github/workflows/ci.yml
name: Backend CI
on:
  push: { branches: [main, develop] }
  pull_request: { branches: [main] }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run build
      - name: Verify Dockerfile builds
        run: docker build -t pathcare-api:test .
```
Enable branch protection on `main` — PR required, CI must pass.

#### Day 4 (3 hrs) — Railway + AWS Skeleton
- Railway account → new project → connect `pathcare-api` repo → add managed Postgres + Redis plugins → set env vars.
- AWS account with MFA enabled → S3 bucket `pathcare-files-staging` (private, block all public access) → IAM user scoped to that bucket only (least privilege — no admin keys in `.env`, ever).

#### Day 5 (4 hrs) — Public Schema + First Seed Script
```typescript
// src/database/public-datasource.ts — connects to the shared "public" schema
```
- First migration: `public.tenants` + `public.subscriptions`.
- `src/database/seeds/demo-tenant.seed.ts`: inserts one row into `public.tenants` (`slug: 'demo'`, `schema_name: 'tenant_demo'`) and creates the empty `tenant_demo` schema.
- `npm run seed` script wired into `package.json`. This is the script that will grow every week — **never delete or overwrite it, always append.**

**✅ Week 1 Done Criteria:**
- [ ] `docker-compose up -d` → Postgres + Redis healthy
- [ ] `npm run start:dev` → NestJS boots on `:3001`, fails loudly if any env var missing
- [ ] CI green on a PR
- [ ] Deployed to Railway staging (Hello World is fine)
- [ ] `npm run seed` creates the `demo` tenant row + empty schema
- [ ] **Frontend team (you, next week) can already point `X-Tenant-Slug: demo` at `localhost:3001` and get a 200, even with an empty response body**

---

### WEEK 2 — Multi-Tenancy Core 🔴 BLOCKER
**25–28 hrs | Output: Schema-per-tenant proven end-to-end, Swagger live**

#### Day 1 — `TenantDataSourceService`
```typescript
// src/database/tenant-datasource.factory.ts
@Injectable()
export class TenantDataSourceService {
  private dataSources = new Map<string, DataSource>();

  async getForTenant(slug: string): Promise<DataSource> {
    if (this.dataSources.has(slug)) return this.dataSources.get(slug);
    const ds = await this.createForTenant(slug);
    this.dataSources.set(slug, ds);
    return ds;
  }

  private async createForTenant(slug: string): Promise<DataSource> {
    const tenant = await this.publicDataSource
      .getRepository(Tenant)
      .findOneByOrFail({ slug });

    const ds = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      schema: tenant.schema_name,
      entities: [Patient, Doctor, Booking /* ...all tenant entities */],
      poolSize: 5,
      connectTimeoutMS: 5000,
    });
    await ds.initialize();
    return ds;
  }

  async removeForTenant(slug: string): Promise<void> {
    const ds = this.dataSources.get(slug);
    if (ds?.isInitialized) await ds.destroy();
    this.dataSources.delete(slug);
  }
}
```

#### Day 2 — `TenantMiddleware`
```typescript
// src/modules/tenant/tenant.middleware.ts
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private tenantDsService: TenantDataSourceService,
    private redisService: RedisService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const slug = req.headers['x-tenant-slug'] as string;
    if (!slug) throw new BadRequestException('X-Tenant-Slug header required');

    const cached = await this.redisService.get(`tenant:${slug}`);
    if (cached === 'invalid') throw new NotFoundException('Tenant not found');

    const ds = await this.tenantDsService.getForTenant(slug);
    req['tenantDataSource'] = ds;
    req['tenantSlug'] = slug;
    next();
  }
}
```

#### Day 3 — Swagger + First Real Controller
`@nestjs/swagger` full setup → `GET /api-docs-json` exposed (non-production always, production behind API key). Decorate one real controller (e.g. `tenant.controller.ts` health-check style endpoint) as proof the pipeline works before building anything bigger on top of it.

#### Day 4 — Second Seed Tenant + Isolation Proof
Extend `npm run seed` to also create `test2` tenant with its own schema. Insert one dummy row of *something* trivial (even just a log row) into each schema and verify via Postman/psql that `tenant_demo` and `tenant_test2` never see each other's data.

#### Day 5 — Dynamic CORS + Handoff to Frontend
CORS validated dynamically against the `tenants` table (Redis-cached, 5min TTL) — not a static allow-list, since new tenants get created without a redeploy. This is also the day the frontend plan's Week 2 Day 4–5 tasks (axios calls with `X-Tenant-Slug`) become unblocked — confirm with a live Postman collection call before telling yourself it's "done."

**✅ Week 2 Done Criteria:**
- [ ] `metropolis`-style slug → correct schema resolved → queries isolated (proven with 2 tenants, not assumed)
- [ ] `GET /api-docs-json` returns valid OpenAPI JSON
- [ ] `npm run seed` is idempotent (safe to re-run without duplicate rows)
- [ ] Frontend `gen:api-types:local` successfully generates types against this backend

---

### WEEK 3 — Authentication System 🔴 CRITICAL
**20–25 hrs | Output: Full auth flow, cross-subdomain cookies, RBAC, audit logging**

#### Day 1 — Users Entity + Password Hashing + Seed Users
`users` entity in tenant schema. Argon2id via the `argon2` package. Extend the seed script: every tenant gets one seeded user per role (`SuperAdmin`, `LabAdmin`, `Receptionist`, `LabTechnician`, `Doctor`) with a known dev password (`Password123!`) documented in `.env.example` comments — **never** commit real credentials, only the dev seed convention.

#### Day 2 — Login Endpoint
```typescript
// login.dto.ts
export class LoginDto {
  @ApiProperty({ example: 'admin@demo.pathcare.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '••••••••' })
  @IsString() @MinLength(8)
  password: string;
}
```
`POST /auth/login` → verifies Argon2 hash → issues JWT access (15min) in an httpOnly cookie (`Domain=.pathcare.local` locally, `.pathcare.com` in prod, `SameSite=Lax`, `Secure` in prod only).

#### Day 3 — Refresh Rotation
`POST /auth/refresh` → validates refresh cookie → issues new access + refresh pair → **invalidates the old refresh token** (rotation, stored hashed in `refresh_tokens` table, never raw).

#### Day 4 — Rate Limiting
5 failed logins → 15-minute Redis-backed block, keyed `ratelimit:login:{tenantSlug}:{email}`. Custom guard or `@nestjs/throttler` — either is fine, but it must be tenant-aware (a block on `demo` must not affect `metropolis`).

#### Day 5 — RBAC + Audit Log
`@Roles()` decorator + `RolesGuard`, all 5 roles wired. `AuditLogInterceptor` auto-logs every mutating request (method, path, user, tenant, before/after body where feasible, timestamp) into the append-only `audit_logs` table — no `UPDATE`, no `deleted_at` on this table, ever.

**✅ Week 3 Done Criteria:**
- [ ] Login on `demo.pathcare.local` sets cookie with the correct `Domain`
- [ ] Refresh rotation verified: old refresh token rejected after use
- [ ] 5 failed logins → 15min block, verified per-tenant
- [ ] `RolesGuard` blocks a `Receptionist` token from hitting a `LabAdmin`-only route
- [ ] Every seeded role can log in with its seed password — **this is what frontend Week 3's login page will test against, not a hardcoded frontend user object**

---

### WEEK 4 — Lab Config + Queue + Socket.io [HIGH]
**25–30 hrs | Output: Background job pipeline live, real-time foundation, first CRUD masters**

#### Day 1 — Lab Config Migrations + Seed
Migrations: `centres`, `lab_profile`, `departments`, `sample_types`, `employees`. Seed script now inserts: 1 default centre, 1 lab profile (with placeholder logo/letterhead JSON), the 4 default departments (`Biochemistry`, `Haematology`, `Microbiology`, `Serology`), and 3–4 sample types.

#### Day 2 — BullMQ Setup
```bash
npm install @nestjs/bullmq bullmq
```
Register `report-generation` and `notification` queues, Redis as backend. Add a `GET /health/queues` endpoint showing queue depth — useful for both you and the frontend's later "is the system healthy" checks.

#### Day 3 — Socket.io Gateway
```typescript
// src/realtime/events.gateway.ts
@WebSocketGateway({
  cors: {
    origin: async (origin, callback) => {
      const allowed = await validateTenantOrigin(origin);
      callback(null, allowed);
    },
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection {
  async handleConnection(client: Socket) {
    const token = client.handshake.auth.token;
    try {
      const payload = this.jwtService.verify(token);
      const room = `tenant:${payload.tenantSlug}`;
      await client.join(room);
    } catch {
      client.disconnect();
    }
  }

  emitWorkloadUpdate(tenantSlug: string, data: WorkloadUpdateDto) {
    this.server.to(`tenant:${tenantSlug}`).emit('workload:updated', data);
  }
}
```
Verify with a throwaway test client (Postman WS tab or a 5-line Node script) that a connection with a valid JWT joins the right room — **do this before frontend Week 4 Day 5 tries to connect from the browser.**

#### Day 4 — Lab Profile CRUD + Presigned Upload
Lab profile CRUD endpoints, including an S3 presigned-URL endpoint for logo upload (`GET /lab-profile/logo-upload-url`) — frontend uploads directly to S3, backend never proxies the binary.

#### Day 5 — Department, Sample Type, User Management CRUD
Standard CRUD trio, tenant-admin-only where relevant. Same repository pattern established here is reused for every master module going forward (see **Standard Module Template** below).

**✅ Week 4 Done Criteria:**
- [ ] BullMQ dashboard/health endpoint shows both queues registered
- [ ] Socket.io connection + tenant room join verified server-side (logs show `Client joined tenant:demo`)
- [ ] Lab profile, department, sample type, user CRUD all return real seeded data
- [ ] `npm run seed` output is now enough that **frontend's DataTable component renders real rows on first run — no frontend mock data needed at any point from here on**

---

## 🗓️ MONTH 2 — Core Modules (Weeks 5–8)
*Goal: Every module the booking screen depends on is live and seeded before Booking week starts*

---

### WEEK 5 — Test Catalog 🔴 BLOCKER for Booking
**20–25 hrs**

- `tests` + `test_parameters` entities + migrations.
- Test CRUD (create, list, update, soft-delete).
- Nested test-parameter CRUD.
- Redis-cached search: `GET /tests/search?q=cbc` → Redis check → DB with GIN index on miss → Redis write, 1hr TTL.
- Bulk CSV import (`multer` + `csv-parser` → row validation → bulk insert, partial-failure report returned to caller).
- Swagger fully documented on every DTO.
- **Seed:** 100+ realistic tests across all 4 departments, each with 1–5 parameters and normal ranges, so frontend's test selector has real search results to page through — not 3 placeholder rows.

**Done Criteria:** `GET /tests/search?q=hae` returns cached results in <50ms on second call. CSV import handles a 50-row file with 2 intentionally bad rows and reports exactly which rows failed and why.

---

### WEEK 6 — Doctor Master + Patient Registration 🔴 BLOCKER
**25–30 hrs**

- `doctors` entity + CRUD (commission % field).
- `patients` entity + migrations.
- Patient UID generator: `PC-2025-0001`, atomic via a Postgres sequence (never generated in application code with a `SELECT MAX()` — race condition risk).
- Patient full-text search: GIN index on `first_name || ' ' || last_name || ' ' || phone`.
- Patient history endpoint: all bookings for a patient, most recent first.
- **Seed:** 15–20 doctors across specializations, 50+ patients with realistic Indian names/phones/addresses and a spread of UIDs, so pagination and search actually have something to demonstrate.

**Done Criteria:** Patient search returns results by partial name AND partial phone. UID sequence survives concurrent creation (test with 10 parallel `POST /patients` calls — no duplicate UIDs).

---

### WEEK 7 — Booking Screen Part 1 🔴 BLOCKER — Most Complex
**30–35 hrs | Dedicate full focus here**

- `bookings` + `booking_tests` entities + migrations.
- Transaction-safe booking creation: booking row → booking_tests rows → `paid_amount` update → barcode payload returned — **all inside one DB transaction**, rollback on any failure.
- Booking number generator: `PC-2025-001234`, per-tenant sequence.
- Barcode generation: `bwip-js` → Code128, returned as base64.
- QR generation: `qrcode` npm → verification URL, base64.
- Payment validation: `paid ≤ (total − discount)`, enforced server-side even though the frontend also validates — never trust client math for money.
- **Seed:** 20–30 bookings across the last 2 weeks, mixed statuses (pending/entered/verified/delivered), mixed payment states (full/partial), so the frontend's booking list and workload dashboard have real variety on day one instead of an empty state.

**Done Criteria:** A booking with 3 tests, partial payment, and a discount produces mathematically correct `paid_amount`/balance in one atomic transaction — verified by deliberately killing the request mid-way (e.g. malformed test ID) and confirming zero partial rows are left behind.

---

### WEEK 8 — Booking Screen Part 2 + Balance Receipt 🔴 BLOCKER
**25–30 hrs**

- Booking list endpoint: date filter, centre filter, status filter, pagination, indexed query (use `idx_bookings_date_centre`).
- Booking cancel endpoint: admin-role-only, remark required, logged to `audit_logs`.
- Balance receipt endpoint: creates `receipts` row, updates `booking.paid_amount`.
- Receipt number generator: per-tenant sequence, same pattern as booking numbers.
- Booking summary endpoint feeding both the workload dashboard and MIS (built later).

**Done Criteria:** Cancelling a booking without a remark is rejected with a clear validation error. A balance receipt correctly reduces the pending balance to zero when the full remaining amount is paid, and rejects overpayment.

---

## 🗓️ MONTH 3 — Results, Reports, Delivery (Weeks 9–12)

---

### WEEK 9 — Result Entry + Workload Dashboard 🔴 BLOCKER
**30–35 hrs**

- Result entry endpoint: writes `test_results` rows, sets `booking_tests.result_status = 'entered'`.
- Abnormal flagging: compare entered value against `test_parameters` normal range → set `is_abnormal`.
- Critical value detection: `is_critical = TRUE` → **fire an SMS job immediately**, bypassing the normal BullMQ delay — this is a patient-safety path, not a UX nicety.
- TAT calculation: `NOW() - booking.created_at` vs `test.tat_hours`.
- Workload endpoint: all pending `booking_tests` for today, joined with patient + test name, ordered by department.
- Emit `workload:updated` after every result save.
- **Seed:** ensure at least a handful of seeded bookings have partially-entered results and at least one deliberately abnormal/critical value, so the frontend's amber/red highlighting has something real to render on first load.

**Done Criteria:** Saving a critical result triggers the SMS job within the same request cycle (verify job appears in the queue immediately, not on the next BullMQ tick). Workload query stays fast (<100ms) against the indexed `idx_booking_tests_workload` with 500+ seeded rows.

---

### WEEK 10 — PDF Report Engine 🔴 BLOCKER
**30–35 hrs**

- Handlebars template `pathology-report.hbs`: letterhead, patient block, department-wise results table, abnormal values bold+red, reference ranges column, signatory footer, embedded QR, dynamic watermark.
- **Puppeteer browser pool — launch once on app startup, reuse for every job.** This is the single most important operational detail in the whole backend; a per-job launch will OOM-kill the container under any real load.
```typescript
@Processor('report-generation')
export class ReportProcessor {
  @Process('generate-pdf')
  async generatePdf(job: Job<{ bookingId: string; tenantSlug: string }>) {
    const { bookingId, tenantSlug } = job.data;
    const data = await this.reportService.getReportData(bookingId, tenantSlug);
    const html = await this.templateEngine.render('pathology-report', {
      ...data,
      abnormalClass: (val, low, high) => (val < low || val > high) ? 'abnormal' : '',
    });
    const qrCode = await QRCode.toDataURL(`https://verify.pathcare.com/${data.report.qrCode}`);
    const page = await this.browserPool.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    await page.close();
    const s3Key = `reports/${tenantSlug}/${bookingId}/v${data.report.version}.pdf`;
    const s3Url = await this.s3Service.upload(s3Key, pdf, 'application/pdf');
    await this.reportService.saveReportUrl(bookingId, s3Url, tenantSlug);
    await this.notificationQueue.add('send-report', { bookingId, tenantSlug });
  }
}
```
- Report status endpoint (`GET /reports/:bookingId/status`) — frontend polls this.
- Public verification endpoint (`GET /verify/:code`) — no auth, returns a redacted booking summary only.

**Done Criteria:** Generate 20 PDFs back-to-back locally, confirm Node.js memory does not climb unbounded (browser pool reused, not relaunched). QR code on the printed PDF resolves to a working `/verify/:code` page.

---

### WEEK 11 — WhatsApp + SMS Delivery [HIGH]
**20–25 hrs**

- MSG91 SMS: booking confirmation, result-ready with report link, critical-value urgent SMS (bypasses queue delay, same as Week 9).
- Twilio WhatsApp: send PDF report (S3 URL attachment), status webhook (`POST /notifications/whatsapp/webhook`) updates `notification_logs`.
- `notification.processor.ts` handles both SMS and WhatsApp jobs, with retry + backoff on transient provider failures.
- `notification_logs` populated for every send attempt, success or failure — this table is what powers the frontend's delivery-status badge.

**Done Criteria:** A simulated provider failure (wrong test API key locally) results in a `failed` row in `notification_logs`, not a silent drop or an unhandled exception.

---

### WEEK 12 — MIS + Day Collection [HIGH]
**20–25 hrs**

- Day Collection endpoint (date range): total bookings, total billed, total collected, pending balance, mode-wise collection, test-wise counts.
- Day Register endpoint: full booking list for a date.
- Excel export via `ExcelJS`: `GET /mis/day-collection/export?date=2025-01-15`.
- Every MIS query selects only needed columns, uses the indexes from Week 1–2 migrations — no `SELECT *` on any reporting endpoint.

**Done Criteria:** Day Collection totals reconcile exactly against the sum of seeded receipts for that date (write a quick script that cross-checks, don't eyeball it).

---

## 🗓️ MONTH 4 — Polish, Security, Launch (Weeks 13–16)

---

### WEEK 13 — Integration Testing + Bug Sprint
**20–25 hrs**

- Full end-to-end flow test: patient register → booking → barcode → result entry → PDF → WhatsApp delivery.
- N+1 query audit: enable TypeORM query logging, count queries per request on the heaviest endpoints (workload, booking list), fix any found.
- OpenAPI codegen re-run + committed — frontend types must be current with every endpoint added since Week 1.
- API contract CI check verified as a working merge blocker (not just present in the YAML, actually tested with an intentional breaking change).

---

### WEEK 14 — Security Hardening
**20 hrs**

- `helmet()` middleware (CSP, HSTS, X-Frame-Options).
- Input sanitization audit — every DTO reviewed, no raw HTML accepted anywhere.
- Rate limiting on **all** write endpoints, not just login: 30 req/min per user.
- Aadhaar masking audit: `grep -ri aadhaar` across the whole codebase, confirm only `aadhaar_last4` is ever stored.
- JWT edge cases: expired access + expired refresh → force re-login, cookies cleared.
- SQL injection check: confirm every TypeORM query uses parameters, zero string concatenation.
- All report PDFs behind presigned URLs (1hr expiry), bucket never public.

---

### WEEK 15 — Performance + QA
**25–30 hrs**

**Performance**
- `EXPLAIN ANALYZE` on: workload query, booking list, patient search, day collection.
- Verify all 8 critical indexes exist on the tenant schema (re-check against Section 3.3 of the master plan).
- Redis cache hit-rate check for test search.
- Puppeteer memory profiling across 20 sequential PDF generations — no leak.

**QA**
- Playwright E2E (shared suite with frontend): booking happy path, result entry flow, balance receipt flow.
- `k6` load test: 10 concurrent booking creates on a single tenant, target <300ms P95.
- Cross-tenant isolation test: a user token from `tenant_metropolis` must not be able to access `tenant_thyrocare` data even with a manually modified `X-Tenant-Slug` header (this is the `TenantSecurityInterceptor` check — confirm it actually throws `ForbiddenException`).

---

### WEEK 16 — Production Launch 🚀
**25–30 hrs**

**Self-service onboarding backend support**
- Endpoint to bootstrap a brand-new tenant: creates schema, runs tenant migrations, seeds the 4 default departments, creates first admin user.
- CSV test-catalog import reused from Week 5, or "standard template" pick-list endpoint.

**Demo tenant**
- `demo` tenant seed data expanded to the full realistic set: 50 patients, 100+ tests, 20 bookings, 10 results — this is the same seed script that's been growing since Week 1, now finalized as the permanent demo dataset.

**Production AWS setup**
- EC2 t3.medium (ap-south-1) + Elastic IP.
- RDS PostgreSQL db.t3.micro (private subnet).
- ElastiCache Redis cache.t3.micro (private subnet).
- Security Groups: EC2 only 80/443 from anywhere; RDS/Redis only from EC2's security group.
- Nginx on EC2: HTTPS termination + reverse proxy to NestJS on `:3001`.
- ACM SSL wildcard cert for `*.pathcare.com` + `api.pathcare.com`.

**Go-live checklist**
- [ ] SSL valid on `api.pathcare.com` + one real tenant subdomain
- [ ] HTTPS redirect enforced
- [ ] S3 bucket confirmed NOT public, presigned URLs working in production
- [ ] CloudWatch alarm: CPU > 80% → email alert
- [ ] Tenant provisioning tested end-to-end with a real new tenant, not just `demo`
- [ ] Rollback plan documented (how to redeploy previous EC2 image if launch goes wrong)

---

## 🗓️ WEEKS 17–20 — Buffer + Stabilization

### Week 17–18: Overflow Buffer
Use for: slipped features, query optimization found during pilot use, any Week 1–16 item marked incomplete.

### Week 19: Pilot Lab Session (Backend-side)
Sit alongside the frontend pilot session. Watch server logs live during the first real booking session — this is where undiscovered N+1 queries and edge cases in real (non-seeded) data actually surface.

### Week 20: Phase 2 Preparation
Research (don't build yet), matching the frontend plan's Week 20:
- Doctor commission statement — backend aggregation queries needed.
- Radiology module — schema changes for rich-text result storage.
- Offline PWA sync — conflict-resolution strategy for the API (last-write-wins vs vector clock).

---

## 📦 COMPLETE DEPENDENCY LIST

```bash
# Framework
npm install @nestjs/core @nestjs/common @nestjs/platform-express
npm install @nestjs/config joi

# Database
npm install typeorm pg
npm install -D @types/pg

# Auth
npm install @nestjs/jwt @nestjs/passport passport passport-jwt passport-local argon2
npm install -D @types/passport-jwt @types/passport-local

# API Docs
npm install @nestjs/swagger

# Queue + Real-time
npm install @nestjs/bullmq bullmq
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

# PDF + Barcode
npm install puppeteer handlebars bwip-js qrcode
npm install -D @types/qrcode

# File handling
npm install multer csv-parser exceljs
npm install -D @types/multer

# Cloud
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Notifications
npm install twilio axios          # MSG91 has no official SDK — plain axios calls

# Validation
npm install class-validator class-transformer

# Dev tools
npm install -D typescript ts-node tsconfig-paths
npm install -D eslint prettier husky lint-staged tsc-files
npm install -D jest @nestjs/testing supertest
npm install -D @playwright/test    # shared E2E suite, Week 15
```

---

## 🧠 LEARNING GUIDE — For New Concepts

### TypeORM Multi-DataSource — In This Order

| Step | What to Learn | Where to Use |
|---|---|---|
| 1 | Single `DataSource` basics — `initialize()`, `getRepository()` | Public schema first |
| 2 | Same entities, different `schema` option per `DataSource` | `TenantDataSourceService` |
| 3 | `Map<slug, DataSource>` caching pattern | Week 2 core |
| 4 | Migrations per schema (`tenant-migrations/` run per tenant on provision) | Week 16 onboarding |

### BullMQ — In This Order

| Step | What to Learn | Where to Use |
|---|---|---|
| 1 | `Queue.add()` — basic job enqueue | Report + notification triggers |
| 2 | `@Processor` / `@Process` — worker definition | `report.processor.ts`, `notification.processor.ts` |
| 3 | Retry + backoff config | Notification sends (providers fail transiently) |
| 4 | Job priority / bypass-delay pattern | Critical value SMS (Week 9) |

### Socket.io Server — In This Order

| Step | What to Learn | Where to Use |
|---|---|---|
| 1 | `@WebSocketGateway`, `handleConnection` | Week 4 setup |
| 2 | Handshake `auth` payload → JWT verify | Security on connect |
| 3 | Rooms (`client.join()`, `server.to(room).emit()`) | Tenant isolation on real-time events |
| 4 | Dynamic CORS origin validation | Same tenant-origin rule as REST |

---

## ⚡ STANDARD MODULE TEMPLATE

Every domain module (tests, doctors, patients, bookings, etc.) follows this exact shape — copy it, don't reinvent per module:

```typescript
// src/modules/<domain>/<domain>.module.ts
@Module({
  imports: [TenantModule],
  controllers: [DomainController],
  providers: [DomainService, DomainRepository],
  exports: [DomainService],
})
export class DomainModule {}
```

```typescript
// src/modules/<domain>/<domain>.controller.ts
@ApiTags('domain')
@Controller('domain')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DomainController {
  constructor(private readonly service: DomainService) {}

  @Get()
  @Roles(Role.LabAdmin, Role.Receptionist)
  @ApiOperation({ summary: 'List domain items, paginated + searchable' })
  findAll(@Query() query: FindDomainDto, @CurrentTenant() ds: DataSource) {
    return this.service.findAll(ds, query);
  }

  @Post()
  @Roles(Role.LabAdmin)
  create(@Body() dto: CreateDomainDto, @CurrentTenant() ds: DataSource, @CurrentUser() user: User) {
    return this.service.create(ds, dto, user);
  }
}
```

**Standard Response Wrapper** (via `TransformInterceptor`, applied globally):
```json
{ "data": { /* payload */ }, "meta": { "page": 1, "total": 42 } }
```

**Standard Error Shape** (via `GlobalExceptionFilter`):
```json
{ "statusCode": 400, "message": "Validation failed", "errors": [{ "field": "email", "message": "must be a valid email" }] }
```

---

## 🚨 MISTAKES TO AVOID

| ❌ Wrong | ✅ Right | Why |
|---|---|---|
| New Puppeteer browser per PDF job | One browser instance, reused via pool | OOM-kills the container under load |
| `SELECT MAX()` for UID/booking-no generation | Postgres `SEQUENCE`, atomic | Race condition under concurrent writes |
| Trusting `X-Tenant-Slug` header alone | Cross-check against JWT `tenantSlug` claim | Header spoofing = cross-tenant data leak |
| Storing full Aadhaar number anywhere | `aadhaar_last4` only | Legal + security requirement |
| `UPDATE` or `deleted_at` on `audit_logs` | Append-only, no exceptions | Audit trail must be immutable |
| Computing `balanceAmount` as a stored column | Compute at query time: `total − discount − paid` | Avoids drift between stored and real value |
| Raw string concatenation in any query | TypeORM parameterized queries only | SQL injection |
| One shared rate-limit key across tenants | Key by `{tenantSlug}:{email}` | A block on one tenant must not affect another |
| Returning full booking object on `/verify/:code` | Redacted public summary only, no PII beyond what's needed | This endpoint has no auth |
| Skipping `SKIP LOCKED` / transactions on booking creation | Wrap booking + booking_tests + payment update in one transaction | Partial writes on failure = broken invoices |
| Generating fresh mock data for local frontend dev | Extend `npm run seed`, always | One source of realistic data, in this repo, not two |

---

## 📊 HOUR ALLOCATION

| Period | Weeks | Hrs/Week | Focus |
|---|---|---|---|
| Month 1 | 1–4 | 18–20 | Multi-tenancy, Auth, Queue/Socket foundation |
| Month 2 | 5–8 | 20–24 | Masters, Booking (heaviest) |
| Month 3 | 9–12 | 20–24 | Results, PDF, Notifications, MIS |
| Month 4 | 13–16 | 18–22 | Testing, Security, Performance, Launch |
| Buffer | 17–20 | 10–15 | Overflow, pilot feedback |

**Total: ~340–380 hrs over 20 weeks**

---

## 🔗 QUICK REFERENCE — API ENDPOINTS (Backend Implements)

| Module | Method | Endpoint | Consumed By (Frontend Plan) |
|---|---|---|---|
| Auth | POST | `/auth/login` | Login page |
| Auth | POST | `/auth/refresh` | Axios interceptor |
| Auth | POST | `/auth/logout` | Sidebar logout |
| Tests | GET | `/tests?page=&search=` | Tests list |
| Tests | GET | `/tests/search?q=` | BookingForm TestSelector |
| Tests | POST / PUT | `/tests`, `/tests/:id` | Test create/edit drawer |
| Tests | POST | `/tests/bulk-import` | CSV import modal |
| Doctors | GET/POST/PUT | `/doctors` | Doctor master |
| Patients | GET | `/patients/search?q=` | PatientAutocomplete |
| Patients | POST | `/patients` | Register patient |
| Patients | GET | `/patients/:id/history` | Patient history modal |
| Bookings | POST | `/bookings` | BookingForm submit |
| Bookings | GET | `/bookings?date=&status=` | Booking list |
| Bookings | DELETE | `/bookings/:id` | Cancel booking |
| Bookings | POST | `/bookings/:id/receipts` | Balance receipt |
| Results | GET | `/results/workload` | Workload dashboard |
| Results | POST | `/results/:bookingId` | Result entry |
| Reports | POST | `/reports/:bookingId/generate` | Generate button |
| Reports | GET | `/reports/:bookingId/status` | Status polling |
| Reports | GET | `/verify/:code` | Public verify page |
| Notifications | POST | `/notifications/:bookingId/resend` | Resend button |
| Lab Profile | GET/PUT | `/lab-profile` | Settings |
| Lab Profile | GET | `/lab-profile/logo-upload-url` | Logo upload |
| Users | GET/POST/PATCH | `/users`, `/users/:id/deactivate` | User management |
| MIS | GET | `/mis/day-collection?date=` | Day Collection |
| MIS | GET | `/mis/day-register?date=` | Day Register |
| MIS | GET | `/mis/day-collection/export?date=` | Excel export |
| Departments | GET/POST/PUT | `/departments` | Department master |
| Sample Types | GET/POST/PUT | `/sample-types` | Sample type master |
| Health | GET | `/health/queues` | Internal ops check |

---

*PathCare Labs Backend Execution Plan*
*Stack: NestJS · TypeORM (schema-per-tenant) · PostgreSQL 16 · Redis 7 · BullMQ · Puppeteer · Socket.io · Argon2id + JWT · MSG91 · Twilio · AWS S3*
*Generated: July 2026*
