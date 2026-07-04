# 🚀 Quick Start Guide — PathCare Backend Week 1

**Estimated Time to Run:** 10-15 minutes

## Prerequisites
- Node.js 20+ installed (`nvm use` if .nvmrc available)
- Docker and Docker Compose installed
- Git configured

---

## Step 1: Navigate to Project (2 min)

```bash
cd d:\WorkingZone\PathCareParent\Backend\PathoCareBackend
```

---

## Step 2: Install Dependencies (5 min)

```bash
npm install
```

✅ **Expected Output:**
```
added 700+ packages in 3m
```

---

## Step 3: Start Docker Services (3 min)

```bash
docker-compose up -d
```

✅ **Expected Output:**
```
✓ Network pathcare-network  Created
✓ Volume "pgdata"           Created
✓ Volume "redisdata"        Created
✓ Container pathcare-postgres   Started
✓ Container pathcare-redis      Started
✓ Container pathcare-api        Started
```

**Verify services are healthy:**
```bash
docker-compose ps
```

All services should show "healthy" status.

---

## Step 4: Verify Application (2 min)

```bash
# Check if API is running
curl http://localhost:3001/api/health

# Expected response:
# {"data":{"status":"OK","timestamp":"2026-07-04T...Z"}}
```

✅ **Expected Status:** 200 OK

---

## Step 5: Access Swagger Documentation (1 min)

Open browser: **http://localhost:3001/api-docs**

✅ **Expected:** Interactive Swagger UI with all endpoints listed

---

## Step 6: Seed Demo Tenant (2 min)

In a new terminal:

```bash
npm run seed
```

✅ **Expected Output:**
```
✅ Connected to public schema
🏗️  Creating demo tenant schema...
✅ Demo tenant created
✅ Demo schema created
📋 Creating audit_logs table...
✅ Audit logs table created
📬 Creating notification_logs table...
✅ Notification logs table created
✅ Seed completed successfully!
```

---

## Step 7: Start Development Server (Optional)

In a new terminal:

```bash
npm run start:dev
```

✅ **Expected Output:**
```
[Nest] 12345  - 07/04/2026, 10:30:00 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized
[Nest] 12345  - 07/04/2026, 10:30:01 AM     LOG [InstanceLoader] ConfigModule dependencies initialized
...
✅ PathCare API running on http://localhost:3001
📚 Swagger docs: http://localhost:3001/api-docs
🔗 OpenAPI JSON: http://localhost:3001/api-docs-json
```

---

## 🎯 Verification Checklist

- [x] `npm install` completes without errors
- [x] `docker-compose up -d` starts all services
- [x] PostgreSQL health check passes
- [x] Redis health check passes
- [x] `curl http://localhost:3001/api/health` returns 200
- [x] Swagger UI loads at http://localhost:3001/api-docs
- [x] `npm run seed` completes successfully
- [x] Linting passes: `npm run lint`
- [x] Type checking passes: `npm run typecheck`

---

## 📋 Common Commands

```bash
# Development
npm run start:dev          # Start dev server with watch

# Code Quality
npm run lint               # Run ESLint
npm run format             # Format with Prettier
npm run typecheck          # TypeScript strict check

# Testing
npm run test               # Run Jest
npm run test:cov          # Coverage report

# Database
npm run seed              # Run seed script

# Docker
docker-compose up -d      # Start services
docker-compose down       # Stop services
docker-compose logs -f    # View logs
docker-compose ps         # Status
```

---

## 🐛 Troubleshooting

### Port 3001 already in use
```bash
docker-compose down
# OR
lsof -ti:3001 | xargs kill -9
npm run start:dev
```

### Database connection error
```bash
docker-compose down -v     # Remove volumes
docker-compose up -d       # Restart fresh
npm run seed              # Re-seed
```

### Node modules issues
```bash
rm -rf node_modules
npm cache clean --force
npm install
```

### Docker can't connect to daemon
- Ensure Docker Desktop is running
- On Windows: Use WSL 2 backend for Docker Desktop

---

## 📚 Next Steps (Week 2)

Once verified:
1. Push to GitHub: `git add . && git commit -m "Week 1: Foundation" && git push`
2. Verify CI passes on GitHub
3. Plan Week 2: Multi-tenancy core

---

## 🔗 Important Files to Review

| File | Purpose |
|------|---------|
| `README.md` | Project overview |
| `WEEK1_COMPLETION.md` | Detailed completion report |
| `.env` | Local env vars |
| `docker-compose.yml` | Docker setup |
| `.github/workflows/ci.yml` | CI/CD pipeline |
| `src/database/seeds/index.ts` | Seed script |

---

## ✅ Setup Complete!

Your PathCare backend is ready for development.

**Current Status:**
- ✅ Project initialized
- ✅ Docker configured
- ✅ CI/CD pipeline ready
- ✅ Database schema created
- ✅ Swagger documentation live

**Ready for:** Week 2 Multi-tenancy implementation

---

*Generated: July 4, 2026*  
*Duration: ~15 minutes*  
*Next Review: Week 2 start*
