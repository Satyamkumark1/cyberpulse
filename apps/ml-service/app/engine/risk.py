"""Risk score derivation (FEAT-06, ai/model-selection.md §1). The one place
`riskLevel` and `confidence` are computed — ai.md's "no override" guarantee.
"""

from typing import Final, Literal

import numpy as np

RiskLevel = Literal["LOW", "MEDIUM", "HIGH"]

# ai/model-selection.md §1.5. Overridable per request via the thresholds the
# web app reads from `settings` (predictionService) — these are only the
# fallback when a caller supplies none.
DEFAULT_THRESHOLD_HIGH: Final[float] = 0.70
DEFAULT_THRESHOLD_MEDIUM: Final[float] = 0.40


def clip_score(raw: float) -> float:
    """Explicit float() + explicit clip (coding-standards.md §3.3) — a raw
    model output must never leave this module outside [0, 1]."""
    return float(np.clip(raw, 0.0, 1.0))


def derive_risk_level(score: float, threshold_high: float, threshold_medium: float) -> RiskLevel:
    """HIGH >= threshold_high; MEDIUM in [threshold_medium, threshold_high);
    else LOW. Both bounds inclusive at the lower edge (TC-ML-011)."""
    if score >= threshold_high:
        return "HIGH"
    if score >= threshold_medium:
        return "MEDIUM"
    return "LOW"


def confidence(ranked_scores: list[float]) -> RiskLevel:
    """Confidence is separation between the top two ranked scores, not
    magnitude (ai.md — 'Confidence means separation, not magnitude').
    A top score of 0.92 with a second of 0.91 is not a confident prediction.
    """
    if len(ranked_scores) < 2:
        return "LOW"
    margin = ranked_scores[0] - ranked_scores[1]
    if margin >= 0.15 and ranked_scores[0] >= 0.70:
        return "HIGH"
    if margin >= 0.07:
        return "MEDIUM"
    return "LOW"
