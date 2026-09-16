# USER STORIES — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Personas | PER-01 Investigating Officer · PER-02 I4C Analyst · PER-03 Bank Nodal Officer · PER-04 Cyber Cell Supervisor · PER-05 Platform Administrator |
| Traces from | `REQUIREMENTS.md` |
| Traces to | `ACCEPTANCE_CRITERIA.md`, `test-cases/`, `implementation/phase-*.md` |

Priority: **P0** release-blocking · **P1** important · **P2** desirable.

---

## EPIC 1 — Synthetic Data Foundation (FEAT-16)

### US-001 — Deterministic dataset generation
- **Priority:** P0 · **Persona:** PER-05 · **Feature:** FEAT-16 · **Phase:** P2
- **Story:** As a platform administrator, I want the demonstration dataset to be generated from a fixed seed, so that every team member, CI run and judge demo sees exactly the same data.
- **Preconditions:** Python environment installed; generator script present.
- **Description:** Running `npm run generate:data` with seed `26184` writes complaint, account, transaction, withdrawal and ATM datasets to `scripts/generate-data/output/`. A second run with the same seed produces identical files.
- **Acceptance criteria:** AC-016-01, AC-016-02
- **Test cases:** TC-DATA-001, TC-DATA-002, TC-DATA-008
- **Requirements:** FR-01, FR-01.1, FR-01.8

### US-002 — Realistic fraud patterns in the data
- **Priority:** P0 · **Persona:** PER-05 · **Feature:** FEAT-16 · **Phase:** P2
- **Story:** As a platform administrator, I want the synthetic data to contain planted latent patterns rather than random noise, so that the model has something real to learn and the demonstration is honest.
- **Preconditions:** Generator implemented.
- **Description:** The dataset encodes time-of-day, day-of-week, withdrawal density, transaction velocity, linked-account behaviour, distance, historical hotspot and amount patterns. A signal-check script confirms each pattern is statistically detectable before training is allowed to run.
- **Acceptance criteria:** AC-016-03, AC-016-04
- **Test cases:** TC-DATA-006, TC-DATA-009, TC-ML-001
- **Requirements:** FR-01.5, FR-01.9

### US-003 — Layered mule chains
- **Priority:** P0 · **Persona:** PER-01 · **Feature:** FEAT-16 · **Phase:** P2
- **Story:** As an investigating officer, I want the demonstration data to contain multi-hop victim→account→account→withdrawal chains, so that the money-trail graph shows a structure that resembles a real layering pattern.
- **Preconditions:** Generator implemented.
- **Acceptance criteria:** AC-016-05
- **Test cases:** TC-DATA-007
- **Requirements:** FR-01.6

### US-004 — No personal data anywhere
- **Priority:** P0 · **Persona:** PER-05 · **Feature:** FEAT-16 · **Phase:** P2
- **Story:** As a platform administrator, I want certainty that no real or realistic personal identifier exists in any dataset, so that the prototype is safe to demonstrate publicly.
- **Acceptance criteria:** AC-016-06
- **Test cases:** TC-SEC-020
- **Requirements:** FR-01.7, CR-01

---

## EPIC 2 — Complaint Registry and Detail (FEAT-01, FEAT-02)

### US-010 — Browse the complaint queue
- **Priority:** P0 · **Persona:** PER-01 · **Feature:** FEAT-01 · **Phase:** P3
- **Story:** As an investigating officer, I want to see all registered complaints in a paginated table, so that I can work through my queue without loading the whole corpus.
- **Preconditions:** Database seeded; user in LEA role.
- **Acceptance criteria:** AC-001-01, AC-001-02
- **Test cases:** TC-API-001, TC-UI-001
- **Requirements:** FR-02, FR-02.4

### US-011 — Find a specific complaint
- **Priority:** P0 · **Persona:** PER-01 · **Feature:** FEAT-01 · **Phase:** P3
- **Story:** As an investigating officer, I want to search by complaint ID or city and filter by fraud type, status, risk, date and state, so that I can locate the case a caller is asking about in seconds.
- **Acceptance criteria:** AC-001-03, AC-001-04
- **Test cases:** TC-API-002, TC-API-003
- **Requirements:** FR-02.1, FR-02.2

