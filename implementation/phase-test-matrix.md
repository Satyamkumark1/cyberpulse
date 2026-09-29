# PHASE TEST MATRIX — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Purpose | Complete traceability of Phase → Requirement → Feature → Test Case → Type → Priority → Status |
| Status values | Planned · In progress · Pass · Fail · Blocked |
| Related | `MASTER_TEST_PLAN.md` §6, `implementation/phase-*.md` |

---

## Phase 1 — Research & Architecture

| Phase | Requirement | Feature | Test Case | Type | Priority | Status |
|:--:|---|---|---|---|---|---|
| P1 | All 132 | — | TC-DOC-010 | Inspection | Critical | Planned |
| P1 | All 132 | — | TC-DOC-011 | Inspection | Critical | Planned |
| P1 | All test cases | — | TC-DOC-012 | Inspection | Critical | Planned |
| P1 | All ACs | FEAT-01…16 | TC-DOC-013 | Inspection | Critical | Planned |
| P1 | API contract | — | TC-DOC-014 | Inspection | High | Planned |
| P1 | Schema | FEAT-01…16 | TC-DOC-015 | Analysis | Critical | Planned |
| P1 | Architecture | — | TC-DOC-016 | Analysis | High | Planned |
| P1 | SR-01…SR-08 | — | TC-DOC-017 | Analysis | Critical | Planned |
| P1 | Declared gaps | — | TC-DOC-018 | Automated | High | Planned |
| P1 | FR-06…FR-10 | FEAT-05…09 | TC-DOC-019 | Analysis | Critical | Planned |
| P1 | Phase docs | — | TC-DOC-020 | Inspection | Critical | Planned |
| P1 | Cross-document values | — | TC-DOC-021 | Analysis | Critical | Planned |

---

## Phase 2 — Infrastructure & Data Foundation

| Phase | Requirement | Feature | Test Case | Type | Priority | Status |
|:--:|---|---|---|---|---|---|
| P2 | FR-01 | FEAT-16 | TC-DATA-001 | Data | Critical | Planned |
| P2 | FR-01.1, NFR-14 | FEAT-16 | TC-DATA-002 | Data | Critical | Planned |
| P2 | FR-01.2 | FEAT-16 | TC-DATA-003 | Data | High | Planned |
| P2 | FR-01.3 | FEAT-16 | TC-DATA-004 | Data | High | Planned |
| P2 | FR-01.4 | FEAT-16 | TC-DATA-005 | Data | High | Planned |
| P2 | FR-01.5 | FEAT-16 | TC-DATA-006 | Data | Critical | Planned |
| P2 | FR-01.6 | FEAT-16 | TC-DATA-007 | Data | High | Planned |
| P2 | FR-01.8 | FEAT-16 | TC-DATA-008 | Data | Medium | Planned |
| P2 | FR-01.9 | FEAT-16 | TC-DATA-009 | Data | Critical | Planned |
| P2 | FR-01.7, CR-01 | FEAT-16 | TC-SEC-020 | Security | Critical | Planned |
| P2 | CR-01 | — | TC-SEC-022 | Security | Critical | Planned |
| P2 | FR-23 | FEAT-15 | TC-API-080 | API | High | Planned |
| P2 | FR-23 | FEAT-15 | TC-INT-080 | Integration | High | Planned |
| P2 | FR-23 | FEAT-15 | TC-INT-081 | Integration | Medium | Planned |
| P2 | NFR-17 | — | TC-DOC-001 | Documentation | High | Planned |
| P2 | Schema | — | TC-P2-01 | Integration | Critical | Planned |
| P2 | Schema constraints | — | TC-P2-02 | Integration | Critical | Planned |
| P2 | Seeding | FEAT-16 | TC-P2-03 | Integration | High | Planned |
| P2 | Seeding | FEAT-16 | TC-P2-04 | Integration | High | Planned |
| P2 | NFR-15 | — | TC-P2-05 | Integration | High | Planned |
| P2 | FR-25 | FEAT-15 | TC-P2-06 | UI | High | Planned |
| P2 | NFR-12 | — | TC-P2-07 | Integration | High | Planned |
| P2 | Logging | — | TC-P2-08 | Security | High | Planned |
| P2 | NFR-24 | — | TC-SEC-040 | Security | High | Planned |

