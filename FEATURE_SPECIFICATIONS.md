# FEATURE SPECIFICATIONS — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Features | FEAT-01 … FEAT-16 |
| Traces from | `REQUIREMENTS.md`, `USER_STORIES.md` |
| Traces to | `ACCEPTANCE_CRITERIA.md`, `architecture/api-design.md`, `test-cases/` |

Every feature below is specified with the same fourteen sections so that an implementer never has to guess where a decision was recorded.

Roles referenced: **LEA** (law enforcement), **BANK** (bank nodal officer), **ADMIN** (platform administrator).

---

# FEAT-01 — Complaint Registry

**Name:** Complaint registry and queue
**Description:** A searchable, filterable, sortable, server-paginated table of all registered complaints, acting as the primary entry point for an investigating officer.

**User problem.** An officer holding 15–40 live complaints cannot find the one a caller is asking about, and cannot tell which of them deserves attention first.

**Business value.** Reduces time-to-case-location to seconds and makes triage by exposure and risk possible, directly supporting G-01 and BR-02.

**User flow.**
1. Officer lands on `/complaints`.
2. Table renders page 1 (25 rows) with skeletons during fetch.
3. Officer optionally types a search term, applies filters, or changes sort.
4. Each change issues a new server request and resets to page 1.
5. Officer clicks a row and navigates to `/complaints/[id]`.

**UI behaviour.** Sticky table header; column set is complaint ID, fraud type, amount, complaint time (IST), city, state, status, risk level. Risk level renders as a text badge plus icon. Filter chips appear above the table with an active-filter count and a "Clear all" control. Loading uses row skeletons, never a spinner over stale data. Empty state reads "No complaints match these filters" with a clear-filters action. Error state offers retry. Pagination shows page, total pages and total rows.

**API behaviour.** `GET /api/complaints` with query parameters `page`, `pageSize`, `q`, `fraudType`, `status`, `riskLevel`, `from`, `to`, `city`, `state`, `sort`, `order`. Validated by a shared Zod schema. Returns `{ data: Complaint[], page, pageSize, total, totalPages }`. `pageSize` default 25, max 100.

**Database requirements.** Reads `complaints` joined to the latest `predictions` row for risk level. Indexes required on `complaint_timestamp`, `fraud_type`, `status`, `state`, `city`, and a composite on `(state, fraud_type, complaint_timestamp)`.

**Edge cases.** Zero results; single result; filter combination that is logically empty; page beyond `totalPages` (returns empty `data` with correct metadata, not 404); search term containing SQL metacharacters (parameterised, returns literal match); complaint with no prediction yet (risk level renders "Not analysed").

**Failure scenarios.** Database unreachable → 503 with typed envelope, UI shows retryable error. Query timeout → 504, UI shows retry. Malformed query parameter → 400 naming the offending field.

**Permissions.** LEA: full read. BANK: read restricted to complaints with at least one alert addressed to BANK. ADMIN: full read.

**Security requirements.** All parameters validated; no dynamic SQL; sort column allow-listed against an enum so ordering cannot be injected; BANK scoping enforced in the service layer, not the UI.

**Analytics events.** `complaints_list_viewed`, `complaints_filter_applied`, `complaints_search_performed`, `complaint_row_opened`.

**Acceptance criteria.** AC-001-01 … AC-001-05
**Test cases.** TC-API-001 … TC-API-005, TC-UI-001, TC-UI-002, TC-SEC-013

---

# FEAT-02 — Complaint Detail and Analysis

**Name:** Complaint detail with on-demand prediction
**Description:** The case view. Presents the complaint summary, its transaction timeline, its linked accounts, and — on demand — the full prediction with hotspot, window and explanation.

**User problem.** Case context is spread across systems, and no system produces a forecast.

**Business value.** This is the screen where the product's core promise is delivered; it is the anchor of the judge demo.

**User flow.**
1. Officer opens `/complaints/C-10284`.
2. Summary, timeline and linked accounts render from a single server request.
3. Officer clicks "Analyze Complaint".
4. A processing state appears; `POST /api/predict` executes.
5. Prediction, ranked hotspots, expected window and factors render.
6. Officer optionally opens the money-trail graph or generates an alert.

**UI behaviour.** Two-column layout at ≥ 1440 px, stacked below. Left: summary, timeline, linked accounts. Right: prediction panel (empty state before analysis, skeleton during, results after). The "Analyze Complaint" button is primary and disabled while in flight. Results announce via an ARIA live region. Risk displayed as a percentage plus a text level. Factors render as a horizontal bar list with name, percentage and direction text.

