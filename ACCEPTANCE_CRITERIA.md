# ACCEPTANCE CRITERIA — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Format | Given / When / Then — every criterion is objectively testable |
| Traces from | `USER_STORIES.md`, `REQUIREMENTS.md` |
| Traces to | `test-cases/`, `implementation/phase-test-matrix.md` |

**Rule applied throughout:** no criterion uses "works properly", "good performance", "user-friendly", "fast", "intuitive" or any other unmeasurable phrase. Where a judgement is required, it is converted to a threshold, a count, a state, or an exact string.

Standard preconditions, referenced as **[STD]**:
- The database is migrated and seeded with the deterministic dataset (seed `26184`).
- The ML service is running, healthy, and has model `CyberPulse-Demo-v1` loaded.
- The active role is LEA unless stated otherwise.

---

## FEAT-16 — Synthetic Data Generation

**AC-016-01 — Deterministic generation**
- **Given** a clean output directory and seed `26184`
- **When** `npm run generate:data` completes
- **Then** the output directory contains `complaints.csv`, `accounts.csv`, `transactions.csv`, `withdrawals.csv`, `atms.csv` and `manifest.json`
- **And** `manifest.json` records the seed, generator version, row counts and a SHA-256 for each file.

**AC-016-02 — Reproducibility**
- **Given** a dataset already generated with seed `26184`
- **When** generation is re-run with seed `26184` into a second directory
- **Then** every file's SHA-256 is identical to the corresponding first-run file.

**AC-016-03 — Volume floors**
- **Given** default generator parameters
- **When** generation completes
- **Then** row counts are ≥ 500 complaints, ≥ 10,000 accounts, ≥ 50,000 transactions, ≥ 2,000 withdrawals and ≥ 500 ATMs
- **And** exactly six distinct fraud types are present: UPI Fraud, Investment Scam, Phishing, Job Scam, QR Fraud, Card Fraud
- **And** at least seven distinct metro regions are represented.

**AC-016-04 — Learnable signal**
- **Given** a generated dataset
- **When** `scripts/evaluation/signal_check.py` runs
- **Then** each of the eight planted patterns reports a test statistic exceeding its documented threshold
- **And** the script exits non-zero if any pattern fails, blocking the training step.

**AC-016-05 — Layered chains**
- **Given** a generated dataset
- **When** chains are traced from each complaint
- **Then** at least 90% of complaints resolve to a victim → account → … → withdrawal chain of depth between 2 and 4 inclusive.

**AC-016-06 — No personal data**
- **Given** all generated files
- **When** the PII scanner in `scripts/evaluation/pii_scan.py` runs
- **Then** zero matches are reported for name patterns, Aadhaar-shaped 12-digit sequences, PAN-shaped patterns, 10-digit Indian mobile patterns and email addresses
- **And** all account identifiers match the synthetic format `ACC-[0-9]{8}`.

---

## FEAT-01 — Complaint Registry

**AC-001-01 — Paginated list**
- **Given** [STD]
- **When** the officer opens `/complaints`
- **Then** exactly 25 complaint rows render
- **And** the response body includes `page`, `pageSize`, `total` and `totalPages`.

**AC-001-02 — Page size bounds**
- **Given** [STD]
- **When** `GET /api/complaints?pageSize=500` is requested
- **Then** the response status is 400
- **And** the body is `{ "error": { "code": "VALIDATION_ERROR", "field": "pageSize" } }` with no stack trace.

**AC-001-03 — Search**
- **Given** [STD] and a complaint with ID `C-10284` in city Noida
- **When** the officer types `10284` in the search box
- **Then** the result set contains `C-10284`
- **And** every returned row matches the term in either complaint ID or city.

**AC-001-04 — Filters**
- **Given** [STD]
- **When** the officer applies fraud type = `UPI Fraud` and state = `Uttar Pradesh`
- **Then** every returned row has `fraudType = "UPI Fraud"` and `state = "Uttar Pradesh"`
- **And** the active filter count badge reads `2`.

