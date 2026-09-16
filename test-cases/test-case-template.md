# TEST CASE TEMPLATE — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Use | Every test case in every catalogue uses this structure |

---

## Template

```text
Test Case ID:        TC-<AREA>-<NNN>
Title:               <Behaviour being verified, as a statement>
Requirement ID:      FR-xx / NFR-xx / CR-xx
Feature ID:          FEAT-xx
Phase:               P1 … P8
Priority:            Critical | High | Medium | Low
Type:                Unit | Integration | API | UI | E2E | Security | Performance |
                     Accessibility | AI | Data | Regression
Preconditions:       <State that must hold before step 1>
Test Data:           <Named fixtures and specific values>
Steps:
  1. <Action>
  2. <Action>
  3. <Action>
Expected Result:     <Observable, objectively checkable outcome>
Actual Result:       <Filled at execution>
Status:              Not run | Pass | Fail | Blocked
Severity:            <Severity if this case fails>
Automation Candidate: Automated | Manual | Hybrid
```

---

## ID Convention

| Prefix | Area | Catalogue |
|---|---|---|
| `TC-UNIT-` | TypeScript unit | `test-cases/unit-tests.md` |
| `TC-DATA-` | Data generation pipeline | `test-cases/unit-tests.md` |
| `TC-INT-` | Integration and integrity | `test-cases/integration-tests.md` |
| `TC-API-` | API contract | `test-cases/api-tests.md` |
| `TC-UI-` | Component and UI | `test-cases/frontend-tests.md` |
| `TC-E2E-` | End-to-end journeys | `test-cases/e2e-tests.md` |
| `TC-UX-` | UX, flow and copy | `ux/ux-test-cases.md` |
| `TC-SEC-` | Security | `security/security-test-cases.md` |
| `TC-PERF-` | Performance | `test-cases/performance-tests.md` |
| `TC-A11Y-` | Accessibility | `test-cases/accessibility-tests.md` |
| `TC-ML-` | Model and AI | `ai/ai-test-cases.md` |
| `TC-FAB-` | Fabrication / integrity | `ai/hallucination-testing.md` |
| `TC-DOC-` | Documentation and setup | `implementation/documentation-audit.md` |

IDs are permanent. A deleted case's ID is never reused, so a reference in a commit message or a defect report always resolves.

---

## Worked Example

```text
Test Case ID:        TC-API-005
Title:               Page size above the maximum is rejected with a named field
Requirement ID:      FR-02.4, NFR-10
Feature ID:          FEAT-01
Phase:               P3
Priority:            High
Type:                API
Preconditions:       Database migrated and seeded with corpus 26184.
                     Active role LEA.
Test Data:           GET /api/complaints?pageSize=500
Steps:
  1. Issue GET /api/complaints?pageSize=500 with header x-cyberpulse-role: LEA
  2. Read the response status
  3. Parse the response body
  4. Search the body for a stack frame, a SQL keyword or a file path
Expected Result:     Status is 400.
                     Body is { "error": { "code": "VALIDATION_ERROR",
                     "field": "pageSize", "message": "...", "requestId": "..." } }.
                     No stack frame, SQL keyword or file path is present.
                     A request with pageSize=100 returns 200 with 100 rows.
Actual Result:       —
Status:              Not run
Severity:            High
Automation Candidate: Automated
```

---

## Writing Rules

**Expected results are observable.** "The complaint list works" is not a result. "Exactly 25 rows render and the body includes `page`, `pageSize`, `total` and `totalPages`" is.

**Steps are executable by someone who has not read the code.** A step that says "trigger the error condition" is incomplete; say how.

**One behaviour per case.** A case asserting five unrelated things reports one failure for five causes.

**Include the negative.** For anything with a boundary, the case states both the accepted and the rejected value. For anything that should not appear, the case asserts its absence.

**Name the fixture.** "A complaint" is ambiguous; `C-10284` is not.

**Severity is the severity if this case fails**, not the importance of the feature. A cosmetic defect in a critical feature is still a cosmetic defect.

---

## Prohibited Phrasings

| Do not write | Write instead |
|---|---|
| "Verify the feature works" | The specific observable outcome |
| "Check performance is acceptable" | "p95 ≤ 300 ms over 100 requests" |
| "Ensure the UI looks correct" | The specific elements, text and attributes present |
| "Test error handling" | The specific error injected and the specific response expected |
| "Should not crash" | The specific status, body and state expected |
| "Reasonable results" | The specific range or set |

---

## Coverage Expectations Per Feature

A feature is not adequately covered until it has cases for: the happy path; an alternative path; boundary conditions; invalid input; missing input; unauthorised access; forbidden access; a service failure; a database failure; a timeout; a duplicate request; concurrency where relevant; recovery behaviour; and at least one security abuse case.

Two additional categories apply to this product specifically, and are the ones most often missed:

- **Displayed-value provenance** — a case asserting that a rendered figure comes from the API response, verified by substituting the response and observing the UI follow it.
- **Persisted-value equality** — a case asserting that the response returned to the client equals the row written to the database.
