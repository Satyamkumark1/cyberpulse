"""POST /predict (ML-001, architecture/api-design.md §9). The web application
supplies everything; this router reads no database (RULE-security.md 'The
ML boundary') and never returns a fabricated score on any failure path
(ai/guardrails.md).
"""

import time
from typing import Literal

import numpy as np
from fastapi import APIRouter, Request, Response

from app.core.errors import FeatureSchemaMismatch
from app.core.model_loader import PredictionArtifacts
from app.engine.explain import to_factors
from app.engine.features import (
    FEATURE_ORDER,
    AccountInput,
    CandidateCell,
    ComplaintInput,
    TransactionInput,
    assert_schema,
    build_vector,
)
from app.engine.hotspot import (
    RankedCell,
    combined_score,
    compute_terms,
    dbscan_cluster,
    rank_candidates,
)
from app.engine.risk import (
    DEFAULT_THRESHOLD_HIGH,
    DEFAULT_THRESHOLD_MEDIUM,
    clip_score,
    confidence,
    derive_risk_level,
)
from app.engine.temporal import window_from_bins
from app.schemas.error import Error, ErrorEnvelope
from app.schemas.ml_predict_request import MlPredictRequest
from app.schemas.ml_predict_response import (
    ExpectedWindow,
    Factor,
    MlPredictResponse,
    PipelineStage,
    PredictedLocation,
    RankedHotspot,
)

router = APIRouter()


def _error(status: int, code: Literal["ML_UNAVAILABLE", "INTERNAL_ERROR"], message: str, request_id: str) -> Response:
    body = ErrorEnvelope(error=Error(code=code, message=message, requestId=request_id))
    return Response(content=body.model_dump_json(), status_code=status, media_type="application/json")


