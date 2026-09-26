# SWEAT / PerformanceOS — Deployment Engineer Seed & Setup Runbook

> **Target Audience:** DevOps / SRE / Cloud Deployment Engineers  
> **Platform Version:** Enterprise Multi-Tenant (Phase 1 Layer 1)  
> **Backend Framework:** Django 5.x / Django REST Framework / PostgreSQL  
> **Frontend:** Vite + React + TanStack Router (Port 5173 / Production Build)

---

## 1. Quick Start: One-Command Deployment Seeding

To run all database migrations and seed the complete product catalog, platform superadmin, primary production tenant, granular RBAC permissions, and starter packages:

### Option A — Django CLI (Recommended)
```bash
cd backend
python manage.py migrate
python manage.py seed_deployment
```

### Option B — Linux / Docker / Kubernetes Container
```bash
./scripts/seed_production.sh
```

### Option C — Windows PowerShell
```powershell
.\scripts\seed_production.ps1
```

### Option D — Standalone Python Script
```bash
python backend/scripts/deploy_seed.py
```

> **Note on Idempotency:** The command is 100% idempotent. It is completely safe to run multiple times in CI/CD deployment pipelines, Kubernetes release jobs, or post-migration hooks without creating duplicates or breaking relations.

---

## 2. Seeded Accounts & Credentials Summary

Save these initial credentials securely for deployment sign-off:

| Portal / Role | Email / Identifier | Initial Password | Tenant Slug | Destination URL |
| :--- | :--- | :--- | :--- | :--- |
| **Platform Superadmin** *(Master Control Plane)* | `admin.local@platform.local` | `PlatformAdmin@123!` | *N/A (Global)* | `http://<domain>:8000/admin/` |
| **Tenant Administrator** *(Org Managing Director)* | `admin@sweat.com` | `SweatAdmin@123!` | `sweat` | `http://<domain>:5173/login` |
| **Front Desk Staff** | `frontdesk@sweat.com` | `FrontDesk@123!` | `sweat` | `http://<domain>:5173/login` |
| **Sales & CRM Representative** | `sales@sweat.com` | `SalesRep@123!` | `sweat` | `http://<domain>:5173/login` |
| **Fitness Trainer / Head Coach** | `trainer@sweat.com` | `Trainer@123!` | `sweat` | `http://<domain>:5173/login` |

---

## 3. Customizing Deployment Parameters (CLI Flags)

The seeder accepts parameters to configure environment-specific credentials and tenant details:

```bash
python manage.py seed_deployment \
  --platform-email="sre-admin@company.com" \
  --platform-password="StrongProdPassword#2026!" \
  --tenant-name="SWEAT Fitness" \
  --tenant-slug="sweat" \
  --admin-email="operations@sweat.com" \
  --admin-password="StrongTenantAdminPassword#2026!"
```

### Supported Parameters

| Flag | Default Value | Description |
| :--- | :--- | :--- |
| `--platform-email` | `admin.local@platform.local` | Platform master superadmin email |
| `--platform-password` | `PlatformAdmin@123!` | Platform master superadmin password |
| `--tenant-name` | `SWEAT` | Commercial gym brand name |
| `--tenant-slug` | `sweat` | Tenant identifier slug for routing & subdomain |
| `--admin-email` | `admin@sweat.com` | Primary Tenant Administrator email |
| `--admin-password` | `SweatAdmin@123!` | Primary Tenant Administrator password |
| `--reset-passwords` | `True` | Forces password synchronization for seeded accounts |
| `--skip-packages` | `False` | Skips seeding starter programs & membership packages |

---

## 4. What the Deployment Seeder Executes

The seeder automates 7 critical deployment phases:

1. **Master DB Product Catalog (`apps/master/`)**:
   - Seeds Resource Metrics: Active Members, Locations, Active Users, Storage (MB), AI Voice Minutes, API Requests.
   - Seeds 15 Core & Add-on Product Modules and 78 Submodules (CRM, Memberships, POS, Scheduling, Analytics, Workforce, etc.).
   - Seeds SaaS Subscription Plans: Starter Studio (`PLAN-STARTER`), Growth Multi-Studio (`PLAN-GROWTH`), Enterprise Chain (`PLAN-ENTERPRISE`).
   - Seeds Marketplace Integrations: WhatsApp Business Cloud API, Razorpay, Stripe, Zoom, Google Calendar.
   - Seeds Platform IAM Roles & Permissions (`SUPER_ADMIN`, Support Lead, Billing Specialist).