---

## Phase 3 — Core Intelligence & Complaint Workflow

| Phase | Requirement | Feature | Test Case | Type | Priority | Status |
|:--:|---|---|---|---|---|---|
| P3 | FR-06, FR-06.1 | FEAT-05 | TC-UNIT-010, 011 | Unit | Critical | Planned |
| P3 | FR-06.2 | FEAT-05 | TC-UNIT-012 | Unit | Critical | Planned |
| P3 | FR-06.3 | FEAT-05 | TC-UNIT-013 | Unit | High | Planned |
| P3 | FR-06.4 | FEAT-05 | TC-UNIT-014 | Unit | Critical | Planned |
| P3 | FR-06.5 | FEAT-05 | TC-UNIT-015 | Unit | Critical | Planned |
| P3 | FR-07 | FEAT-06 | TC-ML-010 | AI | Critical | Planned |
| P3 | FR-07.1 | FEAT-06 | TC-ML-011, TC-UNIT-022 | AI/Unit | Critical | Planned |
| P3 | FR-07.2 | FEAT-06 | TC-ML-012, TC-UNIT-024 | AI/Unit | High | Planned |
| P3 | FR-07.3 | FEAT-06 | TC-ML-013 | AI | High | Planned |
| P3 | FR-07.4 | FEAT-06 | TC-PERF-006 | Performance | High | Planned |
| P3 | FR-07.5 | FEAT-06 | TC-ML-014 | AI | Critical | Planned |
| P3 | M-30 | FEAT-06 | TC-ML-015 | AI | High | Planned |
| P3 | FR-08 | FEAT-07 | TC-ML-020 | AI | Critical | Planned |
| P3 | FR-08.1 | FEAT-07 | TC-ML-021 | AI | High | Planned |
| P3 | FR-08.2 | FEAT-07 | TC-ML-022 | AI | Medium | Planned |
| P3 | FR-08.3 | FEAT-07 | TC-ML-023 | AI | Critical | Planned |
| P3 | FR-08.4 | FEAT-07 | TC-ML-024 | AI | Critical | Planned |
| P3 | FR-08.5 | FEAT-07 | TC-ML-025 | AI | Critical | Planned |
| P3 | FR-08.6 | FEAT-07 | TC-INT-010 | Integration | Critical | Planned |
| P3 | FR-08 fallback | FEAT-07 | TC-ML-026 | AI | High | Planned |
| P3 | FR-09 | FEAT-08 | TC-ML-030 | AI | Critical | Planned |
| P3 | FR-09.1 | FEAT-08 | TC-ML-031 | AI | High | Planned |
| P3 | FR-09.2 | FEAT-08 | TC-ML-032, TC-UNIT-028 | AI/Unit | Critical | Planned |
| P3 | FR-09.3 | FEAT-08 | TC-UI-013 | UI | High | Planned |
| P3 | FR-09.4 | FEAT-08 | TC-ML-033 | AI | High | Planned |
| P3 | FR-09 midnight | FEAT-08 | TC-ML-034, TC-UNIT-004 | AI/Unit | Medium | Planned |
| P3 | FR-10 | FEAT-09 | TC-ML-040 | AI | Critical | Planned |
| P3 | FR-10.1 | FEAT-09 | TC-ML-041 | AI | Critical | Planned |
| P3 | FR-10.2 | FEAT-09 | TC-ML-042, TC-UNIT-034 | AI/Unit | Critical | Planned |
| P3 | FR-10.3 | FEAT-09 | TC-ML-043, TC-UNIT-032 | AI/Unit | Critical | Planned |
| P3 | FR-10.4 | FEAT-09 | TC-ML-044 | AI | High | Planned |
| P3 | FR-10.5 | FEAT-09 | TC-ML-045, TC-UNIT-027 | AI/Unit | Critical | Planned |
| P3 | FR-10.6 | FEAT-09 | TC-INT-024 | Integration | Critical | Planned |
| P3 | Explanation stability | FEAT-09 | TC-ML-046 | AI | Critical | Planned |
| P3 | FR-17 gates | FEAT-13 | TC-ML-050 | AI | Critical | Planned |
| P3 | Evaluation integrity | — | TC-ML-070, 071, 072 | AI | Critical | Planned |
| P3 | ML contract | — | TC-ML-060…065 | AI | High | Planned |
| P3 | FR-02…FR-02.5 | FEAT-01 | TC-API-001…005, TC-UI-001, 002 | API/UI | Critical | Planned |
| P3 | FR-03…FR-03.6 | FEAT-02 | TC-API-006, 007, TC-UI-003…006 | API/UI | Critical | Planned |
| P3 | FR-03.4, FR-03.5 | FEAT-02 | TC-E2E-001, 002 | E2E | Critical | Planned |
| P3 | NFR-26 | — | TC-INT-013 | Integration | Critical | Planned |
| P3 | NFR-07 | — | TC-INT-020, TC-UX-006 | Integration/UX | Critical | Planned |
| P3 | NFR-22 | — | TC-INT-022 | Integration | Critical | Planned |
| P3 | ML contract | — | TC-INT-025, TC-SEC-018 | Integration/Security | Critical | Planned |
| P3 | FR-20, FR-20.1 | FEAT-15 | TC-SEC-010, 011, 012 | Security | Critical | Planned |
| P3 | FR-02.3 | FEAT-01 | TC-SEC-013 | Security | Critical | Planned |
| P3 | FR-25 | FEAT-15 | TC-UI-082 | UI | Critical | Planned |
| P3 | NFR-15 | — | TC-E2E-050, TC-FAB-001…003 | E2E/Integrity | Critical | Planned |
| P3 | NFR-27, NFR-28 | — | TC-UNIT-030, 031 | Unit | Critical | Planned |
| P3 | NFR-02 | — | TC-PERF-002, TC-ML-064 | Performance | Critical | Planned |

