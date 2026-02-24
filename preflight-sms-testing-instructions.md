# PreflightSMS — Comprehensive Test Suite Instructions for Claude CLI

## OVERVIEW

You are testing **PreflightSMS**, a full-stack aviation Safety Management System (SMS) SaaS application for Part 135 charter operators. Your job is to systematically and comprehensively test every feature, edge case, and integration in the application. You must be thorough, methodical, and document everything.

**Before you begin**: Read the project README, package.json, and any existing documentation or schema files to understand the full architecture, tech stack, dependencies, and database schema. Adapt these instructions to what actually exists in the codebase.

---

## PHASE 0: PROJECT DISCOVERY & SETUP

1. **Map the entire project structure.** List all directories, key files, configs, and dependencies.
2. **Identify the tech stack** (framework, ORM, database, auth provider, payment provider, hosting, etc.).
3. **Read the database schema** (Prisma schema, migrations, SQL files, or equivalent). Document every model, relation, enum, and constraint.
4. **Read all existing tests.** Identify what's already covered and what gaps exist.
5. **Read all environment variables** needed (from `.env.example`, `.env.local`, or docs). Identify which services require live API keys vs. can be mocked.
6. **Ensure the app builds and starts locally without errors.** Fix any build issues before proceeding.
7. **Create a test plan summary** listing every module/feature to be tested, saved to `TEST_PLAN.md`.

---

## PHASE 1: STATIC ANALYSIS & CODE QUALITY

Run all of the following and fix or document every issue:

### 1.1 Linting & Formatting
```
- Run the project linter (ESLint, Biome, etc.) on the entire codebase
- Run the formatter (Prettier, etc.) and check for inconsistencies
- Document any disabled lint rules and evaluate whether they're justified
```

### 1.2 TypeScript Strict Checks
```
- Run `tsc --noEmit` (or equivalent) with strict mode
- Identify and document all type errors, `any` usage, and unsafe casts
- Check for missing return types on exported functions
- Verify all API route handlers have proper input validation and typed responses
```

### 1.3 Dependency Audit
```
- Run `npm audit` (or equivalent) and document vulnerabilities
- Check for unused dependencies
- Check for outdated critical dependencies (especially security-related)
- Verify lock file integrity
```

---

## PHASE 2: UNIT TESTS

Write and run unit tests for every testable module. Use the project's existing test framework (Jest, Vitest, etc.) or set one up if none exists.

### 2.1 Utility Functions & Helpers
```
- Test all utility/helper functions with normal inputs, edge cases, and invalid inputs
- Test date/time helpers (especially timezone-sensitive aviation calculations)
- Test any formatting functions (currency, units, flight times, etc.)
- Test validation schemas (Zod, Yup, etc.) with valid and invalid payloads
```

### 2.2 Data Models & Business Logic
```
- Test any pure business logic functions (risk calculations, scoring algorithms, compliance checks)
- Test FRAT (Flight Risk Assessment Tool) scoring logic with boundary values
- Test any duty time / flight time calculation logic
- Test role/permission logic in isolation
- Test any state machines or workflow transitions
```

### 2.3 API Route Handlers (Unit Level)
```
- Test each API route handler with mocked dependencies
- Test request validation (missing fields, wrong types, extra fields)
- Test authorization checks (unauthenticated, wrong role, correct role)
- Test error responses match expected format
- Test pagination, filtering, and sorting parameters
```

---

## PHASE 3: INTEGRATION TESTS

### 3.1 Database Integration
```
- Test all CRUD operations against a real (test) database or seeded DB
- Test cascade deletes and referential integrity
- Test unique constraints (duplicate emails, duplicate org names, etc.)
- Test soft deletes if implemented
- Test database migrations run cleanly from scratch
- Test seed data loads correctly
```