2. **Platform IAM Superadmin**:
   - Ensures superuser account exists with full administrative privileges.

3. **Master Tenant Record & Subscription**:
   - Creates/activates tenant record `SWEAT` (`slug=sweat`).
   - Registers primary domain (`sweat.performanceos.io`) and local development domain (`localhost`).
   - Activates Enterprise SaaS plan subscription.

4. **Tenant Database & RBAC Synchronization**:
   - Resolves tenant database (`TenantDataSource`) and registers dynamic connection pool.
   - Applies all tenant migrations via `migrate_all_tenants`.
   - Idempotently syncs 15 modules, 78 submodules, and 303 permissions into the tenant DB.
   - Synchronizes canonical default permission templates for 7 system roles (`ORG_ADMIN`, `BRANCH_MANAGER`, `FRONT_DESK`, `TRAINER`, `MEMBER`, `SALES_REP`, `FINANCE_ADMIN`).

5. **Tenant Organizational Topology**:
   - Organization: `SWEAT International` (`code=ORG-SWEAT`)
   - Location: `Flagship Center` (`code=LOC-MAIN`)
   - Branch: `Downtown Flagship` (`code=BR-FLAGSHIP`)
   - Organization & Branch Settings (operating hours `06:00:00` - `22:00:00`, currency `INR`, timezone `Asia/Kolkata`).

6. **Staff & Administrative Accounts**:
   - Generates staff user accounts, links them to the flagship branch, assigns RBAC role assignments, and creates user profiles.

7. **Starter Programs & Membership Packages**:
   - Program: `General Gym & Strength Access` (`PROG-GYM`)
   - Program: `Group Studio & Functional Training` (`PROG-GROUP`)
   - Package: `Annual VIP All-Access Membership` (₹29,999 / 12 Months)
   - Package: `Monthly Unlimited Fitness Pass` (₹3,499 / 1 Month)
   - Package: `10-Class Group Studio Pack` (₹4,999 / 90 Days)
   - Package: `Single Day Guest Pass` (₹500 / 1 Day)
   - Publishes package versions, tax-inclusive prices (18% GST), and branch availability.
   - Seeds CRM Lead Sources: Walk-in, Website, Instagram, Referral, Corporate.

---

## 5. Deployment Verification Checklist

After running the seeder, execute these verification checks:

### 1. Test Platform Admin Authentication (Master DB)
```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin.local@platform.local", "password": "PlatformAdmin@123!"}'
```
*Expected response: HTTP 200 with JWT `access` & `refresh` tokens and `user_type: "platform"`.*

### 2. Test Tenant Admin Authentication (Tenant DB)
```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@sweat.com", "password": "SweatAdmin@123!", "tenant_slug": "sweat"}'
```
*Expected response: HTTP 200 with JWT tokens, tenant details, and `user_type: "tenant"`.*

### 3. Verify Background Celery Worker
Ensure Celery worker is active to process background tasks (audit outbox, notifications, trial SLAs):
```bash
celery -A config worker -l INFO
```

---

## 6. Environment Configuration Requirements (.env)

Ensure the following environment variables are configured in production:

```ini
# Django Core
SECRET_KEY=<strong-random-secret-key>
DEBUG=False
ALLOWED_HOSTS=api.performanceos.io,localhost,127.0.0.1

# Database - Master Control Plane
DATABASE_URL=postgres://<db_user>:<db_password>@<db_host>:5432/fitness_master

# Multi-Tenant Database Provisioning User (Needs CREATEDB privilege)
TENANT_PROVISION_DB_USER=<db_user>
TENANT_PROVISION_DB_PASSWORD=<db_password>
TENANT_PROVISION_DB_HOST=<db_host>
TENANT_PROVISION_DB_PORT=5432

# Redis & Celery
REDIS_URL=redis://<redis_host>:6379/0
CELERY_BROKER_URL=redis://<redis_host>:6379/0

# CORS & CSRF
CORS_ALLOWED_ORIGINS=https://app.performanceos.io,https://sweat.performanceos.io
CSRF_TRUSTED_ORIGINS=https://app.performanceos.io,https://sweat.performanceos.io
```