**AC-001-05 — Sorting**
- **Given** [STD]
- **When** the supervisor sorts by amount descending
- **Then** for every adjacent row pair, `row[n].amount >= row[n+1].amount`.

---

## FEAT-02 — Complaint Detail

**AC-002-01 — Summary block**
- **Given** [STD]
- **When** `/complaints/C-10284` is opened
- **Then** the page displays complaint ID, fraud type, amount formatted as `₹3,80,000`, complaint timestamp in IST, victim city, district, state and status.

**AC-002-02 — Transaction timeline**
- **Given** [STD]
- **When** the complaint detail loads
- **Then** the timeline lists every transaction linked to the complaint in ascending timestamp order
- **And** each entry shows counterparty account IDs, amount, channel and a risk indicator label.

**AC-002-03 — Linked accounts**
- **Given** [STD]
- **When** the complaint detail loads
- **Then** the linked-accounts panel lists each account with account ID, account type, risk score to two decimal places and status.

**AC-002-04 — Analyze triggers real inference**
- **Given** [STD]
- **When** the officer clicks "Analyze Complaint"
- **Then** exactly one `POST /api/predict` request is issued with the complaint ID
- **And** a loading state is displayed until the response resolves
- **And** the rendered risk percentage equals `round(response.riskScore * 100)`.

**AC-002-05 — Prediction rendering**
- **Given** a successful prediction response
- **When** rendering completes
- **Then** the page shows risk score, risk level, confidence, predicted hotspot name and coordinates, expected window, likely ATM count, estimated exposure, and at least five named factors
- **And** the displayed model version string is `CyberPulse-Demo-v1`.

**AC-002-06 — Unknown complaint**
- **Given** [STD]
- **When** `/complaints/C-99999` is opened
- **Then** the API returns 404 with `{ "error": { "code": "NOT_FOUND" } }`
- **And** the UI renders a not-found state with a link back to `/complaints`
- **And** no unhandled error boundary is triggered.

---

## FEAT-03 — Transactions

**AC-003-01 — Ledger list**
- **Given** [STD]
- **When** `/transactions` is opened
- **Then** 25 rows render with transaction ID, from account, to account, amount, channel, timestamp and risk indicator.

**AC-003-02 — Ledger filters**
- **Given** [STD]
- **When** channel = `ATM` and `minAmount=50000` are applied
- **Then** every returned row satisfies both conditions
- **And** an empty result renders the empty state, not a blank table.

**AC-003-03 — Transaction detail**
- **Given** [STD] and a valid transaction ID
- **When** the detail route is opened
- **Then** both counterparties, amount, channel, timestamp, latitude, longitude and risk indicator are displayed.

**AC-003-04 — Simulated stream**
- **Given** [STD]
- **When** the simulation is started
- **Then** new events append to the stream panel at the configured interval
- **And** rows are written only to `simulation_events`
- **And** pausing halts appends within one interval, and reset clears the panel and the table.

---

## FEAT-04 — Money-Trail Network Graph

**AC-004-01 — Graph renders**
- **Given** [STD] and complaint `C-10284`
- **When** the money-trail graph is opened
- **Then** a directed graph renders containing at least one Victim node, at least two Mule Account nodes and at least one ATM node.

**AC-004-02 — Edge semantics**
- **Given** a rendered graph
- **When** edges are inspected
- **Then** every edge has a visible direction marker and a label showing the transferred amount formatted in rupees.

**AC-004-03 — Victim node detail**
- **Given** a rendered graph
- **When** the Victim node is clicked
- **Then** a panel displays the linked complaint ID and the complaint amount.

**AC-004-04 — Mule account node detail**
- **Given** a rendered graph
- **When** a Mule Account node is clicked
- **Then** a panel displays account ID, risk score, transaction count and linked-account count
- **And** the panel contains no personal name field.

**AC-004-05 — ATM node detail**
- **Given** a rendered graph
- **When** an ATM node is clicked
- **Then** a panel displays ATM ID, bank name, city, and a list of prior withdrawals with amount and timestamp.

