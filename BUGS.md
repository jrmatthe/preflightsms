# PreflightSMS — Bug Report

Discovered during comprehensive test suite creation (Phase 0).
**No source files were modified.** All bugs documented here for review.

---

## CRITICAL — Security

### BUG-001: `/api/rejoin-org` allows unauthenticated password reset
**File:** `pages/api/rejoin-org.js`
**Severity:** CRITICAL
**Description:** The endpoint has no authentication. Anyone who knows a user's email can call this endpoint to reset their password and reassign them to any org. The endpoint uses `supabase.auth.admin.updateUserById()` to directly set a new password without verifying the caller's identity.
**Impact:** Account takeover. An attacker can change any user's password by knowing their email address.
**Recommendation:** Require an invitation token or authenticated admin session to call this endpoint.

### BUG-002: `/api/create-org` has no authentication
**File:** `pages/api/create-org.js`
**Severity:** HIGH
**Description:** Anyone can create unlimited organizations without being authenticated. No rate limiting, no CAPTCHA, no auth check.
**Impact:** Resource abuse, spam orgs, potential billing exploitation (free trials).
**Recommendation:** Require Supabase auth token or at minimum rate-limit by IP.

### BUG-003: `/api/request-approval` has no authentication
**File:** `pages/api/request-approval.js`
**Severity:** HIGH
**Description:** Anyone can trigger approval request emails to an org's admins by calling this endpoint with a valid orgId. No auth required.
**Impact:** Email spam to org administrators, potential phishing vector via spoofed FRAT codes.
**Recommendation:** Require Supabase auth token and verify caller is a member of the org.

### BUG-004: HTML injection in email templates
**File:** `pages/api/request-approval.js` (lines 52-72), `pages/api/check-overdue.js` (lines 192-230)
**Severity:** MEDIUM
**Description:** User-supplied values (`fratCode`, `pilot`, `orgName`, `aircraft`, `departure`, `destination`) are interpolated directly into HTML email templates without escaping. While most email clients don't execute JavaScript, this could still cause rendering issues or be used for phishing with crafted HTML content.
**Impact:** Email content injection, potential phishing in rendered emails.
**Recommendation:** HTML-escape all user-supplied values before interpolation.

### BUG-005: Platform admin JWT secret has weak fallback
**File:** `pages/api/platform-admin.js` (line 7)
**Severity:** HIGH
**Description:** When `PLATFORM_ADMIN_SECRET` env var is not set, the JWT secret falls back to `'pflt-admin-' + serviceKey.slice(0,16)`. If an attacker obtains the service key prefix (which is more commonly exposed than a dedicated secret), they can forge platform admin JWTs.
**Impact:** Platform admin impersonation.
**Recommendation:** Require `PLATFORM_ADMIN_SECRET` to be explicitly set; refuse to start if missing.

### BUG-006: `check_setup` action reveals platform state
**File:** `pages/api/platform-admin.js` (lines 90-93)
**Severity:** LOW
**Description:** The `check_setup` action is unauthenticated and reveals whether the platform admin system has been initialized (`needs_setup: true/false`). An attacker can probe this to determine if the platform is newly deployed and attempt to claim the first admin account.
**Impact:** Information disclosure.
**Recommendation:** Consider rate-limiting or requiring a setup token.

---

## CRITICAL — Data Integrity

### BUG-007: `rejectFlight()` sets invalid status 'REJECTED'
**File:** `lib/supabase.js` (lines 164-170)
**Severity:** HIGH
**Description:** `rejectFlight()` sets `status: 'REJECTED'`, but the `flights` table has a CHECK constraint that only allows `('ACTIVE', 'ARRIVED', 'CANCELLED')`. This will cause a database error on every call.
**Impact:** Flight rejection is broken. The operation silently fails at the database level.
**Recommendation:** Use `status: 'CANCELLED'` and `approval_status: 'rejected'` instead.

