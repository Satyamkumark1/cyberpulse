# DECISION LOG — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Purpose | Decisions that are not architectural (those are ADRs) but change scope, process or a stated target |
| Rule | A decision not recorded here did not happen |

---

## When an Entry Is Required

| Situation | Entry required |
|---|---|
| Adding scope beyond the current phase | Yes |
| Cutting scope from any phase | Yes |
| Changing a requirement | Yes — plus updating `REQUIREMENTS.md` and its tests |
| Waiving a performance budget | Yes — with the new budget and its justification |
| Lowering a model metric gate | **Yes — and this is the one decision the project treats as almost never acceptable** |
| A destructive database migration | Yes |
| Changing the investigation state machine | Yes |
| Accepting a security gap | Yes — plus updating all three gap lists |
| Changing a fixed UI string | Yes — plus updating the assertions |
| Choosing a technology | No — that is an ADR |
| Fixing a defect | No — that is the defect register |

---

## Entry Format

```text
DEC-nnn · [Title]
Date:        YYYY-MM-DD
Decided by:  [role]
Phase:       Pn
Context:     What situation forced a decision
Options:     What was considered
Decision:    What was chosen
Rationale:   Why
Consequences: What changes as a result, including documents to update
Reversible:  Yes / No / At what cost
```

---

## Baseline Entries

### DEC-001 · Phase ordering inverts the template
**Date** 2026-09-14 · **Decided by** Architect + PM · **Phase** P1
**Context.** The documentation template places the AI layer at Phase 5, after core and advanced features.
**Options.** (a) Follow the template. (b) Move the AI layer to Phase 3.
**Decision.** (b). Recorded as ADR-014.
**Rationale.** Every screen exists to present model output. Building the UI first means building against imagined responses and discovering late that the model cannot produce them.
**Consequences.** Phase names deviate from the generic template and say so wherever they are listed. 37% of test cases concentrate in P3.
**Reversible.** No — the whole schedule depends on it.

### DEC-002 · Three environments, no staging
**Date** 2026-09-14 · **Decided by** DevOps · **Phase** P1
**Context.** A conventional four-environment model was considered.
**Decision.** Local, preview-per-PR, production. No staging.
**Rationale.** A Neon-branched preview is full fidelity — real deployment, real ML container, real isolated database, same seed. Staging would add a queue, not a capability.
**Consequences.** Preview must be full fidelity, which makes per-PR Neon branching a requirement rather than a nicety.
**Reversible.** Yes, cheaply.

### DEC-003 · Role switching without authentication
**Date** 2026-09-14 · **Decided by** Security + PM · **Phase** P1
**Context.** The source specification permits role switching in the prototype.
**Options.** (a) No roles. (b) Switchable roles with server-side authorisation. (c) Full identity management.
**Decision.** (b). Recorded as ADR-019.
**Rationale.** (a) fails to demonstrate that boundaries exist; (c) costs days for a prototype with no real data. (b) makes authorisation genuinely testable — a BANK request really does receive 403.
**Consequences.** Declared as gap G-1 in three documents. The role cookie is deliberately **not** `httpOnly`, because dressing a non-credential in security clothing invites misplaced trust.
**Reversible.** Yes — `resolveRole` is the only function that changes.

### DEC-004 · Metric gates are never lowered
**Date** 2026-09-14 · **Decided by** ML + PM · **Phase** P1
**Context.** What happens if the model does not clear its gates?
**Options.** (a) Lower the gate and ship. (b) Ship below gate with a caveat. (c) Treat it as a blocker.
**Decision.** (c).
**Rationale.** The gate is what makes a published metric mean anything. A number published against a gate that was moved to accommodate it is not a measurement; it is a decoration.
**Consequences.** RSK-06 carries two days of buffer. If the gates cannot be met, the honest outcome is to publish the actual numbers and state that the gate was not met — never to move it.
**Reversible.** No. This is a integrity commitment, not a target.

### DEC-005 · Bias evaluation is declared impossible, not deferred
**Date** 2026-09-14 · **Decided by** ML + Security · **Phase** P1
**Context.** Whether the model concentrates attention on particular localities in a way reflecting reporting rather than offending patterns.
**Options.** (a) Run a bias evaluation on synthetic data. (b) Declare it untestable and state why.
**Decision.** (b).
**Rationale.** The generator's geography is a design choice. Any disparity found would be a property of the generator, not a finding about the model. Publishing such a result would be worse than publishing none, because it would look like assurance.
**Consequences.** Declared as gap G-7 and as the most serious open question in the project, in three documents. Requires real labelled outcomes to answer.
**Reversible.** Only with real data.

### DEC-006 · Critical path capped at five interactions
**Date** 2026-09-14 · **Decided by** UX + PM · **Phase** P1
**Context.** Complaint list → dispatched alert.
**Decision.** Five interactions. A sixth requires an entry here.
**Rationale.** The product's value is speed to actionable intelligence. An interaction count is the simplest testable proxy, and TC-UX-001 asserts it.
**Consequences.** Any feature adding a step to the happy path is a scope decision, not an implementation detail.
**Reversible.** Yes, with an entry.

### DEC-007 · No LLM anywhere in the prediction path
**Date** 2026-09-14 · **Decided by** ML + Architect · **Phase** P1
**Context.** Complaint text parsing was considered as an LLM use case.
**Decision.** No generative model anywhere in v1.0.
**Rationale.** Reproducibility, exact attribution and offline verification are all required, and a prompted model provides none of them well. The synthetic complaints are already structured, so parsing adds nothing.
**Consequences.** `ai/prompt-library.md` and `ai/rag-architecture.md` are marked Not Applicable with reasons. TC-AI-001 and TC-AI-002 assert no provider SDK or prompt-shaped constant appears.
**Reversible.** Yes, subject to the eight requirements in `ai/prompt-library.md` §4 — and only outside the prediction path.

