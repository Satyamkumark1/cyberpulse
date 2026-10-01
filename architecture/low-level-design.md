# LOW-LEVEL DESIGN — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Scope | Module boundaries, file layout, key type definitions, algorithms, and the internal contracts that hold them together |
| Related | `engineering/folder-structure.md`, `architecture/system-design.md`, `ai/ai-strategy.md` |

---

## 1. Repository Layout

```
cyberpulse-ai/
├── apps/
│   ├── web/                          Next.js application
│   │   ├── app/
│   │   │   ├── (dashboard)/          Route group sharing the shell
│   │   │   │   ├── layout.tsx        Sidebar + header + prototype badge
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── complaints/page.tsx
│   │   │   │   ├── complaints/[id]/page.tsx
│   │   │   │   ├── risk-map/page.tsx
│   │   │   │   ├── transactions/page.tsx
│   │   │   │   ├── transactions/[id]/page.tsx
│   │   │   │   ├── investigations/page.tsx
│   │   │   │   ├── investigations/[id]/page.tsx
│   │   │   │   ├── alerts/page.tsx
│   │   │   │   ├── alerts/[id]/page.tsx
│   │   │   │   ├── reports/page.tsx
│   │   │   │   └── settings/page.tsx
│   │   │   ├── demo/page.tsx         Standalone shell, no sidebar
│   │   │   ├── api/                  Route handlers, one folder per resource
│   │   │   ├── error.tsx  not-found.tsx  global-error.tsx
│   │   ├── components/
│   │   │   ├── ui/                   shadcn primitives
│   │   │   ├── common/               RiskBadge, StatePanel, KpiCard, FactorBar, DataTable
│   │   │   ├── map/                  MapCanvas, LayerToggles, HotspotDrawer, AccessibleHotspotTable
│   │   │   ├── graph/                MoneyTrailGraph, VictimNode, MuleAccountNode, AtmNode, NodeDetail
│   │   │   ├── prediction/           PredictionPanel, FactorList, RankedHotspots, WindowDisplay
│   │   │   ├── alerts/               AlertModal, RecipientPicker, AlertList
│   │   │   └── charts/               Six chart components + ChartTable
│   │   ├── hooks/                    useComplaints, usePrediction, useHotspots, useAlerts, useHealth
│   │   ├── lib/                      formatters, analytics, rateLimit, errors, requestId
│   │   ├── services/                 THE business layer — see §3
│   │   └── types/                    Local view models only
│   └── ml-service/
│       ├── app/
│       │   ├── main.py               FastAPI app, lifespan artefact loading
│       │   ├── routers/              predict.py, hotspots.py, health.py, metrics.py
│       │   ├── schemas/              Pydantic models generated from shared JSON Schema
│       │   ├── core/                 config.py, logging.py, errors.py
│       │   └── engine/               features.py, risk.py, temporal.py, hotspot.py, explain.py
│       ├── models/                   risk_model.joblib, temporal_model.joblib, feature_schema.json
│       ├── training/                 generate_training_data.py, features.py→symlink, train.py,
│       │                             evaluate.py, predict.py
│       ├── tests/
│       └── requirements.txt
├── packages/
│   ├── db/                           Drizzle schema, migrations, seed, query modules
│   ├── shared/                       JSON Schema → Zod + Pydantic; enums; error codes; constants
│   └── config/                       ESLint, TS, Tailwind, Prettier presets
├── scripts/
│   ├── generate-data/                generator.py, regions.py, patterns.py, manifest.py
│   ├── seed/                         seed.ts
│   └── evaluation/                   signal_check.py, pii_scan.py, no_hardcode_check.sh
├── docker/                           Dockerfile.ml, entrypoints
├── docs/                             architecture.md, ml-pipeline.md, demo-script.md, data-methodology.md
└── docker-compose.yml
```

**`training/features.py` is a symlink to `app/engine/features.py`.** This is the mechanism that makes train/serve skew impossible (FR-06.4) — there is literally one file, so the two paths cannot drift.

