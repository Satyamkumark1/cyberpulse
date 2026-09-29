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

### DEC-010 · ATM guard coverage modelled as duty posts, not people
**Date** 2026-09-18 · **Decided by** Project owner · **Phase** P7
**Context.** The proposal was to notify ATM security guards directly on their phones so they could watch for suspicious withdrawals during a predicted window. The intent — physical readiness at the predicted location — is sound, but the direct-to-guard form collides with four commitments: NG-03 (no profiling of named individuals), guardrails S-1/S-3/S-4 (locations and windows only; no output is an instruction), threat DT-3 (accusatory output), and the absolute no-personal-data rule (FR-01.7 names `phone` explicitly; `pii_scan.py` is non-bypassable and TC-SEC-022 introspects the schema). Practically, a guard cannot see transactions at all — only people at a machine — so a cell-level score routed to them invites judgements about members of the public rather than enabling any available action.
**Options.** (1) Store guard identities and contact numbers and notify them. (2) Model coverage as duty *posts* — a position at an ATM with a shift — and let the alert reach the operating bank, which holds the roster, the authority and the lawful basis. (3) Omit guard coverage entirely.
**Decision.** Option 2. `guard_posts` carries `post_id`, `atm_id` and a recurring IST shift, and has nowhere to put a name, phone, or any other identifier. The alert modal surfaces the posts covering the predicted cell as context for the recipients it already reaches.
**Rationale.** It delivers what the request was actually for — the alert naming which sites are staffed during the predicted window — while keeping S-1 structurally true rather than aspirational. The prototype stops at "here is a location, a window, and an exposure figure"; how a bank cascades that to a specific site is the bank's procedure, and correctly outside this schema. Option 1 would have been a Critical defect by the project's own definition on the day it was written.
**Consequences.** Migration `0002_add_guard_posts` (additive, rollback documented). Generator emits `guard_posts.csv` (1068 rows, seed `26184`, byte-identical across runs); `pii_scan.py` covers it automatically via its `*.csv` glob and passes. `GET /api/guard-posts` reuses `hotspots:read`, so the 66-case authorisation matrix is unchanged. A per-site notification *channel* remains out of scope under NG-01.
**Reversible.** Yes — drop the table, revert the generator and seed, remove the route, service and the Site Coverage block.

