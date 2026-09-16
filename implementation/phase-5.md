# PHASE 5 — ACTIONABLE INTELLIGENCE: ALERTS & INVESTIGATIONS

| Field | Value |
|---|---|
| Duration | 12 person-days · Week 3, days 4–6 |
| Output | The step that turns analysis into action: dispatched alerts and tracked cases |
| Entry | Phase 4 exited — predictions render and are auditable |
| Features | FEAT-11, FEAT-12 |

---

## 1. Objectives

1. Build alert composition, dispatch, persistence and propagation — with every derived value computed server-side.
2. Make the alert transaction atomic across three writes, so an unaudited dispatch cannot exist.
3. Implement the investigation lifecycle with a validated state machine and optimistic concurrency.
4. Close the loop: dispatch advances the case; acknowledgement is visible to the originator.
5. Write audit events for every privileged action, inside the transaction that performs it.

---

## 2. Deliverables

| Deliverable | Acceptance |
|---|---|
| `AlertModal` | Read-only intelligence block; recipients and notes the only inputs |
| `POST /api/alerts` | Server-derived severity and exposure; client-supplied values rejected with 400 |
| Alert transaction | `alerts` + `audit_events` + investigation upsert, atomic |
| `GET /api/alerts`, `/:id` | Scoped for BANK |
| `PATCH /api/alerts/:id` | Idempotent acknowledgement |
| `/alerts`, `/alerts/[id]` | List with severity and status filters; detail with the source prediction |
| Dashboard recent-alerts panel | Live, links through |
| Investigation state machine | Six states; invalid transitions → 409 |
| `POST/PATCH /api/investigations` | Optimistic concurrency via `expectedUpdatedAt` |
| `POST /api/investigations/:id/notes` | Author role, UTC timestamp, non-empty enforced |
| `/investigations`, `/investigations/[id]` | Consolidated case surface |
| `auditService.record` | Transaction handle required by signature |
| Exposure formula | One implementation, unit-tested |
| Severity derivation | One implementation, no client override |

---

## 3. Implementation Tasks

| # | Task | Owner | Days |
|---|---|---|---|
| T-5.1 | `services/lib/exposure.ts` with the documented formula | Backend | 0.5 |
| T-5.2 | `services/lib/severity.ts` derivation | Backend | 0.25 |
| T-5.3 | `auditService.record` requiring a transaction handle | Backend | 0.5 |
| T-5.4 | `alertService.create` — three writes, one transaction | Backend | 1.25 |
| T-5.5 | Alert endpoints with rejection of derived fields | Backend | 0.75 |
| T-5.6 | Acknowledgement, idempotent | Backend | 0.5 |
| T-5.7 | `AlertModal` with read-only intelligence and recipient validation | Frontend | 1.5 |
| T-5.8 | Generate Alert entry points from prediction panel and hotspot drawer | Frontend | 0.5 |
| T-5.9 | `/alerts` list and detail | Frontend | 1.0 |
| T-5.10 | Dashboard recent-alerts panel with query invalidation | Frontend | 0.5 |
| T-5.11 | State machine and transition validation | Backend | 1.0 |
| T-5.12 | `investigationService` with optimistic concurrency | Backend | 1.0 |
| T-5.13 | `upsertForAlert` — create or advance | Backend | 0.5 |
| T-5.14 | Notes with author role and non-empty enforcement | Backend | 0.5 |
| T-5.15 | `/investigations` list | Frontend | 0.75 |
| T-5.16 | `/investigations/[id]` consolidated surface with embedded graph | Frontend | 1.5 |
| T-5.17 | Timeline with notes and audit-derived entries | Frontend | 0.75 |
| T-5.18 | Rate limiting on alert creation | Backend | 0.25 |

---

## 4. Dependencies

**Inbound:** P3 predictions (an alert needs something to alert on); P4 hotspot drawer (one of two entry points).
**Outbound:** P6 reports aggregate over alerts; P7's demo terminates in a dispatch.

