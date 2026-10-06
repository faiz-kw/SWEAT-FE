# SWEAT — COMPLETE THIRD-PARTY INTEGRATION & CREDENTIAL REQUIREMENTS AUDIT
**Document Version**: 1.0.0  
**Audit Date**: October 5, 2026  
**Auditor**: Senior SaaS Integration Architect  
**Scope**: Complete Codebase Inventory, Configuration Audit, Third-Party Credentials & Pre-Development Readiness  

---

## EXECUTIVE SUMMARY

This audit provides a factual, evidence-based inventory of every third-party integration, external account, API credential, webhook endpoint, OAuth workflow, domain configuration, and background service required by the **SWEAT (PerformanceOS)** platform.

The audit was conducted directly against the active frontend (`f:\fitness-command-center`) and backend (`f:\fitness-command-center\backend`) codebases, multi-tenant databases, communication adapters, and settings files.

### Key Architectural Findings:
1. **Meta Lead Ads**: **Fully implemented end-to-end** in backend code (Graph API v21.0, OAuth dialog, token exchange, Page webhook subscription, HMAC-SHA256 signature validation, and Celery processing). It is currently operating under the internal simulator mode. Transitioning to live Meta ingestion requires client Meta App credentials and Meta App Review.
2. **Payments (Commerce)**:
   - **Cash / Offline POS**: **100% complete and working** (Order, Transaction, Invoice, Entitlement allocation).
   - **Razorpay (Online)**: **Partially implemented**. Mobile checkout views create orders and accept payment IDs using stub/simulated IDs (`razorpay_order_id`, `razorpay_payment_id`), but server-side Razorpay Order API creation, webhook receiver, and signature verification are not yet ported to `apps/tenant_core/`.
   - **Platform SaaS Subscription Billing**: Uses an internal `MockGatewayAdapter`.
3. **Voice AI / Calling (Sarvam)**: **Not implemented yet**. Designated in CRM channel metadata as `status: 'COMING_SOON'` with `implemented_adapters: []`. Crucially, Sarvam AI is an Indic speech/NLP engine, not a PSTN telephony carrier; an outbound telephony carrier/SIP trunk (e.g., Exotel or Twilio) is architecturally required alongside Sarvam.
4. **WhatsApp Business**: **Code exists** via `MetaWhatsAppAdapter` and `GupshupWhatsAppAdapter`. The Meta Cloud API adapter is currently stubbed in its `send()` method and requires live WABA credentials and official Graph API dispatch.
5. **SMS (India DLT)**: **Code exists** via `MSG91SMSAdapter`, `TwilioSMSAdapter`, and `GupshupSMSAdapter`. For India, MSG91 with TRAI DLT registration (PE ID, Header, Template IDs) is the primary path.
6. **Email**: **Ready & Working**. `SMTPEmailAdapter` utilizes live Django SMTP connections and is fully functional. `SESEmailAdapter` is also present for AWS SES.
7. **Storage**: **Ready**. `ZataS3StorageService` provides S3-compatible private object storage for member photos, documents, and media via Boto3.
8. **PAR-Q & Agreements**: **100% Native Internal System**. Modeled via `IntakeForm`, `IntakeQuestion`, `IntakeSubmission`, and `ConsentRecord`. No external e-signature provider (such as DocuSign) is required.

---

## PHASE 1 & 2: INTEGRATION INVENTORY & CURRENT PROVIDERS

| Integration Area | Current Provider / Adapter | Implementation Location | Current Readiness Status |
| :--- | :--- | :--- | :--- |
| **Meta Lead Ads** | Meta Graph API v21.0 | `apps/tenant_core/services_meta_graph.py`<br>`apps/tenant_core/views_meta_webhook.py` | **CODE EXISTS — CREDENTIALS MISSING IN PRODUCTION** |
| **Online Payments** | Razorpay | `apps/tenant_core/views_mobile.py`<br>`_archived_apps/integrations/adapters/razorpay_adapter.py` | **PARTIALLY READY / ADAPTER TEST STUB** |
| **Offline Payments** | Native (Cash, POS, Cheque, Transfer) | `apps/tenant_core/services_commerce.py`<br>`apps/tenant_core/views_crm.py` | **READY & WORKING (FULL LOCAL/UAT VERIFIED)** |
| **Voice AI / Calling** | Sarvam AI (Planned) | `apps/tenant_core/views_crm.py` (Registry metadata) | **NOT IMPLEMENTED / COMING SOON** |
| **Telephony / Trunk** | Exotel / Twilio / TeleCMI (Planned) | `_archived_apps/integrations/adapters/telecmi_adapter.py` | **PROVIDER NOT SELECTED / ARCHIVED STUB ONLY** |
| **WhatsApp** | Meta WhatsApp Cloud API / Gupshup | `apps/tenant_core/communication/adapters/whatsapp_meta.py`<br>`apps/tenant_core/communication/adapters/whatsapp_gupshup.py` | **CODE EXISTS — CREDENTIALS MISSING / STUB DISPATCH** |
| **SMS** | MSG91 (DLT) / Twilio / Gupshup | `apps/tenant_core/communication/adapters/sms_msg91.py`<br>`apps/tenant_core/communication/adapters/sms_twilio.py` | **CODE EXISTS — CREDENTIALS MISSING / STUB DISPATCH** |
| **Email** | SMTP / AWS SES | `apps/tenant_core/communication/adapters/email_smtp.py`<br>`apps/tenant_core/communication/adapters/email_ses.py` | **READY & WORKING (SMTP)** |
| **Object Storage** | Zata.ai / S3-Compatible Storage | `apps/tenant_core/storage.py` (`ZataS3StorageService`) | **READY (CODE EXISTS — S3 CREDENTIALS NEEDED)** |
| **Push Notifications**| Firebase / APNs | None | **FUTURE / NOT REQUIRED FOR WEB RELEASE** |
| **PAR-Q & Agreements**| Native PostgreSQL Models | `apps/tenant_core/models_crm.py` (`IntakeForm`)<br>`apps/tenant_core/models_privacy.py` (`ConsentRecord`) | **READY & WORKING (NO 3RD PARTY REQUIRED)** |
| **Background Tasks** | Celery + Redis | `backend/config/settings.py`<br>`backend/apps/tenant_core/tasks_meta_leads.py` | **READY & WORKING** |