**API behaviour.** `GET /api/complaints/:id` returns complaint, transactions, linked accounts and the most recent prediction if one exists. `POST /api/predict` takes `{ complaintId }`, calls the ML service, persists the prediction and its factors, and returns the full prediction object.

**Database requirements.** Reads `complaints`, `transactions`, `accounts`. Writes `predictions` and `risk_factors`. Foreign keys enforced; prediction rows carry `model_version`.

**Edge cases.** Complaint with no transactions (prediction proceeds with documented defaults and returns LOW confidence); complaint already analysed (previous prediction shown with its timestamp and a "Re-analyse" action); repeated rapid clicks (request de-duplicated; button disabled in flight).

**Failure scenarios.** ML service down → 503 surfaced as degraded-mode panel with retry, no numbers rendered. ML timeout at 8 s → typed timeout error and retry. Persist failure after a successful inference → transaction rolled back, error surfaced; no partial prediction without factors.

**Permissions.** LEA and ADMIN may analyse. BANK may view a complaint reachable through its alerts but may not trigger analysis.

**Security requirements.** `complaintId` validated against the `C-[0-9]{5}` pattern; role checked server-side; rate limit on `/api/predict`.

**Analytics events.** `complaint_detail_viewed`, `complaint_analyze_clicked`, `prediction_returned`, `prediction_failed`, `explanation_expanded`.

**Acceptance criteria.** AC-002-01 … AC-002-06
**Test cases.** TC-UI-003 … TC-UI-006, TC-E2E-001, TC-E2E-002, TC-API-006, TC-API-007, TC-INT-020

---

# FEAT-03 — Transaction Ledger, Trace and Simulation

**Name:** Transaction intelligence
**Description:** Browsing, filtering and tracing of transactions, plus an in-app simulated event stream that conveys the real-time character of the problem.

**User problem.** Officers need to isolate the specific movements that matter and cite them precisely.

**Business value.** Provides the evidentiary substrate beneath the graph and the model; makes the demo feel live.

**User flow.** Officer opens `/transactions`, filters by channel/amount/date/risk indicator, opens `/transactions/[id]` for detail, and from there opens the network view. Separately, a simulation panel can be started, paused and reset.

**UI behaviour.** Virtualised table for large result sets. Risk indicator as text badge. Detail view shows both counterparties as links to their account context, amount, channel, timestamp, coordinates and a small map inset. Simulation panel appends rows with a subtle enter animation, capped at 50 visible rows.

**API behaviour.** `GET /api/transactions`, `GET /api/transactions/:id`, `GET /api/transactions/network/:id?depth=`, `POST /api/simulation/{start|pause|reset}`, `GET /api/simulation/events`.

**Database requirements.** Reads `transactions`, `accounts`, `atms`. Writes only `simulation_events` during simulation. Indexes on `timestamp`, `from_account_id`, `to_account_id`, `risk_indicator`, and a composite on `(from_account_id, timestamp)`.

**Edge cases.** Self-referencing transaction (rejected at generation, defended at read); cyclic account chains (traversal maintains a visited set); depth request above maximum (400); simulation started twice (idempotent).

**Failure scenarios.** Simulation interval drift → events carry server timestamps, not client. Network endpoint hitting the node cap → returns `truncated: true` and the UI shows a "graph truncated at N nodes" notice.

**Permissions.** LEA, ADMIN full. BANK read-only and scoped.

**Security requirements.** Depth and limit bounds enforced server-side; visited-set traversal prevents an unbounded query; simulation endpoints restricted to ADMIN and the demo route.

**Analytics events.** `transactions_list_viewed`, `transaction_detail_viewed`, `network_view_opened`, `simulation_started`, `simulation_reset`.

**Acceptance criteria.** AC-003-01 … AC-003-04
**Test cases.** TC-API-008 … TC-API-013, TC-UI-020, TC-PERF-005

---

# FEAT-04 — Money-Trail Network Graph

**Name:** Money-trail reconstruction
**Description:** A directed, interactive React Flow graph of the layering chain — Victim → Mule Account → Mule Account → ATM — with clickable nodes.

**User problem.** A bank statement is a list; the fraud is a graph. The structure is where the intelligence is.

**Business value.** Makes the model's inference auditable and is the most visually persuasive element of the demonstration.

