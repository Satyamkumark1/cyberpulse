# SECURITY TEST CASES — INDEX

| Field | Value |
|---|---|
| Version | 1.0 |
| **Canonical catalogue** | **`security/security-test-cases.md`** — 29 cases, full detail |
| This file | Index, CI wiring, and the mapping from the required abuse-case list to the cases that cover it |

The cases are maintained in one place to prevent two catalogues drifting apart. This document exists so that a reader arriving at `test-cases/` finds the pointer and the coverage argument rather than a duplicate.

---

## 1. Required Abuse Cases → Coverage

The documentation standard requires dedicated cases for eleven abuse categories. Each maps to at least one case in the canonical catalogue.

| Required abuse case | Covered by | Verdict |
|---|---|---|
| Authentication bypass | TC-SEC-010 | **Partially applicable.** There is no authentication to bypass (ADR-019). The case verifies that an unknown role resolves to LEA rather than ADMIN — failing towards least privilege. The absence itself is declared gap G-1. |
| Authorization bypass | TC-SEC-011, TC-SEC-012 | Covered — 66 generated cases across the capability matrix, plus object-scope indistinguishability |
| Injection | TC-SEC-002, TC-SEC-013 | Covered — SQL payloads across every text and path parameter; ordering-clause injection through `sort` |
| XSS | TC-SEC-005 | Covered — stored payloads in notes and alert notes, plus a static scan for `dangerouslySetInnerHTML` |
| CSRF | TC-SEC-006 | Covered — cross-origin form post and credentialed fetch |
| IDOR | TC-SEC-012 | Covered — out-of-scope and non-existent objects return byte-identical 404s with overlapping timing |
| Rate-limit bypass | TC-SEC-031 | Covered — per-endpoint limits, `Retry-After`, and the assertion that a 429 writes nothing |
| Session attacks | — | **Not applicable.** No sessions exist. Recorded rather than omitted; declared gap G-1. |
| Malicious file upload | — | **Not applicable.** No upload surface exists anywhere in the product. |
| Sensitive-data exposure | TC-SEC-003, TC-SEC-004, TC-SEC-020 … 025 | Covered — bundle secrets, error bodies, PII scan, schema introspection, logs, analytics, node payloads |
| Prompt injection | — | **Not applicable.** No LLM exists in any path (`ai/prompt-library.md`). TC-AI-001 and TC-AI-002 assert that this stays true. |

Three categories are genuinely not applicable, and each is recorded with its reason rather than quietly dropped. The fourth — authentication bypass — is partially applicable and is one of this prototype's two accepted risks.

---

## 2. Domain-Specific Abuse Cases

Categories the generic list does not contain, which matter more here than several that it does.

| Abuse case | Covered by |
|---|---|
| Fabricated intelligence reaching a screen | TC-FAB-001 … 012, TC-INT-010 … 013 |
| Client altering the record of what the model said | TC-SEC-014 (server-derived fields rejected, not ignored) |
| Compromised ML service returning crafted predictions | TC-SEC-018 (response schema validation), TC-INT-025 |
| Model artefact swapped after training | TC-SEC-019 |
| Personal data entering the corpus | TC-SEC-020, TC-SEC-022 |
| Accusatory or over-claiming output | TC-UX-012, TC-UX-013 |
| Demo reset used to destroy seed data | TC-SEC-042 |
| Audit record amended or removed | TC-SEC-016 |

---

## 3. CI Wiring

| Stage | Cases run | Blocks |
|---|---|---|
| Static (gate 6) | Dependency audit, secret scan, `no_hardcode_check.sh`, prohibited-phrase scan, terminology scan | Merge |
| Unit | TC-SEC-022 (schema introspection), TC-SEC-024 (analytics shape) | Merge |
| Integration | TC-SEC-001 … 006, 010 … 019, 026, 030 … 033, 042 | Merge |
| E2E | TC-SEC-005 (rendered), TC-SEC-023 (log capture) | Merge |
| Manual | TC-SEC-017 (ML not publicly reachable) | Phase exit |

---

## 4. Counts

| Severity | Cases |
|---|:--:|
| Critical | 18 |
| High | 10 |
| Medium | 1 |
| **Total** | **29** |

Full detail — preconditions, test data, steps, expected results — in `security/security-test-cases.md`.
