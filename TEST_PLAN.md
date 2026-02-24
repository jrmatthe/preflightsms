# PreflightSMS — Comprehensive Test Plan

## Phase 0: Project Discovery Summary

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14.2 (Pages Router) |
| UI | React 18.3, Recharts 2.12 |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth |
| Storage | Supabase Storage (org-logos, frat-attachments) |
| Serverless | Supabase Edge Functions (Deno) |
| Payments | Stripe (checkout, portal, webhooks) |
| SMS | Twilio |
| Email | Resend |
| Hosting | Vercel |
| VCS | GitHub (jrmatthe/preflightsms) |

### Database Schema: 25 Tables
organizations, profiles, frat_submissions, flights, safety_reports, hazard_register, corrective_actions, policy_documents, policy_acknowledgments, training_requirements, training_records, frat_templates, notification_contacts, cbt_courses, cbt_lessons, cbt_progress, cbt_enrollments, aircraft, notifications, notification_reads, sms_manuals, invitations, trial_emails_sent, platform_admins, nudge_responses

### Existing Test Coverage
**None.** Zero test files, no testing framework configured, no test scripts in package.json.

### Build Status
**PASSES** — `npm run build` compiles successfully with no errors.

### Environment Variables Required (21 total)
- **Client-side (2):** NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Server-side API routes (6):** SUPABASE_SERVICE_KEY, CRON_SECRET, RESEND_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, PLATFORM_ADMIN_SECRET
- **Edge Functions (11):** SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_STARTER_MONTHLY, STRIPE_STARTER_ANNUAL, STRIPE_PRO_MONTHLY, STRIPE_PRO_ANNUAL, TWILIO_FROM_NUMBER, RESEND_API_KEY, FROM_EMAIL

### Services Requiring Live API Keys vs Mockable
| Service | Can Mock? | Notes |
|---------|-----------|-------|
| Supabase DB/Auth | Yes | Use supabase-js mock or local Supabase |
| Stripe | Yes | Use stripe-mock or test keys |
| Twilio | Yes | Mock HTTP calls |
| Resend | Yes | Mock HTTP calls |
| Weather API | Yes | Mock fetch |

---

## Architecture Overview

### File Structure
```
pages/index.js          — Main SPA (~3948 LOC), all app tabs/views
pages/platform-admin.js — Platform admin panel
pages/api/              — 9 API routes (cron jobs, org management, weather)
components/             — 15 React components
lib/supabase.js         — Supabase client + all DB operations (~43KB)
lib/tiers.js            — Subscription tier definitions
lib/offlineQueue.js     — Offline operation queue
supabase/functions/     — 6 Edge Functions (Stripe, email, SMS)
```

### Key Patterns
- `roGuard()` wraps all mutation props for read-only subscription enforcement
- `isAdmin` = role is "admin" or "safety_manager"
- `get_user_org_id()` SQL function for RLS policies
- Realtime subscriptions on `flights` and `safety_reports`
- Offline/localStorage fallback when Supabase env vars not set

---

## Test Modules

### MODULE 1: Authentication & Authorization

#### 1.1 Supabase Auth (lib/supabase.js)
- [ ] Sign up with email/password
- [ ] Sign in with email/password
- [ ] Sign out
- [ ] Session persistence and refresh
- [ ] Auth state change listener
- [ ] Password reset flow
- [ ] Redirect after auth

#### 1.2 Role-Based Access Control
- [ ] Role assignment on profile creation (pilot, safety_manager, chief_pilot, accountable_exec, admin)
- [ ] `isAdmin` check (admin OR safety_manager)
- [ ] Role-based tab visibility in main app
- [ ] Role-based action gating (edit, delete, approve)
- [ ] Custom permissions (JSONB permissions field)

#### 1.3 Row-Level Security (RLS)
- [ ] Users can only view data within their own org
- [ ] Users can only update their own profile (non-admin)
- [ ] Admins can update any profile in org
- [ ] Platform admins can view all orgs
- [ ] DELETE policies exist where needed (policy_acknowledgments, aircraft, sms_manuals, notification_contacts, frat_templates)
- [ ] Service-role-only tables (trial_emails_sent, platform_admins)