### 3.2 Authentication & Authorization
```
- Test signup flow end-to-end (new user, new organization)
- Test login with valid credentials
- Test login with invalid credentials (wrong password, nonexistent user)
- Test session/token expiry and refresh
- Test password reset flow
- Test email verification flow (if applicable)
- Test OAuth flows (if applicable)
- Test that every protected route rejects unauthenticated requests
- Test role-based access control for EVERY route:
  - Admin can access admin routes
  - Pilot cannot access admin routes
  - Safety manager has appropriate access
  - Cross-organization access is blocked (user from Org A cannot see Org B data)
- Test invitation flow (admin invites new user to organization)
- Test user deactivation/removal from organization
```

### 3.3 Stripe / Payment Integration
```
- Test subscription creation flow (use Stripe test mode/keys)
- Test plan upgrade and downgrade
- Test subscription cancellation
- Test webhook handling for all relevant events:
  - checkout.session.completed
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.payment_succeeded
  - invoice.payment_failed
- Test that features are properly gated by subscription tier
- Test free trial flow (if applicable)
- Test seat-based billing calculations (if applicable)
- Test billing portal redirect
- Test failed payment handling and grace periods
```

### 3.4 Multi-Tenancy & Data Isolation
```
- Create two test organizations
- Verify Organization A cannot see Organization B's:
  - Safety reports
  - FRAT assessments
  - Users/employees
  - Aircraft
  - Documents
  - Settings/configurations
  - Audit logs
- Test that API queries always scope to the current user's organization
- Test that direct URL manipulation cannot access cross-org resources
- Test that admin of Org A cannot modify Org B resources
```

---

## PHASE 4: FEATURE-BY-FEATURE FUNCTIONAL TESTING

Test every feature as an end user would. For each feature, test the happy path AND all edge cases.

### 4.1 Organization Management
```
- Create organization
- Edit organization details (name, address, certificate info)
- Upload organization logo
- Configure organization settings
- View organization dashboard/overview
```

### 4.2 User Management
```
- Invite new user via email
- Accept invitation
- Assign roles (Admin, Safety Manager, Pilot, Dispatcher, etc.)
- Change user roles
- Deactivate user
- Reactivate user
- User profile editing (own profile)
- Password change
- Test all custom role permissions if implemented
```

### 4.3 Safety Reporting System
```
- Submit a new safety report (all report types if multiple exist)
- Test all form fields including required/optional validation
- Submit report as different user roles
- Submit anonymous report (if supported)
- View submitted reports list with filtering and sorting
- View individual report detail
- Edit a submitted report (test who can edit and when)
- Add comments/notes to a report
- Assign report to a safety manager for review
- Change report status through workflow (Open → Under Review → Closed, etc.)
- Test report categorization/tagging
- Test file/photo attachments on reports
- Test email notifications triggered by report events
- Search reports
- Export reports (PDF, CSV, etc.)
```

### 4.4 FRAT (Flight Risk Assessment Tool)
```
- Create a new FRAT assessment
- Test all risk factor inputs
- Verify scoring calculation is correct per your risk matrix
- Test score thresholds (Green/Yellow/Red or equivalent)
- Test that high-risk assessments trigger appropriate alerts/workflows
- Edit a FRAT assessment
- View FRAT history for a specific flight/pilot
- Test FRAT templates (if configurable per org)
- Test custom FRAT template creation/editing (Phase 3 backlog feature)
- Archive/delete assessments
```

### 4.5 Aircraft Management
```
- Add new aircraft (tail number, type, configuration)
- Edit aircraft details
- Deactivate/remove aircraft
- Test duplicate tail number prevention
- View aircraft list and details
- Associate aircraft with flights/reports
```

### 4.6 Document Management
```
- Upload documents
- Categorize documents
- View/download documents
- Delete documents
- Test file size limits
- Test allowed file types
- Test document versioning (if applicable)
- Test document expiry/renewal tracking (if applicable)
```

### 4.7 Hosted CBT Modules (if implemented / Phase 3)
```
- Create a new course
- Add course content (text, video, documents)
- Create quiz questions (multiple choice, true/false, etc.)
- Set passing score threshold
- Assign course to users/roles
- Complete a course as a pilot
- Take a quiz and verify scoring
- Test auto-completion tracking
- Test certificate generation (if applicable)
- View training records/completion status
- Test overdue training notifications
```