---

## 2. Shared Contract Package

`packages/shared` holds one JSON Schema per API contract. From each, two artefacts are generated at build time:

```
packages/shared/schemas/prediction.schema.json
        │
        ├── generate:zod    ──▶ packages/shared/zod/prediction.ts   (web validation + TS types)
        └── generate:pydantic ─▶ apps/ml-service/app/schemas/prediction.py
```

A field rename therefore breaks the TypeScript build **and** the Python type check in the same commit. This is the structural implementation of NFR-15.

```ts
// packages/shared/zod/prediction.ts  (generated)
export const RiskLevel = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export const FactorDirection = z.enum(['INCREASES', 'REDUCES']);

export const RiskFactor = z.object({
  name: z.enum([
    'Transaction Velocity', 'Historical Hotspot', 'Linked Account Pattern',
    'ATM Proximity', 'Time Pattern', 'Amount / Frequency',
    'Account Age', 'Withdrawal History', 'Other factors',
  ]),
  contribution: z.number().min(-100).max(100),
  direction: FactorDirection,
});

export const PredictionResponse = z.object({
  predictionRef: z.string().regex(/^PRD-\d{4,}$/),
  complaintId: z.string().regex(/^C-\d{5}$/),
  riskScore: z.number().min(0).max(1),
  riskLevel: RiskLevel,
  confidence: RiskLevel,
  predictedLocation: HotspotRef,
  expectedWindow: z.object({
    start: z.string().datetime(), end: z.string().datetime(),
    confidence: RiskLevel, fallback: z.boolean(),
  }),
  likelyAtms: z.number().int().nonnegative(),
  estimatedExposurePaise: z.number().int().nonnegative(),
  rankedHotspots: z.array(RankedHotspot).min(1).max(20),
  factors: z.array(RiskFactor),
  explanationAvailable: z.boolean(),
  clusteringFallback: z.boolean(),
  modelVersion: z.literal('CyberPulse-Demo-v1'),
  featureSchemaVersion: z.string(),
  inferenceMs: z.number().int().nonnegative().optional(),
  createdAt: z.string().datetime(),
}).refine(
  p => !p.explanationAvailable || p.factors.length >= 5,
  { message: 'An available explanation must contain at least five factors' },
).refine(
  p => !p.explanationAvailable ||
       Math.abs(p.factors.reduce((s, f) => s + Math.abs(f.contribution), 0) - 100) <= 0.5,
  { message: 'Factor contributions must sum to 100 ± 0.5' },
);
```

The two `refine` clauses turn AC-009-01 and AC-009-02 into runtime guarantees on both sides of the wire.

**Note the enum on `RiskFactor.name`.** A raw feature identifier such as `txn_velocity_1h` cannot pass validation, which is how FR-10.2 is enforced rather than merely intended.

---

## 3. Service Layer

Nine modules. Each exports plain async functions. None imports HTTP types; none imports React; none imports another service except through the documented compositions below.

| Module | Key functions | Composes |
|---|---|---|
| `complaintService` | `list`, `getWithContext`, `updateStatus` | db |
| `transactionService` | `list`, `get`, `getNetwork`, `simulation.*` | db |
| `predictionService` | `predict`, `getLatestForComplaint` | db, mlClient, hotspotService, settingsService |
| `hotspotService` | `candidatesForComplaint`, `list`, `getDetail`, `refresh` | db, mlClient |
| `alertService` | `create`, `list`, `get`, `acknowledge` | db, investigationService, auditService |
| `investigationService` | `list`, `get`, `create`, `transition`, `addNote`, `upsertForAlert` | db, auditService |
| `reportService` | `summary`, `metrics` | db |
| `settingsService` | `get`, `update`, `thresholds` | db, auditService |
| `auditService` | `record` (transaction-aware) | db |

