import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app

MODELS = Path(__file__).resolve().parents[1] / "models"

PAYLOAD = {
    "requestId": "req_version_test",
    "complaint": {
        "complaintId": "C-00001",
        "fraudType": "UPI_FRAUD",
        "amountPaise": 5_000_000,
        "timestamp": "2026-07-01T10:00:00+00:00",
        "victimLat": 28.61,
        "victimLon": 77.21,
        "victimH3R8": "883da1abc5fffff",
    },
    "transactions": [],
    "accounts": [],
    "candidateCells": [
        {
            "h3Index": f"883da1abc{i}fffff",
            "lat": 28.6 + i * 0.01,
            "lon": 77.2,
            "atmCount": 3,
            "atmDensity": 1.5,
            "historicalHotspotScore": 0.5,
            "withdrawalCount": 4,
            "name": f"Cell {i}",
            "district": "New Delhi",
            "state": "Delhi",
        }
        for i in range(3)
    ],
}


@pytest.mark.contract
def test_predict_reports_the_loaded_model_card_version_not_a_literal():
    # The version once came from a string literal in the router, so a
    # retrained or rolled-back model would still have claimed v1.
    expected = json.loads((MODELS / "model_card.json").read_text())["modelVersion"]

    with TestClient(app) as client:
        res = client.post("/predict", json=PAYLOAD)
        client.app.state.prediction.model_version = "rolled-back-v0"
        relabelled = client.post("/predict", json=PAYLOAD)

    assert res.status_code == 200
    assert res.json()["modelVersion"] == expected
    assert relabelled.json()["modelVersion"] == "rolled-back-v0"
