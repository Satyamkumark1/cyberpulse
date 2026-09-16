# /security-review

## Purpose
Assess a change, or the system, against the threat model — including the domain-specific threats that generic security review misses.

## Inputs
- A diff, a component, or `full` for a system-wide pass

## Required reading
1. `security/threat-model.md` → STRIDE per boundary plus DT-1…DT-5
2. `security/authorization.md` → the capability matrix and scope rules
3. `security/security-checklist.md` → per-PR and pre-release lists
4. `security/security-test-cases.md` → what is already covered

## Execution

### 1. Generic surface
Input validation · injection (including the `sort` allow-list) · XSS · CSRF · IDOR · rate limits · secrets · error disclosure · dependency advisories.

### 2. Domain-specific — the ones that matter more here
| Threat | Check |
|---|---|
| **DT-1 Fabricated intelligence** | Any path by which a displayed value could originate outside the model: placeholders, caching, optimistic UI, client recomputation, fallback defaults |
| **DT-2 Misrepresentation** | Any new copy claiming endorsement, real-data access, guarantees |
| **DT-3 Accusatory output** | Any new text characterising a person; any new field that could hold a name |
| **DT-4 Automation bias** | Does the change reduce visible uncertainty — hide confidence, hide alternatives, hide error rates? |
| **DT-5 Demonstration failure** | Does the change add a new way for the demo to fail silently? |

DT-1 and DT-3 are the two most likely to be introduced by a well-meaning change and least likely to be caught by a generic review.

### 3. Boundary integrity
- Does the ML service still hold no database credentials?
- Is the ML response still validated on arrival?
- Are audit writes still transactional by signature?
- Is `total` still computed after the scope predicate?

### 4. Declared gaps
Has anything been added to, removed from, or contradicted in the three gap lists? They must remain identical.

## Validation
- [ ] Every new endpoint validated, authorised, rate limited
- [ ] Every new privileged action audited inside its transaction
- [ ] No new personal-data column or name field
- [ ] No new prohibited phrase or accusatory term
- [ ] No new path to a fabricated value
- [ ] New threats added to `security/threat-model.md` with a control and a test
- [ ] Declared gaps still consistent across three documents

## Test requirements
A security fix is written **test-first**. A fix without a reproducing test regresses, and regressions in this category are the ones nobody notices.

## Expected output
Findings by severity with the threat ID each relates to; the specific control required; the test case that must be added; and whether the change may merge.
