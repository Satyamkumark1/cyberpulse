import time
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import RequestResponseEndpoint

from app.core.artifacts import load_artifacts
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.core.model_loader import load_prediction_artifacts
from app.routers import health, predict
from app.schemas.error import Error, ErrorEnvelope

configure_logging(settings.LOG_LEVEL)
logger = get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Artefacts loaded once at startup (RULE-backend.md §ML service). A load
    # failure sets model_loaded = False rather than crashing.
    start = time.monotonic()
    app.state.artifacts = load_artifacts(settings.MODEL_DIR)
    app.state.prediction = load_prediction_artifacts(settings.MODEL_DIR)
    if app.state.prediction is None:
        # Readiness must reflect the bundle that inference can actually load,
        # not merely the presence of four files on disk.
        app.state.artifacts.model_loaded = False
        app.state.artifacts.model_version = None
        app.state.artifacts.feature_schema_version = None
        app.state.artifacts.loaded_at = None
    load_ms = round((time.monotonic() - start) * 1000)
    logger.info(
        "service start",
        modelLoaded=app.state.artifacts.model_loaded,
        modelVersion=app.state.artifacts.model_version,
        featureSchemaVersion=app.state.artifacts.feature_schema_version,
        loadMs=load_ms,
    )
    yield


app = FastAPI(title="CyberPulse ML Service", lifespan=lifespan)
app.include_router(health.router)
app.include_router(predict.router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # architecture/api-design.md §1.2 + ADR-020: the same envelope shape as
    # the web app's, typed against the shared contract, not restated by hand
    # — a field rename here fails this construction (AC-P2-11). Internal
    # detail is logged against requestId and never serialised (NFR-13).
    request_id = request.headers.get("x-request-id") or f"req_{uuid.uuid4()}"
    get_logger(requestId=request_id, route=request.url.path).error("unhandled error", error=str(exc))

    body = ErrorEnvelope(
        error=Error(code="INTERNAL_ERROR", message="An unexpected error occurred.", requestId=request_id)
    )
    return JSONResponse(status_code=500, content=body.model_dump(), headers={"x-request-id": request_id})


@app.middleware("http")
async def request_logging(request: Request, call_next: RequestResponseEndpoint) -> Response:
    # architecture/api-design.md §1.3: x-request-id propagated and echoed.
    request_id = request.headers.get("x-request-id") or f"req_{uuid.uuid4()}"
    start = time.monotonic()
    response = await call_next(request)
    duration_ms = round((time.monotonic() - start) * 1000)
    response.headers["x-request-id"] = request_id
    get_logger(requestId=request_id, route=request.url.path, method=request.method).info(
        "request completed", status=response.status_code, durationMs=duration_ms
    )
    return response
