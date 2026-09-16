# USE CASES — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Notation | Actor · Precondition · Main flow · Alternate flows · Exception flows · Postcondition |
| Traces to | `USER_STORIES.md`, `ACCEPTANCE_CRITERIA.md`, `test-cases/e2e-tests.md` |

---

## UC-01 — Analyse a complaint and obtain a cash-out forecast

**Primary actor:** PER-01 Investigating Officer
**Supporting actors:** ML service
**Preconditions:** Complaint exists; ML service healthy; role is LEA or ADMIN
**Trigger:** Officer opens a complaint requiring action

### Main flow
1. Officer navigates to `/complaints` and locates the complaint.
2. Officer opens `/complaints/[id]`.
3. System renders summary, transaction timeline and linked accounts.
4. Officer clicks **Analyze Complaint**.
5. System builds the feature vector for each candidate hotspot cell.
6. System calls the ML service, which returns risk score, ranked hotspots, expected window, confidence and SHAP factors.
7. System persists the prediction and its factors.
8. System renders the prediction panel with risk percentage, level, confidence, top hotspot, window, likely ATM count, estimated exposure and factor breakdown.

### Alternate flows
- **A1 — Already analysed.** At step 3 the system displays the most recent prediction with its timestamp and offers **Re-analyse**, which re-runs from step 5.
- **A2 — No high-risk location.** At step 8, if every candidate scores below the MEDIUM threshold, the system renders "No high-risk location identified" with the full ranked list still available.
- **A3 — Weak temporal signal.** At step 6, if bin probabilities are flat, the window is returned with LOW confidence and a fallback flag; the UI states that the window derives from historical patterns.

### Exception flows
- **E1 — ML service unavailable.** Steps 6–8 abort. The system renders a degraded-mode panel containing no numeric prediction, with retry.
- **E2 — Timeout at 8 s.** As E1, with a timeout-specific message.
- **E3 — Persist failure.** The transaction rolls back; no prediction is shown as saved when it is not.
- **E4 — Complaint has no linked transactions.** Analysis proceeds using documented defaults; confidence is LOW and the UI states which inputs were missing.

**Postcondition:** A prediction row and its risk-factor rows exist and are rendered; the officer can proceed to UC-02, UC-03 or UC-04.
**Acceptance criteria:** AC-002-04, AC-002-05, AC-006-01 … AC-006-04, AC-007-01, AC-008-01, AC-009-01
**Tests:** TC-E2E-001, TC-E2E-002, TC-INT-020

---

## UC-02 — Inspect the money trail

**Primary actor:** PER-01
**Preconditions:** Complaint has at least one linked transaction
**Trigger:** Officer needs to understand the layering structure

### Main flow
1. Officer opens the money-trail graph from the complaint, a transaction, or the investigation.
2. System performs a bounded traversal (default depth 4) over transactions and withdrawals.
3. System renders a directed graph with Victim, Mule Account and ATM nodes.
4. Officer clicks a node.
5. System displays the node's detail panel.

### Alternate flows
- **A1 — Chain with no withdrawal.** The terminal node renders as "No withdrawal observed" rather than an ATM.
- **A2 — Graph exceeds 200 nodes.** The top-weighted subgraph renders with a truncation notice and the full node count.
- **A3 — Shared account across chains.** The account renders once; its detail panel reports its degree across cases.

### Exception flows
- **E1 — Depth parameter out of range.** 400 with the offending field named; the UI keeps the previous graph and shows an inline message.
- **E2 — Traversal time budget exceeded.** A partial graph returns with `truncated: true` rather than a timeout.

**Postcondition:** The officer can name the terminal account and ATM candidates.
**Acceptance criteria:** AC-004-01 … AC-004-06
**Tests:** TC-UI-007 … TC-UI-012, TC-API-010, TC-API-011

---

## UC-03 — Understand and challenge a prediction

**Primary actor:** PER-01 · **Secondary:** PER-04
**Preconditions:** A prediction exists
**Trigger:** A deployment decision requires justification

### Main flow
1. Officer expands the risk-factor panel.
2. System displays at least five named factors with percentage contributions summing to 100 ± 0.5 and a textual direction for each.
3. Officer cross-references the factors against the money-trail graph.
4. Supervisor reviews the same panel inside the investigation view.
5. Supervisor approves or declines the deployment.