**AC-004-06 — Bounded traversal**
- **Given** [STD]
- **When** `GET /api/transactions/network/:id?depth=10` is requested
- **Then** the response status is 400 with `code = "VALIDATION_ERROR"` and field `depth`
- **And** a request with `depth=4` returns within 300 ms p95.

---

## FEAT-05 — Feature Engineering

**AC-005-01 — Complete feature vector**
- **Given** a complaint and a candidate hotspot cell
- **When** the feature builder runs
- **Then** the returned vector contains exactly the 13 documented features in the documented order with the documented dtypes.

**AC-005-02 — Determinism**
- **Given** identical inputs
- **When** the feature builder runs twice
- **Then** the two vectors are element-wise equal.

**AC-005-03 — Missing input handling**
- **Given** a complaint with no prior withdrawals for its linked accounts
- **When** the feature builder runs
- **Then** `withdrawal_count` resolves to `0`, `historical_hotspot_score` resolves to the documented global prior, and no exception is raised.

---

## FEAT-06 — Risk Scoring Model

**AC-006-01 — Score range and shape**
- **Given** [STD]
- **When** `POST /api/predict` succeeds
- **Then** `riskScore` is a number in `[0, 1]`
- **And** `riskLevel` is one of `HIGH`, `MEDIUM`, `LOW`.

**AC-006-02 — Threshold mapping**
- **Given** default thresholds of 0.70 and 0.40
- **When** `riskScore = 0.917`
- **Then** `riskLevel = "HIGH"`
- **And** when `riskScore = 0.55`, `riskLevel = "MEDIUM"`
- **And** when `riskScore = 0.22`, `riskLevel = "LOW"`.

**AC-006-03 — Confidence**
- **Given** a prediction
- **When** the response is inspected
- **Then** `confidence` is one of `HIGH`, `MEDIUM`, `LOW`, derived from the documented margin rule between the top-1 and top-2 hotspot scores.

**AC-006-04 — No fabrication on failure**
- **Given** the model artefact has been removed from the ML service
- **When** the service starts and `/health` is called
- **Then** `/health` reports `status = "unhealthy"` with `model.loaded = false`
- **And** `POST /predict` returns 503
- **And** the web UI shows a degraded-mode message containing no numeric prediction.

---

## FEAT-07 — Spatial Hotspot Engine

**AC-007-01 — Ranked output**
- **Given** [STD]
- **When** a prediction is requested for `C-10284`
- **Then** the response contains a `rankedHotspots` array of length ≥ 3 and ≤ 20
- **And** each entry has `name`, `lat`, `lon`, `h3Index`, `score` in `[0,1]` and `likelyAtms` as a non-negative integer
- **And** scores are in non-increasing order.

**AC-007-02 — Reproducibility**
- **Given** an unchanged dataset
- **When** the same complaint is predicted twice
- **Then** the ranked hotspot list is identical in order and in score to six decimal places.

**AC-007-03 — No hard-coded geography**
- **Given** the repository source
- **When** `scripts/evaluation/no_hardcode_check.sh` runs
- **Then** it reports zero occurrences of a hotspot name or numeric risk value literal in `apps/web` outside test fixtures and i18n label maps.

---

## FEAT-08 — Temporal Window Prediction

**AC-008-01 — Window returned**
- **Given** a successful prediction
- **When** the response is inspected
- **Then** `expectedWindow.start` and `expectedWindow.end` are present as ISO-8601 UTC timestamps
- **And** the UI renders them in IST as `HH:mm–HH:mm`.

**AC-008-02 — Bounded width**
- **Given** any prediction
- **When** the window is measured
- **Then** `end - start` is greater than 0 and less than or equal to 4 hours.

**AC-008-03 — Explanatory note present**
- **Given** the window is displayed
- **When** the surrounding UI is inspected
- **Then** the exact string "Predicted window based on temporal patterns in related transactions and withdrawals." is present and programmatically associated with the window element.