#### 1.4 Platform Admin Auth (pages/platform-admin.js)
- [ ] Separate login (bcryptjs password, JWT)
- [ ] JWT token validation with PLATFORM_ADMIN_SECRET
- [ ] Session management for platform admin
- [ ] Platform admin API endpoint security (pages/api/platform-admin.js)

---

### MODULE 2: Organization Management

#### 2.1 Organization CRUD
- [ ] Create organization (pages/api/create-org.js)
- [ ] Organization name and slug
- [ ] Certificate number
- [ ] Settings (JSONB)
- [ ] Logo upload to org-logos bucket
- [ ] Timezone setting

#### 2.2 Invitation System
- [ ] Send invitation (supabase/functions/send-invite)
- [ ] Token generation (32-byte hex)
- [ ] Invitation email delivery via Resend
- [ ] Accept invitation flow
- [ ] Invitation expiry (7 days)
- [ ] Revoke invitation
- [ ] Prevent duplicate pending invites (unique constraint)
- [ ] Rejoin org flow (pages/api/rejoin-org.js)

#### 2.3 Member Management
- [ ] List org members (profiles)
- [ ] Update member role
- [ ] Remove member
- [ ] Permission management (JSONB permissions)

---

### MODULE 3: Flight Risk Assessment Tool (FRAT)

#### 3.1 FRAT Template Management (components/FRATTemplateEditor.js)
- [ ] View active template
- [ ] Create new template
- [ ] Edit template categories and factors
- [ ] Set risk thresholds (LOW, MODERATE, HIGH, CRITICAL with scores and colors)
- [ ] Configure aircraft types
- [ ] Assign template to specific aircraft (assigned_aircraft)
- [ ] Set approval threshold
- [ ] Only one active template per org (unique constraint)
- [ ] Feature-flag gating (custom_frat_template)

#### 3.2 FRAT Submission (pages/index.js)
- [ ] Create new FRAT submission
- [ ] All required fields validated: pilot, aircraft, tail_number, departure, destination, flight_date, etd, ete
- [ ] Optional fields: cruise_alt, fuel_lbs, num_crew, num_pax, wx_briefing, remarks
- [ ] FRAT code auto-generation ("FRAT-ABC123")
- [ ] Factor selection across 5 categories (Weather, Pilot/Crew, Aircraft, Environment, Operational)
- [ ] Score calculation
- [ ] Risk level determination
- [ ] File attachment upload to frat-attachments bucket
- [ ] ETA calculation (UTC)
- [ ] Submission saves to frat_submissions table

#### 3.3 FRAT Review & Approval
- [ ] Auto-approval when score below threshold
- [ ] Approval required when score >= approval_threshold
- [ ] Approval request notification (pages/api/request-approval.js)
- [ ] Approve/reject flow
- [ ] Approval notes
- [ ] approval_status transitions: auto_approved → pending → approved/rejected
- [ ] FRATDetailModal navigation for pending flights

#### 3.4 FRAT History & Analytics
- [ ] List all org FRATs
- [ ] Filter/search FRATs
- [ ] View FRAT details
- [ ] Delete own FRATs (RLS: users can delete own)
- [ ] Dashboard charts integration (components/DashboardCharts.js)

---

### MODULE 4: Flight Following

#### 4.1 Active Flight Board
- [ ] Create flight from approved FRAT
- [ ] Flight status lifecycle: ACTIVE → ARRIVED / CANCELLED
- [ ] Real-time updates (Supabase realtime on flights table)
- [ ] Flight board display with status indicators
- [ ] ETA display and tracking

#### 4.2 Overdue Flight Detection
- [ ] Overdue detection logic (eta + buffer)
- [ ] overdue_notified_at tracking (prevent duplicate alerts)
- [ ] API cron endpoint (pages/api/check-overdue.js) with CRON_SECRET auth
- [ ] Edge function (supabase/functions/check-overdue-flights)
- [ ] SMS notification via Twilio for overdue flights
- [ ] Email notification via Resend for overdue flights
- [ ] Notification contacts lookup (notification_contacts.notify_overdue)

#### 4.3 Flight Arrival
- [ ] Mark flight as arrived
- [ ] arrived_at timestamp
- [ ] Post-flight nudge trigger (components/PostFlightNudge.js)

---