**User flow.** Officer opens the graph from a complaint, transaction or investigation. The graph auto-lays out. Clicking any node opens a detail panel. The officer can zoom, pan and fit-to-view.

**UI behaviour.** Three custom node types with distinct shape, icon and text label — never colour alone. Directed edges with arrow markers and rupee-formatted amount labels. Layout is deterministic (layered, left-to-right) so the same complaint always renders identically. Controls for zoom, fit and re-layout. Legend explaining node types in text. Fallback: if node count exceeds 200, the graph renders the top-weighted subgraph and displays a truncation notice.

**API behaviour.** `GET /api/transactions/network/:id?depth=4` returns `{ nodes, edges, truncated }` with typed node payloads per node type.

**Database requirements.** Recursive traversal over `transactions` and `withdrawals`, joined to `accounts` and `atms`. Implemented as a bounded recursive CTE with a depth column and a visited guard.

**Edge cases.** Single-hop chain; chain terminating without a withdrawal (renders an open terminal node labelled "No withdrawal observed"); account appearing in multiple chains (rendered once, with degree reflected in its detail panel); disconnected complaint (renders victim node with an explanatory empty state).

**Failure scenarios.** Traversal exceeding the time budget → returns partial graph with `truncated: true` rather than timing out. Malformed node payload → the node renders in an error state; the rest of the graph still renders.

**Permissions.** LEA, ADMIN full. BANK sees only nodes on chains linked to alerts addressed to BANK.

**Security requirements.** No personal-name field exists in any node payload — enforced by the shared TypeScript type and asserted by a test. Depth bounds enforced server-side.

**Analytics events.** `graph_rendered`, `graph_node_clicked` (with `nodeType`), `graph_truncated`.

**Acceptance criteria.** AC-004-01 … AC-004-06
**Test cases.** TC-UI-007 … TC-UI-012, TC-API-010, TC-API-011, TC-PERF-004, TC-SEC-021

---

# FEAT-05 — Feature Engineering Pipeline

**Name:** Feature engineering
**Description:** The single module that converts a complaint plus its associated signals and a candidate hotspot cell into the model's input vector. Used identically at training time and at inference time.

**User problem.** (Internal.) Train/serve skew silently destroys model quality and is the most common cause of a demo that behaves differently from the notebook.

**Business value.** Guarantees that published metrics describe the model that actually serves predictions.

**Feature vector (13 features, fixed order).**

| # | Feature | Type | Definition | Default |
|---|---|---|---|---|
| 1 | `txn_amount_total` | float | Sum of transaction amounts on the complaint's chain, in paise | 0 |
| 2 | `txn_velocity_1h` | float | Transactions per hour on the chain in the hour after the complaint timestamp | 0 |
| 3 | `linked_account_count` | int | Distinct accounts on the chain | 1 |
| 4 | `account_age_days_min` | int | Minimum age of accounts on the chain at complaint time | 0 |
| 5 | `prior_suspicious_flags` | int | Count of prior risk-indicated transactions on those accounts | 0 |
| 6 | `distance_km` | float | Haversine distance, victim location to candidate cell centroid | computed |
| 7 | `atm_density` | float | ATMs per km² within the candidate cell's k-ring (k=1) | 0 |
| 8 | `historical_hotspot_score` | float | Normalised historical withdrawal frequency for the cell | global prior |
| 9 | `hour_of_day` | int | Hour of the complaint timestamp, IST, 0–23 | computed |
| 10 | `day_of_week` | int | 0=Monday … 6=Sunday | computed |
| 11 | `recency_hours` | float | Hours since the most recent chain transaction | 0 |
| 12 | `withdrawal_count` | int | Prior withdrawals by chain accounts | 0 |
| 13 | `linked_depth` | int | Longest hop count from victim to a terminal node | 1 |

**API behaviour.** Not directly exposed. Invoked inside the ML service by `/predict` and by the training pipeline.

**Database requirements.** Read-only across `complaints`, `transactions`, `accounts`, `withdrawals`, `atms`, `hotspots`.

**Edge cases.** Complaint with no chain (all chain-derived features take defaults, confidence downgraded); candidate cell with zero ATMs (`atm_density = 0`, not null); complaint timestamp in the future relative to data (recency clamped at 0).

**Failure scenarios.** Schema mismatch between stored feature order and computed vector → inference aborts with a typed error rather than scoring a misaligned vector.

**Permissions.** Internal only.

**Security requirements.** No feature may encode a personal identifier. Feature values are numeric only.

