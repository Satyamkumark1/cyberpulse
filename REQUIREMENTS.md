# REQUIREMENTS — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Status | Baseline |
| Source | `PRD.md` Part C |
| Traces to | `USER_STORIES.md`, `ACCEPTANCE_CRITERIA.md`, `test-cases/`, `implementation/phase-test-matrix.md` |

## How to read this document

Every requirement carries: a stable **ID**, a **statement** in "the system shall" form, a **priority** (Must / Should / Could), the **feature** that realises it, a **verification method**, the **test cases** that verify it, and the **phase** in which it is delivered.

Verification methods: **T** = automated test, **D** = demonstration, **I** = inspection/code review, **A** = analysis/measurement.

Priority uses MoSCoW. **Must** requirements are release-blocking.

---

# 1. FUNCTIONAL REQUIREMENTS

## 1.1 Synthetic Data (FEAT-16)

| ID | Requirement | Pri | Verify | Tests | Phase |
|---|---|:--:|:--:|---|:--:|
| FR-01 | The system shall generate a complete synthetic dataset from a single integer seed | Must | T | TC-UNIT-001, TC-DATA-001 | P2 |
| FR-01.1 | Regenerating with the same seed shall produce byte-identical output files | Must | T | TC-DATA-002 | P2 |
| FR-01.2 | The generator shall emit at minimum 500 complaints, 10,000 accounts, 50,000 transactions, 2,000 withdrawals and 500 ATMs; defaults are 500 / 12,000 / 60,000 / 2,400 / 520 | Must | T | TC-DATA-003 | P2 |
| FR-01.3 | The generator shall produce six fraud types: UPI Fraud, Investment Scam, Phishing, Job Scam, QR Fraud, Card Fraud | Must | T | TC-DATA-004 | P2 |
| FR-01.4 | The generator shall produce geographic clusters across at least seven metro regions (Delhi/NCR, Mumbai, Hyderabad, Bengaluru, Chennai, Ahmedabad, Lucknow) | Must | T | TC-DATA-005 | P2 |
| FR-01.5 | The generator shall plant latent, learnable patterns for time-of-day, day-of-week, withdrawal density, transaction velocity, linked-account behaviour, distance, historical hotspot behaviour and amount behaviour | Must | A | TC-DATA-006, TC-ML-001 | P2 |
| FR-01.6 | The generator shall construct victim → suspicious account → suspicious account → withdrawal chains of depth 2 to 4 | Must | T | TC-DATA-007 | P2 |
| FR-01.7 | No generated record shall contain a real or realistic personal identifier (name, Aadhaar, PAN, phone, real account number) | Must | I,T | TC-SEC-020 | P2 |
| FR-01.8 | The generator shall be runnable via `npm run generate:data` and shall write to a version-controlled data directory | Must | D | TC-DATA-008 | P2 |
| FR-01.9 | A signal-check script shall verify that planted patterns are statistically detectable before training is permitted | Must | T | TC-DATA-009 | P2 |

## 1.2 Complaint Registry and Detail (FEAT-01, FEAT-02)

| ID | Requirement | Pri | Verify | Tests | Phase |
|---|---|:--:|:--:|---|:--:|
| FR-02 | The system shall list complaints with server-side pagination | Must | T | TC-API-001, TC-UI-001 | P3 |
| FR-02.1 | The list shall support free-text search across complaint ID and city | Must | T | TC-API-002 | P3 |
| FR-02.2 | The list shall support filtering by fraud type, status, risk level, date range, city and state | Must | T | TC-API-003 | P3 |
| FR-02.3 | The list shall support sorting by complaint timestamp, amount and risk score | Must | T | TC-API-004 | P3 |
| FR-02.4 | Default page size shall be 25, maximum 100; a request above the maximum shall be rejected with 400 | Must | T | TC-API-005 | P3 |
| FR-02.5 | The list shall render loading skeletons, an empty state and an error state | Must | T | TC-UI-002 | P3 |
| FR-03 | The system shall present a complaint detail view for a valid complaint ID | Must | T | TC-API-006, TC-UI-003 | P3 |
| FR-03.1 | The detail view shall include a complaint summary block (ID, fraud type, amount, timestamp, victim location, status) | Must | T | TC-UI-004 | P3 |
| FR-03.2 | The detail view shall include a chronological transaction timeline for the complaint | Must | T | TC-UI-005 | P3 |
| FR-03.3 | The detail view shall list linked accounts with account ID, type, risk score and status | Must | T | TC-UI-006 | P3 |
| FR-03.4 | The detail view shall expose an "Analyze Complaint" action that invokes prediction | Must | T | TC-E2E-001 | P3 |
| FR-03.5 | The detail view shall render the AI prediction, risk factors, predicted hotspot and expected time window once analysis completes | Must | T | TC-E2E-002 | P3 |
| FR-03.6 | An unknown complaint ID shall return 404 with a typed error body and render a not-found state | Must | T | TC-API-007 | P3 |

