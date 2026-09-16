# CI / CD — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Platform | GitHub Actions |
| Related | `architecture/deployment-architecture.md` §6, `engineering/release-process.md` |

---

## 1. Pipeline

```
push / PR
  │
  ├─ 1  lint            ESLint · Prettier · Ruff · Black
  ├─ 2  typecheck       tsc --noEmit · mypy (engine strict)
  ├─ 3  unit            Vitest · pytest -m unit
  ├─ 4  migrations      drizzle-kit migrate against a clean database
  ├─ 5  integration     Vitest + real Postgres · pytest -m contract
  ├─ 6  security        dependency audit · secret scan · no-hardcode scan
  ├─ 7  build           web bundle (budget check) · ML image
  ├─ 8  preview         Vercel preview + Render preview + Neon branch
  ├─ 9  e2e             Playwright
  ├─ 10 accessibility   axe-core across 8 routes
  ├─ 11 performance     k6 + Lighthouse CI
  │
  └─ [main only] ─▶ deploy ML ─▶ deploy web ─▶ smoke ─▶ record release
```

Ordering is deliberate: cheapest and fastest signal first. Lint and typecheck complete in under a minute, so a trivially broken PR fails in sixty seconds rather than after an eight-minute E2E run.

---

## 2. Gate Definitions

| # | Gate | Fails on | Typical |
|---|---|---|---|
| 1 | Lint | Any error; warnings allowed except the security rules | 40 s |
| 2 | Typecheck | Any TS error; any mypy error in `app/engine/**` | 50 s |
| 3 | Unit | Any failure; coverage below the per-area gates | 45 s |
| 4 | Migrations | Migration failure on a clean database | 30 s |
| 5 | Integration | Any failure | 2 min |
| 6 | Security | High/critical advisory · detected secret · hard-coded model value | 1 min |
| 7 | Build | Build failure · any route over its bundle budget | 2 min |
| 8 | Preview | Deployment failure · health not green within 3 min | 3 min |
| 9 | E2E | Any failure; a retry-pass is reported as a flake and tracked | 4 min |
| 10 | Accessibility | Any `critical` or `serious` axe violation | 1 min |
| 11 | Performance | Any p95 budget breach | 3 min |

Total on the critical path: roughly 18 minutes.

### 2.1 The three project-specific scans in gate 6

| Scan | Catches |
|---|---|
| `no_hardcode_check.sh` | A hotspot name or risk literal in `apps/web` (TC-INT-010, TC-FAB-001) |
| Prohibited-phrase scan | "official", "endorsed", "guaranteed recovery" in rendered text (TC-UX-012) |
| Terminology scan | "criminal", "fraudster", "offender" in UI copy (TC-UX-013) |

These exist because they catch the failure modes that are cheapest to introduce and most expensive to discover in front of an evaluator.

---

## 3. Gate Requirements by Destination

| Destination | Required gates |
|---|---|
| **PR merge to `main`** | 1–11, all green. One approving review. Branch current with `main`. |
| **Preview deployment** | 1–7 |
| **Production deployment** | All of the above, plus phase exit criteria and a green smoke suite after deploy |
| **Hotfix during the finale** | 1, 2, 3, and targeted E2E. Full suite runs immediately afterwards. |

The hotfix path is narrow on purpose: during a 36-hour finale, an eighteen-minute pipeline between a broken demonstration and its fix is not acceptable, but neither is an unvalidated deploy. The compromise is a reduced gate set plus mandatory follow-up validation before the next evaluation session.

---

## 4. Workflow Structure

```yaml
name: ci
on: { push: { branches: [main] }, pull_request: {} }
concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }

jobs:
  static:        # lint + typecheck, both workspaces in parallel
  unit:          { needs: static }
  migrations:    { needs: static, services: { postgres: { image: postgres:16 } } }
  integration:   { needs: [unit, migrations] }
  security:      { needs: static }
  build:         { needs: [integration, security] }
  preview:       { needs: build, if: github.event_name == 'pull_request' }
  e2e:           { needs: preview }
  a11y:          { needs: preview }
  perf:          { needs: preview }
  deploy:        { needs: [e2e, a11y, perf], if: github.ref == 'refs/heads/main' }
```