---

## FEAT-09 — Explainability

**AC-009-01 — Factor list present**
- **Given** a successful prediction
- **When** the response is inspected
- **Then** `factors` contains at least five entries
- **And** each entry has `name`, `contribution` and `direction`.

**AC-009-02 — Normalisation**
- **Given** a factors array
- **When** contributions are summed
- **Then** the sum is within 0.5 percentage points of 100.

**AC-009-03 — Readable names**
- **Given** a factors array
- **When** names are inspected
- **Then** every name is drawn from the approved label set: Transaction Velocity, Historical Hotspot, Linked Account Pattern, ATM Proximity, Time Pattern, Amount / Frequency, Account Age, Recency, Withdrawal History
- **And** no raw feature identifier such as `txn_velocity_1h` appears in the UI.

**AC-009-04 — Direction shown**
- **Given** the factor panel
- **When** rendered
- **Then** each factor shows a direction as text ("increases risk" / "reduces risk") in addition to any colour or arrow.

**AC-009-05 — Supervisor review path**
- **Given** a HIGH-risk prediction
- **When** the supervisor opens the investigation view
- **Then** the factor breakdown and the money-trail graph are both reachable without leaving the investigation route.

---

## FEAT-10 — GIS Map

**AC-010-01 — Interactive map**
- **Given** [STD]
- **When** `/risk-map` is opened
- **Then** a MapLibre canvas is present in the DOM
- **And** zoom-in, zoom-out and pan each change the reported map centre or zoom level
- **And** no `<img>` element is used as the map surface.

**AC-010-02 — Layers and legend**
- **Given** the map is loaded
- **When** layer toggles are inspected
- **Then** three toggles exist labelled Risk Heatmap, Predicted Hotspots and ATM Locations
- **And** toggling each changes the count of rendered layer features
- **And** a legend shows HIGH, MEDIUM and LOW with both a colour swatch and a text label.

**AC-010-03 — Hotspot drawer opens**
- **Given** the Predicted Hotspots layer is on
- **When** a hotspot marker is clicked
- **Then** a side drawer opens within 300 ms.

**AC-010-04 — Drawer contents**
- **Given** an open hotspot drawer
- **When** contents are inspected
- **Then** it displays location name, risk score as a percentage, risk level as text, expected time window, nearby ATM count and list, top risk factors, and related complaint IDs.

**AC-010-05 — Generate Alert from drawer**
- **Given** an open hotspot drawer
- **When** "Generate Alert" is clicked
- **Then** the alert modal opens pre-filled with that hotspot's location, window, risk score and factors.

**AC-010-06 — Accessible equivalent**
- **Given** `/risk-map`
- **When** the accessible table toggle is activated
- **Then** a `<table>` renders the same hotspots with name, risk level text, score and window
- **And** axe-core reports zero critical violations on the route.

---

## FEAT-11 — Alert Engine

**AC-011-01 — Modal opens pre-filled**
- **Given** a HIGH-risk prediction is displayed
- **When** "Generate Alert" is clicked
- **Then** a modal titled "HIGH-RISK WITHDRAWAL ALERT" opens
- **And** location, time window, risk score, estimated exposure and top factors are pre-populated from the prediction response, with no editable score field.

**AC-011-02 — Exposure is computed**
- **Given** the alert modal
- **When** estimated exposure is inspected
- **Then** its value equals the documented formula applied to the related complaints, and the field is read-only.

**AC-011-03 — Recipient selection**
- **Given** the alert modal
- **When** all recipients are deselected
- **Then** "Send Alert" is disabled and a validation message reads "Select at least one recipient"
- **And** `POST /api/alerts` with an empty recipients array returns 400.

**AC-011-04 — Dispatch persists**
- **Given** at least one recipient selected
- **When** "Send Alert" is clicked
- **Then** `POST /api/alerts` returns 201 with an `alertId`
- **And** a row exists in `alerts` with `status = "SENT"` and a non-null `created_at`
- **And** a success toast is displayed.