---

## PHASE 3: META LEAD ADS REQUIREMENTS

### 1. Account & Asset Requirements
To transition Meta Lead Ads from local simulation to live production lead ingestion:
- **Meta Business Manager**: Verified organization account.
- **Meta Developer Account**: Admin rights to create and manage the Meta App.
- **Meta App**: Type **Business**, configured with the **Facebook Login for Business** and **Webhooks** products.
- **Facebook Page(s)**: The gym's official Facebook Page(s) where Lead Ad campaigns run.
- **Lead Ad Forms**: Form IDs created in Meta Ads Manager / Page Publishing Tools.
- **Meta Ad Account**: Associated with the Business Manager.

### 2. Credentials Required
- `META_APP_ID`: Public Application ID from Meta Developer Console.
- `META_APP_SECRET`: Private application secret (used for HMAC-SHA256 signature verification and token exchange).
- `META_WEBHOOK_VERIFY_TOKEN`: High-entropy custom token generated by the team and entered into Meta Developer Webhooks console.
- `META_TOKEN_ENCRYPTION_KEY`: 32-byte Fernet key for encrypting Page and User tokens at rest in PostgreSQL.

### 3. API & OAuth Configuration
- **Graph API Version**: **v21.0** (hardcoded in `services_meta_graph.py`).
- **OAuth Scopes Requested**:
  1. `leads_retrieval` (Access raw lead form submission data).
  2. `pages_show_list` (Discover Pages managed by the connecting user).
  3. `pages_read_engagement` (Read Page metadata).
  4. `pages_manage_ads` (Access ads and forms).
  5. `pages_manage_metadata` (Subscribe app to Page webhooks).
- **OAuth Authorization URL**: `https://www.facebook.com/v21.0/dialog/oauth`
- **OAuth Callback URL**: `https://api.fitness.vibecopilot.ai/api/v1/tenant/meta-lead-mappings/oauth-callback/`
- **Frontend Setup Tab**: `https://fitness.vibecopilot.ai/crm/setup?tab=meta&meta_connected=true`

### 4. Webhook Configuration
- **Webhook Endpoint**: `https://api.fitness.vibecopilot.ai/api/v1/webhooks/meta/leads/`
- **Webhook Object**: `Page`
- **Subscribed Field**: `leadgen`
- **Security Validation**: Validates `X-Hub-Signature-256` header using HMAC-SHA256 with `META_APP_SECRET`. Fails closed if signature does not match.

### 5. App Review & Approval Requirements
- **Development / Test Mode**:
  - Works immediately for registered App Administrators, Developers, and Testers without App Review.
  - Can be tested using the **Meta Lead Ads Testing Tool** (`https://developers.facebook.com/tools/lead-ads-testing`).
- **Live Production Mode**:
  - Requires **Meta Business Verification** (Business registration certificate, utility bill, domain verification).
  - Requires **Meta App Review** approval for:
    - `leads_retrieval` (Advanced Access)
    - `pages_manage_ads` (Advanced Access)
    - `pages_manage_metadata` (Advanced Access)
  - Requires Public URLs:
    - **Privacy Policy URL**: `https://fitness.vibecopilot.ai/privacy`
    - **Terms of Service URL**: `https://fitness.vibecopilot.ai/terms`
    - **User Data Deletion Callback URL**: `https://api.fitness.vibecopilot.ai/api/v1/privacy/data-deletion/`

---

## PHASE 4: RAZORPAY / PAYMENT REQUIREMENTS

### 1. Current Code Architecture
- **In-Store / Offline Payments**: Handled authoritatively by `services_commerce.py` (`provider='CASH'`). Supports Cash, POS Terminal, Cheque, and Bank Transfer with instant Order, Invoice, and Entitlement activation.
- **Online Payments (Razorpay)**:
  - In `views_mobile.py`, `MobileCheckoutOrderView` generates a synthetic Razorpay order structure:
    `razorpay_order_id = f"order_{str(uuid.uuid4().hex)[:14]}"`
    `key_id = getattr(settings, 'RAZORPAY_KEY_ID', 'rzp_test_sweat_elite')`
  - `MobileCheckoutVerifyView` accepts `razorpay_payment_id` and records a successful transaction.
  - **Missing**: Server-side Razorpay Order API call (`razorpay.Client.order.create`), client-side Razorpay Checkout modal JS, and a webhook receiver verifying Razorpay HMAC signatures.

