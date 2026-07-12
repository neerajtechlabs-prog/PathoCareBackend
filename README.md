# PathCare Labs Backend API

This repository is the NestJS backend for the PathCare lab management platform. It is meant to be easy for a new teammate to clone, run locally, and understand the basics of the architecture.

## 🚀 New Joinee Setup Guide

Use this section in order. It is the shortest path from a fresh machine to a running local backend.

### 1. Prerequisites
Make sure the following are installed and working:
- Node.js 20.x (the repo includes an .nvmrc file)
- Docker Desktop and Docker Compose
- Git
- A terminal such as PowerShell, Git Bash, or VS Code terminal

If you use nvm, run:
```bash
nvm use
```

### 2. Open the backend folder
From the workspace root:
```bash
cd Backend/PathoCareBackend
```

### 3. Install dependencies
```bash
npm install
```

If this is the first time on the machine, it may take a few minutes. Wait for it to finish successfully before moving on.

### 4. Create your local environment file
```bash
cp .env.example .env
```

Then review the file and keep the defaults unless you know you need to change them. The local Docker setup already uses the database host names and ports from the example file.

### 5. Start the local infrastructure
Make sure Docker Desktop is already running, then start the containers:
```bash
docker compose up -d
```

Check that the services are healthy:
```bash
docker compose ps
```

You want to see PostgreSQL and Redis as running/healthy before continuing.

### 6. Seed demo data
In a new terminal (or after the containers are up), run:
```bash
npm run seed
```

This creates the demo tenant and sample data needed for local development.

### 7. Start the backend server
```bash
npm run start:dev
```

The API should start on:
- Health check: http://localhost:3001/health
- Swagger UI: http://localhost:3001/api-docs
- OpenAPI JSON: http://localhost:3001/api-docs-json

### 8. Verify that everything is working
Open the following in your browser or terminal:
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{"data":{"status":"OK"}}
```

You can also open Swagger at http://localhost:3001/api-docs and confirm the docs load.

## ✅ First Checks for a New Developer
Run these once the app is up:
```bash
npm run build
npm run typecheck
npm run test:contract
```

These commands help confirm that the backend still compiles and the core API flow is working.

## 🧰 Common Commands
```bash
# Development
npm run start:dev

# Build and type checking
npm run build
npm run typecheck

# Testing
npm run test
npm run test:contract

# Database seeding
npm run seed

