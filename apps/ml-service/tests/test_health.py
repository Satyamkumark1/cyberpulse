import pytest
from fastapi.testclient import TestClient

from app.core.artifacts import ArtifactState
from app.main import app

# app.core.config.settings is a module-level singleton read once at import —
# monkeypatch-ing MODEL_DIR after that has no effect (import caching), so
# these set app.state.artifacts directly instead of re-triggering lifespan
# loading through the environment.


@pytest.mark.contract
def test_health_reports_unhealthy_and_no_fabricated_version_when_model_is_unloaded():
    with TestClient(app) as client:
        client.app.state.artifacts = ArtifactState(
            model_loaded=False, model_version=None, feature_schema_version=None, loaded_at=None
        )
        res = client.get("/health")

    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "unhealthy"
    assert body["modelLoaded"] is False
    assert body["modelVersion"] is None
    assert body["featureSchemaVersion"] is None


@pytest.mark.contract
def test_health_reports_healthy_with_the_artifact_s_own_version_when_loaded():
    with TestClient(app) as client:
        client.app.state.artifacts = ArtifactState(
            model_loaded=True,
            model_version="CyberPulse-Demo-v1",
            feature_schema_version="fs-1",
            loaded_at="2026-09-15T00:00:00+00:00",
        )
        res = client.get("/health")

    body = res.json()
    assert body["status"] == "healthy"
    assert body["modelLoaded"] is True
    assert body["modelVersion"] == "CyberPulse-Demo-v1"
    assert body["featureSchemaVersion"] == "fs-1"


@pytest.mark.contract
def test_health_response_echoes_the_request_id_header():
    with TestClient(app) as client:
        res = client.get("/health", headers={"x-request-id": "req_test_123"})

    assert res.headers["x-request-id"] == "req_test_123"
