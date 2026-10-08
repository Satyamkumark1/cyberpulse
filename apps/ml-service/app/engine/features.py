"""The single feature module (FEAT-05, ai/ai-strategy.md §1). `training/features.py`
is a symlink to this file — there is one feature path, not two that can drift
(FR-06.4, TC-UNIT-014).
"""

import math
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Final
from zoneinfo import ZoneInfo

import numpy as np
import numpy.typing as npt

from app.core.errors import FeatureSchemaMismatch

IST: Final = ZoneInfo("Asia/Kolkata")
EARTH_RADIUS_KM: Final = 6371.0

# FEATURE_SPECIFICATIONS.md §FEAT-05. Fixed order — this list, the trained
# model's column order and feature_schema.json must always agree; assert_schema
# is what makes a drift between them a typed error instead of a silent one.
FEATURE_ORDER: Final[list[str]] = [
    "txn_amount_total",
    "txn_velocity_1h",
    "linked_account_count",
    "account_age_days_min",
    "prior_suspicious_flags",
    "distance_km",
    "atm_density",
    "historical_hotspot_score",
    "hour_of_day",
    "day_of_week",
    "recency_hours",
    "withdrawal_count",
    "linked_depth",
]
FEATURE_SCHEMA_VERSION: Final[str] = "fs-1"

FEATURE_DTYPES: Final[dict[str, str]] = {
    "txn_amount_total": "float",
    "txn_velocity_1h": "float",
    "linked_account_count": "int",
    "account_age_days_min": "int",
    "prior_suspicious_flags": "int",
    "distance_km": "float",
    "atm_density": "float",
    "historical_hotspot_score": "float",
    "hour_of_day": "int",
    "day_of_week": "int",
    "recency_hours": "float",
    "withdrawal_count": "int",
    "linked_depth": "int",
}

# The "global prior" default for historical_hotspot_score (FEAT-05 table row 8):
# a candidate cell with no recorded withdrawal history is treated as an
# average cell, not a zero-risk one — zero would itself be an unearned signal.
GLOBAL_HOTSPOT_PRIOR: Final[float] = 0.05

FEATURE_DEFAULTS: Final[dict[str, float]] = {
    "txn_amount_total": 0.0,
    "txn_velocity_1h": 0.0,
    "linked_account_count": 1.0,
    "account_age_days_min": 0.0,
    "prior_suspicious_flags": 0.0,
    "distance_km": 0.0,  # always computed; listed for schema completeness only
    "atm_density": 0.0,
    "historical_hotspot_score": GLOBAL_HOTSPOT_PRIOR,
    "hour_of_day": 0.0,  # always computed; listed for schema completeness only
    "day_of_week": 0.0,  # always computed; listed for schema completeness only
    "recency_hours": 0.0,
    "withdrawal_count": 0.0,
    "linked_depth": 1.0,
}


@dataclass(frozen=True)
class ComplaintInput:
    complaint_id: str
    fraud_type: str
    amount_paise: int
    timestamp: datetime  # tz-aware, UTC
    victim_lat: float
    victim_lon: float
    victim_h3_r8: str


@dataclass(frozen=True)
class TransactionInput:
    amount_paise: int
    timestamp: datetime  # tz-aware, UTC
    channel: str
    hop_index: int
    risk_indicator: str


@dataclass(frozen=True)
class AccountInput:
    account_id: str
    account_type: str
    opened_at: datetime  # tz-aware, UTC
    risk_score: float
    prior_suspicious_flags: int
    prior_withdrawal_count: int = 0


@dataclass(frozen=True)
class CandidateCell:
    h3_index: str
    lat: float
    lon: float
    atm_count: int
    atm_density: float
    historical_hotspot_score: float
    withdrawal_count: int
    # Display metadata only — never used in build_vector. Carried here
    # because the ML service has no database access to look a name up
    # itself (RULE-security.md 'The ML boundary'): the web app, which does,
    # supplies it in the request so the response can name the winning cell.
    name: str = ""
    district: str = ""
    state: str = ""


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in kilometres. Deterministic, pure."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return float(2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a)))


