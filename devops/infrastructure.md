# INFRASTRUCTURE — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Model | Three managed services, no owned servers, no orchestrator |
| Related | `architecture/deployment-architecture.md`, `devops/environments.md` |

---

## 1. Inventory

| Component | Provider | Tier | Purpose |
|---|---|---|---|
| Web application | Vercel | Hobby | Next.js SSR + route handlers |
| ML service | Render / Railway / Fly.io | Free (paid recommended) | FastAPI inference |
| Database | Neon | Free | PostgreSQL 16 |
| Map tiles | Public OSM-compatible vector tiles | — | Basemap |
| CI | GitHub Actions | Free | Build, test, deploy |
| Container registry | GitHub Container Registry | Free | ML image |

Six entries, three of which run code. That is the whole estate.

---

## 2. Why This Shape

The instinct on a project like this is to reach for Kubernetes, a message broker and a cache tier. Each would be defensible at scale and each is wrong here, for the same reason: **every additional component is another thing that can fail during a three-minute evaluation.**

| Not used | Would add | Value at this scale |
|---|---|---|
| Kubernetes | Orchestration for three containers | None |
| Message broker | A live failure mode | None — the "stream" is a UI simulation |
| Redis | A cache-coherence path for prediction values | Negative — see `architecture/system-design.md` §7 |
| Load balancer | A hop | None at 20 concurrent users |
| Object storage | A dependency | Nothing to store |
| Service mesh | Observability we already have | None |

The one genuine complexity — a second runtime for Python — exists because XGBoost and SHAP are Python and there is no honest way around that (ADR-009).

---

## 3. Web Tier

| Property | Value |
|---|---|
| Runtime | Node 20, Vercel serverless functions |
| Regions | Single (`bom1` preferred for Indian latency) |
| Build | `pnpm build`, standalone output |
| Environment | `DATABASE_URL`, `ML_SERVICE_URL`, `NEXT_PUBLIC_*` |
| Scaling | Automatic per request |
| Limits | 10 s function timeout — above the 8 s ML timeout, deliberately |

The function timeout sitting above the ML client timeout means an ML timeout surfaces as a typed `TIMEOUT` error rather than as a platform-level function kill, which would produce an untyped 504 with no request correlation.

---

## 4. ML Tier

| Property | Value |
|---|---|
| Runtime | Python 3.11 in a container |
| Resources | 512 MB, 0.5 vCPU (free); 1 GB, 1 vCPU recommended |
| Workers | 1 uvicorn worker on the free tier (`render.yaml`; the free 512 MB fits one process); `docker/Dockerfile.ml` defaults to 2 for larger instances |
| Artefacts | Baked into the image, mounted read-only |
| Health | `GET /health`, 15 s interval, 20 s start period |
| Networking | Origin allow-listed to the web deployment; not publicly routable |
| Scaling | Vertical first; horizontal replicas beyond ~30 concurrent predictions |

**Artefacts baked into the image** is the decision that makes the model version a property of the image tag. There is no runtime fetch, no mounted volume in production, and therefore no state in which the running model and the reported `model_version` disagree.

### Cold start

The free tier spins down after ~15 minutes idle; a cold start costs 5–20 seconds. Mitigations are listed in `ai/cost-optimization.md` §2.1. The recommendation stands: roughly ₹600/month for an always-on instance removes the highest-likelihood operational risk in the project.

---

## 5. Database Tier

| Property | Value |
|---|---|
| Engine | PostgreSQL 16 (Neon serverless) |
| Connection | Pooled endpoint, `sslmode=require` |
| Branching | Not automated: CI tests against a `postgres:16` service container; production is the Neon `cyberpulse` project's main branch |
| Extensions | None required; PostGIS optional and never assumed (ASM-07) |
| Backup | Point-in-time restore within the tier's retention |
| Scaling | Vertical; partitioning and replicas documented at 10× (`architecture/scalability.md`) |

Connection pooling is mandatory rather than optional. Serverless functions open connections per invocation, and the free tier's connection limit is reached quickly without the pooled endpoint — a failure that appears under load as intermittent 503s rather than as an obvious misconfiguration.

---

## 6. Networking

```
Browser ──HTTPS──▶ Vercel edge ──▶ Node runtime
                                     ├──HTTPS──▶ ML service (origin allow-listed)
                                     └──TLS────▶ Neon pooled endpoint

Browser ──HTTPS──▶ Tile provider        (tiles only; no application data)
```

The browser reaches exactly two hosts: the application and the tile provider. It cannot reach the ML service or the database, which removes an entire class of exposure without any additional control.

---

## 7. Local Infrastructure

Docker Compose reproduces the identical topology: `postgres:16-alpine`, the ML container with models mounted read-only, and the web container. Parity is a requirement (CON-04), not a convenience — the local stack is the documented fallback when venue connectivity fails during evaluation.

---

## 8. Configuration

All configuration is environment variables, validated at startup with a Zod schema. The application refuses to boot on a missing or malformed variable rather than failing at first use — a deployment that is going to fail should fail immediately and loudly.

```bash
DATABASE_URL=                      # required, must parse as a postgres URL
ML_SERVICE_URL=                    # required, must parse as an http(s) URL
NEXT_PUBLIC_MAP_TILE_URL=          # required
NEXT_PUBLIC_APP_NAME=CyberPulse AI
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_ANALYTICS_ENABLED=true
DATA_SEED=26184
MODEL_DIR=./models                 # ML service only
LOG_LEVEL=info
```

No secret carries a `NEXT_PUBLIC_` prefix, and the build asserts that no `NEXT_PUBLIC_*` value matches a secret pattern (TC-SEC-003).

---

## 9. Cost

| Component | Monthly |
|---|---|
| Vercel Hobby | ₹0 |
| ML free tier | ₹0 |
| Neon free tier | ₹0 |
| Tiles, CI, registry | ₹0 |
| **Total** | **₹0** |
| *Recommended: always-on ML* | *~₹600* |

---

## 10. Limits and Their Symptoms

| Limit | Symptom | Response |
|---|---|---|
| ML spin-down | First prediction 5–20 s | Keep-warm job; paid instance |
| Neon compute hours | Throttling | Monitor; upgrade |
| Neon branch count | Branch creation fails | Daily prune job |
| Vercel build minutes | Builds queue | Cache aggressively |
| Function timeout 10 s | 504 on a slow prediction | ML timeout at 8 s keeps this unreachable |
| Tile provider rate limit | Basemap fails | Bundled India outline fallback |

Each row names the observable symptom rather than only the limit, because during an evaluation the symptom is what someone will see first.

---

## 11. Infrastructure as Code

The estate is small enough that provisioning is documented rather than automated: `docker-compose.yml` for local, `render.yaml` for the ML service, Vercel project settings in the dashboard (root `apps/web`), and the Neon project created by hand.

Terraform for three managed services would be more code to maintain than the services it describes. At 10× — multiple replicas, partitioned database, multiple environments — that trade reverses, and the recommendation changes with it.