**Analytics events.** `features_built` (count, duration, defaults applied).

**Acceptance criteria.** AC-005-01 … AC-005-03
**Test cases.** TC-UNIT-010 … TC-UNIT-015

---

# FEAT-06 — Risk Scoring Model

**Name:** Risk scoring (Model 1)
**Description:** A gradient-boosted classifier (XGBoost; LightGBM documented as an alternative) that scores each complaint–candidate-cell pair, producing the probability that the cell is the cash-out location within the 24-hour horizon.

**User problem.** Officers need a single, comparable number to prioritise.

**Business value.** The ranking that the entire product surface depends on.

**API behaviour.** ML service `POST /predict` → `{ riskScore, riskLevel, confidence, modelVersion, ... }`. Web `POST /api/predict` wraps it, persists, and returns the same values.

**Database requirements.** Writes `predictions`; reads thresholds from settings.

**Edge cases.** Score exactly on a threshold boundary (inclusive lower bound documented: HIGH ≥ 0.70, MEDIUM ≥ 0.40, else LOW); all candidate cells scoring below 0.40 (returns LOW with an explicit "no high-risk location identified" state).

**Failure scenarios.** Artefact missing → health check fails, `/predict` returns 503, UI degrades honestly. Feature schema mismatch → 500 with a typed code, logged server-side with detail, generic message to client.

**Permissions.** LEA, ADMIN may invoke. BANK may not.

**Security requirements.** Rate limited; input strictly validated; no model internals exposed in responses beyond the version string.

**Analytics events.** `prediction_scored` (score bucket, latency, model version).

**Acceptance criteria.** AC-006-01 … AC-006-04
**Test cases.** TC-ML-010 … TC-ML-014, TC-PERF-006

---

# FEAT-07 — Spatial Hotspot Engine

**Name:** Hotspot candidate generation and ranking (Model 2)
**Description:** Generates candidate cells with H3, discovers density clusters with DBSCAN, builds a KDE surface for the heatmap, and ranks candidates using the combined score.

**Combined hotspot score.** A documented weighted blend of current suspicious activity, historical hotspot frequency, recency, linked-account density, withdrawal history, ATM density and temporal match, with the model probability as the dominant term. Weights live in `ai/model-selection.md` and are read from configuration, never hard-coded in the UI.

**User problem.** "Somewhere in Delhi" is not actionable; a ranked shortlist of localities is.

**Business value.** Converts a probability into a deployment decision, with a documented second and third choice.

**API behaviour.** Returned inside the prediction response as `rankedHotspots`, and independently via `GET /api/hotspots` and `GET /api/hotspots/:id`.

**Database requirements.** Writes/refreshes `hotspots`; reads `withdrawals`, `atms`, `transactions`. Index on `h3_index`, `risk_score`, `risk_level`.

**Edge cases.** Fewer than three candidate cells available (returns what exists, minimum one, with a note); ties in score (broken deterministically by H3 index so ordering is reproducible); cell spanning a district boundary (named by the district of its centroid).

**Failure scenarios.** DBSCAN yielding no clusters → fall back to H3 aggregation alone, flagged in the response as `clusteringFallback: true`.

**Permissions.** LEA, ADMIN, BANK (read).

**Security requirements.** Coordinates are cell centroids, never a precise address.

**Analytics events.** `hotspots_ranked` (count, top score, fallback flag).

**Acceptance criteria.** AC-007-01 … AC-007-03
**Test cases.** TC-ML-020 … TC-ML-025, TC-INT-010

---

# FEAT-08 — Temporal Window Prediction

**Name:** Expected withdrawal window (Model 3)
**Description:** A classifier over twelve 2-hour bins spanning a 24-hour horizon, returning the most probable bin, optionally widened to an adjacent bin when probabilities are close.

**User problem.** A location without a time is a stakeout of indefinite length.

**Business value.** Makes deployment schedulable; completes the intelligence unit.

**API behaviour.** Returned as `expectedWindow: { start, end }` plus `windowConfidence`.

**Database requirements.** Persisted on `predictions` as `predicted_start` / `predicted_end`.

**Edge cases.** Window crossing midnight (represented correctly as consecutive UTC timestamps and rendered across the day boundary); two bins within 0.05 probability (window widened to cover both, still ≤ 4 hours); flat distribution (top bin returned with LOW confidence — the field is never omitted).

**Failure scenarios.** Temporal model unavailable → the response omits nothing but sets `windowConfidence: "LOW"` and includes `windowFallback: true`; the UI states that the window is a historical-pattern fallback.

