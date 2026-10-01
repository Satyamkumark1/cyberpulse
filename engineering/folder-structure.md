# FOLDER STRUCTURE — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Layout | pnpm workspace monorepo |
| Related | `architecture/low-level-design.md` §1, `.claude/rules/*` |

---

## 1. Top Level

```
cyberpulse-ai/
├── apps/
│   ├── web/                  Next.js application — UI, API, services
│   └── ml-service/           FastAPI — features, models, SHAP
├── packages/
│   ├── db/                   Drizzle schema, migrations, queries, seed
│   ├── shared/               JSON Schema → Zod + Pydantic; enums; constants
│   └── config/               ESLint, TS, Tailwind, Prettier presets
├── scripts/
│   ├── generate-data/        Synthetic corpus generator
│   ├── seed/                 Database seeding
│   └── evaluation/           signal_check · pii_scan · no_hardcode_check
├── docker/                   Dockerfile.ml
├── docs/                     architecture · ml-pipeline · demo-script · data-methodology
├── .claude/                  CLAUDE.md, rules, commands, skills, agents
├── .github/workflows/        CI
├── docker-compose.yml
├── pnpm-workspace.yaml
├── Makefile
├── .env.example
└── README.md
```

Plus the documentation directories that constitute this blueprint: `product/`, `architecture/`, `ux/`, `engineering/`, `devops/`, `ai/`, `security/`, `project-management/`, `business/`, `implementation/`, `test-cases/`, `prompts/`, `diagrams/`.

---

## 2. `apps/web`

```
apps/web/
├── app/
│   ├── (dashboard)/              Route group — shared shell
│   │   ├── layout.tsx            Sidebar, header, prototype badge
│   │   ├── dashboard/page.tsx
│   │   ├── complaints/page.tsx
│   │   ├── complaints/[id]/page.tsx
│   │   ├── risk-map/page.tsx
│   │   ├── transactions/page.tsx
│   │   ├── transactions/[id]/page.tsx
│   │   ├── investigations/page.tsx
│   │   ├── investigations/[id]/page.tsx
│   │   ├── alerts/page.tsx
│   │   ├── alerts/[id]/page.tsx
│   │   ├── reports/page.tsx
│   │   └── settings/page.tsx
│   ├── demo/page.tsx             Standalone shell, no sidebar
│   ├── api/
│   │   ├── complaints/route.ts
│   │   ├── complaints/[id]/route.ts
│   │   ├── predict/route.ts
│   │   ├── transactions/…
│   │   ├── hotspots/…
│   │   ├── atms/route.ts
│   │   ├── alerts/…
│   │   ├── investigations/…
│   │   ├── reports/…
│   │   ├── settings/route.ts
│   │   ├── simulation/…
│   │   ├── demo/reset/route.ts
│   │   ├── role/route.ts
│   │   └── health/route.ts
│   ├── error.tsx · not-found.tsx · global-error.tsx
│   └── layout.tsx
├── components/
│   ├── ui/                       shadcn primitives (owned, restyled)
│   ├── common/                   RiskBadge · StatePanel · KpiCard · FactorBar · DataTable
│   ├── map/                      MapCanvas · LayerToggles · HotspotDrawer · AccessibleHotspotTable
│   ├── graph/                    MoneyTrailGraph · VictimNode · MuleAccountNode · AtmNode · NodeDetail
│   ├── prediction/               PredictionPanel · FactorList · RankedHotspots · WindowDisplay
│   ├── alerts/                   AlertModal · RecipientPicker · AlertList
│   └── charts/                   Six charts + ChartTable
├── hooks/
├── lib/                          env · format · analytics · rateLimit · errors · requestId · logger
├── services/                     ← the business layer
│   ├── complaintService.ts
│   ├── transactionService.ts
│   ├── predictionService.ts
│   ├── hotspotService.ts
│   ├── alertService.ts
│   ├── investigationService.ts
│   ├── reportService.ts
│   ├── settingsService.ts
│   ├── auditService.ts
│   ├── mlClient.ts
│   └── lib/                      auth · scope · exposure · severity
├── types/                        View models only — never API contracts
└── public/
```

