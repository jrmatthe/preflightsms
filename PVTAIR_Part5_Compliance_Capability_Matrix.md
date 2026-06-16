# PreflightSMS — Regulatory Capability Matrix

**Prepared for:** Owner / Accountable Executive, PVTAIR (14 CFR Part 135 operator)
**Subject:** Tool-by-tool mapping of PreflightSMS features to the FAA regulatory requirements each one supports
**Date:** June 15, 2026

---

## Bottom Line Up Front

On **April 26, 2024** the FAA published its final Safety Management System (SMS) rule, expanding **14 CFR Part 5** to **Part 135 operators** (effective **May 28, 2024**). As a Part 135 certificate holder, PVTAIR must **develop and implement a conforming SMS and submit a Declaration of Compliance to the FAA no later than May 28, 2027** (14 CFR § 5.9; 36 months from the effective date).

PreflightSMS (originally built as the *PVTAIR FRAT*) is a complete, web-based SMS platform that provides the structure, daily-use tools, and records to **build, operate, document, and prove** a Part 5–compliant SMS — and to **generate the § 5.9 Declaration itself**. This document lists each tool, what it does, and the regulation it addresses.

> **How to read the "Regulation addressed" column:** Citations indicate the specific requirement each tool *supports and produces evidence for*. They are not a legal determination of compliance — final compliance is determined by the FAA. See **Scope & Honest Limitations** at the end.

The platform is organized around the four required components ("pillars") of Part 5, which is exactly how the FAA evaluates an SMS:

| Part 5 Component | Subpart | PreflightSMS Coverage |
|---|---|---|
| Safety Policy | B (§§ 5.21–5.27) | ✅ Manuals, policy library, role accountability, ERP |
| Safety Risk Management | C (§§ 5.51–5.55) | ✅ FRAT, hazard register, MOC, safety reporting |
| Safety Assurance | D (§§ 5.71–5.75) | ✅ SPIs, audits, corrective actions, trend analysis |
| Safety Promotion | E (§§ 5.91–5.93) | ✅ Training, culture survey, communications, ASAP |
| Documentation & Recordkeeping | F (§§ 5.95–5.97) | ✅ Compliance checklist, records/export, audit trails |
| **Declaration of Compliance** | A (§ 5.9) | ✅ **Declaration of Compliance Wizard** |

---

## Pillar 1 — Safety Policy *(Subpart B, §§ 5.21–5.27)*

| Tool / Feature | What it does | Regulation addressed |
|---|---|---|
| **SMS Manual Builder** | Pre-built, customizable Part 5 manual templates; organization variables (personnel, fleet, locations) auto-populate every manual; publish and export to PDF/Word with version control. | § 5.21 Safety policy · § 5.95 SMS documentation |
| **Policy Library & Acknowledgment Tracking** | Central, version-controlled repository for policies/SOPs in which each employee electronically acknowledges documents, producing a per-person compliance matrix tagged to specific Part 5 sections. | § 5.21(c) (policy communication) · § 5.93 Safety communication · § 5.97 SMS records |
| **Role-Based Accountability (Accountable Executive / Safety Manager)** | Named-role assignment (accountable executive, safety manager, chief pilot, director of ops/maintenance) with authority and system permissions enforced per role. | § 5.23 Safety accountability and authority · § 5.25 Designation and responsibilities of required safety management personnel |
| **Emergency Response Plan (ERP)** | Scenario-based response checklists, call trees, drill scheduling and tracking, staff acknowledgments, and printable quick-reference cards. | § 5.27 Coordination of emergency response planning · 49 CFR Part 830 (NTSB accident/incident notification) |

---

## Pillar 2 — Safety Risk Management *(Subpart C, §§ 5.51–5.55)*

| Tool / Feature | What it does | Regulation addressed |
|---|---|---|
| **Flight Risk Assessment Tool (FRAT)** | Pilots score each flight across weather, pilot/crew, aircraft, environment, and operational factors; the system computes a risk level and enforces management-approval gates before HIGH/CRITICAL flights may depart. | § 5.55 Safety risk assessment and control · supports § 91.103 Preflight action |
| **FRAT Template Editor** | Admins define the organization's own risk factors, point weights, thresholds, and approval rules, assignable per aircraft type. | § 5.51 (SRM applicability) · § 5.55 (risk acceptance criteria) |
| **Hazard Register** | Formal seven-step hazard workflow — identify → assess on a 5×5 risk matrix → decide → mitigate → residual risk → monitor/close → lessons learned. | § 5.53 System analysis and hazard identification · § 5.55 Safety risk assessment and control |
| **Safety Reporting** | Crew and staff submit hazard, incident, and near-miss reports (with confidential/anonymous options) that feed the hazard register and investigations. | § 5.53 (internal hazard reporting as a required hazard-identification source) |
| **Management of Change (MOC)** | Structured assessment of hazards introduced by operational changes (new routes, fleet, procedures, vendors) with mitigation plan and post-implementation effectiveness review. | § 5.51 (SRM applied to changes) · § 5.55 |
| **Fatigue Risk Assessment** | Optional FRAT module capturing sleep, hours-awake, duty start, and time-zone-crossing data to compute a fatigue risk level. | § 5.53 (fatigue hazard identification) · supports § 135.267 (flight time & rest) |
| **AI Risk & FRAT Assist** *(decision-support)* | Suggests likelihood/severity scores and relevant risk factors from the organization's history; all output is advisory and human-reviewed before use. | Decision-support for § 5.53 / § 5.55 (human-in-the-loop) |

