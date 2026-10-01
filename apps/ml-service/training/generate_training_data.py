"""Builds the complaint x candidate-cell training table (T-3.3,
ai/model-selection.md §4). Reads the seeded Postgres corpus directly —
training scripts are the one place in this system that hold database
credentials; the served ML application never does (RULE-security.md
'The ML boundary').

    python3 training/generate_training_data.py --out training/data/dataset.csv

Grouped by complaint, never by row (ai/evaluation-framework.md §1): every
row for a complaint carries that complaint's deterministic split, computed
from a hash of (seed, complaint_id) so train.py and evaluate.py can each
recompute the same assignment independently without sharing cached state.
"""

import argparse
import hashlib
import os
import sys
from pathlib import Path
from typing import Final, Literal

import h3
import numpy as np
import pandas as pd
import psycopg

# Runs as `python3 apps/ml-service/training/generate_training_data.py` from
# the repo root (Makefile) — put the ml-service root on the path so `app.*`
# resolves to the same package the serving process imports (FR-06.4).
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.engine.features import (
    FEATURE_ORDER,
    AccountInput,
    CandidateCell,
    ComplaintInput,
    TransactionInput,
    build_vector,
)

Split = Literal["train", "calibration", "holdout"]

DATASET_SEED: Final = 26184
H3_RESOLUTION: Final = 8
K_RING: Final = 3
HISTORICAL_TOP_N: Final = 40
CANDIDATE_CAP: Final = 60
# ai/model-selection.md §2.1 pseudocode uses these exact three stages before
# the hard cap; the smoothing constant below is this script's own choice for
# turning a raw historical count into a bounded [0, 1) prior.
HOTSPOT_SCORE_SMOOTHING: Final = 10.0
ATM_KRING_K: Final = 1
H3_RES8_CELL_AREA_KM2: Final = 0.7373


def database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL must be set to build the training dataset")
    return url


def split_for(complaint_id: str, seed: int = DATASET_SEED) -> Split:
    """Deterministic 60/15/25 split by complaint (ai/evaluation-framework.md
    §1). A hash of (seed, complaint_id) rather than a stored assignment, so
    every consumer recomputes the identical split without shared state."""
    digest = hashlib.sha256(f"{seed}:{complaint_id}".encode()).hexdigest()
    bucket = int(digest, 16) % 100
    if bucket < 60:
        return "train"
    if bucket < 75:
        return "calibration"
    return "holdout"


def _load_tables(conn: psycopg.Connection) -> dict[str, pd.DataFrame]:
    return {
        "complaints": pd.read_sql(
            "SELECT id, complaint_id, fraud_type, amount_paise, complaint_timestamp, "
            "victim_lat, victim_lon, victim_h3_r8, city, district, state FROM complaints ORDER BY id",
            conn,
        ),
        "transactions": pd.read_sql(
            "SELECT complaint_id, from_account_id, to_account_id, amount_paise, timestamp, "
            "channel, hop_index, risk_indicator FROM transactions WHERE complaint_id IS NOT NULL",
            conn,
        ),
        "accounts": pd.read_sql("SELECT id, account_id, account_type, opened_at FROM accounts", conn),
        "withdrawals": pd.read_sql(
            "SELECT complaint_id, account_id, atm_id, h3_r8, timestamp FROM withdrawals", conn
        ),
        "atms": pd.read_sql("SELECT id, h3_r8, city, district, state FROM atms", conn),
        "risk_txns": pd.read_sql(
            "SELECT from_account_id, to_account_id, timestamp FROM transactions WHERE risk_indicator <> 'NONE'",
            conn,
        ),
    }


def _naive_utc(ts: pd.Timestamp) -> np.datetime64:
    """Every timestamp in this corpus is UTC (RULE-database.md); dropping the
    explicit tzinfo before building a numpy array avoids numpy's no-tz
    warning without changing any comparison's meaning."""
    naive = ts.tz_convert("UTC").tz_localize(None) if ts.tzinfo is not None else ts
    return np.datetime64(naive)


def _prior_count(sorted_timestamps: np.ndarray, before: pd.Timestamp) -> int:
    return int(np.searchsorted(sorted_timestamps, _naive_utc(before), side="left"))


