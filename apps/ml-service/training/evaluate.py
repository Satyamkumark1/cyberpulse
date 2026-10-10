"""The only script with access to the holdout split (T-3.8,
ai/evaluation-framework.md §1, §6). Computes classification, ranking,
temporal and explanation metrics plus baselines and ablations, checks every
release gate, and — only if every gate clears — writes `model_metrics` and
`model_card.json`. A failing gate writes nothing (TC-ML-050).

    DATABASE_URL=... python3 apps/ml-service/training/evaluate.py
"""

import datetime as dt
import itertools
import json
import os
import sys
from pathlib import Path
from typing import Final

import joblib
import numpy as np
import pandas as pd
import psycopg
import shap
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.engine.explain import to_factors
from app.engine.features import FEATURE_ORDER, FEATURE_SCHEMA_VERSION, CandidateCell
from app.engine.hotspot import combined_score, compute_terms
from app.engine.model import CalibratedRiskModel, TemporalModel
from app.engine.temporal import BIN_HOURS
from training.generate_training_data import (
    DATASET_SEED,
    build_dataset,
    database_url,
)
from training.train import _temporal_bin, train_risk_model

MODEL_VERSION: Final = "CyberPulse-Demo-v1"
OPERATING_THRESHOLD: Final = 0.40  # settings.threshold_medium default — the "at least worth flagging" line
NUM_CALIBRATION_BINS: Final = 10
BOOTSTRAP_RESAMPLES: Final = 2000
SHUFFLED_LABEL_TOLERANCE: Final = 0.05  # TC-ML-071

# ai/evaluation-framework.md §2. Release-blocking; a failure here blocks
# training regardless of how small the miss looks (CLAUDE.md's one rule).
GATES: Final[dict[str, float]] = {
    "roc_auc": 0.850,
    "pr_auc": 0.450,
    "precision": 0.750,
    "recall": 0.700,
    "f1": 0.720,
    "calibration_ece": 0.100,  # lower is better — checked with <=
    "top1_hit_rate": 0.450,
    "top3_hit_rate": 0.720,
    "top5_hit_rate": 0.850,
    "mrr": 0.580,
    "temporal_exact": 0.400,
    "temporal_within_1": 0.750,
}
LOWER_IS_BETTER: Final = {"calibration_ece"}

ABLATION_FEATURE_GROUPS: Final[dict[str, list[str]]] = {
    "remove_spatial": ["distance_km", "atm_density"],
    "remove_temporal": ["hour_of_day", "day_of_week"],
    "remove_network": ["linked_account_count", "linked_depth"],
    "remove_historical_hotspot": ["historical_hotspot_score"],
}


def expected_calibration_error(probs: np.ndarray, labels: np.ndarray, n_bins: int = NUM_CALIBRATION_BINS) -> float:
    bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    for lo, hi in itertools.pairwise(bin_edges):
        mask = (probs >= lo) & (probs < hi) if hi < 1.0 else (probs >= lo) & (probs <= hi)
        if not mask.any():
            continue
        bin_confidence = probs[mask].mean()
        bin_accuracy = labels[mask].mean()
        ece += (mask.sum() / len(probs)) * abs(bin_confidence - bin_accuracy)
    return float(ece)


def rank_metrics(df: pd.DataFrame, score_col: str) -> dict[str, float]:
    """Per-complaint ranking, including complaints whose true cell was never
    a candidate — excluding them would inflate every number
    (ai/evaluation-framework.md §2.2)."""
    hit1 = hit3 = hit5 = 0
    reciprocal_ranks: list[float] = []
    n = 0
    for _, group in df.groupby("complaint_id"):
        n += 1
        ranked = group.sort_values([score_col, "h3_index"], ascending=[False, True]).reset_index(drop=True)
        true_positions = ranked.index[ranked["y"] == 1].tolist()
        if not true_positions:
            reciprocal_ranks.append(0.0)
            continue
        rank = true_positions[0] + 1
        reciprocal_ranks.append(1.0 / rank)
        hit1 += rank <= 1
        hit3 += rank <= 3
        hit5 += rank <= 5
    return {
        "top1_hit_rate": hit1 / n,
        "top3_hit_rate": hit3 / n,
        "top5_hit_rate": hit5 / n,
        "mrr": sum(reciprocal_ranks) / n,
    }


def random_baseline_top3(df: pd.DataFrame) -> float:
    """Analytic expectation under uniform-random ranking — exact rather than
    simulated, since the expectation has a closed form: min(3, k)/k for a
    complaint with k candidates and a reachable true cell, else 0."""
    per_complaint = []
    for _, group in df.groupby("complaint_id"):
        k = len(group)
        reachable = (group["y"] == 1).any()
        per_complaint.append(min(3, k) / k if reachable else 0.0)
    return float(np.mean(per_complaint))