---

## Pillar 3 — Safety Assurance *(Subpart D, §§ 5.71–5.75)*

| Tool / Feature | What it does | Regulation addressed |
|---|---|---|
| **Safety Performance Indicators (SPIs) & Targets** | Define measurable safety indicators with numeric targets and alert thresholds; the system auto-measures actual performance each period and flags on-target / approaching / breached. | § 5.71 Safety performance monitoring and measurement |
| **Trend Analysis & Anomaly Detection** | Compares rolling 30-/60-day baselines across key metrics, flags significant changes, and generates plain-language summaries for management review. | § 5.71 (data analysis) · § 5.75 Continuous improvement |
| **Internal Evaluation Program (Audits)** | Build audit templates, conduct scored internal audits, log findings by severity, link findings to corrective actions, and export results to PDF. | § 5.73 Safety performance assessment (internal evaluation/auditing under § 5.71) |
| **Audit Scheduling & Reminders** | Recurring audit schedules (monthly/quarterly/annual) with automatic due and overdue notifications to assigned auditors. | § 5.71 / § 5.73 |
| **Corrective Action Tracking** | Assign, prioritize, and track corrective actions to verified closure with overdue alerts and time-to-close metrics, closed-loop to the originating report or hazard. | § 5.55(c) (risk controls) · § 5.73 · § 5.75 |
| **Safety Dashboards & Analytics** | Organization-wide dashboards (FRAT analytics, safety metrics, open items, SMS health) to support periodic management safety review. | § 5.71 / § 5.73 (management review) |
| **Insurance / SMS-Maturity Scorecard** | Composite 0–100 SMS-maturity score across 10 weighted metrics, exportable for insurance carriers and leadership. | § 5.73 (performance assessment) · business/insurance value |

---

## Pillar 4 — Safety Promotion *(Subpart E, §§ 5.91–5.93)*

| Tool / Feature | What it does | Regulation addressed |
|---|---|---|
| **Computer-Based Training (CBT)** | Self-paced SMS courses with embedded quizzes, configurable pass thresholds, completion certificates, and role-based assignment. | § 5.91 Competencies and training |
| **Training Compliance Tracking** | Tracks completion and expiry, emails 30-day-out and overdue reminders, and reports per-user compliance percentage. | § 5.91 · § 5.97(c) (training records) |
| **Safety Culture Survey** | Periodic Likert-scale surveys across five culture dimensions (reporting, just, learning, management commitment, engagement) with scoring and trend comparison. | § 5.91 / § 5.93 (measure & promote safety culture) |
| **Notifications & Safety Bulletins** | Targeted in-app/push notifications and broadcast safety bulletins routed by role and user preference. | § 5.93 Safety communication |
| **AI Safety Digest & Lessons-Learned** | Periodic AI-generated, de-identified safety summaries and lessons-learned briefs for distribution to the team. | § 5.93 (dissemination of safety information and lessons learned) |
| **Post-Flight Nudge** | Prompts the pilot after each flight to file a report if anything is worth noting, reinforcing the reporting culture. | § 5.93 (promotion) · § 5.53 (hazard-identification engagement) |
| **ASAP Module** | Confidential, non-punitive voluntary reporting program with an Event Review Committee (ERC) workflow, acceptance/exclusion criteria, and MOU tracking. | AC 120-66C (Aviation Safety Action Program) · supports § 5.21 (non-punitive policy) & § 5.53 |

---

## Documentation, Recordkeeping & the Declaration of Compliance *(Subpart F §§ 5.95–5.97; § 5.9)*