## 1.3 Transactions (FEAT-03)

| ID | Requirement | Pri | Verify | Tests | Phase |
|---|---|:--:|:--:|---|:--:|
| FR-04 | The system shall list transactions with pagination, filtering by channel, amount range, date range and risk indicator | Must | T | TC-API-008 | P4 |
| FR-04.1 | The system shall present a single-transaction detail view including counterparties, amount, channel, timestamp, location and risk indicator | Must | T | TC-API-009 | P4 |
| FR-04.2 | The system shall expose a network endpoint returning the money-trail subgraph reachable from a transaction or complaint | Must | T | TC-API-010 | P4 |
| FR-04.3 | Subgraph traversal depth shall be bounded (default 4 hops, maximum 6) to prevent unbounded queries | Must | T | TC-API-011, TC-PERF-005 | P4 |
| FR-24 | The system shall provide an in-app simulated transaction event stream that appends events to `simulation_events` and surfaces them in the UI | Should | T,D | TC-API-012, TC-UI-020 | P4 |
| FR-24.1 | The simulation shall be startable, pausable and resettable, and shall never write to production-path tables other than `simulation_events` | Should | T | TC-API-013 | P4 |

## 1.4 Money-Trail Network Graph (FEAT-04)

| ID | Requirement | Pri | Verify | Tests | Phase |
|---|---|:--:|:--:|---|:--:|
| FR-05 | The system shall render a directed money-trail graph using React Flow | Must | T | TC-UI-007 | P4 |
| FR-05.1 | Node types shall be Victim, Mule Account and ATM, each visually distinct and labelled with text | Must | I,T | TC-UI-008, TC-A11Y-005 | P4 |
| FR-05.2 | Edges shall be directional and shall display the transferred amount | Must | T | TC-UI-009 | P4 |
| FR-05.3 | Clicking a Victim node shall show the linked complaint and amount | Must | T | TC-UI-010 | P4 |
| FR-05.4 | Clicking a Mule Account node shall show account ID, risk score, transaction count and linked-account count | Must | T | TC-UI-011 | P4 |
| FR-05.5 | Clicking an ATM node shall show ATM ID, location and withdrawal history | Must | T | TC-UI-012 | P4 |
| FR-05.6 | The graph shall never display a personal name; accounts shall be referenced only by synthetic account identifier | Must | I | TC-SEC-021 | P4 |
| FR-05.7 | The graph shall render 200 nodes within 800 ms and shall virtualise or paginate beyond that | Must | A | TC-PERF-004 | P4 |

## 1.5 Feature Engineering (FEAT-05)

| ID | Requirement | Pri | Verify | Tests | Phase |
|---|---|:--:|:--:|---|:--:|
| FR-06 | The system shall compute a documented, versioned feature vector for each complaint–candidate-hotspot pair | Must | T | TC-UNIT-010 | P3 |
| FR-06.1 | The feature set shall include: transaction amount, transaction velocity, linked account count, account age, prior suspicious activity, distance, ATM density, historical hotspot score, hour of day, day of week, recency, withdrawal count and linked-account depth | Must | T | TC-UNIT-011 | P3 |
| FR-06.2 | Feature computation shall be deterministic for identical inputs | Must | T | TC-UNIT-012 | P3 |
| FR-06.3 | Missing inputs shall resolve to documented defaults rather than raising | Must | T | TC-UNIT-013 | P3 |
| FR-06.4 | The training-time and inference-time feature code paths shall be the same module, preventing train/serve skew | Must | I,T | TC-UNIT-014 | P3 |
| FR-06.5 | Feature order and dtypes shall be asserted against a stored schema before inference | Must | T | TC-UNIT-015 | P3 |

## 1.6 Risk Scoring Model (FEAT-06)