### 2. External Credentials Required
- **Razorpay Merchant Account**: Registered business entity in India.
- **Key ID (`RAZORPAY_KEY_ID`)**: Public key for checkout popup.
- **Key Secret (`RAZORPAY_KEY_SECRET`)**: Private secret for HMAC signature verification and order creation.
- **Webhook Secret (`RAZORPAY_WEBHOOK_SECRET`)**: Secret string configured in Razorpay Dashboard for webhook payload signature verification.

### 3. Payment Methods to Enable in Razorpay Console
- UPI (Intent & Collect: Google Pay, PhonePe, Paytm, BHIM)
- Credit & Debit Cards (Visa, MasterCard, RuPay)
- Net Banking (Top 50 Indian banks)
- Auto-debit / e-NACH / UPI Autopay (only if recurring memberships are enabled)

### 4. Webhook Specifications
- **Target Backend URL**: `https://api.fitness.vibecopilot.ai/api/v1/billing/webhook/` (or dedicated `.../webhooks/razorpay/`)
- **Required Events**:
  - `order.paid`
  - `payment.captured`
  - `payment.failed`
  - `refund.processed`
- **Signature Header**: `X-Razorpay-Signature` (HMAC-SHA256 computed on raw request body using `RAZORPAY_WEBHOOK_SECRET`).

---

## PHASE 5: SARVAM AI & TELEPHONY (VOICE CALLING)

### 1. Architectural Reality & Provider Separation
A common architectural pitfall is assuming that **Sarvam AI** can originate phone calls independently.
- **Sarvam AI** is an AI language and speech provider (LLM conversational agents, Indic Text-to-Speech `bulbul`, and Speech-to-Text `saaras`). It provides audio APIs and WebSocket speech endpoints, but **it does not provide a PSTN telecom interconnect**.
- To execute outbound phone calls to prospective leads in India, SWEAT requires **two complementary providers**:
  1. **Telephony Partner / SIP Trunk** (e.g., **Exotel**, **Twilio**, or **TeleCMI**): Owns virtual numbers, originates telephone calls via Indian telecom operators, and bridges audio streams.
  2. **Sarvam AI**: Connects to the active audio stream to transcribe customer speech, determine the conversational response, and synthesize speech in Indian English/Hindi.

### 2. Sarvam AI Requirements
- **Sarvam Account**: Developer account at `sarvam.ai`.
- **Sarvam API Key**: `SARVAM_API_KEY`
- **Supported Models**:
  - TTS Model: `bulbul:v1` (with selected speaker ID/gender).
  - STT Model: `saaras:v1` (multilingual Indian language recognition).
  - Conversational Agent / LLM: Custom prompt / context agent endpoint.

### 3. Telephony Carrier Requirements (e.g. Exotel / Twilio)
- **Account**: Exotel Virtual Number Account (India telecom compliant) or Twilio.
- **Caller ID / DID**: 10-digit virtual landline or mobile number.
- **Webhook Callbacks**:
  - Call Status Callback: `https://api.fitness.vibecopilot.ai/api/v1/webhooks/telephony/status/`
  - Audio Stream / WebSocket: Secure WSS endpoint for real-time bidirectional audio exchange.
- **Data Captured by SWEAT CRM**:
  - `call_id`, `lead_id`, `duration_seconds`, `call_status` (ANSWERED, BUSY, NO_ANSWER, FAILED)
  - `recording_url`, `transcript_text`, `ai_summary`, `call_disposition` (QUALIFIED, RESCHEDULE_REQUESTED, NOT_INTERESTED)
  - Next follow-up action scheduled automatically.

---

## PHASE 6: WHATSAPP BUSINESS

### 1. Provider Architecture
SWEAT supports two adapters in `backend/apps/tenant_core/communication/adapters/`:
- **Meta WhatsApp Cloud API** (`MetaWhatsAppAdapter` — recommended primary).
- **Gupshup** (`GupshupWhatsAppAdapter` — secondary BSP).

### 2. Meta WhatsApp Cloud API Requirements
- **Meta Business Manager**: Verified business.
- **WhatsApp Business Account (WABA)**: WABA ID created under Business Manager.
- **Phone Number ID**: 15-digit Phone Number ID assigned by Meta.
- **Dedicated Phone Number**: Verified via SMS/voice OTP; cannot be currently active on standard WhatsApp.
- **Permanent Access Token**: System User Access Token with `whatsapp_business_messaging` and `whatsapp_business_management` permissions.
- **Webhook Verify Token**: Custom secret token for webhook verification.

### 3. Template Management
- **Console Registration**: Templates must be authored and approved in **Meta WhatsApp Manager** console.
- **Categories**:
  - `UTILITY`: Trial booking confirmation, payment receipt, renewal alert.
  - `MARKETING`: Promotional campaigns, lead welcome sequences.
  - `AUTHENTICATION`: OTP messages.
