import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.main import unhandled_exception_handler


@pytest.mark.contract
def test_unhandled_exception_serialises_to_the_shared_error_envelope_and_hides_the_real_message():
    app = FastAPI()
    app.add_exception_handler(Exception, unhandled_exception_handler)

    @app.get("/boom")
    def boom():
        raise RuntimeError("password=hunter2 at /Users/leaked/path.py:42")

    with TestClient(app, raise_server_exceptions=False) as client:
        res = client.get("/boom")

    assert res.status_code == 500
    body = res.json()
    assert body == {
        "error": {
            "code": "INTERNAL_ERROR",
            "message": "An unexpected error occurred.",
            "field": None,
            "requestId": res.headers["x-request-id"],
        }
    }
    assert "hunter2" not in res.text
    assert "/Users/leaked" not in res.text