**Permissions.** As FEAT-06.

**Security requirements.** None beyond the shared envelope.

**Analytics events.** `window_predicted` (bin, width hours, confidence, fallback flag).

**Acceptance criteria.** AC-008-01 … AC-008-03
**Test cases.** TC-ML-030 … TC-ML-033

---

# FEAT-09 — Explainability

**Name:** SHAP-based risk factors
**Description:** Per-prediction SHAP attributions computed with TreeExplainer, aggregated to officer-readable factor names, normalised to percentages with a direction.

**User problem.** An unexplained score cannot be acted on, defended to a supervisor, or challenged.

**Business value.** The single strongest trust and differentiation mechanism in the product.

**Mapping.** Raw features are aggregated into named factors: `txn_velocity_1h`, `recency_hours` → **Transaction Velocity**; `historical_hotspot_score` → **Historical Hotspot**; `linked_account_count`, `linked_depth` → **Linked Account Pattern**; `distance_km`, `atm_density` → **ATM Proximity**; `hour_of_day`, `day_of_week` → **Time Pattern**; `txn_amount_total`, `withdrawal_count` → **Amount / Frequency**; `account_age_days_min`, `prior_suspicious_flags` → **Account Age** and **Withdrawal History** respectively where material.

**API behaviour.** `factors: [{ name, contribution, direction }]`, ordered by descending absolute contribution, at least five entries, contributions summing to 100 ± 0.5.

**Database requirements.** Persisted to `risk_factors` with `prediction_id`, `factor_name`, `contribution`, `direction`.

**Edge cases.** A factor with near-zero contribution (grouped into "Other factors" so the visible list stays meaningful while the sum stays exact); negative contributions (rendered as "reduces risk" with the bar drawn in the opposite direction).

**Failure scenarios.** SHAP computation failure → prediction still returns, with `factors: []` and `explanationAvailable: false`; the UI states that the explanation could not be generated and offers retry. A prediction is never presented as explained when it is not.

**Permissions.** Visible to all roles that can see the prediction.

**Security requirements.** Explanations expose feature semantics only, never raw training data or other complaints' values.

**Analytics events.** `explanation_generated`, `explanation_failed`, `explanation_expanded`.

**Acceptance criteria.** AC-009-01 … AC-009-05
**Test cases.** TC-ML-040 … TC-ML-045, TC-API-020

---

# FEAT-10 — GIS Risk Map

**Name:** National risk map
**Description:** A MapLibre GL map of India with three toggleable layers and a hotspot detail drawer, forming the operational picture.

**User problem.** Geographic concentration is invisible in tables.

**Business value.** The dashboard's centrepiece and the most immediately legible artefact for an evaluator.

**User flow.** Analyst opens `/risk-map`, toggles layers, zooms into a cluster, clicks a hotspot, reviews the drawer, and generates an alert.

**UI behaviour.** Vector basemap; heatmap layer driven by the KDE surface; hotspot markers sized by score and labelled with rank; ATM markers clustered above a density threshold. Legend with text labels. Layer toggles as switches with labels. Drawer is a right-side sheet, dismissible by Escape, focus-trapped. An "Accessible table" toggle renders the same hotspot data as a `<table>`.

**API behaviour.** `GET /api/hotspots` (list, filterable by state, risk level, time range), `GET /api/hotspots/:id` (detail with nearby ATMs, factors and related complaints), `GET /api/atms?bbox=` for viewport-scoped ATM loading.

**Database requirements.** Reads `hotspots`, `atms`, `predictions`, `complaints`. Index on `h3_index` and on `(latitude, longitude)`.

**Edge cases.** No hotspots for the active filter (map renders with an empty-layer notice); a hotspot outside the India bounding box (excluded by a validation guard at write time); very high zoom with no ATMs in view (empty cluster layer, not an error).

**Failure scenarios.** Tile provider unreachable → basemap falls back to a bundled India outline GeoJSON with a notice; data layers still render. WebGL unavailable → the accessible table is presented as the primary view with an explanatory message.

**Permissions.** All roles read; only LEA and ADMIN see "Generate Alert".

**Security requirements.** Bounding-box parameters validated and clamped; no unbounded ATM query.

**Analytics events.** `map_viewed`, `map_layer_toggled`, `hotspot_marker_clicked`, `hotspot_drawer_opened`, `map_fallback_used`.