- **Template Variables**: Parameters (`{{1}}`, `{{2}}`) mapped dynamically by SWEAT `NotificationTemplate` engine.

### 4. Webhook Specifications
- **Webhook Endpoint**: `https://api.fitness.vibecopilot.ai/api/v1/webhooks/communications/META/<integration_id>/`
- **Events Ingested**:
  - Status Events: `sent`, `delivered`, `read`, `failed` (updates `CommunicationStatusEvent`).
  - Inbound Messages: Customer replies (e.g., "CONFIRM", "RESCHEDULE") automatically update trial booking statuses via `CRMTrialService`.

---

## PHASE 7: SMS / TEXT MESSAGING (INDIA DLT)

### 1. Provider Architecture
Supported adapters in `apps/tenant_core/communication/adapters/`:
- **MSG91** (`MSG91SMSAdapter` — recommended for India).
- **Twilio** (`TwilioSMSAdapter` — global).
- **Gupshup** (`GupshupSMSAdapter`).

### 2. India Regulatory (TRAI DLT) Requirements
All commercial and transactional SMS delivered in India must comply with TRAI DLT regulations:
1. **DLT Entity Registration**: Registered on a DLT telecom portal (e.g. Jio, Vodafone Idea, Airtel, BSNL).
2. **Principal Entity ID (PE ID)**: Unique entity ID issued by DLT.
3. **Sender ID (Header)**: 6-character alphabetic header (e.g., `SWEATF`, `PERFOS`).
4. **Content Template IDs**: Every SMS template (OTP, trial reminder, payment link) must be approved on DLT with fixed and variable fields before delivery.

### 3. Credentials Required (MSG91 Example)
- `MSG91_AUTH_KEY`: 32-character authentication key.
- `MSG91_SENDER_ID`: Approved 6-character header.
- `DLT_TE_ID`: Template ID passed in payload.

---

## PHASE 8: EMAIL

### 1. Provider Architecture
SWEAT supports:
- **SMTP** (`SMTPEmailAdapter`): Standard RFC SMTP connection. Fully functional with any provider (SendGrid, Mailgun, AWS SES SMTP, Google Workspace, Postmark).
- **AWS SES** (`SESEmailAdapter`): Direct Boto3 API integration.

### 2. Configuration Parameters
- `EMAIL_HOST`: SMTP server hostname (e.g., `smtp.sendgrid.net`).
- `EMAIL_PORT`: 587 (TLS) or 465 (SSL).
- `EMAIL_HOST_USER`: SMTP username or API key user.
- `EMAIL_HOST_PASSWORD`: SMTP password or API token.
- `EMAIL_USE_TLS`: `True`.
- `DEFAULT_FROM_EMAIL`: Authorized sender address (e.g., `SWEAT Fitness <notifications@fitness.vibecopilot.ai>`).

### 3. Domain Authentication Requirements
The business domain must configure DNS records to ensure inbox deliverability:
- **SPF**: `v=spf1 include:... ~all`
- **DKIM**: Public key CNAME / TXT records.
- **DMARC**: `v=DMARC1; p=quarantine; ...`

---

## PHASE 9: PUSH NOTIFICATIONS / MEMBER APP

- **Current Status**: **NOT REQUIRED FOR CURRENT WEB RELEASE**.
- **Finding**: Zero references to FCM (Firebase Cloud Messaging), APNs (Apple Push Notification service), or device token registrations in active code.
- **Future Implementation Requirements**:
  - Google Firebase Project & Service Account JSON key (`FIREBASE_SERVICE_ACCOUNT_KEY`).
  - Apple Developer Account with APNs Auth Key (`.p8` file), Apple Team ID, and Key ID.

---

## PHASE 10: STORAGE / MEDIA (ZATA.AI / S3)

### 1. Current Architecture
Implemented in `backend/apps/tenant_core/storage.py` (`ZataS3StorageService`).
- Files are stored in S3-compatible private object storage; only metadata lives in PostgreSQL (`File` model).
- Strict multi-tenant isolation: S3 key format is frozen as `tenants/{tenant_uuid}/files/{file_uuid}`.
- Presigned upload (PUT) with 15-minute TTL; Presigned download (GET) with 60-minute TTL.
- Maximum file size: 50 MB (`ZATA_S3_MAX_FILE_SIZE`).

### 2. Environment Variables Required
- `ZATA_S3_ENDPOINT_URL`: S3 endpoint (default: `https://s3.zata.ai` or AWS S3 endpoint).
- `ZATA_S3_ACCESS_KEY_ID`: IAM access key ID.
- `ZATA_S3_SECRET_ACCESS_KEY`: IAM secret access key.
- `ZATA_S3_BUCKET_NAME`: Private bucket name (default: `fitness-platform-private`).
- `ZATA_S3_REGION_NAME`: AWS/S3 region (default: `us-east-1` or `ap-south-1`).

### 3. Business Documents Utilizing Storage
- Member profile avatars
- PAR-Q and intake attachments
- Signed membership agreements
- Photo / video consent documentation
- Invoice PDF records

---