---

## Phase 4 — Money Trail & Geospatial Intelligence

| Phase | Requirement | Feature | Test Case | Type | Priority | Status |
|:--:|---|---|---|---|---|---|
| P4 | FR-05 | FEAT-04 | TC-UI-007 | UI | High | Planned |
| P4 | FR-05.1 | FEAT-04 | TC-UI-008 | UI | Critical | Planned |
| P4 | FR-05.2 | FEAT-04 | TC-UI-009 | UI | High | Planned |
| P4 | FR-05.3…5 | FEAT-04 | TC-UI-010, 011, 012 | UI | High | Planned |
| P4 | FR-05.6 | FEAT-04 | TC-SEC-021 | Security | Critical | Planned |
| P4 | FR-05.7 | FEAT-04 | TC-PERF-004 | Performance | High | Planned |
| P4 | Graph determinism | FEAT-04 | TC-UX-014 | UX | High | Planned |
| P4 | AR-04 | FEAT-04 | TC-A11Y-011 | Accessibility | Critical | Planned |
| P4 | FR-04 | FEAT-03 | TC-API-020 | API | High | Planned |
| P4 | FR-04.1 | FEAT-03 | TC-API-021 | API | Medium | Planned |
| P4 | FR-04.2 | FEAT-03 | TC-API-022 | API | Critical | Planned |
| P4 | FR-04.3 | FEAT-03 | TC-API-023, TC-INT-061, TC-PERF-005 | API/Int/Perf | High | Planned |
| P4 | Traversal safety | FEAT-04 | TC-INT-060, 062, 063 | Integration | Critical | Planned |
| P4 | FR-24, FR-24.1 | FEAT-03 | TC-API-024, TC-UI-020 | API/UI | Medium | Planned |
| P4 | FR-11, FR-11.3 | FEAT-10 | TC-UI-030, 033 | UI | Critical | Planned |
| P4 | FR-11.1 | FEAT-10 | TC-UI-031 | UI | High | Planned |
| P4 | FR-11.2 | FEAT-10 | TC-UI-032, TC-A11Y-009 | UI/A11y | High | Planned |
| P4 | FR-12 | FEAT-10 | TC-UI-034 | UI | High | Planned |
| P4 | FR-12.1 | FEAT-10 | TC-UI-035, TC-API-031 | UI/API | High | Planned |
| P4 | FR-12.3 | FEAT-10 | TC-PERF-003 | Performance | High | Planned |
| P4 | FR-12.4, AR-04 | FEAT-10 | TC-A11Y-010 | Accessibility | Critical | Planned |
| P4 | Tile fallback | FEAT-10 | TC-UI-036, TC-E2E-033 | UI/E2E | Medium | Planned |
| P4 | FR-08.4 | FEAT-07 | TC-API-030 | API | High | Planned |
| P4 | Bbox safety | FEAT-10 | TC-API-032 | API | Medium | Planned |
| P4 | Bundle budgets | — | TC-PERF-014 | Performance | High | Planned |