| ID | Requirement | Pri | Verify | Tests | Phase |
|---|---|:--:|:--:|---|:--:|
| FR-07 | The ML service shall expose a prediction endpoint returning a risk score in [0,1] | Must | T | TC-ML-010 | P3 |
| FR-07.1 | The service shall map the score to a risk level of HIGH, MEDIUM or LOW using configurable thresholds | Must | T | TC-ML-011 | P3 |
| FR-07.2 | The service shall return a confidence label of HIGH, MEDIUM or LOW derived from a documented rule | Must | T | TC-ML-012 | P3 |
| FR-07.3 | The service shall report the model version string `CyberPulse-Demo-v1` on every prediction | Must | T | TC-ML-013 | P3 |
| FR-07.4 | The model artefact shall be loaded once at service startup, not per request | Must | I,A | TC-PERF-006 | P3 |
| FR-07.5 | If the model artefact is missing or unreadable, the service shall fail its health check and return 503 on prediction, never a fabricated score | Must | T | TC-ML-014 | P3 |

## 1.7 Spatial Hotspot Engine (FEAT-07)

| ID | Requirement | Pri | Verify | Tests | Phase |
|---|---|:--:|:--:|---|:--:|
| FR-08 | The system shall generate candidate hotspot cells using H3 indexing at a configurable resolution (default 8) | Must | T | TC-ML-020 | P3 |
| FR-08.1 | The system shall apply DBSCAN to historical withdrawal coordinates to discover density clusters | Must | T | TC-ML-021 | P3 |
| FR-08.2 | The system shall compute a kernel density estimate surface for the risk heatmap | Must | T | TC-ML-022 | P3 |
| FR-08.3 | The system shall rank candidate hotspots by combined score derived from current suspicious activity, historical frequency, recency, linked-account density, withdrawal history, ATM density and temporal match | Must | T | TC-ML-023 | P3 |
| FR-08.4 | The ranked list shall be bounded (default top 5, maximum 20) and each entry shall carry a name, coordinates, score and likely-ATM count | Must | T | TC-ML-024 | P3 |
| FR-08.5 | Hotspot output shall be reproducible for a given complaint and dataset state | Must | T | TC-ML-025 | P3 |
| FR-08.6 | Hotspot values shall never be hard-coded in application code | Must | I | TC-INT-010 | P3 |

## 1.8 Temporal Window Prediction (FEAT-08)

| ID | Requirement | Pri | Verify | Tests | Phase |
|---|---|:--:|:--:|---|:--:|
| FR-09 | The system shall predict an expected withdrawal window as a start and end time | Must | T | TC-ML-030 | P3 |
| FR-09.1 | The window shall be produced from a classifier over 2-hour bins across a 24-hour horizon | Must | T | TC-ML-031 | P3 |
| FR-09.2 | The predicted window shall be at most 4 hours wide | Must | T | TC-ML-032 | P3 |
| FR-09.3 | The UI shall display the explanatory note "Predicted window based on temporal patterns in related transactions and withdrawals." adjacent to the window | Must | I,T | TC-UI-013 | P3 |
| FR-09.4 | Window prediction shall degrade to the highest-probability bin with LOW confidence when temporal signal is weak, rather than omitting the field | Must | T | TC-ML-033 | P3 |

## 1.9 Explainability (FEAT-09)

| ID | Requirement | Pri | Verify | Tests | Phase |
|---|---|:--:|:--:|---|:--:|
| FR-10 | Every prediction response shall include an ordered list of contributing factors | Must | T | TC-ML-040 | P3 |
| FR-10.1 | Factors shall be derived from SHAP values computed against the served model | Must | I,T | TC-ML-041 | P3 |
| FR-10.2 | Raw feature names shall be mapped to officer-readable labels: Transaction Velocity, Historical Hotspot, Linked Account Pattern, ATM Proximity, Time Pattern, Amount / Frequency | Must | T | TC-ML-042 | P3 |
| FR-10.3 | Contributions shall be normalised to percentages summing to 100% ± 0.5 | Must | T | TC-ML-043 | P3 |
| FR-10.4 | Each factor shall carry a direction (increases risk / decreases risk) | Must | T | TC-ML-044 | P3 |
| FR-10.5 | At least five factors shall be returned for every prediction | Must | T | TC-ML-045 | P3 |
| FR-10.6 | Factors shall be persisted to `risk_factors` linked to the prediction | Must | T | TC-API-020 | P3 |

