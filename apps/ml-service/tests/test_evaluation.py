import numpy as np
import pandas as pd
import pytest

from training.evaluate import (
    check_leakage,
    compare_with_history,
    random_baseline_top3,
    score_served_pipeline,
    shuffle_labels_within_complaint,
    tie_averaged_top3,
)


def _candidates(complaint_id: str, scores: list[float], true_index: int | None) -> list[dict]:
    return [
        {"complaint_id": complaint_id, "h3_index": f"{complaint_id}-cell-{i}", "score": s, "y": int(i == true_index)}
        for i, s in enumerate(scores)
    ]


@pytest.mark.unit
def test_all_tied_scores_land_on_the_random_baseline_whatever_the_h3_order():
    # The true cell sorts first by h3_index; a deterministic tie-break would
    # credit a scorer that separates nothing with a top-3 hit.
    df = pd.DataFrame(_candidates("C-00001", [0.2] * 10, true_index=0) + _candidates("C-00002", [0.2] * 4, true_index=3))

    assert tie_averaged_top3(df, "score").mean() == pytest.approx(random_baseline_top3(df))


@pytest.mark.unit
def test_a_tie_straddling_the_rank_three_cut_earns_fractional_credit():
    # One cell above, four tied for the two remaining top-3 slots.
    df = pd.DataFrame(_candidates("C-00001", [0.9, 0.5, 0.5, 0.5, 0.5], true_index=2))

    assert tie_averaged_top3(df, "score").loc["C-00001"] == pytest.approx(0.5)


@pytest.mark.unit
def test_an_unreachable_true_cell_scores_zero():
    df = pd.DataFrame(_candidates("C-00001", [0.9, 0.5], true_index=None))

    assert tie_averaged_top3(df, "score").loc["C-00001"] == 0.0


@pytest.mark.unit
def test_label_shuffle_is_independent_per_complaint():
    # Every complaint has its positive in position 0; a shared permutation
    # would move all of them to the same position and keep that structure.
    rows = [row for c in range(30) for row in _candidates(f"C-{c:05d}", [0.0] * 8, true_index=0)]
    shuffled = shuffle_labels_within_complaint(pd.DataFrame(rows), seed=26184)

    positions = shuffled.groupby("complaint_id")["y"].apply(lambda s: int(np.argmax(s.to_numpy())))
    assert positions.nunique() > 1
    assert (shuffled.groupby("complaint_id")["y"].sum() == 1).all()


@pytest.mark.unit
def test_shuffled_labels_more_than_0_05_above_random_fail_the_leakage_check():
    assert check_leakage({"shuffled_labels": 0.12}, {"random": 0.06}) == ["shuffled_labels"]
    assert check_leakage({"shuffled_labels": 0.10}, {"random": 0.06}) == []


@pytest.mark.unit
def test_comparison_reports_the_novel_hotspot_slice_and_paired_intervals():
    # C-1: history ranks the true cell first; C-2: history ranks it last
    # (a novel hotspot) but the served scorer finds it; C-3: unreachable.
    rows = []
    for complaint_id, history, composite, true_index in (
        ("C-00001", [0.9, 0.1, 0.1, 0.1, 0.1], [0.9, 0.1, 0.2, 0.3, 0.4], 0),
        ("C-00002", [0.9, 0.8, 0.7, 0.6, 0.1], [0.1, 0.2, 0.3, 0.4, 0.9], 4),
        ("C-00003", [0.9, 0.8, 0.7, 0.6, 0.1], [0.1, 0.2, 0.3, 0.4, 0.9], None),
    ):
        for row, h, c in zip(_candidates(complaint_id, composite, true_index), history, composite, strict=True):
            rows.append({**row, "historical_hotspot_score": h, "composite_score": c})

    comparison = compare_with_history(pd.DataFrame(rows))

    assert comparison["complaints"] == 3
    assert comparison["served"]["value"] == pytest.approx(2 / 3)
    assert comparison["historicalFrequency"]["value"] == pytest.approx(1 / 3)
    assert comparison["novelHotspots"] == {"complaints": 1, "servedTop3": 1.0}
    for key in ("served", "historicalFrequency", "servedMinusHistorical"):
        low, high = comparison[key]["ci95"]
        assert low <= comparison[key]["value"] <= high


@pytest.mark.unit
def test_evaluation_scores_the_served_composite_not_classifier_probability_only():
    rows = []
    for index, (probability, density) in enumerate(((0.8, 0.0), (0.7, 10.0))):
        rows.append(
            {
                "complaint_id": "C-00001",
                "h3_index": f"cell-{index}",
                "score": probability,
                "cell_lat": 28.6 + index * 0.01,
                "cell_lon": 77.2,
                "cell_atm_count": 2,
                "cell_atm_density": density,
                "cell_withdrawal_count": index + 1,
                "historical_hotspot_score": 0.1 * (index + 1),
                "txn_velocity_1h": 1.0,
                "recency_hours": 1.0,
                "linked_account_count": 2.0,
                "linked_depth": 1.0,
                "hour_of_day": 2.0,
                "y": int(index == 1),
            }
        )

    scored = score_served_pipeline(pd.DataFrame(rows))

    assert scored["score"].tolist() == [0.8, 0.7]
    assert scored["composite_score"].iloc[1] > scored["composite_score"].iloc[0]