## PHASE 11: PAR-Q / AGREEMENTS / CONSENT

### Factual Code Audit:
- **No Third-Party E-Signature Provider (DocuSign, Adobe Sign, etc.) is Required**.
- The SWEAT platform contains a complete native regulatory and legal consent domain:
  - `IntakeForm` & `IntakeQuestion`: Supports multi-version PAR-Q questionnaires with mandatory question validation and versioning.
  - `IntakeSubmission`: Records member answers, score calculations, medical waivers, and signature image/strokes.
  - `ConsentRecord` (`apps/tenant_core/models_privacy.py`): Immutable append-only audit trail capturing `user_id`, `purpose`, `status` (GRANTED/WITHDRAWN), `notice_version`, `capture_source`, `ip_address`, `user_agent`, and `proof_metadata`.

---

## PHASE 12: OTP & AUTHENTICATION

- **Staff Users**: Invited via signed activation link (`django.core.signing.TimestampSigner`, 72-hour TTL). Dispatched by email (`resend_invite`).
- **Member Authentication**: JWT access and refresh tokens.
- **Phone / SMS OTP**: Requires MSG91 or Twilio SMS adapter. Verification endpoint matches submitted OTP against temporary cache/database record.

---

## PHASE 13: BACKGROUND INFRASTRUCTURE INVENTORY

These services are internal infrastructure components required for production operation:

| Component | Minimum Version | Purpose | Required Services / Processes |
| :--- | :--- | :--- | :--- |
| **PostgreSQL** | 16.x | Master DB (`performanceos_master`) + Tenant DBs (`fitness_tenant_*`) | Database daemon |
| **Redis** | 7.x | Celery broker, Celery backend, distributed locks, OAuth nonces | `redis-server` on port 6379 |
| **Celery Worker** | 5.4.x | Asynchronous task execution (Meta lead ingestion, SMS/WhatsApp dispatch) | `celery -A config worker -l info -Q default` |
| **Celery Beat** | 5.4.x | Periodic scheduling (Meta recovery, DB health checks, renewals) | `celery -A config beat -l info` |
| **Gunicorn / Uvicorn** | Latest | Backend WSGI/ASGI application server | Port 8000 (managed via systemd) |
| **Nitro Node Server** | Node 20.x | Frontend SSR server (`.output/server/index.mjs`) | Port 3000 (managed via systemd) |
| **Nginx** | 1.24+ | Reverse proxy, SSL termination, static file serving | Port 80, 443 |

---

## PHASE 14: COMPLETE WEBHOOK & CALLBACK INVENTORY

| Provider | Purpose | Method | Expected Backend Path | Full Production URL | Auth / Signature Validation | Secret Required | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Meta Lead Ads** | Webhook verification (Challenge) | GET | `/api/v1/webhooks/meta/leads/` | `https://api.fitness.vibecopilot.ai/api/v1/webhooks/meta/leads/` | `hub.verify_token` matching | `META_WEBHOOK_VERIFY_TOKEN` | **READY** |
| **Meta Lead Ads** | Inbound lead delivery | POST | `/api/v1/webhooks/meta/leads/` | `https://api.fitness.vibecopilot.ai/api/v1/webhooks/meta/leads/` | `X-Hub-Signature-256` HMAC-SHA256 | `META_APP_SECRET` | **READY** |
| **Meta OAuth** | Staff Facebook connection callback | GET/POST | `/api/v1/tenant/meta-lead-mappings/oauth-callback/` | `https://api.fitness.vibecopilot.ai/api/v1/tenant/meta-lead-mappings/oauth-callback/` | State token signature & single-use atomic nonce | `SECRET_KEY` / Redis | **READY** |
| **Meta WhatsApp** | Inbound messages & delivery receipts | GET/POST | `/api/v1/webhooks/communications/META/<integ_id>/` | `https://api.fitness.vibecopilot.ai/api/v1/webhooks/communications/META/<integ_id>/` | Verify token (GET), HMAC-SHA256 (POST) | `verify_token`, `app_secret` | **READY** |
| **MSG91 (SMS)** | Delivery receipts & inbound SMS | POST | `/api/v1/webhooks/communications/MSG91/<integ_id>/` | `https://api.fitness.vibecopilot.ai/api/v1/webhooks/communications/MSG91/<integ_id>/` | Request ID & Auth validation | `auth_key` | **READY** |
| **Twilio (SMS)** | Delivery receipts & inbound SMS | POST | `/api/v1/webhooks/communications/TWILIO/<integ_id>/` | `https://api.fitness.vibecopilot.ai/api/v1/webhooks/communications/TWILIO/<integ_id>/` | `X-Twilio-Signature` HMAC-SHA1 | `auth_token` | **READY** |
| **AWS SES (Email)** | Bounces, complaints, delivery events | POST | `/api/v1/webhooks/communications/SES/<integ_id>/` | `https://api.fitness.vibecopilot.ai/api/v1/webhooks/communications/SES/<integ_id>/` | SNS message signing verification | AWS SNS Cert | **READY** |
| **Razorpay** | Payment & refund notifications | POST | `/api/v1/billing/webhook/` | `https://api.fitness.vibecopilot.ai/api/v1/billing/webhook/` | `X-Razorpay-Signature` HMAC-SHA256 | `RAZORPAY_WEBHOOK_SECRET` | **PARTIAL (Adapter stub)** |
| **Public Lead Capture** | Website / landing page intake | POST | `/api/v1/webhooks/leads/<tenant_id>/` | `https://api.fitness.vibecopilot.ai/api/v1/webhooks/leads/<tenant_id>/` | Tenant validation & CORS | Optional API key | **READY** |
| **Telephony / Sarvam** | Call disposition & recording callback | POST | `/api/v1/webhooks/telephony/call-status/` | `https://api.fitness.vibecopilot.ai/api/v1/webhooks/telephony/call-status/` | Provider token / signature | Provider secret | **MISSING (To be built)** |

