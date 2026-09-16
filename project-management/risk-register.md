# RISK REGISTER — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Scale | Probability and Impact 1–5; Severity = P × I |
| Review | At every phase exit, and whenever a risk materialises |

---

## Severity Bands

| Score | Band | Treatment |
|---|---|---|
| 20–25 | Critical | Mitigate now; a named owner; blocks the phase |
| 12–19 | High | Mitigate in the current phase |
| 6–11 | Medium | Mitigate or accept with a recorded reason |
| 1–5 | Low | Monitor |

---

## Register

### RSK-01 — Synthetic data contains no learnable signal
**Category** Technical/Data · **P** 3 · **I** 5 · **Severity 15 (High)** · **Owner** ML engineer
**Description.** The generator produces statistically random data, so the model performs at chance and the entire product premise collapses.
**Mitigation.** `signal_check.py` is written *before* the patterns are planted, so the check drives the generator rather than rationalising it. Eight statistical tests, non-bypassable, gate training.
**Contingency.** Strengthen the planted patterns and regenerate. The generator is parameterised, so this is hours rather than days.
**Detection.** `signal_check.py` exit code; the logistic-regression baseline in `evaluate.py`.
**Status.** Mitigated in P2.

### RSK-02 — ML service cold start stalls a live demonstration
**Category** Infrastructure · **P** 4 · **I** 5 · **Severity 20 (Critical)** · **Owner** DevOps
**Description.** Free-tier spin-down after ~15 minutes produces a 5–20 second first request, in front of an evaluator.
**Mitigation.** Five layers: keep-warm job every 15 minutes, uptime probe every 60 seconds, warm-up ping on app load and `/demo` mount, health reporting `degraded` rather than `down` while warming, T−30 rehearsal run.
**Contingency.** Local Docker stack on the presenting laptop. An always-on instance at ~₹600/month removes the risk entirely.
**Detection.** `/api/health` latency; the health tab held open during evaluation.
**Status.** Mitigated; residual accepted. **This is the highest-severity operational risk in the project.**

### RSK-03 — UI displays a value the model did not produce
**Category** Technical/Integrity · **P** 3 · **I** 5 · **Severity 15 (High)** · **Owner** QA
**Description.** A placeholder, a cached value, an optimistic render or a fallback default reaches a screen and is indistinguishable from a real prediction.
**Mitigation.** Six independent controls: `no_hardcode_check.sh` in CI, response-equals-persisted-row, no prediction caching, optimistic UI forbidden, numberless degraded mode, metrics read from the database. Twenty-four integrity test cases.
**Contingency.** Immediate rollback; the trigger is explicit in `devops/deployment-checklist.md` §5.
**Detection.** TC-FAB-001…012; TC-E2E-050 substitutes the response and asserts the UI follows.
**Status.** Mitigated from P3 onward.

### RSK-04 — Map or graph performance degrades with all layers enabled
**Category** Technical/Performance · **P** 3 · **I** 3 · **Severity 9 (Medium)** · **Owner** Frontend
**Mitigation.** Bbox-scoped ATM queries, marker clustering, KDE pre-aggregated server-side, dynamic imports, deterministic memoised graph layout, node cap with truncation notice.
**Contingency.** Reduce default layer set; increase clustering threshold.
**Detection.** TC-PERF-003, TC-PERF-004 on the preview environment.
**Status.** Mitigated in P4.

### RSK-05 — Scope creep into secondary surfaces before the core works
**Category** Delivery · **P** 4 · **I** 4 · **Severity 16 (High)** · **Owner** PM
**Description.** Polishing reports or settings before the prediction path exists — the classic way a demo becomes a shell.
**Mitigation.** Phase gating with hard sequencing rules; the P3 exit gate is a working vertical slice; scope guardrails in `ROADMAP.md` §5 require a decision-log entry for any addition.
**Contingency.** Cut from later phases, never from the current phase's exit criteria.
**Detection.** Phase exit reviews.
**Status.** Controlled by process.

### RSK-06 — Model fails its metric gates late
**Category** Technical/ML · **P** 3 · **I** 5 · **Severity 15 (High)** · **Owner** ML engineer
**Mitigation.** Baselines computed before tuning; `signal_check` gates in P2; gates block P3 exit so failure is discovered at the earliest possible point.
**Contingency.** Switch to LightGBM; re-tune hyperparameters; strengthen features. **The gate is never lowered** — a model below gate with an adjusted gate publishes a meaningless number.
**Detection.** `evaluate.py` exit code.
**Status.** Monitored.

### RSK-07 — Venue network failure during evaluation
**Category** Operational · **P** 2 · **I** 5 · **Severity 10 (Medium)** · **Owner** DevOps
**Mitigation.** Full local Docker stack, verified on the presenting laptop, rehearsed within 2 minutes. Compose parity is a requirement (CON-04) for exactly this reason.
**Contingency.** The local stack *is* the contingency.
**Detection.** Obvious.
**Status.** Mitigated; drill in P7.

### RSK-08 — Train/serve skew
**Category** Technical/ML · **P** 2 · **I** 5 · **Severity 10 (Medium)** · **Owner** ML engineer
**Description.** Training and serving compute features differently, so published metrics describe a model other than the one serving.
**Mitigation.** `training/features.py` is a symlink, not a copy; CI asserts it (TC-UNIT-014).
**Contingency.** Restore the symlink; retrain; re-evaluate.
**Detection.** TC-UNIT-014; `assert_schema` at inference.
**Status.** Mitigated structurally.