| Tool / Feature | What it does | Regulation addressed |
|---|---|---|
| **FAA Part 5 Compliance Checklist (Audit Log)** | A live checklist of every Part 5 requirement (all six subparts) that auto-checks live system data against each item, displays status and supporting evidence, and computes overall percent-compliance. | § 5.95 SMS documentation · § 5.97 SMS records (compliance evidence) |
| **Declaration of Compliance Wizard** | Six-step wizard that compiles organization and personnel data, real-time Part 5 readiness, and an evidence summary into a signed PDF **Declaration of Compliance ready for FAA submission**. | **§ 5.9 Declaration of compliance** (AC 120-92D; FAA Notice 8900.700) |
| **Records & Export (CSV / PDF / Word)** | Exportable records for FRATs, safety reports, audits, training, and scorecards for retention and FAA surveillance. | § 5.97 SMS records |
| **Immutable Audit Trails** | Time-stamped, append-only logs for MEL actions, API calls, and policy acknowledgments. | § 5.97 (record integrity) |
| **International Compliance Crosswalk** | Tracks ICAO / IS-BAO / EASA / Transport Canada SMS requirements and maps them to Part 5, flagging which items Part 5 already satisfies and which are gaps. | ICAO Annex 19 · IS-BAO · EASA ORO.GEN.200 / EU 376/2014 · Transport Canada CARs Subpart 107 |

---

## Operational Safety Tools *(support the Part 91/135 operating rules the SMS governs)*

These tools are not Part 5 components themselves; they operationalize the underlying flight-operations rules that the SMS is built to oversee, and they generate the safety data that feeds the four pillars.

| Tool / Feature | What it does | Regulation addressed |
|---|---|---|
| **Flight Following & Overdue-Flight Alerting** | Monitors active flights and alerts designated flight followers (email/SMS) when a flight is overdue past its ETA. | § 135.79 Flight locating requirements |
| **Live ADS-B Flight Tracking** | Displays real-time aircraft positions and auto-arrives flights upon landing near the destination. | Supports § 135.79 (flight locating / operational control) |
| **Weather Briefing & Analysis** | Pulls METAR, TAF, PIREP, AIRMET/SIGMET, NOTAM, and runway data from the FAA Aviation Weather Center and flags hazards plus the flight-rules category (VFR/MVFR/IFR/LIFR). | § 91.103 Preflight action · § 135.213 Weather reports and forecasts (approved source) |
| **MEL / Inoperative-Equipment Tracking** | Logs equipment deferrals by category A–D with auto-computed expiration dates and a full rectification audit trail; *(planned)* synchronizes deferrals directly from **Veryon** — PVTAIR's adopted maintenance-tracking system of record — so pilots always see current, authoritative MEL status without manual re-entry. | § 91.213 / § 135.179 Inoperative/inoperable instruments and equipment (MEL) |
| **Fleet / Aircraft Registry** | Central aircraft records (type, registration, capacity, base) that underpin MEL tracking and operational control. | Airworthiness/operational-control data backbone (§ 135.413 context) |
| **Fuel & Flight-Plan Capture** | Captures fuel load, route, cruise altitude, and crew/passenger counts on each FRAT and flight record. | Supports § 91.151 / § 91.167 (and § 135.209 / § 135.223) fuel requirements |
| **Weight & Balance Capture** | Retains weight-and-balance data passed from ForeFlight dispatch with the flight record. | Supports § 135.63(c) load-manifest recordkeeping |

---

## Platform, Integrations & Governance

| Tool / Feature | What it does | Regulation addressed |
|---|---|---|
| **ForeFlight Integration** | Auto-imports released dispatch flights and pushes the completed FRAT PDF back onto the ForeFlight flight record. | Operational data integration (feeds SRM + § 5.97 records) |
| **SchedAero Integration** | Imports scheduled trips so pilots can start a FRAT directly from the schedule. | Operational data integration |
| **Veryon Maintenance Integration** *(planned)* | Synchronizes MEL and deferred-maintenance items from **Veryon** — the maintenance-tracking platform PVTAIR has adopted — into the fleet and FRAT, keeping airworthiness deferrals current straight from the maintenance system of record (no double entry). | Supports § 91.213 / § 135.179 (MEL) · § 135.413 (responsibility for airworthiness) |
| **Public REST API & Webhooks** | Authenticated, rate-limited API and HMAC-signed webhooks for fleet, FRAT, report, and training-compliance data. | Enterprise interoperability / data portability |
| **Role-Based Access Control & Tenant Isolation** | Seven roles plus granular permissions, enforced by database row-level security so each operator's data is isolated. | § 5.97 (record integrity & access control) · data governance |
| **Privacy & Data-Deletion Controls** | Documented retention, a CCPA-style deletion workflow with grace period, and disclosed sub-processors. | CCPA / privacy (data protection) |

---

## Part 5 Coverage at a Glance