`auditService.record` **requires** a transaction handle as its first argument. There is no overload that writes outside a transaction, which is how "an unaudited privileged action cannot exist" becomes a type-level property rather than a review item.

```ts
// services/alertService.ts — the shape that enforces atomicity
export async function create(input: CreateAlertInput, ctx: RequestContext) {
  const prediction = await db.predictions.getByRef(input.predictionRef);
  if (!prediction) throw new NotFoundError('prediction');

  const severity  = deriveSeverity(prediction.riskLevel);          // server-derived
  const exposure  = computeExposure(prediction);                    // documented formula
  const alertId   = nextAlertId();

  return db.transaction(async (tx) => {
    const alert = await tx.alerts.insert({ ...input, alertId, severity, exposurePaise: exposure,
                                           status: 'SENT', createdByRole: ctx.role, origin: ctx.origin });
    const investigation = await investigationService.upsertForAlert(tx, prediction.complaintId, alert.id);
    await auditService.record(tx, {                                 // tx is mandatory
      actorRole: ctx.role, action: 'ALERT_DISPATCHED',
      subjectType: 'alert', subjectId: alert.id,
      metadata: { predictionRef: input.predictionRef, recipients: input.recipients },
    });
    return { alert, investigation };
  });
}
```

### 3.1 Estimated exposure formula (ASM-10)

```
exposure_paise = Σ amount_paise of complaints C where
                   C is linked to the predicted hotspot cell
                   AND C.status ∉ {RESOLVED}
                   AND C.complaint_timestamp within the prediction's 24-hour horizon
```

Defined once, in `services/lib/exposure.ts`, unit-tested (TC-UNIT-020), and never computed in a component. Without a fixed definition, the API and the alert modal would eventually disagree.

---

## 4. ML Service Internals

### 4.1 Lifespan and artefact loading

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.risk_model     = joblib.load(MODEL_DIR / "risk_model.joblib")
    app.state.temporal_model = joblib.load(MODEL_DIR / "temporal_model.joblib")
    app.state.feature_schema = json.loads((MODEL_DIR / "feature_schema.json").read_text())
    app.state.explainer      = shap.TreeExplainer(app.state.risk_model)
    app.state.model_loaded   = True
    yield
```

A load failure sets `model_loaded = False` rather than crashing, so `/health` can report the condition accurately and `/predict` can return 503 instead of the container restart-looping (FR-07.5).

### 4.2 `features.py` — the single feature module

```python
FEATURE_ORDER: list[str] = [
    "txn_amount_total", "txn_velocity_1h", "linked_account_count",
    "account_age_days_min", "prior_suspicious_flags", "distance_km",
    "atm_density", "historical_hotspot_score", "hour_of_day",
    "day_of_week", "recency_hours", "withdrawal_count", "linked_depth",
]
FEATURE_SCHEMA_VERSION = "fs-1"

def build_vector(complaint, transactions, accounts, cell) -> np.ndarray:
    """Deterministic. Same inputs → same output. Missing inputs → documented defaults."""
    ...

def assert_schema(vec: np.ndarray, schema: dict) -> None:
    """Raise FeatureSchemaMismatch if order, length or dtype disagree with the stored schema."""
```

`assert_schema` runs before every inference. A mismatch aborts with a typed error rather than scoring a misaligned vector — the failure mode that produces confidently wrong predictions and is nearly impossible to notice from the output alone (FR-06.5).

### 4.3 Hotspot combined score

```python
COMBINED_WEIGHTS = {           # from config, not hard-coded at the call site
    "model_probability":     0.45,
    "historical_frequency":  0.15,
    "current_activity":      0.12,
    "recency":               0.10,
    "linked_account_density":0.08,
    "atm_density":           0.06,
    "temporal_match":        0.04,
}

def combined_score(model_p: float, terms: dict[str, float]) -> float:
    s = COMBINED_WEIGHTS["model_probability"] * model_p
    s += sum(COMBINED_WEIGHTS[k] * terms[k] for k in COMBINED_WEIGHTS if k != "model_probability")
    return float(np.clip(s, 0.0, 1.0))