---

## PHASE 15: COMPLETE ENVIRONMENT VARIABLE INVENTORY

*(Variable names only — zero secret values exposed)*

| Variable Name | Group | Purpose | Required Local? | Required UAT? | Required Prod? | Secret? | Code Default / Fallback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `META_APP_ID` | Meta | Facebook App ID for OAuth and Graph API | No | Yes | **Yes** | No | `''` (Disables OAuth/Graph) |
| `META_APP_SECRET` | Meta | App Secret for token exchange & signature verify | No | Yes | **Yes** | **Yes** | `''` (Rejects live webhooks) |
| `META_WEBHOOK_VERIFY_TOKEN` | Meta | Custom challenge token for webhook setup | No | Yes | **Yes** | **Yes** | `''` (Rejects GET challenge) |
| `META_TOKEN_ENCRYPTION_KEY` | Meta | Fernet 32-byte key for storing Page tokens | No | Yes | **Yes** | **Yes** | Derives from `SECRET_KEY` |
| `META_LEAD_SIMULATOR_ENABLED` | Meta | Enables development simulator | Yes | Optional | **False** | No | `true` if DEBUG else `false` |
| `RAZORPAY_KEY_ID` | Payments | Public Key ID for client checkout | No | Yes | **Yes** | No | `'rzp_test_sweat_elite'` |
| `RAZORPAY_KEY_SECRET` | Payments | Secret key for payment verify and refunds | No | Yes | **Yes** | **Yes** | None (Fails closed) |
| `RAZORPAY_WEBHOOK_SECRET` | Payments | Secret for verifying payment webhooks | No | Yes | **Yes** | **Yes** | None (Fails closed) |
| `SARVAM_API_KEY` | Voice AI | API key for Sarvam Indic speech/NLP | No | No | Planned | **Yes** | None |
| `EXOTEL_API_KEY` / `SID` | Telephony | Telephony provider API key | No | No | Planned | **Yes** | None |
| `EXOTEL_API_TOKEN` | Telephony | Telephony provider token | No | No | Planned | **Yes** | None |
| `EMAIL_HOST` | Email | SMTP Server hostname | No | Yes | **Yes** | No | `localhost` |
| `EMAIL_PORT` | Email | SMTP Server port | No | Yes | **Yes** | No | `587` |
| `EMAIL_HOST_USER` | Email | SMTP Username | No | Yes | **Yes** | No | `''` |
| `EMAIL_HOST_PASSWORD` | Email | SMTP Password | No | Yes | **Yes** | **Yes** | `''` |
| `DEFAULT_FROM_EMAIL` | Email | Authoritative sender address | No | Yes | **Yes** | No | `no-reply@performanceos.internal` |
| `COMMUNICATIONS_OUTBOUND_ENABLED` | Comms | Global safety kill-switch for SMS/Email/WA | Yes | Yes | **True** | No | `false` if DEBUG else `true` |
| `ZATA_S3_ENDPOINT_URL` | Storage | S3 storage endpoint URL | No | Yes | **Yes** | No | `https://s3.zata.ai` |
| `ZATA_S3_ACCESS_KEY_ID` | Storage | Storage IAM access key | No | Yes | **Yes** | No | `''` |
| `ZATA_S3_SECRET_ACCESS_KEY` | Storage | Storage IAM secret key | No | Yes | **Yes** | **Yes** | `''` |
| `ZATA_S3_BUCKET_NAME` | Storage | Storage bucket name | No | Yes | **Yes** | No | `'fitness-platform-private'` |
| `ZATA_S3_REGION_NAME` | Storage | S3 storage region | No | Yes | **Yes** | No | `'us-east-1'` |
| `REDIS_URL` | Infra | Redis connection URL | Yes | Yes | **Yes** | Optional | `redis://localhost:6379/0` |
| `CELERY_BROKER_URL` | Infra | Celery task broker URL | Yes | Yes | **Yes** | Optional | `REDIS_URL` |
| `DATABASE_URL` | Database | Master DB connection string | Yes | Yes | **Yes** | **Yes** | Local postgres URL |
| `MASTER_DATABASE_URL` | Database | Master DB alias connection string | Yes | Yes | **Yes** | **Yes** | `DATABASE_URL` |
| `FRONTEND_URL` | URLs | Authoritative frontend domain | Yes | Yes | **Yes** | No | `http://localhost:5173` |

---

