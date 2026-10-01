# RULE — DEPLOYMENT

Read with `architecture/deployment-architecture.md`, `devops/ci-cd.md`, `devops/deployment-checklist.md`.

---

## Topology

Three deployables, one database, no orchestrator, no broker, no cache tier. Every additional component is another thing that can fail during a three-minute evaluation.

```
Browser → Vercel (Next.js) → ML service (FastAPI container)
                            → Neon PostgreSQL
```

The browser reaches exactly two hosts: the application and the tile provider.

---

## Order — always

**ML service first, then web.** The web application degrades gracefully when ML is absent; a web build expecting a response shape the deployed service does not produce fails schema validation on every prediction.

```yaml
- deploy ML
- wait for /health with modelLoaded: true
- deploy web
- smoke suite
- verify model version matches the expected string
```

The last step catches a promoted wrong image — the error that otherwise surfaces mid-demonstration.

---

## Artefacts

Model artefacts are **baked into the image**, mounted read-only. No runtime fetch, no production volume. The deployed model version is therefore a property of the image tag, and there is no state in which the running model and the reported version disagree.

Rolling back the image rolls back the model, and `model_version` changes with it.

---

## Environments

Three: local, preview (per PR, Neon branch), production. No staging — a full-fidelity preview per PR is what staging would have been.

**Same seed everywhere.** A defect on a preview URL reproduces on a laptop without a data-difference hypothesis.

**Performance is measured on preview, never locally.** Local is faster in compute, network and cold start — the three dimensions the budgets constrain.

---

## Configuration

Environment variables only, validated by a Zod schema at startup. The application **refuses to boot** on a missing or malformed variable rather than failing at first use.

No secret carries a `NEXT_PUBLIC_` prefix. `.env.example` is the only committed env file.

---

## Cold start — the top operational risk

The free ML tier spins down after ~15 minutes. Five mitigations, all built: keep-warm job every 15 min, uptime probe every 60 s, warm-up ping on app load and `/demo` mount, health reporting `degraded` (not `down`) while warming, T−30 rehearsal run.

An always-on instance at roughly ₹600/month removes it entirely and is the recommendation whenever any budget exists.

---

## Rollback triggers — no discussion

| Trigger | Action |
|---|---|
| A displayed value disagrees with the API response | **Immediate rollback** |
| Prediction error rate > 10% | Rollback |
| Unhandled error on a core route | Rollback |
| Model version mismatch | Rollback |
| Smoke red after deploy | Automatic rollback |

Web rollback < 1 min; ML rollback < 5 min via the previous image tag.

---

## Migrations

Additive-first, so a web rollback never strands the schema. Applied to a clean database in CI on every PR. Destructive changes need a decision-log entry — which is the moment someone is forced to think about the rollback path.

---

## Demonstration day

Deployment is verified at T−60, warmed at T−30, reset at T−25, and a health tab stays open throughout. The local stack (`make dev`: Postgres and ML in Docker Compose, web from source) runs on the presenting laptop as the fallback for venue network failure — which is why local parity is a requirement, not a convenience.

**If a number looks wrong: stop, reset, reload.** Never explain it away.

---

## Before you finish

- [ ] ML deploys before web
- [ ] Health waits on `modelLoaded: true`
- [ ] Model version verified post-deploy
- [ ] Smoke green
- [ ] New env var in every environment and in `.env.example`
- [ ] Migration additive-first with a rollback note
- [ ] Rollback path tested, not assumed
