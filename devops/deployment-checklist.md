# DEPLOYMENT CHECKLIST — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Use | Every production deployment, and the demonstration-day runbook |
| Related | `engineering/release-process.md`, `devops/disaster-recovery.md` |

---

## 1. Pre-Deployment

**Code and gates**
- [ ] All CI gates green on `main` (lint, typecheck, unit, migrations, integration, security, build, E2E, a11y, performance)
- [ ] No open Critical or High defects
- [ ] Phase exit criteria met (`implementation/phase-*.md`)
- [ ] `CHANGELOG.md` complete for this release
- [ ] `Model` entry present with before/after metrics if the model changed

**Database**
- [ ] Migrations reviewed, additive-first, with a rollback note
- [ ] Migrations applied cleanly to a clean database in CI
- [ ] No destructive migration without a decision-log entry

**Model**
- [ ] `evaluate.py` cleared every metric gate
- [ ] `model_card.json` regenerated
- [ ] Artefacts baked into the image
- [ ] Expected `model_version` recorded for post-deploy verification

**Configuration**
- [ ] Any new environment variable present in every environment **and** in `.env.example`
- [ ] No secret in a `NEXT_PUBLIC_*` variable
- [ ] Startup environment validation passes

---

## 2. Deployment

- [ ] **ML service deployed first**
- [ ] ML `/health` reports `modelLoaded: true` with the expected version
- [ ] Web deployed
- [ ] `/api/health` reports all three components `up`
- [ ] Smoke suite green
- [ ] Deployed `model_version` verified against the expected string

The ordering is not a preference. The web application degrades gracefully when the ML service is absent; a web build expecting a response shape the deployed service does not produce fails schema validation on every prediction.

---

## 3. Post-Deployment

- [ ] `/demo` run end to end against production
- [ ] `POST /api/demo/reset`
- [ ] Settings shows System Mode `Prototype`, Data Mode `Synthetic / Anonymised`, the correct model version
- [ ] Synthetic-data badge present on every route
- [ ] Error rate observed for 15 minutes
- [ ] Release recorded in `CHANGELOG.md`

---

## 4. Demonstration-Day Runbook

The checklist that most affects the project's actual outcome.

### T−60 minutes
- [ ] `/api/health` — all three components `up`
- [ ] Smoke suite green against production
- [ ] Model version correct in Settings

### T−30 minutes
- [ ] One full `/demo` run — warms the ML service and the query caches
- [ ] Map renders with all three layers
- [ ] Money-trail graph renders for `C-10284`
- [ ] Alert dispatch completes and appears on all three surfaces

### T−25 minutes
- [ ] `POST /api/demo/reset`
- [ ] Complaint `C-10284` present and analysable
- [ ] Seed row counts unchanged

### T−15 minutes
- [ ] Health tab open in a second browser window
- [ ] Local Docker stack running and verified on the presenting laptop
- [ ] One-page recovery runbook printed and to hand
- [ ] Laptop on mains power; screen sleep disabled
- [ ] Browser zoom at 100%, window at 1920×1080

### During
- [ ] Reset between evaluators
- [ ] Health tab checked before each session
- [ ] If anything looks wrong: **stop, reset, reload** — never present a value the team does not trust

The last line is the single most important item in this document. Explaining away a number that looks wrong is the one failure this entire documentation set is built to prevent.

---

## 5. Rollback Triggers

Roll back immediately, without discussion, if any of these is observed:

| Trigger | Action |
|---|---|
| A displayed value disagrees with the API response | **Immediate rollback** — this is the defining failure mode |
| Prediction error rate above 10% | Rollback |
| Any core route showing an unhandled error | Rollback |
| Model version does not match the expected string | Rollback |
| Health `unhealthy` for more than 2 minutes and not provider-side | Rollback |
| Smoke suite red after deployment | Automatic rollback |

| Component | Mechanism | Time |
|---|---|---|
| Web | Vercel instant rollback | < 1 min |
| ML service | Redeploy previous image tag | < 5 min |
| Model | Follows the image | < 5 min |
| Database | Forward-fix | Case-by-case |

---

## 6. Sign-Off

| Role | Confirms |
|---|---|
| Engineer | Code, tests, migrations, configuration |
| QA | All Critical and High cases pass; phase exit criteria met |
| Security | Security checklist §3 complete; declared gaps unchanged |
| ML owner | Metric gates cleared; `CHANGELOG` `Model` entry present |
| Demonstrator | Runbook rehearsed; local fallback verified |

On a six-person hackathon team these are hats rather than people, but each confirmation is made explicitly by a named person. A checklist everyone assumes someone else completed is not a control.