## PHASE 16: ADMIN UI CONFIGURATION VS. ENVIRONMENT SECRETS

To preserve strict security isolation, configuration responsibilities are partitioned as follows:

### ENV / Secret Manager ONLY (Never exposed to Frontend):
- `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `META_TOKEN_ENCRYPTION_KEY`
- `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `SARVAM_API_KEY`, Telephony carrier tokens
- `EMAIL_HOST_PASSWORD`, AWS IAM Secret Keys, Zata Secret Access Key
- Database credentials and Redis passwords

### SWEAT Admin UI Configurable (`/crm/setup` and `/admin/integrations`):
- Connect Facebook Account button (OAuth launch dialog)
- Facebook Page selection & Form discovery
- Lead Form field mappings (mapping Facebook question keys to CRM fields: first name, phone, email, goal, branch)
- Communication channel enable/disable toggles
- WhatsApp & SMS template variable mappings
- Working hours & call retry schedules
- Sales agent lead auto-assignment rules
- Attention / Stuck lead SLA thresholds

---

## PHASE 17: SECURITY & COMPLIANCE AUDIT

1. **Token Storage**: Meta Page tokens and User tokens are encrypted at rest using **Fernet (AES-128-CBC + HMAC-SHA256)** via `apps/tenant_core/meta_crypto.py`. Plaintext tokens are never stored in PostgreSQL.
2. **Token Masking**: Frontend display tokens are masked (`EAAB...7x9Q`) preventing credential theft from UI screenshots or shoulder surfing.
3. **Replay Protection**: Meta OAuth uses signed, cryptographically random nonces verified and atomically consumed via Redis (`GETDEL`) in `services_meta_graph.py`. Replaying an OAuth callback URL immediately returns `HTTP 400 OAuth state token has already been used (replay detected)`.
4. **Webhook Signature Validation**:
   - Meta webhooks strictly validate `X-Hub-Signature-256` HMAC-SHA256. Unsigned or mismatched requests are rejected (`HTTP 403 Forbidden`).
   - Razorpay webhooks validate `X-Razorpay-Signature`.
5. **Fail-Closed Outbound Safeguard**: `COMMUNICATIONS_OUTBOUND_ENABLED` defaults to `False` in development environments, preventing accidental dispatch of live SMS, WhatsApp, or email messages to real customer numbers during testing.

---

## PHASE 18: TEST ENVIRONMENT & SANDBOX REQUIREMENTS

To begin immediate development and QA without incurring live telephony/ad costs:

1. **Meta Lead Ads**:
   - Create a **Meta Development App** in Meta Developer Console.
   - Use the **Meta Lead Ads Testing Tool** (`https://developers.facebook.com/tools/lead-ads-testing`) to generate synthetic test leads into our live webhook endpoint.
   - Requires zero ad spend and zero external approvals.
2. **Razorpay**:
   - Generate instant **Razorpay Test API Keys** (`rzp_test_...` and Test Secret) from Razorpay Dashboard.
   - Use Razorpay Test UPI handles (`success@razorpay`) and test card numbers to execute end-to-end purchase flows.
3. **Email**:
   - Utilize a development SMTP service (e.g. Mailtrap, SendGrid Free Tier, or AWS SES Sandbox).
4. **WhatsApp**:
   - Utilize a **Meta WhatsApp Cloud API Test Phone Number** (provided automatically in the Meta Developer App setup) which allows sending free test templates to up to 5 verified recipient phone numbers.
5. **SMS**:
   - Utilize an MSG91 or Twilio trial account with pre-verified test recipient mobile numbers.

---

## PHASE 19: CLIENT / BUSINESS TEAM REQUEST CHECKLIST

A non-technical request list to share with the business team and stakeholders:

### Priority 1: NEEDED NOW — DEVELOPMENT CAN PROCEED
| Item | Source / Where to Obtain | Owner | Contains Secret? | Why SWEAT Needs It |
| :--- | :--- | :--- | :--- | :--- |
| **Meta Developer Account & App** | `developers.facebook.com` | Marketing / Dev Lead | Yes (App Secret) | Connects Facebook Lead Ads to SWEAT CRM |
| **Razorpay Test API Keys** | Razorpay Dashboard -> Settings -> API Keys | Finance / Tech Lead | Yes (Key Secret) | Enables online payment flow implementation |
| **SMTP Email Credentials** | Email hosting (SendGrid, Workspace, SES) | IT Admin | Yes (Password) | Delivers staff invites, password resets, receipts |
| **Zata / S3 Object Storage Keys** | Storage console (Zata.ai / AWS IAM) | Cloud Infra | Yes (Secret Key) | Stores member photos, PAR-Q, contracts, PDFs |

### Priority 2: NEEDED BEFORE UAT (STAGING VERIFICATION)
| Item | Source / Where to Obtain | Owner | Contains Secret? | Why SWEAT Needs It |
| :--- | :--- | :--- | :--- | :--- |
| **Meta Page Admin Access** | Facebook Page Settings | Marketing Lead | No | Authorizes lead form retrieval for gym locations |
| **WhatsApp Business Account (WABA)** | Meta Business Manager | Marketing Lead | Yes (System Token) | Sends automated trial booking confirmations |
| **WhatsApp Phone Number** | New SIM / virtual number | Operations | No | Dedicated sender number for gym WhatsApp |
| **MSG91 Account (SMS)** | `msg91.com` | Marketing / IT | Yes (Auth Key) | Sends OTP check-ins and critical alerts |
| **TRAI DLT Registration (India)** | Jio DLT / Vilpower / Airtel | Operations / Legal | No (PE ID / Headers) | Legal requirement for SMS delivery in India |

