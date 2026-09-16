# PROMPT — Feature Generator

Generates a complete 14-section feature specification consistent with the rest of this blueprint.

---

```text
Write the specification for [FEATURE NAME] in CyberPulse AI.

Context to read first:
- FEATURE_SPECIFICATIONS.md (for the house format and neighbouring features)
- REQUIREMENTS.md (for the FR/NFR IDs this feature realises)
- product/personas.md (for whose problem this solves)
- architecture/api-design.md and database-design.md (for existing contracts)

Produce exactly these sections:
Feature ID · Name · Description · User problem · Business value · User flow ·
UI behaviour · API behaviour · Database requirements · Edge cases ·
Failure scenarios · Permissions · Security requirements · Analytics events ·
Acceptance criteria · Test cases

Rules:
- The user problem is stated from the persona's position, not the system's.
- Edge cases include the empty case, the single case, the maximum case and
  the concurrent case.
- Failure scenarios state what the user sees, not only what the system does.
- Permissions are given per role (LEA / BANK / ADMIN) with scoping noted.
- Every analytics event names the metric it serves.
- Acceptance criteria reference AC IDs; test cases reference TC IDs.
- If the feature displays a model-derived value, include an acceptance criterion
  asserting it comes from the API response.
```

---

## Checks before accepting the output

- [ ] Every FR it claims is real and listed in `REQUIREMENTS.md`
- [ ] Every AC and TC ID either exists or is added in the same change
- [ ] Failure scenarios include the ML-unavailable case if prediction is involved
- [ ] Permissions cover all three roles
- [ ] Edge cases include concurrency where two users could act at once
- [ ] No new terminology outside the lexicon
- [ ] If it displays a number, provenance is an acceptance criterion