**Acceptance criteria.** AC-010-01 … AC-010-06
**Test cases.** TC-UI-030 … TC-UI-035, TC-A11Y-010, TC-PERF-003

---

# FEAT-11 — Alert Engine

**Name:** Actionable alert generation and dispatch
**Description:** Composition, validation, dispatch, persistence, propagation and acknowledgement of a structured high-risk withdrawal alert.

**User problem.** Intelligence that is not routed to someone who can act is not intelligence.

**Business value.** The step that converts the product from analysis to intervention; the closing beat of the demo.

**User flow.** Officer clicks "Generate Alert" from a prediction or hotspot drawer → modal opens pre-filled → officer selects recipients → clicks "Send Alert" → status becomes SENT → alert appears on dashboard, alerts page and investigation timeline → recipient acknowledges.

**UI behaviour.** Modal titled "HIGH-RISK WITHDRAWAL ALERT" with read-only intelligence fields and an editable recipients group (checkboxes: LEA, Bank, I4C). "Send Alert" disabled until at least one recipient is selected and while in flight. On success: modal closes, success toast, status badge reads SENT. Alerts list supports filtering by severity and status.

**API behaviour.** `POST /api/alerts` `{ predictionId, recipients[], notes? }` → 201 `{ alertId, status: "SENT", createdAt }`. `GET /api/alerts`, `GET /api/alerts/:id`, `PATCH /api/alerts/:id` for acknowledgement and status change.

**Database requirements.** Writes `alerts`; writes an audit event; may update `investigations`. Severity derived server-side from the prediction's risk level. Index on `status`, `severity`, `created_at`, `prediction_id`.

**Edge cases.** Two officers alerting the same prediction concurrently (both persist; the alerts list shows both, each attributed); recipients list containing duplicates (de-duplicated server-side); alert on a prediction that has since been superseded (allowed, but the alert stores the prediction ID it was built from, so the intelligence remains reconstructable).

**Failure scenarios.** Persist failure → 500, modal stays open with an error, no partial alert. Audit write failure → the whole operation rolls back; an alert is never dispatched without its audit record.

**Permissions.** LEA and ADMIN create. BANK acknowledges. All read alerts addressed to them.

**Security requirements.** Severity and exposure are server-computed and immutable from the client. Rate limited at 10/minute/role. Audit event mandatory and transactional with the insert. IDOR-checked on `:id`.

**Analytics events.** `alert_modal_opened`, `alert_recipients_changed`, `alert_sent`, `alert_send_failed`, `alert_acknowledged`.

**Acceptance criteria.** AC-011-01 … AC-011-08
**Test cases.** TC-UI-040 … TC-UI-042, TC-API-030 … TC-API-032, TC-E2E-010, TC-E2E-011, TC-SEC-030, TC-SEC-031

---

# FEAT-12 — Investigation Workflow

**Name:** Investigation lifecycle
**Description:** Case records with a validated state machine, priority, notes, and a consolidated view linking complaint, graph, prediction and alerts.

**State machine.**

```
New ──▶ Analyzing ──▶ Under Review ──▶ Alert Sent ──▶ Monitoring ──▶ Resolved
 │           │              │                              │
 └───────────┴──────────────┴──────────────────────────────┴──▶ Resolved (with mandatory closure note)
```
Backward transitions are permitted only to the immediately preceding state and require a note. Any other transition returns 409.

**User problem.** Case state currently lives in spreadsheets and messages.

**Business value.** Closes the loop from prediction to outcome and creates the data that a future feedback loop (V2) would learn from.

**API behaviour.** `GET /api/investigations`, `POST /api/investigations`, `GET /api/investigations/:id`, `PATCH /api/investigations/:id`, `POST /api/investigations/:id/notes`.

**Database requirements.** `investigations`, `investigation_notes`. Unique constraint on `(complaint_id)` so a complaint has at most one investigation. Index on `status`, `priority`, `updated_at`.

**Edge cases.** Alert dispatched for a complaint with no investigation (one is created in `Alert Sent`); concurrent status updates (optimistic concurrency via `updated_at`; the loser receives 409 and refetches); resolving with no note (rejected with 400).

**Failure scenarios.** Note write failure does not change status; status change failure does not write a note. Each is atomic.

**Permissions.** LEA and ADMIN manage. BANK may add notes to investigations linked to alerts addressed to BANK, and may not change status.

**Security requirements.** Transition validation server-side; role checks per action; audit event on every status change; notes sanitised for output.

