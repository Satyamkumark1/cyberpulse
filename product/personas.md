# PERSONAS — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Basis | Role analysis of the PS 26184 stakeholder chain (MHA / I4C / state cyber cells / bank nodal officers) |
| Note | These are **composite, fictional personas** constructed for design purposes. They do not represent real individuals. |

Five personas are defined. PER-01 is the primary design target — where a trade-off must be made, it is made in PER-01's favour.

---

## PER-01 — Investigating Officer, District Cyber Crime Cell *(PRIMARY)*

| Attribute | Detail |
|---|---|
| Role | Inspector / Sub-Inspector, district or commissionerate cyber crime unit |
| Experience | 6–12 years in policing, 1–4 years in cyber crime |
| Technical literacy | High on case-management software and messaging tools; low on statistics and machine learning |
| Devices | Desktop workstation (1920×1080), occasionally a laptop in the field |
| Caseload | 15–40 simultaneous open financial-fraud complaints |
| Working pattern | Reactive and interrupt-driven; long stretches of documentation punctuated by urgent calls |
| Measured on | Case disposal rate, recovery rate, timeliness of first action |

### Goals
Act on a complaint while the money is still traceable. Produce a defensible record of why a decision was taken. Avoid wasting a scarce field team on the wrong location.

### Frustrations
Bank statements arrive after the window has closed. Complaint records tell them what happened but nothing about what will happen. Analytical outputs from other tools cannot be explained to a supervisor or a court. Information is scattered across a complaint portal, email, spreadsheets and messaging groups.

### A day in the life
The officer arrives to eleven new complaints. Three involve amounts large enough to attract supervisory attention. For each, they must decide within the first hour whether to escalate, whom to contact at which bank, and whether a field response is justified. They currently make that decision on the complaint amount and a hunch about geography, because nothing else is available before the statements arrive.

### What CyberPulse AI must give them
A ranked location and a bounded time window, with an explanation they can read aloud to a supervisor, reachable in two clicks from the complaint they are already looking at.

### What would make them abandon it
A number without a reason. A prediction that takes longer than reading the file would have. A screen that requires them to learn a new vocabulary.

### Primary journeys
UC-01, UC-02, UC-03, UC-04, UC-06 · Stories US-010 … US-015, US-022 … US-024, US-031 … US-035, US-050 … US-054, US-060 … US-064

---

## PER-02 — Intelligence Analyst, I4C CIS Division

| Attribute | Detail |
|---|---|
| Role | Analyst supporting national cybercrime coordination |
| Experience | 3–8 years, often with a data or research background |
| Technical literacy | High. Comfortable with dashboards, filters, exports and the idea of model error |
| Devices | Dual-monitor desktop |
| Working pattern | Analytical, self-directed, pattern-seeking across states and time |
| Measured on | Identification of emerging patterns, quality of advisories issued |

### Goals
Detect geographic and temporal concentration before it becomes a national trend. Connect activity across state boundaries. Produce advisories grounded in evidence.

### Frustrations
State-level data is siloed. Aggregate views cannot be drilled into. Model outputs arrive without any statement of accuracy, making them impossible to cite responsibly.

### What CyberPulse AI must give them
A national map with real layers, filters that apply server-side, drill-down from a cluster to a single complaint, and an honest published statement of model performance.

### What would make them abandon it
Metrics presented without methodology. A map that is a picture rather than a queryable surface.

### Primary journeys
UC-05, UC-07 · Stories US-025, US-040, US-071, US-072, US-080 … US-083

---

## PER-03 — Fraud Risk / Nodal Officer, Scheduled Commercial Bank

| Attribute | Detail |
|---|---|
| Role | Bank-side point of contact for law-enforcement requests |
| Experience | 5–15 years in banking operations or fraud risk |
| Technical literacy | Moderate. Fluent in banking systems, not in analytics tooling |
| Devices | Desktop workstation on a restricted corporate network |
| Working pattern | High volume of inbound requests from many police units, each in a different format |
| Measured on | Response turnaround, institutional exposure avoided, regulatory compliance |

### Goals
Receive requests that are specific enough to act on. Prioritise across a large inbound queue. Maintain an auditable record of what was received and what was done.

### Frustrations
Requests arrive as free text with inconsistent detail. No indication of urgency or confidence. No way to acknowledge receipt in a way the requesting officer can see.

### What CyberPulse AI must give them
A consistently structured alert with location, window, severity, exposure and factors; a one-action acknowledgement; and visibility scoped to alerts actually addressed to them.

### What would make them abandon it
Being shown case data they have no business seeing — which is why BANK scoping is enforced server-side rather than by hiding UI.

### Primary journeys
UC-04, UC-06 · Stories US-053, US-090

---

## PER-04 — Cyber Cell Supervisor (District SP / DCP)

| Attribute | Detail |
|---|---|
| Role | Commands the unit; allocates officers and field resources |
| Experience | 12–20 years |
| Technical literacy | Moderate. Consumes dashboards; does not operate tools directly |
| Devices | Desktop; frequently presenting to senior officers |
| Working pattern | Short, high-stakes decision windows between other duties |
| Measured on | Unit throughput, resource utilisation, outcomes |

### Goals
Understand the unit's position at a glance. Decide where to commit a field team. Brief leadership without preparing a deck.

### Frustrations
Having to open individual cases to understand aggregate position. Being asked to approve a deployment on the strength of a number nobody can explain.

### What CyberPulse AI must give them
KPI cards, severity mix, district concentration, and — critically — the ability to inspect the reasoning behind any prediction before approving a deployment.

### Primary journeys
UC-03, UC-07 · Stories US-012, US-036, US-061, US-070

---

## PER-05 — Platform Administrator, I4C Technical Operations

| Attribute | Detail |
|---|---|
| Role | Operates and configures the platform |
| Experience | 4–10 years in systems or platform engineering |
| Technical literacy | High |
| Devices | Desktop, terminal access |
| Working pattern | Proactive maintenance plus incident response |
| Measured on | Availability, configuration correctness, auditability |

### Goals
Keep the system healthy. Configure operating thresholds. Prove that privileged actions were recorded. Diagnose a failing demonstration in seconds rather than minutes.

### Frustrations
Systems that fail silently. Health endpoints that report "OK" while a dependency is down. Configuration changes with no audit trail.

### What CyberPulse AI must give them
A componentised health endpoint with per-component latency, a settings surface that states system mode and model version plainly, and an audit event for every privileged action.

### Primary journeys
Stories US-001 … US-004, US-024, US-054, US-055, US-091, US-093

---

## Persona Priority and Trade-off Rules

| Situation | Resolution |
|---|---|
| PER-01 speed vs PER-02 analytical depth | Favour PER-01. Depth is available one interaction deeper, never on the critical path |
| PER-01 simplicity vs PER-05 configurability | Favour PER-01. Configuration lives in Settings, never in the workflow |
| PER-03 scope restriction vs convenience | Favour restriction. Scoping is a correctness requirement, not a preference |
| PER-04 summary vs PER-01 detail | Both. KPI cards summarise; every card drills through to the underlying records |

## Anti-Persona

**The unattended automated agent.** CyberPulse AI is deliberately not designed for a system that consumes predictions and acts without human review. Every output path terminates in a human decision. No API returns an instruction; all return intelligence. This is a design constraint, recorded as NG-02, and any proposal to add autonomous action must be rejected at review.
