import pytest

from app.engine.explain import FACTOR_MAP, OTHER_FACTORS, collapse_small, to_factors
from app.engine.features import FEATURE_ORDER


@pytest.mark.unit
def test_every_feature_maps_to_exactly_one_closed_factor_name():
    assert set(FACTOR_MAP) == set(FEATURE_ORDER)
    valid_names = {
        "Transaction Velocity", "Historical Hotspot", "Linked Account Pattern",
        "ATM Proximity", "Time Pattern", "Amount / Frequency",
        "Account Age", "Withdrawal History",
    }
    assert set(FACTOR_MAP.values()) <= valid_names


@pytest.mark.unit
def test_factors_are_ordered_by_descending_absolute_contribution():
    shap_values = [0.5, 0.1, 0.02, 0.01, 0.005, -0.9, 0.3, 0.2, 0.15, 0.05, 0.02, 0.01, 0.01]
    factors = to_factors(shap_values, FEATURE_ORDER)

    contributions = [f["contribution"] for f in factors]
    assert contributions == sorted(contributions, reverse=True)


@pytest.mark.unit
def test_closed_enum_only_a_raw_feature_identifier_never_appears():
    shap_values = [0.1] * 13
    factors = to_factors(shap_values, FEATURE_ORDER)

    names = {f["name"] for f in factors}
    assert "txn_velocity_1h" not in names
    assert all(n in set(FACTOR_MAP.values()) | {OTHER_FACTORS} for n in names)


@pytest.mark.unit
def test_contributions_sum_to_100_within_half_a_point():
    shap_values = [0.5, -0.1, 0.02, 0.01, -0.005, 0.9, -0.3, 0.2, 0.15, 0.05, 0.02, 0.01, 0.01]
    factors = to_factors(shap_values, FEATURE_ORDER)

    assert sum(f["contribution"] for f in factors) == pytest.approx(100.0, abs=0.5)


@pytest.mark.unit
def test_direction_sign_correctness():
    shap_values = dict.fromkeys(FEATURE_ORDER, 0.0)
    shap_values["historical_hotspot_score"] = 5.0  # strongly positive -> INCREASES
    shap_values["account_age_days_min"] = -5.0  # strongly negative -> REDUCES
    factors = to_factors(list(shap_values.values()), list(shap_values.keys()))

    by_name = {f["name"]: f for f in factors}
    assert by_name["Historical Hotspot"]["direction"] == "INCREASES"
    assert by_name["Account Age"]["direction"] == "REDUCES"


@pytest.mark.unit
def test_minimum_five_named_factors_even_when_one_feature_dominates():
    shap_values = dict.fromkeys(FEATURE_ORDER, 0.001)
    shap_values["txn_velocity_1h"] = 10.0  # dominates almost entirely
    factors = to_factors(list(shap_values.values()), list(shap_values.keys()))

    named = [f for f in factors if f["name"] != OTHER_FACTORS]
    assert len(named) >= 5


@pytest.mark.unit
def test_stability_identical_inputs_produce_identical_output_across_repeated_calls():
    shap_values = [0.5, -0.1, 0.02, 0.01, -0.005, 0.9, -0.3, 0.2, 0.15, 0.05, 0.02, 0.01, 0.01]

    results = [to_factors(shap_values, FEATURE_ORDER) for _ in range(20)]

    assert all(r == results[0] for r in results)


@pytest.mark.unit
def test_collapse_small_preserves_total_and_folds_below_threshold_into_other_factors():
    factors = [
        {"name": "Transaction Velocity", "contribution": 40.0, "direction": "INCREASES"},
        {"name": "Historical Hotspot", "contribution": 25.0, "direction": "INCREASES"},
        {"name": "Linked Account Pattern", "contribution": 15.0, "direction": "INCREASES"},
        {"name": "ATM Proximity", "contribution": 10.0, "direction": "REDUCES"},
        {"name": "Time Pattern", "contribution": 6.0, "direction": "INCREASES"},
        {"name": "Amount / Frequency", "contribution": 1.5, "direction": "INCREASES"},
        {"name": "Account Age", "contribution": 1.5, "direction": "REDUCES"},
        {"name": "Withdrawal History", "contribution": 1.0, "direction": "INCREASES"},
    ]

    result = collapse_small(factors, threshold=2.0, min_keep=5)

    named = [f for f in result if f["name"] != OTHER_FACTORS]
    assert len(named) >= 5
    assert sum(f["contribution"] for f in result) == pytest.approx(100.0, abs=0.01)
    other = next(f for f in result if f["name"] == OTHER_FACTORS)
    assert other["contribution"] == pytest.approx(4.0, abs=0.01)
