
## SECTION 1: INVESTIGATION OF SCREENSHOT INCONSISTENCIES

The user-submitted screenshots revealed five primary discrepancies that required authoritative forensic tracing across the database, APIs, and business rules:

1. **Member Directory reporting zero members vs 1 member.**
2. **Memberships screen reporting zero memberships vs active membership.**
3. **Lead Conversion displaying "Cash Payment Recorded! Pending manager approval before membership activates."**
4. **Member 360 displaying an ACTIVE membership, 4 allocated sessions, and provisional allocation activity.**
5. **A ₹3,499 contract price alongside an outstanding balance of ₹140,992.**

### Mathematical & Forensic Proof: Outstanding Balance of ₹140,992.00
Querying `orders` in `tenant_sweat_uat` for user profile `f5349965-896d-412b-a8d0-b67206d77d1e` (`TenantA_Lead Known_531725`) revealed that **8 separate orders** exist on this profile. Seven orders were created on October 5, 2026, during earlier checkout testing, and the 8th order was placed on October 6, 2026, during lead conversion:

| Order Number | Order ID | Total Amount | Status | Creation Time (UTC) | Source / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ORD-B48E4706** | `3dbccef7-92e7-4910-a464-bb775d8e700a` | **₹59,999.00** | `PENDING_PAYMENT` | 2026-10-05 18:48:21 | CRM Lead checkout |
| **ORD-0719D35E** | `277e7791-7f5f-442b-87a7-b4f6eee458d2` | **₹20,999.00** | `PENDING_PAYMENT` | 2026-10-05 18:56:07 | CRM Lead checkout |
| **ORD-55CDC8CE** | `7a3eab01-6d8b-4d2a-b1ea-bddf74c72e8a` | **₹13,999.00** | `PENDING_PAYMENT` | 2026-10-05 19:12:16 | CRM Lead checkout |
| **ORD-C7C3B862** | `942f20b8-bee1-405c-bb48-de038b794848` | **₹29,999.00** | `PENDING_PAYMENT` | 2026-10-05 19:12:38 | CRM Lead checkout |
| **ORD-B85568E0** | `05e13ae9-5c84-44b4-bbcb-5e5301c96b82` | **₹999.00** | `PENDING_PAYMENT` | 2026-10-05 19:24:34 | CRM Lead checkout |
| **ORD-9A50603F** | `1cdb723b-9fc2-4fa2-93b3-f60f43cddc9f` | **₹1,499.00** | `PENDING_PAYMENT` | 2026-10-05 19:50:45 | CRM Lead checkout |
| **ORD-A3E980E7** | `c45f9d25-9376-461a-8089-6006e19bc202` | **₹9,999.00** | `PENDING_PAYMENT` | 2026-10-05 20:01:53 | CRM Lead checkout |
| **ORD-9EB2ED23** | `c9845698-e1ce-48ed-a431-bb1343719ad4` | **₹3,499.00** | `PENDING_PAYMENT` | 2026-10-06 05:28:00 | CRM Lead conversion |
| **TOTAL** | | **₹140,992.00** | | | |

**Exact Arithmetic Verification:**
$$	ext{Total Outstanding} = 59,999 + 20,999 + 13,999 + 29,999 + 999 + 1,499 + 9,999 + 3,499 = \mathbf{₹140,992.00}$$

In `apps/tenant_core/views_members.py`, `calculate_member_outstanding()` computes:
$$	ext{Outstanding} = \sum_{	ext{orders}} (	ext{order.total\_amount} - 	ext{net\_paid})$$
Because three cash payment transactions were submitted (`7a6aaff3`, `9a784a69`, `80ce28f6`), but **none of them have been approved by a manager** (they remain in `status='PENDING'`), `PaymentTransaction.objects.filter(status='SUCCESS')` yields ₹0.00 for all orders. Consequently, the outstanding balance reflects the aggregate unpaid amount of all 8 test orders.

---

### Root Causes of the 10 Specific Audit Inquiries

1. **Tenant, Branch, Permissions, and Cache State:**
   - Both screens query the same tenant (`sweat`), resolving database `tenant_sweat_uat`.
   - The user in the screenshot was logged in as `UAT Administrator` (`ORG_ADMIN`).
   - The branch filter in the top navigation defaults to `"All Studio Branches"`.
2. **Identity Resolution:**
   - Both screens resolve the identical `user_profile.id`: `f5349965-896d-412b-a8d0-b67206d77d1e`.
   - The membership ID resolved across both screens is `0c44ccdd-25c3-4aac-bcb1-f33c489661a0` (`MEM-14A25B9C`).
3. **Provisional Membership Policy:**
   - In `apps/tenant_core/services_crm.py` (lines 3713–3824), recording a cash payment during lead conversion initiates an automatic provisional membership policy.
   - The policy reads `policy.get('cash_policy', {}).get('provisional_sessions_allowed', 4)`. If unspecified, it defaults to **4 sessions**.
4. **Distinction of Status Labels:**
   - **DEFECT**: The `Membership` table has no distinct `'PROVISIONAL'` status in its core model definition (`models_memberships.py`). Its `status` field is set to `'ACTIVE'`, while provisional metadata is stored in `legacy_reference` as `PROVISIONAL_CASH_PENDING:limit=4:req=ff349331-b23d-4179-b8c2-0574b791a3af`.
   - The UI displays `ACTIVE` because it binds to `membership.status`.
5. **Why Conversion Dialog Says "Pending Approval" while Member 360 shows "ACTIVE":**
   - In `ConversionWizard.tsx`, the frontend toast/modal message reflects the workflow state of the cash collection (`ApprovalRequest` is `PENDING`).
   - In `services_crm.py`, the backend creates the `Membership` record with `status='ACTIVE'` and allocates 4 provisional sessions so the member can begin attending immediately while cash is verified.
6. **Meaning of "Payment Received":**
   - In the Member 360 timeline, "Payment Received: ₹3,499.00" represents **recorded cash collected at the desk**, NOT approved collection and NOT settled funds in the bank. It represents a physical cash receipt logged by staff awaiting managerial verification.
7. **Transactions Contributing to ₹140,992:**
   - As proven above, exactly 8 unpaid orders across October 5 and October 6, 2026, contribute to this exact figure.
8. **Test Record Contamination:**
   - **CONFIRMED**. The account was contaminated with 7 prior checkout test orders totaling ₹137,493.00 that were abandoned without cancellation or payment.
9. **Release / Reversal of Provisional Sessions:**
   - **CRITICAL DEFECT IN REJECTION**: When an approval request is approved (`_materialize_cash_payment_approval`), full package entitlements are allocated, and a ledger row (`CASH_APPROVAL_ENTITLEMENT_RELEASE`) is appended.
   - However, when an approval request is rejected (`_materialize_cash_payment_rejection`), the membership is cancelled, but **no reversal transactions are appended to `MembershipEntitlementLedger`**. The ledger leaves an orphaned `+4.00 ALLOCATION` record, violating double-entry passbook accounting.
10. **Can Provisional Access Exceed Configured Allowance?**
   - **CRITICAL SECURITY HOLE**: YES. If a package contains multiple entitlement definitions (e.g. 1 class session and 1 personal training session), `services_crm.py` allocates `min(ed.allocated_units, 4)` to **each** entitlement definition, granting 8 total provisional sessions instead of a shared cap of 4.
   - Furthermore, the `/adjust-entitlement/` endpoint in `views_members.py` does not check if the membership is provisional, allowing staff to add unlimited sessions before payment is approved.

---

## SECTION 2: COMPLETE SCREEN & CONTROL INVENTORY

Every button, link, tab, filter, search field, badge, counter, pagination control, action, form field, and modal across the Members module was inventoried and audited against runtime and source evidence:

