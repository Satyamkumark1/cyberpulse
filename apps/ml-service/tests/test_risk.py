import pytest

from app.engine.risk import clip_score, confidence, derive_risk_level

HIGH, MEDIUM = 0.70, 0.40


@pytest.mark.unit
@pytest.mark.parametrize(
    "score,expected",
    [
        (0.0, "LOW"),
        (0.399, "LOW"),
        (0.400, "MEDIUM"),  # lower bound inclusive
        (0.699, "MEDIUM"),
        (0.700, "HIGH"),  # lower bound inclusive
        (1.0, "HIGH"),
    ],
)
def test_threshold_boundaries_inclusive_at_0_400_and_0_700(score, expected):
    assert derive_risk_level(score, HIGH, MEDIUM) == expected


@pytest.mark.unit
def test_score_range_is_clipped_to_0_1():
    assert clip_score(1.4) == 1.0
    assert clip_score(-0.2) == 0.0
    assert clip_score(0.5) == 0.5


@pytest.mark.unit
def test_confidence_reflects_separation_not_magnitude():
    # Two scores nearly tied at the top: not confident, regardless of magnitude.
    assert confidence([0.92, 0.91]) == "LOW"
    # A wide, high-magnitude gap: confident.
    assert confidence([0.91, 0.70]) == "HIGH"
    # A single candidate has nothing to separate from.
    assert confidence([0.95]) == "LOW"
    assert confidence([]) == "LOW"


@pytest.mark.unit
def test_confidence_medium_band():
    assert confidence([0.60, 0.51]) == "MEDIUM"
