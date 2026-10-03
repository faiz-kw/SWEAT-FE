# Meta Lead Ads Production Deployment & Operational Runbook

This document details the configuration, security controls, multi-tenant architecture, worker requirements, migration procedures, and verification protocols for deploying the Meta (Facebook & Instagram) Lead Ads integration across the platform.

---

## 1. Architecture & Security Model

The integration is built upon the platform's Layer 1 (Control Plane / Master DB) and Layer 2 (Tenant Core DB) multi-tenant architecture.

### Database Separation
1. **Control Plane (`master_meta_page_registry`):**
   - Stores authoritative mapping of external Facebook `page_id` to platform `tenant_id`.
   - Used for $O(1)$ constant-time, tamper-proof routing of incoming webhooks to the correct isolated tenant database.
   - **Zero untrusted resolution:** Webhooks never accept tenant IDs or database names from request headers or query strings.
2. **Tenant Core (`tenant_sweat_uat` / per-tenant schema):**
   - `meta_connections`: Tenant-scoped OAuth connection metadata.
   - `meta_page_connections`: Subscribed Facebook Pages for the tenant.
   - `meta_lead_mappings`: Field matchings, branch routing, and lifecycle automation rules.
   - `meta_lead_imports`: Durable event log storing live and simulator lead payloads, deduplication records, and processing states.

### Cryptographic Security & Zero Token Exposure
- **Fernet Symmetric Encryption:** All Meta Graph API access tokens (Page Access Tokens, User Access Tokens) are encrypted at rest using AES-128 in CBC mode with HMAC-SHA256 authenticated encryption (`apps/tenant_core/meta_crypto.py`).
- **Zero Plaintext Storage:** Plaintext tokens are NEVER stored in PostgreSQL.
- **UI & API Masking:** Frontend APIs and serializers only expose masked tokens (e.g. `EAAB...8765`).
- **Zero Log Leakage:** Token patterns are sanitized from all logger messages and exception traces before logging.
- **HMAC-SHA256 Webhook Verification:** Every incoming POST webhook payload is cryptographically validated against `X-Hub-Signature-256` using `META_APP_SECRET`. Unsigned or tampered requests fail closed with HTTP 403 Forbidden.

---

## 2. Environment Variables & Platform Configuration

Ensure the following environment variables are securely injected into the backend application container and Celery worker environment:

| Variable Name | Required | Description | Example / Notes |
| :--- | :--- | :--- | :--- |
| `META_APP_ID` | **Yes** | Facebook Developer App ID | `1089273645019283` |
| `META_APP_SECRET` | **Yes** | Facebook Developer App Secret | High entropy 32-char hex string |
| `META_WEBHOOK_VERIFY_TOKEN` | **Yes** | Shared secret for Meta Webhook GET challenge verification | High entropy random string (min 32 chars) |
| `META_TOKEN_ENCRYPTION_KEY` | **Yes** | Fernet key for encrypting OAuth tokens in PostgreSQL | 32-byte URL-safe base64 string (`Fernet.generate_key()`) |
| `META_GRAPH_API_VERSION` | No | Graph API version | Default: `v22.0` |

> [!NOTE]
> To generate a secure `META_TOKEN_ENCRYPTION_KEY`:
> ```python
> from cryptography.fernet import Fernet
> print(Fernet.generate_key().decode('utf-8'))
> ```

---

## 3. Meta Developer App Configuration (One-Time Platform Setup)

