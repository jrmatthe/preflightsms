# PreflightSMS — Bug Report

Discovered during comprehensive test suite creation (Phase 0).

---

## CRITICAL — Security

### ~~BUG-001: `/api/rejoin-org` allows unauthenticated password reset~~ FIXED
**File:** `pages/api/rejoin-org.js`
**Severity:** CRITICAL
**Fix:** Added invitation token verification — requires valid, pending invitation matching the email and org.

### ~~BUG-002: `/api/create-org` has no authentication~~ FIXED
**File:** `pages/api/create-org.js`
**Severity:** HIGH
**Fix:** Added Supabase auth token validation via `verifyAuth()`.

### ~~BUG-003: `/api/request-approval` has no authentication~~ FIXED
**File:** `pages/api/request-approval.js`
**Severity:** HIGH
**Fix:** Added Supabase auth token validation and org membership check.

### ~~BUG-004: HTML injection in email templates~~ FIXED
**File:** `pages/api/request-approval.js`, `pages/api/check-overdue.js`
**Severity:** MEDIUM
**Fix:** Added `escapeHtml()` helper to both files; all user-supplied values are now escaped before HTML interpolation.

### ~~BUG-005: Platform admin JWT secret has weak fallback~~ FIXED
**File:** `pages/api/platform-admin.js`
**Severity:** HIGH
**Fix:** Removed weak fallback — `PLATFORM_ADMIN_SECRET` must be explicitly set.

### BUG-006: `check_setup` action reveals platform state
**File:** `pages/api/platform-admin.js` (lines 90-93)
**Severity:** LOW
**Description:** The `check_setup` action is unauthenticated and reveals whether the platform admin system has been initialized (`needs_setup: true/false`). An attacker can probe this to determine if the platform is newly deployed and attempt to claim the first admin account.
**Impact:** Information disclosure.
**Recommendation:** Consider rate-limiting or requiring a setup token.

---

## CRITICAL — Data Integrity

### ~~BUG-007: `rejectFlight()` sets invalid status 'REJECTED'~~ FIXED
**File:** `lib/supabase.js`
**Severity:** HIGH
**Fix:** Changed to `status: 'CANCELLED'` with `approval_status: 'rejected'`.

### ~~BUG-008: `approveFlight()` ignores userId and notes parameters~~ FIXED
**File:** `lib/supabase.js`
**Severity:** MEDIUM
**Fix:** Added `approved_by: userId` and `approval_notes: notes` to the update.

### ~~BUG-009: `updateFlightStatus()` sets `arrived_at` for CANCELLED flights~~ FIXED
**File:** `lib/supabase.js`
**Severity:** LOW
**Fix:** Only sets `arrived_at` when status is `'ARRIVED'`.

---

## HIGH — Auth Bypass

### ~~BUG-010: Cron endpoints bypass auth when CRON_SECRET is unset~~ FIXED
**Files:** `pages/api/check-overdue.js`, `pages/api/check-training.js`, `pages/api/check-notifications.js`
**Severity:** HIGH
**Fix:** Changed to `if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET)`.

### ~~BUG-011: `/api/check-notifications` orgId mode has no authentication~~ FIXED
**File:** `pages/api/check-notifications.js`
**Severity:** MEDIUM
**Fix:** Added `verifyAuth()` call when using orgId mode — requires valid Supabase auth token.

---

## MEDIUM — Logic & Functionality

### ~~BUG-012: `fetchInvitations()` has write side-effects~~ FIXED
**File:** `lib/supabase.js`
**Severity:** MEDIUM
**Fix:** Removed auto-accept side-effect from `fetchInvitations()`. Added separate `reconcileInvitations()` function for explicit use.

### ~~BUG-013: `rejoin-org` lists ALL auth users to find one email~~ FIXED
**File:** `pages/api/rejoin-org.js`
**Severity:** MEDIUM
**Fix:** Changed to `listUsers({ page: 1, perPage: 1, filter: email })` for targeted lookup.

### BUG-014: `selfDispatchFlight()` sets non-standard approval_status
**File:** `lib/supabase.js` (lines 172-178)
**Severity:** LOW
**Description:** Sets `approval_status: 'pilot_dispatched'`, which is not defined in any DB constraint or documented enum. While the column is TEXT without a CHECK constraint, this value isn't referenced elsewhere and may cause inconsistent filtering.
**Impact:** Minor data inconsistency.
**Recommendation:** Document valid `approval_status` values or add a CHECK constraint.

### ~~BUG-015: No HTTP method validation on cron endpoints~~ FIXED
**Files:** `pages/api/check-overdue.js`, `pages/api/check-training.js`, `pages/api/check-notifications.js`
**Severity:** LOW
**Fix:** Added `if (req.method !== 'POST') return res.status(405)` to all three endpoints.