**AC-011-05 — Propagation**
- **Given** an alert has just been dispatched
- **When** the dashboard, `/alerts` and the related investigation timeline are viewed
- **Then** the new alert appears in all three within one data-refresh cycle without a full page reload.

**AC-011-06 — Acknowledgement**
- **Given** an alert in `SENT` status and the BANK role active
- **When** `PATCH /api/alerts/:id` sets status `ACKNOWLEDGED`
- **Then** the response is 200, `acknowledged_at` is set
- **And** repeating the same request returns 200 without changing `acknowledged_at`.

**AC-011-07 — Audit event**
- **Given** an alert dispatch and an acknowledgement
- **When** the audit store is queried
- **Then** one event exists per action recording actor role, action type, alert ID, prediction ID and UTC timestamp.

**AC-011-08 — Rate limit**
- **Given** the configured limit of 10 alert creations per minute per role
- **When** an 11th request is made within the window
- **Then** the response is 429 with a `Retry-After` header and no alert row is written.

---

## FEAT-12 — Investigation Workflow

**AC-012-01 — Lifecycle states**
- **Given** an investigation exists
- **When** its status field is inspected
- **Then** the value is one of New, Analyzing, Under Review, Alert Sent, Monitoring, Resolved.

**AC-012-02 — Transition validation**
- **Given** an investigation in `New`
- **When** a transition directly to `Resolved` is attempted
- **Then** the response is 409 with `code = "INVALID_TRANSITION"` and the current status is unchanged
- **And** a transition to `Analyzing` returns 200.

**AC-012-03 — Priority**
- **Given** an investigation
- **When** created or updated
- **Then** `priority` is one of High, Medium, Low and is rendered as a text badge, not colour alone.

**AC-012-04 — Notes**
- **Given** an open investigation
- **When** a note is submitted
- **Then** it is persisted with author role and UTC timestamp and appears in the timeline in reverse-chronological order
- **And** an empty note body is rejected with 400.

**AC-012-05 — Consolidated view**
- **Given** an investigation linked to a complaint with a prediction and an alert
- **When** the investigation route is opened
- **Then** the complaint summary, money-trail graph, predicted hotspot, risk factors and all associated alerts are present on the same route.

**AC-012-06 — Auto-progression**
- **Given** an investigation in `Under Review`
- **When** an alert for its complaint is dispatched
- **Then** the investigation status becomes `Alert Sent` and an audit event records the automatic transition.

---

## FEAT-13 — Reports and Model Metrics

**AC-013-01 — Chart set**
- **Given** [STD]
- **When** `/reports` is opened
- **Then** six charts render: complaints over time, suspicious transactions, alert severity, predicted hotspots, top districts, fraud types
- **And** each chart renders from API data with no client-side literal series.

**AC-013-02 — Filters applied server-side**
- **Given** `/reports`
- **When** a date range and state filter are applied
- **Then** a new request is issued containing those parameters
- **And** all charts update from the new response
- **And** an empty result renders an empty state per chart, not a blank panel.

**AC-013-03 — Metrics published**
- **Given** the evaluation pipeline has written to `model_metrics`
- **When** `/reports` is opened
- **Then** precision, recall, F1, ROC-AUC, top-1, top-3 and top-5 hit rates are displayed to three decimal places
- **And** each equals the corresponding stored value.

**AC-013-04 — Correct framing**
- **Given** the metrics panel
- **When** its heading and caption are inspected
- **Then** the heading is exactly "PROTOTYPE MODEL EVALUATION"
- **And** a caption states the metrics were measured on a held-out split of synthetic data and do not represent operational performance.

---

## FEAT-14 — Demo Mode

**AC-014-01 — One-click scenario**
- **Given** [STD] and the dashboard open
- **When** "RUN DEMO SCENARIO" is clicked
- **Then** complaint `C-10284` loads, a processing indication is shown, exactly one real `POST /api/predict` is issued, and the prediction, map highlight, explanation and money-trail graph are all displayed
- **And** the whole sequence completes within 15 seconds on the target machine.

