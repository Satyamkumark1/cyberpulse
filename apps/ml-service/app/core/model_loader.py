"""Loads the trained artefacts into memory once, at startup
(RULE-backend.md §ML service — 'Artefacts loaded once at startup in the
lifespan handler'). Kept separate from `artifacts.py`, which only checks
file *presence* for `/health` and must stay cheap and side-effect-free.
"""

import hashlib
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
    model_version: str


def load_prediction_artifacts(model_dir: str) -> PredictionArtifacts | None:
    """None when any artefact is missing — the caller must treat this as
    'model not loaded', never fall back to a default prediction."""
    directory = Path(model_dir)
    risk_path = directory / "risk_model.joblib"
    temporal_path = directory / "temporal_model.joblib"
    schema_path = directory / "feature_schema.json"
    card_path = directory / "model_card.json"

    if not (risk_path.exists() and temporal_path.exists() and schema_path.exists() and card_path.exists()):
        return None

    try:
        manifest_path = directory / "bundle_manifest.json"
        if manifest_path.exists():
            manifest = json.loads(manifest_path.read_text())
            for path in (risk_path, temporal_path, schema_path, card_path):
                digest = hashlib.sha256(path.read_bytes()).hexdigest()
                if manifest.get("files", {}).get(path.name) != digest:
                    return None
        risk_model: CalibratedRiskModel = joblib.load(risk_path)
        temporal_model: TemporalModel = joblib.load(temporal_path)
        feature_schema = json.loads(schema_path.read_text())
        explainer = shap.TreeExplainer(risk_model.classifier)
        # Reported on every prediction, so it must come from the artefact that
        # was loaded, never a literal (a rolled-back image would otherwise lie).
        model_version = str(json.loads(card_path.read_text())["modelVersion"])
    except Exception:  # noqa: BLE001 — incompatible/corrupt bundle is an unavailable readiness state
        # A corrupt or incompatible bundle is unavailable, not a reason to
        # serve a default prediction.
        return None

    return PredictionArtifacts(
        risk_model=risk_model,
        temporal_model=temporal_model,
        feature_schema=feature_schema,
        explainer=explainer,
        model_version=model_version,
    )