## 1.10 GIS Map (FEAT-10)

| ID | Requirement | Pri | Verify | Tests | Phase |
|---|---|:--:|:--:|---|:--:|
| FR-11 | The system shall render an interactive map of India using MapLibre GL JS | Must | D,T | TC-UI-030 | P4 |
| FR-11.1 | The map shall provide three toggleable layers: Risk Heatmap, Predicted Hotspots, ATM Locations | Must | T | TC-UI-031 | P4 |
| FR-11.2 | The map shall provide zoom, pan and a risk legend with text labels | Must | T | TC-UI-032 | P4 |
| FR-11.3 | The map shall never be a static image | Must | I | TC-UI-033 | P4 |
| FR-12 | Clicking a hotspot marker shall open a detail drawer | Must | T | TC-UI-034 | P4 |
| FR-12.1 | The drawer shall show location, risk score, risk level, expected time window, nearby ATMs, top risk factors and related complaints | Must | T | TC-UI-035 | P4 |
| FR-12.2 | The drawer shall expose a "Generate Alert" action | Must | T | TC-E2E-010 | P5 |
| FR-12.3 | ATM markers shall cluster above a configurable density threshold to preserve performance | Should | A | TC-PERF-003 | P4 |
| FR-12.4 | The map shall expose an equivalent accessible table of the same hotspot data | Must | T | TC-A11Y-010 | P4 |

## 1.11 Alert Engine (FEAT-11)

| ID | Requirement | Pri | Verify | Tests | Phase |
|---|---|:--:|:--:|---|:--:|
| FR-13 | The system shall open an alert composition modal from a prediction or hotspot context | Must | T | TC-UI-040 | P5 |
| FR-13.1 | The modal shall display location, time window, risk score, estimated exposure, top factors and recipients | Must | T | TC-UI-041 | P5 |
| FR-13.2 | Recipients shall be selectable from LEA, Bank and I4C, with at least one required | Must | T | TC-UI-042, TC-API-030 | P5 |
| FR-13.3 | Estimated exposure shall be computed by the documented formula, never entered manually | Must | T | TC-UNIT-020 | P5 |
| FR-14 | Dispatching an alert shall persist it and set status to SENT | Must | T | TC-API-031 | P5 |
| FR-14.1 | A dispatched alert shall appear on the dashboard recent-alerts panel, the alerts page and the related investigation timeline without a manual refresh | Must | T | TC-E2E-011 | P5 |
| FR-14.2 | Alert severity shall be derived from the prediction risk level, not chosen freely | Must | T | TC-UNIT-021 | P5 |
| FR-14.3 | Alert dispatch shall write an audit event capturing actor role, alert ID, prediction ID and timestamp | Must | T | TC-SEC-030 | P5 |
| FR-14.4 | Alert acknowledgement shall be recorded with a timestamp and shall be idempotent | Must | T | TC-API-032 | P5 |
| FR-14.5 | Alert creation shall be rate limited per role | Must | T | TC-SEC-031 | P5 |

## 1.12 Investigation Workflow (FEAT-12)

| ID | Requirement | Pri | Verify | Tests | Phase |
|---|---|:--:|:--:|---|:--:|
| FR-15 | The system shall maintain investigations with statuses New, Analyzing, Under Review, Alert Sent, Monitoring, Resolved | Must | T | TC-API-040 | P5 |
| FR-15.1 | Investigations shall carry a priority of High, Medium or Low | Must | T | TC-API-041 | P5 |
| FR-15.2 | Status transitions shall be validated against a documented state machine; invalid transitions shall return 409 | Must | T | TC-API-042 | P5 |
| FR-15.3 | Investigators shall be able to add timestamped notes attributed to a role | Must | T | TC-API-043 | P5 |
| FR-15.4 | The investigation view shall surface the complaint, money-trail graph, predicted hotspot, risk factors and associated alerts | Must | T | TC-UI-050 | P5 |
| FR-15.5 | Status changes shall write an audit event | Must | T | TC-SEC-032 | P5 |
| FR-15.6 | Dispatching an alert shall automatically create or update an investigation to `Alert Sent` | Must | T | TC-E2E-012 | P5 |

## 1.13 Reports (FEAT-13)