### US-012 — Prioritise by risk and value
- **Priority:** P1 · **Persona:** PER-04 · **Feature:** FEAT-01 · **Phase:** P3
- **Story:** As a cyber cell supervisor, I want to sort complaints by amount and risk score, so that I can allocate officers to the cases with the greatest exposure first.
- **Acceptance criteria:** AC-001-05
- **Test cases:** TC-API-004
- **Requirements:** FR-02.3

### US-013 — Understand a complaint at a glance
- **Priority:** P0 · **Persona:** PER-01 · **Feature:** FEAT-02 · **Phase:** P3
- **Story:** As an investigating officer, I want a complaint detail page showing the summary, transaction timeline and linked accounts, so that I can grasp the case without opening four systems.
- **Acceptance criteria:** AC-002-01, AC-002-02, AC-002-03
- **Test cases:** TC-UI-003, TC-UI-004, TC-UI-005, TC-UI-006
- **Requirements:** FR-03, FR-03.1, FR-03.2, FR-03.3

### US-014 — Analyse a complaint
- **Priority:** P0 · **Persona:** PER-01 · **Feature:** FEAT-02 · **Phase:** P3
- **Story:** As an investigating officer, I want an "Analyze Complaint" button that produces a live prediction, so that I get cash-out intelligence for this case immediately.
- **Preconditions:** ML service healthy; complaint has linked transactions.
- **Acceptance criteria:** AC-002-04, AC-002-05
- **Test cases:** TC-E2E-001, TC-E2E-002
- **Requirements:** FR-03.4, FR-03.5

### US-015 — Handle an unknown complaint gracefully
- **Priority:** P1 · **Persona:** PER-01 · **Feature:** FEAT-02 · **Phase:** P3
- **Story:** As an investigating officer, I want a clear not-found message when a complaint ID does not exist, so that I know it is a bad reference rather than a broken system.
- **Acceptance criteria:** AC-002-06
- **Test cases:** TC-API-007
- **Requirements:** FR-03.6

---

## EPIC 3 — Transactions and the Money Trail (FEAT-03, FEAT-04)

### US-020 — Inspect the transaction ledger
- **Priority:** P0 · **Persona:** PER-01 · **Feature:** FEAT-03 · **Phase:** P4
- **Story:** As an investigating officer, I want to browse and filter transactions by channel, amount, date and risk indicator, so that I can isolate the movements that matter.
- **Acceptance criteria:** AC-003-01, AC-003-02
- **Test cases:** TC-API-008
- **Requirements:** FR-04

### US-021 — Trace a single transaction
- **Priority:** P1 · **Persona:** PER-01 · **Feature:** FEAT-03 · **Phase:** P4
- **Story:** As an investigating officer, I want a detail view for one transaction showing both counterparties, channel, location and risk indicator, so that I can cite a specific movement in my case notes.
- **Acceptance criteria:** AC-003-03
- **Test cases:** TC-API-009
- **Requirements:** FR-04.1

### US-022 — See the money trail as a graph
- **Priority:** P0 · **Persona:** PER-01 · **Feature:** FEAT-04 · **Phase:** P4
- **Story:** As an investigating officer, I want the money trail rendered as a directed graph of victim, mule accounts and ATMs, so that I can see the layering structure that a statement hides.
- **Acceptance criteria:** AC-004-01, AC-004-02
- **Test cases:** TC-UI-007, TC-UI-008, TC-UI-009
- **Requirements:** FR-05, FR-05.1, FR-05.2

### US-023 — Drill into a graph node
- **Priority:** P0 · **Persona:** PER-01 · **Feature:** FEAT-04 · **Phase:** P4
- **Story:** As an investigating officer, I want to click any node and see its details — complaint and amount for a victim, ID/risk/transaction count for a mule account, ID/location/withdrawal history for an ATM — so that the graph is an investigation surface rather than a picture.
- **Acceptance criteria:** AC-004-03, AC-004-04, AC-004-05
- **Test cases:** TC-UI-010, TC-UI-011, TC-UI-012
- **Requirements:** FR-05.3, FR-05.4, FR-05.5

### US-024 — Bounded traversal
- **Priority:** P1 · **Persona:** PER-05 · **Feature:** FEAT-04 · **Phase:** P4
- **Story:** As a platform administrator, I want graph traversal depth capped, so that a pathological case cannot hang the database or the browser.
- **Acceptance criteria:** AC-004-06
- **Test cases:** TC-API-011, TC-PERF-004, TC-PERF-005
- **Requirements:** FR-04.3, FR-05.7

