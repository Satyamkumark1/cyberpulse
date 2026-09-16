# ARCHITECTURE — Developer Orientation

A short read for someone joining the project. The full treatment is in `architecture/` (11 documents); this is the map.

---

## The system in one paragraph

Two services over one PostgreSQL database. A Next.js application owns the UI, the HTTP API, all business rules and all persistence. A Python FastAPI service owns feature engineering, model inference, hotspot ranking and SHAP explanation — and holds **no database credentials**. A build-time pipeline generates a deterministic synthetic corpus, validates it, seeds the database, trains the models and writes evaluation metrics back so the application can publish them.

---

## The rule that shapes everything

**Every number a user sees originated in a model output that the web application persisted, and was returned from the row it wrote.**

That single constraint explains most of the design: why the ML service cannot write state, why predictions are never cached, why optimistic UI is forbidden, why the response returned to the client is the persisted row rather than the upstream response, and why 24 test cases exist solely to prove it.

---

## Where things live

```
apps/web/
  app/(dashboard)/…     routes
  app/api/…             route handlers — validate, authorise, delegate
  components/…          presentation
  services/…            ← all business logic lives here
apps/ml-service/
  app/engine/…          features, models, hotspot, explain
  training/             features.py is a SYMLINK to app/engine/features.py
packages/
  shared/               one JSON Schema → Zod + Pydantic
  db/                   Drizzle schema, migrations, queries
```

**The test for `services/`:** if the logic would be identical in a CLI with no HTTP and no React, it belongs there.

---

## The prediction path

```
POST /api/predict
  → validate · resolve role · authorise · rate limit
  → assemble complaint, chain, accounts, candidate cells
  → ML service: 60 feature vectors → batch score → rank → temporal → SHAP (top cell only)
  → validate the response against the shared schema
  → BEGIN: insert prediction + factors : COMMIT
  → return the persisted row
```

Two invariants: the client receives what was written, not what the ML service returned; and a prediction without its factors cannot exist.

Budget: ≤ 1000 ms typical against a 1500 ms requirement. The 500 ms headroom absorbs a cold connection without breaching.

---

## Four boundaries enforced mechanically

| Forbidden | By |
|---|---|
| Components importing the database | ESLint |
| Components importing the ML client | ESLint |
| Route handlers importing the database | ESLint |
| Services importing React or Next types | ESLint |

Plus one enforced by the filesystem: `training/features.py` is a symlink, so train/serve skew is impossible rather than merely discouraged.

---

## What to read, in order

1. `architecture/high-level-architecture.md` — the shape
2. `architecture/system-design.md` §4 and §5 — the prediction path and the failure model
3. `architecture/low-level-design.md` §7 — the eight internal contracts that must not break
4. `architecture/database-design.md` §5 — why each of the 31 indexes exists
5. `architecture/architecture-decisions.md` — the 20 decisions and what was rejected

If you read only one section, read the failure model. It has no blank cells, and every row names its test.

---

## Things that will surprise you

- **No Redis, no message broker, no Kubernetes.** Three deployables and one database. Every additional component is a failure mode during a three-minute evaluation.
- **No LLM anywhere.** The prediction path is a tree ensemble with exact SHAP, because reproducibility and attribution are requirements.
- **The ML service has no database access.** A compromise yields wrong predictions — caught by response validation — not data loss.
- **Out-of-scope objects return 404, not 403.** A 403 confirms existence.
- **The role switcher is not authentication** and is documented as such in four places.