---

## 5. Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **An alert dispatches without its audit event** | Medium | **Critical** | `auditService.record` has no non-transactional signature; TC-SEC-030 injects a failure at each of the three writes |
| Client alters severity or exposure | Medium | **Critical** | Derived fields are **rejected with 400**, not ignored |
| State machine churn mid-phase | Medium | Medium | Frozen in P1; changes require a decision-log entry |
| Concurrent status updates corrupt state | Medium | High | Optimistic concurrency via `expectedUpdatedAt`; loser receives 409 |
| Duplicate investigations for one complaint | Low | Medium | Unique constraint is the backstop; 409 surfaced meaningfully |
| Alert propagation missed on one surface | Medium | Medium | TC-E2E-011 asserts all three within one refresh cycle |
| Double submission creates two alerts | Medium | High | Button disabled in flight; TC-UX-008 clicks three times in 200 ms |

---

## 6. Acceptance Criteria

**AC-P5-01** — The modal opens pre-filled from the prediction, titled exactly "HIGH-RISK WITHDRAWAL ALERT", with no editable score field (AC-011-01).
**AC-P5-02** — Estimated exposure equals the documented formula and is read-only (AC-011-02).
**AC-P5-03** — With zero recipients, Send is disabled **and** a validation message is shown; the API returns 400 (AC-011-03).
**AC-P5-04** — Dispatch returns 201, persists with `status = SENT`, and shows a success toast (AC-011-04).
**AC-P5-05** — The alert appears on the dashboard, `/alerts` and the investigation timeline within one refresh cycle (AC-011-05).
**AC-P5-06** — Acknowledgement is idempotent; `acknowledged_at` is unchanged on repeat (AC-011-06).
**AC-P5-07** — One audit event per dispatch and per acknowledgement, with role, subject and timestamp (AC-011-07).
**AC-P5-08** — The 11th alert in a minute returns 429 with `Retry-After` and writes nothing (AC-011-08).
**AC-P5-09** — All three writes commit together or none do.
**AC-P5-10** — Client-supplied `severity`, `exposurePaise`, `locationName` or window bounds return 400.
**AC-P5-11** — Invalid transitions return 409 with the status unchanged (AC-012-02).
**AC-P5-12** — Backward transitions are limited to one step and require a note.
**AC-P5-13** — `RESOLVED` requires a closure note.
**AC-P5-14** — Concurrent updates produce one 200 and one 409.
**AC-P5-15** — Dispatch creates or advances the investigation to `Alert Sent` (AC-012-06).
**AC-P5-16** — The investigation route shows complaint, graph, hotspot, factors and alerts together (AC-012-05).
**AC-P5-17** — BANK may acknowledge and add scoped notes but receives 403 on create and transition.
**AC-P5-18** — Triple-clicking Send issues exactly one request and creates exactly one alert.

---

## 7. Test Strategy

This phase introduces the system's only multi-table write and its only state machine. Testing concentrates on **atomicity under injected failure**, **transition validity**, **concurrency** and **server-side derivation**. Each is tested by breaking it deliberately rather than by confirming the happy path.

---

## 8. Phase 5 Test Cases

### Alert creation and atomicity
TC-INT-040 failure injected at each of three writes · TC-INT-044 derived fields rejected · TC-INT-045 rate limit writes nothing · TC-SEC-030 audit atomicity · TC-API-040 create contract · TC-API-041 empty recipients · TC-API-042 derived fields · TC-UNIT-020 exposure formula · TC-UNIT-021 severity derivation

### Alert lifecycle
TC-API-043 idempotent acknowledgement · TC-API-044 BANK scoping · TC-API-045 out-of-scope detail → 404 · TC-INT-042 concurrent alerts on one prediction · TC-INT-043 acknowledgement idempotency

