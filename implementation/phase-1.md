# PHASE 1 — RESEARCH & ARCHITECTURE

| Field | Value |
|---|---|
| Duration | 6 person-days · Week 1, days 1–2 |
| Output | The complete documentation baseline; no application code |
| Entry | Problem statement PS 26184 understood; team assembled |

---

## 1. Objectives

1. Convert PS 26184 into traceable requirements with no ambiguity left to implementation.
2. Decide and record every architectural choice that would be expensive to reverse.
3. Define the contracts — API, schema, feature vector — that later phases build against.
4. Establish the test strategy before any code exists, so tests are a design input rather than an afterthought.
5. Make the project's assumptions and limitations explicit, in writing.

---

## 2. Deliverables

| Deliverable | Acceptance |
|---|---|
| `PROJECT_BRIEF.md` | 10 assumptions recorded; stack justified; responsible-use statement present |
| `PRD.md` | Goals, non-goals, personas, scope through V1/V2/Future, metrics with gates |
| `REQUIREMENTS.md` | 132 requirements, each with priority, verification method, tests and phase |
| `USER_STORIES.md` | 49 stories; every feature has ≥ 1 P0 story |
| `ACCEPTANCE_CRITERIA.md` | Given/When/Then for all 16 features plus 5 global criteria |
| `FEATURE_SPECIFICATIONS.md` | 14 sections per feature for FEAT-01 … FEAT-16 |
| `architecture/*` (11 docs) | System design, LLD, schema, API, ADRs 001–020 |
| `ux/*` (6 docs) | IA, wireframes, design system, accessibility, guidelines, UX cases |
| `security/*` (8 docs) | Threat model, authz, data protection, 29 test cases, checklist |
| `ai/*` (9 docs) | Strategy, model selection, evaluation framework, guardrails, 42 cases |
| `engineering/*` and `devops/*` (18 docs) | Standards, testing, error handling, CI/CD, DR |
| `TESTING_STRATEGY.md`, `MASTER_TEST_PLAN.md` | Traceability matrix complete |
| `implementation/phase-1…8.md` + matrix | Per-phase gates defined |
| `.claude/*` (29 files) | Claude Code configuration, rules, commands, agents |

---

## 3. Implementation Tasks

| # | Task | Owner | Days |
|---|---|---|---|
| T-1.1 | Decompose PS 26184 into sub-problems and derive requirements | PM + Architect | 1.0 |
| T-1.2 | Define personas, use cases and journeys | PM + UX | 0.5 |
| T-1.3 | Write the acceptance criteria and feature specifications | PM + QA | 1.0 |
| T-1.4 | Decide the stack; write ADR-001 … ADR-020 | Architect | 1.0 |
| T-1.5 | Design the schema: 16 tables, enums, constraints, 31 indexes | DB engineer | 0.75 |
| T-1.6 | Design the API: 25 endpoints, one error envelope | Backend | 0.75 |
| T-1.7 | Design the ML approach: formulation, features, metrics, gates | ML engineer | 0.75 |
| T-1.8 | Threat model and security architecture | Security | 0.5 |
| T-1.9 | Design system, wireframes, accessibility policy | UX | 0.75 |
| T-1.10 | Test strategy, master plan, traceability matrix | QA | 0.75 |
| T-1.11 | Claude Code configuration | Architect | 0.25 |

---

## 4. Dependencies

**Inbound:** none. **Outbound:** every later phase. P2 cannot begin without the schema and the generator design; P3 cannot begin without the feature vector definition and the API contract.

---

## 5. Risks

| Risk | Mitigation |
|---|---|
| Over-documentation consumes build time | Time-boxed to 6 person-days; parallelised across roles |
| Decisions made without evidence | Every ADR records alternatives and trade-offs; assumptions labelled ASM-xx |
| Requirements that cannot be tested | Every requirement carries a verification method and test IDs before the phase exits |
| A contract that the model cannot satisfy | The ML approach and metric gates are designed in this phase, not discovered in P3 |
| Documentation drifting from code later | Change-management rules in `engineering/release-process.md` §5 require same-PR updates |

---

## 6. Acceptance Criteria

**AC-P1-01** — Every requirement in `REQUIREMENTS.md` has an ID, a priority, a verification method, at least one test case reference, and a delivery phase.
**AC-P1-02** — Every feature FEAT-01 … FEAT-16 has acceptance criteria in Given/When/Then form containing no unmeasurable language.
**AC-P1-03** — Every significant technical decision has an ADR with context, alternatives, trade-offs and consequences.
**AC-P1-04** — The API contract defines request, response, errors, authorisation and rate limit for all 25 endpoints.
**AC-P1-05** — The schema defines all tables, columns, types, constraints, relationships and indexes, with each index naming the query it serves.
**AC-P1-06** — The ML approach defines the formulation, the feature vector, the metrics and the release-blocking gates.
**AC-P1-07** — The threat model covers every trust boundary, and each identified threat has a control and a test.
**AC-P1-08** — The traceability matrix maps every requirement through to a test case and a phase, with zero orphans in either direction.
**AC-P1-09** — Every phase document defines objectives, deliverables, tasks, dependencies, risks, acceptance criteria, test cases, regression, security, performance and exit criteria.
**AC-P1-10** — All assumptions are recorded with rationale and the consequence of being wrong.

---

## 7. Test Strategy

