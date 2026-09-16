# DEVELOPMENT STRATEGY — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Audience | The implementing team, and Claude Code |
| Related | `ROADMAP.md`, `implementation/phase-1.md` … `phase-8.md`, `.claude/CLAUDE.md` |

---

## 1. The Governing Principle

**Build the thing that makes the product true, first.**

Every screen in CyberPulse AI exists to present or act on a model output. If the model cannot produce a ranked hotspot with a bounded window and a readable explanation, then no amount of interface work produces a product — it produces a demonstration of an interface.

The build order follows from that. Data before model, model before interface, interface before polish. The first vertical slice — complaint → features → model → hotspot → window → SHAP → rendered explanation — is the Phase 3 exit gate, and nothing beyond Phase 3 begins until it works against a real model.

---

## 2. Phase Order, and Why It Deviates From the Template

The conventional documentation template places the AI layer at Phase 5, after core and advanced features. **CyberPulse AI inverts this**, and the deviation is recorded as ADR-014.

| Phase | Name | Why here |
|:--:|---|---|
| P1 | Research & Architecture | Contracts before code |
| P2 | Infrastructure & Data Foundation | The model cannot be trained without a validated corpus |
| P3 | **Core Intelligence & Complaint Workflow** | The AI layer *is* the product, not an enhancement to it |
| P4 | Money Trail & Geospatial Intelligence | Evidence surfaces for the prediction that now exists |
| P5 | Actionable Intelligence — Alerts & Investigations | Converts insight into action |
| P6 | Reporting, QA, Security & Performance | Completes the surface, then hardens everything |
| P7 | Demo Mode, Deployment & Production Readiness | Polish the narrative once the substance is real |
| P8 | Launch, Rehearsal & Post-Launch | Rehearse, measure, record |

Building the UI first would mean building against imagined responses and discovering late that the model cannot produce them. That is the specific failure this ordering prevents.

---

## 3. Stage Model

The pipeline every phase passes through, with inputs, tasks, outputs, tests and completion criteria.

### Stage 1 — Documentation
**In:** Problem statement, constraints · **Tasks:** Requirements, architecture, ADRs, test plan · **Out:** This blueprint · **Tests:** Traceability audit · **Done:** Zero orphan requirements or test cases.

### Stage 2 — Environment
**In:** Stack decisions · **Tasks:** Monorepo, Docker Compose, CI skeleton, environment validation · **Out:** `make setup` works from a clean clone · **Tests:** Startup, health, CI green · **Done:** A new developer reaches a running stack in under 30 minutes.

### Stage 3 — Foundation
**In:** Schema design · **Tasks:** Drizzle schema, migrations, enums, constraints, indexes · **Out:** Migrated database · **Tests:** Migrations on a clean DB; constraint enforcement · **Done:** Every constraint in `architecture/database-design.md` is enforced by Postgres, not only by validation.

### Stage 4 — Database and Data
**In:** Generator design · **Tasks:** Generator, signal check, PII scan, seeding · **Out:** Deterministic corpus, seeded · **Tests:** TC-DATA-001 … 009, TC-SEC-020 · **Done:** Byte-identical regeneration; both gates block as designed.

### Stage 5 — Backend / Intelligence
**In:** Corpus, feature spec · **Tasks:** `features.py`, training, evaluation, hotspot engine, temporal model, SHAP, FastAPI · **Out:** A prediction API returning the full contract · **Tests:** 42 AI cases, metric gates · **Done:** `evaluate.py` clears every gate; `/predict` returns a schema-valid response.

### Stage 6 — Frontend
**In:** A working prediction API · **Tasks:** Shell, complaint registry and detail, prediction panel, roles, prototype labelling · **Out:** The vertical slice, visible · **Tests:** Component, integration, E2E, integrity · **Done:** An officer can analyse a complaint and read an explanation.

### Stage 7 — Integration
**In:** Slice working · **Tasks:** Graph, map, alerts, investigations, reports · **Out:** The complete surface · **Tests:** Cross-feature, E2E · **Done:** The five-interaction critical path completes end to end.

### Stage 8 — Testing
**Tasks:** Complete every catalogue; raise coverage to the gates · **Done:** All Critical and High cases pass.

### Stage 9 — Security
**Tasks:** 29 security cases; threat-model review; declared gaps reconciled across three documents · **Done:** Security checklist §3 complete.

