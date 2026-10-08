import pandas as pd
import pytest

from training.evaluate import score_served_pipeline


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
