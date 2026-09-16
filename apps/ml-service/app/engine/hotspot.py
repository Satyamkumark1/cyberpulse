"""Spatial hotspot engine (FEAT-07, ai/model-selection.md §2). Ranks the
candidate cells the web application assembled, using DBSCAN to detect
whether they form a real density cluster and a documented weighted blend —
the model's probability as the dominant term — to produce the final order.
"""

import math
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Final

import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.neighbors import KernelDensity

from app.engine.features import CandidateCell

EARTH_RADIUS_M: Final = 6_371_000.0

# ai/model-selection.md §2.4 / low-level-design.md §4.3 — configuration, never
# a literal at the call site. The model carries 45%; the rest are domain
# priors that make a cold-start cell rankable when the model has little to
# go on (explainable to an officer in one sentence, unlike a learned blend).
COMBINED_WEIGHTS: Final[dict[str, float]] = {
    "model_probability": 0.45,
    "historical_frequency": 0.15,
    "current_activity": 0.12,
    "recency": 0.10,
    "linked_account_density": 0.08,
    "atm_density": 0.06,
    "temporal_match": 0.04,
}

# DBSCAN — ATM clusters in Indian urban markets sit at roughly this radius
# (ai/model-selection.md §2.2).
DBSCAN_EPS_METERS: Final = 800.0
DBSCAN_MIN_SAMPLES: Final = 5

# KDE — same 800 m bandwidth as the clustering radius; grid capped so the
# surface computation stays bounded regardless of candidate count.
KDE_BANDWIDTH_METERS: Final = 800.0
KDE_GRID_CAP: Final = 20_000

# A coarse, documented domain prior: late-night/early-morning hours carry a
# higher cash-out likelihood in the planted generator's fraud patterns. This
# is an internal ranking weight, never a value rendered to a user, and it is
# named here rather than inlined at the call site (ai/model-selection.md §2.4
# philosophy — a hand-set prior must be explainable in one sentence).
TEMPORAL_MATCH_HIGH_RISK_HOURS: Final[frozenset[int]] = frozenset({0, 1, 2, 3, 4, 5, 22, 23})


@dataclass(frozen=True)
class RankedCell:
    cell: CandidateCell
    model_probability: float
    combined: float


def _normalize(value: float, values: Sequence[float]) -> float:
    """Min-max normalise against the candidate set; 0.0 when every candidate
    ties (avoids a division by zero turning into a fabricated ranking)."""
    lo, hi = min(values), max(values)
    if hi - lo < 1e-12:
        return 0.0
    return (value - lo) / (hi - lo)


def compute_terms(
    cell: CandidateCell,
    all_cells: Sequence[CandidateCell],
    txn_velocity_1h: float,
    recency_hours: float,
    linked_account_count: float,
    linked_depth: float,
    hour_of_day: int,
) -> dict[str, float]:
    """The six non-model terms of the combined score, each in [0, 1] and each
    derived from real request data — never a placeholder (CLAUDE.md's one
    rule). `current_activity`, `recency` and `linked_account_density` reflect
    the complaint's own chain and are therefore identical across this
    complaint's candidates; `historical_frequency` and `atm_density` vary per
    cell because they come from that cell's own recorded history.
    """
    return {
        "historical_frequency": max(0.0, min(1.0, cell.historical_hotspot_score)),
        "current_activity": min(1.0, txn_velocity_1h / 5.0),
        "recency": max(0.0, 1.0 - min(1.0, recency_hours / 24.0)),
        "linked_account_density": min(1.0, linked_account_count / max(1.0, linked_depth) / 5.0),
        "atm_density": _normalize(cell.atm_density, [c.atm_density for c in all_cells]),
        "temporal_match": 1.0 if hour_of_day in TEMPORAL_MATCH_HIGH_RISK_HOURS else 0.4,
    }


def combined_score(model_probability: float, terms: dict[str, float]) -> float:
    """Weighted blend (ai/model-selection.md §2.4), clipped to [0, 1]."""
    score = COMBINED_WEIGHTS["model_probability"] * model_probability
    score += sum(COMBINED_WEIGHTS[k] * terms[k] for k in COMBINED_WEIGHTS if k != "model_probability")
    return float(np.clip(score, 0.0, 1.0))


def rank_candidates(ranked: list[RankedCell]) -> list[RankedCell]:
    """Non-increasing by combined score; ties broken ascending by h3Index so
    ordering is reproducible across runs (AC-007-02)."""
    return sorted(ranked, key=lambda r: (-r.combined, r.cell.h3_index))


def dbscan_cluster(cells: Sequence[CandidateCell]) -> tuple[list[int], bool]:
    """Cluster candidate centroids with DBSCAN (haversine metric). Returns
    (labels, clustering_fallback). Fallback is True when no real cluster is
    found — every point labelled noise — and the caller must flag
    `clusteringFallback: true` rather than pretend a cluster exists
    (ai/guardrails.md — 'Clustering finds nothing')."""
    if len(cells) < DBSCAN_MIN_SAMPLES:
        return [-1] * len(cells), True

    coords_rad = np.radians(np.array([[c.lat, c.lon] for c in cells]))
    eps_rad = DBSCAN_EPS_METERS / EARTH_RADIUS_M
    labels = DBSCAN(eps=eps_rad, min_samples=DBSCAN_MIN_SAMPLES, metric="haversine").fit_predict(coords_rad)
    fallback = bool((labels == -1).all())
    return labels.tolist(), fallback


def kde_surface(
    cells: Sequence[CandidateCell], weights: Sequence[float], grid_cap: int = KDE_GRID_CAP
) -> list[tuple[float, float, float]]:
    """Gaussian KDE heatmap surface over the candidate cells, evaluated on a
    grid capped at `grid_cap` points (ai/model-selection.md §2.3). Returns
    (lat, lon, density) triples. Empty input yields an empty surface rather
    than a fabricated one."""
    if not cells:
        return []

    coords_rad = np.radians(np.array([[c.lat, c.lon] for c in cells]))
    bandwidth_rad = KDE_BANDWIDTH_METERS / EARTH_RADIUS_M
    kde = KernelDensity(bandwidth=bandwidth_rad, metric="haversine", kernel="gaussian")
    kde.fit(coords_rad, sample_weight=np.array(weights) if any(weights) else None)

    lat_min, lat_max = coords_rad[:, 0].min(), coords_rad[:, 0].max()
    lon_min, lon_max = coords_rad[:, 1].min(), coords_rad[:, 1].max()
    side = max(1, math.isqrt(grid_cap))
    lat_pad = max(bandwidth_rad, (lat_max - lat_min) * 0.1)
    lon_pad = max(bandwidth_rad, (lon_max - lon_min) * 0.1)
    lat_grid = np.linspace(lat_min - lat_pad, lat_max + lat_pad, side)
    lon_grid = np.linspace(lon_min - lon_pad, lon_max + lon_pad, side)
    mesh_lat, mesh_lon = np.meshgrid(lat_grid, lon_grid)
    grid_points = np.column_stack([mesh_lat.ravel(), mesh_lon.ravel()])

    log_density = kde.score_samples(grid_points)
    density = np.exp(log_density)
    grid_deg = np.degrees(grid_points)
    return [(float(g[0]), float(g[1]), float(d)) for g, d in zip(grid_deg, density, strict=True)]
