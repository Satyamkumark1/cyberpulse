# RELEASE PROCESS — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Versioning | Semantic versioning for the application; a separate model version string |
| Related | `devops/ci-cd.md`, `devops/deployment-checklist.md`, `CHANGELOG.md` |

---

## 1. Branching

```
main            always deployable, protected
  └── feat/<scope>-<summary>
  └── fix/<defect-id>-<summary>
  └── model/<version>-<summary>
```

Short-lived branches, squash merge, linear history. No long-running develop branch — with a three-week window and six people, a second integration branch costs more than it saves.

**Protected `main`:** no direct pushes, one approving review, all CI gates green, branch current with `main` before merge.

---

## 2. Versioning

| Artefact | Scheme | Changes when |
|---|---|---|
| Application | `MAJOR.MINOR.PATCH` | Feature, fix, breaking change |
| Model | `CyberPulse-Demo-v<N>` | Retraining, threshold change, feature-set change |
| Feature schema | `fs-<N>` | Any change to feature order, count or semantics |
| Database | Sequential migration numbers | Any schema change |

The four version strings move independently, and each is reported where it matters: the application version in build metadata, the model version on every prediction and in Settings, the feature schema version on every prediction row, and the migration number in the database.

---

## 3. Pull Request Flow

```
branch → implement with tests → self-review → open PR → CI gates → review → squash merge → deploy
```

### PR requirements

- Description states **what changed and why**, and references requirement or ADR IDs.
- Tests included; a defect fix includes a test that fails without the fix.
- `EXPLAIN ANALYZE` output for any new query on a table above 10,000 rows.
- Documentation updated in the same PR when behaviour, schema or API changed.
- `CHANGELOG.md` entry for anything user-visible.
- Checklists in `engineering/code-review-checklist.md` and `security/security-checklist.md` §1 completed.

### CI gates (all blocking)

```
lint → typecheck → unit → migrations on a clean DB → integration
  → security scan (dependencies + secrets) → build (bundle budgets)
  → deploy preview → E2E → accessibility → performance
```

---

## 4. Merge to Deploy

| Step | Detail |
|---|---|
| 1 | Squash merge to `main` |
| 2 | CI rebuilds the ML image and the web bundle from the same commit |
| 3 | **ML service deploys first** |
| 4 | Web deploys |
| 5 | Smoke suite runs against production |
| 6 | `CHANGELOG.md` entry finalised |

Step 3's ordering is not arbitrary. The web application tolerates an absent ML service by design (degraded mode); a web build expecting a response shape the deployed service does not yet produce would fail schema validation on every prediction. Deploying the producer first keeps the contract satisfied throughout the window.

---

## 5. Change Management Rules

Different kinds of change carry different obligations. This table is the enforcement point for §31 of the project's documentation standard.

| Change | Must also update | Must also do |
|---|---|---|
| **Requirement** | `REQUIREMENTS.md`, `USER_STORIES.md`, `ACCEPTANCE_CRITERIA.md`, phase test matrix | Add or amend test cases |
| **Architecture** | Relevant `architecture/*`, a new ADR | Record superseded ADRs |
| **Database schema** | `architecture/database-design.md`, `diagrams/database-erd.md`, migration + rollback note | Run migrations against a clean DB in CI |
| **API** | `architecture/api-design.md`, `packages/shared` schema | Regenerate Zod and Pydantic; update contract tests |
| **Security-relevant** | `security/threat-model.md`, `security/security-checklist.md` | **Add the test case before the fix** |
| **Model or thresholds** | `CHANGELOG.md` `Model` entry, `model_card.json` | Record before/after values for **every** gate |
| **Feature schema** | `feature_schema.json`, `FEATURE_SCHEMA_VERSION` | Retrain; never serve an old artefact against a new schema |
| **UI copy in the fixed set** | `ux/ui-guidelines.md` §2.3 | Update the exact-match assertions |

Two of these deserve emphasis.

**Security changes add the test first.** A security fix without a reproducing test is a security fix that regresses, and regressions in this category are the ones nobody notices.

**Model changes publish their metrics.** A `Model` entry in `CHANGELOG.md` states the previous and new values for every gate in `ai/evaluation-framework.md` §2. A model whose metrics moved without anyone recording the movement is a model nobody can reason about later.

---

## 6. Release Types

| Type | Trigger | Gates | Rollback |
|---|---|---|---|
| Patch | Defect fix | Full CI | Instant web rollback |
| Minor | Feature | Full CI + phase exit criteria | Instant web rollback |
| Model | Retraining | Full CI + all metric gates + `CHANGELOG` `Model` entry | Redeploy previous image tag |
| Hotfix | Critical defect in the demonstration window | Lint, typecheck, unit, targeted E2E | Instant |

The hotfix path exists because during a 36-hour finale a broken demonstration path cannot wait eight minutes for a full suite. It is narrow by design: the full suite runs immediately afterwards, and any hotfix is re-validated before the next evaluation session.

---

## 7. Rollback

| Component | Mechanism | Time |
|---|---|---|
| Web | Vercel instant rollback | < 1 min |
| ML service | Redeploy previous image tag | < 5 min |
| Model | Follows the image — `model_version` changes with it | < 5 min |
| Database | Forward-fix; additive migrations make rollback rarely necessary | Case-by-case |

Migrations are additive-first (add nullable → backfill → set not null) precisely so a web rollback never strands the database in an incompatible shape. A destructive migration requires a decision-log entry, which is the moment someone is forced to think about the rollback path.

---

## 8. Release Checklist

**Before**
- [ ] All CI gates green on `main`
- [ ] Phase exit criteria met (`implementation/phase-*.md`)
- [ ] No open Critical or High defects
- [ ] `CHANGELOG.md` complete, including any `Model` entry
- [ ] Migrations reviewed with rollback notes
- [ ] Security checklist §3 complete
- [ ] Model metrics recorded if the model changed

**During**
- [ ] ML service deployed and healthy first
- [ ] Web deployed
- [ ] `/api/health` reports all three components up
- [ ] Smoke suite green

**After**
- [ ] `/demo` run end to end against production
- [ ] `POST /api/demo/reset`
- [ ] Model version in Settings matches the release
- [ ] Error rate observed for 15 minutes
- [ ] Release recorded

---

## 9. Definition of Done

**A change is done when:** requirements implemented; UX implemented; API implemented; schema changes migrated; error handling implemented; unit, integration and E2E tests pass; security checks pass; accessibility checks pass where applicable; documentation updated; code reviewed; CI green.

**A phase is done when:** all deliverables exist; phase acceptance criteria pass; phase test cases pass; required regression tests pass; no unresolved Critical or High defects; documentation reflects the implemented state.

Neither list contains "the author believes it works". That is the point of having them.