```

The model probability carries 45% of the weight; the remaining terms are the domain priors that make a cold-start cell rankable. Ties break on `h3Index` so ordering is reproducible (AC-007-02).

### 4.4 Confidence rule

```python
def confidence(ranked: list[float]) -> str:
    if len(ranked) < 2:            return "LOW"
    margin = ranked[0] - ranked[1]
    if margin >= 0.15 and ranked[0] >= 0.70:  return "HIGH"
    if margin >= 0.07:                        return "MEDIUM"
    return "LOW"
```

Confidence is about *separation*, not magnitude. A top score of 0.92 with a second of 0.91 is not a confident prediction, and the rule says so.

### 4.5 Temporal model

Twelve 2-hour bins over a 24-hour horizon from the complaint timestamp. Multiclass gradient boosting over the temporal subset of the feature vector plus the top cell's historical hour profile.

```python
def window_from_bins(probs: np.ndarray, start_ref: datetime) -> tuple[datetime, datetime, str, bool]:
    top = int(np.argmax(probs))
    neighbours = [i for i in (top - 1, top + 1) if 0 <= i < 12 and probs[top] - probs[i] < 0.05]
    bins = sorted([top, *neighbours])[:2]          # never more than two bins → ≤ 4 hours
    ...
```

Widening to at most one adjacent bin is what keeps the window inside the 4-hour cap (AC-008-02) while still expressing genuine uncertainty.

### 4.6 SHAP aggregation

```python
FACTOR_MAP = {
    "txn_velocity_1h": "Transaction Velocity", "recency_hours": "Transaction Velocity",
    "historical_hotspot_score": "Historical Hotspot",
    "linked_account_count": "Linked Account Pattern", "linked_depth": "Linked Account Pattern",
    "distance_km": "ATM Proximity", "atm_density": "ATM Proximity",
    "hour_of_day": "Time Pattern", "day_of_week": "Time Pattern",
    "txn_amount_total": "Amount / Frequency", "withdrawal_count": "Withdrawal History",
    "account_age_days_min": "Account Age", "prior_suspicious_flags": "Withdrawal History",
}

def to_factors(shap_values, feature_names) -> list[dict]:
    grouped = defaultdict(float)
    for name, v in zip(feature_names, shap_values):
        grouped[FACTOR_MAP[name]] += v
    total = sum(abs(v) for v in grouped.values()) or 1.0
    factors = [{"name": k, "contribution": round(abs(v) / total * 100, 1),
                "direction": "INCREASES" if v > 0 else "REDUCES"}
               for k, v in grouped.items()]
    factors.sort(key=lambda f: f["contribution"], reverse=True)
    return collapse_small(factors, threshold=2.0, min_keep=5)   # residual → "Other factors"
