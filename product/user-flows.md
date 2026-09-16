# USER FLOWS — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Notation | Mermaid flowcharts; decision nodes are diamonds; error paths are annotated |
| Related | `ux/user-flow.md` (screen-level detail), `product/use-cases.md` (narrative form) |

---

## UF-01 — Core value chain: complaint to dispatched alert

```mermaid
flowchart TD
  A[Officer opens /complaints] --> B{Complaint found?}
  B -- No --> B1[Refine search / filters] --> A
  B -- Yes --> C[Open /complaints/id]
  C --> D[Summary + timeline + linked accounts render]
  D --> E{Prediction exists?}
  E -- Yes --> F[Show existing prediction + Re-analyse]
  E -- No --> G[Click Analyze Complaint]
  F --> G
  G --> H[POST /api/predict]
  H --> I{ML service healthy?}
  I -- No --> I1[Degraded panel: no numbers, retry available] --> G
  I -- Timeout 8s --> I2[Timeout message, retry available] --> G
  I -- Yes --> J[Persist prediction + risk_factors]
  J --> K[Render risk, level, confidence, hotspot, window, factors]
  K --> L{Officer verifies?}
  L -- Open graph --> M[Money-trail graph]
  L -- Read factors --> N[Factor breakdown]
  M --> O{Act?}
  N --> O
  O -- No --> P[Add note / leave case] --> Q[End]
  O -- Yes --> R[Click Generate Alert]
  R --> S[Alert modal pre-filled]
  S --> T{At least one recipient?}
  T -- No --> T1[Send disabled + validation message] --> S
  T -- Yes --> U[Click Send Alert]
  U --> V{Rate limit OK?}
  V -- No --> V1[429 + Retry-After, modal stays open] --> S
  V -- Yes --> W[Insert alert + audit event in one transaction]
  W --> X{Transaction committed?}
  X -- No --> X1[500, modal stays open, nothing persisted] --> S
  X -- Yes --> Y[Status SENT + success toast]
  Y --> Z[Propagate to dashboard, /alerts, investigation timeline]
  Z --> AA[Investigation created or moved to Alert Sent]
  AA --> AB[Recipient acknowledges]
  AB --> Q
```

**Critical path length:** 5 interactions from complaint list to dispatched alert (open, analyse, generate, select recipient, send). This count is a design constraint — any change that adds a sixth interaction to the happy path requires a decision-log entry.

---

## UF-02 — Judge demonstration flow

```mermaid
flowchart LR
  A[Open /demo] --> B[Pre-warm ML service]
  B --> C[Step 1: Complaint C-10284]
  C --> D[Step 2: Money-trail graph]
  D --> E[Step 3: AI analysis - real POST /api/predict]
  E --> F{Service available?}
  F -- No --> F1[Notice: prediction service unavailable] --> J
  F -- Yes --> G[Step 4: Hotspot highlighted, map zooms]
  G --> H[Step 5: SHAP explanation]
  H --> I[Step 6: Alert modal + dispatch]
  I --> J[Reset Demo]
  J --> C
```

Every step is bounded by the actual request duration; no artificial delay is added to make processing "look" like work.

---

## UF-03 — Map-first analyst flow

```mermaid
flowchart TD
  A[Open /risk-map] --> B[Basemap + 3 layers render]
  B --> C{WebGL available?}
  C -- No --> C1[Accessible table becomes primary view] --> H
  C -- Yes --> D[Toggle layers / zoom to cluster]
  D --> E[Click hotspot marker]
  E --> F[Drawer: score, level, window, ATMs, factors, complaints]
  F --> G{Next action?}
  G -- Drill to complaint --> H[/complaints/id/]
  G -- Generate alert --> I[Alert modal] --> J[Dispatch]
  G -- Close --> D
```

---

## UF-04 — Investigation lifecycle flow