`e2e`, `a11y` and `perf` run in parallel against the same preview, which recovers roughly five minutes over running them in sequence.

`concurrency` with `cancel-in-progress` matters on a six-person team pushing frequently — without it, superseded runs consume the free-tier minutes that the current run needs.

---

## 5. Database in CI

| Job | Database |
|---|---|
| Migrations | `postgres:16` service container, empty |
| Integration | Same container, seeded per test file inside a rolled-back transaction |
| Preview / E2E | Neon branch created from the primary, seeded with corpus 26184, destroyed on merge |

A Neon branch per PR is what makes destructive E2E tests safe — alert dispatch, demo reset and investigation transitions all write, and none of them can touch another PR's data or the primary.

---

## 6. Deployment Jobs

```yaml
deploy:
  steps:
    - name: Deploy ML service           # FIRST — always
      run: ./scripts/deploy-ml.sh ${{ github.sha }}
    - name: Wait for ML health
      run: ./scripts/wait-healthy.sh "$ML_URL/health" 120
    - name: Deploy web
      run: vercel deploy --prod --token ${{ secrets.VERCEL_TOKEN }}
    - name: Smoke suite
      run: pnpm test:smoke --base-url "$PROD_URL"
    - name: Verify model version
      run: ./scripts/verify-model-version.sh "$PROD_URL" "CyberPulse-Demo-v1"
```

Two steps here are specific to this system.

**ML first, with a health wait.** The web application degrades gracefully when the ML service is absent; the reverse — a web build expecting a response shape the deployed service does not produce — fails schema validation on every prediction.

**Model version verification.** The final step asserts that the version reported by the deployed stack matches the expected string. Because artefacts are baked into the image, a mismatch here means the wrong image was promoted, which is exactly the kind of error that otherwise surfaces mid-demonstration.

---

## 7. Caching

| Cache | Key |
|---|---|
| pnpm store | `pnpm-lock.yaml` hash |
| Next.js build | Lockfile + source hash |
| pip wheels | `requirements.txt` hash |
| Playwright browsers | Playwright version |
| Docker layers | Registry-backed layer cache |

Docker layer caching is the highest-value one: the ML image's dependency layer rebuilds only when `requirements.txt` changes, which turns a three-minute image build into forty seconds on most runs.

---

## 8. Secrets

| Secret | Scope |
|---|---|
| `DATABASE_URL` (preview and production) | Environment-scoped |
| `NEON_API_KEY` | Branch management |
| `VERCEL_TOKEN` | Web deployment |
| `RENDER_API_KEY` | ML deployment |

Rules: environment-scoped, never printed, never interpolated into a log line, never available to a workflow triggered by a fork. A secret scanner runs in gate 6 against the diff and the built bundle.

---

## 9. Failure Handling

| Failure | Behaviour |
|---|---|
| Any gate fails | Merge blocked; the failing job's log is the output |
| E2E flakes (retry-pass) | Merge allowed, flake recorded; three flakes in a week quarantines the test |
| Preview deployment fails | Merge blocked — a change that cannot deploy is not mergeable |
| Production smoke fails | Automatic web rollback; ML rollback is manual and documented |
| Neon branch limit reached | Oldest merged branch pruned automatically |

---

## 10. Scheduled Jobs

| Job | Schedule | Purpose |
|---|---|---|
| Dependency audit | Daily | Surfaces a new advisory before it blocks a release |
| Production smoke | Hourly | Detects a silent dependency failure between deployments |
| ML keep-warm | Every 15 min | Prevents free-tier spin-down (RSK-02) |
| Neon branch prune | Daily | Stays within tier limits |

The keep-warm job is an infrastructure workaround for a cost decision, and it is documented as such in `ai/cost-optimization.md` §2.1.