**AC-014-02 — No hard-coded demo values**
- **Given** the demo scenario has run
- **When** the displayed risk percentage is compared to the network response
- **Then** it equals `round(response.riskScore * 100)` for that specific response, and differs if the API is made to return a different score.

**AC-014-03 — Guided flow**
- **Given** `/demo`
- **When** the flow is stepped through
- **Then** exactly six steps are presented in order: complaint, money-trail graph, AI analysis, hotspot prediction, explanation, alert
- **And** each step has a visible step indicator and a forward control.

**AC-014-04 — Reset**
- **Given** a demo run has generated alerts and investigations
- **When** "Reset Demo" is clicked and confirmed
- **Then** demo-generated alerts and investigations are cleared
- **And** seed complaints, accounts, transactions, withdrawals and ATMs remain unchanged in count
- **And** running reset twice produces the same final state.

**AC-014-05 — Honest degradation**
- **Given** the ML service is stopped
- **When** the demo scenario is run
- **Then** a notice is displayed containing the words "prediction service unavailable"
- **And** no risk score, hotspot ranking or time window is rendered.

---

## FEAT-15 — Roles, Settings, Trust, Health

**AC-015-01 — Role-scoped UI**
- **Given** the BANK role is active
- **When** the navigation is inspected
- **Then** investigation-management actions reserved for LEA are not presented.

**AC-015-02 — Server-side enforcement**
- **Given** the BANK role is active
- **When** a direct `POST /api/investigations` request is issued
- **Then** the response is 403 with `code = "FORBIDDEN"` and no row is created
- **And** the same request under the LEA role returns 201.

**AC-015-03 — Threshold configuration**
- **Given** the ADMIN role and a HIGH threshold of 0.70
- **When** the threshold is changed to 0.85 and a complaint scoring 0.80 is re-rendered
- **Then** its risk level displays as MEDIUM
- **And** the stored `riskScore` is unchanged.

**AC-015-04 — Persistent prototype indicator**
- **Given** any route in the application
- **When** the page is rendered
- **Then** a badge reading "Sample / Synthetic Prototype Data" is visible in the header.

**AC-015-05 — Disclaimer text**
- **Given** any route
- **When** the disclaimer region is inspected
- **Then** it contains the exact sentence: "Prototype uses synthetic/anonymized demonstration data. Predictions are experimental and intended for research/proof-of-concept use."

**AC-015-06 — Health reporting**
- **Given** the stack is running
- **When** `GET /api/health` is called
- **Then** the response is 200 with `web`, `database` and `mlService` each reporting `status` and `latencyMs`
- **And** stopping the ML service changes `mlService.status` to `down` and the overall status to `degraded` within one poll interval.

---

## Global Acceptance Criteria

**AC-GLOBAL-01 — Model / frontend consistency**
- **Given** any screen displaying a prediction-derived value
- **When** the value is compared with the API response that produced it
- **Then** they agree exactly after documented formatting (percentage rounding, currency formatting, IST conversion).

**AC-GLOBAL-02 — No prohibited claims**
- **Given** all rendered UI text and all documentation
- **When** scanned for the phrases "official", "endorsed by", "real-time bank data", "guaranteed recovery", "prevents fraud"
- **Then** zero matches occur outside explicit negative statements in the responsible-use notice.

**AC-GLOBAL-03 — Neutral terminology**
- **Given** all rendered UI text
- **When** scanned for accusatory terms applied to individuals
- **Then** account risk language is limited to "Mule Account", "Suspicious Account" and "Risk Indicator".

**AC-GLOBAL-04 — Error hygiene**
- **Given** any API error response
- **When** the body is inspected
- **Then** it matches the typed error envelope and contains no stack trace, SQL fragment, file path or dependency version.

**AC-GLOBAL-05 — Colour independence**
- **Given** any risk indication in the UI
- **When** rendered in greyscale
- **Then** the risk level remains determinable from text or iconography alone.