def build_vector(
    complaint: ComplaintInput,
    transactions: Sequence[TransactionInput],
    accounts: Sequence[AccountInput],
    cell: CandidateCell,
) -> npt.NDArray[np.float64]:
    """Build the 13-feature vector for one complaint-cell pair.

    Deterministic: identical inputs produce an identical vector (TC-UNIT-012).
    Missing inputs resolve to the documented defaults in FEATURE_DEFAULTS;
    this never raises on absence, only `assert_schema` raises, and only on a
    schema mismatch (TC-UNIT-013).
    """
    values: dict[str, float] = dict(FEATURE_DEFAULTS)

    # Historical forecasts may only use information available at the
    # observation timestamp (the complaint timestamp).
    observed_transactions = [t for t in transactions if t.timestamp <= complaint.timestamp]
    if observed_transactions:
        values["txn_amount_total"] = float(sum(t.amount_paise for t in observed_transactions))

        window_start = complaint.timestamp.timestamp() - 3600
        values["txn_velocity_1h"] = float(
            sum(1 for t in observed_transactions if window_start <= t.timestamp.timestamp() <= complaint.timestamp.timestamp())
        )

        values["linked_depth"] = float(max(t.hop_index for t in observed_transactions) + 1)

        latest_txn_ts = max(t.timestamp.timestamp() for t in observed_transactions)
        values["recency_hours"] = max(0.0, (complaint.timestamp.timestamp() - latest_txn_ts) / 3600)

    if accounts:
        values["linked_account_count"] = float(len({a.account_id for a in accounts}))
        values["account_age_days_min"] = float(
            min(max(0.0, (complaint.timestamp - a.opened_at).total_seconds() / 86400) for a in accounts)
        )
        values["prior_suspicious_flags"] = float(sum(a.prior_suspicious_flags for a in accounts))
        values["withdrawal_count"] = float(sum(a.prior_withdrawal_count for a in accounts))

    # Always computed — geography and calendar exist for every candidate cell,
    # so these two rows never fall back to a default (FEAT-05 edge cases).
    values["distance_km"] = haversine_km(complaint.victim_lat, complaint.victim_lon, cell.lat, cell.lon)
    complaint_ist = complaint.timestamp.astimezone(IST)
    values["hour_of_day"] = float(complaint_ist.hour)
    values["day_of_week"] = float(complaint_ist.weekday())

    values["atm_density"] = float(cell.atm_density)
    values["historical_hotspot_score"] = float(cell.historical_hotspot_score)

    vec = np.array([values[name] for name in FEATURE_ORDER], dtype=np.float64)
    assert not np.isnan(vec).any(), "NaN in feature vector"
    return vec


def build_feature_schema() -> dict[str, object]:
    """The artefact written alongside the trained models (T-3.1). Order,
    dtypes and defaults all derive from this module, never restated by hand."""
    return {
        "version": FEATURE_SCHEMA_VERSION,
        "order": list(FEATURE_ORDER),
        "dtypes": dict(FEATURE_DTYPES),
        "defaults": dict(FEATURE_DEFAULTS),
    }


def assert_schema(vec: npt.NDArray[np.float64], schema: dict[str, object]) -> None:
    """Raise FeatureSchemaMismatch if order or length disagree with the stored
    schema. Runs before every inference (ai/guardrails.md G-10) — a mismatch
    aborts rather than scoring a misaligned vector."""
    order = schema.get("order")
    if not isinstance(order, list) or order != FEATURE_ORDER:
        raise FeatureSchemaMismatch("feature order does not match the stored feature_schema.json")
    if vec.shape != (len(FEATURE_ORDER),):
        raise FeatureSchemaMismatch(f"expected a vector of shape ({len(FEATURE_ORDER)},), got {vec.shape}")
