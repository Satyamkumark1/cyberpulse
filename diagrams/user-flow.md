# DIAGRAM — USER FLOW

Narrative versions of these flows are in `product/user-flows.md`; screen-level detail is in `ux/user-flow.md`. This document is the diagram index.

---

## D-40 · Navigation map

```mermaid
graph TD
  D[/dashboard/] --> C[/complaints/]
  D --> M[/risk-map/]
  D --> AL[/alerts/]
  D --> DEMO[/demo/]
  C --> CD[/complaints/:id/]
  CD --> G[Money-trail graph]
  CD --> AM[Alert modal]
  M --> DR[Hotspot drawer]
  DR --> CD
  DR --> AM
  T[/transactions/] --> TD[/transactions/:id/]
  TD --> G
  I[/investigations/] --> ID[/investigations/:id/]
  ID --> G
  ID --> AM
  AL --> AD[/alerts/:id/]
  AD --> ID
  R[/reports/]
  S[/settings/]
  AM --> AD

  style D fill:#E3EDFB,stroke:#1B5FBF
  style DEMO fill:#DDF2F4,stroke:#0E7C86
```

No destination is more than two levels deep. The alert modal is reachable from three contexts — complaint detail, hotspot drawer and investigation — because the decision to act arrives from all three.

---

## D-41 · Critical path (five interactions)

```mermaid
journey
  title Complaint to dispatched alert
  section Locate
    Open complaints list: 4: Officer
    Click the row: 5: Officer
  section Analyse
    Click Analyze Complaint: 5: Officer
    Read risk, location, window: 5: Officer
    Expand factors: 4: Officer
  section Verify
    Open money-trail graph: 4: Officer
    Cross-check reasoning: 5: Officer
  section Act
    Click Generate Alert: 5: Officer
    Select recipients: 4: Officer
    Click Send Alert: 5: Officer
  section Confirm
    See SENT on dashboard and alerts: 5: Officer
    Bank acknowledges: 4: Bank Officer
```

Five of these are interactions that advance the task; the rest are reading and verification. The count of five is a design constraint — a sixth requires a decision-log entry.

---

## D-42 · Demonstration flow

```mermaid
stateDiagram-v2
  [*] --> PreWarm
  PreWarm --> Step1: service warm
  Step1: Complaint C-10284
  Step1 --> Step2
  Step2: Money-trail graph
  Step2 --> Step3
  Step3: AI analysis (real POST /api/predict)
  Step3 --> Step4: success
  Step3 --> Degraded: service unavailable
  Step4: Hotspot highlighted on map
  Step4 --> Step5
  Step5: SHAP explanation
  Step5 --> Step6
  Step6: Alert dispatched
  Step6 --> Reset
  Degraded: Notice — prediction service unavailable\nNo numbers rendered
  Degraded --> Reset
  Reset --> Step1
  Reset --> [*]
```

The degraded branch is drawn because it is a designed state, not an accident. A demonstration that cannot fail honestly is a demonstration nobody should trust.

---

## D-43 · Investigation state machine

```mermaid
stateDiagram-v2
  [*] --> New
  New --> Analyzing
  Analyzing --> UnderReview
  UnderReview --> AlertSent: automatic on dispatch
  AlertSent --> Monitoring
  Monitoring --> Resolved: closure note required
  UnderReview --> Analyzing: backward, note required
  AlertSent --> UnderReview: backward, note required
  Monitoring --> AlertSent: backward, note required
  Resolved --> [*]

  note right of Resolved
    Any transition not drawn here
    returns 409 INVALID_TRANSITION.
    Backward moves are limited to
    one step and require a note.
  end note
```

---

## D-44 · Role-scoped request handling

```mermaid
flowchart TD
  R[Request] --> V{Zod valid?}
  V -- no --> E400[400 VALIDATION_ERROR + field]
  V -- yes --> RL{Within rate limit?}
  RL -- no --> E429[429 + Retry-After]
  RL -- yes --> CAP{Role has this capability?}
  CAP -- no --> E403[403 FORBIDDEN]
  CAP -- yes --> SC{Object in role's scope?}
  SC -- no --> E404[404 NOT_FOUND<br/>deliberately not 403]
  SC -- yes --> EX[Service executes]
  EX --> PRIV{Privileged action?}
  PRIV -- yes --> AUD[Audit event in the same transaction]
  PRIV -- no --> OK[Respond]
  AUD --> OK
```

The 404-not-403 branch is deliberate: a 403 would confirm the object exists, which is an information leak in an enforcement context.

---

## D-45 · Error recovery from the user's perspective

```mermaid
flowchart LR
  A[Action] --> B{Outcome}
  B -->|Success| S[Result rendered + announced]
  B -->|Field invalid| F[Inline message naming the field<br/>previous data retained]
  B -->|Not permitted| P[Permission notice<br/>no data in the message]
  B -->|Not found| N[Not-found state with a route back]
  B -->|Conflict| C[Conflict notice + refetch]
  B -->|Rate limited| R[Countdown, modal retained]
  B -->|Service unavailable| D[Degraded panel<br/>capability named · no numbers · retry]
  B -->|Timeout| T[Timeout message + retry]
  B -->|Offline| O[Offline notice, automatic retry with backoff]

  style D fill:#FDF2E2,stroke:#C97A0E
```

Across every branch the user is never shown a blank screen, a raw stack trace, or a number the system did not compute.

---

## D-46 · Developer first-run

```mermaid
flowchart TD
  A[git clone] --> B[cp .env.example .env]
  B --> C[make setup]
  C --> D[compose up · wait for health]
  D --> E[db:migrate]
  E --> F[generate:data seed 26184]
  F --> G{signal_check}
  G -- fail --> G1[Abort: patterns not detectable]
  G -- pass --> H{pii_scan}
  H -- fail --> H1[Abort: seeding blocked]
  H -- pass --> I[db:seed · verify SHA-256]
  I --> J[train:model]
  J --> K{metric gates}
  K -- fail --> K1[Abort: below gate]
  K -- pass --> L[make dev]
  L --> M[Open /dashboard · RUN DEMO SCENARIO]

  style G1 fill:#FBEAE8,stroke:#C0392B
  style H1 fill:#FBEAE8,stroke:#C0392B
  style K1 fill:#FBEAE8,stroke:#C0392B
```

Timed against the 30-minute NFR-17 budget by TC-DOC-001.
