"""Fits the risk and temporal models on the train + calibration splits only
(T-3.4, T-3.5). `evaluate.py` is the only script with access to the holdout
(ai/evaluation-framework.md §1) — this script never reads it.

    DATABASE_URL=... python3 apps/ml-service/training/train.py
"""

import json
import sys
from pathlib import Path
from typing import Final

import joblib
import numpy as np
import pandas as pd
import psycopg
from sklearn.isotonic import IsotonicRegression
from xgboost import XGBClassifier

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.engine.features import FEATURE_ORDER, build_feature_schema
from app.engine.model import CalibratedRiskModel, TemporalModel
from training.generate_training_data import build_dataset, database_url

RANDOM_STATE: Final = 26184
NUM_TEMPORAL_BINS: Final = 12
TEMPORAL_BIN_HOURS: Final = 2

# Winner of the documented grid search (ai/model-selection.md §5), run by
# training/search_hyperparams.py, scored by top-3 hit rate on the
# calibration split (never the holdout).
RISK_MODEL_PARAMS: Final = {
    "n_estimators": 200,
    "max_depth": 6,
    "learning_rate": 0.05,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "min_child_weight": 10,
    "gamma": 0,
    "reg_alpha": 0.1,
    "reg_lambda": 1.0,
    "objective": "binary:logistic",
    "eval_metric": "aucpr",
    "tree_method": "hist",
    "random_state": RANDOM_STATE,
}

TEMPORAL_MODEL_PARAMS: Final = {
    "n_estimators": 250,
    "max_depth": 4,
    "learning_rate": 0.06,
    "objective": "multi:softprob",
    "eval_metric": "mlogloss",
    "random_state": RANDOM_STATE,
}
# `num_class` is deliberately not passed above: XGBoost's sklearn wrapper
# infers it from the labels actually seen in `y` and encodes them into
# `model.classes_`, in order. Not every complaint's cash-out lands in every
# one of the 12 bins, so `y` is rarely a dense 0..11 range — pinning
# num_class=12 makes the wrapper reject a perfectly valid, sparser label set
# outright. TemporalModel.predict_bin_probabilities maps through
# `model.classes_` so no caller can mistake a class index for a bin number.


def train_risk_model(train_df: pd.DataFrame, cal_df: pd.DataFrame) -> CalibratedRiskModel:
    x_train, y_train = train_df[FEATURE_ORDER].to_numpy(), train_df["y"].to_numpy()
    neg, pos = int((y_train == 0).sum()), int((y_train == 1).sum())
    scale_pos_weight = neg / pos if pos else 1.0

    classifier = XGBClassifier(**RISK_MODEL_PARAMS, scale_pos_weight=scale_pos_weight)
    classifier.fit(x_train, y_train)

    raw_cal_scores = classifier.predict_proba(cal_df[FEATURE_ORDER].to_numpy())[:, 1]
    calibrator = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
    calibrator.fit(raw_cal_scores, cal_df["y"].to_numpy())

    return CalibratedRiskModel(classifier=classifier, calibrator=calibrator)


def _temporal_bin(hours_to_withdrawal: float) -> int:
    return int(np.clip(hours_to_withdrawal // TEMPORAL_BIN_HOURS, 0, NUM_TEMPORAL_BINS - 1))


def train_temporal_model(train_cal_df: pd.DataFrame) -> TemporalModel:
    # Trained on the true-cell row only (y == 1) — the temporal target is
    # "when", conditioned on the cell already being the correct one. The full
    # 13-feature vector is used as input rather than hand-picking a temporal
    # subset (ai/model-selection.md §3.3 calls for the temporal subset plus a
    # historical-hour term); the full vector is a strict superset and this
    # avoids a second, cell-specific hour-profile pipeline for a prototype.
    #
    # Restricted to hours_to_withdrawal >= 0: a negative value means the
    # cash-out already happened before the complaint was filed, for which
    # there is no future window to predict at all — including those rows
    # would ask the model to learn a bin for an event already in the past.
    labelled = train_cal_df[(train_cal_df["y"] == 1) & (train_cal_df["hours_to_withdrawal"] >= 0)]
    x = labelled[FEATURE_ORDER].to_numpy()
    bins = labelled["hours_to_withdrawal"].apply(_temporal_bin).to_numpy()

    # XGBoost's sklearn API requires dense zero-based labels at fit time
    # (see app/engine/model.py's TemporalModel docstring) — encode to a
    # dense range for fit, keep the real bin numbers to decode predictions.
    bin_labels, encoded = np.unique(bins, return_inverse=True)

    classifier = XGBClassifier(**TEMPORAL_MODEL_PARAMS)
    classifier.fit(x, encoded)
    return TemporalModel(classifier=classifier, bin_labels=bin_labels)


def main() -> None:
    model_dir = Path(__file__).resolve().parents[1] / "models"
    model_dir.mkdir(parents=True, exist_ok=True)

    with psycopg.connect(database_url()) as conn:
        dataset = build_dataset(conn)

    train_df = dataset[dataset["split"] == "train"]
    cal_df = dataset[dataset["split"] == "calibration"]
    if train_df.empty or cal_df.empty:
        raise RuntimeError("train or calibration split is empty — check the seeded corpus")

    risk_model = train_risk_model(train_df, cal_df)
    temporal_model = train_temporal_model(pd.concat([train_df, cal_df]))


    joblib.dump(risk_model, model_dir / "risk_model.joblib")
    joblib.dump(temporal_model, model_dir / "temporal_model.joblib")
    (model_dir / "feature_schema.json").write_text(json.dumps(build_feature_schema(), indent=2))

    print(f"trained on {len(train_df)} train rows, calibrated on {len(cal_df)} rows -> {model_dir}")


if __name__ == "__main__":
    main()