def tie_averaged_top3(df: pd.DataFrame, score_col: str) -> pd.Series:
    """Per-complaint chance that the true cell is in the top 3 when tied
    scores are ordered at random. Isotonic calibration maps many cells to one
    score, and rank_metrics' h3_index tie-break then decides those top-3
    places in a fixed, non-random order (a scorer with every score tied gets
    0.1215 on this corpus, against 0.0633 for random). Averaging over tie
    orders puts a scorer that separates nothing exactly on the random
    baseline, so comparisons between rankers measure the rankers."""
    hits: dict[str, float] = {}
    for complaint_id, group in df.groupby("complaint_id"):
        scores = group[score_col].to_numpy()
        true_scores = scores[group["y"].to_numpy() == 1]
        if true_scores.size == 0:
            hits[str(complaint_id)] = 0.0
            continue
        true_score = true_scores.max()
        above = int((scores > true_score).sum())
        tied = int((scores == true_score).sum())
        hits[str(complaint_id)] = min(max(3 - above, 0), tied) / tied
    return pd.Series(hits, dtype=float)


def paired_bootstrap_ci(columns: dict[str, np.ndarray], seed: int = DATASET_SEED) -> dict[str, list[float]]:
    """95% percentile intervals, resampling complaints with replacement. One
    set of resample indices serves every column, so a difference column's
    interval is the paired interval."""
    n = len(next(iter(columns.values())))
    idx = np.random.default_rng(seed).integers(0, n, size=(BOOTSTRAP_RESAMPLES, n))
    return {
        name: [float(q) for q in np.percentile(values[idx].mean(axis=1), [2.5, 97.5])]
        for name, values in columns.items()
    }


def compare_with_history(served_df: pd.DataFrame) -> dict:
    """The question the baselines exist to answer: does the served ranking
    beat ranking by past withdrawals? Also scores the slice where history
    cannot help — reachable complaints whose true cell history does not put
    in its top 3."""
    served = tie_averaged_top3(served_df, "composite_score")
    historical = tie_averaged_top3(served_df, "historical_hotspot_score").reindex(served.index)
    reachable = served_df.groupby("complaint_id")["y"].max().rename(str).reindex(served.index) == 1
    novel = reachable & (historical == 0)
    columns = {
        "served": served.to_numpy(),
        "historicalFrequency": historical.to_numpy(),
        "servedMinusHistorical": (served - historical).to_numpy(),
    }
    intervals = paired_bootstrap_ci(columns)
    return {
        "metric": "top3_hit_rate, tie-averaged",
        "bootstrapResamples": BOOTSTRAP_RESAMPLES,
        "complaints": len(served),
        **{name: {"value": float(values.mean()), "ci95": intervals[name]} for name, values in columns.items()},
        "novelHotspots": {
            "complaints": int(novel.sum()),
            "servedTop3": float(served[novel].mean()) if novel.any() else None,
        },
    }


def shuffle_labels_within_complaint(df: pd.DataFrame, seed: int = DATASET_SEED) -> pd.DataFrame:
    # One generator across groups: a fresh seed per group would apply the
    # same permutation to every equal-sized complaint.
    rng = np.random.default_rng(seed)
    shuffled = df.copy()
    shuffled["y"] = shuffled.groupby("complaint_id")["y"].transform(lambda s: rng.permutation(s.to_numpy()))
    return shuffled


def check_leakage(ablations: dict[str, float], baselines: dict[str, float]) -> list[str]:
    """TC-ML-071: shuffled labels must land within 0.05 of random. Only the
    upper side is leakage; a shuffled model below chance is noise."""
    shuffled, random = ablations["shuffled_labels"], baselines["random"]
    ok = shuffled <= random + SHUFFLED_LABEL_TOLERANCE
    print(f"[{'PASS' if ok else 'FAIL'}] shuffled_labels={shuffled:.4f} (required <= random {random:.4f} + {SHUFFLED_LABEL_TOLERANCE})")
    return [] if ok else ["shuffled_labels"]


def score_holdout(model: CalibratedRiskModel, holdout_df: pd.DataFrame, feature_cols: list[str]) -> pd.DataFrame:
    scored = holdout_df.copy()
    scored["score"] = model.predict_proba(holdout_df[feature_cols].to_numpy())
    return scored