### US-025 — Watch a simulated live stream
- **Priority:** P2 · **Persona:** PER-02 · **Feature:** FEAT-03 · **Phase:** P4
- **Story:** As an I4C analyst, I want an in-app simulated transaction stream, so that the console conveys the real-time character of the problem during a demonstration.
- **Acceptance criteria:** AC-003-04
- **Test cases:** TC-API-012, TC-API-013, TC-UI-020
- **Requirements:** FR-24, FR-24.1

---

## EPIC 4 — Prediction Engine (FEAT-05 … FEAT-09)

### US-030 — Deterministic feature engineering
- **Priority:** P0 · **Persona:** PER-05 · **Feature:** FEAT-05 · **Phase:** P3
- **Story:** As a platform administrator, I want training and inference to share one feature module, so that train/serve skew cannot silently corrupt predictions.
- **Acceptance criteria:** AC-005-01, AC-005-02, AC-005-03
- **Test cases:** TC-UNIT-010 … TC-UNIT-015
- **Requirements:** FR-06, FR-06.1 … FR-06.5

### US-031 — Get a risk score for a complaint
- **Priority:** P0 · **Persona:** PER-01 · **Feature:** FEAT-06 · **Phase:** P3
- **Story:** As an investigating officer, I want a calibrated risk score with a HIGH/MEDIUM/LOW level and a confidence label, so that I can judge how much weight to place on the forecast.
- **Acceptance criteria:** AC-006-01, AC-006-02, AC-006-03
- **Test cases:** TC-ML-010, TC-ML-011, TC-ML-012
- **Requirements:** FR-07, FR-07.1, FR-07.2

### US-032 — Never receive a fabricated score
- **Priority:** P0 · **Persona:** PER-01 · **Feature:** FEAT-06 · **Phase:** P3
- **Story:** As an investigating officer, I want the system to tell me it cannot predict rather than invent a number, so that I never act on a fiction.
- **Acceptance criteria:** AC-006-04
- **Test cases:** TC-ML-014, TC-INT-020
- **Requirements:** FR-07.5, NFR-07

### US-033 — Get ranked cash-out hotspots
- **Priority:** P0 · **Persona:** PER-01 · **Feature:** FEAT-07 · **Phase:** P3
- **Story:** As an investigating officer, I want a ranked list of likely withdrawal locations with a probability and a likely-ATM count for each, so that I know where to deploy first and what my second choice is.
- **Acceptance criteria:** AC-007-01, AC-007-02, AC-007-03
- **Test cases:** TC-ML-020 … TC-ML-025
- **Requirements:** FR-08, FR-08.1 … FR-08.6

### US-034 — Get an expected time window
- **Priority:** P0 · **Persona:** PER-01 · **Feature:** FEAT-08 · **Phase:** P3
- **Story:** As an investigating officer, I want a bounded expected withdrawal window, so that I can time a deployment rather than watch a location indefinitely.
- **Acceptance criteria:** AC-008-01, AC-008-02, AC-008-03
- **Test cases:** TC-ML-030 … TC-ML-033
- **Requirements:** FR-09, FR-09.1 … FR-09.4

### US-035 — Understand why
- **Priority:** P0 · **Persona:** PER-01 · **Feature:** FEAT-09 · **Phase:** P3
- **Story:** As an investigating officer, I want the top contributing factors in plain language with a percentage and a direction, so that I can justify the deployment to my supervisor and defend it later.
- **Acceptance criteria:** AC-009-01, AC-009-02, AC-009-03, AC-009-04
- **Test cases:** TC-ML-040 … TC-ML-045
- **Requirements:** FR-10, FR-10.1 … FR-10.6

### US-036 — Challenge a prediction
- **Priority:** P1 · **Persona:** PER-04 · **Feature:** FEAT-09 · **Phase:** P5
- **Story:** As a cyber cell supervisor, I want to see the factor breakdown and the underlying graph before approving a deployment, so that I can overrule a prediction I do not find credible.
- **Acceptance criteria:** AC-009-05
- **Test cases:** TC-E2E-013
- **Requirements:** FR-10, FR-15.4

---

## EPIC 5 — GIS Intelligence (FEAT-10)

### US-040 — See the national picture
- **Priority:** P0 · **Persona:** PER-02 · **Feature:** FEAT-10 · **Phase:** P4
- **Story:** As an I4C analyst, I want an interactive national map with heatmap, hotspot and ATM layers, so that I can see where cash-out risk is concentrating across states.
- **Acceptance criteria:** AC-010-01, AC-010-02
- **Test cases:** TC-UI-030, TC-UI-031, TC-UI-032
- **Requirements:** FR-11, FR-11.1, FR-11.2