@router.post("/predict")
def predict(payload: MlPredictRequest, request: Request) -> Response:
    stages: list[PipelineStage] = []
    artifacts: PredictionArtifacts | None = request.app.state.prediction
    if artifacts is None:
        # AC-006-04 / ai.md 'Artefact missing' — 503, never a fabricated score.
        return _error(503, "ML_UNAVAILABLE", "Model artefacts are not loaded.", payload.requestId)

    t_features = time.monotonic()
    complaint = ComplaintInput(
        complaint_id=payload.complaint.complaintId,
        fraud_type=payload.complaint.fraudType,
        amount_paise=payload.complaint.amountPaise,
        timestamp=payload.complaint.timestamp,
        victim_lat=payload.complaint.victimLat,
        victim_lon=payload.complaint.victimLon,
        victim_h3_r8=payload.complaint.victimH3R8,
    )
    transactions = [
        TransactionInput(
            amount_paise=t.amountPaise, timestamp=t.timestamp, channel=t.channel,
            hop_index=t.hopIndex, risk_indicator=t.riskIndicator,
        )
        for t in payload.transactions
    ]
    accounts = [
        AccountInput(
            account_id=a.accountId, account_type=a.accountType, opened_at=a.openedAt,
            risk_score=a.riskScore, prior_suspicious_flags=a.priorSuspiciousFlags,
            prior_withdrawal_count=a.priorWithdrawalCount,
        )
        for a in payload.accounts
    ]
    cells = [
        CandidateCell(
            h3_index=c.h3Index, lat=c.lat, lon=c.lon, atm_count=c.atmCount, atm_density=c.atmDensity,
            historical_hotspot_score=c.historicalHotspotScore, withdrawal_count=c.withdrawalCount,
            name=c.name, district=c.district, state=c.state,
        )
        for c in payload.candidateCells
    ]

    vectors = [build_vector(complaint, transactions, accounts, cell) for cell in cells]
    for vec in vectors:
        try:
            assert_schema(vec, artifacts.feature_schema)
        except FeatureSchemaMismatch as exc:  # abort before inference (ai/guardrails.md G-10)
            return _error(500, "INTERNAL_ERROR", f"feature schema mismatch: {exc}", payload.requestId)
    stages.append(PipelineStage(name="features", durationMs=round((time.monotonic() - t_features) * 1000)))

    t_model = time.monotonic()
    matrix = np.stack(vectors)
    model_probabilities = artifacts.risk_model.predict_proba(matrix)
    stages.append(PipelineStage(name="risk_model", durationMs=round((time.monotonic() - t_model) * 1000)))

    t_hotspot = time.monotonic()
    by_name = [dict(zip(FEATURE_ORDER, vec, strict=True)) for vec in vectors]
    ranked = []
    for cell, vec_by_name, model_p in zip(cells, by_name, model_probabilities, strict=True):
        terms = compute_terms(
            cell, cells,
            txn_velocity_1h=vec_by_name["txn_velocity_1h"], recency_hours=vec_by_name["recency_hours"],
            linked_account_count=vec_by_name["linked_account_count"], linked_depth=vec_by_name["linked_depth"],
            hour_of_day=int(vec_by_name["hour_of_day"]),
        )
        p = clip_score(model_p)
        ranked.append(RankedCell(cell=cell, model_probability=p, combined=combined_score(p, terms)))
    ranked = rank_candidates(ranked)
    _, clustering_fallback = dbscan_cluster(cells)
    stages.append(PipelineStage(name="hotspot", durationMs=round((time.monotonic() - t_hotspot) * 1000)))

    top = ranked[0]
    vector_by_h3 = {cell.h3_index: vec for cell, vec in zip(cells, vectors, strict=True)}
    threshold_high = payload.thresholds.high if payload.thresholds else DEFAULT_THRESHOLD_HIGH
    threshold_medium = payload.thresholds.medium if payload.thresholds else DEFAULT_THRESHOLD_MEDIUM
    risk_level = derive_risk_level(top.combined, threshold_high, threshold_medium)
    conf = confidence([r.combined for r in ranked])

    t_temporal = time.monotonic()
    top_vec = vector_by_h3[top.cell.h3_index].reshape(1, -1)
    bin_probs = artifacts.temporal_model.predict_bin_probabilities(top_vec)[0]
    window = window_from_bins(bin_probs, complaint.timestamp)
    stages.append(PipelineStage(name="temporal", durationMs=round((time.monotonic() - t_temporal) * 1000)))

    t_explain = time.monotonic()
    explanation_available = True
    factors: list[Factor] = []
    try:
        shap_values = artifacts.explainer.shap_values(top_vec)[0]
        raw_factors = to_factors(list(shap_values), FEATURE_ORDER)
        factors = [Factor(name=f["name"], contribution=f["contribution"], direction=f["direction"]) for f in raw_factors]
    except Exception:  # noqa: BLE001 — deliberate resilience boundary: SHAP failure returns
        # the prediction with explanationAvailable=False rather than a 500 (FEAT-09, ai.md
        # 'SHAP fails' row); any exception from the explainer must degrade, not propagate.
        explanation_available = False
    stages.append(PipelineStage(name="explain", durationMs=round((time.monotonic() - t_explain) * 1000)))

    top_k = payload.topK or 5
    ranked_hotspots = [
        RankedHotspot(
            rank=i + 1, name=r.cell.name or r.cell.h3_index, h3Index=r.cell.h3_index,
            lat=r.cell.lat, lon=r.cell.lon, score=r.combined, likelyAtms=r.cell.atm_count,
        )
        for i, r in enumerate(ranked[:top_k])
    ]

    total_ms = sum(s.durationMs for s in stages)
    response = MlPredictResponse(
        complaintId=complaint.complaint_id,
        riskScore=top.combined,
        riskLevel=risk_level,
        confidence=conf,
        predictedLocation=PredictedLocation(
            name=top.cell.name or top.cell.h3_index, h3Index=top.cell.h3_index,
            lat=top.cell.lat, lon=top.cell.lon, district=top.cell.district, state=top.cell.state,
        ),
        expectedWindow=ExpectedWindow(
            start=window.start, end=window.end, confidence=window.confidence, fallback=window.fallback
        ),
        likelyAtms=top.cell.atm_count,
        rankedHotspots=ranked_hotspots,
        factors=factors,
        explanationAvailable=explanation_available,
        clusteringFallback=clustering_fallback,
        modelVersion=artifacts.model_version,
        featureSchemaVersion=str(artifacts.feature_schema.get("version", "")),
        inferenceMs=total_ms,
        pipelineStages=stages,
    )
    return Response(content=response.model_dump_json(), status_code=200, media_type="application/json")
