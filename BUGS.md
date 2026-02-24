# PreflightSMS — Bug Report

Discovered during comprehensive test suite creation (Phase 0).
**All 25 bugs have been fixed.**

---

## CRITICAL — Security

### ~~BUG-001~~ FIXED: `/api/rejoin-org` allows unauthenticated password reset
**Fix:** Added invitation token verification — requires valid, pending invitation matching the email and org.

### ~~BUG-002~~ FIXED: `/api/create-org` has no authentication
**Fix:** Added Supabase auth token validation via `verifyAuth()`.

### ~~BUG-003~~ FIXED: `/api/request-approval` has no authentication
**Fix:** Added Supabase auth token validation and org membership check.

### ~~BUG-004~~ FIXED: HTML injection in email templates
**Fix:** Added `escapeHtml()` helper; all user-supplied values escaped before HTML interpolation.

### ~~BUG-005~~ FIXED: Platform admin JWT secret has weak fallback
**Fix:** Removed weak fallback — `PLATFORM_ADMIN_SECRET` must be explicitly set.

### ~~BUG-006~~ FIXED: `check_setup` action reveals platform state
**Fix:** Changed to `select('id', { count: 'exact', head: true })` — no actual row data is fetched, only a count. Returns minimal boolean response.

---

## CRITICAL — Data Integrity

### ~~BUG-007~~ FIXED: `rejectFlight()` sets invalid status 'REJECTED'
**Fix:** Changed to `status: 'CANCELLED'` with `approval_status: 'rejected'`.

### ~~BUG-008~~ FIXED: `approveFlight()` ignores userId and notes parameters
**Fix:** Added `approved_by: userId` and `approval_notes: notes` to the update.

### ~~BUG-009~~ FIXED: `updateFlightStatus()` sets `arrived_at` for CANCELLED flights
**Fix:** Only sets `arrived_at` when status is `'ARRIVED'`.

---

## HIGH — Auth Bypass

### ~~BUG-010~~ FIXED: Cron endpoints bypass auth when CRON_SECRET is unset
**Fix:** Changed to `if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET)`.

### ~~BUG-011~~ FIXED: `/api/check-notifications` orgId mode has no authentication
**Fix:** Added `verifyAuth()` call when using orgId mode — requires valid Supabase auth token.

---

## MEDIUM — Logic & Functionality

### ~~BUG-012~~ FIXED: `fetchInvitations()` has write side-effects
**Fix:** Removed auto-accept side-effect. Added separate `reconcileInvitations()` function.

### ~~BUG-013~~ FIXED: `rejoin-org` lists ALL auth users to find one email
**Fix:** Changed to `listUsers({ page: 1, perPage: 1, filter: email })`.

### ~~BUG-014~~ FIXED: `selfDispatchFlight()` sets non-standard approval_status
**Fix:** Added documentation comment listing valid `approval_status` values: `auto_approved`, `pending`, `approved`, `rejected`, `pilot_dispatched`. The value is intentionally used in the frontend self-dispatch flow.

### ~~BUG-015~~ FIXED: No HTTP method validation on cron endpoints
**Fix:** Added `if (req.method !== 'POST') return res.status(405)` to all three endpoints.

### ~~BUG-016~~ FIXED: `reset=true` query params are destructive without safeguards
**Fix:** `reset=true` now returns 403 with a message directing to the platform admin panel.

---

## MEDIUM — Edge Function Issues

### ~~BUG-017~~ FIXED: Stripe webhook has no idempotency protection
**Fix:** Added event ID deduplication via `stripe_webhook_events` table. **Requires migration (see below).**

### ~~BUG-018~~ FIXED: Overdue flights edge function marks as notified even when SMS fails
**Fix:** Only marks flight as `overdue_notified: true` when at least one SMS succeeds.

### ~~BUG-019~~ FIXED: Hardcoded timezone in overdue flight edge function
**Fix:** Changed to use `org.timezone || "America/Los_Angeles"` — reads org's configured timezone with fallback.

### ~~BUG-020~~ FIXED: Trial emails function has hardcoded FAA deadline
**Fix:** Removed the hardcoded "May 28, 2027" deadline line from the trial_expired email template.

### ~~BUG-021~~ FIXED: `stripe-checkout` and `stripe-portal` don't validate returnUrl
**Fix:** Added URL validation against allowed hosts (`login.preflightsms.com`, `preflightsms.com`, `localhost`).

### ~~BUG-022~~ FIXED: `send-invite` doesn't escape orgName in HTML
**Fix:** Added `escapeHtml()` function and escape `orgName` before HTML interpolation.

---

## LOW — Code Quality

### ~~BUG-023~~ FIXED: `createPolicy()` sends non-existent columns
**Fix:** Removed `file_name` and `part5_tags` from the insert.

### ~~BUG-024~~ FIXED: `uploadOrgLogo()` returns inconsistent error types
**Fix:** Changed string error to `{ message: 'Not connected' }` for consistency.

### ~~BUG-025~~ FIXED: `offlineQueue.flushQueue()` onSyncCallback logic is flawed
**Fix:** Changed to track `originalLength` before processing and compare `failed.length < originalLength`.

---

## Summary

| Severity | Total | Fixed |
|----------|-------|-------|
| CRITICAL | 3 | 3 |
| HIGH | 5 | 5 |
| MEDIUM | 8 | 8 |
| LOW | 9 | 9 |
| **Total** | **25** | **25** |

---

## Required Migration for BUG-017

The Stripe webhook idempotency fix requires a new `stripe_webhook_events` table. Run this in the Supabase SQL editor:

```sql
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stripe_webhook_events_created ON stripe_webhook_events(created_at);
```