| Part 5 Requirement | Addressed By |
|---|---|
| **§ 5.9** Declaration of compliance | Declaration of Compliance Wizard |
| **§ 5.21** Safety policy | SMS Manual Builder · Policy Library |
| **§ 5.23** Safety accountability and authority | Role-Based Accountability (RBAC) |
| **§ 5.25** Required safety management personnel | Accountable Executive / Safety Manager roles |
| **§ 5.27** Emergency response planning | Emergency Response Plan (ERP) module |
| **§ 5.51** SRM applicability | FRAT Templates · Management of Change |
| **§ 5.53** Hazard identification | Hazard Register · Safety Reporting · Post-Flight Nudge |
| **§ 5.55** Safety risk assessment & control | FRAT · Hazard Register · Corrective Actions |
| **§ 5.71** Performance monitoring & measurement | SPIs & Targets · Trend Analysis · Dashboards |
| **§ 5.73** Safety performance assessment | Internal Audits · Corrective Actions · Scorecard |
| **§ 5.75** Continuous improvement | Trend Analysis · Corrective Actions |
| **§ 5.91** Competencies and training | CBT Modules · Training Compliance Tracking |
| **§ 5.93** Safety communication | Notifications · Safety Digest · Lessons-Learned |
| **§ 5.95** SMS documentation | SMS Manual Builder · Compliance Checklist |
| **§ 5.97** SMS records | Records/Export · Audit Trails · Acknowledgments |

**Beyond Part 5 (supporting operating rules):** § 91.103 · § 135.79 · § 135.213 · § 91.213 / § 135.179 · § 135.267 · 49 CFR Part 830.
**Beyond FAA (optional international modules):** ICAO Annex 19 · IS-BAO · EASA · Transport Canada.

---

## Scope & Honest Limitations

To set accurate expectations for an adoption decision:

1. **A tool is not, by itself, an SMS.** PreflightSMS supplies the framework, daily-use workflows, and records. PVTAIR must still *implement and operate* the SMS — designate the accountable executive and safety manager, adopt the policies, populate the data, run the processes, and keep them active over time. Compliance is achieved by the operator's actions, evidenced by the platform.

2. **The Declaration is signed and submitted by PVTAIR.** The wizard prepares the § 5.9 Declaration of Compliance and assembles the evidence; PVTAIR's accountable executive signs it and submits it to the FAA. The platform does not interact with the FAA/CHDO/FSDO on the operator's behalf.

3. **Single-pilot and small-operator exclusions apply.** Certain § 5.9(e) exclusions exist for operators with a single pilot solely responsible for operations; PVTAIR's specific applicability and timeline should be confirmed with its CHDO/FSDO.

4. **MEL authorization and maintenance data are external.** MEL deferral tracking presumes PVTAIR holds the appropriate MEL authorization (e.g., LOA D095). Once the **Veryon** integration is live, Veryon remains the maintenance system of record for deferrals — PreflightSMS surfaces and applies that data operationally for pilots, but does not replace the approved maintenance-tracking program or grant the authorization. *(Veryon synchronization is a planned/roadmap integration, distinct from the live ForeFlight and SchedAero integrations.)*

5. **Operational aids do not transfer pilot/operator responsibility.** Weather briefing, ADS-B tracking, fuel capture, and flight following are decision aids — the pilot in command and the operator remain responsible under the applicable Part 91/135 operating rules.

6. **AI features are advisory.** AI categorization, risk suggestions, and digests are human-in-the-loop decision support, not autonomous safety decisions.

7. **Citations indicate supported requirements, not legal findings.** This matrix is a capability map, not a compliance certification. The FAA determines compliance.

---

## Regulatory Sources

- FAA Final Rule — *Safety Management Systems*, 89 FR (published April 26, 2024; effective May 28, 2024). Federal Register: <https://www.federalregister.gov/documents/2024/04/26/2024-08669/safety-management-systems>
- 14 CFR Part 5 — Safety Management Systems (eCFR): <https://www.ecfr.gov/current/title-14/chapter-I/subchapter-A/part-5>
- FAA, *Significant Changes to Part 5*: <https://www.faa.gov/sites/faa.gov/files/Significant_Part_5_Changes.pdf>
- FAA, *Part 5 FAQ (From Industry)*: <https://www.faa.gov/media/96306>
- NATA — *SMS Rule Expanded to Include Part 135*: <https://nata.aero/press/sms-rule-expanded-to-include-part-135-nata-providing-educational-resources/>
- AC 120-92D — *Safety Management Systems for Aviation Service Providers*
- AC 120-66C — *Aviation Safety Action Program (ASAP)*
- 49 CFR Part 830 — *Notification and Reporting of Aircraft Accidents or Incidents* (NTSB)

*Compliance deadline for Part 135 operators: **May 28, 2027** (Declaration of Compliance due per § 5.9).*