```

`collapse_small` guarantees at least five named factors while keeping the sum exactly 100 — the two constraints that would otherwise conflict when one feature dominates.

---

## 5. Web Client Internals

### 5.1 ML client

```ts
export async function callPredict(payload: PredictRequest, requestId: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(`${env.ML_SERVICE_URL}/predict`, {
      method: 'POST', signal: controller.signal,
      headers: { 'content-type': 'application/json', 'x-request-id': requestId },
      body: JSON.stringify(payload),
    });
    if (res.status === 503) throw new MlUnavailableError();
    if (!res.ok)            throw new MlInferenceError(res.status);
    return PredictionCore.parse(await res.json());   // validate what came back
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw new MlTimeoutError();
    throw e;
  } finally { clearTimeout(timer); }
}
```

The response is validated on arrival. A malformed ML response becomes a typed error rather than propagating into the database and then onto a screen.

**Retry policy:** one retry on connection error only. Never on 4xx, never on timeout — a retried timeout doubles the user's wait to reach the same failure.

### 5.2 Rate limiting

Fixed-window counter keyed by `role:route`, held in module state in development and in a Neon-backed counter table in deployment. Returns `Retry-After` in seconds. Applied via a `withRateLimit(limit, windowMs)` wrapper on the handler, so an endpoint cannot be added without an explicit decision about its limit.

### 5.3 Error mapping

```ts
export function toErrorResponse(e: unknown, requestId: string): Response {
  const m =
    e instanceof ValidationError    ? { s: 400, code: 'VALIDATION_ERROR', field: e.field } :
    e instanceof ForbiddenError     ? { s: 403, code: 'FORBIDDEN' } :
    e instanceof NotFoundError      ? { s: 404, code: 'NOT_FOUND' } :
    e instanceof InvalidTransition  ? { s: 409, code: 'INVALID_TRANSITION' } :
    e instanceof ConflictError      ? { s: 409, code: 'CONFLICT' } :
    e instanceof RateLimitError     ? { s: 429, code: 'RATE_LIMITED' } :
    e instanceof MlUnavailableError ? { s: 503, code: 'ML_UNAVAILABLE' } :
    e instanceof MlTimeoutError     ? { s: 504, code: 'TIMEOUT' } :
                                      { s: 500, code: 'INTERNAL_ERROR' };
  logger.error({ requestId, code: m.code, err: serializeError(e) });   // detail stays server-side
  return Response.json({ error: { code: m.code, message: safeMessage(m.code), field: m.field, requestId } },
                       { status: m.s });
}
```

One function produces every error response in the application. `safeMessage` maps a code to display copy; the original error never reaches the client (NFR-13).

---

## 6. Key Algorithms

| Algorithm | Location | Complexity | Bound |
|---|---|---|---|
| Money-trail traversal | Recursive CTE, `packages/db/queries/network.ts` | O(E) bounded | depth ≤ 6, visited set, `LIMIT 500` |
| Candidate cell generation | `hotspot.py` — k-ring around victim + historical cells in state | O(k²) | k ≤ 3, cap 60 candidates |
| DBSCAN clustering | `hotspot.py`, refresh job | O(n log n) | eps 800 m, min_samples 5 |
| KDE surface | `hotspot.py`, refresh job | O(n·g) | grid capped at 20,000 cells |
| Combined ranking | `hotspot.py` | O(n log n) | n ≤ 60 |
| SHAP TreeExplainer | `explain.py` | O(TLD²) | single row, top cell only |
| Graph layout | `MoneyTrailGraph`, layered left-to-right | O(V+E) | deterministic, seeded |

SHAP is computed for the **top-ranked cell only**, not for all sixty candidates. Explaining every candidate would multiply inference time by sixty for information no user reads.

---

## 7. Internal Contracts That Must Not Break

| # | Contract | Broken by | Detected by |
|---|---|---|---|
| 1 | `FEATURE_ORDER` matches the stored `feature_schema.json` | Editing one without the other | `assert_schema`, TC-UNIT-015 |
| 2 | `training/features.py` is the same file as `app/engine/features.py` | Replacing the symlink with a copy | CI check, TC-UNIT-014 |
| 3 | `RiskFactor.name` is a closed enum | Emitting a raw feature name | Zod parse, TC-ML-042 |
| 4 | `auditService.record` requires a transaction | Adding a non-transactional overload | Type signature, TC-SEC-030 |
| 5 | Route handlers import no `packages/db` symbol | Convenience query in a handler | ESLint rule, TC-INT-031 |
| 6 | Components import no `packages/db` symbol | Convenience query in a component | ESLint rule, TC-INT-030 |
| 7 | The persisted prediction equals the returned prediction | Post-write transformation | TC-INT-013 |
| 8 | No hotspot name or risk literal in `apps/web` | A "temporary" placeholder | `no_hardcode_check.sh`, TC-INT-010 |

Each of these has a test because each is a mistake a competent engineer makes under time pressure, and every one of them produces a system that looks correct while being wrong.