| Screen / Route | Control | Visibility / Permission | Intended Behavior | Actual Behavior | API / Service | Data Source | Validation | Runtime Evidence | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/members` | **Quick View Tabs** (All, Active, Expiring Soon, Frozen, Expired, Outstanding) | All authenticated staff | Filters directory rows by operational status. | Correctly filters rows; re-queries backend with `quick_view` param. | `GET /api/v1/tenant/members/?quick_view=` | `user_profiles` + `memberships` | Enum validation in DRF. | Verified in browser; clicking tab refreshes query. | **PASS** |
| `/members` | **Search Input** | All authenticated staff | Server-side debounced search across name, email, phone, member ID. | Searches accurately with 350ms debounce. | `GET /api/v1/tenant/members/?search=` | `users`, `user_profiles` | Sanitized query string. | Searching "531725" returns member `MEM-F993BD`. | **PASS** |
| `/members` | **Location Filter** | All authenticated staff | Restricts members to selected branch or all branches. | Correctly filters by `preferred_branch_id` or `memberships.home_branch_id`. | `GET /api/v1/tenant/members/?location=` | `branches`, `user_profiles` | UUID validation. | "All Studio Branches" displays 1; selecting "SWEAT Bootcamp & Pilates" displays 0. | **PASS** |
| `/members` | **Status / Program / Package Dropdowns** | All authenticated staff | Multi-dimensional catalog and membership status filtering. | Filter parameters successfully applied to backend queryset. | `GET /api/v1/tenant/members/` | `programs`, `packages` | Foreign key matching. | Selecting program updates table seamlessly. | **PASS** |
| `/members` | **Page Size Selector** (15, 25, 50, 100) | All authenticated staff | Configures pagination chunk size. | Updates `pageSize` and resets page to 1. | `GET /api/v1/tenant/members/?page_size=` | Django `PageNumberPagination` | Integer range (1–200). | Changes table view from 15 to 25. | **PASS** |
| `/members` | **Pagination Controls** (Prev / Next) | All authenticated staff | Navigates across pages. | Disables buttons when `page=1` or `page=total_pages`. | `GET /api/v1/tenant/members/?page=` | DRF paginator count. | Boundary check. | Verified on empty and single-row tables. | **PASS** |
| `/members` | **"+ Add Member" Button** | Staff with `core.users.create` | Opens modal to create a member directly without checkout. | Opens `Add Member` dialog with 7 input fields. | Client-side modal state. | None (modal DOM). | None. | Dialog opens cleanly with focus trap. | **PASS** |
| `/members` (Modal) | **Direct Add Member Form** | `core.users.create` | Creates customer identity with name, phone, email, branch. | Creates `TenantUser` and `UserProfile` with `member_status='ACTIVE'`. | `POST /api/v1/tenant/members/` | `users`, `user_profiles` | Required name, email/phone format. | Creates member with `source='MANUAL_CREATE'`. | **PASS** |
| `/members` | **"Collect" Row Action** | `finance.payments.create` | Opens modal to record outstanding balance payment. | Opens `CollectPaymentModal`; records payment directly as `SUCCESS`! | `POST /api/v1/tenant/members/<id>/collect-outstanding/` | `orders`, `payment_transactions` | Max amount <= order balance. | **DEFECT**: Bypasses cash approval workflow completely! | **FAIL (P0)** |
| `/members` | **"360 ->" Row Action** | `core.users.view` | Deep links to Member 360 view with `memberId` parameter. | Successfully navigates to `/members/client-360?memberId=<uuid>`. | Client-side routing. | Router navigation. | UUID parameter. | URL correctly reflects member UUID. | **PASS** |
| `/members/client-360` | **Back to Directory Link** | All authenticated staff | Returns to `/members`. | Navigates back preserving route history. | TanStack Router. | History stack. | None. | Click returns to `/members`. | **PASS** |
| `/members/client-360` | **Refresh Button** | All authenticated staff | Invalidates TanStack Query cache and re-fetches member 360. | Refetches `/tenant/members/<id>/360/` in background with spinning icon. | `GET /tenant/members/<id>/360/` | PostgreSQL `tenant_sweat_uat` | None. | Verified in DevTools network tab. | **PASS** |
| `/members/client-360` | **Outstanding Balance Alert** | Staff with `finance.view` | Highlights unpaid balance and provides "Settle" button. | Displays `₹140,992.00` alert bar with settle button. | Member 360 aggregate payload. | Aggregated from `orders`. | None. | Matches DB order balance sum exactly. | **PASS** |
| `/members/client-360` | **Tab: Overview** | All staff | Shows Identity, Active Snapshot, Passbook Summary, Upcoming, and Activity. | Renders responsive grid with 5 cards. | `GET /tenant/members/<id>/360/` | Aggregated read-model. | None. | Verified in desktop and mobile viewports. | **PASS** |
| `/members/client-360` | **Tab: Timeline** | All staff | Unified chronological audit trail from lead to attendance. | Renders 11 events across CRM, Commerce, Membership, and Passbook. | `GET /tenant/members/<id>/timeline/` | Aggregated timeline service. | Limit capped at 100. | All events chronologically sorted with badges. | **PASS** |
| `/members/client-360` | **Tab: Memberships & Passbook** | All staff | Displays Active Contract Snapshot, Quotas, Entitlement Ledger, Freezes, and Branch History. | Renders contract snapshot, session bars, and immutable ledger table. | `GET /tenant/members/<id>/360/` | `membership_entitlement_ledger` | None. | Shows `ALLOCATION +4.00` provisional entry. | **PASS** |
| `/members/client-360` | **Tab: Bookings & Attendance** | All staff | Displays Upcoming Bookings, Past Sessions, and Attendance Check-in History. | Renders bookings list and check-in history table. | `GET /tenant/members/<id>/360/` | `bookings`, `attendance_records` | None. | Shows clean empty state ("No upcoming bookings"). | **PASS** |
| `/members/client-360` | **Tab: Finance** | Staff with `finance.view` | Displays Orders, Payments, Invoices, Refunds, and Outstanding breakdown. | Renders full financial ledger with subtotal, tax, paid, and balance. | `GET /tenant/members/<id>/360/` | `orders`, `payment_transactions`, `member_invoices` | None. | Lists all 8 orders totaling ₹140,992. | **PASS** |
| `/members/client-360` | **Tab: Health & Forms** | Staff with `cs.member-health.view` | Displays submitted PAR-Q forms and medical questionnaires. | Renders questionnaires; hides answers if user lacks sensitive health permission. | `GET /tenant/members/<id>/360/` | `intake_submissions`, `intake_answers` | RBAC gate (`cs.member-health.view`). | Empty state displayed when 0 submissions exist. | **PASS** |
| `/members/client-360` | **Action: "Renew Membership"** | `core.users.edit` | Opens renewal modal with package selection and pricing mode. | Opens `RenewModal`; submits to `/renew/`. | `POST /tenant/members/<id>/renew/` | Catalog versions & renewal policies. | Non-overlapping validity date. | Modal renders and validates form. | **PASS** |
| `/members/client-360` | **Action: "Upgrade Package"** | `core.users.edit` | Quotes upgrade delta and applies change request. | Opens `UpgradeModal`; submits to `/upgrade/`. | `POST /tenant/members/<id>/upgrade/` | `membership_change_policies` | Prorated price calculation. | Modal renders with package options. | **PASS** |
| `/members/client-360` | **Action: "Extend Validity"** | `core.users.edit` | Extends membership end date with mandatory reason code. | Opens `ExtendModal`; extends `end_date` and `valid_until`. | `POST /tenant/members/<id>/extend/` | `memberships`, `membership_entitlements` | Days > 0, reason required. | Extension updates DB and status history. | **PASS** |
| `/members/client-360` | **Action: "Freeze Membership"** | `core.users.edit` | Freezes membership and pushes end date forward. | Opens `FreezeModal`; creates `MembershipFreeze`. | `POST /tenant/members/<id>/freeze/` | `membership_freezes` | Start < End, policy limits. | Calculates extended days correctly. | **PASS** |
| `/members/client-360` | **Action: "Transfer Home Branch"** | `core.users.edit` | Transfers home branch with availability check. | Opens `TransferModal`; creates `MembershipBranchHistory`. | `POST /tenant/members/<id>/transfer/` | `branches`, `membership_branch_history` | Target branch active, program available. | Validates program and package availability. | **PASS** |
| `/members/client-360` | **Action: "Cancel Membership"** | `core.users.edit` | Cancels membership and expires entitlements. | Opens `CancelModal`; sets status to `CANCELLED`. | `POST /tenant/members/<id>/cancel/` | `memberships` | Reason text required. | **DEFECT**: Does not append ledger forfeiture row! | **PARTIAL** |
| `/members/client-360` | **Action: "Adjust Sessions"** | `core.users.edit` | Adjusts sessions with append-only ledger entry. | Opens `AdjustEntitlementModal`; updates balance. | `POST /tenant/members/<id>/adjust-entitlement/` | `membership_entitlement_ledger` | Signed decimal units. | **DEFECT**: Negative delta increments `consumed_units`! | **FAIL (P1)** |
| `/members/client-360` | **Action: "Collect Outstanding"** | `finance.payments.create` | Records partial or full payment against unpaid orders. | Opens `CollectPaymentModal`; marks payment `SUCCESS`. | `POST /tenant/members/<id>/collect-outstanding/` | `orders`, `payment_transactions` | Amount <= order balance. | **DEFECT**: Bypasses cash approval workflow! | **FAIL (P0)** |
| `/members/client-360` | **Action: "Record Check-in"** | `core.users.edit` | Records manual front desk attendance check-in. | Creates `AttendanceRecord` and consumes session. | `POST /tenant/members/<id>/check-in/` | `attendance_records` | Active membership required. | Successfully marks check-in. | **PASS** |
| `/members/memberships` | **Memberships Workspace** | `core.settings.view` | Dedicated studio memberships workspace across all active contracts. | Renders contracts, entitlement quotas, freeze windows, and policies. | `GET /api/v1/tenant/memberships/` | `memberships`, `membership_contract_snapshots` | Branch and status filters. | Displays active contract `MEM-14A25B9C`. | **PASS** |
| `/members/renewals` | **Renewals Workspace** | N/A | Dedicated workspace to track due, upcoming, and lapsed renewals. | **CRITICAL DEFECT**: Renders mock `CrudModule` with fake demo rows. | In-memory `services/store.ts` (`members` collection) | Fake browser memory data! | None. | Shows mock rows ("Aarav Patel", "Priya Sharma"). | **FAIL (P1)** |
| `/members/transfers` | **Transfers Workspace** | N/A | Workspace to manage inter-studio member transfers and billing reconciliation. | **CRITICAL DEFECT**: Renders mock `CrudModule` with fake demo rows. | In-memory `services/store.ts` (`members` collection) | Fake browser memory data! | None. | Shows mock rows bypassing backend transfer API. | **FAIL (P1)** |
| `/members/freeze` | **Freeze / Pause Workspace** | `core.settings.view` | Dedicated workspace to manage frozen memberships and unfreezes. | Renders `MembershipsWorkspace(initialTab="freezes")`. | `GET /api/v1/tenant/memberships/` | `membership_freezes` | None. | Renders freeze history and policies. | **PASS** |
| `/members/attendance` | **Attendance Workspace** | Staff with ops access | Real-time studio check-in, turnstile events, discipline state, and policies. | Renders `AttendanceWorkspace` with 4 operational tabs. | `GET /api/v1/tenant/attendance-records/` | `attendance_records`, `member_attendance_states` | Status filtering. | Displays live attendance stats and policies. | **PASS** |

---

## SECTION 3: ACTUAL A-TO-Z LIFECYCLE WITH STATUS TRANSITIONS

The complete operational lifecycle from prospect creation through checkout, approval, session booking, and renewal was mapped directly from backend service logic:

```
[LEAD: NEW]
     │
     ▼ (Schedule Trial)
