import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


@dataclass
class ArtifactState:
    model_loaded: bool
    model_version: str | None
    feature_schema_version: str | None
    loaded_at: str | None


def load_artifacts(model_dir: str) -> ArtifactState:
    """A load failure sets model_loaded = False rather than crashing, so
    /health can report it (ai/guardrails.md — 'Artefact missing'). Phase 3
    (train:model) is what makes these files exist; until then this correctly
    reports unloaded rather than fabricating a version."""
    directory = Path(model_dir)
    risk_model = directory / "risk_model.joblib"
    temporal_model = directory / "temporal_model.joblib"
    feature_schema = directory / "feature_schema.json"
    model_card = directory / "model_card.json"

    if not (risk_model.exists() and temporal_model.exists() and feature_schema.exists() and model_card.exists()):
        return ArtifactState(model_loaded=False, model_version=None, feature_schema_version=None, loaded_at=None)

    schema = json.loads(feature_schema.read_text())
    card = json.loads(model_card.read_text())
    return ArtifactState(
        model_loaded=True,
        model_version=card.get("modelVersion"),
        feature_schema_version=schema.get("version"),
        loaded_at=datetime.now(timezone.utc).isoformat(),
    )
