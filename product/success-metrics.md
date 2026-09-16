# SUCCESS METRICS — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Framing | **All figures are prototype and demonstration measurements on synthetic data.** None represents operational performance of a deployed system. |
| Related | `PRD.md` Part E, `product/product-analytics.md`, `ai/evaluation-framework.md` |

---

## 1. North Star

**Actionable Forecast Rate (AFR)** — the proportion of analysed complaints that yield an intelligence unit an officer could act on.

A forecast counts as actionable when all three hold:
1. `riskLevel` is HIGH or MEDIUM;
2. the expected window is bounded and ≤ 4 hours;
3. at least five named factors are returned with contributions summing to 100 ± 0.5.

```
AFR = actionable_predictions / total_successful_predictions
```

**Target: ≥ 0.90 across the synthetic corpus.**

**Why this metric.** It measures the product's output rather than its usage. A dashboard can be opened frequently and produce nothing; AFR cannot be gamed by engagement. It is also decomposable — a drop is attributable to the model (condition 1), the temporal component (condition 2) or the explainability layer (condition 3).

**Counter-metric.** AFR must be read alongside **Top-3 hotspot hit rate**. Loosening thresholds would inflate AFR while degrading precision, so a release is invalid if AFR rises while top-3 hit rate falls.

---

## 2. Metric Tree

```
                    Actionable Forecast Rate
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   Model quality        Temporal quality      Explanation quality
        │                     │                     │
   ROC-AUC ≥ 0.85      window ≤ 4h, ±1 bin    ≥5 factors, Σ=100±0.5
   Top-3 ≥ 0.72         ≥ 0.75                 100% coverage
        │                     │                     │
        └─────────────────────┴─────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            Delivery quality      Trust signals
            p95 ≤ 1.5 s           explanation open ≥ 80%
            0 unhandled errors    graph open ≥ 70%
                                  alert conversion ≥ 40%
```

---

## 3. Metric Definitions

### 3.1 Product metrics

| ID | Metric | Definition | Target | Source event |
|---|---|---|---|---|
| M-01 | Actionable Forecast Rate | See §1 | ≥ 0.90 | `prediction_returned` |
| M-02 | Complaints analysed | Distinct complaints with ≥ 1 successful prediction | ≥ 50 in rehearsal | `prediction_returned` |
| M-03 | Explanation open rate | Predictions whose factor panel is expanded | ≥ 0.80 | `explanation_expanded` |
| M-04 | Graph open rate | Predictions followed by a graph render | ≥ 0.70 | `graph_rendered` |
| M-05 | Map drill-downs per session | Hotspot markers clicked | ≥ 3 | `hotspot_marker_clicked` |
| M-06 | HIGH-risk alert conversion | HIGH predictions producing a dispatched alert | ≥ 0.40 | `alert_sent` |
| M-07 | Alert→investigation conversion | Alerts producing an investigation record | 1.00 | `investigation_created` |
| M-08 | Alert acknowledgement rate | Alerts acknowledged within the session | ≥ 0.60 | `alert_acknowledged` |
| M-09 | Demo completion rate | `/demo` runs reaching the alert step | 1.00 | `demo_completed` |
| M-10 | Role coverage | Distinct roles exercised in rehearsal | 3 of 3 | `role_switched` |

### 3.2 Model metrics

Measured on a held-out split; methodology in `ai/evaluation-framework.md`; published in-app as **PROTOTYPE MODEL EVALUATION**.

| ID | Metric | Gate |
|---|---|---|
| M-20 | ROC-AUC (risk classifier) | ≥ 0.850 |
| M-21 | Precision @ operating threshold | ≥ 0.750 |
| M-22 | Recall @ operating threshold | ≥ 0.700 |
| M-23 | F1 @ operating threshold | ≥ 0.720 |
| M-24 | Top-1 hotspot hit rate | ≥ 0.450 |
| M-25 | Top-3 hotspot hit rate | ≥ 0.720 |
| M-26 | Top-5 hotspot hit rate | ≥ 0.850 |
| M-27 | Temporal bin exact match | ≥ 0.400 |
| M-28 | Temporal bin within ±1 | ≥ 0.750 |
| M-29 | Explanation completeness | 1.000 |
| M-30 | Calibration error (ECE, 10 bins) | ≤ 0.10 |