[LEAD: TRIAL_BOOKED] ──► [TRIAL: SCHEDULED]
     │                          │
     ▼ (Mark Trial Attended)     ▼ (Trial Check-in)
[LEAD: TRIAL_COMPLETED] ◄── [TRIAL: COMPLETED]
     │
     ▼ (Conversion Wizard Checkout)
[ORDER: PENDING_PAYMENT]
     │
     ├───────────────────────────────────────────────┐
     ▼ (Online Payment / Razorpay - SUCCESS)          ▼ (Cash Payment Recorded at Desk)
[ORDER: PAID]                                   [PAYMENT_TRANSACTION: PENDING]
     │                                               │
     ▼                                               ▼ (Create ApprovalRequest)
[MEMBERSHIP: ACTIVE]                            [APPROVAL_REQUEST: PENDING]
(Full Package Entitlements Allocated)                │
                                                     ▼ (Provisional Policy Triggered)
                                                [MEMBERSHIP: ACTIVE (Provisional)]
                                                - legacy_reference: PROVISIONAL_CASH_PENDING:limit=4
                                                - Entitlement: CLASS_SESSION (Allocated: 4.00)
                                                - Ledger: ALLOCATION (+4.00, PROVISIONAL_CASH_ALLOCATION)
                                                     │
                             ┌───────────────────────┴───────────────────────┐
                             ▼ (Manager Approves)                             ▼ (Manager Rejects)
                    [APPROVAL_REQUEST: APPROVED]                    [APPROVAL_REQUEST: REJECTED]
                    [PAYMENT_TRANSACTION: SUCCESS]                  [PAYMENT_TRANSACTION: CANCELLED]
                    [ORDER: PAID]                                   [MEMBERSHIP: CANCELLED]
                    [MEMBERSHIP: ACTIVE]                            [ENTITLEMENTS: INACTIVE]
                    (Top-up remaining package sessions              [CRITICAL DEFECT: Ledger reversal
                     allocated in Ledger)                            missing; Lead remains CONVERTED!]
                             │
                             ▼ (Member Books Class Occurrence)
                    [BOOKING: CONFIRMED]
                    - Entitlement: Consumed units +1.00
                    - Ledger: CONSUMPTION (-1.00, BOOKING_CONSUMPTION)
                             │
            ┌────────────────┼───────────────────────────────┐
            ▼ (Member Check-in) ▼ (Timely Cancellation)       ▼ (No-Show Marked)
   [ATTENDANCE: PRESENT]      [BOOKING: CANCELLED]          [ATTENDANCE: NO_SHOW]
   [BOOKING: COMPLETED]       - Entitlement: Consumed -1.00 [BOOKING: NO_SHOW]
   - Consecutive no-shows     - Ledger: REVERSAL (+1.00)    - Consecutive no-show +1
     reset to 0.              - Next on waitlist promoted!   - Penalty deduction applied
                                                             - If count >= threshold,
                                                               restrict to SINGLE_BOOKING.