### Alternate flows
- **A1 — Supervisor declines.** The investigation records a note with the reason; no alert is generated. The prediction is retained.

### Exception flows
- **E1 — SHAP computation failed.** The prediction still renders, with `explanationAvailable: false` and an explicit statement that the explanation could not be generated. The prediction is never described as explained.

**Postcondition:** A documented human decision exists.
**Acceptance criteria:** AC-009-01 … AC-009-05
**Tests:** TC-ML-040 … TC-ML-045, TC-E2E-013

---

## UC-04 — Generate and dispatch an alert

**Primary actor:** PER-01 · **Receiving actors:** PER-02, PER-03
**Preconditions:** A prediction exists; role is LEA or ADMIN
**Trigger:** The officer decides the forecast warrants action

### Main flow
1. Officer clicks **Generate Alert** from the prediction panel or the hotspot drawer.
2. System opens the alert modal pre-filled with location, window, risk score, server-computed estimated exposure and top factors.
3. Officer selects one or more recipients from LEA, Bank, I4C.
4. Officer clicks **Send Alert**.
5. System validates, derives severity from the prediction's risk level, writes the alert and its audit event in one transaction, and returns 201.
6. System sets status to SENT, closes the modal and shows a success toast.
7. The alert appears on the dashboard, `/alerts` and the investigation timeline.
8. A recipient acknowledges the alert.

### Alternate flows
- **A1 — No recipient selected.** **Send Alert** stays disabled; a direct API call returns 400.
- **A2 — No investigation exists.** One is created in status `Alert Sent`.
- **A3 — Concurrent alerts on one prediction.** Both persist, each attributed to its author.

### Exception flows
- **E1 — Rate limit exceeded.** 429 with `Retry-After`; no alert row written; the modal stays open with the message.
- **E2 — Audit write fails.** The whole transaction rolls back. An alert is never dispatched without its audit record.
- **E3 — Persist failure.** 500; the modal stays open with a retryable error.

**Postcondition:** A persisted, auditable alert in SENT status, visible in three places, with an investigation in `Alert Sent`.
**Acceptance criteria:** AC-011-01 … AC-011-08, AC-012-06
**Tests:** TC-E2E-010, TC-E2E-011, TC-E2E-012, TC-API-030 … TC-API-032, TC-SEC-030, TC-SEC-031

---

## UC-05 — Monitor the national risk map

**Primary actor:** PER-02
**Preconditions:** Hotspots exist
**Trigger:** Routine monitoring or an emerging pattern

### Main flow
1. Analyst opens `/risk-map`.
2. System renders the basemap with Risk Heatmap, Predicted Hotspots and ATM Locations layers.
3. Analyst toggles layers and zooms into a cluster.
4. Analyst clicks a hotspot marker.
5. System opens the drawer with score, level, window, nearby ATMs, top factors and related complaints.
6. Analyst drills through to a related complaint.

### Alternate flows
- **A1 — Filter yields no hotspots.** An empty-layer notice renders; the map remains interactive.
- **A2 — Keyboard or screen-reader user.** The accessible table toggle presents the same data as a table.

### Exception flows
- **E1 — Tile provider unreachable.** A bundled India outline renders with a notice; data layers still display.
- **E2 — WebGL unavailable.** The accessible table becomes the primary view with an explanatory message.

**Postcondition:** The analyst can name the concentrating localities and reach their source complaints.
**Acceptance criteria:** AC-010-01 … AC-010-06
**Tests:** TC-UI-030 … TC-UI-035, TC-A11Y-010

---

## UC-06 — Work an investigation to closure

**Primary actor:** PER-01 · **Secondary:** PER-03, PER-04
**Preconditions:** An investigation exists
**Trigger:** A case requires progression

### Main flow
1. Officer opens `/investigations/[id]`.
2. System renders complaint, graph, hotspot, factors and alerts on one route.
3. Officer adds a note describing the action taken.
4. Officer changes status along a valid transition.
5. System validates the transition, persists it and writes an audit event.
6. Steps 3–5 repeat until status reaches `Resolved` with a mandatory closure note.

