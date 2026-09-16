# DIAGRAM — SYSTEM ARCHITECTURE

All diagrams are Mermaid source so they render in GitHub, VS Code and most documentation tooling, and remain diffable in review.

---

## D-01 · Context (C4 Level 1)

```mermaid
graph TB
  subgraph Actors
    A1[Investigating Officer<br/>LEA]
    A2[I4C Analyst]
    A3[Bank Nodal Officer]
    A4[Platform Administrator]
  end

  SYS[CyberPulse AI<br/>Predictive Cyber-Fraud<br/>Intelligence Platform]

  subgraph "Connected in v1.0"
    TILES[Map tile provider]
  end

  subgraph "Not connected — adapter boundary only"
    NCRP[NCRP / CFCFRMS]:::oos
    BANK[Bank CBS / NPCI]:::oos
    OUT[Alert delivery channels]:::oos
  end

  A1 --> SYS
  A2 --> SYS
  A3 --> SYS
  A4 --> SYS
  SYS -.-> TILES
  NCRP -.->|future| SYS
  BANK -.->|future| SYS
  SYS -.->|future| OUT

  classDef oos fill:#f4f4f4,stroke:#999,stroke-dasharray:4 4,color:#666
```

---

## D-02 · Containers (C4 Level 2)

```mermaid
graph TB
  B[Browser<br/>React 19]

  subgraph "Next.js application"
    UI[UI layer<br/>Server + Client Components]
    RH[Route handlers<br/>/app/api/**]
    SVC[Service layer<br/>9 modules]
    DAL[Data access<br/>Drizzle]
    MLC[ML client<br/>8s timeout]
  end

  subgraph "ML service — FastAPI"
    R[Routers]
    FE[features.py]
    RM[risk_model]
    TM[temporal_model]
    HE[hotspot_engine]
    SH[SHAP explainer]
  end

  DB[(PostgreSQL<br/>16 tables)]

  B --> UI
  B --> RH
  UI --> SVC
  RH --> SVC
  SVC --> DAL --> DB
  SVC --> MLC --> R
  R --> FE --> RM --> SH
  FE --> TM
  R --> HE
```

The two arrows from the browser are the point: server-rendered surfaces reach the service layer with no HTTP hop, while interactive surfaces go through route handlers. Both converge on one service layer.

---

## D-03 · Components inside the Next.js application

```mermaid
graph LR
  subgraph Presentation
    P1[DataTable]
    P2[PredictionPanel]
    P3[MapCanvas]
    P4[MoneyTrailGraph]
    P5[AlertModal]
    P6[Charts]
    P7[StatePanel]
    P8[RiskBadge]
  end
  subgraph Hooks
    H1[useComplaints]
    H2[usePrediction]
    H3[useHotspots]
    H4[useAlerts]
    H5[useHealth]
  end
  subgraph Services
    S1[complaintService]
    S2[transactionService]
    S3[predictionService]
    S4[hotspotService]
    S5[alertService]
    S6[investigationService]
    S7[reportService]
    S8[settingsService]
    S9[auditService]
  end
  DAL[(Drizzle)]
  ML[ML client]

  P1 --> H1 --> S1
  P2 --> H2 --> S3
  P3 --> H3 --> S4
  P5 --> H4 --> S5
  P4 --> S2
  P6 --> S7
  S3 --> ML
  S4 --> ML
  S5 --> S6
  S5 --> S9
  S6 --> S9
  S8 --> S9
  S1 --> DAL
  S2 --> DAL
  S3 --> DAL
  S4 --> DAL
  S5 --> DAL
  S6 --> DAL
  S7 --> DAL
  S8 --> DAL
  S9 --> DAL
```

Every arrow into `auditService` originates from a privileged action, and each of those calls passes a transaction handle.

---

## D-04 · ML service internals

```mermaid
graph TB
  IN[POST /predict] --> V[Pydantic validation]
  V --> FB[features.build_vector<br/>one row per candidate cell]
  FB --> AS{assert_schema}
  AS -- mismatch --> ERR[500 FEATURE_SCHEMA_MISMATCH]
  AS -- ok --> SC[risk_model.predict_proba<br/>batch over all candidates]
  SC --> HR[hotspot_engine.combined_score<br/>+ deterministic tie-break]
  HR --> TOP[Top-ranked cell]
  TOP --> TW[temporal_model<br/>12 × 2-hour bins]
  TOP --> SHP[TreeExplainer<br/>top cell only]
  SHP --> AGG[Aggregate 13 features → named factors<br/>normalise to 100%]
  TW --> RESP[Response]
  AGG --> RESP
  HR --> RESP
  SHP -- failure --> NOEXP[factors: [] · explanationAvailable: false]
  NOEXP --> RESP
```

Note the SHAP failure edge: the prediction still returns, but it is never described as explained.

---

## D-05 · Layer boundaries and forbidden edges

```mermaid
graph TB
  C[Components]
  RHx[Route handlers]
  S[Services]
  D[Data access]
  M[ML client]
  DBx[(Database)]
  MLS[ML service]

  C -->|allowed| S
  RHx -->|allowed| S
  S -->|allowed| D --> DBx
  S -->|allowed| M --> MLS

  C -.->|FORBIDDEN — ESLint| D
  C -.->|FORBIDDEN — ESLint| M
  RHx -.->|FORBIDDEN — review| D
  S -.->|FORBIDDEN — types| RHx

  linkStyle 6,7,8,9 stroke:#c0392b,stroke-width:2px,stroke-dasharray:5 5
```

The four red edges are the ones that are mechanically prevented rather than merely discouraged (`architecture/low-level-design.md` §7).