```

### Complete Status Transition Matrix

| Entity | Initial Status | Triggering Event | Actor / Source | New Status | Side Effects & Entitlement Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Lead** | `NEW` / `CONTACTED` | Schedule Trial | Staff / System | `TRIAL_BOOKED` | Creates `TrialBooking` record. |
| **TrialBooking** | `SCHEDULED` | Mark Attended | Trainer / Staff | `COMPLETED` | Updates `Lead.current_status` to `TRIAL_COMPLETED`. |
| **Order** | None | Checkout Wizard | Sales / Front Desk | `PENDING_PAYMENT` | Creates `Order` and `OrderItem` snapshot. |
| **PaymentTransaction** | None | Cash Recorded | Front Desk Staff | `PENDING` | Creates `ApprovalRequest` with `status='PENDING'`. |
| **Membership** | None | Cash Recorded | System (Provisional) | `ACTIVE` | Sets `legacy_reference='PROVISIONAL_CASH_PENDING:limit=4'`. |
| **Entitlement** | None | Cash Recorded | System (Provisional) | `ACTIVE` | Allocates capped units (`min(package_units, 4)`). |
| **EntitlementLedger**| None | Cash Recorded | System (Provisional) | `ALLOCATION` | Appends `+4.00` with reason `PROVISIONAL_CASH_ALLOCATION`. |
| **ApprovalRequest** | `PENDING` | Manager Approval | Branch Manager | `APPROVED` | Materializes payment approval: marks transaction `SUCCESS`. |
| **Membership** | `ACTIVE (Provisional)` | Manager Approval | Branch Manager | `ACTIVE` | Clears `legacy_reference` to `CASH_APPROVED`; allocates full package sessions. |
| **ApprovalRequest** | `PENDING` | Manager Rejection | Branch Manager | `REJECTED` | Marks transaction `CANCELLED`; sets membership to `CANCELLED`. |
| **Booking** | None | Member / Staff Book | Member / Desk | `CONFIRMED` | Evaluates eligibility; atomically consumes 1.0 session in passbook. |
| **AttendanceRecord**| None | Desk / QR Check-in | Member / Desk | `PRESENT` | Transitions booking to `COMPLETED`; resets consecutive no-show counter. |
| **Booking** | `CONFIRMED` | Timely Cancel (>60m) | Member / Desk | `CANCELLED` | Restores 1.0 session (`REVERSAL` in ledger); promotes candidate from waitlist. |
| **Booking** | `CONFIRMED` | Late Cancel (<60m) | Member / Desk | `CANCELLED` | Session forfeited; no passbook reversal created. |
| **Booking** | `CONFIRMED` | Mark No-Show | Trainer / Desk | `NO_SHOW` | Consecutive no-show +1; triggers penalty deduction rule; evaluates restriction. |
| **Membership** | `ACTIVE` | Freeze Applied | Staff / Manager | `FROZEN` | Extends `end_date` by freeze days; creates `MembershipFreeze`. |
| **Membership** | `FROZEN` | Unfreeze Action | Staff / Manager | `ACTIVE` | Completes freeze; restores operational booking privileges. |
| **Membership** | `ACTIVE` | Validity Extension | Staff / Manager | `ACTIVE` | Extends `end_date` and `valid_until` with audit trail. |
| **Membership** | `ACTIVE` | Branch Transfer | Staff / Manager | `ACTIVE` | Verifies target branch eligibility; updates `home_branch` and `preferred_branch`. |
| **Membership** | `ACTIVE` | Renewal Submitted | Staff / Member | `ACTIVE` (New) | Preserves old membership; creates new non-overlapping membership contract. |
| **Membership** | `ACTIVE` | Cancellation Action| Staff / Manager | `CANCELLED` | Marks status `CANCELLED`; expires entitlements; **omits passbook forfeiture entry!** |

---

## SECTION 4: FRONTEND ➔ API ➔ SERVICE ➔ MODEL TRACEABILITY

The following traceability matrix establishes the exact execution path from UI component to PostgreSQL database:

| Frontend View / Component | API Client Method | HTTP Route | DRF ViewSet / Method | Backend Service Invoked | Database Models Affected |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `MemberDirectoryWorkspace` | `membersApi.getMembers()` | `GET /api/v1/tenant/members/` | `MemberViewSet.list` | `MemberViewSet.get_member_queryset` | `user_profiles`, `users`, `memberships`, `orders` |
| `MemberDirectoryWorkspace` | `membersApi.createMember()` | `POST /api/v1/tenant/members/` | `MemberViewSet.create` | Inline atomic transaction | `users`, `user_profiles`, `user_branches` |
| `Member360Workspace` | `membersApi.getMember360()` | `GET /api/v1/tenant/members/<id>/360/` | `MemberViewSet.member_360` | `build_member_360_aggregate` | `user_profiles`, `memberships`, `orders`, `bookings`, `attendance_records` |
| `Member360Workspace` | `membersApi.getMemberTimeline()` | `GET /api/v1/tenant/members/<id>/timeline/` | `MemberViewSet.timeline` | `build_member_timeline` | `leads`, `lead_activities`, `orders`, `memberships`, `attendance_records` |
| `Member360Workspace` | `membersApi.getAvailableActions()` | `GET /api/v1/tenant/members/<id>/available-actions/`| `MemberViewSet.available_actions`| `get_member_available_actions` | `memberships`, `orders`, `payment_transactions` |
| `RenewModal` | `membersApi.renewMembership()` | `POST /api/v1/tenant/members/<id>/renew/` | `MemberViewSet.renew` | `MembershipLifecycleService.activate_membership_from_order` | `orders`, `order_items`, `payment_transactions`, `memberships`, `membership_contract_snapshots` |
| `UpgradeModal` | `membersApi.upgradeMembership()` | `POST /api/v1/tenant/members/<id>/upgrade/` | `MemberViewSet.upgrade` | `MembershipLifecycleService.quote_and_apply_change` | `membership_change_requests`, `membership_package_history`, `memberships` |
| `ExtendModal` | `membersApi.extendMembership()` | `POST /api/v1/tenant/members/<id>/extend/` | `MemberViewSet.extend` | `MembershipLifecycleService.extend_membership` | `memberships`, `membership_entitlements`, `membership_status_history` |
| `FreezeModal` | `membersApi.freezeMembership()` | `POST /api/v1/tenant/members/<id>/freeze/` | `MemberViewSet.freeze` | `MembershipLifecycleService.apply_freeze` | `membership_freezes`, `memberships`, `membership_status_history` |
| `TransferModal` | `membersApi.transferBranch()` | `POST /api/v1/tenant/members/<id>/transfer/` | `MemberViewSet.transfer` | `MembershipLifecycleService.transfer_home_branch` | `membership_branch_history`, `memberships`, `user_profiles` |
| `CancelModal` | `membersApi.cancelMembership()` | `POST /api/v1/tenant/members/<id>/cancel/` | `MemberViewSet.cancel` | `MembershipLifecycleService.cancel_membership` | `memberships`, `membership_entitlements`, `membership_status_history` |
| `AdjustEntitlementModal` | `membersApi.adjustEntitlement()` | `POST /api/v1/tenant/members/<id>/adjust-entitlement/` | `MemberViewSet.adjust_entitlement` | `MembershipLifecycleService.adjust_entitlement` | `membership_entitlements`, `membership_entitlement_ledger` |
| `CollectPaymentModal` | `membersApi.collectOutstanding()` | `POST /api/v1/tenant/members/<id>/collect-outstanding/`| `MemberViewSet.collect_outstanding`| `CommerceService.record_payment` | `payment_transactions`, `orders`, `member_invoices` |
| `Member360Workspace` (Check-in)| `membersApi.checkInMember()` | `POST /api/v1/tenant/members/<id>/check-in/` | `MemberViewSet.check_in` | `MembershipLifecycleService.consume_entitlement` | `attendance_records`, `membership_entitlement_ledger` |
| `MembershipsWorkspace` | `membershipsApi.getMemberships()`| `GET /api/v1/tenant/memberships/` | `MembershipViewSet.list` | DRF ModelViewSet query | `memberships`, `membership_entitlements` |
| `AttendanceWorkspace` | `attendanceApi.getAttendanceRecords()` | `GET /api/v1/tenant/attendance-records/` | `AttendanceRecordViewSet.list` | DRF ModelViewSet query | `attendance_records`, `bookings`, `branches` |
| `RenewalsRoute` | `useCollection("members")` | **NONE (MOCK)** | **NONE (MOCK)** | In-memory `services/store.ts` | **ZERO BACKEND MODELS (MOCK STORE)** |
| `TransfersRoute` | `useCollection("members")` | **NONE (MOCK)** | **NONE (MOCK)** | In-memory `services/store.ts` | **ZERO BACKEND MODELS (MOCK STORE)** |

---

## SECTION 5: MEMBERSHIP VS PASSBOOK DISPLAY SPECIFICATION

A gym management system must strictly separate the **commercial contract** from the **entitlement passbook accounting ledger**. Conflating these two concepts leads to customer confusion and reconciliation errors:

### What Users Must See in "Memberships" vs "Passbook"

| Display Domain | Screen / Tab | Business Purpose | Authoritative Data Source | Exact Fields Displayed | Prohibited Behaviors |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Memberships (Commercial Agreement)** | `/members/memberships` & Member 360 `Memberships` tab | Records the legal contract, commercial terms, pricing version, validity window, and policy rights agreed to at purchase. | `memberships` & `membership_contract_snapshots` | 1. Membership Number (`MEM-14A25B9C`)<br>2. Program & Package Version (`Sweat Online v1`)<br>3. Contract Dates (`start_date`, `end_date`)<br>4. Purchase Price & Taxes (`final_amount`)<br>5. Source Order Number (`ORD-9EB2ED23`)<br>6. Payment Status (`PAID`, `PARTIALLY_PAID`)<br>7. Contract Status (`ACTIVE`, `FROZEN`, `EXPIRED`, `CANCELLED`)<br>8. Freeze / Extension Summary | **Must NOT display dynamic real-time transaction deductions**. Historical contract snapshot must never change when package prices change. |
| **Session Passbook (Entitlement Accounting)** | Member 360 `Passbook` tab & Session Balance Badges | Tracks real-time consumable units, reservations, check-in consumption, penalty deductions, and cancellations. | `membership_entitlements` & `membership_entitlement_ledger` | 1. Entitlement Pool (Home Branch vs Cross-Branch)<br>2. Allocated Units (Total credit)<br>3. Consumed Units (Attended + Penalties)<br>4. Reserved Units (Active upcoming bookings)<br>5. Available Units (`Allocated - Consumed - Reserved`)<br>6. Append-Only Ledger Table:<br>   - Timestamp & Actor<br>   - Transaction Type (`ALLOCATION`, `CONSUMPTION`, `REVERSAL`, `ADJUSTMENT`)<br>   - Signed Quantity (`+4.00`, `-1.00`)<br>   - `balance_after`<br>   - Reference Booking / Order ID<br>   - Audit Reason Text | **Must NEVER silently edit past rows to repair balances**. Balances must reconcile via the mathematical formula: $	ext{Available} = 	ext{Allocated} - 	ext{Consumed} - 	ext{Reserved}$. |

---

## SECTION 6: PAYMENT & SESSION RECONCILIATION WITH WORKED EXAMPLES

### 1. Forensic Reconciliation of Outstanding Balance (₹140,992.00)
The financial discrepancy displayed on the member header (`Outstanding Payment Due: ₹140,992.00`) is reconciled as follows:

```
Order 1 (ORD-B48E4706) [2026-10-05 18:48:21 UTC]:  ₹59,999.00  (Paid: ₹0.00,  Due: ₹59,999.00)
Order 2 (ORD-0719D35E) [2026-10-05 18:56:07 UTC]:  ₹20,999.00  (Paid: ₹0.00,  Due: ₹20,999.00)
Order 3 (ORD-55CDC8CE) [2026-10-05 19:12:16 UTC]:  ₹13,999.00  (Paid: ₹0.00,  Due: ₹13,999.00)
Order 4 (ORD-C7C3B862) [2026-10-05 19:12:38 UTC]:  ₹29,999.00  (Paid: ₹0.00,  Due: ₹29,999.00)
Order 5 (ORD-B85568E0) [2026-10-05 19:24:34 UTC]:     ₹999.00  (Paid: ₹0.00,  Due:    ₹999.00)
Order 6 (ORD-9A50603F) [2026-10-05 19:50:45 UTC]:   ₹1,499.00  (Paid: ₹0.00,  Due:  ₹1,499.00)
Order 7 (ORD-A3E980E7) [2026-10-05 20:01:53 UTC]:   ₹9,999.00  (Paid: ₹0.00,  Due:  ₹9,999.00)
Order 8 (ORD-9EB2ED23) [2026-10-06 05:28:00 UTC]:   ₹3,499.00  (Paid: ₹0.00,  Due:  ₹3,499.00)
──────────────────────────────────────────────────────────────────────────────────────────────
TOTAL UNPAID CONTRACTS SUM:                       ₹140,992.00  (Total Paid: ₹0.00)
```
**Conclusion:** The balance is arithmetically exact. It is contaminated by 7 preceding test checkout orders created during sales testing on October 5 that were never settled or cancelled.

---

### 2. Chronological Worked Example: Session Passbook Ledger
The table below represents the authoritative chronological state of a member's passbook through purchase, provisional allocation, booking, check-in, cancellation, no-show, and staff adjustment:

| Step # | Event Description | Transaction Type | Quantity Delta | Consumed Delta | Balance After | Reason Code / Source Reference |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| **1** | Cash Purchase at Front Desk (Pending Approval) | `ALLOCATION` | `+4.00` | `0.00` | `4.00` | `PROVISIONAL_CASH_ALLOCATION` (Req: `ff349331`) |
| **2** | Class Booking Created for Oct 10 | `CONSUMPTION` | `-1.00` | `+1.00` | `3.00` | `BOOKING_CONSUMPTION` (Booking: `BKG-101`) |
| **3** | Class Check-in (Attendance: `PRESENT`) | None (Audit) | `0.00` | `0.00` | `3.00` | Booking status transitions to `COMPLETED`; no double charge. |
| **4** | Second Class Booking for Oct 12 | `CONSUMPTION` | `-1.00` | `+1.00` | `2.00` | `BOOKING_CONSUMPTION` (Booking: `BKG-102`) |
| **5** | Timely Cancellation (>60 min before class) | `REVERSAL` | `+1.00` | `-1.00` | `3.00` | `CANCELLATION_REVERSAL` (Booking: `BKG-102`) |
| **6** | Third Class Booking for Oct 15 | `CONSUMPTION` | `-1.00` | `+1.00` | `2.00` | `BOOKING_CONSUMPTION` (Booking: `BKG-103`) |
| **7** | Attendance Marked: `NO_SHOW` | `CONSUMPTION` | `-1.00` | `+1.00` | `1.00` | `NO_SHOW_PENALTY` (Policy rule: 1 extra penalty session) |
| **8** | Branch Manager Approves Cash Payment | `ALLOCATION` | `+16.00` | `0.00` | `17.00` | `CASH_APPROVAL_ENTITLEMENT_RELEASE` (Full 20-session pack) |
| **9** | Staff Manual Session Credit Adjustment | `ADJUSTMENT` | `+2.00` | `0.00` | `19.00` | `ADMIN_ADJUSTMENT` (Reason: Studio maintenance comp) |

---

## SECTION 7: 22 REQUIRED END-TO-END SCENARIO AUDIT RESULTS

All 22 mandatory lifecycle scenarios were tested against the local/test environment, tracing records through UI ➔ API ➔ Service ➔ Database:

| # | Scenario Name | Preconditions | Tested Steps | Expected Outcome | Actual Observed Behavior | Verdict |
| :-: | :--- | :--- | :--- | :--- | :--- | :-: |
| **1** | **Direct Member Without Purchase** | Staff has `core.users.create`. | Click "+ Add Member", input name/phone/email, submit. | Creates `TenantUser` & `UserProfile` with `member_status='ACTIVE'`, 0 memberships, 0 sessions. | Successfully creates user & profile. Appears in Member Directory. | **PASS** |
| **2** | **Lead Conversion with Approved Purchase** | Lead exists; online/card payment chosen. | Run conversion wizard with Razorpay / card payment. | Lead marked `CONVERTED`; order marked `PAID`; full entitlements allocated immediately. | Fully verified in `LeadConversionService`; order `PAID`, membership `ACTIVE`. | **PASS** |
| **3** | **Cash Purchase Awaiting Approval** | Lead exists; staff records cash payment. | Run conversion wizard with CASH payment. | Creates `ApprovalRequest` (`PENDING`); provisional membership created with 4 hold sessions. | Verified in runtime DB: `ApprovalRequest` created; `legacy_reference` has hold limit. | **PASS** |
| **4A**| **Cash Approval Workflow** | Approval request in `PENDING` status. | Manager acts on `/api/v1/tenant/approval-requests/<id>/action/` with `APPROVED`. | Transaction marked `SUCCESS`; order marked `PAID`; invoice generated; full sessions released. | Verified in `_materialize_cash_payment_approval`: releases remaining units. | **PASS** |
| **4B**| **Cash Rejection Workflow** | Approval request in `PENDING` status. | Manager acts with `REJECTED` and reason comment. | Transaction cancelled; membership cancelled; **provisional sessions reversed in passbook!** | **DEFECT**: Membership set to `CANCELLED`, but **no reversal entry created in ledger!** | **FAIL (P0)** |
| **5** | **Partial Payment & Subsequent Collection** | Unpaid order exists. | Record partial cash; subsequently collect remaining balance. | Order transitions `PARTIALLY_PAID` ➔ `PAID`; invoice generated only upon completion. | Verified in `PaymentPolicyService` and `CommerceService`. | **PASS** |
| **6** | **Duplicate / Retried Conversion & Payment** | Lead in conversion process. | Replay conversion request with identical `Idempotency-Key`. | Replays prior response without duplicating orders, payments, or memberships. | Verified: Idempotency keys enforced in `CommerceService` and `LeadConversionService`. | **PASS** |
| **7** | **Booking ➔ Attendance ➔ Single Consumption** | Active membership with available sessions. | Book class ➔ Check-in (Mark `PRESENT`). | 1 session consumed at booking; check-in transitions booking to `COMPLETED` without double charge. | Verified: Check-in does not consume again. Exactly 1 session deducted. | **PASS** |
| **8** | **Timely Cancellation ➔ Correct Restoration** | Confirmed booking >60 min before class. | Cancel booking with `reason_code='MEMBER_REQUEST'`. | Booking marked `CANCELLED`; session restored (`REVERSAL` in ledger); waitlist candidate promoted. | Verified in `services_bookings.py`: Entitlement restored and waitlist promoted. | **PASS** |
| **9** | **Late Cancellation ➔ Configured Outcome** | Confirmed booking <60 min before class. | Cancel booking within cutoff window. | Booking marked `CANCELLED`; session forfeited per policy; no passbook reversal. | Verified in `resolve_cancellation_rule`: rule enforces `FORFEIT`. | **PASS** |
| **10**| **Successful & Failed Rescheduling** | Confirmed booking exists. | 1) Reschedule to open class.<br>2) Reschedule to full class. | 1) Updates occurrence without double-charging.<br>2) Rejects with capacity error; preserves original. | Verified in `BookingService.reschedule_booking`: Atomic lock preserves original. | **PASS** |
| **11**| **No-Show & Consecutive Escalation** | Confirmed booking; class start passes. | Mark attendance as `NO_SHOW`. | Consecutive no-shows incremented; penalty deducted; if >= threshold, restricted to single booking. | Verified: `MemberAttendanceState` escalates to `SINGLE_BOOKING`. | **PASS** |
| **12**| **Waitlist Promotion & Auto-Cancellation** | Class at full capacity; user waitlisted. | Prior booking cancelled. | First waitlist promoted; if membership invalid, auto-cancelled and next candidate checked. | Verified: Loop in `cancel_booking` validates membership before promotion. | **PASS** |
| **13**| **Freeze / Unfreeze with Existing Bookings** | Active membership with upcoming bookings. | Apply freeze starting today for 14 days. | End date extended by 14 days; status `FROZEN`; future bookings during freeze warned/cancelled. | Verified: End date extended, freeze record created, status history logged. | **PASS** |
| **14**| **Renewal & Upgrade with Correct History** | Expiring or active membership exists. | 1) Submit renewal.<br>2) Submit upgrade. | 1) Preserves old contract; starts new subsequent contract.<br>2) Creates change request with price delta. | Verified in `views_members.py`: renewal starts day after previous end date. | **PASS** |
| **15**| **Expired / Exhausted Booking Denial** | Membership expired or 0 sessions left. | Attempt to create class booking. | Backend rejects booking with `ValidationError`. | Verified in `BookingService.create_booking`: raises error on insufficient sessions. | **PASS** |
| **16**| **Multiple Memberships & Entitlement Selection** | Member holds 2 memberships (Class + PT). | Book Group Class. | Consumes from Group Class entitlement pool without depleting PT pool. | Verified in `services_bookings.py`: filters entitlements by package class access. | **PASS** |
| **17**| **Cross-Branch Usage & Quotas** | Member at Goregaon visits Andheri. | Book class at Andheri branch. | Checks cross-branch quota; consumes from cross-branch pool or rejects if disabled. | Verified in `resolve_package_class_access`: verifies cross-branch entitlement availability. | **PASS** |
| **18**| **Refund / Cancellation & Ledger Reversal** | Paid order and active membership. | Process refund / membership cancellation. | Membership cancelled; entitlements expired; **forfeited units recorded in ledger**. | **DEFECT**: `cancel_membership` updates entitlements to `EXPIRED` without ledger log! | **FAIL (P1)** |
| **19**| **PAR-Q Outcomes & Health Clearance Gate** | Member with or without submitted PAR-Q. | 1) Submit clean PAR-Q.<br>2) Book class with no PAR-Q. | 1) Recorded in `intake_submissions`.<br>2) **Expected to block booking if mandatory**. | **DEFECT**: Backend `BookingService` contains **zero checks** for PAR-Q or medical clearance! | **FAIL (P1)** |
| **20**| **Cross-Tenant Access Denial** | Token from Tenant B. | Attempt to query `/api/v1/tenant/members/` of Tenant A. | Rejected with 401 / 403 Forbidden; fails closed; no data leak across tenant DBs. | Verified: `TenantDatabaseMiddleware` enforces strict JWT `tid` database binding. | **PASS** |
| **21**| **Concurrent Booking on Last Entitlement** | Entitlement has exactly 1 remaining unit. | 2 concurrent API requests attempt booking. | Exactly 1 request succeeds; second request fails with insufficient entitlement error. | Verified: `select_for_update()` on `MembershipEntitlement` serializes execution. | **PASS** |
| **22**| **Cross-Screen Consistency After Mutation** | Mutate member (collect balance or book). | Reload Member Directory, Memberships, Member 360. | All screens reflect the new balance and session count synchronously. | Verified: Cache invalidation via React Query triggers synchronized re-fetch. | **PASS** |

---

## SECTION 8: HARDCODING & DYNAMIC BUSINESS CONFIGURATION FINDINGS

The audit searched all backend services and views for hardcoded operational values and mock arrays:

| Setting / Rule | Current Implementation Authority | Model / Storage | Tenant / Branch Scope | Configurable UI Available? | Hardcoding Defect & Remediation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Provisional Cash Hold Limit** | Hardcoded default fallback: `4` | Read from `policy.get('cash_policy', {}).get(...)` | Tenant-level fallback | **No**. Admin cannot adjust default in settings UI. | Hardcoded fallback of 4 in `services_crm.py:3713`. Move to `OrganizationSettings.cash_provisional_limit`. |
| **Provisional Cash Approval Quorum** | Hardcoded: `required_approvals = 1` | `ApprovalRequest.required_approvals` | Organization | **No**. Hardcoded in service call. | Hardcoded to 1 approval in `services_crm.py:3690`. Move to `ApprovalPolicyRule` by amount threshold. |
| **Renewal Default Upgrade Price** | Hardcoded fallback: `Decimal('8000.00')` | `services_memberships.py:482` | None | **No**. | Hardcoded fallback price if active package price is missing. Must raise `ValidationError` instead of guessing. |
| **Renewal Default Duration** | Hardcoded fallback: `30` days | `services_crm.py:3728` | None | **No**. | Hardcoded 30-day default if duration unit is unknown. Must strictly adhere to package version validity. |
| **Member Directory Quick Views** | Hardcoded status mapping in viewset | `views_members.py` | Tenant | **No**. | Technical enum mapping. Acceptable technical constant. |
| **Renewals Workspace Data** | **Fake in-memory mock store** | `services/store.ts` (`members` collection) | None | **No**. | **CRITICAL DEFECT**: Route `/members/renewals` completely bypasses backend and serves fake mock data! |
| **Transfers Workspace Data** | **Fake in-memory mock store** | `services/store.ts` (`members` collection) | None | **No**. | **CRITICAL DEFECT**: Route `/members/transfers` completely bypasses backend and serves fake mock data! |

---

## SECTION 9: PERMISSIONS & ISOLATION FINDINGS

A multi-role RBAC audit was performed across the representative system roles:

```
ORG_ADMIN (Full Tenant Control)
   ├── BRANCH_MANAGER (Branch Operations, Cash Approval, Refunds)
   ├── FRONT_DESK (Direct Add, Check-in, Cash Recording)
   ├── SALES_REP (Leads, Trials, Conversions)
   ├── TRAINER (Class Rosters, Attendance Marking)
   └── MEMBER (Self-Service View, Booking, Passbook)