def _generate_candidate_cells(
    victim_h3: str,
    complaint_city: str,
    complaint_district: str,
    complaint_state: str,
    withdrawal_counts_by_cell: dict[str, int],
    atm_counts_by_cell: dict[str, int],
    top_cells_by_state: dict[str, list[str]],
    location_by_cell: dict[str, tuple[str, str, str]],
) -> list[CandidateCell]:
    """H3 k-ring around the victim, unioned with the state's historically
    busiest cash-out cells, capped at CANDIDATE_CAP (ai/model-selection.md
    §2.1). A cash-out outside this set cannot be predicted at all — the
    documented recall ceiling, not a bug in this function."""
    disk = set(h3.grid_disk(victim_h3, K_RING))
    historical = set(top_cells_by_state.get(complaint_state, [])[:HISTORICAL_TOP_N])
    ordered = list(disk) + [c for c in historical if c not in disk]

    cells = []
    for h3_index in ordered[:CANDIDATE_CAP]:
        lat, lon = h3.cell_to_latlng(h3_index)
        ring_area_km2 = len(h3.grid_disk(h3_index, ATM_KRING_K)) * H3_RES8_CELL_AREA_KM2
        atm_count = sum(atm_counts_by_cell.get(c, 0) for c in h3.grid_disk(h3_index, ATM_KRING_K))
        withdrawal_count = withdrawal_counts_by_cell.get(h3_index, 0)
        # A cell with a recorded ATM/withdrawal history is named from that
        # ATM's real city/district/state; a pure k-ring cell with neither
        # falls back to the complaint's own location — still real data, not
        # a fabricated placeholder (CLAUDE.md's one rule).
        city, district, cell_state = location_by_cell.get(h3_index, (complaint_city, complaint_district, complaint_state))
        cells.append(
            CandidateCell(
                h3_index=h3_index,
                lat=lat,
                lon=lon,
                atm_count=atm_count,
                atm_density=atm_count / ring_area_km2,
                historical_hotspot_score=withdrawal_count / (withdrawal_count + HOTSPOT_SCORE_SMOOTHING),
                withdrawal_count=withdrawal_count,
                name=city,
                district=district,
                state=cell_state,
            )
        )
    return cells