### 4.8 Dashboard & Analytics
```
- Verify dashboard loads correctly for each role
- Test all dashboard widgets/cards show accurate data
- Test date range filters on analytics
- Test chart rendering with zero data, small data, large data
- Verify report counts, trend data, risk summaries are accurate
- Test export functionality for analytics/reports
```

### 4.9 Notifications & Email
```
- Test all email notification triggers (report submitted, assigned, status change, etc.)
- Verify email content and formatting
- Test in-app notifications (if applicable)
- Test notification preferences/settings
- Test email deliverability with test email service
```

### 4.10 Audit Trail
```
- Verify all significant actions create audit log entries
- Test audit log viewing and filtering
- Verify audit logs cannot be modified or deleted by users
- Test that audit logs include: who, what, when, and the change details
```

---

## PHASE 5: EDGE CASES & ERROR HANDLING

### 5.1 Input Validation & Sanitization
```
- Test all forms with:
  - Empty/blank submissions
  - Extremely long strings (10,000+ characters)
  - Special characters (< > " ' & ; / \)
  - SQL injection payloads in text fields
  - XSS payloads in text fields (<script>alert('xss')</script>)
  - Unicode/emoji in all text fields
  - Negative numbers where positives expected
  - Zero values
  - Future dates where past dates expected (and vice versa)
  - Invalid email formats
  - Phone numbers in various formats
```

### 5.2 Concurrent Operations
```
- Test two users editing the same report simultaneously
- Test rapid-fire form submissions (double-click submit)
- Test API rate limiting (if implemented)
```

### 5.3 Error States
```
- Test behavior when database is unreachable
- Test behavior when Stripe is unreachable
- Test behavior when email service is unreachable
- Test 404 pages for nonexistent resources
- Test error boundary rendering (React error boundaries)
- Verify no stack traces or sensitive info leaked in production error responses
- Test API error response format consistency
```

### 5.4 Empty States
```
- Test every list/table view with zero records
- Test dashboard with no data
- Test search with no results
- Verify helpful empty state messages are shown
```

---

## PHASE 6: SECURITY TESTING

### 6.1 Authentication Security
```
- Test that passwords are hashed (never stored in plaintext)
- Test for session fixation vulnerabilities
- Test CSRF protection on all state-changing operations
- Test that auth tokens/cookies have proper flags (HttpOnly, Secure, SameSite)
- Test for JWT vulnerabilities if using JWTs (algorithm confusion, expiry, signature verification)
- Test account lockout after failed login attempts (if implemented)
```

### 6.2 Authorization Security
```
- Test IDOR (Insecure Direct Object Reference):
  - Change resource IDs in URLs to access other users' resources
  - Change resource IDs in API payloads
  - Try accessing resources from another organization by guessing/iterating IDs
- Test privilege escalation:
  - Can a pilot change their own role to admin?
  - Can a user modify request payloads to bypass role checks?
- Test that API routes enforce the same permissions as the UI
```

### 6.3 Data Security
```
- Verify sensitive data is encrypted at rest (if applicable)
- Verify HTTPS is enforced
- Test that API responses don't leak sensitive fields (password hashes, internal IDs, other users' emails)
- Test that file uploads are validated server-side (not just client-side)
- Test for path traversal in file upload/download
- Check Content Security Policy headers
- Check CORS configuration (only expected origins allowed)
```

---

## PHASE 7: PERFORMANCE & RELIABILITY

### 7.1 Performance Basics
```
- Test page load times for all main pages
- Test API response times for all endpoints
- Identify any N+1 query issues (check ORM query logs)
- Test with large datasets:
  - 1,000+ safety reports
  - 100+ users in an organization
  - 50+ aircraft
- Test image/file upload performance with large files
- Verify database indexes exist for commonly queried/filtered fields
```

### 7.2 Build & Bundle
```
- Analyze bundle size (next build output, or equivalent)
- Check for unnecessarily large dependencies
- Verify code splitting is working for route-based chunks
- Test that static assets are cached properly
```

---

