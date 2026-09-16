# AI GUARDRAILS — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Scope | Constraints on what the AI layer may output, how it may fail, and what the product may claim about it |
| Note | These are not prompt-level guardrails — there is no LLM. They are schema constraints, code paths and automated checks. |

---

## 1. Why Guardrails Look Different Here

In a generative system, guardrails filter free-form output. In this system the output is a fixed, typed structure, so guardrails take a different and stronger form: **constraints that make an unsafe output unrepresentable**.

A closed enum on factor names means a raw feature identifier cannot reach the UI. A database `CHECK` on window width means an over-wide window cannot be persisted. A schema refinement on factor sums means an inconsistent explanation fails validation on both sides of the wire. None of these depend on anyone remembering a rule.

---

## 2. Output Guardrails

| # | Guardrail | Mechanism | Failure behaviour | Test |
|---|---|---|---|---|
| G-01 | `riskScore` ∈ [0, 1] | Zod + Pydantic bounds | Response rejected by the ML client; 500 to caller | TC-ML-010 |
| G-02 | Risk level derives from score and configured thresholds | Server-side derivation only | Cannot be set by client or model | TC-ML-011 |
| G-03 | Window width ≤ 4 hours | Construction limits to two bins; database `CHECK` | Persist rejected | TC-ML-032 |
| G-04 | Window is never omitted | Fallback to top bin with LOW confidence | Field always present | TC-ML-033 |
| G-05 | ≥ 5 named factors when an explanation is available | `collapse_small` + schema refinement | Response rejected | TC-ML-045 |
| G-06 | Contributions sum to 100 ± 0.5 | Normalisation + schema refinement | Response rejected | TC-ML-043 |
| G-07 | Factor names within the closed enum | Enum in the shared schema | Response rejected | TC-ML-042 |
| G-08 | Ranked hotspots ordered non-increasing | Deterministic sort with `h3Index` tie-break | Response rejected | TC-ML-024 |
| G-09 | Model version reported on every prediction | Required field, literal type | Response rejected | TC-ML-013 |
| G-10 | Feature schema asserted before inference | `assert_schema` | Typed 500, no score produced | TC-UNIT-015 |
| G-11 | Confidence reflects separation, not magnitude | Margin rule | — | TC-ML-012 |
| G-12 | No prediction without persisted factors | Single transaction | Both roll back | TC-INT-013 |

G-05 through G-07 together make a specific class of failure impossible: a prediction that *appears* explained but whose explanation is incomplete, inconsistent or unreadable.

---

## 3. Refusal Guardrails

The system must decline rather than guess. Four situations, each with a defined refusal.

| Situation | Behaviour | Never |
|---|---|---|
| Model artefact missing | `/health` reports `modelLoaded: false`; `/predict` returns 503; UI shows a degraded panel | Return a default or last-known score |
| Feature schema mismatch | Abort with a typed error before inference | Score a misaligned vector |
| SHAP computation fails | Return the prediction with `explanationAvailable: false` and an explicit statement | Describe the prediction as explained |
| No candidate scores above MEDIUM | Return "No high-risk location identified" with the full ranked list | Promote the best of a weak field to HIGH |

The last row is subtle and matters. Returning the top of a uniformly low-scoring field as if it were a finding would technically satisfy every schema constraint while being exactly the wrong thing to show an officer.

---

## 4. Fabrication Guardrails

The highest-severity failure mode in the whole product (DT-1 in `security/threat-model.md`). Five independent controls, because a single one would eventually be bypassed by a well-intentioned shortcut.

| # | Control | Enforcement |
|---|---|---|
| F-1 | No hard-coded prediction, score, hotspot name or metric in `apps/web` | `no_hardcode_check.sh` in CI (TC-INT-010) |
| F-2 | The client receives the persisted row, not the ML response | `predictionService` returns after commit (TC-INT-013) |
| F-3 | Predictions are never cached | No cache entry for prediction endpoints; `no-store` header |
| F-4 | Optimistic UI is forbidden for prediction values | Code review + `ux/ui-guidelines.md` §1 |
| F-5 | Degraded mode renders no numbers at all | TC-UX-006 scans the region for any digit-percent, currency or time-range pattern |
| F-6 | Model metrics read from `model_metrics` | TC-INT-011 |

