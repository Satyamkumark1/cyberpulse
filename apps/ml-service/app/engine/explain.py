"""SHAP-based risk factors (FEAT-09, low-level-design.md §4.6). Exact
TreeExplainer attributions, aggregated into the closed, officer-readable
factor set and normalised so contributions sum to 100 ± 0.5.
"""

from collections import defaultdict
from typing import Final, Literal, TypedDict

from app.engine.features import FEATURE_ORDER

FactorName = Literal[
    "Transaction Velocity",
    "Historical Hotspot",
    "Linked Account Pattern",
    "ATM Proximity",
    "Time Pattern",
    "Amount / Frequency",
    "Account Age",
    "Withdrawal History",
    "Other factors",
]

# FEATURE_SPECIFICATIONS.md FEAT-09 §Mapping. Every entry in FEATURE_ORDER
# must appear here exactly once — asserted at import time below, so a new
# feature added to features.py without a mapping fails immediately rather
# than silently dropping its contribution.
FACTOR_MAP: Final[dict[str, FactorName]] = {
    "txn_velocity_1h": "Transaction Velocity",
    "recency_hours": "Transaction Velocity",
    "historical_hotspot_score": "Historical Hotspot",
    "linked_account_count": "Linked Account Pattern",
    "linked_depth": "Linked Account Pattern",
    "distance_km": "ATM Proximity",
    "atm_density": "ATM Proximity",
    "hour_of_day": "Time Pattern",
    "day_of_week": "Time Pattern",
    "txn_amount_total": "Amount / Frequency",
    "withdrawal_count": "Withdrawal History",
    "account_age_days_min": "Account Age",
    "prior_suspicious_flags": "Withdrawal History",
}
assert set(FACTOR_MAP) == set(FEATURE_ORDER), "every feature must map to exactly one factor name"

MIN_FACTORS: Final = 5
COLLAPSE_THRESHOLD_PCT: Final = 2.0
OTHER_FACTORS: Final[FactorName] = "Other factors"


class Factor(TypedDict):
    name: FactorName
    contribution: float
    direction: Literal["INCREASES", "REDUCES"]


def to_factors(shap_values: list[float], feature_names: list[str]) -> list[Factor]:
    """Aggregate raw per-feature SHAP values into the closed factor set,
    normalised so |contribution| sums to 100 ± 0.5 when non-zero, ordered by
    descending absolute contribution. These are relative contributions to the
    classifier output, not a decomposition of the final blended ranking
    score or a calibrated probability."""
    grouped: dict[FactorName, float] = defaultdict(float)
    for name, value in zip(feature_names, shap_values, strict=True):
        grouped[FACTOR_MAP[name]] += value

    total = sum(abs(v) for v in grouped.values())
    if total == 0:
        return []
    factors: list[Factor] = [
        {
            "name": name,
            "contribution": round(abs(value) / total * 100, 1),
            "direction": "INCREASES" if value > 0 else "REDUCES",
        }
        for name, value in grouped.items()
    ]
    factors.sort(key=lambda f: f["contribution"], reverse=True)
    return collapse_small(factors, threshold=COLLAPSE_THRESHOLD_PCT, min_keep=MIN_FACTORS)


def collapse_small(factors: list[Factor], threshold: float, min_keep: int) -> list[Factor]:
    """Fold factors below `threshold` into 'Other factors' once at least
    `min_keep` named factors remain — guarantees >= 5 named entries while the
    sum stays exactly 100, which a naive truncation could not do at once."""
    if len(factors) <= min_keep:
        return factors

    kept = factors[:min_keep]
    residual = factors[min_keep:]
    small_enough = [f for f in residual if f["contribution"] < threshold]
    kept_extra = [f for f in residual if f["contribution"] >= threshold]

    result = kept + kept_extra
    if small_enough:
        other_total = round(sum(f["contribution"] for f in small_enough), 1)
        signed_total = sum(f["contribution"] if f["direction"] == "INCREASES" else -f["contribution"] for f in small_enough)
        result.append(
            {
                "name": OTHER_FACTORS,
                "contribution": other_total,
                "direction": "INCREASES" if signed_total >= 0 else "REDUCES",
            }
        )
    result.sort(key=lambda f: f["contribution"], reverse=True)
    return result