### DEC-011 · GUARD and I4C added as real roles — why this does not reverse DEC-010
**Date** 2026-09-18 · **Decided by** Project owner · **Phase** none stated — additive scope requested mid-stream, not traded against a planned P7 deliverable
**Context.** The project owner asked for a separate dashboard per user type — police, ATM guard, bank, I4C — each seeing only its own info and data, and confirmed the larger of two options after both were raised explicitly: adding `GUARD`/`I4C` as genuine `ActorRole` values (not just reshaping the existing three), and giving the guard side its own view rather than folding it into BANK's. That second point directly revisits DEC-010's territory, made minutes earlier in the same working session, so the distinction has to be stated precisely rather than assumed.
**The distinction.** DEC-010 rejected storing a *specific guard's* name or phone and pushing a notification to a *real individual's* device (its Option 1) — that stays rejected; nothing here reopens it. This prototype's whole role model is already "asserted, never verified" (ADR-019): any caller can select `ADMIN` from the "Prototype role" dropdown today with zero identity check, non-httpOnly cookie, deliberately not dressed as a credential. Adding `GUARD` as a fourth selectable value in that same mechanism stores no identity at all — it is exactly as anonymous as selecting any other role is today. The GUARD dashboard's content stays positional/duty-post data only (`hotspots:read`, `metrics:read`, `settings:read`, `health:read` — nothing else), never "here is your specific assignment," because there is no identity to scope that to. `I4C` is unrelated to the guard question — it maps to `PER-02`, the I4C Intelligence Analyst persona already documented in `product/personas.md` with no prior code mapping, and needs no reconciliation with anything.
**Options considered** (for the "dashboard model" fork): (1) reshape the existing three roles' views plus identity-free read-only surfaces for the ATM-site/I4C data that already exists — no new roles, smaller and safer; recommended by the implementer. (2) Four real login roles — bigger, touches the capability matrix (66→110 cases) and, for GUARD, the DEC-010 question above. **Decided: (2).** For the guard-specific fork: (a) surface duty-post coverage inside BANK's dashboard, no guard login — recommended; (b) give guard its own view anyway. **Decided: (b).**
**Consequences.** Migration `0005_add_guard_i4c_roles` (additive `ALTER TYPE ... ADD VALUE`, not cleanly reversible — enum values cannot be dropped in place, documented in the migration's own rollback note). `ADR-021` records the mechanism. `REQUIREMENTS.md` FR-20/FR-20.3, `security/authorization.md`, `security/auth-strategy.md` updated in the same change. The capability matrix grows to 22×5=110 cases. Two pre-existing bugs surfaced by GUARD's profile and fixed in the same change: `reportService.metrics()` was checking `reports:read` instead of the documented `metrics:read`; `InvestigationActionPanel`'s transition/note gating, written with only BANK in mind, would have shown I4C controls that 403 on submit.
**Nothing is cut.** This request arrived and was scoped mid-session, outside any phase document's existing plan — there is no later-phase deliverable being displaced to make room for it.
**Reversible.** The matrix, Sidebar and `/guard` page changes are ordinary reverts. The migration is not — see its own rollback note.

### DEC-012 · The guided demo runs ten complaints concurrently, replacing the single-complaint scenario

**Date** 2026-09-19 · **Decided by** Project owner · **Phase** P7
**Context.** `FR-19.1` named `C-10284` explicitly: the "RUN DEMO SCENARIO" control loaded one fixed complaint through six narrated steps and fired exactly one real `POST /api/predict`. The project owner asked for the demo to show ten complaints running at the same time, to demonstrate real capacity rather than a single toy case. Offered a choice between an additive, non-breaking second view (leaving the existing single-complaint walkthrough and `tests/demo/scenario.spec.ts` untouched) and replacing the existing control outright, the project owner chose replacement.
**Options considered.** (1) Add a new, separate "batch demo" view; the existing scripted walkthrough and its tests stay exactly as they are — recommended, smaller blast radius. (2) Replace "RUN DEMO SCENARIO" itself so it drives ten complaints instead of one. **Decided: (2).**
**Decision.** `DEMO_COMPLAINT_IDS` (ten fixed, real complaint IDs from the seed-26184 corpus, each verified to carry a populated transaction chain) replaces the single `DEMO_COMPLAINT_ID`. Each of the six steps renders all ten complaints; step 3 fires all ten real predict calls concurrently, not staggered. `nextAutoStep()` (`autoAdvance.ts`) needed no changes — only how its two input booleans are aggregated across ten rows instead of one: the run advances once all ten have *settled* (success or failure) and freezes only if *all ten* fail, so one failing complaint degrades only its own row rather than the whole guided narrative.
**Rationale.** `usePrediction(complaintId, headers)` was already complaint-agnostic — the change is in orchestration (how many rows, how their statuses combine), not in the prediction pathway itself (`TC-INT-012`, `TC-FAB-008` still hold: there is no second, demo-only way to obtain a prediction). Reusing every existing presentational component (`PredictionSummary`, `PredictionFactors`, `PipelineStages`, `AlertModal`, `RiskBadge`, `StatePanel`) per row keeps the "zero fabrication" and "cannot drift from what it recaps" properties intact per complaint, not just globally.
**Consequences.** `FR-19.1` rewritten; new `FR-19.4` (partial-failure independence). `AC-014-01` rewritten from "exactly one predict call" to "exactly ten, concurrent"; new `AC-014-06` (partial-failure). `RATE_LIMITS.predict` raised 20→30/min (`.claude/rules/backend.md` updated in step) because one run now costs ten calls instead of one. `tests/demo/scenario.spec.ts` is rewritten, not preserved byte-for-byte — the accepted cost of choosing option (2). `MapCanvas` is not extended to plot ten ad-hoc prediction points; step 4 gets a table instead, which is also its required accessible-equivalent under `RULE-frontend.md` regardless.
**Nothing is cut.** No later-phase deliverable is displaced; this is a direct rework of an existing P7 control.
**Reversible.** Yes — reverting to a single `DEMO_COMPLAINT_ID` and the pre-existing `DemoWalkthrough.tsx`/`scenario.spec.ts` is an ordinary code revert; no migration or schema change is involved.

### DEC-013 · Scam Shield: a citizen-facing section, added as Phase 9
**Date** 2026-09-24 · **Decided by** Project owner · **Phase** P9 (new, after P8)
**Context.** The product starts after a complaint exists. The money it tries to intercept is recoverable only if the victim reports fast, and reporting speed is the one variable the officer-side product cannot touch. The project owner asked for features that help ordinary people avoid being scammed in the first place, reviewed the options, and chose four: Scam Check, Verify Before You Pay, Report Now with status tracking, and Hindi on the citizen pages.
**Options considered** for Report Now: (1) a guide only (checklist and links, no backend); (2) the full chain, where a citizen report creates a complaint in the officer queue that officers can analyse and alert on. **Decided: (2).** For the build: one developer, about two weeks.
**Decision.** A public `/safety` section, specified in `implementation/phase-9.md` and FEAT-17. Scam Check and Verify are fixed rules that run in the browser, with no model and no backend. Report Now writes a `DEMO`-origin complaint through a new `CITIZEN` role (ADR-022). The citizen status page shows a stage only, never a score, hotspot, window or amount.
**What this does not do.** It trains no scam classifier (a fourth model would need its own ADR, and no public Indian dataset exists), looks up no real phone number or UPI ID, publishes no predicted hotspot, and uses no generative model (DEC-007 stands).
**Consequences.** `REQUIREMENTS.md` FR-26 … FR-30; `FEATURE_SPECIFICATIONS.md` FEAT-17; `ACCEPTANCE_CRITERIA.md` AC-017-xx; migration `0006_add_citizen_reports`; capability matrix 24 × 6 = 144 cases; a seventh audited action (`CITIZEN_REPORT_SUBMITTED`); demo reset now also clears `DEMO`-origin complaints and every row that hangs off them, whatever those rows' own origin (`.claude/rules/database.md` invariant 5 reworded). A new fixed string tells every visitor the prototype does not forward reports to police or banks.
**Nothing is cut.** Phase 9 follows the terminal P8; no planned deliverable is displaced.
**Reversible.** The pages, service and capability changes are ordinary reverts. The migration adds an enum value, which cannot be dropped in place — see its rollback note.

---

## Scope Change Protocol

1. Propose, with the phase it affects and what it displaces.
2. Check against `ROADMAP.md` §5 guardrails.
3. If it adds to the current phase, name what is cut from a later one.
4. Record here before work begins.
5. Update `REQUIREMENTS.md`, the test matrix and the affected phase document in the same change.

**Never cut:** the vertical slice, explainability, the alert path, the integrity tests, or the prototype disclosures. Everything else is negotiable; those five are what make the product what it claims to be.