### US-041 — Drill into a hotspot
- **Priority:** P0 · **Persona:** PER-01 · **Feature:** FEAT-10 · **Phase:** P4
- **Story:** As an investigating officer, I want clicking a hotspot to open a drawer with score, level, window, nearby ATMs, top factors and related complaints, so that one click gives me everything I need to decide.
- **Acceptance criteria:** AC-010-03, AC-010-04
- **Test cases:** TC-UI-034, TC-UI-035
- **Requirements:** FR-12, FR-12.1

### US-042 — Act from the map
- **Priority:** P0 · **Persona:** PER-01 · **Feature:** FEAT-10 · **Phase:** P5
- **Story:** As an investigating officer, I want a "Generate Alert" button inside the hotspot drawer, so that I can move from insight to action without navigating away.
- **Acceptance criteria:** AC-010-05
- **Test cases:** TC-E2E-010
- **Requirements:** FR-12.2

### US-043 — Use the map without a mouse
- **Priority:** P1 · **Persona:** PER-01 · **Feature:** FEAT-10 · **Phase:** P6
- **Story:** As an officer using a keyboard or screen reader, I want an accessible table equivalent of the hotspot layer, so that the map's information is not locked behind pointer interaction.
- **Acceptance criteria:** AC-010-06
- **Test cases:** TC-A11Y-010
- **Requirements:** FR-12.4, AR-04

---

## EPIC 6 — Alerting (FEAT-11)

### US-050 — Compose an alert
- **Priority:** P0 · **Persona:** PER-01 · **Feature:** FEAT-11 · **Phase:** P5
- **Story:** As an investigating officer, I want an alert modal pre-filled with location, window, risk score, estimated exposure and top factors, so that I am not retyping intelligence the system already has.
- **Acceptance criteria:** AC-011-01, AC-011-02
- **Test cases:** TC-UI-040, TC-UI-041
- **Requirements:** FR-13, FR-13.1, FR-13.3

### US-051 — Choose recipients
- **Priority:** P0 · **Persona:** PER-01 · **Feature:** FEAT-11 · **Phase:** P5
- **Story:** As an investigating officer, I want to select LEA, Bank and/or I4C as recipients, so that the intelligence reaches the parties who can act.
- **Acceptance criteria:** AC-011-03
- **Test cases:** TC-UI-042, TC-API-030
- **Requirements:** FR-13.2

### US-052 — Dispatch and persist
- **Priority:** P0 · **Persona:** PER-01 · **Feature:** FEAT-11 · **Phase:** P5
- **Story:** As an investigating officer, I want the alert to be stored and marked SENT, and to appear on the dashboard, the alerts page and the investigation timeline, so that the whole unit sees the same operational picture.
- **Acceptance criteria:** AC-011-04, AC-011-05
- **Test cases:** TC-API-031, TC-E2E-011
- **Requirements:** FR-14, FR-14.1

### US-053 — Acknowledge an alert
- **Priority:** P0 · **Persona:** PER-03 · **Feature:** FEAT-11 · **Phase:** P5
- **Story:** As a bank nodal officer, I want to acknowledge an alert so that the originating officer knows it has been picked up.
- **Acceptance criteria:** AC-011-06
- **Test cases:** TC-API-032
- **Requirements:** FR-14.4

### US-054 — Audit every dispatch
- **Priority:** P0 · **Persona:** PER-05 · **Feature:** FEAT-11 · **Phase:** P5
- **Story:** As a platform administrator, I want every alert dispatch and acknowledgement recorded as an audit event with actor role and timestamp, so that the chain of action is reconstructable.
- **Acceptance criteria:** AC-011-07
- **Test cases:** TC-SEC-030, TC-SEC-033
- **Requirements:** FR-14.3, FR-21

### US-055 — Resist alert flooding
- **Priority:** P1 · **Persona:** PER-05 · **Feature:** FEAT-11 · **Phase:** P6
- **Story:** As a platform administrator, I want alert creation rate limited per role, so that a scripted client cannot flood recipients.
- **Acceptance criteria:** AC-011-08
- **Test cases:** TC-SEC-031
- **Requirements:** FR-14.5, NFR-23

---

## EPIC 7 — Investigation Workflow (FEAT-12)

