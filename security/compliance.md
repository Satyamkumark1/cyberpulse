# COMPLIANCE — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| **Status** | The prototype processes **no personal data**, so most compliance obligations do not attach to it. This document states what would attach in a real deployment and what the prototype has already built towards. |
| **Disclaimer** | This is an engineering document written by a project team, not legal advice. Any real deployment requires assessment by qualified counsel and by the deploying authority's data-protection function. |

---

## 1. Current Compliance Position

| Question | Answer |
|---|---|
| Does the system process personal data? | No. All data is synthetic; the schema has no personal-data columns. |
| Is there a data subject? | No. |
| Is there a data controller or processor relationship? | Not applicable in the prototype. |
| Are there statutory retention obligations? | No — no records of legal consequence exist. |
| Is a data protection impact assessment required? | Not for the prototype. **It would be required before any real deployment**, and §4 sketches its likely content. |
| Are there cross-border transfer considerations? | Deployment hosts are configurable; a real deployment would require India-resident infrastructure. Stated here because it is a decision that must be made early, not late. |

---

## 2. Frameworks That Would Apply

Listed with what each would require and what the prototype has already done towards it. Nothing here is a claim of compliance.

### 2.1 Digital Personal Data Protection Act, 2023 (India)

| Obligation | Prototype status |
|---|---|
| Lawful purpose and notice | Not applicable — no personal data. A real deployment would rely on a statutory/legitimate-use basis rather than consent, which is a determination for counsel. |
| Purpose limitation | Built in: the schema supports cash-out forecasting and nothing else |
| Data minimisation | **Structurally enforced** — no personal-data column exists (`security/data-protection.md` §2) |
| Accuracy | Model accuracy published honestly as prototype metrics; predictions carry confidence |
| Storage limitation | Not implemented — no retention policy exists. **Declared gap**; V1 scope |
| Security safeguards | Partially — see `architecture/security-architecture.md` §10 for declared gaps |
| Breach notification | No process exists. **Declared gap**; V1 scope |
| Data principal rights | Not applicable in the prototype; §9 of `security/data-protection.md` records the intended reasoning |

### 2.2 Information Technology Act, 2000 and SPDI Rules

Financial information is sensitive personal data under the SPDI Rules. The prototype holds none. A real deployment would need a published privacy policy, reasonable security practices, and a designated grievance officer. `security/privacy-policy-draft.md` is a draft for that eventual need, clearly marked as not currently operative.

### 2.3 CERT-In directions

A real deployment would need synchronised clocks, log retention for the mandated period, and incident reporting within the mandated window. The prototype has structured logging with request correlation and UTC-only timestamps, which is the technical groundwork; it has no retention policy and no reporting process, and both are declared gaps.

### 2.4 Evidentiary considerations

If output were ever used to support an investigation, the reasoning behind a prediction would need to be reconstructable. The prototype already stores what would be required: the prediction, its factors, the ranked alternatives as returned, the model version, the feature schema version and an audit trail of who acted on it. This was designed in because reconstructability is also what makes the product trustworthy day to day — the compliance benefit is a consequence rather than the motivation.

### 2.5 Accessibility

Indian government digital services are expected to meet accessibility standards aligned with WCAG. The prototype targets WCAG 2.1 AA on core flows, tests with axe-core in CI, and declares its limitations openly (`ux/accessibility.md` §8) rather than claiming full conformance.

---

## 3. Ethical Commitments

These are self-imposed and enforced by tests rather than by any external requirement.

| Commitment | Enforcement |
|---|---|
| No autonomous enforcement action | NG-02; no API returns an instruction |
| No accusation of an individual | Terminology lexicon, scanned in CI (TC-UX-013) |
| No claim of official endorsement | Prohibited-phrase scan (TC-UX-012) |
| Explainability on every prediction | FR-10.x; ≥ 5 factors or an explicit statement that none could be produced |
| Honest degradation | FR-07.5; no fabricated values, ever |
| Published error rates | FR-17; metrics panel captioned with its methodology |
| No profiling of individuals | Predictions are about locations and time windows, not people |

The distinction in the last row is the ethical core of the design and is worth stating precisely: the object of prediction is *where an already-reported stolen sum is likely to be withdrawn*, anchored to a filed complaint. It is not a person, not a population, and not a propensity. `product/competitive-analysis.md` §4 sets out why that distinction matters relative to predictive policing, and why it is not a licence for complacency.

---

## 4. What a Real DPIA Would Have to Examine

Recorded now so that the project's own understanding of its risks is on file.