### Alternate flows
- **A1 — Bank officer adds a note.** Permitted where the investigation is linked to an alert addressed to BANK; status change is not permitted.
- **A2 — Backward transition.** Permitted only to the immediately preceding state, and only with a note.

### Exception flows
- **E1 — Invalid transition.** 409 `INVALID_TRANSITION`; status unchanged.
- **E2 — Concurrent update.** The later writer receives 409 and refetches.
- **E3 — Resolve without a note.** 400; status unchanged.

**Postcondition:** A complete, auditable case history.
**Acceptance criteria:** AC-012-01 … AC-012-06
**Tests:** TC-API-040 … TC-API-043, TC-UI-050

---

## UC-07 — Review aggregate performance

**Primary actor:** PER-04 · **Secondary:** PER-02
**Preconditions:** Seeded data; evaluation pipeline has run
**Trigger:** Briefing preparation or periodic review

### Main flow
1. Supervisor opens `/reports`.
2. System renders six charts from server-side aggregates.
3. Supervisor applies date, city, state and fraud-type filters.
4. System re-queries and all charts update.
5. Supervisor reviews the **PROTOTYPE MODEL EVALUATION** panel.

### Alternate flows
- **A1 — Filter yields no rows.** Each chart renders its own empty state.
- **A2 — Range exceeds 365 days.** The server caps the range and returns a notice.

### Exception flows
- **E1 — Metrics table empty.** The panel reads "Model evaluation not yet run" rather than displaying zeros.

**Postcondition:** The supervisor can brief leadership from one screen with an honest statement of model quality.
**Acceptance criteria:** AC-013-01 … AC-013-04
**Tests:** TC-API-050, TC-API-051, TC-UI-060, TC-UI-061

---

## UC-08 — Run the demonstration

**Primary actor:** Demonstrator (any role) · **Audience:** SIH evaluator
**Preconditions:** Stack running; complaint `C-10284` present; ML service warm
**Trigger:** Evaluation session begins

### Main flow
1. Demonstrator opens `/demo` (or clicks **RUN DEMO SCENARIO** on the dashboard).
2. System pre-warms the ML service.
3. Step 1 presents complaint `C-10284` — UPI Fraud, ₹3,80,000, Noida.
4. Step 2 renders the money-trail graph.
5. Step 3 runs the real prediction with a processing indication.
6. Step 4 highlights the top hotspot on the map and zooms to it.
7. Step 5 shows the SHAP explanation.
8. Step 6 opens the alert modal; the demonstrator dispatches the alert.
9. Demonstrator clicks **Reset Demo** before the next evaluator.

### Alternate flows
- **A1 — Evaluator asks to see something else.** The demonstrator leaves `/demo` for the full console; the demo state is unaffected.

### Exception flows
- **E1 — ML service unavailable.** A notice containing "prediction service unavailable" renders; no fabricated values appear; the remaining steps stay navigable.
- **E2 — Reset invoked with nothing to reset.** Succeeds idempotently.

**Postcondition:** The complete value chain has been demonstrated in under three minutes and the system is reset to a known state.
**Acceptance criteria:** AC-014-01 … AC-014-05
**Tests:** TC-E2E-020 … TC-E2E-023

---

## Use Case Coverage

| Use case | Features exercised | Personas | Phase |
|---|---|---|:--:|
| UC-01 | FEAT-01, 02, 05, 06, 07, 08, 09 | PER-01 | P3 |
| UC-02 | FEAT-03, 04 | PER-01 | P4 |
| UC-03 | FEAT-09, 12 | PER-01, PER-04 | P3, P5 |
| UC-04 | FEAT-11, 12 | PER-01, PER-02, PER-03 | P5 |
| UC-05 | FEAT-10 | PER-02 | P4 |
| UC-06 | FEAT-12 | PER-01, PER-03, PER-04 | P5 |
| UC-07 | FEAT-13 | PER-04, PER-02 | P6 |
| UC-08 | FEAT-14 (all) | All | P7 |

Every feature FEAT-01 … FEAT-16 appears in at least one use case; FEAT-15 and FEAT-16 are cross-cutting and are exercised implicitly in all eight.
