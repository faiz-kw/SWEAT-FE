# PAR-Q Form Before First Booking & Member Profile Sync

> **Conversation ID:** `5937f9ed-4632-494a-a81f-ab7ca107468a`  
> **Total Conversational Turns:** 3

---

### 👤 User (Step 0)

```text
see member have to fill the par-q form before first booking after purchasing a package and then it should reflect to members and admin panle in membership 360 properly backend connected and see the booking policies is not working i guess u just note the error or anything incompleted and tell me which is not connected to backend and or missed somethinng which is not working dummy
```

---

### 🤖 Antigravity Assistant (Step 326)

Here is the comprehensive diagnostic report of your **PAR-Q Form intake flow**, **Membership 360 reflection**, and **Booking Policies system**, detailing exactly what is connected, what is failing, and where errors or disconnects exist between the frontend and backend.

---

### Key Findings Summary

| System / Feature | Backend Connected? | Working Status | Core Issue / Blocker |
| :--- | :---: | :---: | :--- |
| **PAR-Q Form Submission (Member Portal)** | **Yes** (`POST /api/v1/mobile/onboarding/submit/`) | **Working** (Backend Engine) / **UX Gaps** (Frontend) | The backend persists submissions, saves digital signatures to disk, and updates memberships to `COMPLETED`. However, Question 2 (Date) & 15 (Multi-select) render as plain text inputs, and missing signatures silently disable the button. |
| **PAR-Q Gate Before First Booking** | **Partial** (`services_bookings.py`) | **Bypassed / Not Enforced** | `create_booking` only blocks pending PAR-Q **if** `booking_policy.require_parq == True`. In your database, `require_parq` is set to `False`, so members can bypass PAR-Q and book classes directly. |
| **Membership 360 Admin Reflection** | **Yes** (`GET /api/v1/tenant/members/:id/360/`) | **Working** | Tab 6 ("PAR-Q Form") reads directly from backend `IntakeSubmission` & `Membership.parq_status`. It correctly displays `PAR-Q PENDING` with `Class Booking Blocked` until cleared. |
| **Studio Hub PAR-Q Card (Member Portal)** | **Yes** (`GET /api/v1/mobile/onboarding-survey/`) | **Visual Bug** | Even when status is `"PAR-Q Pending"`, the card renders a **green checkmark** (`CheckCircle2 text-emerald-500`), giving members the false impression that they are already cleared. |
| **Admin Booking Policies Tab (`/bookings`)** | **Broken** (`/api/v1/tenant/booking-policy-sets/`) | **Failing on Save (500/400) + Blank Cards** | 1. `BookingPolicySet` model has **no `name` or `code`** fields (cards render blank titles).<br>2. Creating/saving throws `{'organization': ['This field is required.']}`.<br>3. The modal lacks a toggle for `require_parq`. |
| **Business Settings Booking Tab (`/admin/configuration`)** | **Yes** (`/api/v1/tenant/booking-policy/`) | **Working** (Separate Config) | Manages auto-cancellations, cutoffs, and booking types via `BookingPolicyConfig`, but has no awareness of PAR-Q requirements. |

---

### 1. The PAR-Q Flow & Membership 360 Audit

