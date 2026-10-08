import os
from datetime import datetime, timedelta, timezone

import numpy as np
import pytest

from app.core.errors import FeatureSchemaMismatch
from app.engine.features import (
    FEATURE_ORDER,
    AccountInput,
    CandidateCell,
    ComplaintInput,
    TransactionInput,
    assert_schema,
    build_feature_schema,
    build_vector,
    haversine_km,
)

COMPLAINT = ComplaintInput(
    complaint_id="C-10284",
    fraud_type="UPI_FRAUD",
    amount_paise=38_000_000,
    timestamp=datetime(2026, 9, 14, 3, 42, tzinfo=timezone.utc),
    victim_lat=28.58,
    victim_lon=77.33,
    victim_h3_r8="8860d4d4b5fffff",
)
CELL = CandidateCell(
    h3_index="8860d4d4b1fffff",
    lat=28.57,
    lon=77.32,
    atm_count=3,
    atm_density=4.1,
    historical_hotspot_score=0.62,
    withdrawal_count=18,
)
TXNS = [
    TransactionInput(
        amount_paise=38_000_000,
        timestamp=datetime(2026, 9, 14, 3, 50, tzinfo=timezone.utc),
        channel="UPI",
        hop_index=0,
        risk_indicator="HIGH",
    ),
    TransactionInput(
        amount_paise=37_500_000,
        timestamp=datetime(2026, 9, 14, 4, 5, tzinfo=timezone.utc),
        channel="IMPS",
        hop_index=1,
        risk_indicator="HIGH",
    ),
]
ACCOUNTS = [
    AccountInput(
        account_id="ACC-88123390",
        account_type="MULE",
        opened_at=datetime(2026, 8, 12, tzinfo=timezone.utc),
        risk_score=0.91,
        prior_suspicious_flags=3,
        prior_withdrawal_count=5,
    ),
]


@pytest.mark.unit
def test_shape_and_order_matches_the_documented_13_features():
    vec = build_vector(COMPLAINT, TXNS, ACCOUNTS, CELL)

    assert vec.shape == (13,)
    assert len(FEATURE_ORDER) == 13


@pytest.mark.unit
def test_every_feature_against_a_hand_calculation():
    vec = build_vector(COMPLAINT, TXNS, ACCOUNTS, CELL)
    by_name = dict(zip(FEATURE_ORDER, vec, strict=True))

    assert by_name["txn_amount_total"] == 0.0  # both transactions are after observation time
    assert by_name["txn_velocity_1h"] == 0.0  # future transactions cannot affect a historical forecast
    assert by_name["linked_account_count"] == 1.0
    expected_age_days = (COMPLAINT.timestamp - ACCOUNTS[0].opened_at).total_seconds() / 86400
    assert by_name["account_age_days_min"] == pytest.approx(expected_age_days, abs=1e-9)
    assert by_name["prior_suspicious_flags"] == 3.0
    assert by_name["distance_km"] == pytest.approx(haversine_km(28.58, 77.33, 28.57, 77.32), abs=1e-9)
    assert by_name["atm_density"] == 4.1
    assert by_name["historical_hotspot_score"] == 0.62
    assert by_name["hour_of_day"] == 9.0  # 03:42 UTC -> 09:12 IST
    assert by_name["day_of_week"] == 0.0  # 2026-09-14 is a Monday
    assert by_name["recency_hours"] == 0.0  # last txn is after the complaint timestamp -> clamped
    assert by_name["withdrawal_count"] == 5.0
    assert by_name["linked_depth"] == 1.0  # future chain hops are not observed yet


@pytest.mark.unit
def test_determinism_over_100_builds():
    vectors = [build_vector(COMPLAINT, TXNS, ACCOUNTS, CELL) for _ in range(100)]

    for vec in vectors[1:]:
        assert np.array_equal(vec, vectors[0])


@pytest.mark.unit
def test_missing_inputs_resolve_to_documented_defaults_with_no_nan():
    vec = build_vector(COMPLAINT, [], [], CELL)
    by_name = dict(zip(FEATURE_ORDER, vec, strict=True))

    assert by_name["txn_amount_total"] == 0.0
    assert by_name["txn_velocity_1h"] == 0.0
    assert by_name["linked_account_count"] == 1.0
    assert by_name["account_age_days_min"] == 0.0
    assert by_name["prior_suspicious_flags"] == 0.0
    assert by_name["recency_hours"] == 0.0
    assert by_name["withdrawal_count"] == 0.0
    assert by_name["linked_depth"] == 1.0
    assert not np.isnan(vec).any()


@pytest.mark.unit
def test_zero_atm_candidate_cell_defaults_to_zero_density_not_null():
    empty_cell = CandidateCell(
        h3_index="8860d4d4b3fffff", lat=28.46, lon=77.07, atm_count=0, atm_density=0.0,
        historical_hotspot_score=0.0, withdrawal_count=0,
    )
    vec = build_vector(COMPLAINT, TXNS, ACCOUNTS, empty_cell)
    by_name = dict(zip(FEATURE_ORDER, vec, strict=True))

    assert by_name["atm_density"] == 0.0


@pytest.mark.unit
def test_complaint_timestamp_in_the_future_relative_to_data_clamps_recency_at_zero():
    future_complaint = ComplaintInput(
        complaint_id="C-10285",
        fraud_type="UPI_FRAUD",
        amount_paise=1_000_000,
        timestamp=TXNS[-1].timestamp + timedelta(hours=5),
        victim_lat=28.58,
        victim_lon=77.33,
        victim_h3_r8="8860d4d4b5fffff",
    )
    vec = build_vector(future_complaint, TXNS, ACCOUNTS, CELL)
    by_name = dict(zip(FEATURE_ORDER, vec, strict=True))

    assert by_name["recency_hours"] == pytest.approx(5.0, abs=0.01)


@pytest.mark.unit
def test_symlink_integrity_training_features_resolves_to_the_engine_module():
    link_path = os.path.join(os.path.dirname(__file__), "..", "training", "features.py")

    assert os.path.islink(link_path)
    assert os.readlink(link_path) == "../app/engine/features.py"


@pytest.mark.unit
def test_symlink_and_engine_module_compute_the_identical_vector():
    # Two import paths to literally the same file on disk (the symlink) — not
    # the same module object, since Python keys sys.modules by import path.
    # What must match is the computed vector, which is what train/serve skew
    # would actually break.
    from training import features as training_features

    training_complaint = training_features.ComplaintInput(**vars(COMPLAINT))
    training_txns = [training_features.TransactionInput(**vars(t)) for t in TXNS]
    training_accounts = [training_features.AccountInput(**vars(a)) for a in ACCOUNTS]
    training_cell = training_features.CandidateCell(**vars(CELL))

    engine_vec = build_vector(COMPLAINT, TXNS, ACCOUNTS, CELL)
    training_vec = training_features.build_vector(training_complaint, training_txns, training_accounts, training_cell)

    assert np.array_equal(engine_vec, training_vec)


@pytest.mark.unit
def test_schema_mismatch_aborts_before_inference():
    vec = build_vector(COMPLAINT, TXNS, ACCOUNTS, CELL)
    reordered_schema = build_feature_schema()
    reordered_schema["order"] = list(reversed(FEATURE_ORDER))

    with pytest.raises(FeatureSchemaMismatch):
        assert_schema(vec, reordered_schema)


@pytest.mark.unit
def test_matching_schema_raises_nothing():
    vec = build_vector(COMPLAINT, TXNS, ACCOUNTS, CELL)
    assert_schema(vec, build_feature_schema())
