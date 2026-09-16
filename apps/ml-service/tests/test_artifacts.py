import json

import pytest

from app.core.artifacts import load_artifacts


@pytest.mark.unit
def test_reports_unloaded_when_artifacts_are_missing(tmp_path):
    state = load_artifacts(str(tmp_path))

    assert state.model_loaded is False
    assert state.model_version is None
    assert state.feature_schema_version is None
    assert state.loaded_at is None


@pytest.mark.unit
def test_reports_unloaded_when_only_some_artifacts_are_present(tmp_path):
    (tmp_path / "risk_model.joblib").write_bytes(b"stub")
    (tmp_path / "temporal_model.joblib").write_bytes(b"stub")
    # feature_schema.json and model_card.json deliberately absent

    state = load_artifacts(str(tmp_path))

    assert state.model_loaded is False


@pytest.mark.unit
def test_reports_loaded_with_version_from_the_artifacts_when_all_four_files_exist(tmp_path):
    (tmp_path / "risk_model.joblib").write_bytes(b"stub")
    (tmp_path / "temporal_model.joblib").write_bytes(b"stub")
    (tmp_path / "feature_schema.json").write_text(json.dumps({"version": "fs-1"}))
    (tmp_path / "model_card.json").write_text(json.dumps({"modelVersion": "CyberPulse-Demo-v1"}))

    state = load_artifacts(str(tmp_path))

    assert state.model_loaded is True
    assert state.model_version == "CyberPulse-Demo-v1"
    assert state.feature_schema_version == "fs-1"
    assert state.loaded_at is not None