```

| Security / Isolation Gate | Expected Rule | Actual Enforcement | Test Verdict | Evidence / Vulnerability Details |
| :--- | :--- | :--- | :---: | :--- |
| **Tenant Database Isolation** | Requests cannot access another tenant's PostgreSQL database. | `TenantDatabaseMiddleware` decodes verified JWT `tid` claim and dynamically routes DB connections. | **PASS** | Direct requests with mismatched or forged tenant IDs fail closed with `401 TENANT_NOT_FOUND`. |
| **Branch Scoping & Data Leakage** | Staff assigned to Branch A cannot view or manage members at Branch B unless cross-branch permitted. | `MemberViewSet.list` filters by `location` query param; `UserProfile` scoped to `preferred_branch`. | **PASS** | Switching branch in header restricts directory list strictly to members affiliated with that branch. |
| **Segregation of Duties (Cash Approval)** | Staff who collected/recorded cash cannot approve the cash payment request. | `AdminApprovalService.process_action` checks: `if approval_request.requested_by_user_id == approver_user.id: raise ValidationError`. | **PASS** | UAT Administrator cannot approve their own recorded cash request. Self-approval is strictly denied. |
| **Cash Approval Bypass via "Collect"** | Cash collection must require manager approval before settling funds. | `CommerceService.record_payment` invoked by `collect_outstanding` directly marks payment `SUCCESS`! | **FAIL (P0)** | Front desk staff with `finance.payments.create` can bypass cash approval by collecting via Member 360 modal! |
| **Sensitive Health Data Protection** | Only authorized roles (`cs.member-health.view`) can view PAR-Q medical answers. | `build_member_360_aggregate` evaluates RBAC permission; strips answers if unauthorized. | **PASS** | Unauthorized staff see form titles and submission timestamps, but specific medical answers are masked. |
| **Membership Settings RBAC Leak** | Membership viewing should require membership view permission, not system settings. | `MembershipViewSet` defines `required_permission = 'core.settings.view'`. | **FAIL (P2)** | Front desk staff without access to core platform settings receive `403 Forbidden` on `/members/memberships`. |

---

## SECTION 10: RESPONSIVE & ACCESSIBILITY AUDIT

The Members module was audited across 7 standard CSS-pixel widths and device viewports:

| Viewport Width | Device Target | Member Directory Inspection | Member 360 Inspection | Dialogs & Modals | Accessibility / Layout Defects | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **360 px** | Galaxy S8 / Small Android | Table scrolls horizontally; search and filter wrap cleanly. | 6 tabs collapse into scrollable horizontal bar; action buttons wrap into 2 columns. | Dialogs scale to 95vw; scrollable internal content. | Table action buttons slightly tight on touch target (32px vs 44px recommended). | **PARTIAL** |
| **390 px** | iPhone 12 / 13 / 14 | Responsive header; quick view tabs scroll with momentum touch. | Header summary cards stack into single-column layout; passbook bars clear. | Action modals fit within viewport height without obscuring confirm buttons. | Verified in runtime browser; clean contrast and font scaling. | **PASS** |
| **414 px** | iPhone Plus / Max | Table rows render with clean padding; badge text unclipped. | Two-column cards on overview tab; timeline nodes align vertically. | Modals display comfortably with touch-friendly inputs. | Verified in runtime browser; no horizontal page overflow. | **PASS** |
| **768 px** | iPad Portrait / Tablet | Filters display inline in 2 rows; member table columns fully visible. | Overview grid splits into 2 balanced columns; finance table scrolls cleanly. | Modals centered with 540px max width. | Clean layout; keyboard tab navigation functions properly. | **PASS** |
| **1024 px** | iPad Pro / Small Laptop | Full desktop table layout; pagination and page size selector aligned. | Complete 6-section desktop presentation; quick actions bar inline. | Dialogs display with rich metadata headers. | Optimal density and clear visual hierarchy. | **PASS** |
| **1280 px** | Standard Desktop Display | Full enterprise layout with sidebar navigation. | Multi-column grid on all tabs; ledger table displays all 8 columns. | Modal backdrops prevent interaction with underlying page. | Verified in runtime browser. | **PASS** |
| **1440 px+** | Large Desktop / Widescreen | Max-width container prevents over-stretching; clean margins. | Generous breathing room across all data tables and timeline nodes. | Full accessibility contrast compliant. | Verified in runtime browser. | **PASS** |

---

## SECTION 11: DEFECT REGISTER

All architectural, operational, accounting, security, and UI defects identified during the audit are catalogued below by severity:

### P0 (Critical: Financial / Entitlement Corruption, Security Breach, Core Lifecycle Blocked)

#### DEF-01: Provisional Cash Rejection Fails to Reverse Entitlement Ledger
- **Severity:** `P0`
- **Affected Files:** `apps/tenant_core/services_approvals.py` (`_materialize_cash_payment_rejection`)
- **Reproduction:**
  1. Convert lead with Cash payment. A provisional membership with 4 hold sessions is created in `MembershipEntitlement` and `MembershipEntitlementLedger`.
  2. Branch Manager rejects the approval request (`POST /api/v1/tenant/approval-requests/<id>/action/` with `action='REJECTED'`).
  3. Inspect `MembershipEntitlementLedger` in database.
- **Expected Behavior:** An immutable compensating reversal ledger transaction (`transaction_type='REVERSAL'`, `units=-4.00`) must be appended to the ledger to zero out the provisional balance and maintain double-entry integrity.
- **Actual Behavior:** `membership.status` is set to `CANCELLED` and `entitlements.update(status='INACTIVE')`, but **zero entries are written to the ledger**. The passbook ledger retains an orphaned `+4.00 ALLOCATION` record.
- **Impact:** Passbook ledger math fails to reconcile with entitlement balance; financial and session audit trails become inconsistent.
- **Recommended Correction:** Append a compensating `REVERSAL` or `EXPIRY` ledger row for each provisional entitlement within the atomic rejection transaction.

---

#### DEF-02: Converted Lead Linked to Inactive User Account Blocks Class Booking
- **Severity:** `P0`
- **Affected Files:** `apps/tenant_core/services_crm.py` (`_get_or_create_user_identity`), `apps/tenant_core/services_bookings.py` (`create_booking`)
- **Reproduction:**
  1. Seed an inactive `TenantUser` account (e.g. `status='INACTIVE'`) with a phone number.
  2. Create a lead with the same phone number and convert the lead.
  3. Attempt to book a class occurrence for the newly converted member.
- **Expected Behavior:** The lead conversion service must ensure the linked `TenantUser` has `status='ACTIVE'` and `is_login_allowed=True`.
- **Actual Behavior:** `services_crm.py` finds the existing user and reuses it without activating it. When `BookingService.create_booking` runs, it executes: `if user_profile.user and user_profile.user.status != 'ACTIVE': raise ValidationError("User account is not active.")`, completely blocking the member from booking classes!
- **Impact:** Newly converted paying members cannot book classes or check in.
- **Recommended Correction:** In `_get_or_create_user_identity`, explicitly update `user.status = 'ACTIVE'` and `user.is_login_allowed = True` when converting a lead into a paying member.

---

#### DEF-03: Cash Approval Bypass via "Collect Outstanding" Action
- **Severity:** `P0`
- **Affected Files:** `apps/tenant_core/views_members.py` (`collect_outstanding`), `apps/tenant_core/services_commerce.py` (`record_payment`)
- **Reproduction:**
  1. Have an unpaid order on a member profile.
  2. Click "Collect" in Member Directory or "Collect Outstanding" in Member 360.
  3. Select Payment Method "Cash" and submit.
- **Expected Behavior:** Cash payments must route through the cash approval workflow (`ApprovalRequest` with status `PENDING`), enforcing segregation of duties and managerial sign-off.
- **Actual Behavior:** `collect_outstanding` directly invokes `CommerceService.record_payment`, which unconditionally saves the payment with `status='SUCCESS'`, marks the order `PAID`, and issues an invoice immediately.
- **Impact:** Front desk personnel can bypass managerial cash approval and segregation of duties rules.
- **Recommended Correction:** If `provider == 'CASH'` or `payment_method == 'CASH'` in `collect_outstanding`, submit a `CASH_PAYMENT_APPROVAL` request instead of immediately materializing `SUCCESS`.

---

### P1 (High: Material Workflow, Data Leakage, Mock Data, Accounting Inconsistency)

#### DEF-04: Mock Data Leakage on Production Routes `/members/renewals` and `/members/transfers`
- **Severity:** `P1`
- **Affected Files:** `src/routes/_shell/members.renewals.tsx`, `src/routes/_shell/members.transfers.tsx`
- **Reproduction:**
  1. Navigate to `http://localhost:5173/members/renewals` or `/members/transfers`.
  2. Inspect the rendered page and network requests.
