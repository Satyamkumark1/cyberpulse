# DEPLOYMENT ARCHITECTURE — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Environments | local · preview · production (demo) |
| Related | `devops/infrastructure.md`, `devops/environments.md`, `devops/deployment-checklist.md` |

---

## 1. Topology

```mermaid
graph TB
  subgraph Client
    B[Browser]
  end
  subgraph "Vercel — Next.js"
    NX[SSR + Route Handlers<br/>Node 20 runtime]
  end
  subgraph "Render / Railway / Fly.io"
    ML[FastAPI container<br/>Python 3.11 · 512 MB · 2 workers]
  end
  subgraph Neon
    PG[(PostgreSQL 16<br/>pooled endpoint)]
  end
  subgraph "Tiles (public)"
    T[Vector tile provider]
  end

  B -->|HTTPS| NX
  B -.->|tiles only| T
  NX -->|HTTPS, allow-listed origin| ML
  NX -->|TLS, pooled| PG
```

Three deployables, one database, no shared filesystem, and no required message broker or cache tier. An optional Redis container can share geographic cache entries and rate-limit buckets. The ML service is reachable only from the Next.js runtime; it is not exposed to the browser.

---

## 2. Environments

| | local | preview | production (demo) |
|---|---|---|---|
| Web | `next dev` on :3000 | Vercel preview per PR | Vercel production |
| ML | Docker container on :8000 | Render preview service | Render service, always-on |
| Database | Postgres container on :5432 | Neon branch per PR | Neon primary |
| Data | Seed 26184 | Seed 26184 | Seed 26184 |
| `NEXT_PUBLIC_DEMO_MODE` | true | true | true |
| Model | Locally trained | Artefact from CI | Artefact from CI, version pinned |
| Purpose | Development | Review and E2E | Evaluation and demonstration |

Every environment uses the same seed. That is what makes a defect reproducible from a preview URL to a laptop without a data-difference hypothesis.

**Neon branching** gives each PR an isolated database branched from the primary, which is why preview environments can run destructive E2E tests (alert dispatch, demo reset) without coordination.

---

## 3. Local Development

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: cyberpulse
      POSTGRES_PASSWORD: cyberpulse
      POSTGRES_DB: cyberpulse
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cyberpulse"]
      interval: 5s
      retries: 10

  ml-service:
    build: { context: ., dockerfile: docker/Dockerfile.ml }
    ports: ["8000:8000"]
    environment:
      MODEL_DIR: /app/models
      LOG_LEVEL: info
    volumes: ["./apps/ml-service/models:/app/models:ro"]
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request;urllib.request.urlopen('http://localhost:8000/health')"]
      interval: 10s
      retries: 6

volumes: { pgdata: }
```

The model artefact directory is mounted **read-only**. The service can load a model; it can never write one. A training run that accidentally targeted a running service would fail rather than silently swap the artefact underneath it.

### 3.1 One-command setup

```bash
make setup     # compose up -d, wait for health, migrate, generate, signal_check,
               # pii_scan, seed, train, evaluate
make dev       # web dev server + ml service with reload
make verify    # lint, typecheck, unit, integration, e2e
```

`make setup` is the command `README.md` promises and TC-DOC-001 times against the 30-minute NFR-17 budget.

---

## 4. Container Images

**`docker/Dockerfile.ml`** — multi-stage. Builder installs from `requirements.txt` into a virtualenv; runtime copies the venv and application, runs as a non-root user, and bakes the model artefacts into the image so that a container start needs no external fetch.

```dockerfile
FROM python:3.11-slim AS builder
WORKDIR /build
COPY apps/ml-service/requirements.txt .
RUN python -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim AS runtime
RUN useradd --create-home --uid 10001 appuser
COPY --from=builder /opt/venv /opt/venv
WORKDIR /app
COPY apps/ml-service/app ./app
COPY apps/ml-service/models ./models
ENV PATH=/opt/venv/bin:$PATH MODEL_DIR=/app/models PYTHONUNBUFFERED=1
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request;urllib.request.urlopen('http://localhost:8000/health')"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

Baking the artefacts means the deployed model version is a property of the image tag. There is no scenario in which the running service and the recorded `model_version` disagree.

**No web image.** The web app runs from source locally (`make dev`) and Vercel builds it from source in production; the web Dockerfile was removed (DEC-015).

---

## 5. Environment Variables

`.env.example` is the only committed environment file.