def build_dataset(conn: psycopg.Connection) -> pd.DataFrame:
    """Emit one row per (complaint, candidate cell) with the 13 feature
    columns, the label, the complaint's group and its deterministic split."""
    t = _load_tables(conn)
    complaints, transactions, accounts, withdrawals, atms, risk_txns = (
        t["complaints"], t["transactions"], t["accounts"], t["withdrawals"], t["atms"], t["risk_txns"]
    )

    atm_counts_by_cell = atms["h3_r8"].value_counts().to_dict()
    location_by_cell = (
        atms.drop_duplicates(subset=["h3_r8"], keep="first")
        .set_index("h3_r8")[["city", "district", "state"]]
        .apply(tuple, axis=1)
        .to_dict()
    )
    true_cells_by_complaint = withdrawals.dropna(subset=["complaint_id"]).groupby("complaint_id")["h3_r8"].apply(set)
    true_withdrawal_time_by_complaint = (
        withdrawals.dropna(subset=["complaint_id"]).groupby("complaint_id")["timestamp"].min()
    )

    # Prior-activity lookups, sorted once per account so each complaint's
    # "prior to this timestamp" count is a binary search, not a query.
    risk_timestamps_by_account: dict[int, list[np.datetime64]] = {}
    for _, row in risk_txns.iterrows():
        for acc in (row["from_account_id"], row["to_account_id"]):
            risk_timestamps_by_account.setdefault(acc, []).append(_naive_utc(row["timestamp"]))
    risk_by_account: dict[int, np.ndarray] = {
        k: np.sort(np.array(v, dtype="datetime64[ns]")) for k, v in risk_timestamps_by_account.items()
    }

    withdrawal_ts_by_account = withdrawals.groupby("account_id")["timestamp"].apply(
        lambda s: np.sort(np.array([_naive_utc(v) for v in s], dtype="datetime64[ns]"))
    ).to_dict()

    accounts_by_id = accounts.set_index("id")
    rows: list[dict[str, object]] = []

    for complaint in complaints.itertuples():
        chain = transactions[transactions["complaint_id"] == complaint.id]
        chain_account_ids = set(chain["from_account_id"]) | set(chain["to_account_id"])

        txn_inputs = [
            TransactionInput(
                amount_paise=int(r.amount_paise), timestamp=r.timestamp.to_pydatetime(),
                channel=r.channel, hop_index=int(r.hop_index), risk_indicator=r.risk_indicator,
            )
            for r in chain.itertuples()
        ]
        account_inputs = []
        for acc_id in chain_account_ids:
            if acc_id not in accounts_by_id.index:
                continue
            acc = accounts_by_id.loc[acc_id]
            prior_flags = _prior_count(risk_by_account.get(acc_id, np.array([], dtype="datetime64[ns]")), complaint.complaint_timestamp)
            prior_withdrawals = _prior_count(
                withdrawal_ts_by_account.get(acc_id, np.array([], dtype="datetime64[ns]")), complaint.complaint_timestamp
            )
            account_inputs.append(
                AccountInput(
                    account_id=acc["account_id"], account_type=acc["account_type"],
                    opened_at=acc["opened_at"].to_pydatetime(), risk_score=0.0,
                    prior_suspicious_flags=prior_flags, prior_withdrawal_count=prior_withdrawals,
                )
            )

        complaint_input = ComplaintInput(
            complaint_id=complaint.complaint_id, fraud_type=complaint.fraud_type,
            amount_paise=int(complaint.amount_paise), timestamp=complaint.complaint_timestamp.to_pydatetime(),
            victim_lat=complaint.victim_lat, victim_lon=complaint.victim_lon, victim_h3_r8=complaint.victim_h3_r8,
        )
        true_cells = true_cells_by_complaint.get(complaint.id, set())
        withdrawal_time = true_withdrawal_time_by_complaint.get(complaint.id)
        hours_to_withdrawal = (
            (withdrawal_time - complaint.complaint_timestamp).total_seconds() / 3600
            if withdrawal_time is not None
            else np.nan
        )
        withdrawals_before_complaint = withdrawals[withdrawals["timestamp"] < complaint.complaint_timestamp]
        withdrawal_counts_by_cell = withdrawals_before_complaint["h3_r8"].value_counts().to_dict()
        withdrawals_by_state = withdrawals_before_complaint.merge(
            atms[["id", "state"]], left_on="atm_id", right_on="id", how="inner"
        )
        top_cells_by_state = {
            state: group["h3_r8"].value_counts().index.tolist()
            for state, group in withdrawals_by_state.groupby("state")
        }
        candidates = _generate_candidate_cells(
            complaint.victim_h3_r8, complaint.city, complaint.district, complaint.state,
            # Historical features must be point-in-time: a complaint cannot
            # use withdrawals that happened after it was filed. Using the full
            # table here leaked future outcomes into both candidate generation
            # and the model's Historical Hotspot explanation.
            withdrawal_counts_by_cell, atm_counts_by_cell, top_cells_by_state, location_by_cell,
        )
        split = split_for(complaint.complaint_id)

        for cell in candidates:
            vec = build_vector(complaint_input, txn_inputs, account_inputs, cell)
            row = dict(zip(FEATURE_ORDER, vec, strict=True))
            row.update(
                complaint_id=complaint.complaint_id, h3_index=cell.h3_index,
                y=1 if cell.h3_index in true_cells else 0, split=split,
                hours_to_withdrawal=hours_to_withdrawal,
            )
            rows.append(row)

    return pd.DataFrame(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="training/data/dataset.csv")
    args = parser.parse_args()

    with psycopg.connect(database_url()) as conn:
        dataset = build_dataset(conn)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    dataset.to_csv(out_path, index=False)

    counts = dataset.groupby("split")["complaint_id"].nunique().to_dict()
    reachable = dataset.groupby("complaint_id")["y"].max()
    print(
        f"wrote {len(dataset)} rows for {dataset['complaint_id'].nunique()} complaints -> {out_path}\n"
        f"split (complaints): {counts}\n"
        f"true cell reachable in candidate set: {reachable.mean():.3f} of complaints"
    )


if __name__ == "__main__":
    main()