A Meta App Administrator must complete these steps in [Meta for Developers](https://developers.facebook.com/apps):

1. **Create / Configure Business App:**
   - App Type: **Business**
   - Connect the app to your verified **Meta Business Account**.
2. **Add Products:**
   - **Facebook Login for Business**
   - **Webhooks**
3. **Configure Facebook Login for Business:**
   - Client OAuth Login: `Yes`
   - Web OAuth Login: `Yes`
   - Enforce HTTPS: `Yes`
   - **Valid OAuth Redirect URIs:**
     ```text
     https://<your-domain>/api/v1/tenant/meta-lead-mappings/oauth_callback/
     https://<your-domain>/crm/settings
     ```
4. **Configure Webhook Subscription:**
   - Product: **Webhooks**
   - Topic: `Page`
   - Callback URL:
     ```text
     https://<your-domain>/api/v1/webhooks/meta/leads/
     ```
   - Verify Token: Exact string matching `META_WEBHOOK_VERIFY_TOKEN`.
   - Fields Subscribed: **`leadgen`**
5. **Request App Review / Permissions:**
   - `pages_show_list`: To discover customer Facebook Pages.
   - `leads_retrieval`: To fetch lead form responses and ad attribution.
   - `pages_manage_metadata`: To subscribe pages to the app's webhooks.

---

## 4. Tenant Onboarding Workflow (Per-Tenant)

Once the platform Meta App is configured, any tenant (e.g. SWEAT) connects via their own authorised dashboard:

1. **Connect Account:**
   - Navigate to **CRM Settings → Meta Lead Ads Integration**.
   - Click **Connect Meta Account** → Log in as the Facebook Page admin and grant requested permissions.
   - The platform securely exchanges the authorization code for a 60-day long-lived access token, encrypts it with Fernet, and registers the tenant's managed Pages in `master_meta_page_registry`.
2. **Choose Page & Form:**
   - Click **+ Add Form Mapping**.
   - Select discovered Facebook Page and Lead Form from dropdown.
3. **Match Fields:**
   - Questions in the selected Meta form are automatically discovered.
   - Match questions to CRM destination fields (`full_name`, `email`, `phone`, `city`, etc.).
   - Name and Contact (Email or Phone) are strictly required. Disallowed defaults (identity or consent invention) are blocked.
4. **Configure Routing & Salesperson:**
   - Select **Fixed Branch** or **Answer-Based Routing** (e.g., routing based on preferred club location).
   - Set fallback branch policy (`HOLD` or `FALLBACK_BRANCH`).
   - Assign salesperson via tenant round-robin policy or specific sales representative.
5. **Configure Follow-up & Rules:**
   - Select initial stage (e.g. `NEW_LEAD`).
   - Enable automatic follow-up task generation (e.g., Phone Call due within 24h).
   - Set repeat policy (`REVIEW` to flag existing contacts or `CREATE_NEW`).
6. **Acceptance Testing:**
   - Use the built-in **Development Simulator** to verify routing without ad spend.
   - Use the official [Meta Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing) to verify live webhook delivery.
7. **Enable Live:**
   - Toggle mapping to Active. Incoming leads now automatically create CRM leads, attribution, and follow-up tasks.

---

## 5. Background Worker & Celery Architecture

Webhooks follow a durable **Fast-Ingest / Async-Process** architecture:

1. **Ingress (HTTP 200 OK under 100ms):**
   - Webhook view validates HMAC-SHA256 signature.
   - Resolves tenant from `MetaPageRegistry`.
   - Durably writes raw event to `meta_lead_imports` with `status='PENDING'`.
   - Emits Celery background task: `apps.tenant_core.tasks_meta_leads.process_meta_lead_import_task(tenant_id, import_id)`.
   - Returns instant HTTP 200 to Meta.
2. **Worker Processing:**
   - Decrypts Page Access Token using Fernet.
   - Calls Meta Graph API (`GET /{leadgen_id}`) to retrieve form answers and campaign attribution hierarchy.
   - Ingests into CRM via `process_live_import`.
3. **Retry Strategy & Backoff:**
   - **Rate Limits (Meta error 429 / 1349193):** Celery retries with exponential backoff (`countdown = 2 ** retries * 60`).
   - **Token Expiry (Meta error 190):** Fail-closed immediately without retrying. Marks connection as `TOKEN_EXPIRED` and triggers operational alert.
   - **Duplicate Deliveries:** Guarded by unique constraint `(page_id, external_lead_id)` on `meta_lead_imports`. Duplicates are acknowledged without side effects.

---

## 6. Migration & Deployment Runbook

### Step 1: Run Control Plane Migrations
```bash
cd /path/to/backend
python manage.py migrate master
```
*Verifies: `0030_meta_page_registry` applied.*

### Step 2: Run Tenant Core Migrations Across Active Tenants
```bash
# For SWEAT UAT / Production:
python manage.py migrate tenant_core --database=tenant_sweat_uat
```
*Verifies: `0050_meta_connection_and_live_imports` applied.*

### Step 3: Run Automated Verification Suite
```bash
# Verify unit and integration test suites:
python manage.py test tests.test_meta_lead_development tests.test_meta_lead_live_integration --settings=config.settings_meta_tests

# Verify PostgreSQL runtime against active tenant database:
python scripts/verify_meta_integration.py
```
*Expected: 49/49 tests pass, 23/23 PostgreSQL runtime checks pass.*

### Step 4: Verify Frontend Build
```bash
npm run build
```
*Expected: Clean compilation with 0 TypeScript/Vite errors.*

### Step 5: Webhook Health Check Verification
Send a GET request to the webhook endpoint:
```bash
curl -I -X GET "https://<your-domain>/api/v1/webhooks/meta/leads/?hub.mode=subscribe&hub.verify_token=<META_WEBHOOK_VERIFY_TOKEN>&hub.challenge=test_12345"
```
*Expected: HTTP 200 with body `test_12345`.*

---

## 7. Rollback Procedures

If an operational rollback is required:

1. **Emergency Webhook Deactivation:**
   - In Meta for Developers, navigate to **Webhooks → Page → leadgen** and click **Unsubscribe**.
   - No new live webhooks will be dispatched to the server.
2. **Pause Tenant Mappings:**
   - Administrators can pause form mappings from the UI (`is_active = False`), which halts intake without data loss.
3. **Database Migration Rollback:**
   ```bash
   # Rollback tenant schema to prior state (0049):
   python manage.py migrate tenant_core 0049_previous_migration --database=tenant_sweat_uat

   # Rollback master schema:
   python manage.py migrate master 0029_previous_migration
   ```
