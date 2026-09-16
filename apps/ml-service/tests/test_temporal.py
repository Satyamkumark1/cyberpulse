from datetime import datetime, timedelta, timezone

import numpy as np
import pytest

from app.engine.temporal import NUM_BINS, window_from_bins

START = datetime(2026, 9, 14, 3, 42, tzinfo=timezone.utc)


def bins(*, peak_at: int, peak: float, others: float) -> np.ndarray:
    probs = np.full(NUM_BINS, others, dtype=np.float64)
    probs[peak_at] = peak
    return probs


@pytest.mark.unit
def test_window_returned_is_never_omitted_even_for_a_flat_distribution():
    probs = np.full(NUM_BINS, 1.0 / NUM_BINS, dtype=np.float64)

    window = window_from_bins(probs, START)

    assert window is not None
    assert window.end > window.start


@pytest.mark.unit
def test_width_cap_a_single_dominant_bin_yields_a_2_hour_window():
    probs = bins(peak_at=4, peak=0.9, others=0.1 / 11)

    window = window_from_bins(probs, START)

    assert (window.end - window.start) == timedelta(hours=2)


@pytest.mark.unit
def test_width_cap_widened_case_never_exceeds_4_hours():
    # top and a close neighbour (within WIDEN_MARGIN)
    probs = np.zeros(NUM_BINS)
    probs[5] = 0.20
    probs[6] = 0.18  # within 0.05 of the top -> widened
    probs[[0, 1, 2, 3, 4, 7, 8, 9, 10, 11]] = 0.062

    window = window_from_bins(probs, START)

    assert (window.end - window.start) <= timedelta(hours=4)
    assert (window.end - window.start) == timedelta(hours=4)


@pytest.mark.unit
def test_widening_prefers_the_higher_probability_neighbour_and_stays_contiguous():
    probs = np.zeros(NUM_BINS)
    probs[6] = 0.20
    probs[5] = 0.19  # closer competitor on the left
    probs[7] = 0.05  # not within margin
    probs[[0, 1, 2, 3, 4, 8, 9, 10, 11]] = (1 - 0.44) / 9

    window = window_from_bins(probs, START)

    # bins 5 and 6 chosen -> window covers [start+10h, start+14h)
    assert window.start == START + timedelta(hours=10)
    assert window.end == START + timedelta(hours=14)


@pytest.mark.unit
def test_flat_distribution_degrades_honestly_with_low_confidence_and_fallback():
    probs = np.full(NUM_BINS, 1.0 / NUM_BINS, dtype=np.float64)

    window = window_from_bins(probs, START)

    assert window.confidence == "LOW"
    assert window.fallback is True


@pytest.mark.unit
def test_midnight_crossing_represented_as_consecutive_utc_timestamps():
    late_night_complaint = datetime(2026, 9, 14, 23, 10, tzinfo=timezone.utc)
    probs = bins(peak_at=0, peak=0.9, others=0.1 / 11)  # first bin: [0h, 2h) after the reference

    window = window_from_bins(probs, late_night_complaint)

    assert window.start == late_night_complaint
    assert window.start.date() == late_night_complaint.date()
    assert window.end.date() > late_night_complaint.date()  # crosses into the next calendar day
    assert window.end - window.start == timedelta(hours=2)


@pytest.mark.unit
def test_rejects_a_malformed_bin_count():
    with pytest.raises(ValueError):
        window_from_bins(np.array([0.5, 0.5]), START)