def score_served_pipeline(scored: pd.DataFrame) -> pd.DataFrame:
    """Apply the same calibrated-probability + domain-term blend as /predict.

    The dataset carries candidate metadata specifically to make this a
    complaint-level evaluation of the served ranking, not a proxy classifier
    ranking. The classifier score remains available as ``score`` for separate
    probability metrics.
    """
    result = scored.copy()
    result["composite_score"] = 0.0
    for complaint_id, group in result.groupby("complaint_id", sort=False):
        cells = [
            CandidateCell(
                h3_index=str(row.h3_index), lat=float(row.cell_lat), lon=float(row.cell_lon),
                atm_count=int(row.cell_atm_count), atm_density=float(row.cell_atm_density),
                historical_hotspot_score=float(row.historical_hotspot_score),
                withdrawal_count=int(row.cell_withdrawal_count),
            )
            for row in group.itertuples()
        ]
        values = []
        for row, cell in zip(group.itertuples(), cells, strict=True):
            terms = compute_terms(
                cell, cells,
                txn_velocity_1h=float(row.txn_velocity_1h),
                recency_hours=float(row.recency_hours),
                linked_account_count=float(row.linked_account_count),
                linked_depth=float(row.linked_depth),
                hour_of_day=int(row.hour_of_day),
            )
            values.append(combined_score(float(row.score), terms))
        result.loc[group.index, "composite_score"] = values
    return result


def run_ablations(train_df: pd.DataFrame, cal_df: pd.DataFrame, holdout_df: pd.DataFrame) -> dict[str, float]:
    # Tie-averaged throughout, including the unablated reference, so each
    # difference is a difference between models, not between tie orders.
    results: dict[str, float] = {"none_removed": float(tie_averaged_top3(holdout_df, "score").mean())}
    for name, excluded in ABLATION_FEATURE_GROUPS.items():
        cols = [c for c in FEATURE_ORDER if c not in excluded]
        model = train_risk_model(train_df, cal_df, cols)
        scored = score_holdout(model, holdout_df, cols)
        results[name] = float(tie_averaged_top3(scored, "score").mean())

    # Shuffled *within* each complaint's own candidates, not across the whole
    # split: many complaints share the same state-wide "historical" candidate
    # cells (identical historical_hotspot_score, since that feature is a
    # property of the cell, not the complaint). A global shuffle leaks the
    # marginal label frequency back through those repeated high-frequency
    # cells; a per-group shuffle destroys the label/feature relationship
    # without that artifact (TC-ML-071).
    shuffled_model = train_risk_model(shuffle_labels_within_complaint(train_df), cal_df, FEATURE_ORDER)
    shuffled_scored = score_holdout(shuffled_model, holdout_df, FEATURE_ORDER)
    results["shuffled_labels"] = float(tie_averaged_top3(shuffled_scored, "score").mean())
    return results


def run_baselines(train_df: pd.DataFrame, cal_df: pd.DataFrame, holdout_df: pd.DataFrame) -> dict[str, float]:
    nearest = float(tie_averaged_top3(holdout_df.assign(neg_distance=-holdout_df["distance_km"]), "neg_distance").mean())
    historical = float(tie_averaged_top3(holdout_df, "historical_hotspot_score").mean())

    scaler = StandardScaler().fit(train_df[FEATURE_ORDER])
    logreg = LogisticRegression(max_iter=1000, random_state=DATASET_SEED)
    logreg.fit(scaler.transform(train_df[FEATURE_ORDER]), train_df["y"])
    logreg_scored = holdout_df.copy()
    logreg_scored["logreg_score"] = logreg.predict_proba(scaler.transform(holdout_df[FEATURE_ORDER]))[:, 1]
    logreg_top3 = float(tie_averaged_top3(logreg_scored, "logreg_score").mean())

    return {
        "random": random_baseline_top3(holdout_df),
        "nearest_cell": nearest,
        "historical_frequency": historical,
        "logistic_regression": logreg_top3,
    }


def temporal_metrics(temporal_model: TemporalModel, holdout_df: pd.DataFrame) -> dict[str, float]:
    # Same restriction as training: a negative hours_to_withdrawal has no
    # future window to score against.
    labelled = holdout_df[(holdout_df["y"] == 1) & (holdout_df["hours_to_withdrawal"] >= 0)]
    if labelled.empty:
        return {"temporal_exact": 0.0, "temporal_within_1": 0.0, "temporal_mae_hours": float("inf")}

    x = labelled[FEATURE_ORDER].to_numpy()
    true_bins = labelled["hours_to_withdrawal"].apply(_temporal_bin).to_numpy()
    predicted_bins = np.argmax(temporal_model.predict_bin_probabilities(x), axis=1)

    exact = float((predicted_bins == true_bins).mean())
    within_1 = float((np.abs(predicted_bins - true_bins) <= 1).mean())
    mae_hours = float(np.mean(np.abs(predicted_bins - true_bins)) * BIN_HOURS)
    return {"temporal_exact": exact, "temporal_within_1": within_1, "temporal_mae_hours": mae_hours}