F-5 is worth describing precisely: the test does not check that the right numbers are absent — it checks that **no numbers of the relevant shapes exist anywhere in the prediction region** when the service is down.

---

## 5. Language Guardrails

| Rule | Enforcement | Test |
|---|---|---|
| Account risk language limited to "Mule Account", "Suspicious Account", "Risk Indicator" | Text scan across all rendered output | TC-UX-013 |
| No accusatory terms — criminal, fraudster, offender, guilty, accused, culprit | Text scan | TC-UX-013 |
| No claim of endorsement, real-data access, guaranteed prevention or recovery | Prohibited-phrase scan | TC-UX-012 |
| Fixed disclosure strings present character-for-character | Exact-match assertion | TC-UX-011 |
| Factor names in officer-readable form | Closed enum | TC-ML-042 |
| Neutrality note on node detail and alert modal | Component-level assertion | TC-UI-011 |

---

## 6. Scope Guardrails

Constraints on what the AI layer is permitted to do at all.

| # | Constraint | Rationale |
|---|---|---|
| S-1 | Predicts locations and time windows only — never a statement about a person | The ethical core of the design (`security/compliance.md` §3) |
| S-2 | No feature encodes identity or a demographic attribute | Makes S-1 structural rather than aspirational |
| S-3 | No autonomous action; every output terminates in a human decision | NG-02; the anti-persona in `product/personas.md` |
| S-4 | No API returns an instruction; all return intelligence | Design rule |
| S-5 | No LLM anywhere in the prediction path | Reproducibility, attributability, offline verifiability |
| S-6 | Explanations expose feature semantics only | Never raw training data or another complaint's values |

S-2 is the guardrail that makes S-1 enforceable. Because the thirteen features are properties of money, network and geography — with no identity input available to the model — the system could not profile an individual even if someone asked it to.

---

## 7. Uncertainty Guardrails

| Rule | Reason |
|---|---|
| Confidence displayed on every prediction | An unqualified score invites over-trust |
| Ranked alternatives always visible | Makes it visible that top-1 is one of several, not "the answer" |
| Published error rates in-app | The user can see how often the model is wrong |
| Window carries its own confidence | Spatial and temporal certainty are different things |
| `clusteringFallback` and `windowFallback` surfaced | Degraded reasoning is disclosed, not hidden |

These are the software half of the automation-bias mitigation (DT-4). The other half is doctrine and training, which software cannot supply — and `security/threat-model.md` §7 says so rather than pretending otherwise.

---

## 8. Deployment Guardrails

| Gate | Blocks |
|---|---|
| `signal_check.py` fails | Training |
| `pii_scan.py` fails | Seeding |
| `evaluate.py` below any metric gate | Release |
| `no_hardcode_check.sh` finds a literal | Merge |
| Dependency audit finds high/critical | Merge |
| Model artefact absent from the image | Container start reports unhealthy |

None of these accepts a skip flag in CI. A gate that can be bypassed under deadline pressure is not a gate.

---

## 9. What Is Deliberately Not Guarded

Honesty about the boundaries of these controls.

| Not guarded | Why | Residual risk |
|---|---|---|
| Whether the model is *right* | Guardrails constrain form, not correctness | Published metrics and confidence are the only honest answer |
| Geographic bias | Untestable on synthetic data | Declared as G-7; the project's most serious open question |
| Adversarial adaptation | Cash-out behaviour would change if such a system were known | Acknowledged in `ai/evaluation-framework.md` §8 |
| An officer over-relying on top-1 | Partially addressed by design | Doctrine and training question |
| Misuse of exported intelligence | Nothing leaves the system in v1.0 | V1's handover-pack export would need its own controls |

A guardrail document that claims to have covered everything is itself a red flag. These five are the gaps, and they are real.
