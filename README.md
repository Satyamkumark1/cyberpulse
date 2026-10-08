# CyberPulse AI

**Predictive Cyber-Fraud Intelligence Platform**
Smart India Hackathon 2026 · Problem Statement **PS 26184** · Ministry of Home Affairs / Indian Cyber Crime Coordination Centre (I4C), CIS Division

> ⚠ **Prototype.** This system runs entirely on synthetic, anonymised demonstration data generated from a fixed seed. It is not deployed, not endorsed by any government body, and not connected to NCRP, CFCFRMS, NPCI or any banking system. Predictions are experimental and intended for research and proof-of-concept use.

---

## What it does

When a citizen files a financial cybercrime complaint, the money has usually already begun moving. It is layered across mule accounts within minutes and converted to cash within hours. Once cash leaves the banking system, recovery collapses.

CyberPulse AI takes a complaint and forecasts **where** and **when** the money is most likely to be withdrawn — as a ranked list of localities, a bounded time window, and an explanation an investigating officer can read aloud to a supervisor.

```
Complaint → transaction intelligence → feature engineering → predictive ML
  → geospatial hotspot analysis → predicted location → predicted time window
  → explainable risk score → actionable alert → investigator review → intervention
```

It is **decision support**. It predicts locations and time windows, never people. It takes no autonomous action.

---

## This repository

Phase 1 produced the documentation blueprint; the current repository contains the implemented web, ML, safety and demonstration workflow. See `CHANGELOG.md` and the phase notes for what each phase actually shipped and what remains a manual release check.

```
├── apps/
│   ├── web/             Next.js — shell, API route handlers, services
│   └── ml-service/       FastAPI — health, feature computation, prediction and explanations
├── packages/
│   ├── db/               Drizzle schema (16 tables), migrations, seed pipeline
│   ├── shared/            JSON Schema → Zod + Pydantic; enums; constants
│   └── config/            ESLint, TS, Tailwind presets
├── scripts/
│   ├── generate-data/     Deterministic synthetic corpus generator (seed 26184)
│   └── evaluation/        signal_check · pii_scan · no_hardcode_check
├── docker-compose.yml · docker/ · Makefile · .github/workflows/
│
├── PROJECT_BRIEF · PRD · REQUIREMENTS · USER_STORIES
├── ACCEPTANCE_CRITERIA · FEATURE_SPECIFICATIONS · ROADMAP · CHANGELOG
├── TESTING_STRATEGY · MASTER_TEST_PLAN
│
├── product/            personas, journeys, use cases, metrics, analytics
├── ux/                 IA, wireframes, design system, accessibility, guidelines
├── architecture/       system, LLD, database, API, security, deployment, 20 ADRs
├── diagrams/           Mermaid: architecture, data flow, ERD, deployment, flows
├── security/           threat model, authz, data protection, 29 test cases
├── ai/                 strategy, model selection, evaluation, guardrails, 42 cases
├── engineering/        standards, testing, error handling, performance, release
├── devops/             CI/CD, infrastructure, environments, observability, DR
├── test-cases/         11 catalogues, ~400 cases
├── implementation/     8 phases with per-phase test gates, matrix, audit
├── project-management/ risks, milestones, sprints, dependencies, decisions
├── business/           sustainment model, stakeholders, adoption pathway
├── prompts/            7 reusable generator prompts
├── docs/               architecture, ML pipeline, demo script, data methodology
└── .claude/            CLAUDE.md + 7 rules + 7 commands + 6 skills + 8 agents
```

**Start here:** `PROJECT_BRIEF.md` → `architecture/high-level-architecture.md` → `implementation/development-strategy.md`. To pick up implementation, `implementation/phase-3.md` is next — Phase 2 exit criteria are checked in `implementation/phase-2.md` §12.

---

## Architecture

Two services over one PostgreSQL database.

```
Browser ──▶ Next.js (UI · API · services · all persistence)
                ├──▶ FastAPI ML service (features · models · SHAP) — no DB credentials
                └──▶ Neon PostgreSQL
```

| Layer | Choice |
|---|---|
| Web | Next.js App Router · TypeScript · Tailwind · shadcn/ui · Recharts · React Flow · MapLibre |
| Data | Neon PostgreSQL · Drizzle ORM · H3 spatial indexing |
| ML | FastAPI · XGBoost · scikit-learn · SHAP |
| Testing | Vitest · Playwright · pytest · k6 · axe-core |
| Deploy | Vercel · Render/Railway/Fly · Docker Compose for local parity |

Every choice is justified with alternatives and trade-offs in `architecture/architecture-decisions.md`.

---

## The rule that shapes the system

**No value reaches a screen, a response or the database unless the model produced it for that request.**

No placeholders. No cached predictions. No optimistic UI. No fallback default on failure. When a capability is unavailable the system says so and shows **no numbers at all**.

Six independent controls enforce it, and 24 test cases prove it — including one that intercepts the API response, rewrites it, and asserts the interface follows.

---

## Setup

Needs Docker, Node 20 + pnpm, and Python 3.11.

