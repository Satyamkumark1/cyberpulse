# PROMPT — Test Generator

Generates test cases in the house format, at the correct layer.

---

```text
Write test cases for [BEHAVIOUR / MODULE / REQUIREMENT ID] in CyberPulse AI.

Read first: test-cases/test-case-template.md, TESTING_STRATEGY.md §3 (layer
ownership), .claude/rules/testing.md.

For each case produce:
Test Case ID · Title · Requirement ID · Feature ID · Phase · Priority · Type ·
Preconditions · Test Data · Steps · Expected Result · Severity · Automation

Enumerate across these categories before writing any:
happy path · alternative path · boundary at the exact edge · invalid input ·
missing input · unauthorised · forbidden · service failure · database failure ·
timeout · duplicate request · concurrency where relevant · recovery

Add, where they apply, the two categories specific to this product:
- Displayed-value provenance: substitute the API response, assert the UI follows it
- Persisted-value equality: assert the response equals the database row

Rules:
- One behaviour per case.
- Titles are statements of behaviour, not "verify X works".
- Expected results are observable and objectively checkable.
- Boundaries at exact edges: 0.400 and 0.700, 99999 and 100000 paise, bins 0 and 11.
- Prove absence where absence is the requirement.
- Named fixtures only. C-10284 is read-only.
- No sleeps, no unseeded randomness, no real clock.
```

---

## Checks before accepting

- [ ] Correct layer; no duplication of a behaviour another layer owns
- [ ] Boundaries at exact edges, not midpoints
- [ ] Negative and absence cases present
- [ ] Every case would fail if the behaviour broke — verify by breaking it once
- [ ] IDs assigned per convention and added to the right catalogue
- [ ] `implementation/phase-test-matrix.md` updated
