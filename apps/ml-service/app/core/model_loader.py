"""Loads the trained artefacts into memory once, at startup
(RULE-backend.md §ML service — 'Artefacts loaded once at startup in the
lifespan handler'). Kept separate from `artifacts.py`, which only checks
file *presence* for `/health` and must stay cheap and side-effect-free.
"""

import json
from dataclasses import dataclass
from pathlib import Path

import joblib
import shap

from app.engine.model import CalibratedRiskModel, TemporalModel


@dataclass
class PredictionArtifacts:
    risk_model: CalibratedRiskModel
    temporal_model: TemporalModel
    feature_schema: dict[str, object]
    explainer: shap.TreeExplainer


def load_prediction_artifacts(model_dir: str) -> PredictionArtifacts | None:
    """None when any artefact is missing — the caller must treat this as
    'model not loaded', never fall back to a default prediction."""
    directory = Path(model_dir)
    risk_path = directory / "risk_model.joblib"
    temporal_path = directory / "temporal_model.joblib"
    schema_path = directory / "feature_schema.json"

    if not (risk_path.exists() and temporal_path.exists() and schema_path.exists()):
        return None

    risk_model: CalibratedRiskModel = joblib.load(risk_path)
    temporal_model: TemporalModel = joblib.load(temporal_path)
    feature_schema = json.loads(schema_path.read_text())
    explainer = shap.TreeExplainer(risk_model.classifier)

    return PredictionArtifacts(
        risk_model=risk_model, temporal_model=temporal_model, feature_schema=feature_schema, explainer=explainer
    )
