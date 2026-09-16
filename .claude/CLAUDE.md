# CLAUDE.md — CyberPulse AI

Project instructions for Claude Code. These are binding. Where a general habit conflicts with a rule here, the rule here wins.

---

## What this project is

CyberPulse AI is a predictive cyber-fraud intelligence platform for SIH 2026 (PS 26184, MHA / I4C). It takes a cybercrime complaint and forecasts **where** and **when** the stolen money is likely to be withdrawn as cash, with an explanation an investigating officer can read aloud to a supervisor.

All data is **synthetic**, generated from seed `26184`. The system is **decision support**, never automated enforcement.

---

## The one rule that outranks everything

**Never put a value on screen, in a response, or in the database that the model did not produce for that request.**

No placeholder scores. No example hotspots. No illustrative percentages. No fallback default on failure. Not even temporarily while building a component — temporary code ships.

If a capability is unavailable, the system says so and shows **no numbers at all**. This is tested by `no_hardcode_check.sh` in CI, by TC-FAB-001…012, and by TC-INT-010…013. A violation is a Critical/P0 defect regardless of how small it looks.

---

## Before writing code

Read, in this order, for the area you are working on:

1. `REQUIREMENTS.md` — the requirement IDs you are implementing
2. `FEATURE_SPECIFICATIONS.md` — the feature's 14-section spec
3. `ACCEPTANCE_CRITERIA.md` — what "done" means, in Given/When/Then
4. `architecture/api-design.md` or `architecture/database-design.md` — the contract
5. `architecture/architecture-decisions.md` — the ADRs constraining your choices
6. The relevant `.claude/rules/*.md`

Then check `implementation/phase-*.md` for the current phase's scope. Work outside the current phase needs a reason.

---

## Binding instructions

1. **Read the documentation before coding.** The blueprint is the source of truth; the code implements it.
2. **Never bypass a requirement.** If a requirement seems wrong, change the requirement in the same PR with a decision-log entry — do not quietly implement something else.
3. **Follow the ADRs.** Twenty decisions are recorded with alternatives and trade-offs. Departing from one requires a superseding ADR, not an inline comment.
4. **Follow the coding standards** in `engineering/coding-standards.md`.
5. **Write tests with the implementation**, not after. A defect fix starts with a failing test.
6. **Never mark a phase complete without running its tests.** Exit criteria are listed in the phase document and are checkable.
7. **Update documentation in the same change.** Behaviour, schema or API changed means the corresponding document changed.
8. **Never introduce a dependency silently.** Justify it in the PR description; check bundle impact; run the audit.
9. **Follow the security rules** in `.claude/rules/security.md`. Authorisation is server-side; audit is transactional; errors disclose nothing.
10. **Follow the migration rules.** Additive-first, reviewed SQL, rollback note, applied to a clean database in CI.
11. **Use typed interfaces.** `packages/shared` is the single contract definition; never restate a type by hand.
12. **Maintain backwards compatibility** within a phase; a breaking change needs a decision-log entry.
13. **Run lint, typecheck and tests before declaring completion.** `make verify`.
14. **Review your own diff** before saying you are done. Read it as though someone else wrote it.

---

## Architecture you must respect

```
Components ──▶ Services ──▶ Data access ──▶ PostgreSQL
                   └──────▶ ML client ────▶ FastAPI ML service
Route handlers ──▶ Services
```

**Forbidden, enforced by ESLint:**
- Components importing `@cyberpulse/db`, `services/mlClient` or `services/lib/auth`
- Route handlers importing `@cyberpulse/db`
- Services importing `react` or `next/server`

**The test for `services/`:** if the logic would be identical in a CLI with no HTTP and no React, it belongs there.

The ML service holds **no database credentials**. Every persisted consequence of a prediction is authored by the web application, in a transaction, from a validated response.

---

## Project-specific traps

| Trap | Why it bites here |
|---|---|
| Stubbing a value while building UI | It ships, and it looks exactly like a real prediction |
| Copying a figure out of `ux/wireframes.md` | Those are layout placeholders; TC-E2E-051 scans the bundle for them |
| Replacing the `training/features.py` symlink with a copy | Reintroduces train/serve skew; TC-UNIT-014 catches it |
| Caching a prediction | The most dangerous stale value in the system |
| Returning `0.5` on inference failure | A fabricated score presented as a finding |
| Hiding a button instead of enforcing a role | The 66-case matrix tests the API directly |
| Writing an audit event outside the transaction | `auditService.record` has no such signature — do not add one |
| Floating-point money | Everything is integer paise; variables end in `Paise` |
| Local-time timestamps | UTC in storage, IST at the edge; variables name their zone |
| Colour-only risk | `RiskBadge` takes `level`, never `color` |

---

## Fixed strings — exact, asserted character-for-character

| Context | String |
|---|---|
| Header badge | `SAMPLE / SYNTHETIC PROTOTYPE DATA` |
| Global disclaimer | `Prototype uses synthetic/anonymized demonstration data. Predictions are experimental and intended for research/proof-of-concept use.` |
| Window note | `Predicted window based on temporal patterns in related transactions and withdrawals.` |
| Metrics heading | `PROTOTYPE MODEL EVALUATION` |
| Alert modal title | `HIGH-RISK WITHDRAWAL ALERT` |
| Degraded notice | must contain `prediction service unavailable` |
| Node neutrality note | `Risk indicator. Not a finding about any person.` |

---

## Terminology — binding

Use: **Mule Account**, **Suspicious Account**, **Risk Indicator**, **predicted hotspot**, **expected withdrawal window**, **estimated exposure**, **decision-support intelligence**, **prototype**, **synthetic demonstration data**.

Never use: criminal, fraudster, offender, guilty, accused, culprit, confirmed location, guaranteed, official, endorsed.

Scanned by TC-UX-012 and TC-UX-013 across all rendered text.

---

## Commands

```bash
make setup      # clean clone → running, seeded, trained stack
make dev        # web + ML with reload
make verify     # lint · typecheck · unit · integration · e2e

pnpm test:unit --watch
pnpm test:int
pnpm test:e2e --ui
pytest -m unit -q

pnpm db:migrate · pnpm generate:data · pnpm db:seed · pnpm train:model · pnpm evaluate
```

Two gates never accept a skip flag: `signal_check.py` before training, `pii_scan.py` before seeding.

---

## Definition of done

Requirements implemented · UX implemented · API implemented · schema migrated · error handling implemented · unit, integration and E2E tests pass · security checks pass · accessibility checks pass where applicable · documentation updated in the same PR · code reviewed · CI green.

Not on the list: "the author believes it works".