| ID | Requirement | Pri | Verify | Tests | Phase |
|---|---|:--:|:--:|---|:--:|
| FR-16 | The system shall provide reports rendered with Recharts covering complaints over time, suspicious transactions, alert severity, predicted hotspots, top districts and fraud types | Must | T | TC-UI-060 | P6 |
| FR-16.1 | Reports shall support filters for date range, city, state and fraud type, applied server-side | Must | T | TC-API-050 | P6 |
| FR-16.2 | Every chart shall have an accessible table equivalent and text labels independent of colour | Must | T | TC-A11Y-020 | P6 |
| FR-17 | The system shall display prototype model metrics: precision, recall, F1, ROC-AUC, top-1/top-3/top-5 hit rate | Must | T | TC-API-051 | P6 |
| FR-17.1 | The metrics panel shall be titled "PROTOTYPE MODEL EVALUATION" and shall carry a note that values are measured on synthetic data | Must | I | TC-UI-061 | P6 |
| FR-17.2 | Metrics shall be read from `model_metrics`, written by the evaluation pipeline, never hard-coded | Must | I,T | TC-INT-011 | P6 |

## 1.14 Demo Mode (FEAT-14)

| ID | Requirement | Pri | Verify | Tests | Phase |
|---|---|:--:|:--:|---|:--:|
| FR-18 | The system shall provide a `/demo` route presenting a linear, guided six-step flow | Must | D,T | TC-E2E-020 | P7 |
| FR-18.1 | `/demo` shall provide a "Reset Demo" control returning the dataset to a known state | Must | T | TC-E2E-021 | P7 |
| FR-18.2 | Reset shall be idempotent and shall not delete seed data | Must | T | TC-API-060 | P7 |
| FR-18.3 | `/demo` shall pre-warm the ML service on mount | Must | A | TC-PERF-007 | P7 |
| FR-19 | The dashboard shall expose a "RUN DEMO SCENARIO" control | Must | T | TC-UI-070 | P7 |
| FR-19.1 | The control shall load the ten complaints in DEMO_COMPLAINT_IDS, show a processing indication per complaint, call the real prediction API concurrently for all ten, and display results, the money-trail link, the explanation and alert generation independently for each (DEC-012) | Must | T | TC-E2E-022 | P7 |
| FR-19.4 | A single complaint's prediction failure shall degrade only that complaint's rows; the other nine shall complete and the run shall still advance. The run shall freeze only when all ten fail | Must | T | TC-E2E-022 | P7 |
| FR-19.2 | No step of the demo scenario shall use a hard-coded prediction value | Must | I | TC-INT-012 | P7 |
| FR-19.3 | If the ML service is unavailable, the demo shall display an explicit degraded-mode notice rather than fabricated output | Must | T | TC-E2E-023 | P7 |

## 1.15 Roles, Settings, Audit, Health (FEAT-15)

| ID | Requirement | Pri | Verify | Tests | Phase |
|---|---|:--:|:--:|---|:--:|
| FR-20 | The system shall implement roles LEA, BANK, ADMIN, GUARD, I4C and CITIZEN | Must | T | TC-SEC-010 | P3 |
| FR-20.4 | CITIZEN shall hold no officer capability, and only CITIZEN may file or track a citizen report (ADR-022) | Must | T | TC-SAFE-019 | P9 |
| FR-20.3 | GUARD shall be read-only and identity-free — no personal-data column or per-guard identity may exist anywhere the role's data passes through | Must | I,T | TC-SEC-022 | P7 |
| FR-20.1 | Role capability shall be enforced in route handlers, not only hidden in the UI | Must | T | TC-SEC-011 | P3 |
| FR-20.2 | Role switching shall be permitted in the prototype and shall be visibly labelled as a prototype affordance | Must | I | TC-UI-080 | P3 |
| FR-21 | Audit events shall be written for alert dispatch, alert acknowledgement, investigation status change and citizen report submission (FR-28.3) | Must | T | TC-SEC-033, TC-SAFE-014 | P5, P9 |
| FR-22 | Settings shall expose a configurable risk threshold that affects risk-level mapping | Should | T | TC-API-070 | P6 |
| FR-22.1 | Settings shall display system mode (Prototype), data mode (Synthetic / Anonymised), model version and notification preferences | Must | T | TC-UI-081 | P6 |
| FR-23 | `GET /api/health` shall report status of the web app, database and ML service with per-component latency | Must | T | TC-API-080 | P2 |
| FR-25 | Every route shall display the persistent "Sample / Synthetic Prototype Data" badge and the prototype disclaimer | Must | I,T | TC-UI-082 | P3 |

