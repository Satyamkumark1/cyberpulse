# PROMPT LIBRARY — CyberPulse AI

```text
Not Applicable
Reason: CyberPulse AI contains no large language model, no generative model,
and no prompted component anywhere in the product runtime. There are therefore
no production prompts to catalogue, version or test.
```

This file is retained rather than omitted, because "the system has no prompts" is itself an architectural claim that should be recorded, justified and verifiable.

---

## 1. Why There Are No Prompts

The product's output is intelligence an investigating officer may act on. Three properties are non-negotiable for that, and a prompted generative component satisfies none of them well:

| Required property | Tree-ensemble pipeline | Prompted LLM |
|---|---|---|
| Same input → same output | Guaranteed with a fixed artefact | Not guaranteed, even at temperature 0 across versions |
| Reasoning attributable to specific inputs | Exact Shapley values per feature | Post-hoc rationalisation at best |
| Offline verification against a held-out set | Standard supervised evaluation | Expensive, noisy, and not reproducible across model updates |

The decision is recorded as part of ADR-011 and `architecture/integrations.md` §7, and is enforced structurally: there is no API key, no client, and no outbound host for any inference provider in `.env.example` or in the CSP `connect-src` allow-list.

---

## 2. Verification That The Claim Holds

| Check | Method | Test |
|---|---|---|
| No LLM SDK in either workspace dependency tree | Dependency scan for known provider SDK package names | TC-AI-001 |
| No outbound host for an inference provider | CSP `connect-src` inspection plus a scan of `ML_SERVICE_URL` configuration | TC-SEC-041 |
| No prompt-shaped string constants | Source scan for multi-line template literals containing instruction-style language in `apps/ml-service` and `apps/web` | TC-AI-002 |
| ML service performs inference only through the loaded artefacts | Code review plus `/metrics` reporting only artefact-based inference | TC-ML-063 |

`TC-AI-001` and `TC-AI-002` exist specifically so that a future contributor cannot quietly add a generative component without the test suite noticing. That is the practical value of documenting an absence.

---

## 3. The Nearest Equivalent That Does Exist

Two artefacts in this system play the role a prompt library would play elsewhere — they are the places where natural language is fixed, reviewed and version-controlled.

### 3.1 The factor label map

The closed enum that converts raw feature names into officer-readable factor names. This is the only place in the system where a model's internals become human language, and it is treated with the discipline a prompt library would receive: a fixed vocabulary, reviewed changes, and a schema that rejects anything outside it.

| Raw features | Officer-facing label |
|---|---|
| `txn_velocity_1h`, `recency_hours` | Transaction Velocity |
| `historical_hotspot_score` | Historical Hotspot |
| `linked_account_count`, `linked_depth` | Linked Account Pattern |
| `distance_km`, `atm_density` | ATM Proximity |
| `hour_of_day`, `day_of_week` | Time Pattern |
| `txn_amount_total` | Amount / Frequency |
| `account_age_days_min` | Account Age |
| `prior_suspicious_flags`, `withdrawal_count` | Withdrawal History |
| (residual below 2%) | Other factors |

Defined in `apps/ml-service/app/engine/explain.py` as `FACTOR_MAP`, mirrored as a Zod enum in `packages/shared`, and asserted by TC-ML-042.

### 3.2 The fixed UI strings

Seven strings whose exact wording is asserted character-for-character because acceptance criteria depend on them. They are catalogued in `ux/ui-guidelines.md` §2.3 and verified by TC-UX-011.

---

## 4. If A Generative Component Were Ever Added

Recorded so that a future decision inherits the constraints rather than rediscovering them.

Any proposal to add an LLM — for example, to parse free-text complaint narratives into structured fields — would require, before merge:

1. An ADR stating why the non-deterministic component is acceptable in that specific position.
2. Placement **outside the prediction path**. Parsing input is a defensible position; producing, ranking or explaining a prediction is not.
3. A versioned prompt in this file, with its model, parameters and expected output schema.
4. Structured output enforced by schema validation, with a typed failure rather than a best-effort parse.
5. Prompt-injection test cases, which are currently Not Applicable and would become mandatory (`security/threat-model.md` §3 would gain a row).
6. A golden-set evaluation with a pass threshold, run in CI.
7. A deterministic fallback path, so that the feature degrades to the current behaviour rather than to nothing.
8. An entry in `ai/cost-optimization.md`, which currently has no variable-cost component to manage.

Point 2 is the load-bearing one. The reason this system can publish exact explanations and reproducible metrics is that nothing between the complaint and the alert is generative.