def explanation_checks(risk_model: CalibratedRiskModel, holdout_df: pd.DataFrame, sample_size: int = 20) -> dict[str, float]:
    explainer = shap.TreeExplainer(risk_model.classifier)
    top_per_complaint = holdout_df.sort_values("score", ascending=False).groupby("complaint_id").head(1)
    sample = top_per_complaint.head(sample_size)

    at_least_5 = []
    sums_ok = []
    stable = []
    for _, row in sample.iterrows():
        x = row[FEATURE_ORDER].to_numpy(dtype=np.float64).reshape(1, -1)
        shap_values_a = explainer.shap_values(x)[0]
        shap_values_b = explainer.shap_values(x)[0]  # recomputed — stability check
        factors = to_factors(list(shap_values_a), FEATURE_ORDER)
        factors_b = to_factors(list(shap_values_b), FEATURE_ORDER)

        at_least_5.append(len(factors) >= 5)
        sums_ok.append(abs(sum(f["contribution"] for f in factors) - 100.0) <= 0.5)
        stable.append(factors == factors_b)

    return {
        "min_five_factors_rate": float(np.mean(at_least_5)) if at_least_5 else 0.0,
        "sum_100_rate": float(np.mean(sums_ok)) if sums_ok else 0.0,
        "stability_rate": float(np.mean(stable)) if stable else 0.0,
    }


def check_gates(metrics: dict[str, float]) -> list[str]:
    failures = []
    for name, required in GATES.items():
        value = metrics[name]
        ok = value <= required if name in LOWER_IS_BETTER else value >= required
        comparator = "<=" if name in LOWER_IS_BETTER else ">="
        print(f"[{'PASS' if ok else 'FAIL'}] {name}={value:.4f} (required {comparator} {required})")
        if not ok:
            failures.append(name)
    return failures


def write_model_metrics(conn: psycopg.Connection, metrics: dict[str, float], n_train: int, n_test: int) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO model_metrics (
                model_version, trained_at, dataset_seed, split, precision, recall, f1, roc_auc,
                top1_hit_rate, top3_hit_rate, top5_hit_rate, temporal_exact, temporal_within_1,
                calibration_ece, operating_threshold, n_train, n_test, notes
            ) VALUES (%s, %s, %s, 'holdout', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                MODEL_VERSION, dt.datetime.now(dt.timezone.utc), DATASET_SEED,
                metrics["precision"], metrics["recall"], metrics["f1"], metrics["roc_auc"],
                metrics["top1_hit_rate"], metrics["top3_hit_rate"], metrics["top5_hit_rate"],
                metrics["temporal_exact"], metrics["temporal_within_1"], metrics["calibration_ece"],
                OPERATING_THRESHOLD, n_train, n_test,
                "measured on a held-out split of synthetic data; does not represent operational performance",
            ),
        )
    conn.commit()


