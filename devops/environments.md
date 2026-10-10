# ENVIRONMENTS — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Environments | local · preview (per PR) · production (demonstration) |
| Related | `architecture/deployment-architecture.md` §2, `devops/infrastructure.md` |

---

## 1. There Is No Staging

Three environments, not four. A staging tier would sit between preview and production doing nothing that a Neon-branched preview does not already do — and in a three-week window it would mostly be a place where deployments queue.

Preview environments are full-fidelity: real Vercel deployment, real ML container, real Postgres on an isolated branch, seeded with the same corpus. That is what staging would have been, created per PR and destroyed on merge.

---

## 2. Comparison

| | local | preview | production |
|---|---|---|---|
| Web | `next dev` :3000 | Vercel preview URL | Vercel production |
| ML | Docker container :8000 | Render preview service | Render service |
| Database | `postgres:16-alpine` container | Neon branch from primary | Neon primary |
| Data | Seed 26184 | Seed 26184 | Seed 26184 |
| Model | Locally trained | Artefact from CI | Artefact from CI, version pinned |
| `NEXT_PUBLIC_DEMO_MODE` | `true` | `true` | `true` |
| Analytics | Enabled | **Disabled** during E2E | Enabled |
| Log level | `debug` | `info` | `info` |
| Lifetime | Developer's machine | PR open → merge | Permanent |
| Destructive tests | Yes | Yes | No |

**Same seed everywhere.** This is the single most useful property in the table: a defect reproduced on a preview URL reproduces on a laptop without anyone first having to rule out a data difference.

**Analytics disabled during E2E** so that automated runs do not pollute the measurement data the metrics in `product/success-metrics.md` are read from.

---

## 3. Local

```bash
git clone … && cd cyberpulse-ai
cp .env.example .env            # defaults work for Compose
make setup                      # compose up · migrate · generate · signal_check
                                # · pii_scan · seed · train · evaluate
make dev                        # web + ML with reload
```

| Variable | Local value |
|---|---|
| `DATABASE_URL` | `postgres://cyberpulse:cyberpulse@localhost:5432/cyberpulse` |
| `ML_SERVICE_URL` | `http://localhost:8000` |
| `LOG_LEVEL` | `debug` |
| `DATA_SEED` | `26184` |

`make setup` is what `README.md` promises and what TC-DOC-001 times against the 30-minute NFR-17 budget. It is also the venue-failure fallback: the same topology, running on the presenting laptop.

---

## 4. Preview

Created automatically on PR open.

```
PR opened
  ├─ Neon: branch `preview/pr-<n>` from primary
  ├─ Render: preview service from the PR's ML image
  ├─ Vercel: preview deployment
  └─ CI: migrate → seed → E2E → a11y → perf
PR merged or closed
  └─ all three torn down
```

| Property | Value |
|---|---|
| URL | `https://cyberpulse-ai-pr-<n>.vercel.app` |
| Database | Isolated branch — destructive tests are safe |
| Model | Built from the PR's commit |
| Lifetime | PR lifetime |

Branch isolation is what makes E2E honest here. Alert dispatch, demo reset and investigation transitions all write, and on a shared database they would either be read-only tests (weaker) or a source of cross-PR interference (worse).

---

## 5. Production

The evaluation environment. "Production" is a slight misnomer — it serves demonstrations, not operations — but it is treated with production discipline because a failure in front of an evaluator is the project's worst outcome.

| Property | Value |
|---|---|
| Web | Vercel production, region `bom1` |
| ML | Always-on recommended; keep-warm job otherwise |
| Database | Neon primary, pooled endpoint |
| Model | Version pinned, verified post-deploy |
| Destructive tests | Never — smoke suite is read-only plus a scoped demo reset |
| Access | Public URL, no authentication (ADR-019) |

### Production-only rules

1. No destructive test ever runs here.
2. `POST /api/demo/reset` is the only write the demonstration protocol performs outside normal use, and it is scoped to `origin = 'DEMO'`.
3. Deployment verifies the model version as its final step.
4. A health tab stays open throughout any evaluation window.

---

## 6. Environment Variables by Environment

| Variable | local | preview | production |
|---|---|---|---|
| `DATABASE_URL` | Compose Postgres | Neon branch | Neon primary |
| `ML_SERVICE_URL` | `http://localhost:8000` | Preview service URL | Production service URL |
| `NEXT_PUBLIC_MAP_TILE_URL` | Public demo tiles | Same | Same |
| `NEXT_PUBLIC_DEMO_MODE` | `true` | `true` | `true` |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | `true` | `false` | `true` |
| `ADMIN_ACCESS_CODE` | Generated, in `apps/web/.env.local` | Own value per preview | Own value, shared only with presenters |
| `DATA_SEED` | `26184` | `26184` | `26184` |
| `LOG_LEVEL` | `debug` | `info` | `info` |
| `MODEL_DIR` | `./models` (read-only mount) | Baked into the image | Baked into the image |

Validated at startup by a Zod schema in every environment. A missing variable fails the boot, not the first request that needs it.

---

## 7. Promotion

```
feature branch ──PR──▶ preview ──all gates green──▶ main ──▶ production
```

There is no path from local to production. There is no manual deployment. Production only ever receives artefacts that passed every gate on a preview built from the same commit.

---

## 8. Parity and Its Limits

| Aspect | Parity | Note |
|---|---|---|
| Application code | Identical | Same commit |
| Model artefacts | Identical | Same image in preview and production |
| Schema | Identical | Same migrations |
| Data | Identical | Same seed |
| Runtime versions | Identical | Node 20, Python 3.11 pinned |
| Compute resources | **Differs** | Local laptop vs 512 MB container |
| Network latency | **Differs** | Localhost vs internet |
| Cold start | **Differs** | Absent locally |

The three differences are all in the same direction: **local is faster than production**. Performance budgets are therefore measured against the preview environment, never locally, because a local measurement flatters every number in `architecture/performance-architecture.md`.

Cold start is the sharpest instance. It does not exist locally at all, which is precisely why it is the risk most likely to be underestimated by the team and most likely to be encountered by an evaluator.

---

## 9. Access and Data Handling

| Environment | Who | Data |
|---|---|---|
| local | Individual developer | Synthetic |
| preview | Anyone with the URL | Synthetic |
| production | Public | Synthetic |

Every environment carries the same synthetic-data badge, because every environment carries the same synthetic data. There is no environment in this project where real data exists, and the classification gate in `architecture/integrations.md` §3.1 is what would force additional controls before that changed.