Phase 1 produces no code, so its tests are **documentation verification** — inspection and analysis, executed as scripted checks where possible and as structured review where not. Every check below is objectively decidable; none is "does this read well".

---

## 8. Phase 1 Test Cases

### TC-DOC-010 — Requirement completeness
**Priority** Critical · **Type** Inspection · **Automated** (script over the markdown tables)
**Steps:** Parse `REQUIREMENTS.md`; for each requirement assert the presence of ID, priority, verification method, ≥ 1 test reference, phase.
**Expected:** 132 requirements, 132 complete. Zero missing fields.

### TC-DOC-011 — Traceability, forward
**Priority** Critical · **Automated**
**Steps:** For every requirement, resolve its test-case references against the catalogues.
**Expected:** Every reference resolves to a defined case. Zero dangling references.

### TC-DOC-012 — Traceability, reverse
**Priority** Critical · **Automated**
**Steps:** For every test case in every catalogue, resolve its requirement reference.
**Expected:** Zero orphan test cases.

### TC-DOC-013 — Acceptance criteria are measurable
**Priority** Critical · **Type** Inspection
**Steps:** Scan `ACCEPTANCE_CRITERIA.md` for "works properly", "good performance", "user-friendly", "fast", "intuitive", "appropriate", "reasonable".
**Expected:** Zero matches outside explicit prohibitions of those phrases.

### TC-DOC-014 — API contract completeness
**Priority** High · **Inspection**
**Expected:** All 25 endpoints define method, route, purpose, authorisation, request, validation, response, errors, rate limit and tests. Every error code is in the closed set.

### TC-DOC-015 — Schema supports every feature
**Priority** Critical · **Analysis**
**Steps:** For each of the 16 features, walk its data requirements against the schema.
**Expected:** Every required field exists. Every documented query has a supporting index. **Negative check:** no personal-data column exists in any table.

### TC-DOC-016 — Architecture consistency
**Priority** High · **Analysis**
**Expected:** Every API response field is producible from the schema or the ML contract. Every UI element in the wireframes maps to an API field. Every ADR's consequences are reflected in the documents it affects.

### TC-DOC-017 — Security architecture covers the threat model
**Priority** Critical · **Analysis**
**Expected:** Every STRIDE cell and every domain-specific threat has a control and a test case. Accepted risks are recorded identically in all three places that list them.

### TC-DOC-018 — Declared gaps are consistent across documents
**Priority** High · **Automated**
**Steps:** Extract the gap tables from `architecture/security-architecture.md` §10, `security/compliance.md` §6 and `security/security-checklist.md` §4; compare.
**Expected:** Identical sets. A gap present in one and absent from another is a failure.

### TC-DOC-019 — ML approach is evaluable
**Priority** Critical · **Analysis**
**Expected:** The formulation yields the stated metrics. Every gate has a number. The labelling strategy is defined. The limitation that labels would not exist in production is stated.

### TC-DOC-020 — Phase documents are complete
**Priority** Critical · **Inspection**
**Expected:** All eight phase documents contain the eleven required sections, each with content rather than a placeholder.

### TC-DOC-021 — No contradictions across documents *(negative test)*
**Priority** Critical · **Analysis**
**Steps:** Cross-check the values that appear in more than one document: thresholds (0.70 / 0.40), H3 resolution (8), candidate cap (60), window cap (4 h), rate limits, corpus volumes, model version string, phase names.
**Expected:** Every value agrees everywhere it appears.

---

## 9. Regression Tests

Not applicable — Phase 1 is the first phase. Its outputs become the regression baseline for documentation: any later change to a requirement, contract or schema re-runs TC-DOC-010 … 021.

---

## 10. Security Validation

| Check | Expected |
|---|---|
| Threat model covers all five trust boundaries | TB-1 … TB-5 present with STRIDE analysis |
| Each threat has a control and a test | Zero threats without both |
| Accepted risks are explicit | SR-02 and SR-12 stated as accepted, with reasons |
| No personal-data column is designed in | Schema review confirms absence |
| The prototype's authentication gap is stated, not implied | Present in ADR-019 and three security documents |
| Prohibited-claims and terminology constraints exist as requirements | CR-02, CR-03, CR-04 present with test references |

---

## 11. Performance Validation

| Check | Expected |
|---|---|
| Every performance requirement has a number | NFR-01 … NFR-05, NFR-19, NFR-20 quantified |
| Targets are justified rather than invented | Each derived from the workload and labelled as an assumption where applicable |
| A measurement method is defined per target | Tool and test case named |
| The timing budget sums correctly | Prediction path stages sum to ≤ 1000 ms against a 1500 ms budget |

---

## 12. Exit Criteria

Phase 1 exits when **all** hold:

- [ ] AC-P1-01 … AC-P1-10 pass
- [ ] TC-DOC-010 … TC-DOC-021 pass
- [ ] Zero orphan requirements; zero orphan test cases
- [ ] Zero contradictions found in TC-DOC-021
- [ ] All 20 ADRs written with alternatives and trade-offs
- [ ] All 10 assumptions recorded with consequences
- [ ] Declared gaps identical across all three documents
- [ ] `.claude/` configuration complete
- [ ] The team can answer, from the documents alone: what is built first, what the model predicts, and what the system must never do

The last item is the real test. If a team member has to ask a question the documentation should answer, the phase has not exited.
