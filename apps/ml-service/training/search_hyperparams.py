"""One-off hyperparameter search (T-3.4, ai/model-selection.md §5). Grid
search over the documented parameter space, scored by top-3 hit rate on the
calibration split (never the holdout). Prints the winner so it can be copied
into RISK_MODEL_PARAMS in train.py — this script does not write artefacts.
"""

import itertools
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import psycopg
from xgboost import XGBClassifier

from app.engine.features import FEATURE_ORDER
from training.evaluate import rank_metrics
from training.generate_training_data import build_dataset, database_url

GRID = {
    "max_depth": [3, 4, 5, 6],
    "learning_rate": [0.03, 0.05, 0.1],
    "n_estimators": [200, 400, 600],
    "min_child_weight": [1, 5, 10],
    "gamma": [0, 0.5, 1.0],
}


def main() -> None:
    with psycopg.connect(database_url()) as conn:
        dataset = build_dataset(conn)
    train_df = dataset[dataset["split"] == "train"]
    cal_df = dataset[dataset["split"] == "calibration"].copy()

    x_train, y_train = train_df[FEATURE_ORDER].to_numpy(), train_df["y"].to_numpy()
    neg, pos = (y_train == 0).sum(), (y_train == 1).sum()
    scale_pos_weight = neg / pos

    keys = list(GRID)
    best = None
    for values in itertools.product(*GRID.values()):
        params = dict(zip(keys, values, strict=True))
        clf = XGBClassifier(
            **params,
            subsample=0.8,
            colsample_bytree=0.8,
            reg_alpha=0.1,
            reg_lambda=1.0,
            objective="binary:logistic",
            eval_metric="aucpr",
            tree_method="hist",
            random_state=26184,
            scale_pos_weight=scale_pos_weight,
        )
        clf.fit(x_train, y_train)
        scored = cal_df.copy()
        scored["score"] = clf.predict_proba(cal_df[FEATURE_ORDER].to_numpy())[:, 1]
        top3 = rank_metrics(scored, "score")["top3_hit_rate"]
        if best is None or top3 > best[0]:
            best = (top3, params)
            print(f"new best top3={top3:.4f} params={params}")

    print(f"\nWINNER top3={best[0]:.4f} params={best[1]}")


if __name__ == "__main__":
    main()