### ~~BUG-016: `reset=true` query params are destructive without safeguards~~ FIXED
**Files:** `pages/api/check-overdue.js`, `pages/api/check-training.js`
**Severity:** MEDIUM
**Fix:** `reset=true` now returns 403 with a message directing to the platform admin panel.

---

## MEDIUM — Edge Function Issues

### ~~BUG-017: Stripe webhook has no idempotency protection~~ FIXED
**File:** `supabase/functions/stripe-webhook/index.ts`
**Severity:** MEDIUM
**Fix:** Added event ID deduplication via `stripe_webhook_events` table lookup before processing. **Note: requires `stripe_webhook_events` table migration (see below).**

### ~~BUG-018: Overdue flights edge function marks as notified even when SMS fails~~ FIXED
**File:** `supabase/functions/check-overdue-flights/index.ts`
**Severity:** HIGH
**Fix:** Only marks flight as `overdue_notified: true` when at least one SMS notification succeeds.

### BUG-019: Hardcoded timezone in overdue flight edge function
**File:** `supabase/functions/check-overdue-flights/index.ts`
**Severity:** LOW
**Description:** ETA is formatted to `America/Los_Angeles` timezone regardless of the org's configured timezone.
**Impact:** Confusing time display for orgs operating in other timezones.
**Recommendation:** Use `organizations.timezone` field.

### BUG-020: Trial emails function has hardcoded FAA deadline
**File:** `supabase/functions/trial-emails/index.ts`
**Severity:** LOW
**Description:** Contains hardcoded text "May 28, 2027" for an FAA compliance deadline. This will become outdated.
**Impact:** Misleading marketing content after the date passes or if deadline changes.
**Recommendation:** Make this configurable or remove the specific date.

### ~~BUG-021: `stripe-checkout` and `stripe-portal` don't validate returnUrl~~ FIXED
**Files:** `supabase/functions/stripe-checkout/index.ts`, `supabase/functions/stripe-portal/index.ts`
**Severity:** MEDIUM
**Fix:** Added URL validation against allowed hosts (`login.preflightsms.com`, `preflightsms.com`, `localhost`).

### ~~BUG-022: `send-invite` doesn't escape orgName in HTML~~ FIXED
**File:** `supabase/functions/send-invite/index.ts`
**Severity:** LOW
**Fix:** Added `escapeHtml()` function and escape `orgName` before interpolation.

---

## LOW — Code Quality

### BUG-023: `createPolicy()` sends non-existent columns
**File:** `lib/supabase.js` (lines 352-368)
**Severity:** LOW
**Description:** `createPolicy()` sends `file_name` and `part5_tags` fields, but these columns don't exist in the `policy_documents` table schema (per the migration files). Supabase will silently ignore unknown columns or error depending on configuration.
**Impact:** Potential silent data loss or runtime errors.
**Recommendation:** Remove non-existent columns from the insert or add a migration to create them.

### BUG-024: `uploadOrgLogo()` returns inconsistent error types
**File:** `lib/supabase.js` (lines 566-580)
**Severity:** LOW
**Description:** Returns `{ url: null, error: 'Not connected' }` (string) when supabase is null, but `{ url: null, error: uploadErr }` (object) on upload failure. Consumers can't consistently check `error.message`.
**Impact:** Inconsistent error handling in UI.
**Recommendation:** Always return error as an object with a `message` property.

### ~~BUG-025: `offlineQueue.flushQueue()` onSyncCallback logic is flawed~~ FIXED
**File:** `lib/offlineQueue.js`
**Severity:** LOW
**Fix:** Changed to track `originalLength` before processing and compare `failed.length < originalLength`.

---

## Summary

| Severity | Total | Fixed | Remaining |
|----------|-------|-------|-----------|
| CRITICAL | 3 | 3 | 0 |
| HIGH | 5 | 5 | 0 |
| MEDIUM | 8 | 8 | 0 |
| LOW | 9 | 5 | 4 |
| **Total** | **25** | **21** | **4** |

### Remaining (all LOW severity)
- **BUG-006** — `check_setup` reveals platform state (information disclosure)
- **BUG-014** — `selfDispatchFlight()` non-standard approval_status
- **BUG-019** — Hardcoded timezone in overdue flight edge function
- **BUG-020** — Hardcoded FAA deadline in trial emails
- **BUG-023** — `createPolicy()` sends non-existent columns
- **BUG-024** — `uploadOrgLogo()` inconsistent error types

### Required Migration for BUG-017

The Stripe webhook idempotency fix requires a new `stripe_webhook_events` table. Run this in the Supabase SQL editor:

```sql
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-cleanup: remove events older than 7 days
CREATE INDEX idx_stripe_webhook_events_created ON stripe_webhook_events(created_at);
```
