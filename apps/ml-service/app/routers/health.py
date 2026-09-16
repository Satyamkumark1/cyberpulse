from fastapi import APIRouter, Request

from app.schemas.ml_health import MlHealthResponse

router = APIRouter()


@router.get("/health", response_model=MlHealthResponse)
def health(request: Request) -> MlHealthResponse:
    # architecture/api-design.md ML-003. Reports unhealthy with
    # modelLoaded: false when the artefact is missing (AC-006-04) — never
    # a default score, never a fabricated version.
    state = request.app.state.artifacts
    return MlHealthResponse(
        status="healthy" if state.model_loaded else "unhealthy",
        modelLoaded=state.model_loaded,
        modelVersion=state.model_version,
        featureSchemaVersion=state.feature_schema_version,
        loadedAt=state.loaded_at,
    )