### BUG-008: `approveFlight()` ignores userId and notes parameters
**File:** `lib/supabase.js` (lines 145-152)
**Severity:** MEDIUM
**Description:** The function signature accepts `(flightId, userId, notes)` but the update only sets `status`, `approval_status`, and `approved_at`. The `userId` and `notes` are silently discarded — no `approved_by` or `approval_notes` fields are written. Compare with `approveRejectFRAT()` which correctly uses both.
**Impact:** No audit trail for who approved a flight or why.
**Recommendation:** Add `approved_by: userId` and `approval_notes: notes` to the update object. (Note: the `flights` table may need `approved_by` and `approval_notes` columns if they don't exist.)

### BUG-009: `updateFlightStatus()` sets `arrived_at` for CANCELLED flights
**File:** `lib/supabase.js` (lines 197-204)
**Severity:** LOW
**Description:** When status is 'CANCELLED', the code sets `arrived_at` to the current timestamp. A cancelled flight didn't arrive — this is semantically incorrect and pollutes data analysis.
**Impact:** Incorrect arrived_at data for cancelled flights.
**Recommendation:** Only set `arrived_at` when status is 'ARRIVED'; use a separate `cancelled_at` field or leave `arrived_at` null for cancellations.

---

## HIGH — Auth Bypass

### BUG-010: Cron endpoints bypass auth when CRON_SECRET is unset
**Files:** `pages/api/check-overdue.js` (line 10), `pages/api/check-training.js` (line 10), `pages/api/check-notifications.js` (line 23)
**Severity:** HIGH
**Description:** All three cron endpoints use the pattern:
```js
if (cronSecret !== process.env.CRON_SECRET && process.env.CRON_SECRET) { return 401; }
```
When `CRON_SECRET` is undefined (not set), the `&&` short-circuits to `false`, so the auth check is completely skipped. Any request is accepted.
**Impact:** If the environment is misconfigured (missing CRON_SECRET), anyone can trigger overdue checks, training checks, and notification generation.
**Recommendation:** Change to: `if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET)`.

### BUG-011: `/api/check-notifications` orgId mode has no authentication
**File:** `pages/api/check-notifications.js` (lines 24-26)
**Severity:** MEDIUM
**Description:** The endpoint accepts an `orgId` query parameter as an alternative to cron auth. Any unauthenticated client can trigger in-app notification creation for any org by guessing the orgId (a UUID).
**Impact:** Notification spam, potential for creating misleading notifications.
**Recommendation:** Verify the caller's Supabase auth token and org membership when using orgId mode.

---

## MEDIUM — Logic & Functionality

### BUG-012: `fetchInvitations()` has write side-effects
**File:** `lib/supabase.js` (lines 885-908)
**Severity:** MEDIUM
**Description:** `fetchInvitations()` is a fetch/read function, but it silently auto-accepts pending invitations whose email matches an existing org member. This means a simple data fetch triggers database writes, violating the principle of least surprise and making the function non-idempotent.
**Impact:** Unexpected invitation status changes on read operations; complicates debugging; fetching invitations in a read-only context could fail due to write attempts.
**Recommendation:** Move the auto-accept logic to a separate function or handle it at invitation acceptance time.

### BUG-013: `rejoin-org` lists ALL auth users to find one email
**File:** `pages/api/rejoin-org.js` (line 21)
**Severity:** MEDIUM
**Description:** The endpoint calls `supabase.auth.admin.listUsers()` without any filters, fetching the entire auth user table, then filters client-side with `.find()`. This doesn't scale and is a performance concern for growing platforms.
**Impact:** Slow responses, high memory usage, potential timeout for large user bases.
**Recommendation:** Use `supabase.auth.admin.getUserByEmail()` or pass a filter to `listUsers()`.

### BUG-014: `selfDispatchFlight()` sets non-standard approval_status
**File:** `lib/supabase.js` (lines 172-178)
**Severity:** LOW
**Description:** Sets `approval_status: 'pilot_dispatched'`, which is not defined in any DB constraint or documented enum. While the column is TEXT without a CHECK constraint, this value isn't referenced elsewhere and may cause inconsistent filtering.
**Impact:** Minor data inconsistency.
**Recommendation:** Document valid `approval_status` values or add a CHECK constraint.

### BUG-015: No HTTP method validation on cron endpoints
**Files:** `pages/api/check-overdue.js`, `pages/api/check-training.js`, `pages/api/check-notifications.js`
**Severity:** LOW
**Description:** These endpoints accept any HTTP method (GET, POST, PUT, DELETE, etc.). Convention for cron endpoints is POST-only.
**Impact:** Minor — could be triggered via GET requests that might be cached by CDN/proxy.
**Recommendation:** Add `if (req.method !== 'POST') return res.status(405)`.

### BUG-016: `reset=true` query params are destructive without safeguards
**Files:** `pages/api/check-overdue.js` (lines 35-37), `pages/api/check-training.js` (lines 31-33)
**Severity:** MEDIUM
**Description:** Both endpoints support a `reset=true` query parameter that clears notification flags across all records. This re-enables all notifications to fire again, potentially flooding users with duplicate emails/SMS. The only protection is the cron secret (which itself has BUG-010).
**Impact:** Mass duplicate notifications if triggered accidentally or maliciously.
**Recommendation:** Add a confirmation mechanism or restrict reset to a separate admin-only endpoint.

---

## MEDIUM — Edge Function Issues

### BUG-017: Stripe webhook has no idempotency protection
**File:** `supabase/functions/stripe-webhook/index.ts`
**Severity:** MEDIUM
**Description:** Stripe can retry webhook events. The handler processes each event without checking if it was already handled (no event ID deduplication).
**Impact:** Duplicate processing of subscription changes could cause race conditions or status flip-flops.
**Recommendation:** Store processed webhook event IDs and skip duplicates.

### BUG-018: Overdue flights edge function marks as notified even when SMS fails
**File:** `supabase/functions/check-overdue-flights/index.ts`
**Severity:** HIGH
**Description:** When Twilio SMS sending fails, the flight is still marked `overdue_notified_at = true`. This means the notification won't be retried, and contacts will never receive the alert.
**Impact:** Silent notification failure for overdue flights — a safety concern.
**Recommendation:** Only mark as notified when at least one notification channel succeeds.

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

### BUG-021: `stripe-checkout` and `stripe-portal` don't validate returnUrl
**Files:** `supabase/functions/stripe-checkout/index.ts`, `supabase/functions/stripe-portal/index.ts`
**Severity:** MEDIUM
**Description:** The `returnUrl` parameter is used directly in Stripe's `success_url` and `cancel_url` without validation. A malicious caller could inject an arbitrary URL for redirect.
**Impact:** Open redirect vulnerability — could be used for phishing.
**Recommendation:** Validate that `returnUrl` matches expected app domains.

### BUG-022: `send-invite` doesn't escape orgName in HTML
**File:** `supabase/functions/send-invite/index.ts`
**Severity:** LOW
**Description:** `orgName` and `role` are injected directly into the HTML email template without escaping.
**Impact:** HTML injection in emails (low risk since email clients don't execute JS, but could break email rendering).
**Recommendation:** HTML-escape user-supplied values.

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

### BUG-025: `offlineQueue.flushQueue()` onSyncCallback logic is flawed
**File:** `lib/offlineQueue.js` (line 107)
**Severity:** LOW
**Description:** The condition `failed.length < queue.length + failed.length` is always true when anything was synced (since `queue` has already been replaced by `failed` at line 103). The logic compares `failed.length < failed.length + failed.length` which simplifies to `0 < failed.length` — so the callback fires whenever there are still failed items, not when items were successfully synced.
**Impact:** Sync callback may fire even when no items were actually synced, causing unnecessary data refreshes. Conversely, if all items sync successfully (failed = []), the callback won't fire at all.
**Recommendation:** Track the original queue length before processing and compare: `if (failed.length < originalLength && onSyncCallback) onSyncCallback();`

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 3 |
| HIGH | 5 |
| MEDIUM | 8 |
| LOW | 9 |
| **Total** | **25** |

### Top Priority Fixes
1. **BUG-001** — Unauthenticated password reset (account takeover)
2. **BUG-007** — rejectFlight uses invalid DB status (broken feature)
3. **BUG-010** — Cron auth bypass when env var missing
4. **BUG-018** — Overdue notification silently lost on SMS failure (safety issue)
5. **BUG-005** — Weak JWT secret fallback