---

## Phase 5 — Actionable Intelligence

| Phase | Requirement | Feature | Test Case | Type | Priority | Status |
|:--:|---|---|---|---|---|---|
| P5 | FR-13 | FEAT-11 | TC-UI-040 | UI | High | Planned |
| P5 | FR-13.1 | FEAT-11 | TC-UI-041, TC-UX-017 | UI/UX | High | Planned |
| P5 | FR-13.2 | FEAT-11 | TC-UI-042, TC-API-041, TC-UNIT-038 | UI/API/Unit | Critical | Planned |
| P5 | FR-13.3 | FEAT-11 | TC-UNIT-020 | Unit | Critical | Planned |
| P5 | FR-14 | FEAT-11 | TC-API-040 | API | Critical | Planned |
| P5 | FR-14.1 | FEAT-11 | TC-E2E-011 | E2E | Critical | Planned |
| P5 | FR-14.2 | FEAT-11 | TC-UNIT-021, TC-INT-044, TC-API-042 | Unit/Int/API | Critical | Planned |
| P5 | FR-14.3 | FEAT-11 | TC-SEC-030, TC-INT-040 | Security/Int | Critical | Planned |
| P5 | FR-14.4 | FEAT-11 | TC-API-043, TC-INT-043 | API/Int | High | Planned |
| P5 | FR-14.5 | FEAT-11 | TC-SEC-031, TC-INT-045 | Security/Int | High | Planned |
| P5 | FR-12.2 | FEAT-10/11 | TC-E2E-010 | E2E | Critical | Planned |
| P5 | Double submission | FEAT-11 | TC-UX-008 | UX | Critical | Planned |
| P5 | FR-15 | FEAT-12 | TC-API-050 | API | Critical | Planned |
| P5 | FR-15.1 | FEAT-12 | TC-API-051 | API | High | Planned |
| P5 | FR-15.2 | FEAT-12 | TC-INT-050, TC-UNIT-025 | Int/Unit | Critical | Planned |
| P5 | FR-15.3 | FEAT-12 | TC-API-053, TC-INT-053 | API/Int | Medium | Planned |
| P5 | FR-15.4 | FEAT-12 | TC-UI-050, TC-API-054 | UI/API | High | Planned |
| P5 | FR-15.5 | FEAT-12 | TC-SEC-032 | Security | High | Planned |
| P5 | FR-15.6 | FEAT-12 | TC-E2E-012, TC-INT-041 | E2E/Int | High | Planned |
| P5 | Concurrency | FEAT-12 | TC-INT-051, TC-API-052 | Int/API | High | Planned |
| P5 | One per complaint | FEAT-12 | TC-INT-052 | Integration | High | Planned |
| P5 | Backward transitions | FEAT-12 | TC-INT-054, 055 | Integration | Medium | Planned |
| P5 | FR-21 | FEAT-15 | TC-SEC-033 | Security | Critical | Planned |
| P5 | Audit immutability | FEAT-15 | TC-SEC-016 | Security | High | Planned |
| P5 | BANK scoping | FEAT-11 | TC-API-044, 045 | API | Critical | Planned |
| P5 | Supervisor path | FEAT-09/12 | TC-E2E-013 | E2E | High | Planned |
| P5 | Bank round trip | FEAT-11 | TC-E2E-014 | E2E | High | Planned |

---

## Phase 6 — Reporting, QA, Security & Performance