### RSK-09 — Authorisation enforced only in the UI
**Category** Security · **P** 3 · **I** 4 · **Severity 12 (High)** · **Owner** Security
**Mitigation.** 66-case matrix testing the API directly, bypassing the UI entirely. Capability checks live in the service layer.
**Contingency.** Fix and re-run the matrix.
**Detection.** TC-SEC-011.
**Status.** Mitigated from P3.

### RSK-10 — Accusatory or over-claiming output
**Category** Product/Ethical · **P** 2 · **I** 5 · **Severity 10 (Medium)** · **Owner** PM
**Mitigation.** Terminology lexicon and prohibited-phrase scans over all rendered text (TC-UX-012, TC-UX-013); no name field in any node payload; fixed disclosure strings asserted exactly.
**Contingency.** Copy fix; scans re-run.
**Detection.** Automated scans in CI.
**Status.** Mitigated.

### RSK-11 — Unknown geographic bias in the model
**Category** Ethical · **P** 3 · **I** 4 · **Severity 12 (High)** · **Owner** ML engineer
**Description.** The model may concentrate attention on localities in a way that reflects reporting patterns rather than offending patterns.
**Mitigation.** **None possible on synthetic data** — the generator's geography is a design choice, so any disparity found would be a property of the generator.
**Contingency.** Not applicable. Declared openly as gap G-7 and as the most serious open question in the project.
**Detection.** Would require real labelled outcomes.
**Status.** **Accepted and declared**, not mitigated. Stated in `ai/evaluation-framework.md` §8, `security/compliance.md` §4 and `security/security-checklist.md` §4.

### RSK-12 — Role spoofing
**Category** Security · **P** 5 · **I** 2 · **Severity 10 (Medium)** · **Owner** Security
**Description.** Any caller can select any role; there is no authentication.
**Mitigation.** Bounded by the absence of real data. Authorisation over the asserted role is still enforced and tested.
**Contingency.** Not applicable in the prototype; V1 replaces it with verified identity.
**Detection.** Not applicable.
**Status.** **Accepted** (ADR-019, gap G-1), documented in four places.

### RSK-13 — Defect count exceeds the burn-down window
**Category** Delivery · **P** 3 · **I** 3 · **Severity 9 (Medium)** · **Owner** QA
**Mitigation.** 1.5 days reserved in P6; tests run continuously from P2 so defects surface early.
**Contingency.** Cut scope from P7 polish, never from exit criteria.
**Detection.** Defect register trend.
**Status.** Monitored.

### RSK-14 — E2E flakiness erodes trust in the suite
**Category** Quality · **P** 3 · **I** 3 · **Severity 9 (Medium)** · **Owner** QA
**Mitigation.** One retry with retry-passes reported as flakes; three flakes in a week quarantines the test; no test stays quarantined across a phase boundary.
**Contingency.** Delete rather than tolerate.
**Detection.** CI flake report.
**Status.** Controlled by policy.

### RSK-15 — Documentation drifts from the implementation
**Category** Delivery · **P** 3 · **I** 3 · **Severity 9 (Medium)** · **Owner** Architect
**Mitigation.** Same-PR update rule; change-management table in `engineering/release-process.md` §5; P1 documentation checks re-run in P6 against the final state.
**Contingency.** Documentation audit in P8 catches residual drift.
**Detection.** TC-DOC-010…021.
**Status.** Controlled by process.

### RSK-16 — Free-tier database connection limits under load
**Category** Infrastructure · **P** 2 · **I** 3 · **Severity 6 (Medium)** · **Owner** DevOps
**Mitigation.** Pooled endpoint mandatory; connection reuse; verified under k6 at 20 concurrent users.
**Contingency.** Upgrade the tier.
**Detection.** TC-PERF-020; health latency.
**Status.** Mitigated.

### RSK-17 — Demo mode tempts a scripted shortcut
**Category** Integrity · **P** 4 · **I** 5 · **Severity 20 (Critical)** · **Owner** QA
**Description.** Under finale pressure, scripting the demo's prediction guarantees it works — and defrauds the evaluator.
**Mitigation.** The demo route imports the same hook as the complaint detail page; TC-INT-012 asserts no demo-only prediction path exists; TC-FAB-008 substitutes the response and asserts the demo follows it.
**Contingency.** None — this is a hard constraint, not a trade-off.
**Detection.** TC-INT-012, TC-FAB-008, static import check.
**Status.** Mitigated structurally.

---

## Summary

| Severity | Count | IDs |
|---|:--:|---|
| Critical (20–25) | 2 | RSK-02, RSK-17 |
| High (12–19) | 6 | RSK-01, RSK-03, RSK-05, RSK-06, RSK-09, RSK-11 |
| Medium (6–11) | 9 | RSK-04, RSK-07, RSK-08, RSK-10, RSK-12, RSK-13, RSK-14, RSK-15, RSK-16 |
| Low | 0 | — |

**Accepted rather than mitigated:** RSK-11 (geographic bias — untestable on synthetic data) and RSK-12 (role spoofing — bounded by the absence of real data). Both are declared identically in the security documents.

**The two Critical risks share a shape:** both are cases where the honest path is harder than the convenient one under time pressure. RSK-02 tempts a paid instance nobody budgeted for; RSK-17 tempts a scripted demo. Both are handled by making the honest path the only one the tests accept.