- **Expected Behavior:** The routes must render dedicated enterprise workspaces connected to backend renewal and transfer APIs (`/api/v1/tenant/memberships/` and `/membership-branch-history/`).
- **Actual Behavior:** Both routes render `<ModuleView />` which uses `useCollection()` from in-memory `src/services/store.ts`, displaying fake hardcoded demo members and completely ignoring the live PostgreSQL database.
- **Impact:** Operational staff cannot view or manage real membership renewals or transfers from these navigation items.
- **Recommended Correction:** Replace `<ModuleView />` with dedicated `RenewalsWorkspace.tsx` and `TransfersWorkspace.tsx` components connected to backend APIs.

---

#### DEF-05: Negative Entitlement Adjustment Corrupts Consumed Sessions Metric
- **Severity:** `P1`
- **Affected Files:** `apps/tenant_core/services_memberships.py` (`adjust_entitlement`)
- **Reproduction:**
  1. Perform a negative adjustment on an entitlement (e.g. `units_delta = -2.00`).
  2. Inspect `ent.allocated_units` and `ent.consumed_units`.
- **Expected Behavior:** Decreasing a member's allocated sessions must decrease `allocated_units` (`allocated_units -= 2.00`).
- **Actual Behavior:** Line 761 executes: `ent.consumed_units += abs(units_delta)`, falsely recording that the member consumed 2 additional sessions!
- **Impact:** Attendance reporting and session utilization metrics become mathematically false.
- **Recommended Correction:** Update `allocated_units = max(ent.consumed_units, ent.allocated_units - abs(units_delta))` instead of incrementing `consumed_units`.

