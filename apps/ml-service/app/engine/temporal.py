"""Expected withdrawal window (FEAT-08, ai/model-selection.md §3). Twelve
2-hour bins spanning 24 hours from the complaint timestamp.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Final

import numpy as np
import numpy.typing as npt

from app.engine.risk import RiskLevel, confidence

NUM_BINS: Final = 12
BIN_HOURS: Final = 2
WIDEN_MARGIN: Final = 0.05  # ai/model-selection.md §3.4 — adjacent-bin widening threshold


@dataclass(frozen=True)
class TemporalWindow:
    start: datetime
    end: datetime
    confidence: RiskLevel
    fallback: bool


def window_from_bins(probs: npt.NDArray[np.float64], start_ref: datetime) -> TemporalWindow:
    """Turn a 12-bin probability distribution into a window of at most one
    widened neighbour (<= 4 hours, AC-008-02). A flat distribution still
    returns the top bin — never omitted — with LOW confidence and
    `fallback=True` (ai/guardrails.md — 'Temporal distribution flat')."""
    if probs.shape != (NUM_BINS,):
        raise ValueError(f"expected {NUM_BINS} bin probabilities, got shape {probs.shape}")

    top = int(np.argmax(probs))
    neighbours = [i for i in (top - 1, top + 1) if 0 <= i < NUM_BINS and probs[top] - probs[i] < WIDEN_MARGIN]
    # At most one neighbour is ever added, whichever is more probable, so the
    # window never exceeds two bins (ai/model-selection.md §3.4).
    chosen_neighbour = max(neighbours, key=lambda i: probs[i]) if neighbours else None
    bins = sorted([top, chosen_neighbour]) if chosen_neighbour is not None else [top]

    window_start = start_ref + timedelta(hours=BIN_HOURS * bins[0])
    window_end = start_ref + timedelta(hours=BIN_HOURS * (bins[-1] + 1))

    top_two = sorted(probs.tolist(), reverse=True)[:2]
    level = confidence(top_two)
    return TemporalWindow(start=window_start, end=window_end, confidence=level, fallback=level == "LOW")