| Phase | Requirement | Feature | Test Case | Type | Priority | Status |
|:--:|---|---|---|---|---|---|
| P6 | FR-16 | FEAT-13 | TC-UI-060, TC-API-060 | UI/API | High | Planned |
| P6 | FR-16.1 | FEAT-13 | TC-API-061 | API | Medium | Planned |
| P6 | FR-16.2 | FEAT-13 | TC-A11Y-020 | Accessibility | High | Planned |
| P6 | FR-17 | FEAT-13 | TC-API-062 | API | Critical | Planned |
| P6 | FR-17.1 | FEAT-13 | TC-UI-061 | UI | Critical | Planned |
| P6 | FR-17.2 | FEAT-13 | TC-INT-011, TC-FAB-007 | Int/Integrity | Critical | Planned |
| P6 | FR-22 | FEAT-15 | TC-API-070, TC-UNIT-023 | API/Unit | High | Planned |
| P6 | FR-22.1 | FEAT-15 | TC-UI-081 | UI | High | Planned |
| P6 | Threshold constraint | FEAT-15 | TC-INT-082 | Integration | High | Planned |
| P6 | Settings audit | FEAT-15 | TC-INT-083 | Integration | High | Planned |
| P6 | NFR-08, NFR-09 | — | TC-A11Y-001…016 | Accessibility | Critical | Planned |
| P6 | AR-02 | — | TC-A11Y-003 | Accessibility | Critical | Planned |
| P6 | All security | — | TC-SEC-001…042 (29) | Security | Critical | Planned |
| P6 | All performance | — | TC-PERF-001…022 (16) | Performance | Critical | Planned |
| P6 | NFR-15 | — | TC-FAB-001…012 | Integrity | Critical | Planned |
| P6 | CR-02 | — | TC-UX-012 | UX | Critical | Planned |
| P6 | CR-03, CR-04 | — | TC-UX-013 | UX | Critical | Planned |
| P6 | Fixed strings | — | TC-UX-011 | UX | Critical | Planned |
| P6 | CR-05 | — | TC-UX-019, TC-A11Y-016 | UX/A11y | Medium | Planned |
| P6 | NFR-06 | — | TC-E2E-030, 031 | E2E | Critical | Planned |
| P6 | NFR-18 | — | TC-E2E-040 | E2E | High | Planned |
| P6 | NFR-29, NFR-30 | — | TC-INT-030, 031 | Integration | High | Planned |
| P6 | NFR-16 | — | TC-UNIT-040 | Unit | High | Planned |

---

## Phase 7 — Demo Mode, Deployment & Production Readiness

| Phase | Requirement | Feature | Test Case | Type | Priority | Status |
|:--:|---|---|---|---|---|---|
| P7 | FR-18 | FEAT-14 | TC-E2E-020 | E2E | Critical | Planned |
| P7 | FR-18.1 | FEAT-14 | TC-E2E-021, TC-UX-009 | E2E/UX | Critical | Planned |
| P7 | FR-18.2 | FEAT-14 | TC-API-090, TC-SEC-042 | API/Security | Critical | Planned |
| P7 | FR-18.3 | FEAT-14 | TC-PERF-007 | Performance | Critical | Planned |
| P7 | FR-19 | FEAT-14 | TC-UI-070 | UI | High | Planned |
| P7 | FR-19.1 | FEAT-14 | TC-E2E-022 | E2E | Critical | Planned |
| P7 | FR-19.2 | FEAT-14 | TC-INT-012, TC-FAB-008 | Int/Integrity | Critical | Planned |
| P7 | FR-19.3 | FEAT-14 | TC-E2E-023 | E2E | Critical | Planned |
| P7 | Corpus safety | FEAT-14 | TC-E2E-024, TC-DATA-002 | E2E/Data | High | Planned |
| P7 | Deployment | — | TC-P7-01, 02, 03 | Integration | Critical | Planned |
| P7 | Security headers | — | TC-SEC-041 | Security | Medium | Planned |
| P7 | ML not public | — | TC-SEC-017 | Security | High | Planned |
| P7 | Artefact integrity | — | TC-SEC-019 | Security | High | Planned |
| P7 | Recovery drills | — | TC-P7-04…07 | Operational | Critical | Planned |
| P7 | Observability | — | TC-P7-08, 09, 10 | Operational | High | Planned |

---

## Phase 8 — Launch, Rehearsal & Post-Launch