### MODULE 5: Post-Flight Nudge (components/PostFlightNudge.js)

- [ ] Nudge display after flight arrival
- [ ] Response options: submitted_report, nothing_to_report, remind_later, dismissed
- [ ] Link to safety report creation on "submitted_report"
- [ ] remind_at scheduling for "remind_later"
- [ ] nudge_responses table tracking
- [ ] Prevent duplicate nudges for same flight

---

### MODULE 6: Safety Reporting (components/SafetyReporting.js)

#### 6.1 Report Creation
- [ ] Create safety report (hazard, incident, near_miss, concern)
- [ ] Report code generation ("RPT-ABC123")
- [ ] All fields: title, description, date_occurred, location, category, severity, flight_phase
- [ ] Confidential flag
- [ ] Anonymous flag
- [ ] Link to related FRAT (related_frat_id)
- [ ] Tail number and aircraft type fields

#### 6.2 Report Workflow
- [ ] Status lifecycle: open → under_review → investigation → corrective_action → closed
- [ ] Assign report to user
- [ ] Investigation notes
- [ ] Root cause documentation
- [ ] Close report (closed_at timestamp)
- [ ] Real-time updates (Supabase realtime)

#### 6.3 Report Listing & Filtering
- [ ] List all org reports
- [ ] Filter by status, type, category, severity
- [ ] Search reports

---

### MODULE 7: Hazard Register (components/HazardRegister.js)

- [ ] Create hazard entry
- [ ] Hazard code ("HAZ-001")
- [ ] 5x5 risk matrix: initial_likelihood × initial_severity = initial_risk_score
- [ ] Mitigation documentation
- [ ] Residual risk: residual_likelihood × residual_severity = residual_risk_score
- [ ] Status lifecycle: identified → active → mitigated → accepted → closed / monitoring
- [ ] Link to safety report (related_report_id)
- [ ] Review date tracking
- [ ] Responsible person assignment
- [ ] List/filter hazards

---

### MODULE 8: Corrective Actions (components/CorrectiveActions.js)

- [ ] Create corrective action
- [ ] Action code ("CA-001")
- [ ] Link to safety report (report_id) or hazard (hazard_id)
- [ ] Assign to user
- [ ] Due date
- [ ] Priority: low, medium, high, critical
- [ ] Status lifecycle: open → in_progress → completed / overdue / cancelled
- [ ] Completion notes
- [ ] completed_at timestamp
- [ ] List/filter corrective actions

---

### MODULE 9: Policy & Document Management (components/PolicyTraining.js)

#### 9.1 Policy Documents
- [ ] Create policy document
- [ ] Categories: safety_policy, sop, emergency_procedures, training_manual, org_chart, sms_manual, maintenance, operations_specs, other
- [ ] Version tracking
- [ ] Status: draft → active → archived / under_review
- [ ] Effective date and review date
- [ ] File URL / content storage
- [ ] Source manual link (source_manual_key)

#### 9.2 Policy Acknowledgments
- [ ] Acknowledge/sign a policy
- [ ] Track who has acknowledged which policies
- [ ] Unique constraint (one ack per user per policy)
- [ ] Delete acknowledgment (for re-acknowledgment)

---

### MODULE 10: Training Management

#### 10.1 Training Requirements (components/PolicyTraining.js)
- [ ] Create training requirement
- [ ] Categories: sms, initial, recurrent, aircraft_specific, emergency, hazmat, security, crew_resource, company, other
- [ ] Required-for roles (TEXT array)
- [ ] Frequency (months, 0 = one-time)

#### 10.2 Training Records
- [ ] Create training record
- [ ] Link to requirement
- [ ] Completed date
- [ ] Expiry date computation (completed + frequency)
- [ ] Instructor and notes
- [ ] expiry_notified_at tracking

#### 10.3 Training Compliance Checking
- [ ] API cron (pages/api/check-training.js) with CRON_SECRET auth
- [ ] Identify expired/expiring training
- [ ] Email notifications via Resend
- [ ] Notification contacts lookup (notify_training)
- [ ] In-app notification creation

---

### MODULE 11: CBT Modules (components/CbtModules.js — 1692 LOC)