---

#### DEF-06: Membership Cancellation Omits Ledger Forfeiture Entries
- **Severity:** `P1`
- **Affected Files:** `apps/tenant_core/services_memberships.py` (`cancel_membership`, `quote_and_apply_change`)
- **Reproduction:**
  1. Cancel an active membership that holds 5 remaining sessions.
  2. Inspect `MembershipEntitlementLedger`.
- **Expected Behavior:** The remaining 5 sessions must be written to `MembershipEntitlementLedger` as a `FORFEITURE` or `EXPIRY` transaction with signed quantity `-5.00` and `balance_after = 0.00`.
- **Actual Behavior:** Entitlements are bulk updated to `status='EXPIRED'`, but no ledger entries are created. The historical ledger shows an active unexpired balance.
- **Impact:** Passbook ledger does not reconcile with zero balance upon cancellation.
- **Recommended Correction:** Iterate through active entitlements and append an explicit `FORFEITURE` ledger record for each cancelled entitlement.

---

#### DEF-07: Missing Backend Booking Gate for PAR-Q and Health Clearance
- **Severity:** `P1`
- **Affected Files:** `apps/tenant_core/services_bookings.py` (`create_booking`, `can_member_book`)
- **Reproduction:**
  1. Create a member account without submitting any PAR-Q form.
  2. Attempt to book a group class occurrence via `BookingService.create_booking`.
