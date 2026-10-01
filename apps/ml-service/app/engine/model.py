"""The trained-artefact wrapper. Defined once, in engine/ so both `train.py`
(which constructs and `joblib.dump`s it) and the serving process (which
`joblib.load`s it) import the identical class — joblib pickles by reference
to the class's import path, so a wrapper defined only in `training/` could
not be unpickled by the DB-less serving process at all.
"""

from dataclasses import dataclass

import numpy as np
import numpy.typing as npt
from sklearn.isotonic import IsotonicRegression
from xgboost import XGBClassifier

from app.engine.temporal import NUM_BINS as NUM_TEMPORAL_BINS


@dataclass
class CalibratedRiskModel:
    """An XGBoost classifier plus an isotonic calibrator fitted on a
    held-out calibration split (ai/model-selection.md §1.4) — the raw
    gradient-boosting output is not a well-calibrated probability, and the
    UI presents this score as a percentage."""

    classifier: XGBClassifier
    calibrator: IsotonicRegression

    def predict_proba(self, x: npt.NDArray[np.float64]) -> npt.NDArray[np.float64]:
        raw = self.classifier.predict_proba(x)[:, 1]
        return np.asarray(self.calibrator.predict(raw), dtype=np.float64)


@dataclass
class TemporalModel:
    """Wraps the 12-bin classifier plus which of the 12 bins it was actually
    trained on. XGBoost's sklearn API requires dense, zero-based labels at
    fit time (`ValueError: Invalid classes inferred...` otherwise) — not
    every complaint's cash-out lands in every bin, so `y` is rarely a dense
    0..11 range. `bin_labels` records the real bin number for each of the
    classifier's output columns, and `predict_bin_probabilities` expands
    back to a full 12-column array (zero for a bin never observed in
    training) so `engine/temporal.py`'s `window_from_bins` always receives
    the shape it expects."""

    classifier: XGBClassifier
    bin_labels: npt.NDArray[np.int64]

    def predict_bin_probabilities(self, x: npt.NDArray[np.float64]) -> npt.NDArray[np.float64]:
        raw = self.classifier.predict_proba(x)
        full = np.zeros((x.shape[0], NUM_TEMPORAL_BINS), dtype=np.float64)
        full[:, self.bin_labels] = raw
        return full