## 1.16 Scam Shield — Citizen Safety (FEAT-17)

Added by DEC-013. The only part of the product addressed to members of the public. Nothing on these routes shows a model output to the citizen.

| ID | Requirement | Pri | Verify | Tests | Phase |
|---|---|:--:|:--:|---|:--:|
| FR-26 | `/safety/check` shall offer six scam scenarios of four yes/no statements each, and show the matched red flags, their reasons and next steps — never a score, percentage or probability | Must | T | TC-SAFE-001, TC-SAFE-002, TC-SAFE-030 | P9 |
| FR-26.1 | Every statement shall name the public advisory it is based on | Must | I,T | TC-SAFE-001 | P9 |
| FR-27 | `/safety/verify` shall check a link (`.bank.in`), a caller number (`1600xx`) and an investment UPI ID (`@valid`) in the browser, making no network request | Must | T | TC-SAFE-003 … TC-SAFE-005, TC-SAFE-031 | P9 |
| FR-28 | `/safety/report` shall direct the citizen to 1930 before any form, and the form shall collect only fraud type, amount and city | Must | T | TC-SAFE-032, TC-SAFE-037 | P9 |
| FR-28.1 | A citizen report shall create a `DEMO`-origin complaint that appears in the officer queue and is analysed through the existing prediction path | Must | T | TC-SAFE-010, TC-SAFE-033 | P9 |
| FR-28.2 | A server-derived field supplied by the client shall be rejected with 400 | Must | T | TC-SAFE-011 | P9 |
| FR-28.3 | The complaint, the citizen report row and the audit event shall commit or roll back together | Must | T | TC-SAFE-010, TC-SAFE-014 | P9 |
| FR-28.4 | Citizen report submission shall be rate limited to 5 per minute per IP; a 429 shall write nothing | Must | T | TC-SAFE-015 | P9 |
| FR-29 | `/safety/status` shall show the stage of a report, given its complaint ID and one-time tracking code, and nothing the prediction produced | Must | T | TC-SAFE-016, TC-SAFE-018, TC-SAFE-032, TC-SAFE-034 | P9 |
| FR-29.1 | A wrong tracking code and an unknown complaint ID shall return byte-identical 404 responses | Must | T | TC-SAFE-017 | P9 |
| FR-29.2 | The tracking code shall be stored only as a SHA-256 hash and shall never travel in a URL | Must | I,T | TC-SAFE-010 | P9 |
| FR-30 | Every `/safety` route shall render in English and Hindi, selected by the `lang` query parameter, and shall carry the report notice fixed string | Must | T | TC-SAFE-007, TC-SAFE-035, TC-SAFE-038 | P9 |
| FR-30.1 | Demo reset shall remove every `DEMO`-origin complaint and every row that depends on it, whatever that row's own origin | Must | T | TC-SAFE-020 | P9 |

---

# 2. NON-FUNCTIONAL REQUIREMENTS

## 2.1 Performance

| ID | Requirement | Target | Verify | Tests |
|---|---|---|:--:|---|
| NFR-01 | Read API latency | p95 ≤ 300 ms at 25-row page size | A | TC-PERF-001 |
| NFR-02 | Prediction latency end-to-end | p95 ≤ 1500 ms warm; ML inference p95 ≤ 400 ms | A | TC-PERF-002 |
| NFR-03 | Dashboard LCP | ≤ 2.5 s | A | TC-PERF-010 |
| NFR-04 | Map interactive, all layers on | ≤ 1.5 s after mount | A | TC-PERF-003 |
| NFR-05 | Graph render at 200 nodes | ≤ 800 ms | A | TC-PERF-004 |
| NFR-19 | Database query p95 for list endpoints | ≤ 150 ms | A | TC-PERF-011 |
| NFR-20 | ML service memory footprint | ≤ 512 MB resident | A | TC-PERF-012 |

## 2.2 Reliability

| ID | Requirement | Verify | Tests |
|---|---|:--:|---|
| NFR-06 | No core route shall present an unhandled error state | T | TC-E2E-030 |
| NFR-07 | ML service failure shall surface a typed error with retry, never a blank screen or fabricated data | T | TC-INT-020 |
| NFR-21 | Database connection loss shall be retried with backoff and surfaced as a degraded health status | T | TC-INT-021 |
| NFR-22 | Prediction requests shall time out at 8 s and return a typed timeout error | T | TC-INT-022 |