### US-060 — Track a case through its lifecycle
- **Priority:** P0 · **Persona:** PER-01 · **Feature:** FEAT-12 · **Phase:** P5
- **Story:** As an investigating officer, I want to move a case through New → Analyzing → Under Review → Alert Sent → Monitoring → Resolved, so that the unit has a shared, current view of every case.
- **Acceptance criteria:** AC-012-01, AC-012-02
- **Test cases:** TC-API-040, TC-API-042
- **Requirements:** FR-15, FR-15.2

### US-061 — Prioritise cases
- **Priority:** P1 · **Persona:** PER-04 · **Feature:** FEAT-12 · **Phase:** P5
- **Story:** As a cyber cell supervisor, I want each investigation to carry High/Medium/Low priority, so that I can triage the workload.
- **Acceptance criteria:** AC-012-03
- **Test cases:** TC-API-041
- **Requirements:** FR-15.1

### US-062 — Record what I did
- **Priority:** P0 · **Persona:** PER-01 · **Feature:** FEAT-12 · **Phase:** P5
- **Story:** As an investigating officer, I want to add timestamped notes attributed to my role, so that the case file reflects the actual investigative steps.
- **Acceptance criteria:** AC-012-04
- **Test cases:** TC-API-043
- **Requirements:** FR-15.3

### US-063 — One place for everything about a case
- **Priority:** P0 · **Persona:** PER-01 · **Feature:** FEAT-12 · **Phase:** P5
- **Story:** As an investigating officer, I want the investigation view to surface complaint, graph, hotspot, factors and alerts together, so that I do not lose context switching between pages.
- **Acceptance criteria:** AC-012-05
- **Test cases:** TC-UI-050
- **Requirements:** FR-15.4

### US-064 — Automatic case progression on dispatch
- **Priority:** P1 · **Persona:** PER-01 · **Feature:** FEAT-12 · **Phase:** P5
- **Story:** As an investigating officer, I want dispatching an alert to move the investigation to "Alert Sent" automatically, so that status never drifts out of sync with reality.
- **Acceptance criteria:** AC-012-06
- **Test cases:** TC-E2E-012
- **Requirements:** FR-15.6

---

## EPIC 8 — Reports and Model Transparency (FEAT-13)

### US-070 — See the aggregate picture
- **Priority:** P0 · **Persona:** PER-04 · **Feature:** FEAT-13 · **Phase:** P6
- **Story:** As a cyber cell supervisor, I want charts of complaints over time, suspicious transactions, alert severity, predicted hotspots, top districts and fraud types, so that I can brief leadership from one screen.
- **Acceptance criteria:** AC-013-01
- **Test cases:** TC-UI-060
- **Requirements:** FR-16

### US-071 — Filter the reports
- **Priority:** P1 · **Persona:** PER-02 · **Feature:** FEAT-13 · **Phase:** P6
- **Story:** As an I4C analyst, I want to filter reports by date, city, state and fraud type, so that I can isolate a specific emerging pattern.
- **Acceptance criteria:** AC-013-02
- **Test cases:** TC-API-050
- **Requirements:** FR-16.1

### US-072 — See how good the model actually is
- **Priority:** P0 · **Persona:** PER-02 · **Feature:** FEAT-13 · **Phase:** P6
- **Story:** As an I4C analyst, I want published prototype model metrics clearly labelled as measured on synthetic data, so that I can calibrate my trust in the forecasts.
- **Acceptance criteria:** AC-013-03, AC-013-04
- **Test cases:** TC-API-051, TC-UI-061
- **Requirements:** FR-17, FR-17.1, FR-17.2

---

## EPIC 9 — Demonstration (FEAT-14)

### US-080 — One-click judge demo
- **Priority:** P0 · **Persona:** PER-02 · **Feature:** FEAT-14 · **Phase:** P7
- **Story:** As a demonstrator, I want a single "RUN DEMO SCENARIO" control that executes the whole value chain against the real API, so that a judge experiences the product in under three minutes without me navigating.
- **Acceptance criteria:** AC-014-01, AC-014-02
- **Test cases:** TC-UI-070, TC-E2E-022
- **Requirements:** FR-19, FR-19.1, FR-19.2