#### A. Why the First Booking Gate is Currently Bypassed
In [`services_bookings.py`](file:///f:/fitness-command-center/backend/apps/tenant_core/services_bookings.py#L758-L760):
```python
# Gate: Verify PAR-Q completed and digitally signed for this specific membership if required by policy
parq_enforced = bool(booking_policy and booking_policy.require_parq)
if parq_enforced and getattr(membership, 'parq_status', 'PENDING') != 'COMPLETED':
    raise ParqRequiredValidationError(...)
```
* **The Root Cause:** `parq_enforced` is gated strictly on `booking_policy.require_parq`. In your database's active `BookingPolicySet`, `require_parq` is set to `False`. 
* **The Result:** Even though the membership shows `PAR-Q PENDING` and `Class Booking Blocked` in Membership 360, the booking service skips the validation gate because the policy flag is off.
* **The Fix:** Either:
  1. Set `require_parq = True` on the active policy, or
  2. Enforce `if getattr(membership, 'parq_status', 'PENDING') != 'COMPLETED':` as a mandatory platform rule regardless of whether the policy flag is on.

#### B. Member Portal Studio Hub Visual Bug
In [`WebMemberPortalWorkspace.tsx`](file:///f:/fitness-command-center/src/components/member-portal/WebMemberPortalWorkspace.tsx#L5115-L5122):
* The Studio Hub "PAR-Q Clearance" card displays `{parqSurvey?.status_badge || "PAR-Q Cleared"}` (which says `"PAR-Q Pending"` in your screenshot).
* **The Bug:** The icon container is hardcoded to `bg-emerald-500/10 text-emerald-500` with `<CheckCircle2 />`. A pending medical requirement should display an amber shield (`AlertTriangle` / `Clock`) with amber styling, not a green success checkmark.

#### C. Member Portal PAR-Q Questionnaire Issues
In [`WebMemberPortalWorkspace.tsx`](file:///f:/fitness-command-center/src/components/member-portal/WebMemberPortalWorkspace.tsx#L7118-L7170):
1. **Question 2 (`Date of Birth`):** Falls back to a standard text `<Input>` rather than `<Input type="date">`.
2. **Question 15 (`MULTI_SELECT`):** The question is configured in the backend as `MULTI_SELECT` ("How can SWEAT best support your fitness journey?"), but the frontend only has handlers for `BOOLEAN` and `SINGLE_SELECT`, so it falls back to a single text input instead of checkbox options.
3. **Silent Disabled Submit Button:** The submit button has `disabled={isParqSubmitting || !parqConsentAccepted || !parqHasSignature}`. If a member fills out all questions and accepts terms but forgets to draw in the signature canvas, the button stays disabled with no feedback explaining why.

#### D. How It Connects to Backend & Reflects in Membership 360
* When the member draws their signature and clicks **Save & Confirm PAR-Q Clearance**:
  1. The frontend dispatches `POST /api/v1/mobile/onboarding/submit/` ([`views_mobile.py`](file:///f:/fitness-command-center/backend/apps/tenant_core/views_mobile.py#L3416)).
  2. The backend compresses the signature PNG and saves it to `/media/signatures/parq_sig_*.png` on disk.
  3. It creates an immutable `IntakeSubmission` record linked to the member and records all 15 question answers.
  4. It executes:
     ```python
     membership.parq_status = 'COMPLETED'
     membership.parq_completed_at = now
     membership.parq_submission = submission
     membership.save()
     ```
  5. In **Membership 360** ([`Member360Workspace.tsx`](file:///f:/fitness-command-center/src/components/members/Member360Workspace.tsx#L3454)), the requirement status flips from `PAR-Q PENDING` to `COMPLETED`, the badge changes from `Class Booking Blocked` to `Cleared for Booking`, and the submission appears with full audit history under **Signed Submission Records**.

---

### 2. Why "Booking Policies is Not Working"

There are **two competing booking policy implementations** in the codebase that are disconnected from each other:

#### A. Problem in Operations → Bookings → "Booking Policies" Tab
File: [`BookingsWorkspace.tsx`](file:///f:/fitness-command-center/src/components/bookings/BookingsWorkspace.tsx#L1250-L1315) & [`views_bookings.py`](file:///f:/fitness-command-center/backend/apps/tenant_core/views_bookings.py#L794)

1. **Card Title is Blank:** 
   The frontend renders `{p.name}` and `{p.code}`. However, the database model `BookingPolicySet` in [`models_bookings.py`](file:///f:/fitness-command-center/backend/apps/tenant_core/models_bookings.py#L12) **does not have `name` or `code` fields**. The cards display empty headers.
2. **"Configure Policy" / "Create Policy Set" Fails on Save:**
   When you click "Save Policy", it calls `POST /api/v1/tenant/booking-policy-sets/`. The backend serializer rejects the request with:
   ```json
   {"organization": ["This field is required."]}
   ```
   * The frontend dialog does not supply `organization`.
   * `BookingPolicySetViewSet.perform_create` fails to auto-assign the organization from the user's active tenant session.
3. **No PAR-Q Toggle in Policy Modal:**
   The modal in `BookingsWorkspace.tsx` configures booking window, cutoff minutes, waitlist capacity, and max reschedules, but **omits a toggle for `require_parq`**.

#### B. The Settings Tab: `/admin/configuration?tab=booking`
File: [`ConfigurationWorkspace.tsx`](file:///f:/fitness-command-center/src/components/admin/ConfigurationWorkspace.tsx#L208-L232)
* This screen connects to `/api/v1/tenant/booking-policy/` (backed by `BookingPolicyConfig` in [`services_booking_policy.py`](file:///f:/fitness-command-center/backend/apps/tenant_core/services_booking_policy.py)).
* It saves auto-cancellation timers (unpaid 15m, unconfirmed 60m), cancellation cutoffs (2h), and booking types (CLASS, TRIAL, PT).
* **Disconnect:** This policy service has **no field or logic for PAR-Q enforcement**.

---

### 3. Concrete Action Items to Complete the Flow

1. **Fix `BookingPolicySetViewSet.perform_create`** in [`views_bookings.py`](file:///f:/fitness-command-center/backend/apps/tenant_core/views_bookings.py#L818):
   Auto-populate `organization = get_user_tenant_organization()` and add fallback display names so policies save successfully without validation errors.
2. **Add `require_parq` Toggle to Policy Modal** in [`BookingsWorkspace.tsx`](file:///f:/fitness-command-center/src/components/bookings/BookingsWorkspace.tsx):
   Allow studio administrators to turn on "Require PAR-Q before first booking".
3. **Enforce PAR-Q Gate in `create_booking`** in [`services_bookings.py`](file:///f:/fitness-command-center/backend/apps/tenant_core/services_bookings.py#L758):
   Ensure that any active membership with `parq_status == 'PENDING'` halts booking creation and returns `code: 'PARQ_REQUIRED'`.
4. **Member Portal Booking UX**:
   When `PARQ_REQUIRED` is returned during booking, present a modal prompting the member to complete their health questionnaire and automatically route them to the PAR-Q tab.
5. **Fix Studio Hub Clearance Card Colors**:
   In [`WebMemberPortalWorkspace.tsx`](file:///f:/fitness-command-center/src/components/member-portal/WebMemberPortalWorkspace.tsx#L5115), render an amber warning icon and badge when `parq_status === 'PENDING'`.
6. **Fix Date & Multi-Select Inputs in PAR-Q Tab**:
   In [`WebMemberPortalWorkspace.tsx`](file:///f:/fitness-command-center/src/components/member-portal/WebMemberPortalWorkspace.tsx#L7143), support `DATE` inputs and `MULTI_SELECT` chip selectors.

---

### 👤 User (Step 328)

```text
see in parq why object word is shown it should show to both in members portal and then in admin panel also it should show , if user has filled and signature should be visible also and it should be backend connected and stored
```

---