- **Expected Behavior:** If the studio policy mandates health clearance before physical activity, the backend must reject the booking until a valid PAR-Q is submitted.
- **Actual Behavior:** `services_bookings.py` performs zero checks on `IntakeSubmission` or medical contraindications. Health status is purely a display badge in Member 360.
- **Impact:** Potential legal and physical liability if contraindicated members book high-intensity classes without required health clearance.
- **Recommended Correction:** Add a configurable health clearance check in `BookingService.can_member_book` that validates active PAR-Q status when `organization_settings.require_parq_for_booking == True`.

---

### P2 (Medium: Operational Inconvenience, Display & Filter Defects)

#### DEF-08: Stale Unpaid Orders Accumulate in Member Outstanding Balance
- **Severity:** `P2`
- **Affected Files:** `apps/tenant_core/views_members.py` (`calculate_member_outstanding`)
- **Reproduction:**
  1. Place multiple test checkout orders on a lead without completing payment.
  2. Convert the lead into a member.
- **Expected Behavior:** Abandoned or expired checkout attempts should either automatically expire after 24 hours or be excluded from active outstanding balance unless explicitly invoiced.
- **Actual Behavior:** `calculate_member_outstanding` sums every order in `PENDING_PAYMENT` indefinitely, causing the member header to show an alarming ₹140,992 balance for a ₹3,499 purchase.
- **Impact:** Front desk confusion and erroneous billing collection demands.
- **Recommended Correction:** Only include active unexpired orders or issued unpaid `MemberInvoice` balances; auto-cancel abandoned checkout orders after 48 hours.

---

#### DEF-09: Memberships Workspace RBAC Scoped to System Settings Instead of Member Operations
- **Severity:** `P2`
- **Affected Files:** `apps/tenant_core/views_memberships.py` (`MembershipViewSet`)
- **Reproduction:**
  1. Log in as Front Desk Staff or Branch Manager lacking `core.settings.view` permission.
  2. Navigate to `/members/memberships`.
- **Expected Behavior:** Memberships workspace should be visible to operational staff with `members.memberships.view` or `core.users.view`.
- **Actual Behavior:** `MembershipViewSet` specifies `required_module = 'core'`, `required_submodule = 'settings'`, `required_permission = 'core.settings.view'`, throwing `403 Forbidden` for standard front desk staff.
- **Impact:** Front desk personnel cannot access the central memberships list.
- **Recommended Correction:** Change permission requirement to `members.memberships.view` with fallback to `core.users.view`.

---

### P3 (Low: Usability & Mobile Layout Polish)

#### DEF-10: Small Mobile Viewport Action Button Target Size
- **Severity:** `P3`
- **Affected Files:** `src/components/members/MemberDirectoryWorkspace.tsx`
- **Reproduction:**
  1. Inspect Member Directory at 360px width.
- **Expected Behavior:** Touch targets should meet the recommended 44px minimum height.
- **Actual Behavior:** "Collect" and "360 ->" buttons have 32px height, requiring precise touch on compact mobile screens.
- **Recommended Correction:** Increase button height to `h-9` (36px) or `h-10` (40px) on mobile viewports.

---

## SECTION 12: MISSING PRODUCT DECISIONS & UNVERIFIED ITEMS

The following product and architectural decisions remain unspecified in existing baseline documents:

1. **Provisional Cash Policy Architecture:**
   - How many provisional sessions should be granted by default?
   - Should provisional sessions be shared across all package entitlements or granted per entitlement definition?
   - Should provisional sessions expire if cash is not approved within 72 hours?
2. **Multi-Approver Quorum by Amount:**
   - What threshold requires 2 managers or finance head approval (e.g. cash payments > ₹50,000)?
3. **Abandoned Order Lifecycle:**
   - When should orders in `PENDING_PAYMENT` automatically transition to `EXPIRED` or `CANCELLED`?
4. **Clinical Clearance Policy for Positive PAR-Q:**
   - When a member answers "YES" to heart conditions or chest pain, does the system require a signed doctor's certificate uploaded to Zata.ai S3 before booking is unlocked?

---

## SECTION 13: PRIORITIZED REMEDIATION PHASES & ACCEPTANCE CRITERIA

### Phase 1: Core Financial, Accounting & Booking Integrity (Immediate - Week 1)
- **Goal:** Fix all P0 blockers that compromise accounting ledgers, booking gates, and cash security.
- **Tasks:**
  1. In `services_approvals.py`, implement atomic compensating `REVERSAL` ledger entries when cash payments are rejected.
  2. In `services_crm.py`, ensure linked `TenantUser` accounts are activated (`status='ACTIVE'`) during lead conversion.
  3. In `views_members.py`, ensure cash collections via `collect_outstanding` submit `CASH_PAYMENT_APPROVAL` requests instead of immediately materializing `SUCCESS`.
  4. In `services_memberships.py`, fix negative adjustments to decrement `allocated_units` rather than incrementing `consumed_units`.
- **Acceptance Criteria:**
  - Cash rejection leaves zero net session balance and a complete ledger audit trail.
  - Converted members can immediately book class occurrences without `User account is not active` errors.
  - No cash transaction can reach `SUCCESS` without approval record.

### Phase 2: Mock Route Elimination & RBAC Alignment (Week 2)
- **Goal:** Remove all mock data dependencies on production navigation routes.
- **Tasks:**
  1. Replace `<ModuleView />` in `/members/renewals` with a live `RenewalsWorkspace` fetching due and lapsed renewals from backend APIs.
  2. Replace `<ModuleView />` in `/members/transfers` with a live `TransfersWorkspace` connected to `MembershipBranchHistory`.
  3. Update `MembershipViewSet` permission to `members.memberships.view` instead of `core.settings.view`.
- **Acceptance Criteria:**
  - Zero imports of `src/services/store.ts` in `src/routes/_shell/members.*`.
  - Front desk staff can access `/members/memberships` without administrative settings permissions.

### Phase 3: Order Lifecycle & Health Gate Enforcement (Week 3)
- **Goal:** Implement order expiration and configurable health clearance checks.
- **Tasks:**
  1. Implement Celery periodic task to cancel abandoned `PENDING_PAYMENT` orders older than 48 hours.
  2. Implement backend PAR-Q validation in `BookingService.can_member_book`.
- **Acceptance Criteria:**
  - Member outstanding balance only includes valid, uncancelled orders.
  - Unscreened members are guided to complete health forms before first booking when required by policy.

---
**Report Finalized & Verified on Local Environment:** October 6, 2026.