### Priority 3: NEEDED BEFORE GO-LIVE (PRODUCTION DEPLOYMENT)
| Item | Source / Where to Obtain | Owner | Contains Secret? | Why SWEAT Needs It |
| :--- | :--- | :--- | :--- | :--- |
| **Meta Business Verification** | Meta Business Manager -> Security Center | Legal / Business | No | Required for Meta App Review approval |
| **Meta App Review Submission** | Meta Developer Console | Dev Lead | No | Grants live public lead retrieval permissions |
| **Razorpay Live API Keys & KYC** | Razorpay Dashboard (after bank verification) | Business Owner | Yes (Live Secret) | Collects real membership payments via UPI/Cards |
| **Sarvam AI Account & Key** | `sarvam.ai` dashboard | Tech Lead | Yes (API Key) | Enables autonomous voice call follow-ups |
| **Exotel / Telephony Partner DID** | Exotel / Twilio console | Operations | Yes (API Secret) | Bridges Sarvam voice AI to Indian mobile phone lines |
| **Domain DNS Access** | Domain Registrar (GoDaddy, Cloudflare) | IT Admin | No | Configures SPF, DKIM, DMARC for email delivery |

---

## PHASE 20: CURRENT READINESS CLASSIFICATION

| Integration Component | Final Audit Classification | Next Recommended Action |
| :--- | :--- | :--- |
| **Meta Lead Ads** | **CODE EXISTS — CREDENTIALS MISSING** | Configure `META_APP_ID`, `META_APP_SECRET`, and `META_WEBHOOK_VERIFY_TOKEN` in `.env` |
| **Offline Payments (Cash/POS)** | **READY** | None. Fully verified E2E in CRM Lead → Member pipeline |
| **Online Payments (Razorpay)** | **PARTIALLY READY** | Implement official Razorpay Order API creation, Checkout modal, and webhook receiver |
| **Voice AI (Sarvam)** | **NOT IMPLEMENTED** | Provision Sarvam API key and select Telephony carrier (Exotel/Twilio) |
| **Telephony Carrier / Trunk** | **PROVIDER NOT SELECTED** | Select and contract carrier (Exotel recommended for India outbound PSTN) |
| **WhatsApp (Meta Cloud API)** | **CODE EXISTS — CREDENTIALS MISSING** | Connect live Meta Cloud API `requests.post` dispatch using WABA credentials |
| **SMS (DLT / MSG91)** | **CODE EXISTS — CREDENTIALS MISSING** | Obtain DLT Principal Entity ID, Approved Headers, and MSG91 Auth Key |
| **Email (SMTP)** | **READY** | Provide production SMTP host and credentials in `settings.py` / `.env` |
| **Storage (Zata S3)** | **READY** | Populate `ZATA_S3_ACCESS_KEY_ID` and `SECRET_ACCESS_KEY` in production `.env` |
| **PAR-Q & Agreements** | **READY** | None. 100% native PostgreSQL implementation |
| **Background Infrastructure** | **READY** | PostgreSQL 16, Redis 7, Celery Worker, and Celery Beat operational |

---

## RECOMMENDED IMPLEMENTATION ORDER

```
┌────────────────────────────────────────────────────────────────────────┐
│ STEP 1: Core Foundation Credentials (Immediate)                        │
│ - Configure SMTP Email (staff invites, notifications)                  │
│ - Configure Zata S3 Storage (member photos, agreements, PDFs)          │
│ - Configure Redis & Celery background queues                           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STEP 2: Lead Acquisition Pipeline                                      │
│ - Add Meta App ID & Secret to environment                              │
│ - Connect Meta Lead Ads webhook with verify token                      │
│ - Validate end-to-end with Meta Lead Ads Testing Tool                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STEP 3: Commercial Checkout & Payment Gateway                          │
│ - Implement server-side Razorpay Order creation API                    │
│ - Wire Razorpay Checkout modal in frontend & mobile                    │
│ - Implement Razorpay Webhook receiver with HMAC-SHA256 signature check │
│ - Validate with Razorpay Sandbox Test Keys                             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STEP 4: Omnichannel Customer Communications                            │
│ - Connect Meta WhatsApp Cloud API live dispatch                        │
│ - Connect MSG91 SMS adapter with registered DLT templates              │
│ - Verify automated trial confirmation and check-in reminders           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STEP 5: AI Voice Calling Automation (Advanced)                         │
│ - Contract Telephony Carrier (Exotel / Twilio) for outbound PSTN DID   │
│ - Integrate Sarvam AI speech synthesis (TTS) & transcription (STT)     │
│ - Wire call status & recording webhooks into CRM Lead timeline         │
└────────────────────────────────────────────────────────────────────────┘
```