# Docker
docker compose up -d
docker compose down
docker compose logs -f
```

## 🛠 Troubleshooting

### Docker containers do not start
- Make sure Docker Desktop is running.
- Check the logs with:
```bash
docker compose logs -f
```

### Port 3001 is already in use
Stop the process using the port or change the API port in the environment file.

### Database connection errors
Try restarting the containers and reseeding:
```bash
docker compose down -v
docker compose up -d
npm run seed
```

### Dependencies look broken
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📦 Project Structure

```
src/
├── main.ts                          # Application entry point
├── app.module.ts                    # Root module
├── app.controller.ts                # Root controller
├── app.service.ts                   # Root service
│
├── common/
│   ├── filters/
│   │   └── global-exception.filter.ts
│   ├── interceptors/
│   │   └── transform.interceptor.ts
│   ├── guards/
│   │   └── (roles, jwt guards - Week 3+)
│   ├── pipes/
│   │   └── (validation pipes - Week 3+)
│   └── decorators/
│       └── (custom decorators - Week 3+)
│
├── database/
│   ├── database.module.ts
│   ├── datasources/
│   │   ├── public.datasource.ts     # Shared public schema connection
│   │   └── tenant.datasource.ts     # Multi-tenant schema factory
│   ├── entities/
│   │   ├── public/                  # Shared entities (Tenant, Subscription, AuditLog)
│   │   └── tenant/                  # Tenant-specific entities (Patient, Doctor, Booking, etc.)
│   ├── migrations/
│   │   ├── public/                  # Migrations for public schema
│   │   └── tenant/                  # Migrations for tenant schemas
│   └── seeds/
│       └── index.ts                 # Seed script entry point
│
├── modules/
│   ├── auth/                        # Week 3: Authentication
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── local.strategy.ts
│   │   └── dtos/
│   │
│   ├── tenant/                      # Week 2: Multi-tenancy core
│   │   ├── tenant.module.ts
│   │   ├── tenant.controller.ts
│   │   ├── tenant.service.ts
│   │   └── dtos/
│   │
│   ├── users/                       # Week 3: User management
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.repository.ts
│   │   └── dtos/
│   │
│   ├── patients/                    # Week 6: Patient management
│   │   ├── patients.module.ts
│   │   ├── patients.controller.ts
│   │   ├── patients.service.ts
│   │   ├── patients.repository.ts
│   │   └── dtos/
│   │
│   ├── doctors/                     # Week 6: Doctor master
│   │   ├── doctors.module.ts
│   │   ├── doctors.controller.ts
│   │   ├── doctors.service.ts
│   │   └── dtos/
│   │
│   ├── tests/                       # Week 5: Test catalog
│   │   ├── tests.module.ts
│   │   ├── tests.controller.ts
│   │   ├── tests.service.ts
│   │   ├── tests.repository.ts
│   │   └── dtos/
│   │
│   ├── bookings/                    # Weeks 7-8: Booking screen
│   │   ├── bookings.module.ts
│   │   ├── bookings.controller.ts
│   │   ├── bookings.service.ts
│   │   ├── bookings.repository.ts
│   │   └── dtos/
│   │
│   ├── results/                     # Week 9: Result entry & workload
│   │   ├── results.module.ts
│   │   ├── results.controller.ts
│   │   ├── results.service.ts
│   │   └── dtos/
│   │
│   ├── reports/                     # Weeks 10-11: PDF generation & delivery
│   │   ├── reports.module.ts
│   │   ├── reports.controller.ts
│   │   ├── reports.service.ts
│   │   └── pdf/
│   │       ├── pdf-generator.service.ts
│   │       └── templates/
│   │           └── pathology-report.hbs
│   │
│   ├── notifications/               # Weeks 11+: SMS/WhatsApp/Email
│   │   ├── notifications.module.ts
│   │   ├── notifications.controller.ts
│   │   ├── notifications.service.ts
│   │   ├── providers/
│   │   │   ├── msg91.provider.ts
│   │   │   ├── twilio.provider.ts
│   │   │   └── ses.provider.ts
│   │   └── queues/
│   │
│   ├── lab-profile/                 # Week 4: Lab configuration
│   │   ├── lab-profile.module.ts
│   │   ├── lab-profile.controller.ts
│   │   ├── lab-profile.service.ts
│   │   └── dtos/
│   │
│   ├── health/                      # Week 1: Health checks
│   │   ├── health.module.ts
│   │   ├── health.controller.ts
│   │   └── health.service.ts
│   │
│   ├── mis/                         # Week 12: Management info system
│   │   ├── mis.module.ts
│   │   ├── mis.controller.ts
│   │   └── mis.service.ts
│   │
│   └── realtime/                    # Week 4: Socket.io
│       ├── realtime.module.ts
│       ├── events.gateway.ts
│       └── realtime.service.ts
│
├── services/
│   ├── database/
│   │   └── (database utilities, migrations)
│   ├── cache/
│   │   └── redis.service.ts
│   ├── storage/
│   │   └── s3.service.ts
│   ├── queue/
│   │   └── (BullMQ queue definitions)
│   └── (other domain services)
│
├── config/
│   ├── database.config.ts
│   ├── jwt.config.ts
│   └── (other configs)
│
├── utils/
│   ├── decorators/
│   ├── helpers/
│   ├── validators/
│   └── (utility functions)
│
└── types/
    ├── index.ts
    └── (TypeScript type definitions)