**Analytics events.** `investigation_created`, `investigation_status_changed`, `investigation_note_added`, `investigation_viewed`.

**Acceptance criteria.** AC-012-01 … AC-012-06
**Test cases.** TC-API-040 … TC-API-043, TC-UI-050, TC-E2E-012, TC-SEC-032

---

# FEAT-13 — Reports and Model Transparency

**Name:** Reports and prototype model evaluation
**Description:** Six Recharts visualisations over filterable aggregates, plus a published prototype model metrics panel.

**User problem.** Supervisors and analysts need the aggregate picture and an honest statement of model quality.

**Business value.** Supports resource allocation and establishes credibility by publishing limitations rather than hiding them.

**Charts.** Complaints over time (line); suspicious transactions (bar); alert severity distribution (stacked bar); predicted hotspots by score (horizontal bar); top districts (bar); fraud type mix (donut with labelled legend).

**API behaviour.** `GET /api/reports/summary?from&to&city&state&fraudType`, `GET /api/reports/metrics`.

**Database requirements.** Aggregate queries over `complaints`, `transactions`, `alerts`, `hotspots`; reads `model_metrics`. Aggregations are indexed and, where costly, materialised at seed time.

**Edge cases.** Filter yielding zero rows (per-chart empty state); single data point (chart renders a point, not a broken axis); very wide date range (server caps at 365 days with a notice).

**Failure scenarios.** Metrics table empty because evaluation has not run → the panel states "Model evaluation not yet run" rather than displaying zeros.

**Permissions.** All roles read; BANK sees aggregates scoped to its alerts.

**Security requirements.** Date parameters validated; aggregate endpoints cannot be used to enumerate individual records.

**Analytics events.** `reports_viewed`, `reports_filter_applied`, `model_metrics_viewed`.

**Acceptance criteria.** AC-013-01 … AC-013-04
**Test cases.** TC-API-050, TC-API-051, TC-UI-060, TC-UI-061, TC-A11Y-020, TC-INT-011

---

# FEAT-14 — Demo Mode

**Name:** Judge demonstration mode
**Description:** A one-click dashboard control and a dedicated guided `/demo` route executing the full value chain against the real API, with a deterministic reset.

**User problem.** (Demonstration.) An evaluator has under three minutes and no context.

**Business value.** Directly serves BR-02 and G-06; it is the difference between a judge understanding the product and not.

**Six-step flow.** Complaint → money-trail graph → AI analysis → hotspot prediction → explanation → alert.

**UI behaviour.** Step indicator with six labelled steps. Each step auto-advances on completion with a manual forward control available. Processing animation during inference, bounded to the actual request duration. "Reset Demo" in the header with a confirmation dialog. A pre-warm request fires on mount.

**API behaviour.** Uses the standard endpoints — no demo-only prediction path. `POST /api/demo/reset` clears demo-generated alerts and investigations only.

**Database requirements.** Reset deletes rows flagged `origin = 'demo'` in `alerts` and `investigations`; seed tables untouched.

**Edge cases.** Reset with nothing to reset (succeeds, idempotent); demo run while a previous run is in flight (second invocation is ignored while in flight); complaint `C-10284` missing from the dataset (startup validation fails loudly at seed time, not at demo time).

**Failure scenarios.** ML service unavailable → explicit degraded notice containing "prediction service unavailable", no fabricated values, the rest of the flow still navigable.

**Permissions.** Any role may run the demo; reset is ADMIN and the demo route.

**Security requirements.** Reset scoped by `origin = 'demo'`; it can never delete seed data. Confirmation required.

**Analytics events.** `demo_started`, `demo_step_completed`, `demo_completed`, `demo_reset`, `demo_degraded`.

**Acceptance criteria.** AC-014-01 … AC-014-05
**Test cases.** TC-E2E-020 … TC-E2E-023, TC-UI-070, TC-API-060, TC-INT-012, TC-PERF-007

---

# FEAT-15 — Roles, Settings, Trust and Health

**Name:** Platform governance surface
**Description:** The role concept (LEA / BANK / ADMIN) with server-side enforcement, the settings page, persistent prototype labelling, audit events, and the health endpoint.

**User problem.** Users must know what mode the system is in and what they are permitted to do; administrators must be able to diagnose a failing demo.

**Business value.** Establishes the credibility and safety posture that a government-facing prototype requires.

**Settings content.** System Mode: Prototype (read-only). Data Mode: Synthetic / Anonymised (read-only). Model: `CyberPulse-Demo-v1` (read-only). Risk Threshold: configurable HIGH and MEDIUM boundaries. Notification preferences. System Health panel.