#### 11.1 Course Management
- [ ] Create course (admin)
- [ ] Course fields: title, description, category, required_for, passing_score, estimated_minutes
- [ ] Status: draft → published → archived
- [ ] Feature-flag gating (cbt_modules)

#### 11.2 Lesson Management
- [ ] Create lessons within a course
- [ ] Sort order
- [ ] Content blocks (JSONB: text, image, video, etc.)
- [ ] Quiz questions (JSONB: question, options, correct answer, explanation)

#### 11.3 Enrollment & Progress
- [ ] Enroll users in courses
- [ ] Enrollment status: enrolled → in_progress → completed
- [ ] Per-lesson progress: not_started → in_progress → completed / failed
- [ ] Quiz scoring against passing_score
- [ ] Quiz answer recording
- [ ] Certificate number generation on completion
- [ ] Unique constraint (one enrollment per user per course)

---

### MODULE 12: SMS Manuals (components/SmsManuals.js)

- [ ] Initialize default manuals for org
- [ ] Manual CRUD (create, read, update, delete)
- [ ] Manual fields: manual_key, title, description, cfr_references, sections (JSONB)
- [ ] Status: draft → active → archived
- [ ] Version tracking
- [ ] last_edited_by tracking
- [ ] Unique constraint (org_id + manual_key)
- [ ] Link manual to policy document (source_manual_key)

---

### MODULE 13: Fleet Management (components/FleetManagement.js)

- [ ] Add aircraft to fleet
- [ ] Fields: type, registration (tail number), serial_number, year, max_passengers, base_location, notes
- [ ] Unique constraint (no duplicate registrations per org)
- [ ] Edit aircraft
- [ ] Delete aircraft
- [ ] Max aircraft limit enforcement (organizations.max_aircraft per tier)

---

### MODULE 14: Dashboard & Analytics (components/DashboardCharts.js)

- [ ] FRAT score distribution chart
- [ ] Risk level breakdown
- [ ] Flight activity trends
- [ ] Safety report statistics
- [ ] Training compliance overview
- [ ] Hazard register summary
- [ ] Corrective action status summary
- [ ] Date range filtering
- [ ] Feature-flag gating (dashboard_analytics)

---

### MODULE 15: Notifications

#### 15.1 Notification Center (components/NotificationCenter.js)
- [ ] Display in-app notifications
- [ ] Notification types and routing (link_tab)
- [ ] Target by role (target_roles) or specific user (target_user_id)
- [ ] Mark as read (notification_reads)
- [ ] Notification count badge

#### 15.2 Notification Contacts (components/NotificationContacts.js)
- [ ] CRUD for notification contacts
- [ ] Phone (E.164 format) and email
- [ ] Toggle flags: notify_overdue, notify_hazard, notify_training
- [ ] Active/inactive toggle

#### 15.3 Notification Settings (components/NotificationSettings.js)
- [ ] User notification preferences
- [ ] Notification types configuration

#### 15.4 External Notifications
- [ ] SMS via Twilio (overdue flights)
- [ ] Email via Resend (overdue flights, training expiry, invitations, trial lifecycle)

---

### MODULE 16: Subscription & Billing

#### 16.1 Tier System (lib/tiers.js)
- [ ] Tier definitions: starter, professional, enterprise
- [ ] Feature flags per tier
- [ ] Max aircraft limits per tier
- [ ] Tier comparison/display

#### 16.2 Trial Management
- [ ] 14-day trial period
- [ ] Trial lifecycle emails (supabase/functions/trial-emails): getting_started, mid_trial, expiring_soon, trial_expired
- [ ] trial_emails_sent deduplication (unique constraint)
- [ ] subscription_status: trial → active / past_due / canceled / suspended
- [ ] Read-only mode enforcement (roGuard) when subscription expired

#### 16.3 Stripe Integration
- [ ] Checkout session creation (supabase/functions/stripe-checkout)
- [ ] Price IDs for 4 plans: starter monthly/annual, pro monthly/annual
- [ ] Customer portal (supabase/functions/stripe-portal)
- [ ] Webhook handling (supabase/functions/stripe-webhook):
  - [ ] checkout.session.completed
  - [ ] customer.subscription.updated
  - [ ] customer.subscription.deleted
  - [ ] invoice.payment_succeeded
  - [ ] invoice.payment_failed
