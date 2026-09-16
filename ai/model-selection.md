# MODEL SELECTION — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Models | `risk_model` (XGBoost) · `temporal_model` (XGBoost multiclass) · hotspot engine (H3 + DBSCAN + KDE, unsupervised) |
| Related | ADR-010, ADR-012, ADR-013, `ai/evaluation-framework.md` |

---

## 1. Model 1 — Risk Scoring

### 1.1 Task

Binary classification over (complaint × candidate cell) pairs. Target: did the cash-out for this complaint occur in this cell within 24 hours?

### 1.2 Selection

| Candidate | Verdict | Reasoning |
|---|---|---|
| Logistic regression | Rejected as primary | Retained as a **baseline** — if XGBoost cannot beat it by a meaningful margin, the planted patterns are trivially linear and the evaluation is not telling us much |
| Random forest | Rejected | Comparable accuracy, poorer calibration, larger artefacts |
| **XGBoost** | **Selected** | Best tabular performance at this scale, exact TreeExplainer support, fast inference, small artefact |
| LightGBM | Documented alternative | Faster training on wide data; drop-in if XGBoost training time becomes a constraint |
| CatBoost | Rejected | Its strength is categorical handling; all thirteen features are numeric |
| Neural network | Rejected | Weaker on tabular data at this scale, slower, and no exact attribution method |

Keeping logistic regression as a baseline is not ceremony. On synthetic data with planted patterns, a gradient-boosted model will always score well; the baseline is what tells us whether it is learning anything a linear model could not.

### 1.3 Configuration

```python
XGBClassifier(
    n_estimators=400,
    max_depth=5,                 # shallow — depth 8+ memorises planted patterns
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    min_child_weight=5,          # guards against leaves fitting a handful of rows
    gamma=0.5,
    reg_alpha=0.1,
    reg_lambda=1.0,
    scale_pos_weight=<neg/pos>,  # ~1:59 with 60 candidates per complaint
    objective='binary:logistic',
    eval_metric='aucpr',         # PR-AUC, not ROC-AUC, for training on imbalanced data
    tree_method='hist',
    random_state=26184,
)
```

Two choices deserve their reasons stated.

**`max_depth=5`.** Deep trees on synthetic data with planted patterns produce spectacular training metrics and a model that has memorised the generator. Shallow trees force it to learn the pattern rather than the instances.

**`eval_metric='aucpr'`.** With roughly one positive per sixty candidates, ROC-AUC is optimistic and easy to look good on. PR-AUC is the honest training signal. ROC-AUC is still *reported* because it is the metric an evaluator expects to see, but it is not what the model is tuned against.

### 1.4 Calibration

Raw gradient-boosting outputs are not well-calibrated probabilities, and the UI presents the score as a percentage. Isotonic regression is fitted on a held-out calibration split, and expected calibration error over ten bins must be ≤ 0.10 (M-30).

Presenting an uncalibrated score as "91.7%" would be a quiet form of the fabrication the whole design guards against.

### 1.5 Thresholds

| Level | Rule |
|---|---|
| HIGH | `score ≥ threshold_high` (default 0.70) |
| MEDIUM | `threshold_medium ≤ score < threshold_high` (default 0.40) |
| LOW | `score < threshold_medium` (default 0.40) |

Read from `settings`, adjustable by ADMIN, with a database `CHECK` enforcing `high > medium`. Changing a threshold changes *display only* — stored scores are never rewritten (AC-015-03).

---

## 2. Model 2 — Spatial Hotspot Engine

Unsupervised. Three components with distinct jobs.

### 2.1 H3 candidate generation

Resolution 8 (~0.74 km², ~461 m edge) — a locality/market-block scale matching how a place like "Sector 18, Noida" is actually described, and coarse enough that a patrol team can cover it.

```python
candidates  = h3.grid_disk(victim_cell, k=3)                       # ~37 cells
candidates |= historical_cells_in_state(top_n=40)                  # prior cash-out geography
candidates  = dedupe(candidates)[:60]                              # hard cap
```

The k-ring covers "nearby", historical cells cover "where this syndicate has cashed out before", and the 60-cell cap bounds both inference latency and the training row count.

**Consequence worth stating:** a cash-out outside the candidate set cannot be predicted at all. Candidate generation is a hard ceiling on recall, and it is listed as a limitation in `ai/ai-strategy.md` §10.

### 2.2 DBSCAN

```python
DBSCAN(eps=800/6371000, min_samples=5, metric='haversine')   # 800 m in radians
```

`eps = 800 m` because ATM clusters in Indian urban markets sit at roughly that scale. `min_samples = 5` because fewer would promote coincidence to cluster. Both are configuration, not literals.

K-means was rejected because it requires a pre-set cluster count, which is precisely the unknown. When DBSCAN finds no cluster, the engine falls back to plain H3 aggregation and flags `clusteringFallback: true` in the response — surfaced honestly rather than hidden.