M-30 is included because a risk score that is not calibrated cannot honestly be presented as a probability, and the UI presents it as a percentage.

### 3.3 Delivery metrics

| ID | Metric | Target | Method |
|---|---|---|---|
| M-40 | Read API latency p95 | ≤ 300 ms | k6, TC-PERF-001 |
| M-41 | Prediction latency p95 (warm) | ≤ 1500 ms | k6, TC-PERF-002 |
| M-42 | Dashboard LCP | ≤ 2.5 s | Lighthouse, TC-PERF-010 |
| M-43 | Map interactive, all layers | ≤ 1.5 s | Playwright timing, TC-PERF-003 |
| M-44 | Graph render at 200 nodes | ≤ 800 ms | Playwright timing, TC-PERF-004 |
| M-45 | Unhandled errors on core routes | 0 | TC-E2E-030 |
| M-46 | Clean-clone to first prediction | ≤ 30 min | Timed run, TC-DOC-001 |

### 3.4 Security metrics

| ID | Metric | Target |
|---|---|---|
| M-60 | Endpoints without input validation | 0 |
| M-61 | High/critical dependency vulnerabilities at release | 0 |
| M-62 | Secrets detected by repository scan | 0 |
| M-63 | Privileged actions lacking an audit event | 0 |
| M-64 | Error responses disclosing internal detail | 0 |
| M-65 | Prohibited-claim phrases in UI text | 0 |

### 3.5 Documentation metrics

| ID | Metric | Target |
|---|---|---|
| M-80 | Requirements without a test case | 0 |
| M-81 | Test cases without a requirement | 0 |
| M-82 | Features without acceptance criteria | 0 |
| M-83 | Phases without exit criteria | 0 |
| M-84 | Contradictions found in the audit | 0 |

---

## 4. Measurement Plan

| Metric class | Cadence | Instrument | Recorded in |
|---|---|---|---|
| Product | Per rehearsal session | Event log | `product/product-analytics.md` |
| Model | Every training run | `training/evaluate.py` | `model_metrics` table + `CHANGELOG.md` |
| Delivery | Every CI run on main | k6 + Lighthouse + Playwright | CI artefacts |
| Security | Every PR | CI gates | CI artefacts |
| Documentation | Phase exits | `implementation/documentation-audit.md` | Audit document |

---

## 5. Leading vs Lagging

| Leading (predicts success) | Lagging (confirms it) |
|---|---|
| Explanation open rate (M-03) | Alert conversion (M-06) |
| Graph open rate (M-04) | Investigation completion |
| Prediction latency (M-41) | Complaints analysed (M-02) |
| Calibration error (M-30) | Top-3 hit rate (M-25) |

If M-03 and M-04 are high while M-06 is low, officers are examining predictions and declining to act — indicating a credibility problem rather than a usability problem. That distinction is the reason both leading indicators are tracked separately.

---

## 6. What Is Deliberately Not Measured

| Not measured | Reason |
|---|---|
| Time on page / session duration | Longer sessions indicate friction, not value, in an operational tool |
| Click counts as engagement | Fewer clicks to intelligence is the goal |
| Number of alerts generated as a success metric | Would incentivise over-alerting, which has real field cost |
| Any per-officer productivity ranking | Would create incentives that damage case quality and is outside the product's purpose |

---

## 7. Metric Integrity Rules

1. Every metric names at least one emitting event in `product/product-analytics.md`. No metric may be defined without a source.
2. Model metrics are read from `model_metrics`, written by the evaluation pipeline. Hard-coding any metric value in application code is a release blocker (M-84 / TC-INT-011).
3. Published metrics always carry the synthetic-data caption (AC-013-04).
4. A metric that moves because a threshold changed is reported as a threshold change, not as an improvement.
5. AFR is never reported without its counter-metric, top-3 hit rate.