```

## 📋 Weekly Milestones

| Week | Focus | Status |
|------|-------|--------|
| 1 | Project setup, Docker, CI, Public schema | ✅ Today |
| 2 | Multi-tenancy core, TenantDataSourceService, Swagger | ⏳ Next |
| 3 | Authentication, password hashing, RBAC, audit logging | ⏳ Later |
| 4 | Lab config, BullMQ, Socket.io, first CRUD masters | ⏳ Later |
| 5 | Test catalog, search, CSV import | ⏳ Later |
| 6 | Doctor master, patient registration, UID generation | ⏳ Later |
| 7-8 | Booking screen (most complex), barcodes, QR, transactions | ⏳ Later |
| 9 | Result entry, critical value alerts, workload dashboard | ⏳ Later |
| 10 | PDF report generation, Puppeteer, templates | ⏳ Later |
| 11 | WhatsApp/SMS delivery, notification logs | ⏳ Later |
| 12 | MIS reports, day collection, Excel export | ⏳ Later |
| 13 | Integration testing, N+1 audit, OpenAPI codegen | ⏳ Later |
| 14 | Security hardening, rate limiting, input validation | ⏳ Later |
| 15 | Performance tuning, load testing, QA | ⏳ Later |
| 16 | Production launch, self-service onboarding | ⏳ Later |
| 17-20 | Buffer + stabilization | ⏳ Later |

## 🔌 API Documentation

### Live Swagger Docs
- **Local:** http://localhost:3001/api-docs
- **Production:** https://api.pathcare.com/api-docs (Week 16+)

### OpenAPI JSON (for frontend codegen)
- http://localhost:3001/api-docs-json

## 🛠 Available Scripts

```bash
# Development
npm run start:dev        # Watch mode development server
npm run start:debug      # Debug mode

# Production
npm run build            # Compile TypeScript
npm run start:prod       # Run compiled JavaScript

# Code quality
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run typecheck        # Run TypeScript strict check

# Testing
npm run test             # Run Jest tests
npm run test:watch       # Watch mode tests
npm run test:cov         # Coverage report
npm run test:e2e         # Run E2E tests (Playwright)

# Database
npm run seed             # Run seed scripts

# Docker
docker-compose up        # Start all services
docker-compose down      # Stop all services
docker-compose logs -f   # View logs
```

## 🗂 Key Design Decisions (Locked)

| # | Decision | Choice | Reason |
|---|----------|--------|--------|
| 1 | Framework | **NestJS + TypeScript (strict)** | Modular, DI-first, official TypeORM + Swagger integration |
| 2 | ORM | **TypeORM + TenantDataSource Map** | Schema-per-tenant isolation, connection pool per tenant |
| 3 | Auth | **JWT (15m access + 7d refresh, httpOnly cookies)** | Works across subdomains, secure by default |
| 4 | Tenant resolution | **`X-Tenant-Slug` header + JWT validation** | Frontend reads hostname, backend never trusts header alone |
| 5 | Queue | **BullMQ (Redis-backed)** | Report generation + notifications, both async, both need retry |
| 6 | PDF engine | **Puppeteer**, singleton browser pool | Full HTML/CSS control, QR + watermark trivial |
| 7 | Real-time | **Socket.io**, JWT on handshake, tenant rooms | Live workload dashboard, report-ready pings |
| 8 | API docs | **@nestjs/swagger** → `GET /api-docs-json` | Single source of truth, frontend codegen ready |
| 9 | Notifications | **MSG91 (SMS)** + **Twilio (WhatsApp)** + **AWS SES (email, optional)** | India-first, DLT compliant |
| 10 | File storage | **AWS S3**, presigned URLs only | Reports/logos never public |
| 11 | Dev environment | **Docker Compose** (Postgres 16 + Redis 7) | Zero AWS cost during development |
| 12 | Production | **AWS EC2 t3.medium + RDS + ElastiCache** | Predictable cost, scales to ECS later |

## 📚 Next Steps (Week 2)

- [ ] Run `npm install` and verify no errors
- [ ] Start Docker Compose: `docker-compose up -d`
- [ ] Verify PostgreSQL + Redis health checks pass
- [ ] Start dev server: `npm run start:dev`
- [ ] Visit http://localhost:3001/api-docs
- [ ] Visit http://localhost:3001/health
- [ ] Run linter + type check: `npm run lint && npm run typecheck`
- [ ] Push to GitHub and verify CI workflow passes

## 🔗 Related Documents

- **Frontend Plan:** See `FrontEnd/PathoCare-FrontEnd/docs/PathCare_Frontend_Execution_Plan_SignleRepo.md`
- **Master Plan:** See `docs/PathCare_SaaS_Master_Plan_v3.md` (reference only, superseded by this plan)

---

**Built for PathCare Labs — India's Healthcare SaaS Platform**

*Week 1 Complete: Foundation Ready ✅*