### Stage 10 — Performance
**Tasks:** k6, Lighthouse, timing, benchmarks against the preview · **Done:** Every p95 budget met on preview, not locally.

### Stage 11 — Deployment
**Tasks:** Containers, CI deployment, health, observability, recovery drills · **Done:** Production live; smoke green; all four drills rehearsed.

### Stage 12 — Launch
**Tasks:** Demo rehearsal, comprehension test, documentation audit · **Done:** Two narrated rehearsals within 180 s.

---

## 4. Hard Sequencing Rules

These are not preferences. Violating any of them produces work that has to be redone.

1. **No model training before `signal_check` passes.** Otherwise a day is spent debugging a model that had nothing to learn (RSK-01).
2. **No seeding before `pii_scan` passes.** A tainted corpus in a database is a governance incident, not a bug.
3. **No UI wired to prediction before `/predict` returns a real score.** Building against an imagined response is how a contract mismatch is discovered late.
4. **No alert work before a prediction exists to alert on.**
5. **No demo polish before P3–P5 exit.** This is the specific guard against RSK-05, scope creep.
6. **No deployment sign-off before the P6 security and performance gates pass.**
7. **Deploy in P6, verify in P7.** A first deployment attempted during the finale is a first deployment that fails.

---

## 5. Definition of Done

**A change is done when:** requirements implemented; UX implemented; API implemented; schema migrated; error handling implemented; unit, integration and E2E tests pass; security checks pass; accessibility checks pass where applicable; documentation updated in the same PR; code reviewed; CI green.

**A phase is done when:** all deliverables exist; phase acceptance criteria pass; phase test cases pass; required regression tests pass; no unresolved Critical or High defects; documentation reflects the implemented state.

Neither list contains "the author believes it works".

---

## 6. Working Agreements

| Agreement | Rationale |
|---|---|
| Tests ship with the code | A follow-up test is a test that does not get written |
| Documentation updates in the same PR | Documentation updated later is documentation that contradicts the code |
| A defect fix includes a failing test first | Otherwise it regresses |
| A flaky test is quarantined the day it flakes | Three tolerated flakes and the suite stops being a gate |
| No `TODO` without an owner and a reference | Otherwise it is a wish |
| Scope changes are logged in `decision-log.md` | Silent scope growth is how a three-week window becomes four |
| A budget breach is waived explicitly or not at all | Silent absorption is how budgets stop meaning anything |

---

## 7. Parallelisation

With six people, the critical path runs through the intelligence layer. Work that can proceed in parallel:

| Phase | Critical path | Parallel |
|:--:|---|---|
| P2 | Generator → signal check → seed | Schema, migrations, CI, Docker, shell layout |
| P3 | Features → training → evaluation → `/predict` | Complaint registry UI, design system, roles, shared schema |
| P4 | Graph traversal query | Map component, layer toggles, accessible tables |
| P5 | Alert transaction and audit | Investigation UI, alert list |
| P6 | Reports queries | Security cases, accessibility passes, k6 scripts |
| P7 | Deployment | `/demo` flow, recovery drills, runbook |

The graph and map in P4 are the largest genuinely parallel block and should be owned by two different people from the start of the phase.

---

## 8. Guidance for Claude Code

Binding instructions are in `.claude/CLAUDE.md`. The five that matter most:

1. **Read the relevant documentation before writing code.** Requirements, feature spec, API contract and ADRs for the area, in that order.
2. **Never introduce a value the model did not produce.** No placeholder scores, no example hotspots, no illustrative percentages — not even temporarily, because temporary code ships.
3. **Write the test with the implementation.** Not after.
4. **Never mark a phase complete without running its tests.** The exit criteria are in the phase document and they are checkable.
5. **Update the documentation in the same change.** If behaviour, schema or API changed, the corresponding document changed too.

---

## 9. When Reality Diverges From This Plan

It will. The rule is not to follow the plan regardless, but to make the divergence visible:

- A requirement that turns out to be wrong → update `REQUIREMENTS.md` and its tests, and record why in `decision-log.md`.
- An architecture decision that does not survive contact → write a superseding ADR rather than editing the old one.
- A phase that will not exit on time → cut scope from the *later* phases, never from the exit criteria of the current one.
- A metric gate that cannot be met → this is the one case that stops the build. A model below its gate is not shipped with an adjusted gate; the gate is what makes the published number meaningful.