```mermaid
stateDiagram-v2
  [*] --> New
  New --> Analyzing: officer begins work
  Analyzing --> UnderReview: prediction produced
  UnderReview --> AlertSent: alert dispatched (auto)
  AlertSent --> Monitoring: recipient acknowledged
  Monitoring --> Resolved: closure note required
  UnderReview --> Analyzing: backward, note required
  AlertSent --> UnderReview: backward, note required
  Monitoring --> AlertSent: backward, note required
  Resolved --> [*]
```

Any transition not drawn above returns **409 INVALID_TRANSITION**. Backward transitions are limited to one step and require a note (AC-012-02).

---

## UF-05 — Error and degradation flows

```mermaid
flowchart TD
  A[Any data request] --> B{Response}
  B -- 200 --> C[Render data]
  B -- 400 --> D[Inline field-level message, previous data retained]
  B -- 403 --> E[Permission notice, no data leaked in the message]
  B -- 404 --> F[Not-found state with a route back]
  B -- 429 --> G[Rate-limit message with Retry-After countdown]
  B -- 503 ML --> H[Degraded panel: capability named, no fabricated values, retry]
  B -- 503 DB --> I[Retryable error, health badge turns degraded]
  B -- 504 --> J[Timeout message, retry]
  B -- Network --> K[Offline notice, automatic retry with backoff]
```

**Invariant across every branch:** the user is never shown a blank screen, a raw stack trace, or a number the system did not actually compute.

---

## UF-06 — Role-scoped access flow

```mermaid
flowchart TD
  A[Request arrives at route handler] --> B[Validate input with Zod]
  B --> C{Valid?}
  C -- No --> C1[400 VALIDATION_ERROR with field name]
  C -- Yes --> D[Resolve active role]
  D --> E{Role permitted for this action?}
  E -- No --> E1[403 FORBIDDEN, no data in body]
  E -- Yes --> F{Object-level scope satisfied?}
  F -- No --> F1[404 NOT_FOUND - avoids confirming existence]
  F -- Yes --> G[Service layer executes]
  G --> H{Privileged action?}
  H -- Yes --> I[Write audit event in the same transaction]
  H -- No --> J[Return result]
  I --> J
```

Returning **404 rather than 403** for an object the role may not see is deliberate: a 403 confirms that the object exists, which is an information leak in an enforcement context.

---

## UF-07 — First-run / setup flow (developer)

```mermaid
flowchart LR
  A[Clone repo] --> B[cp .env.example .env]
  B --> C[Set DATABASE_URL + ML_SERVICE_URL]
  C --> D[npm run db:migrate]
  D --> E[npm run generate:data]
  E --> F{Signal check passes?}
  F -- No --> F1[Abort: generator patterns not detectable] --> E
  F -- Yes --> G{PII scan clean?}
  G -- No --> G1[Abort: seeding blocked] --> E
  G -- Yes --> H[npm run db:seed]
  H --> I[npm run train:model]
  I --> J{Metric gates pass?}
  J -- No --> J1[Abort: model below gate] --> I
  J -- Yes --> K[Start ML service]
  K --> L[npm run dev]
  L --> M[Open dashboard, run demo scenario]
```

Two gates in this flow are **non-bypassable in CI**: the signal check before training and the PII scan before seeding.

---

## Flow Inventory

| Flow | Personas | Features | Tests |
|---|---|---|---|
| UF-01 | PER-01 | FEAT-01, 02, 04, 05–09, 11, 12 | TC-E2E-001, TC-E2E-010 … TC-E2E-012 |
| UF-02 | All | FEAT-14 | TC-E2E-020 … TC-E2E-023 |
| UF-03 | PER-02 | FEAT-10, 11 | TC-UI-030 … TC-UI-035 |
| UF-04 | PER-01, PER-03 | FEAT-12 | TC-API-040 … TC-API-042 |
| UF-05 | All | Cross-cutting | TC-INT-020 … TC-INT-022, TC-E2E-030 |
| UF-06 | All | FEAT-15 | TC-SEC-010 … TC-SEC-012 |
| UF-07 | Developer | FEAT-16 | TC-DOC-001, TC-DATA-009 |
