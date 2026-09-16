# FABRICATION TESTING — CyberPulse AI

> **On the document name.** The template calls this "hallucination testing", a term that belongs to generative models. CyberPulse AI has no generative model, so hallucination in its strict sense cannot occur. The **failure it names is real here in a different form**: the system displaying a value that no model produced. That is the highest-severity failure mode in the product (DT-1), so this document is written against it rather than marked Not Applicable.

| Field | Value |
|---|---|
| Version | 1.0 |
| Threat | Fabricated intelligence — DT-1 in `security/threat-model.md` |
| Related | `ai/guardrails.md` §4, `test-cases/regression-tests.md` |

---

## 1. What Fabrication Means Here

An officer sees a number and acts on it. Fabrication is any path by which that number was not produced by the model for that specific complaint at that specific time.

| Form | How it happens | Why it is dangerous |
|---|---|---|
| Hard-coded placeholder | A developer stubs a value during UI work and it survives | Looks exactly like a real prediction |
| Stale cached value | A prediction cached and re-served for different inputs | Plausible and internally consistent |
| Optimistic UI | A value rendered before the response arrives | Correct-looking, then silently replaced or not |
| Client-side recomputation | The UI derives a figure instead of rendering the response | Diverges from the record on the smallest formula difference |
| Fallback default on failure | Returning 0.5 or a last-known score when inference fails | The single worst case — failure presented as a finding |
| Hard-coded metrics | Publishing aspirational rather than measured metrics | Misleads about the system's own accuracy |
| Illustrative value in demo mode | Scripting the demo to guarantee a good outcome | Defrauds the evaluator |

Every one of these is a mistake a competent engineer makes under deadline pressure. None is malicious. All are tested for.

---

## 2. Test Suite

### TC-FAB-001 — No hard-coded prediction values in the web application
**Priority:** Critical · **Automated (CI, every commit)**
**Steps:** Run `scripts/evaluation/no_hardcode_check.sh` over `apps/web`, excluding `__tests__`, `*.fixture.ts` and the i18n label map. Search for: hotspot names from the corpus; decimal literals in a risk-score-shaped range assigned to a variable containing `score`, `risk`, `probability` or `confidence`; percentage string literals adjacent to risk vocabulary; hard-coded time windows.
**Expected:** Zero matches. Adding `const riskScore = 0.917` to any component fails CI.

### TC-FAB-002 — Rendered value equals the API response
**Priority:** Critical · **Automated (Playwright)**
**Steps:** Intercept `POST /api/predict`; rewrite the response to `riskScore: 0.312`, `riskLevel: "LOW"` and a different hotspot; render.
**Expected:** The UI shows 31.2%, LOW, and the substituted hotspot. If it shows anything else, a value is coming from somewhere other than the response.
*This is the strongest available test for F-4 and is worth more than any amount of code review.*

### TC-FAB-003 — Response equals the persisted row
**Priority:** Critical · **Automated**
**Steps:** Predict; capture the API response; query `predictions` and `risk_factors` directly.
**Expected:** Every field matches. `ranked_hotspots` jsonb is byte-identical to the response array. Factor contributions match to 3 dp.

### TC-FAB-004 — Degraded mode renders no numbers at all
**Priority:** Critical · **Automated**
**Steps:** Stop the ML service; attempt analysis; extract all text from the prediction region; regex for `\d+(\.\d+)?%`, `₹[\d,]+`, `\d{2}:\d{2}\s*[–-]\s*\d{2}:\d{2}`.
**Expected:** Zero matches for all three patterns. A notice containing "prediction service unavailable" is present.
*The test asserts the absence of number-shaped content, not the absence of specific wrong numbers.*

### TC-FAB-005 — No fallback score on inference failure
**Priority:** Critical · **Automated**
**Steps:** Force in turn: missing artefact; feature schema mismatch; an exception inside `predict_proba`; an 8-second timeout.
**Expected:** Each returns a typed error. No response contains `riskScore`. No row is written to `predictions`. No default such as 0.5 appears anywhere.

### TC-FAB-006 — Predictions are never cached
**Priority:** Critical · **Automated**
**Steps:** Predict for complaint A, then B, then A again with the underlying data modified between calls.
**Expected:** Three distinct inference calls reach the ML service. The second A prediction reflects the modified data. Response headers carry `Cache-Control: no-store`.