## 2.3 Security

| ID | Requirement | Verify | Tests |
|---|---|:--:|---|
| NFR-10 | Every route handler shall validate input with a shared Zod schema | I,T | TC-SEC-001 |
| NFR-11 | All database access shall be parameterised through Drizzle | I | TC-SEC-002 |
| NFR-12 | No secret shall be present in any client bundle | T | TC-SEC-003 |
| NFR-13 | Error responses shall not disclose stack traces, SQL or internal paths | T | TC-SEC-004 |
| NFR-23 | Rate limits shall apply to `/api/predict` and `/api/alerts` | T | TC-SEC-031 |
| NFR-24 | CI shall fail on high or critical dependency vulnerabilities | T | TC-SEC-040 |
| NFR-25 | Object access shall be authorisation-checked, preventing IDOR across roles | T | TC-SEC-012 |

## 2.4 Accessibility

| ID | Requirement | Verify | Tests |
|---|---|:--:|---|
| NFR-08 | Core flows shall meet WCAG 2.1 AA | T | TC-A11Y-001 |
| NFR-09 | All primary actions shall be keyboard operable with visible focus | T | TC-A11Y-002 |
| AR-02 | Risk shall be conveyed by text and icon, never colour alone | I,T | TC-A11Y-003 |
| AR-04 | Map and graph shall have accessible table equivalents | T | TC-A11Y-010, TC-A11Y-011 |
| AR-05 | Prediction completion and alert dispatch shall be announced via live regions | T | TC-A11Y-004 |

## 2.5 Data and Integrity

| ID | Requirement | Verify | Tests |
|---|---|:--:|---|
| NFR-14 | Identical seed shall yield identical dataset | T | TC-DATA-002 |
| NFR-15 | The UI shall render only values derived from API responses | I,T | TC-INT-010, TC-INT-011, TC-INT-012 |
| NFR-26 | A prediction persisted to the database shall be byte-consistent with the response returned to the client | T | TC-INT-013 |
| NFR-27 | All monetary values shall be stored in integer paise and formatted at the edge | I,T | TC-UNIT-030 |
| NFR-28 | All timestamps shall be stored in UTC and rendered in IST | I,T | TC-UNIT-031 |

## 2.6 Maintainability and Operability

| ID | Requirement | Verify | Tests |
|---|---|:--:|---|
| NFR-16 | Feature engineering and prediction contract modules shall have ≥ 85% line coverage | A | TC-UNIT-040 |
| NFR-17 | Clean-clone to first prediction shall take ≤ 30 minutes | D | TC-DOC-001 |
| NFR-29 | No React component shall contain SQL or direct database access | I | TC-INT-030 |
| NFR-30 | Each API route handler shall delegate to a named service module | I | TC-INT-031 |
| NFR-18 | The application shall function on the latest two versions of Chrome and Edge | T | TC-E2E-040 |

---

# 3. CONSTRAINT REQUIREMENTS

| ID | Requirement | Source |
|---|---|---|
| CR-01 | All data shall be synthetic; no real personal or financial data may enter the system | CON-01, SR-04 |
| CR-02 | No UI text, documentation or artefact shall claim official endorsement, real-data access, guaranteed prevention or guaranteed recovery | CON-07, BR-05 |
| CR-03 | Terminology shall be limited to "Mule Account", "Suspicious Account" and "Risk Indicator" for account risk language | CON-07 |
| CR-04 | The system shall not render an accusation about any individual | CON-07, NG-03 |
| CR-05 | Primary layout shall target 1920×1080 and remain usable to 1280×720 | CON-08 |
| CR-06 | The stack shall run locally via Docker Compose without a managed-service dependency | CON-04 |

---

# 4. REQUIREMENT COVERAGE SUMMARY

| Category | Count | Must | Should | Could |
|---|:--:|:--:|:--:|:--:|
| Functional (incl. sub-requirements) | 96 | 90 | 6 | 0 |
| Non-functional | 30 | 30 | 0 | 0 |
| Constraint | 6 | 6 | 0 | 0 |
| **Total** | **132** | **126** | **6** | **0** |

Full requirement → feature → story → acceptance criteria → test case → phase traceability is maintained in `MASTER_TEST_PLAN.md` §6 and audited in `implementation/documentation-audit.md`.
