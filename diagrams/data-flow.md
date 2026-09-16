# DIAGRAM — DATA FLOW

---

## D-10 · The value chain, end to end

```mermaid
flowchart LR
  A[Cybercrime<br/>complaint] --> B[Transaction /<br/>account intelligence]
  B --> C[Feature<br/>engineering]
  C --> D[Predictive<br/>ML]
  D --> E[Geospatial<br/>hotspot analysis]
  E --> F[Predicted<br/>withdrawal location]
  F --> G[Predicted<br/>time window]
  G --> H[Explainable<br/>risk score]
  H --> I[Actionable<br/>alert]
  I --> J[Investigator<br/>review]
  J --> K[Proactive<br/>intervention]

  style A fill:#E3EDFB,stroke:#1B5FBF
  style D fill:#DDF2F4,stroke:#0E7C86
  style H fill:#DDF2F4,stroke:#0E7C86
  style I fill:#FBEAE8,stroke:#C0392B
  style K fill:#E6F4EC,stroke:#1F7A47
```

---

## D-11 · Prediction request sequence

```mermaid
sequenceDiagram
  autonumber
  participant U as Officer
  participant W as Next.js route handler
  participant S as predictionService
  participant DB as PostgreSQL
  participant M as ML service

  U->>W: POST /api/predict {complaintId}
  W->>W: Zod validate · resolve role · authorise · rate limit
  W->>S: predict(complaintId, ctx)
  S->>DB: complaint + chain transactions + accounts
  DB-->>S: rows
  S->>DB: candidate cells (k-ring + historical)
  DB-->>S: cells
  S->>M: POST /predict (full payload, x-request-id)
  M->>M: build 60 feature vectors
  M->>M: assert_schema
  M->>M: batch score
  M->>M: combined ranking + tie-break
  M->>M: temporal bins → window
  M->>M: SHAP on top cell → named factors
  M-->>S: prediction core
  S->>S: validate response with shared schema
  S->>DB: BEGIN
  S->>DB: INSERT predictions
  S->>DB: INSERT risk_factors × n
  S->>DB: COMMIT
  DB-->>S: persisted row
  S-->>W: persisted representation
  W-->>U: 201 + prediction
  U->>U: render + live-region announcement
```

Step 24 returns the **persisted** row rather than the ML response, which is what makes NFR-26 testable.

---

## D-12 · Alert dispatch with mandatory audit

```mermaid
sequenceDiagram
  autonumber
  participant U as Officer
  participant W as Route handler
  participant A as alertService
  participant I as investigationService
  participant AU as auditService
  participant DB as PostgreSQL

  U->>W: POST /api/alerts {predictionRef, recipients}
  W->>W: validate · authorise · rate limit
  W->>A: create(input, ctx)
  A->>DB: load prediction
  A->>A: derive severity · compute exposure (server-side)
  A->>DB: BEGIN
  A->>DB: INSERT alerts
  A->>I: upsertForAlert(tx, complaintId, alertId)
  I->>DB: UPSERT investigations → ALERT_SENT
  A->>AU: record(tx, ALERT_DISPATCHED)
  AU->>DB: INSERT audit_events
  A->>DB: COMMIT
  DB-->>A: committed
  A-->>W: {alertId, status: SENT}
  W-->>U: 201
  U->>U: invalidate dashboard · alerts · investigation queries
```

If any step between BEGIN and COMMIT fails, none of the three writes occurs. An alert without an audit record cannot exist.

---

## D-13 · Build-time data pipeline