| Phase | Requirement | Feature | Test Case | Type | Priority | Status |
|:--:|---|---|---|---|---|---|
| P8 | G-06, BR-02 | FEAT-14 | TC-P8-01 | Manual | Critical | Planned |
| P8 | BR-02 | — | TC-UX-023 | Manual | High | Planned |
| P8 | Reset protocol | FEAT-14 | TC-P8-02 | Manual | High | Planned |
| P8 | Smoke | — | TC-P8-03 | Regression | Critical | Planned |
| P8 | Documentation | — | TC-P8-04 | Inspection | Critical | Planned |
| P8 | FR-22.1 | FEAT-15 | TC-P8-05 | Automated | Critical | Planned |
| P8 | FR-25 | FEAT-15 | TC-P8-06 | Automated | Critical | Planned |
| P8 | Degraded rehearsal | — | TC-P8-07 | Manual | Critical | Planned |
| P8 | Local fallback | CR-06 | TC-P8-08 | Manual | Critical | Planned |

---

## Phase 9 — Scam Shield (FEAT-17)

| Phase | Requirement | Feature | Test Case | Type | Priority | Status |
|:--:|---|---|---|---|---|---|
| P9 | FR-26, FR-26.1 | FEAT-17 | TC-SAFE-001, 002, 030 | Unit/E2E | Critical | Passing |
| P9 | FR-27 | FEAT-17 | TC-SAFE-003, 004, 005, 031 | Unit/E2E | High | Passing |
| P9 | FR-28 | FEAT-17 | TC-SAFE-012, 013, 032, 037 | Int/E2E | Critical | Passing |
| P9 | FR-28.1 | FEAT-17 | TC-SAFE-010, 033 | Int/E2E | Critical | Passing |
| P9 | FR-28.2 | FEAT-17 | TC-SAFE-011 | Integration | Critical | Passing |
| P9 | FR-28.3 | FEAT-17 | TC-SAFE-010, 014 | Integration | Critical | Passing |
| P9 | FR-28.4 | FEAT-17 | TC-SAFE-015 | Integration | High | Passing |
| P9 | FR-29 | FEAT-17 | TC-SAFE-006, 016, 018, 032, 034 | Unit/Int/E2E | Critical | Passing |
| P9 | FR-29.1 | FEAT-17 | TC-SAFE-017 | Integration | Critical | Passing |
| P9 | FR-29.2 | FEAT-17 | TC-SAFE-010 | Integration | Critical | Passing |
| P9 | FR-30 | FEAT-17 | TC-SAFE-007, 035, 038, 040 | Unit/E2E/Static | Critical | Passing |
| P9 | FR-30.1 | FEAT-17 | TC-SAFE-020 | Integration | Critical | Passing |
| P9 | FR-20.4 | FEAT-17 | TC-SAFE-019, 039 | Unit/E2E | Critical | Passing |
| P9 | Personal data | FEAT-17 | TC-SAFE-021 | Integration | Critical | Passing |
| P9 | NFR-08 | FEAT-17 | TC-SAFE-036 | Manual | High | Planned |

---

## Coverage Summary by Phase

| Phase | New cases | Cumulative | Critical | Regression required |
|:--:|:--:|:--:|:--:|---|
| P1 | 12 | 12 | 8 | — |
| P2 | 24 | 36 | 8 | — |
| P3 | 74 | 110 | 41 | P2 data, health, constraints |
| P4 | 32 | 142 | 8 | P3 Critical |
| P5 | 40 | 182 | 15 | P3, P4 Critical |
| P6 | 58 + full execution | 240 | 24 | **Full suite** |
| P7 | 24 | 264 | 14 | Critical tier against production |
| P8 | 9 | 273 | 7 | Smoke ×2, Critical ×1, Full ×1 |

Cumulative distinct case IDs total 273; total executions across catalogues approach 400 once parameterised cases (the 66-cell authorisation matrix, the 8-route accessibility sweep) are expanded.

---

## Traceability Verification

| Check | Result |
|---|---|
| Requirements with ≥ 1 test case | 132 / 132 |
| Test cases with a requirement reference | 273 / 273 |
| Features with ≥ 1 Critical case | 16 / 16 |
| Phases with defined exit criteria | 8 / 8 |
| Phases with regression requirements | 8 / 8 (P1 and P2 marked not applicable with reason) |
| Orphan requirements | 0 |
| Orphan test cases | 0 |

Re-verified in `implementation/documentation-audit.md`.