**API behaviour.** `GET /api/settings`, `PATCH /api/settings` (ADMIN only), `GET /api/health`, `POST /api/role` (prototype role switch).

**Database requirements.** A single-row `settings` table; `audit_events` table (actor role, action, subject type, subject ID, timestamp, metadata JSON).

**Edge cases.** Threshold set so HIGH ≤ MEDIUM (rejected with 400); role switch to an unknown role (rejected); health check while the ML service is cold (reports `degraded`, not `down`, during the documented warm-up window).

**Failure scenarios.** Settings write failure leaves prior values intact. Health endpoint never throws; a failing component is reported, not propagated.

**Permissions.** ADMIN writes settings. All roles read health and see the prototype indicators.

**Security requirements.** Role switching is clearly labelled a prototype affordance and is documented in `security/auth-strategy.md` as not a security control. Settings writes are ADMIN-gated server-side and audited.

**Analytics events.** `role_switched`, `settings_updated`, `health_checked`, `threshold_changed`.

**Acceptance criteria.** AC-015-01 … AC-015-06
**Test cases.** TC-SEC-010 … TC-SEC-012, TC-API-070, TC-API-080, TC-UI-080 … TC-UI-082

---

# FEAT-16 — Synthetic Data Generation and Seeding

**Name:** Deterministic synthetic data platform
**Description:** The seeded generator, the signal-check validator, the PII scanner and the database seeding pipeline.

**User problem.** (Internal and ethical.) The project must be demonstrable without touching any real data, and the demonstration must be identical every time.

**Business value.** Makes the entire project lawful, safe and reproducible; without it nothing else can be built.

**Generation model.** Regions are sampled from seven metro clusters with per-region ATM layouts. Fraud types carry distinct amount distributions and hour-of-day profiles. Each complaint spawns a chain of depth 2–4 with per-hop delay distributions. Withdrawals are placed at ATMs sampled from a region-specific hotspot preference, which is the latent pattern the model must recover.

**Pipeline.** `generate:data` → `signal_check` → `pii_scan` → `db:migrate` → `db:seed` → `train:model` → `evaluate`.

**Database requirements.** Writes all seed tables; `manifest.json` recorded for provenance.

**Edge cases.** Partial prior seed (seeding is idempotent and truncates in dependency order inside a transaction); generator parameters producing fewer rows than the floors (the script fails with a clear message).

**Failure scenarios.** Signal check failing blocks training. PII scan failing blocks seeding. Neither is bypassable by a flag in CI.

**Permissions.** Developer/CI tooling only.

**Security requirements.** No network access during generation; deterministic RNG seeded explicitly; output committed only as generated artefacts under a documented path.

**Analytics events.** Not applicable (build-time tooling).

**Acceptance criteria.** AC-016-01 … AC-016-06
**Test cases.** TC-DATA-001 … TC-DATA-009, TC-SEC-020

---

## Feature → Requirement → Phase Index

| Feature | Requirements | Stories | Phase |
|---|---|---|:--:|
| FEAT-01 | FR-02.x | US-010 … US-012 | P3 |
| FEAT-02 | FR-03.x | US-013 … US-015 | P3 |
| FEAT-03 | FR-04.x, FR-24.x | US-020, US-021, US-025 | P4 |
| FEAT-04 | FR-05.x | US-022 … US-024 | P4 |
| FEAT-05 | FR-06.x | US-030 | P3 |
| FEAT-06 | FR-07.x | US-031, US-032 | P3 |
| FEAT-07 | FR-08.x | US-033 | P3 |
| FEAT-08 | FR-09.x | US-034 | P3 |
| FEAT-09 | FR-10.x | US-035, US-036 | P3 |
| FEAT-10 | FR-11.x, FR-12.x | US-040 … US-043 | P4 |
| FEAT-11 | FR-13.x, FR-14.x | US-050 … US-055 | P5 |
| FEAT-12 | FR-15.x | US-060 … US-064 | P5 |
| FEAT-13 | FR-16.x, FR-17.x | US-070 … US-072 | P6 |
| FEAT-14 | FR-18.x, FR-19.x | US-080 … US-083 | P7 |
| FEAT-15 | FR-20.x … FR-23, FR-25 | US-090 … US-093 | P2–P6 |
| FEAT-16 | FR-01.x | US-001 … US-004 | P2 |
