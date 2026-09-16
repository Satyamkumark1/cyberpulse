# DISASTER RECOVERY — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Framing | For this project, "disaster" means **the demonstration fails**. That is the outcome with real consequences, and this plan is written against it. |
| Related | `devops/backup-recovery.md`, `architecture/deployment-architecture.md` §9 |

---

## 1. Honest Scoping

A prototype holding synthetic data has no data-loss disaster in the conventional sense. The dataset regenerates from a seed in three minutes, the model retrains in two, and the schema lives in version control.

What it does have is a single, unrepeatable, high-stakes event: a three-minute evaluation in front of judges. Every scenario below is ranked by its effect on that event rather than by data volume at risk.

---

## 2. Scenario Register

| ID | Scenario | Likelihood | Demo impact | RTO |
|---|---|:--:|:--:|---|
| DR-1 | ML service cold or down | **High** | **Critical** | < 30 s |
| DR-2 | Venue network failure | Medium | **Critical** | < 2 min |
| DR-3 | Web deployment broken | Low | Critical | < 1 min |
| DR-4 | Database unreachable | Low | Critical | < 15 min |
| DR-5 | Wrong model version deployed | Low | High | < 5 min |
| DR-6 | Corrupted demo state mid-evaluation | Medium | High | < 30 s |
| DR-7 | Tile provider down | Low | Low | 0 (automatic) |
| DR-8 | Provider-wide outage (Vercel / Neon / Render) | Low | **Critical** | < 5 min |
| DR-9 | Total data loss | Very low | Medium | < 10 min |

DR-1 is both the most likely and among the most damaging, which makes it the scenario the whole plan is organised around.

---

## 3. DR-1 · ML Service Cold or Down

**Cause.** Free-tier spin-down after ~15 minutes idle; cold start 5–20 s. Or the container is genuinely down.

**Detection.** `/api/health` reports `mlService` as `degraded` or `down`; the health tab held open during evaluation shows it immediately.

**Prevention** — five layers, all built:

1. Keep-warm job every 15 minutes.
2. Uptime probe every 60 seconds, which doubles as a warm-up.
3. Warm-up ping on app load and `/demo` mount.
4. T−30 rehearsal run in the runbook.
5. An always-on paid instance eliminates it entirely (~₹600/month — the recommendation in `ai/cost-optimization.md` §2.1).

**Response during a demonstration.** The product already handles this honestly: a degraded panel naming the unavailable capability, no fabricated numbers, retry available. The correct action is to say so out loud — *"the prediction service is cold, it will be a few seconds"* — and continue. A system that fails visibly and honestly in front of a judge is a better demonstration of engineering judgement than one that silently shows a stale number.

**Recovery.** Retry after warm-up; if genuinely down, switch to the local stack (DR-2 procedure).

---

## 4. DR-2 · Venue Network Failure

**Prevention.** The full stack runs locally via Docker Compose, with identical topology. This is why CON-04 is a requirement rather than a convenience.

**Procedure**

```bash
# Prepared and verified before travelling
docker compose up -d
./scripts/wait-healthy.sh http://localhost:3000/api/health 120
open http://localhost:3000/demo
```

**Preparation checklist**

- [ ] Images built and present locally before travelling
- [ ] Database volume seeded and verified
- [ ] Model artefacts present
- [ ] Full `/demo` run completed offline at least once
- [ ] Laptop on mains power
- [ ] Browser bookmark to `localhost:3000`

Two minutes if the stack is already running, five if it needs to start. The single most valuable item on that list is the last-but-one: an offline demo run completed in advance, because a fallback nobody has exercised is a hypothesis.

---

## 5. DR-3 · Web Deployment Broken

Vercel instant rollback to the previous deployment, under a minute. If the previous deployment is also broken, the local stack is the fallback.

The smoke suite runs automatically after every production deploy, so a broken deployment is normally detected within two minutes of promotion rather than during an evaluation.

---

## 6. DR-4 · Database Unreachable

**Detection.** Health reports `unhealthy`; the application shows retryable errors and retains previously rendered data.

**Response ladder**

1. Check the provider status page — an outage is not a bug.
2. Check connection-pool exhaustion; the pooled endpoint exists to prevent this.
3. If provider-side and prolonged, switch to the local stack.

Nothing in the application writes without a transaction, so an interruption cannot leave a partial alert or a prediction without its factors. Recovery is reconnection, not repair.

---

## 7. DR-5 · Wrong Model Version Deployed

**Detection.** The deployment pipeline's final step verifies the reported model version against the expected string; Settings displays it; every prediction carries it.

**Recovery.** Redeploy the correct image tag. Because artefacts are baked into the image, this is a single operation and the version follows automatically — there is no state where the running model and the reported version disagree.

---

## 8. DR-6 · Corrupted Demo State Mid-Evaluation

**Cause.** A previous evaluator's session left alerts and investigations in place; a transition landed in an unexpected state.

**Recovery.** `POST /api/demo/reset` — scoped to `origin = 'DEMO'`, idempotent, cannot touch seed data. Under thirty seconds, and it is a standard step between evaluators rather than an emergency action.

---

## 9. DR-7 · Tile Provider Down

Handled automatically: the map falls back to a bundled India outline GeoJSON with a visible notice, and the hotspot, heatmap and ATM layers still render. The demonstration loses basemap detail and nothing else.

---

## 10. DR-8 · Provider-Wide Outage

The scenario with no in-platform answer. Vercel, Neon or Render being down is not something this project can engineer around at its scale.

**The answer is the local stack**, which is why it is prepared, verified and carried rather than assumed. That single fallback covers DR-2, DR-3, DR-4 and DR-8 — four of the nine scenarios, including every one where the cloud is unreachable.

---

## 11. DR-9 · Total Data Loss

Ten minutes: migrate, generate, validate, seed, train, evaluate. Loses alerts, investigations and audit history created since the last restore point; loses nothing that matters to a demonstration. Full procedure in `devops/backup-recovery.md` §4.1.

---

## 12. The One-Page Runbook

Printed and carried. Not on the laptop that might be the thing that failed.

```
SYMPTOM                        ACTION
────────────────────────────────────────────────────────────────
Prediction slow / spinner      Say it aloud, wait 20 s. Cold start.
Prediction shows "unavailable" Retry once. Then switch to local.
Map blank, page works          Tile fallback. Continue — expected.
Page will not load             Vercel rollback, or switch to local.
Everything failing             docker compose up -d  →  localhost:3000
Odd state between evaluators   Reset Demo in the header.
Wrong numbers on screen        STOP. Do not present. Reset and reload.
────────────────────────────────────────────────────────────────
Local:   docker compose up -d && open http://localhost:3000/demo
Health:  <production-url>/api/health
Reset:   Header → Reset Demo
```

The second-to-last row is the important one and the hardest to follow under pressure. If a displayed number looks wrong, the correct action is to stop rather than to explain it away — presenting a value the team does not trust is the one failure this entire documentation set exists to prevent.

---

## 13. Rehearsal

| Drill | When | Pass condition |
|---|---|---|
| Cold-start recovery | Phase 7 | Degraded panel shown, no fabricated values, recovery within 30 s |
| Switch to local stack | Phase 7, and again before the finale | Running demonstration within 2 min |
| Vercel rollback | Phase 7 | Previous deployment live within 1 min |
| Full rebuild from seed | Phase 7 | Working system within 10 min |
| Demo reset between evaluators | Phase 8, twice | Known state, seed counts unchanged |

Every drill is a Phase 7 or Phase 8 deliverable with an owner. A recovery procedure first attempted during the event it was written for is not a plan.