- [ ] stripe_customer_id and stripe_subscription_id storage
- [ ] Subscription status sync

---

### MODULE 17: FAA Audit Log (components/FaaAuditLog.js)

- [ ] Comprehensive audit trail display
- [ ] Filter by date range, type, user
- [ ] Export capabilities
- [ ] Compliance-ready formatting

---

### MODULE 18: Admin Panel (components/AdminPanel.js)

- [ ] Org settings management
- [ ] User management (roles, permissions)
- [ ] Subscription management
- [ ] Feature flag display
- [ ] Billing tab integration

---

### MODULE 19: Platform Admin (pages/platform-admin.js)

- [ ] Platform admin login (separate auth)
- [ ] View all organizations
- [ ] View all profiles
- [ ] Update organization tier/settings
- [ ] View all frat_submissions, flights, safety_reports
- [ ] API security (pages/api/platform-admin.js)

---

### MODULE 20: API Routes

#### 20.1 Cron Endpoints
- [ ] POST /api/check-overdue — CRON_SECRET auth, finds overdue flights, sends SMS/email
- [ ] POST /api/check-training — CRON_SECRET auth, finds expiring training, sends email
- [ ] POST /api/check-notifications — CRON_SECRET auth, processes notification queue

#### 20.2 Operational Endpoints
- [ ] POST /api/create-org — Creates org + admin profile
- [ ] POST /api/rejoin-org — Rejoin existing org
- [ ] POST /api/request-approval — Send FRAT approval request email
- [ ] GET /api/airports — Airport data lookup
- [ ] GET /api/weather — Weather data for flight planning

#### 20.3 Platform Admin Endpoint
- [ ] POST /api/platform-admin — CRUD operations with JWT auth

---

### MODULE 21: Offline Support (lib/offlineQueue.js)

- [ ] Queue operations when offline
- [ ] Replay queued operations on reconnect
- [ ] localStorage fallback when Supabase env vars not set
- [ ] Graceful degradation

---

### MODULE 22: Cross-Cutting Concerns

#### 22.1 Read-Only Guard (roGuard)
- [ ] All mutations wrapped in roGuard()
- [ ] Enforced for expired/suspended subscriptions
- [ ] Appropriate error messaging

#### 22.2 Data Validation
- [ ] Required field enforcement on all forms
- [ ] Type validation (dates, numbers, phone E.164, email)
- [ ] Constraint enforcement (enums, check constraints)

#### 22.3 Error Handling
- [ ] API error responses
- [ ] Network failure handling
- [ ] Auth expiry handling
- [ ] Supabase error handling

#### 22.4 Security
- [ ] CRON_SECRET validation on cron endpoints
- [ ] JWT validation on platform admin
- [ ] RLS policy enforcement (no cross-org data leaks)
- [ ] Stripe webhook signature verification
- [ ] No SQL injection vectors
- [ ] No XSS vectors in user-generated content

#### 22.5 Realtime
- [ ] flights table subscription
- [ ] safety_reports table subscription
- [ ] Subscription cleanup on unmount

---

## Testing Infrastructure Needed

### Framework Recommendation
- **Unit/Integration:** Vitest (fast, ESM-native, Next.js compatible)
- **Component Testing:** React Testing Library + Vitest
- **API Route Testing:** Vitest with next-test-api-route-handler or supertest
- **E2E:** Playwright (if needed later)

### Dependencies to Install
```
vitest @testing-library/react @testing-library/jest-dom jsdom
```

### Mocking Strategy
- Supabase client: mock `@supabase/supabase-js` with controlled responses
- Stripe: mock HTTP calls or use stripe-mock
- Twilio: mock fetch/HTTP calls
- Resend: mock fetch/HTTP calls
- Next.js API routes: test with mock req/res objects

---

## Priority Order

1. **lib/supabase.js** — Core data layer, all DB operations (highest impact)
2. **lib/tiers.js** — Subscription tier logic
3. **lib/offlineQueue.js** — Offline support
4. **pages/api/** — All 9 API routes (security-critical)
5. **components/** — All 15 components (UI logic)
6. **pages/index.js** — Main app orchestration
7. **supabase/functions/** — Edge functions (Stripe, email, SMS)
8. **RLS policies** — Database security (requires Supabase test instance)
