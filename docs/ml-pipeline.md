# ML PIPELINE — Developer Guide

How to run, retrain and evaluate the models. Design rationale is in `ai/` (9 documents).

---

## The pipeline

```
generate:data  →  signal_check  →  pii_scan  →  db:seed
                       │                            │
                    (gate)                       (gate)
                                                    ↓
                                          generate_training_data
                                                    ↓
                                                 train
                                                    ↓
                                                evaluate  → (gate) → model_metrics
                                                    ↓
                                            artefacts → ML image
```

Three gates. **None accepts a skip flag in CI.**

---

## Commands

```bash
pnpm generate:data                              # seed 26184, deterministic
python scripts/evaluation/signal_check.py       # 8 patterns must be detectable
python scripts/evaluation/pii_scan.py           # must find nothing
pnpm db:seed                                    # verifies manifest checksums
pnpm train:model                                # risk + temporal, calibrated
pnpm evaluate                                   # gates; writes model_metrics
make promote                                    # promote the gate-passing staged bundle
```

`make setup` runs all of it.

---

## The three models

| Model | Task | Output |
|---|---|---|
| Risk | Binary classification over (complaint × candidate cell) pairs | Calibrated probability |
| Hotspot engine | H3 k-ring + historical candidate generation and weighted ranking; DBSCAN/KDE are offline helpers and are not served ranking inputs | Ranked candidates |
| Temporal | Multiclass over twelve 2-hour bins | Bounded window ≤ 4 h |

Plus exact SHAP (TreeExplainer) on the **top cell only** — explaining all sixty would cost ~4.2 s for information nobody reads.

---

## The 13 features

`txn_amount_total` · `txn_velocity_1h` · `linked_account_count` · `account_age_days_min` · `prior_suspicious_flags` · `distance_km` · `atm_density` · `historical_hotspot_score` · `hour_of_day` · `day_of_week` · `recency_hours` · `withdrawal_count` · `linked_depth`

Fixed order, numeric only, deterministic, documented defaults, no NaN. `assert_schema` runs before every inference.

**None encodes an identity or a demographic attribute.** That is what makes "predicts events, not people" structurally true.

---

## Training rules that matter

- **Split by complaint, never by row.** Sixty rows per complaint means a row split puts the same complaint on both sides.
- **Keep unreachable complaints** — those whose true cell was never a candidate — as all-negative groups. Dropping them inflates top-k hit rate by excluding the cases the engine cannot solve.
- `max_depth=5`. Deeper memorises a synthetic generator.
- Optimise **PR-AUC**, not ROC-AUC, at 1:59 imbalance. Report both.
- Calibrate with isotonic regression. An uncalibrated score shown as a percentage is a false statement.
- The holdout is touched **once**, by `evaluate.py`.

---

## Gates — release-blocking

ROC-AUC ≥ 0.850 · PR-AUC ≥ 0.450 · precision ≥ 0.750 · recall ≥ 0.700 · F1 ≥ 0.720 · ECE ≤ 0.100 · top-1 ≥ 0.450 · **top-3 ≥ 0.720** · top-5 ≥ 0.850 · temporal exact ≥ 0.400 · within ±1 ≥ 0.750

`evaluate.py` exits non-zero below any of them. **The gate is never lowered** (DEC-004) — a number published against a moved gate is a decoration, not a measurement.

---

## The two checks that keep the evaluation honest

**Shuffled labels must collapse to chance.** Retrain with labels shuffled within each complaint group. Top-3 hit rate must land within 0.05 of random. Anything above that means feature leakage, and every other metric is void.

**The margin over logistic regression is reported.** If the gradient-boosted model barely beats a linear baseline, the planted patterns are trivially linear and the evaluation is measuring the generator rather than the model. That is a finding to publish, not to hide.

---

## Retraining checklist

- [ ] Corpus regenerated or unchanged; `signal_check` passes
- [ ] Split still grouped by complaint
- [ ] Baselines recomputed
- [ ] All gates cleared
- [ ] Shuffled-label ablation collapses
- [ ] `model_metrics` row written
- [ ] `model_card.json` regenerated
- [ ] `CHANGELOG.md` `Model` entry with **before and after** for every gate
- [ ] Artefacts rebuilt into the image; version verified post-deploy

---

## What the metrics mean, and do not

Every figure is measured on **synthetic data** and describes the pipeline's ability to recover planted patterns. Labels come from `withdrawals.complaint_id`, a column that would not exist in production without outcome capture. Bias is untestable here because the generator's geography is a design choice.

State all three whenever a metric is quoted. `ai/evaluation-framework.md` §8 is the section to read before describing this model to anyone.