### DEC-008 · Generator concentration sharpened to make FEAT-07 ranking gates achievable
**Date** 2026-09-15 · **Decided by** ML + Project owner · **Phase** P3
**Context.** Training the risk model against `ai/evaluation-framework.md` §2.2's ranking gates (top-3 ≥ 0.72, top-5 ≥ 0.85, MRR ≥ 0.58) against the Phase 2 generator's original zone/ATM weighting (`regions.py` zone weights 45/25/18/12, `HOT_ATM_MULTIPLIER = 8.0`, `SAME_REGION_WEIGHT = 0.92`) showed the model plateauing around top-3 = 0.34 across a full documented hyperparameter grid search (324 combinations). Working the concentration math by hand showed this was not a model or feature-engineering defect: the *theoretical* best-possible top-3 hit rate under that weighting is only about 0.27–0.30, because cash-out was spread across four zones per region with a comparatively mild 8x hot-ATM multiplier. No model can rank better than the data concentrates.
**Options.** (1) Sharpen the generator's concentration so cash-out clusters much more tightly onto one dominant zone/ATM per region — the "predicted hotspot" premise the product is named for. (2) Leave the generator as-is and lower the ranking gates in `ai/evaluation-framework.md` to match its real ceiling (~0.30/0.45/0.35) — flagged in `decision-log.md`'s own rules as "almost never acceptable." (3) Pause for manual review.
**Decision.** Option 1, confirmed by the project owner. `regions.py` zone weights changed to 90/5/3/2 per region (one dominant zone); `patterns.py` `HOT_ATM_MULTIPLIER` raised 8.0 → 150.0 and `SAME_REGION_WEIGHT` raised 0.92 → 0.98.
**Rationale.** Lowering a release-blocking model gate to fit an underpowered corpus is explicitly the outcome this project's own rules guard against (`.claude/rules/ai.md` — "A model below gate is not shipped with an adjusted gate"). The corpus is synthetic and labelled as such throughout the product; sharpening it to actually exhibit a learnable, concentrated hotspot pattern is truer to the problem statement (PS 26184 — predicting *the* likely cash-out location) than a diffuse, four-zone-per-region spread that no officer could act on as "a predicted hotspot" in the first place.
**Consequences.** Full corpus regenerated (`pnpm run generate:data`, reseeded). `signal_check.py`'s `historical_hotspot` check now reports ~0.91 top-ATM share (was ~0.31) — still a `[PASS]`, since the check only asserts concentration exists, not a ceiling. All three ranking gates now clear comfortably (top-1 0.81, top-3 0.87, top-5 0.88, MRR 0.85 on the current holdout — see `CHANGELOG.md`'s Model entry). `ai/ai-strategy.md` §10's recall-ceiling limitation and `model_card.json`'s limitations list should be read alongside this entry by anyone retraining.
**Reversible.** Yes — revert both constants and `regions.py`'s weights, regenerate, and the ranking gates would need lowering per Option 2 instead.

### DEC-009 · Complaint report delay redrawn so cash-out prediction is possible at all
**Date** 2026-09-15 · **Decided by** ML · **Phase** P3
**Context.** The generator (`generator.py`) originally set `complaint_timestamp = first_txn_time + uniform(2, 72) hours`, while the fraud chain and cash-out withdrawal complete within roughly an hour of `first_txn_time`. Every complaint in the corpus was therefore filed *after* its cash-out had already happened — confirmed directly (`hours_to_withdrawal` negative for all 283 sampled training rows). FEAT-08's temporal model predicts a *future* withdrawal window from the complaint timestamp; with this timing, there was no case where a future window existed to predict, and a real model trained on it collapsed to a single degenerate class.
**Decision.** This is a defect (not a scope decision) fixed directly per CLAUDE.md binding instruction 2, and logged here only because it also carries the DEC-008-style methodology reasoning: report delay is now drawn per-complaint (mean ~2h, `patterns.py`/`generator.py`), and cash-out delay after the chain completes is drawn per-`depth` (2/3/4 hops → tight windows around 0.3h / 6h / 16h respectively) so that `linked_depth` — already one of the 13 model features — carries real, learnable signal about *when* cash-out happens, not just *where*.
**Consequences.** ~53% of true-cell rows are now genuinely predictive (`hours_to_withdrawal >= 0`); the rest are honest "already happened" cases exercised via the existing degraded/fallback path. `training/train.py` and `evaluate.py` train and score the temporal model only on the predictive subset — scoring a bin for an event already in the past is meaningless. Temporal gates now clear (exact 0.66 ≥ 0.40, within-1 1.00 ≥ 0.75).
**Reversible.** Yes, at the cost of reintroducing the original defect.

---

## Scope Change Protocol

1. Propose, with the phase it affects and what it displaces.
2. Check against `ROADMAP.md` §5 guardrails.
3. If it adds to the current phase, name what is cut from a later one.
4. Record here before work begins.
5. Update `REQUIREMENTS.md`, the test matrix and the affected phase document in the same change.

**Never cut:** the vertical slice, explainability, the alert path, the integrity tests, or the prototype disclosures. Everything else is negotiable; those five are what make the product what it claims to be.
