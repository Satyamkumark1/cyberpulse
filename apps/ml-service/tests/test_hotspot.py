import pytest

from app.engine.features import CandidateCell
from app.engine.hotspot import (
    COMBINED_WEIGHTS,
    RankedCell,
    combined_score,
    compute_terms,
    dbscan_cluster,
    kde_surface,
    rank_candidates,
)


def make_cell(h3_index: str, lat: float, lon: float, atm_density: float = 1.0, hist: float = 0.5) -> CandidateCell:
    return CandidateCell(
        h3_index=h3_index, lat=lat, lon=lon, atm_count=3, atm_density=atm_density,
        historical_hotspot_score=hist, withdrawal_count=10,
    )


@pytest.mark.unit
def test_combined_score_composition_to_6dp():
    terms = {"historical_frequency": 0.6, "current_activity": 0.4, "recency": 0.8,
             "linked_account_density": 0.2, "atm_density": 0.5, "temporal_match": 1.0}
    expected = (
        COMBINED_WEIGHTS["model_probability"] * 0.9
        + COMBINED_WEIGHTS["historical_frequency"] * 0.6
        + COMBINED_WEIGHTS["current_activity"] * 0.4
        + COMBINED_WEIGHTS["recency"] * 0.8
        + COMBINED_WEIGHTS["linked_account_density"] * 0.2
        + COMBINED_WEIGHTS["atm_density"] * 0.5
        + COMBINED_WEIGHTS["temporal_match"] * 1.0
    )

    assert combined_score(0.9, terms) == pytest.approx(expected, abs=1e-6)
    assert round(combined_score(0.9, terms), 6) == round(expected, 6)


@pytest.mark.unit
def test_combined_score_clipped_to_0_1():
    terms = dict.fromkeys(COMBINED_WEIGHTS, 1.0)
    assert combined_score(1.0, terms) == 1.0
    terms_zero = dict.fromkeys(COMBINED_WEIGHTS, 0.0)
    assert combined_score(0.0, terms_zero) == 0.0


@pytest.mark.unit
def test_ranked_output_shape_and_ordering_non_increasing():
    cells = [make_cell("h1", 28.5, 77.1), make_cell("h2", 28.6, 77.2), make_cell("h3", 28.7, 77.3)]
    ranked = [
        RankedCell(cells[0], 0.3, 0.30),
        RankedCell(cells[1], 0.9, 0.90),
        RankedCell(cells[2], 0.6, 0.60),
    ]

    result = rank_candidates(ranked)

    assert [r.combined for r in result] == [0.90, 0.60, 0.30]
    assert [r.cell.h3_index for r in result] == ["h2", "h3", "h1"]


@pytest.mark.unit
def test_reproducibility_including_tie_break_by_h3index():
    cells = [make_cell("8860d4d4b3fffff", 28.4, 77.0), make_cell("8860d4d4b1fffff", 28.5, 77.1)]
    ranked = [RankedCell(cells[0], 0.5, 0.50), RankedCell(cells[1], 0.5, 0.50)]

    result_a = rank_candidates(ranked)
    result_b = rank_candidates(list(reversed(ranked)))

    # Same combined score -> ascending h3Index wins, regardless of input order.
    assert [r.cell.h3_index for r in result_a] == ["8860d4d4b1fffff", "8860d4d4b3fffff"]
    assert [r.cell.h3_index for r in result_b] == ["8860d4d4b1fffff", "8860d4d4b3fffff"]


@pytest.mark.unit
def test_compute_terms_stay_within_0_1_and_vary_by_cell_attributes():
    cells = [make_cell("h1", 28.5, 77.1, atm_density=1.0, hist=0.2), make_cell("h2", 28.6, 77.2, atm_density=9.0, hist=0.9)]

    terms_low = compute_terms(cells[0], cells, txn_velocity_1h=2, recency_hours=1, linked_account_count=3, linked_depth=2, hour_of_day=14)
    terms_high = compute_terms(cells[1], cells, txn_velocity_1h=2, recency_hours=1, linked_account_count=3, linked_depth=2, hour_of_day=14)

    for terms in (terms_low, terms_high):
        for v in terms.values():
            assert 0.0 <= v <= 1.0
    assert terms_high["historical_frequency"] > terms_low["historical_frequency"]
    assert terms_high["atm_density"] > terms_low["atm_density"]


@pytest.mark.unit
def test_dbscan_recovers_a_known_cluster():
    # Five points tight together (< 800 m) plus one far outlier.
    tight = [make_cell(f"tight{i}", 28.5000 + i * 0.0005, 77.2000 + i * 0.0005) for i in range(5)]
    outlier = make_cell("far", 12.9, 77.6)  # Bengaluru — far from the Delhi-NCR cluster

    labels, fallback = dbscan_cluster([*tight, outlier])

    assert fallback is False
    assert len(labels) == 6
    assert labels[-1] == -1  # the outlier is noise
    assert len({label for label in labels[:5]}) == 1  # the five tight points share one cluster
    assert labels[0] != -1


@pytest.mark.unit
def test_dbscan_fallback_disclosed_when_no_cluster_exists():
    scattered = [make_cell(f"s{i}", 20.0 + i * 2.0, 75.0 + i * 2.0) for i in range(6)]

    labels, fallback = dbscan_cluster(scattered)

    assert fallback is True
    assert all(label == -1 for label in labels)


@pytest.mark.unit
def test_dbscan_fallback_when_fewer_candidates_than_min_samples():
    labels, fallback = dbscan_cluster([make_cell("only", 28.5, 77.1)])
    assert fallback is True
    assert labels == [-1]


@pytest.mark.unit
def test_kde_surface_bounds_density_non_negative_and_grid_capped():
    cells = [make_cell(f"h{i}", 28.5 + i * 0.01, 77.1 + i * 0.01) for i in range(4)]

    surface = kde_surface(cells, weights=[1.0, 2.0, 3.0, 4.0], grid_cap=100)

    assert len(surface) <= 100
    assert all(density >= 0.0 for _, _, density in surface)
    assert all(-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0 for lat, lon, _ in surface)


@pytest.mark.unit
def test_kde_surface_empty_input_yields_empty_surface():
    assert kde_surface([], []) == []