### Placement rules

| If it… | It goes in |
|---|---|
| Renders | `components/` |
| Fetches for a client component | `hooks/` |
| Applies a business rule or composes data | `services/` |
| Touches the database | `packages/db` |
| Crosses the wire to ML | `services/mlClient.ts` |
| Formats for display | `lib/format.ts` |
| Is shared with the ML service | `packages/shared` |

**The test for `services/`:** if the logic would be identical in a CLI with no HTTP and no React, it belongs there. That single question resolves almost every placement argument.

---

## 3. `apps/ml-service`

```
apps/ml-service/
├── app/
│   ├── main.py                   FastAPI app, lifespan artefact loading
│   ├── routers/                  predict · hotspots · health · metrics
│   ├── schemas/                  Pydantic, generated from packages/shared
│   ├── core/                     config · logging · errors
│   └── engine/
│       ├── features.py           ← the single feature module
│       ├── risk.py
│       ├── temporal.py
│       ├── hotspot.py
│       └── explain.py
├── models/                       risk_model.joblib · temporal_model.joblib
│                                 feature_schema.json · model_card.json
├── training/
│   ├── generate_training_data.py
│   ├── features.py               ← SYMLINK to ../app/engine/features.py
│   ├── train.py
│   ├── evaluate.py
│   └── predict.py
├── tests/
└── requirements.txt
```

`training/features.py` being a symlink rather than a copy is the mechanism that makes train/serve skew impossible. CI asserts it (TC-UNIT-014); replacing it with a real file fails the build.

---

## 4. `packages/shared`

```
packages/shared/
├── schemas/           prediction · complaint · alert · investigation · error  (.schema.json)
├── zod/               generated — do not edit
├── enums.ts           fraud types, statuses, roles, risk levels
├── constants.ts       MODEL_VERSION, FEATURE_SCHEMA_VERSION, thresholds, limits
└── scripts/           generate-zod.ts · generate-pydantic.ts
```

Generated output is committed so a fresh clone type-checks without running codegen, and a drifted commit is visible in review as a diff rather than as a mystery.

---

## 5. `packages/db`

```
packages/db/
├── schema/            one file per table group
├── migrations/        NNNN_verb_subject.sql — reviewed SQL, committed
├── queries/           complaints · transactions · network · hotspots
│                      predictions · alerts · investigations · reports · audit
├── seed/
└── client.ts
```

`queries/network.ts` holds the one raw recursive CTE in the codebase. It is isolated deliberately: a single reviewed file is easier to keep safe than a rule that raw SQL be used carefully.

---

## 6. Naming Conventions

| Item | Convention |
|---|---|
| Directories | kebab-case (`risk-map`, `ml-service`) |
| React components | PascalCase matching the export |
| Everything else in TS | camelCase |
| Python modules | snake_case |
| Migrations | `NNNN_verb_subject.sql` |
| Tests | `<subject>.test.ts` / `test_<subject>.py` |
| Fixtures | `__fixtures__/<domain>.ts` |
| Documentation | kebab-case; root-level blueprint docs SCREAMING_SNAKE |

---

## 7. Enforced Boundaries

```jsonc
// eslint no-restricted-imports
{ "components/**": ["@cyberpulse/db", "services/mlClient", "services/lib/auth"],
  "app/api/**":    ["@cyberpulse/db"],
  "services/**":   ["react", "next/server"] }
```

Four forbidden edges, each corresponding to a red line in `diagrams/system-architecture.md` D-05. They are lint errors because every one of them is a shortcut that looks harmless in a single PR and is expensive to unwind six weeks later.

---

## 8. What Does Not Belong Anywhere

| Never in the repository | Instead |
|---|---|
| `.env` with real values | `.env.example` with placeholders |
| Model artefacts over 100 MB | Built by `train:model`, baked into the image |
| Real data of any kind | Generated from seed 26184 |
| Screenshots in documentation | ASCII wireframes and Mermaid — diffable |
| `node_modules`, `__pycache__`, `.next`, `dist` | `.gitignore` |
| Commented-out code | Version control is the history |
| `TODO` without an owner and a reference | A task in `project-management/` |