1. **Purpose and necessity.** Is a predictive layer necessary and proportionate to the harm being addressed?
2. **Data categories and minimisation.** Which transaction and account fields are genuinely required? The prototype's answer is thirteen numeric features and no identifiers.
3. **Accuracy and error consequence.** What happens when a top-1 prediction is wrong? Field resources are misallocated. What happens when it is right and acted on wrongly? This is the question that most needs an answer from the deploying authority, not from the engineering team.
4. **Automation bias.** Documented as DT-4 in `security/threat-model.md`, with the honest admission that software mitigations are partial.
5. **Bias and differential impact.** Would the model concentrate attention on particular localities in a way that reflects reporting patterns rather than offending patterns? Untestable on synthetic data. **This is the most serious open question in the project** and is stated as such in `ai/evaluation-framework.md` §8.
6. **Retention and deletion.** Statutory retention versus erasure, unresolved.
7. **Access control and accountability.** Requires real identity before any real data.
8. **Transparency.** What is disclosed to a data principal whose transaction data contributed to a prediction about a location?
9. **Redress.** What recourse exists if someone is affected by an action taken on a prediction?

Questions 5 and 9 have no answer within this project's scope. Saying so is more useful than producing a reassuring paragraph.

---

## 5. Compliance-Relevant Design Decisions Already Made

| Decision | Compliance value | Where |
|---|---|---|
| No personal-data columns | Minimisation is structural | `architecture/database-design.md` §4.2 |
| Blocking PII scan before seeding | Prevents ingress | AC-016-06 |
| Data classification on every adapter | Forces governance controls before real data | `architecture/integrations.md` §3.1 |
| Transactional audit on privileged actions | Accountability | `architecture/security-architecture.md` §6 |
| Analytics without identity | Purpose limitation | `product/product-analytics.md` §6 |
| Published prototype metrics | Transparency about accuracy | FR-17 |
| Explanations on every prediction | Contestability | FR-10.x |
| Ranked alternatives always visible | Counters over-reliance on top-1 | FEAT-07 |
| No LLM anywhere in the path | Reproducibility and auditability of every output | `architecture/integrations.md` §7 |

---

## 6. Declared Gaps

Reproduced verbatim from `security/security-checklist.md` §4, which is authoritative; `architecture/security-architecture.md` §10 carries the same twelve entries. TC-DOC-018 asserts the three copies agree.

| # | Gap | Impact | Why accepted | Remedy | Target |
|---|---|---|---|---|---|
| G-1 | No authentication | Anyone reaching the URL can use the prototype and select any role | No real data exists; explicitly permitted for the prototype (ADR-019) | OIDC with verified role claims | V1 |
| G-2 | Audit attributes role, not identity | Demonstrates the mechanism, not real accountability | Follows from G-1 | Pseudonymous subject in audit events | V1 |
| G-3 | No multi-tenant isolation | LEA sees the whole corpus | Single synthetic dataset | Row-level security keyed on state | V1 |
| G-4 | No retention policy | `audit_events` and `analytics_events` grow unbounded | Prototype lifespan | Retention plus archival | V1 |
| G-5 | No breach-notification process | No notification capability | No data subjects | Incident response procedure | V1 |
| G-6 | No DPIA | Legal obligation unmet for real data | No personal data processed | Conduct before any real adapter | V1 |
| G-7 | No bias evaluation | Differential impact unknown | Untestable on synthetic data | Requires real labelled outcomes | V2 |
| G-8 | No penetration test | Unknown vulnerabilities | Hackathon scope | Third-party assessment | V1 |
| G-9 | `style-src 'unsafe-inline'` in CSP | Slightly weakened policy | Required by MapLibre's runtime style injection | Track upstream for nonce support | Monitor |
| G-10 | No key rotation process | Static environment secrets | No production secrets exist | Managed secret rotation | V1 |
| G-11 | No data residency guarantee | Possible cross-border processing | Hosting is configurable | India-resident infrastructure | V1 |
| G-12 | Free-text notes could contain personal data | The one non-structural PII risk | Free text cannot be schema-constrained | Guidance, plus departmental record-handling policy | V1 |

G-6 and G-7 are the two that would block a real deployment outright: no DPIA has been conducted, and differential geographic impact is untestable on synthetic data.

## 7. Statement for Evaluators

CyberPulse AI is a research and proof-of-concept prototype operating exclusively on synthetic data. It is not deployed, not endorsed by any government body, not connected to any official system, and not compliant with the frameworks listed above — because those frameworks do not currently attach to it.

What it does demonstrate is that the controls those frameworks would require have been designed in rather than deferred: minimisation is structural, audit is transactional, explanations are mandatory, and the gaps are documented rather than concealed. The most useful thing this document can say to an evaluator is that the project knows which of its questions it cannot yet answer, and question 5 in §4 is the one it would want answered first.