### Investigations
TC-API-050 create is LEA/ADMIN only · TC-API-051 transition validation · TC-API-052 optimistic concurrency · TC-API-053 notes · TC-API-054 consolidated detail · TC-INT-050 invalid transitions leave state unchanged · TC-INT-051 concurrency · TC-INT-052 one per complaint · TC-INT-053 empty note rejected at both layers · TC-INT-054 resolve requires a note · TC-INT-055 backward limited to one step · TC-UNIT-025 transition validity

### UI
TC-UI-040 modal pre-filled · TC-UI-041 intelligence fields are text, not inputs · TC-UI-042 recipient validation visible · TC-UI-050 consolidated case surface · TC-UX-008 double submission impossible · TC-UX-017 no inputs in the intelligence block

### Security
TC-SEC-011 capability matrix including the new actions · TC-SEC-031 rate limit · TC-SEC-032 transition audited · TC-SEC-033 complete audit coverage · TC-SEC-016 audit records not amendable

### E2E
TC-E2E-010 alert from the drawer · TC-E2E-011 propagation to three surfaces · TC-E2E-012 dispatch advances the case · TC-E2E-013 supervisor review path · TC-E2E-014 bank acknowledgement round trip · TC-E2E-032 rate-limit experience

**Total: 40 cases.**

---

## 9. Regression Tests

| From | Re-run | Why |
|---|---|---|
| P4 | TC-UI-007 … 012, TC-UI-030 … 036 | The embedded graph in the investigation view must still render |
| P4 | TC-PERF-003, TC-PERF-004 | Embedding the graph must not breach its budget |
| P3 | All Critical model and integrity cases | Alerts must not alter prediction behaviour |
| P3 | TC-INT-013 | Response still equals the persisted row |
| P2 | TC-P2-02 | New constraints (recipients array length) enforced |
| Cross | TC-UX-011, TC-UX-012, TC-UX-013 | New alert copy: fixed strings exact, no prohibited claims, lexicon respected |

---

## 10. Security Validation

| Check | Case |
|---|---|
| Dispatch and audit are atomic | TC-SEC-030 |
| Every privileged action audited | TC-SEC-033 |
| Audit records not amendable through the application | TC-SEC-016 |
| Severity and exposure not settable by a client | TC-INT-044 |
| BANK cannot create alerts or transition cases | TC-SEC-011 |
| BANK sees only alerts addressed to it | TC-API-044 |
| Out-of-scope alert detail indistinguishable from absent | TC-API-045 |
| Alert creation rate limited | TC-SEC-031 |
| Note content escaped on output | TC-SEC-005 |

---

## 11. Performance Validation

| Check | Target | Case |
|---|---|---|
| Alert creation transaction p95 | ≤ 300 ms | TC-PERF-001 |
| Alerts list p95 | ≤ 300 ms | TC-PERF-001 |
| Investigation detail (graph + prediction + alerts) p95 | ≤ 600 ms | TC-PERF-001 |
| Embedded graph render | ≤ 800 ms | TC-PERF-004 |
| Propagation to three surfaces | ≤ 1 refresh cycle | TC-E2E-011 |

---

## 12. Exit Criteria

- [ ] AC-P5-01 … AC-P5-18 pass
- [ ] All 40 phase test cases pass
- [ ] **TC-SEC-030 passes for all three injection points** — no partial dispatch is possible
- [ ] P3 and P4 Critical regression green
- [ ] Every privileged action has an audit event
- [ ] BANK scoping verified against the API directly, not through the UI
- [ ] Zero unresolved Critical or High defects
- [ ] `CHANGELOG.md` updated

### The demonstrable gate

The five-interaction critical path completes end to end: open a complaint, analyse it, generate an alert, select recipients, send. The alert appears on three surfaces, the investigation advances to `Alert Sent`, an audit event records who did it, and a BANK-role user can acknowledge it. The product now ends in an action rather than a number.
