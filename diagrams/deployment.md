# DIAGRAM — DEPLOYMENT

---

## D-30 · Production (demonstration) topology

```mermaid
graph TB
  subgraph Internet
    U[Evaluators · Officers]
    T[Vector tile provider]
  end

  subgraph "Vercel"
    EDGE[Edge — TLS, headers, x-request-id]
    NODE[Node 20 runtime<br/>SSR + route handlers]
  end

  subgraph "Container host — Render / Railway / Fly"
    MLS[FastAPI<br/>Python 3.11 · 2 workers · 512 MB<br/>artefacts baked into the image]
  end

  subgraph "Neon"
    POOL[Pooled endpoint]
    PG[(PostgreSQL 16)]
  end

  U -->|HTTPS| EDGE --> NODE
  U -.->|tiles only, browser| T
  NODE -->|HTTPS, origin allow-listed| MLS
  NODE -->|TLS| POOL --> PG
```

The browser never reaches the ML service or the database. Its only direct external dependency is the tile provider, and that has a bundled fallback.

---

## D-31 · Local development

```mermaid
graph TB
  DEV[Developer browser :3000]
  subgraph "Docker Compose"
    WEB[web — next dev :3000]
    ML[ml-service :8000<br/>models mounted read-only]
    PGL[(postgres:16-alpine :5432)]
  end
  DEV --> WEB
  WEB -->|http://ml-service:8000| ML
  WEB -->|postgres://…@postgres:5432| PGL
  ML -.->|reads only| MODELS[/apps/ml-service/models/]
```

Identical topology to production, which is what makes the local stack a viable fallback if venue connectivity fails (`architecture/deployment-architecture.md` §9 step 9).

---

## D-32 · CI/CD pipeline

```mermaid
flowchart TD
  PR[Push / PR] --> L[Lint · typecheck]
  L --> U[Unit — Vitest + pytest]
  U --> MIG[Migrations against a clean DB]
  MIG --> INT[Integration tests]
  INT --> SEC[Dependency + secret scan]
  SEC --> BLD[Build — web bundle budget · ML image]
  BLD --> PRV[Deploy preview<br/>Vercel preview + Render preview + Neon branch]
  PRV --> E2E[Playwright E2E]
  PRV --> A11Y[axe-core accessibility]
  PRV --> PERF[k6 + Lighthouse]
  E2E --> GATE{All gates green?}
  A11Y --> GATE
  PERF --> GATE
  GATE -- no --> FAIL[Block merge]
  GATE -- yes --> MERGE[Merge to main]
  MERGE --> DML[Deploy ML service FIRST]
  DML --> DWEB[Deploy web]
  DWEB --> SMOKE[Smoke suite]
  SMOKE --> DONE[Release recorded in CHANGELOG]

  style FAIL fill:#FBEAE8,stroke:#C0392B
  style DML fill:#FDF2E2,stroke:#C97A0E
```

The ML service deploys first on every release. The web application tolerates an absent ML service by design; the reverse would break the response contract mid-window.

---

## D-33 · Environment isolation

```mermaid
graph LR
  subgraph local
    LW[next dev] --> LP[(postgres container)]
    LW --> LM[ml container]
  end
  subgraph "preview — per PR"
    PW[Vercel preview] --> PB[(Neon branch)]
    PW --> PM[Render preview]
  end
  subgraph "production — demo"
    RW[Vercel production] --> RP[(Neon primary)]
    RW --> RM[Render service]
  end

  SEED[Seed 26184] --> LP
  SEED --> PB
  SEED --> RP
```

All three environments carry the same seed. A defect reproduced on a preview URL reproduces on a laptop without a data-difference hypothesis.

---

## D-34 · Failure and fallback paths in deployment

```mermaid
flowchart TD
  A{ML service reachable?}
  A -- no --> A1[503 ML_UNAVAILABLE<br/>degraded panel · no numbers · retry]
  A -- cold --> A2[health = degraded<br/>progress shown · warm-up ping]
  A -- yes --> B{Database reachable?}
  B -- no --> B1[Retry with backoff<br/>health = degraded · prior data retained]
  B -- yes --> C{Tile provider reachable?}
  C -- no --> C1[Bundled India outline GeoJSON<br/>notice shown · data layers still render]
  C -- yes --> D{WebGL available?}
  D -- no --> D1[Accessible table becomes primary view]
  D -- yes --> E[Full experience]

  style A1 fill:#FBEAE8,stroke:#C0392B
  style B1 fill:#FDF2E2,stroke:#C97A0E
  style C1 fill:#FDF2E2,stroke:#C97A0E
  style D1 fill:#E3EDFB,stroke:#1B5FBF
  style E fill:#E6F4EC,stroke:#1F7A47
```

No branch ends in a blank screen, a stack trace, or a fabricated value.

---

## D-35 · Rollback paths

```mermaid
flowchart LR
  subgraph "Detected after release"
    D1[Web defect] --> R1[Vercel instant rollback<br/>< 1 min]
    D2[ML defect] --> R2[Redeploy previous image tag<br/>< 5 min]
    D3[Model regression] --> R3[Previous image = previous artefact<br/>model_version changes with it]
    D4[Migration issue] --> R4[Forward-fix<br/>additive migrations make rollback rare]
  end
```

Because artefacts are baked into the image, rolling back the ML service rolls back the model, and the `model_version` surfaced in Settings and on every prediction changes with it. There is no state in which the running model and the reported version disagree.

---

## D-36 · Demonstration-day sequence

```mermaid
gantt
  title Demonstration-day runbook
  dateFormat HH:mm
  axisFormat %H:%M
  section Preparation
  Health check all components   :done, h1, 09:00, 5m
  Smoke suite against production:done, h2, 09:15, 10m
  Full /demo warm-up run        :done, h3, 09:30, 5m
  Demo reset                    :done, h4, 09:35, 2m
  Verify C-10284 + model version:done, h5, 09:40, 5m
  section Standby
  Health tab held open          :active, s1, 09:45, 135m
  Local Docker stack on standby :active, s2, 09:45, 135m
  section Evaluation
  Evaluator 1                   :e1, 10:00, 10m
  Reset                         :r1, after e1, 2m
  Evaluator 2                   :e2, after r1, 10m
  Reset                         :r2, after e2, 2m
```