```mermaid
flowchart TD
  S[Seed 26184] --> G[generator.py]
  G --> O[complaints · accounts · transactions<br/>withdrawals · atms · manifest.json]
  O --> SIG{signal_check.py<br/>8 planted patterns detectable?}
  SIG -- no --> STOP1[Abort — training blocked]
  SIG -- yes --> PII{pii_scan.py<br/>zero matches?}
  PII -- no --> STOP2[Abort — seeding blocked]
  PII -- yes --> MIG[db:migrate]
  MIG --> SEED[db:seed<br/>verify SHA-256 per file]
  SEED --> TD[generate_training_data.py<br/>complaint × candidate cell pairs]
  TD --> TR[train.py<br/>risk + temporal models]
  TR --> EV{evaluate.py<br/>metric gates pass?}
  EV -- no --> STOP3[Abort — release blocked]
  EV -- yes --> ART[Artefacts + feature_schema.json]
  ART --> IMG[Baked into ML image]
  EV --> MM[(model_metrics)]
  MM --> RPT[/reports — PROTOTYPE MODEL EVALUATION/]

  style STOP1 fill:#FBEAE8,stroke:#C0392B
  style STOP2 fill:#FBEAE8,stroke:#C0392B
  style STOP3 fill:#FBEAE8,stroke:#C0392B
```

Three non-bypassable gates. In CI none of them accepts a skip flag.

---

## D-14 · Money-trail traversal

```mermaid
flowchart TD
  C[Complaint C-10284] --> T0[Seed: transactions where complaint_id = C]
  T0 --> V[Victim node]
  T0 --> L1[Hop 1 accounts]
  L1 --> R{depth < max<br/>AND account not in visited?}
  R -- no --> END[Stop this branch]
  R -- yes --> L2[Next-hop transactions]
  L2 --> L1
  L1 --> WD[Withdrawals by these accounts]
  WD --> ATM[ATM nodes]
  L1 --> CAP{node count > 200?}
  CAP -- yes --> TRUNC[Top-weighted subgraph<br/>truncated: true + true count]
  CAP -- no --> FULL[Full subgraph]
```

Three independent protections — depth bound, visited set, node cap — because any one alone is insufficient.

---

## D-15 · Data classification flow

```mermaid
flowchart LR
  GEN[Synthetic generator<br/>classification: SYNTHETIC] --> PORT[IngestionPort]
  NCRP[NCRP adapter<br/>classification: RESTRICTED]:::future -.-> PORT
  BANKA[Bank adapter<br/>classification: RESTRICTED]:::future -.-> PORT
  PORT --> NORM[Normalise · minimise · H3 enrich]
  NORM --> CORE[(Application core)]
  CORE --> BADGE[Header badge text]
  CORE --> GATE{classification = RESTRICTED?}
  GATE -- yes --> REQ[Startup requires: real RBAC,<br/>audit retention, state partitioning]
  GATE -- no --> OK[Prototype controls sufficient]

  classDef future fill:#f4f4f4,stroke:#999,stroke-dasharray:4 4,color:#666
```

Classification is data, not configuration. The header badge and the startup gate both derive from it, so a deployment cannot quietly carry real data under prototype controls.

---

## D-16 · Error propagation

```mermaid
flowchart TD
  E1[Zod failure] --> MAP[toErrorResponse]
  E2[ForbiddenError] --> MAP
  E3[NotFoundError] --> MAP
  E4[InvalidTransition] --> MAP
  E5[ConflictError] --> MAP
  E6[RateLimitError] --> MAP
  E7[MlUnavailableError] --> MAP
  E8[MlTimeoutError] --> MAP
  E9[Unhandled] --> MAP
  MAP --> LOG[Server log: requestId + full detail]
  MAP --> RESP[Client: code · safe message · field · requestId]
  RESP --> UI{UI handling}
  UI --> I1[400 → inline field message]
  UI --> I2[403 → permission notice]
  UI --> I3[404 → not-found state]
  UI --> I4[409 → conflict, refetch]
  UI --> I5[429 → countdown]
  UI --> I6[503 → degraded panel, no numbers]
  UI --> I7[504 → timeout, retry]
```

One mapping function is the only place an error becomes a response, which is how NFR-13 is guaranteed rather than reviewed.
