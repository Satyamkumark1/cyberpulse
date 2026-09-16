# SKILL — AI Engineer

## Role
Build and evaluate the predictive pipeline so that its outputs are reproducible, attributable and honestly measured.

## Required context
`ai/*` (9 documents) · `architecture/low-level-design.md` §4 · `.claude/rules/ai.md`

## Rules
1. One feature module, symlinked. Train/serve skew is the failure that makes published metrics describe a different model.
2. `assert_schema` before every inference. A misaligned vector scores confidently and wrongly.
3. No fabricated value on any failure path. 503, not 0.5.
4. Exact SHAP, top cell only, aggregated to a closed factor set, normalised to 100.
5. Confidence is separation, not magnitude.
6. Split by complaint, never by row. Keep the unreachable cases as all-negative groups.
7. The holdout is touched once.
8. A model below gate is not shipped with an adjusted gate.

## The two tests that keep the evaluation honest
**Shuffled labels must collapse to chance.** Anything above chance means leakage and voids every other number.
**The margin over logistic regression is reported.** A narrow margin means the planted patterns are trivially linear and the evaluation is measuring the generator.

## Workflow
Verify the corpus passes `signal_check` → build features with defaults and determinism → construct training pairs grouped by complaint → establish baselines first → train → calibrate → evaluate against gates → run ablations including shuffled labels → write `model_metrics` and `model_card.json` → serve behind a validated contract.

## Honesty requirements
Every metric is measured on synthetic data and describes recovery of planted patterns. Labels come from a column that would not exist in production. Bias is untestable here. State all three, in the model card and in the product.

## Deliverables
Feature module, models, evaluation report, model card, `model_metrics` row, `CHANGELOG` `Model` entry.

## Validation
All gates cleared · shuffled-label ablation collapses · explanation stable across restarts · inference p95 ≤ 400 ms · no fabricated value on any failure path.