### 2.3 KDE

Gaussian kernel, 800 m bandwidth, grid capped at 20,000 cells, producing the heatmap surface. Aggregated server-side to at most 2,000 weighted points before it reaches the browser.

### 2.4 Combined score

```python
COMBINED_WEIGHTS = {
    "model_probability":      0.45,
    "historical_frequency":   0.15,
    "current_activity":       0.12,
    "recency":                0.10,
    "linked_account_density": 0.08,
    "atm_density":            0.06,
    "temporal_match":         0.04,
}
```

The model carries 45%; the rest are domain priors that make a cold-start cell rankable when the model has little to go on. Ties break deterministically on `h3Index` so ordering is reproducible (AC-007-02).

**Why not learn the weights?** They could be learned, and at scale they should be. At prototype scale, learned blend weights would overfit the generator, and — more importantly — hand-set weights can be explained to an officer in one sentence. That trade is worth making here and would not be worth making in production.

---

## 3. Model 3 — Temporal Window

### 3.1 Task

Multiclass over twelve 2-hour bins spanning 24 hours from the complaint timestamp.

### 3.2 Selection

| Candidate | Verdict |
|---|---|
| Regression on hours-until-withdrawal | Rejected — a point estimate with no distribution, and no way to widen honestly |
| Survival analysis | Rejected — better theory, materially harder to explain, and the 24-hour horizon makes censoring largely moot |
| **Multiclass over 2-hour bins** | **Selected** — yields a distribution, a natural window, and interpretable per-bin probabilities |
| LSTM / sequence model | Rejected — insufficient data, no explainability |

### 3.3 Configuration

```python
XGBClassifier(
    n_estimators=250, max_depth=4, learning_rate=0.06,
    objective='multi:softprob', num_class=12,
    eval_metric='mlogloss', random_state=26184,
)
```

Features: the temporal subset of the vector, plus the top cell's historical hour profile.

### 3.4 Window construction

```
top = argmax(probs)
neighbours = adjacent bins where probs[top] - probs[i] < 0.05
window = union of top and at most one neighbour     → ≤ 4 hours
```

Widening to at most one adjacent bin expresses genuine uncertainty while respecting the 4-hour cap (AC-008-02). A flat distribution yields the top bin with LOW confidence — the field is never omitted, because an absent window is less useful than an uncertain one.

---

## 4. Training Data Construction

```
For each complaint C in the training split:
    candidates = generate_candidates(C)              # ~60 cells
    for H in candidates:
        x = features(C, H)
        y = 1 if actual_withdrawal_cell(C) == H else 0
        emit(x, y, group=C)
```

- Grouping by complaint is essential: **split by complaint, never by row**, or the same complaint appears on both sides and the metrics are meaningless.
- Roughly 500 complaints × 60 candidates ≈ 30,000 training rows.
- Class balance approximately 1:59, handled by `scale_pos_weight`.
- Complaints whose actual cell is outside the candidate set are retained as all-negative groups, because dropping them would inflate top-k hit rate by silently excluding the cases the engine cannot solve.

That last point is the difference between a hit rate that describes the system and one that flatters it.

---

## 5. Hyperparameter Search

Grouped 5-fold cross-validation, grouped by complaint, optimising PR-AUC.

| Parameter | Grid |
|---|---|
| `max_depth` | 3, 4, 5, 6 |
| `learning_rate` | 0.03, 0.05, 0.1 |
| `n_estimators` | 200, 400, 600 |
| `min_child_weight` | 1, 5, 10 |
| `gamma` | 0, 0.5, 1.0 |

Search runs with a fixed seed and the selected configuration is committed, so training is reproducible rather than re-searched on every run.

---

## 6. Artefacts

| Artefact | Contents |
|---|---|
| `risk_model.joblib` | Calibrated classifier pipeline |
| `temporal_model.joblib` | Multiclass classifier |
| `feature_schema.json` | Feature order, dtypes, defaults, `fs-1` |
| `model_card.json` | Version, seed, training date, metrics, intended use, limitations |

All four are baked into the ML container image, so the deployed model version is a property of the image tag and cannot drift from what is reported.

---

## 7. Rejected Approaches, Recorded

| Approach | Why rejected |
|---|---|
| Coordinate regression | No probability, no alternatives, no natural metric (ADR-013) |
| Learned combined-score weights | Would overfit the generator; hand-set weights are explainable |
| Ensemble of XGBoost + LightGBM | Marginal gain, doubled artefacts, and SHAP aggregation across families |
| Per-fraud-type models | Insufficient data per type; `fraud_type` would be a feature at scale |
| Deep spatial models (CNN over a rasterised grid) | Data-hungry, unexplainable, and worse at this scale |
| Any LLM in the prediction path | Non-reproducible, non-attributable, and unverifiable offline |
| Online learning | Would make the demonstration non-deterministic |