```bash
# Database
DATABASE_URL=postgres://user:password@host/db?sslmode=require

# ML service
ML_SERVICE_URL=http://localhost:8000

# Map
NEXT_PUBLIC_MAP_TILE_URL=https://demotiles.maplibre.org/style.json

# Application
NEXT_PUBLIC_APP_NAME=CyberPulse AI
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_ANALYTICS_ENABLED=true

# Data
DATA_SEED=26184

# ML service only
MODEL_DIR=./models
LOG_LEVEL=info
```

Rules: no secret carries a `NEXT_PUBLIC_` prefix, and a build check asserts that no `NEXT_PUBLIC_*` value matches a secret pattern; startup validates the environment with a Zod schema and refuses to boot on a missing or malformed variable, rather than failing at first use.

---

## 6. Deployment Pipeline

```
push / PR
   │
   ├─▶ lint · typecheck
   ├─▶ unit (Vitest + pytest)
   ├─▶ migrations against a clean database
   ├─▶ integration tests
   ├─▶ security scan (dependencies + secrets)
   ├─▶ build (web bundle budget check · ML image)
   ├─▶ deploy preview (Vercel preview + Render preview + Neon branch)
   ├─▶ E2E (Playwright) + accessibility (axe) against the preview
   ├─▶ performance (k6 + Lighthouse) against the preview
   └─▶ [main only] promote to production ─▶ smoke suite ─▶ notify
```

Gate detail is in `devops/ci-cd.md`. Two properties matter here: **the ML image and the web build are produced from the same commit**, and **promotion deploys the artefacts that passed the gates** rather than rebuilding.

### 6.1 Ordering constraint

The ML service deploys **before** the web application on every release. The web application tolerates an unavailable ML service by design (degraded mode); the reverse — a web build expecting a response shape the deployed service does not produce — would surface as validation failures in the ML client. Deploying the producer first keeps the contract satisfied throughout the window.

---

## 7. Rollback

| Component | Mechanism | Target |
|---|---|---|
| Web | Vercel instant rollback to the previous deployment | < 1 min |
| ML service | Redeploy the previous image tag | < 5 min |
| Database | Forward-fix; additive migrations make rollback rarely necessary | Case-by-case |
| Model | Redeploy the image carrying the previous artefact; `model_version` changes with it | < 5 min |

Migrations are additive-first precisely so that a web rollback never strands the database in an incompatible shape. A destructive migration requires a decision-log entry, which is the point at which someone is forced to think about the rollback path.

---

## 8. Observability in Deployment

| Signal | Source | Where |
|---|---|---|
| Application logs | Structured JSON | Vercel logs |
| ML logs | Structured JSON with `x-request-id` | Host logs |
| Health | `GET /api/health` composing all three components | Settings panel and uptime check |
| ML metrics | `GET /metrics` | Scraped or inspected manually |
| Request correlation | `x-request-id` from the edge through to the ML service and back | All logs |

An uptime check polls `/api/health` every 60 seconds. During the evaluation window it also serves as the warm-up mechanism for the ML service, which is a deliberate double use of a monitoring probe.

---

## 9. Demonstration-Day Runbook

The deployment concern that most affects the project's actual outcome.

| # | Step | Timing |
|---|---|---|
| 1 | Verify `/api/health` reports all three components `up` | T−60 min |
| 2 | Run the smoke suite against production | T−45 min |
| 3 | Execute one full `/demo` run to warm the ML service and the query caches | T−30 min |
| 4 | `POST /api/demo/reset` | T−25 min |
| 5 | Confirm complaint `C-10284` is present and analysable | T−20 min |
| 6 | Confirm the model version in Settings reads `CyberPulse-Demo-v1` | T−20 min |
| 7 | Keep a browser tab open on `/api/health` to hold the service warm | Throughout |
| 8 | Reset between evaluators | Between runs |
| 9 | Fallback: `make dev` on the presenting laptop — Postgres and ML in Docker Compose, web from source | Standing by |

Step 9 is the one that matters when venue connectivity fails. The same three components run locally with no managed service, which is why local parity is a requirement (CON-04) rather than a developer convenience.

---

## 10. Deployment Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| ML cold start during evaluation | High | High | Warm-up ping, health polling, T−30 rehearsal run |
| Venue network failure | Medium | Critical | Full local stack on the presenting laptop |
| Free-tier database connection limits | Medium | High | Pooled endpoint; connection reuse; limits verified under k6 |
| Tile provider unavailable | Low | Medium | Bundled India outline fallback with a visible notice |
| Model artefact absent from the image | Low | Critical | Image build asserts artefact presence; `/health` reports `modelLoaded` |
| Migration failure on promote | Low | High | Migrations run against a clean database in CI on every PR |
| Wrong model version deployed | Low | High | Version baked into the image; surfaced in Settings and on every prediction |
