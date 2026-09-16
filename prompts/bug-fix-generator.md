# PROMPT — Bug Fix Generator

Structured prompt for diagnosing and fixing a defect without introducing another.

---

```text
Fix [DEFECT ID / DESCRIPTION] in CyberPulse AI.

Read first: the affected area's .claude/rules/* file, the relevant requirement
and acceptance criteria, and MASTER_TEST_PLAN.md §8 for severity definitions.

Work in this order and do not skip step 2:

1. REPRODUCE
   State the exact steps, the environment, the fixture used, and the observed
   versus expected behaviour. If you cannot reproduce it, say so rather than
   guessing at a fix.

2. WRITE THE FAILING TEST
   A test that fails because of this defect and will pass when it is fixed.
   Assign it a TC ID. This comes before the fix, always.

3. DIAGNOSE
   Root cause, not symptom. State which rule, contract or assumption was violated.
   If the root cause is a missing constraint, the fix includes the constraint.

4. ASSESS BLAST RADIUS
   What else relies on this code path? Which regression trigger in
   test-cases/regression-tests.md §4 applies?

5. FIX
   The minimum change that addresses the root cause. Resist adjacent improvements
   in the same commit.

6. VERIFY
   The new test passes. The regression scope from step 4 passes.

7. CLASSIFY AND RECORD
   Severity per §8. If Critical or High, add the test to the Critical regression
   tier. Update CHANGELOG.md. If security-relevant, update the threat model.
```

---

## Severity guidance specific to this system

| Defect | Severity |
|---|---|
| A displayed value that did not come from the model | **Critical/P0**, however small |
| Authorisation enforced only in the UI | Critical |
| A privileged write without its audit event | Critical |
| A fabricated value on a failure path | Critical |
| A metric hard-coded rather than read from the database | Critical |
| A chart missing its empty state | Medium |
| Spacing off the scale | Low |

The first row is worth restating: a single hard-coded percentage in one component is a P0. The class of failure is what matters, not the size of the instance.

---

## Checks before closing

- [ ] A failing test existed before the fix
- [ ] Root cause addressed, not the symptom
- [ ] Regression scope from the trigger table re-run
- [ ] Verified by someone other than the fixer
- [ ] Severity recorded; Critical/High added to the regression tier
- [ ] `CHANGELOG.md` updated
- [ ] Threat model updated if security-relevant