```bash
git clone <repo> && cd cyberpulse-ai
pnpm install
cat > apps/web/.env.local <<'EOF'
DATABASE_URL=postgres://cyberpulse:cyberpulse@localhost:5432/cyberpulse
ML_SERVICE_URL=http://localhost:8000
NEXT_PUBLIC_MAP_TILE_URL=https://tiles.openfreemap.org/styles/liberty
LOCATION_SERVICE_URL=https://photon.komoot.io
EOF
make setup      # venvs · compose up · migrate · generate · signal_check
                # · pii_scan · seed · train · evaluate
make dev        # Postgres + ML in Docker, web on :3000
```

`apps/web/.env.local` is the one local env file: the web app reads it and the Makefile takes `DATABASE_URL` from it. `.env.example` lists the variables for deployment (Vercel), not local values. If another Postgres already listens on 5432 (e.g. Homebrew), stop it first — `localhost:5432` would reach it instead of the container.

Deployment: ML service on Render from `render.yaml`, web app on Vercel (root `apps/web`), database on Neon — `devops/infrastructure.md`.

Target: clean clone to a live prediction in **under 30 minutes** (NFR-17, timed by TC-DOC-001).

Two pipeline gates are non-bypassable: `signal_check.py` must confirm the synthetic corpus contains learnable signal before training, and `pii_scan.py` must find nothing before seeding.

---

## Try it

Open `/dashboard` and click **RUN DEMO SCENARIO**, or go to `/demo` for the guided six-step flow:

complaint `C-10284` → money-trail graph → live AI analysis → predicted hotspot → explanation → internal alert queue.

The narrated flow is designed for a three-minute run against the live prediction service. It queues an internal prototype alert; it does not send email, SMS or an external agency notification. `docs/demo-script.md` is the narrated version.

---

## Model

Three tabular models and exact SHAP. **No LLM anywhere in the prediction path** — reproducibility, exact attribution and offline verification are requirements, and a generative model provides none of them well.

| Model | Task |
|---|---|
| Risk | XGBoost binary classifier over (complaint × candidate cell) pairs |
| Hotspot engine | H3 candidate generation · weighted candidate ranking · DBSCAN/KDE helpers for offline analysis only |
| Temporal | Multiclass over twelve 2-hour bins → a window of at most 4 hours |

Explanations are exact Shapley values from the served classifier, aggregated into officer-readable relative factors normalised to 100% when non-zero. They explain the classifier output, not the final blended ranking score or a calibrated cash-out probability.

The evaluator has release gates including ROC-AUC ≥ 0.85, top-3 hit rate ≥ 0.72 and ECE ≤ 0.10; it exits non-zero below any gate, and **the gate is never lowered to accommodate a model** (DEC-004). The currently published model-card metrics are historical synthetic-artifact observations and are not presented as a newly verified complete served-pipeline result.

---

## Responsible use

- All data is **synthetic**. The structured schema has no dedicated name, address, phone number, email, government identifier or real account-number fields; free-text notes and user-entered alert/report text still require synthetic-only use and appropriate handling.
- The system produces **risk indications about locations and time windows**, never determinations about individuals.
- Account language is limited to "Mule Account", "Suspicious Account" and "Risk Indicator", enforced by a CI scan.
- Every prediction carries confidence, ranked alternatives and named factors.
- No claim of MHA or I4C endorsement, real-data access, guaranteed prevention or guaranteed recovery.
- Published metrics are captioned as measured on synthetic data.

---

## Known limitations

Stated here rather than buried, because a prototype that claims none is not credible.

| Limitation | Detail |
|---|---|
| **Metrics describe synthetic data** | They measure recovery of planted patterns, not real-world accuracy |
| **Labels would not exist in production** | Supervised training depends on outcome capture that a real deployment would have to build |
| **Bias is untestable here** | The generator's geography is a design choice, so any disparity found would be ours. This is the project's most serious open question |
| **No authentication** | The role selector is a demonstration affordance, not a security control (ADR-019) |
| **Candidate generation bounds recall** | A cash-out outside the candidate set cannot be predicted; the ceiling is measured and published |
| **No adversarial robustness** | Cash-out behaviour would adapt if such a system were known |
| **No penetration test** | Out of scope for a hackathon prototype |

Full register: `security/security-checklist.md` §4 (twelve declared gaps, reproduced verbatim in two other documents and asserted identical by TC-DOC-018).

---

## Documentation map

| Question | Document |
|---|---|
| What is this and why? | `PROJECT_BRIEF.md` |
| What must it do? | `REQUIREMENTS.md` · `ACCEPTANCE_CRITERIA.md` |
| How is it built? | `architecture/` · `diagrams/` |
| How does the model work? | `ai/` · `docs/ml-pipeline.md` |
| How is it tested? | `TESTING_STRATEGY.md` · `MASTER_TEST_PLAN.md` · `test-cases/` |
| In what order? | `implementation/development-strategy.md` · `phase-1…8.md` |
| Is it safe? | `security/` |
| How good is the model, really? | `ai/evaluation-framework.md` §8 |
| How do I demo it? | `docs/demo-script.md` |
| How should Claude Code work here? | `.claude/CLAUDE.md` |

---

## Attribution

Built for Smart India Hackathon 2026 against problem statement PS 26184, proposed by the Ministry of Home Affairs through the Indian Cyber Crime Coordination Centre.

Safer Citizens. Smarter Enforcement. Stronger India.