## PHASE 8: ACCESSIBILITY & UI/UX

### 8.1 Accessibility
```
- Run axe-core or similar accessibility audit on all pages
- Test keyboard navigation on all interactive elements
- Test screen reader compatibility on critical flows
- Verify all images have alt text
- Verify form labels are properly associated with inputs
- Test color contrast ratios
- Test focus management after modal open/close and page transitions
```

### 8.2 Responsive Design
```
- Test all pages at common breakpoints:
  - Mobile (375px)
  - Tablet (768px)
  - Desktop (1280px)
  - Large desktop (1920px)
- Test that navigation is usable on mobile
- Test that tables/data grids are usable on mobile
- Test that modals and forms are usable on mobile
```

### 8.3 Browser Compatibility
```
- Test in Chrome, Firefox, Safari, and Edge (latest versions)
- Note any browser-specific rendering issues
```

---

## PHASE 9: DEPLOYMENT & INFRASTRUCTURE

### 9.1 Build & Deploy
```
- Verify production build completes without errors or warnings
- Verify all environment variables are documented and required ones are validated at startup
- Test database migration in a clean environment
- Verify health check endpoint exists and works
- Test that the app gracefully handles missing environment variables
```

### 9.2 Environment Configuration
```
- Verify separate configs for development, staging, production
- Verify secrets are not committed to the repository
- Check .gitignore for sensitive files
- Verify no hardcoded API keys, URLs, or credentials in the codebase
```

---

## PHASE 10: REGULATORY COMPLIANCE TESTING

Since this is an aviation SMS product, test against regulatory requirements:

### 10.1 FAA SMS Requirements (14 CFR Part 5 alignment)
```
- Verify the system supports all four SMS components:
  1. Safety Policy (document management, safety policy docs)
  2. Safety Risk Management (hazard identification, risk assessment via FRAT)
  3. Safety Assurance (auditing, reporting, data analysis)
  4. Safety Promotion (training/CBT, communication)
- Verify safety reports capture all fields required by regulation
- Verify reporting workflow supports required review/investigation steps
- Verify the system maintains an audit trail sufficient for FAA inspection
- Verify data retention meets regulatory requirements
```

### 10.2 Data Retention & Export
```
- Test data export for all major data types (reports, assessments, training records)
- Verify exports include all required fields
- Test bulk export functionality
- Test data retention policies (if configurable)
```

---

## OUTPUT REQUIREMENTS

After completing all phases, generate the following deliverables:

1. **`TEST_RESULTS.md`** — Full test results organized by phase, with pass/fail for each test case
2. **`BUGS.md`** — All bugs found, ranked by severity (Critical / High / Medium / Low), with:
   - Description
   - Steps to reproduce
   - Expected vs. actual behavior
   - Suggested fix (if obvious)
3. **`SECURITY_FINDINGS.md`** — All security issues found, ranked by severity
4. **`COVERAGE_REPORT.md`** — Summary of test coverage (what was tested, what couldn't be tested and why)
5. **`RECOMMENDATIONS.md`** — Suggestions for improvement (performance, security, UX, code quality)

---

## EXECUTION NOTES FOR CLAUDE CLI

- **Work methodically.** Complete one phase at a time. Don't skip ahead.
- **Be thorough.** It's better to test too much than too little.
- **Write real test files** where appropriate (unit tests, integration tests) and commit them.
- **If you can't test something** (e.g., requires live Stripe keys), document it clearly in the coverage report with instructions for manual testing.
- **If you find a bug**, document it immediately but keep testing. Don't stop to fix bugs unless they block further testing.
- **Use the actual database** (test/dev) — don't just read code and guess. Execute the app, make API calls, verify behavior.
- **Check both the API layer AND the UI layer** — a feature working in the API but broken in the UI (or vice versa) is still a bug.
- **Test as different user roles.** Create test accounts for each role and switch between them.
- **Start the dev server and interact with it** via curl, fetch, or a test runner. Don't just do static analysis.
- **After each phase, save your results to the corresponding section of TEST_RESULTS.md** so progress isn't lost.