### US-081 — Guided presentation mode
- **Priority:** P0 · **Persona:** PER-02 · **Feature:** FEAT-14 · **Phase:** P7
- **Story:** As a demonstrator, I want a `/demo` route that walks through complaint → graph → analysis → hotspot → explanation → alert, so that the narrative is linear and cannot go off-script.
- **Acceptance criteria:** AC-014-03
- **Test cases:** TC-E2E-020
- **Requirements:** FR-18

### US-082 — Reset between judges
- **Priority:** P0 · **Persona:** PER-02 · **Feature:** FEAT-14 · **Phase:** P7
- **Story:** As a demonstrator, I want a "Reset Demo" control that restores a known state without destroying seed data, so that the second judge sees exactly what the first did.
- **Acceptance criteria:** AC-014-04
- **Test cases:** TC-E2E-021, TC-API-060
- **Requirements:** FR-18.1, FR-18.2

### US-083 — Honest degradation on stage
- **Priority:** P0 · **Persona:** PER-02 · **Feature:** FEAT-14 · **Phase:** P7
- **Story:** As a demonstrator, I want the demo to show an explicit degraded-mode notice if the ML service is unreachable, so that I am never presenting invented numbers.
- **Acceptance criteria:** AC-014-05
- **Test cases:** TC-E2E-023
- **Requirements:** FR-19.3

---

## EPIC 10 — Roles, Settings, Trust (FEAT-15)

### US-090 — Role-scoped capability
- **Priority:** P0 · **Persona:** PER-03 · **Feature:** FEAT-15 · **Phase:** P3
- **Story:** As a bank nodal officer, I want to see only what my role should see and be blocked server-side from actions I should not take, so that the role concept is meaningful rather than cosmetic.
- **Acceptance criteria:** AC-015-01, AC-015-02
- **Test cases:** TC-SEC-010, TC-SEC-011, TC-SEC-012
- **Requirements:** FR-20, FR-20.1, NFR-25

### US-091 — Configure the operating threshold
- **Priority:** P2 · **Persona:** PER-05 · **Feature:** FEAT-15 · **Phase:** P6
- **Story:** As a platform administrator, I want to adjust the risk threshold, so that the HIGH/MEDIUM/LOW boundary can be tuned to a unit's appetite.
- **Acceptance criteria:** AC-015-03
- **Test cases:** TC-API-070
- **Requirements:** FR-22

### US-092 — Know the system's mode at all times
- **Priority:** P0 · **Persona:** PER-01 · **Feature:** FEAT-15 · **Phase:** P3
- **Story:** As any user, I want a persistent indicator that this is a prototype running on synthetic data, so that I never mistake a demonstration for operational intelligence.
- **Acceptance criteria:** AC-015-04, AC-015-05
- **Test cases:** TC-UI-081, TC-UI-082
- **Requirements:** FR-22.1, FR-25, CR-02

### US-093 — See system health
- **Priority:** P1 · **Persona:** PER-05 · **Feature:** FEAT-15 · **Phase:** P2
- **Story:** As a platform administrator, I want a health endpoint and panel reporting web, database and ML service status with latency, so that I can diagnose a failing demo in seconds.
- **Acceptance criteria:** AC-015-06
- **Test cases:** TC-API-080
- **Requirements:** FR-23

---

## Story Coverage Matrix

| Epic | Feature(s) | Stories | P0 | P1 | P2 |
|---|---|:--:|:--:|:--:|:--:|
| 1 Synthetic data | FEAT-16 | 4 | 4 | 0 | 0 |
| 2 Complaints | FEAT-01, FEAT-02 | 6 | 4 | 2 | 0 |
| 3 Transactions & trail | FEAT-03, FEAT-04 | 6 | 3 | 2 | 1 |
| 4 Prediction engine | FEAT-05 … FEAT-09 | 7 | 6 | 1 | 0 |
| 5 GIS | FEAT-10 | 4 | 3 | 1 | 0 |
| 6 Alerting | FEAT-11 | 6 | 5 | 1 | 0 |
| 7 Investigations | FEAT-12 | 5 | 3 | 2 | 0 |
| 8 Reports | FEAT-13 | 3 | 2 | 1 | 0 |
| 9 Demo | FEAT-14 | 4 | 4 | 0 | 0 |
| 10 Roles & trust | FEAT-15 | 4 | 2 | 1 | 1 |
| **Total** | **16 features** | **49** | **36** | **11** | **2** |

Every feature FEAT-01 … FEAT-16 has at least one P0 story. No story exists without a requirement reference, and no Must requirement lacks a story — verified in `implementation/documentation-audit.md`.