### TC-FAB-007 — Metrics come from the database
**Priority:** Critical · **Automated**
**Steps:** Update a value in `model_metrics` directly; reload `/reports`. Then truncate the table and reload.
**Expected:** The updated value is displayed. With the table empty, the panel reads "Model evaluation not yet run" — **not zeros**, which would read as a measured result.

### TC-FAB-008 — Demo mode uses the real prediction path
**Priority:** Critical · **Automated**
**Steps:** Run the demo scenario with network interception; count calls to `/api/predict`; substitute the response as in TC-FAB-002.
**Expected:** Exactly one real prediction call. The displayed values track the substituted response. No demo-only prediction code path exists — confirmed by a static check that the demo route imports the same hook as the complaint detail page.

### TC-FAB-009 — Wireframe placeholder values are absent from shipped code
**Priority:** High · **Automated**
**Steps:** Extract every illustrative figure used in `ux/wireframes.md` (91.7%, 87.2%, 81.4%, 76.9%, 73.1%, ₹2,80,000, "Sector 18, Noida") and search the built production bundle for each.
**Expected:** Zero matches outside test fixtures. *Documentation placeholders are the most common source of shipped fabrication, precisely because they look correct.*

### TC-FAB-010 — Explanation absence is stated, never simulated
**Priority:** Critical · **Automated**
**Steps:** Force a SHAP failure; render the prediction.
**Expected:** The score is shown; the factor region states the explanation could not be generated; no factor bars render; no placeholder factor names appear; `explanationAvailable: false` in the response.

### TC-FAB-011 — No client-side derivation of displayed figures
**Priority:** High · **Automated + review**
**Steps:** Static scan of `components/prediction/**` and `components/alerts/**` for arithmetic on response fields beyond the documented formatting operations (percentage rounding, currency formatting, UTC→IST conversion).
**Expected:** No other arithmetic. Estimated exposure in particular is rendered, never recomputed.

### TC-FAB-012 — Ranked alternatives are model output
**Priority:** High · **Automated**
**Steps:** Substitute a response whose `rankedHotspots` contains four entries in an unusual order; render the alternatives panel.
**Expected:** Exactly those four, in exactly that order. The UI does not re-sort, filter or pad the list.

---

## 3. Continuous Enforcement

| Check | When | Blocks |
|---|---|---|
| TC-FAB-001 hard-code scan | Every commit | Merge |
| TC-FAB-009 wireframe-literal scan | Every build | Merge |
| TC-FAB-002, 003, 004 | Every CI run | Merge |
| TC-FAB-005 … 008, 010 … 012 | Every CI run on main | Promotion |
| Manual review checklist item | Every PR | Merge |

The review checklist in `ux/ui-guidelines.md` §11 opens with "No hard-coded prediction, score, hotspot name or metric value" because it is the item most likely to be violated and least likely to be noticed.

---

## 4. Adjacent Risk — Overstatement

Fabrication's quieter relative: the system does not invent a number, but presents a real one as more than it is.

| Overstatement | Control | Test |
|---|---|---|
| Uncalibrated score shown as a percentage | Isotonic calibration; ECE ≤ 0.10 gate | TC-ML-015 |
| Prototype metrics read as operational | Fixed heading and caption, asserted exactly | TC-UX-011 |
| Confidence conflated with score magnitude | Separate margin-based rule | TC-ML-012 |
| Degraded reasoning presented as normal | `clusteringFallback` and `windowFallback` surfaced | TC-ML-026, TC-ML-033 |
| Top-1 read as "the answer" | Alternatives always visible; error rates published | TC-FAB-012 |
| Synthetic data read as real | Persistent badge and disclaimer on every route | TC-UX-011, TC-UX-012 |

---

## 5. What Cannot Be Tested For

**Whether the model is right.** These tests prove that the displayed value is the model's value. They prove nothing about whether the model's value is correct — that is what `ai/evaluation-framework.md` measures, on synthetic data, with its limits stated in §8 of that document.

The distinction matters and is worth stating plainly: this suite guarantees **integrity**, not **accuracy**. A system with perfect integrity and a poor model is honest and not very useful. A system with a good model and poor integrity is dangerous, because nobody can tell which numbers came from it. Integrity is the property that has to hold first.