def main() -> None:
    model_dir = Path(os.environ.get("MODEL_DIR", str(Path(__file__).resolve().parents[1] / "models" / "staging")))
    risk_model: CalibratedRiskModel = joblib.load(model_dir / "risk_model.joblib")
    temporal_model: TemporalModel = joblib.load(model_dir / "temporal_model.joblib")

    with psycopg.connect(database_url()) as conn:
        dataset = build_dataset(conn)
        train_df = dataset[dataset["split"] == "train"]
        cal_df = dataset[dataset["split"] == "calibration"]
        holdout_df = score_holdout(risk_model, dataset[dataset["split"] == "holdout"], FEATURE_ORDER)
        served_holdout_df = score_served_pipeline(holdout_df)

        y_true = holdout_df["y"].to_numpy()
        y_score = holdout_df["score"].to_numpy()
        y_pred = (y_score >= OPERATING_THRESHOLD).astype(int)

        metrics: dict[str, float] = {
            "roc_auc": float(roc_auc_score(y_true, y_score)),
            "pr_auc": float(average_precision_score(y_true, y_score)),
            "precision": float(precision_score(y_true, y_pred, zero_division=0)),
            "recall": float(recall_score(y_true, y_pred, zero_division=0)),
            "f1": float(f1_score(y_true, y_pred, zero_division=0)),
            "calibration_ece": expected_calibration_error(y_score, y_true),
            # Published ranking gates use the exact served composite score.
            **rank_metrics(served_holdout_df, "composite_score"),
            # Keep classifier ranking separate; calibration and these values
            # must not be read as metrics for the blend.
            **{f"classifier_{key}": value for key, value in rank_metrics(holdout_df, "score").items()},
            **temporal_metrics(temporal_model, holdout_df),
        }

        print("--- baselines (top-3 hit rate) ---")
        baselines = run_baselines(train_df, cal_df, holdout_df)
        for name, value in baselines.items():
            print(f"  {name}: {value:.4f}")
        print(f"  served composite ranker: {metrics['top3_hit_rate']:.4f}")
        print(f"  classifier probability ranker: {metrics['classifier_top3_hit_rate']:.4f}")

        print("--- ablations (top-3 hit rate) ---")
        ablations = run_ablations(train_df, cal_df, holdout_df)
        for name, value in ablations.items():
            print(f"  {name}: {value:.4f}")

        print("--- served ranker vs historical frequency (top-3, 95% bootstrap CI) ---")
        comparison = compare_with_history(served_holdout_df)
        for name in ("served", "historicalFrequency", "servedMinusHistorical"):
            low, high = comparison[name]["ci95"]
            print(f"  {name}: {comparison[name]['value']:.4f} [{low:.4f}, {high:.4f}]")
        novel = comparison["novelHotspots"]
        novel_top3 = "—" if novel["servedTop3"] is None else f"{novel['servedTop3']:.4f}"
        print(f"  novel hotspots (true cell outside history's top 3): {novel['complaints']} complaints, served top-3 {novel_top3}")

        print("--- explanation checks (sample of holdout top-ranked cells) ---")
        explanation = explanation_checks(risk_model, holdout_df)
        for name, value in explanation.items():
            print(f"  {name}: {value:.4f}")

        print("--- gates ---")
        failures = check_gates(metrics) + check_leakage(ablations, baselines)

        if failures:
            print(f"\nevaluate.py FAILED: {len(failures)} gate(s) not met: {', '.join(failures)}")
            print("nothing written to model_metrics or model_card.json")
            sys.exit(1)

        write_model_metrics(conn, metrics, n_train=len(train_df), n_test=len(holdout_df))

    model_card = {
        "modelVersion": MODEL_VERSION,
        "featureSchemaVersion": FEATURE_SCHEMA_VERSION,
        "trainedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "datasetSeed": DATASET_SEED,
        "intendedUse": (
            "Decision support for cyber-fraud investigators: ranking candidate cash-withdrawal "
            "locations and time windows for a filed complaint."
        ),
        "outOfScope": [
            "Any determination about an individual",
            "Autonomous enforcement action",
            "Deployment on real data without retraining, bias evaluation and outcome capture",
        ],
        "trainingData": f"Synthetic corpus, seed {DATASET_SEED}, generated by scripts/generate-data/generator.py",
        "limitations": [
            "Metrics describe recovery of planted synthetic patterns, not real-world accuracy",
            "The composite ranking metrics use the same calibrated-probability and domain-term scorer as serving; classifier probability metrics are reported separately",
            "The composite score is a ranking score, not a calibrated cash-out probability",
            "Labels derive from withdrawals.complaint_id, which would not exist in production without outcome capture",
            "No bias or differential-impact evaluation is possible on synthetic data",
            "Candidate generation bounds achievable recall",
            "24-hour horizon and H3 resolution 8 are fixed assumptions",
            "Training counts every account in a complaint's chain, including accounts the money reaches only after the complaint was filed; serving counts only those seen by filing time, so the temporal metrics are optimistic",
            "Training orders the state's historical candidate cells by h3_index while serving orders them by withdrawal count, so the 60-cell cap can keep different cells in each",
            "Only distance, ATM density and past withdrawals differ between candidate cells, so the money trail cannot change which cell ranks first; it affects the risk level and the time window",
        ],
        "metrics": metrics,
        "baselines": baselines,
        "ablations": ablations,
        "comparisonWithHistory": comparison,
        "explanationChecks": explanation,
    }
    (model_dir / "model_card.json").write_text(json.dumps(model_card, indent=2))
    (model_dir / "evaluation_passed.json").write_text(
        json.dumps({"modelVersion": MODEL_VERSION, "holdoutGatesPassed": True, "evaluatedAt": dt.datetime.now(dt.timezone.utc).isoformat()}, indent=2)
        + "\n"
    )
    print(f"\nevaluate.py PASSED: all gates cleared. model_metrics written; model_card.json -> {model_dir}")


if __name__ == "__main__":
    main()
