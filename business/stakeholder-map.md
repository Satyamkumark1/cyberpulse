# STAKEHOLDER MAP — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Scope | Who is affected, who decides, and who must be convinced |

---

## 1. Map

```
                    INTEREST
              Low ─────────────► High
        High ┌──────────────┬──────────────┐
             │   Keep       │   Manage     │
             │   satisfied  │   closely    │
             │              │              │
  P          │  Bank        │  MHA / I4C   │
  O          │  leadership  │  CIS Div     │
  W          │  Regulators  │  State cyber │
  E          │              │  cell leads  │
  R          ├──────────────┼──────────────┤
             │   Monitor    │   Keep       │
             │              │   informed   │
             │              │              │
             │  General     │  Investigating
         Low │  public      │  officers    │
             │  Media       │  Bank nodal  │
             │              │  officers    │
             │              │  Victims     │
             └──────────────┴──────────────┘
```

The map has an uncomfortable feature worth naming: **the people with the most at stake sit in the low-power quadrants.** Victims bear the loss; investigating officers bear the operational consequence of a wrong prediction; neither decides whether the system is deployed or how. That asymmetry is the reason explainability, confidence display and the refusal to take autonomous action are treated as requirements rather than features.

---

## 2. Stakeholders

### Investigating Officer — Cyber Cell *(primary user)*
**Interest** High · **Power** Low · **Strategy** Keep informed; design for
**What they need.** A defensible answer to "where and when", in two clicks, with reasoning they can repeat.
**What loses them.** One unexplained number. One slow, generic prediction. One deployment sent to the wrong locality on the system's word.
**How the product responds.** Five-interaction critical path; explanation always present; confidence and alternatives visible; honest degradation.

### I4C Intelligence Analyst — CIS Division
**Interest** High · **Power** High · **Strategy** Manage closely
**What they need.** National pattern visibility, drill-down, and an honest statement of model accuracy they can cite responsibly.
**What loses them.** Metrics published without methodology.
**How the product responds.** GIS console; published prototype metrics with the synthetic-data caption; declared limitations.

### Bank Fraud Risk / Nodal Officer
**Interest** High · **Power** Medium · **Strategy** Keep informed; scope carefully
**What they need.** Structured, prioritised, specific requests; a one-action acknowledgement.
**What loses them.** Being shown case data outside their remit.
**How the product responds.** Fixed alert structure; server-enforced BANK scoping; idempotent acknowledgement.

### Cyber Cell Supervisor — District SP / DCP
**Interest** High · **Power** High · **Strategy** Manage closely
**What they need.** Aggregate position; a basis for approving or declining a deployment.
**How the product responds.** KPI cards that navigate; reports; the factor breakdown reachable from the investigation route.

### MHA / I4C — Problem owner
**Interest** High · **Power** Highest · **Strategy** Manage closely
**What they need.** A credible approach to a real gap, with limitations stated rather than concealed, and a plausible integration path.
**What loses them.** Any claim of endorsement, real-data access or guaranteed outcomes.
**How the product responds.** Prototype disclosure on every route; prohibited-claims scan in CI; the adapter boundary documented as designed-not-built.

### Victim *(affected, not a user)*
**Interest** Highest · **Power** None · **Strategy** Design for
**What they need.** Faster interception. No wrongful consequence from a model error.
**How the product responds.** No determination about any individual; no autonomous action; every output human-reviewed.

### Individuals whose accounts appear in a trail *(affected, not a user)*
**Interest** Highest · **Power** None · **Strategy** Protect
**What they need.** Not to be characterised as criminal by software.
**How the product responds.** Terminology lexicon enforced by CI scan; no name field in any node payload; the neutrality note on every account detail panel; predictions about locations, never people.

### SIH Evaluators *(immediate audience)*
**Interest** High · **Power** High for this event · **Strategy** Manage closely
**What they need.** To understand the product in under three minutes and to find that its claims survive probing.
**How the product responds.** `/demo`; the three-minute narrative; prepared honest answers including the ones that concede a limitation.

### Development team
**Interest** High · **Power** Medium · **Strategy** Collaborate
**What they need.** Unambiguous requirements and a clear definition of done.

---

## 3. Conflicts, and How They Are Resolved

| Tension | Resolution |
|---|---|
| Officer wants speed; analyst wants depth | Favour speed. Depth is one interaction deeper, never on the critical path. |
| Bank wants full context; individuals need protection | Scope enforced server-side; out-of-scope returns 404 |
| Evaluator wants an impressive demo; integrity requires honest failure | Integrity wins — the degraded path is rehearsed as part of the demonstration |
| Supervisor wants a single number; the model has real uncertainty | Show the score **and** confidence **and** alternatives |
| Timeline pressure; governance obligations | Gaps are declared, never quietly skipped |

Row three is the one most likely to be tested under pressure, and it is the reason RSK-17 is rated Critical: a scripted demo would satisfy the evaluator and defraud them.

---

## 4. Communication

| Stakeholder | Channel | Cadence |
|---|---|---|
| Evaluators | `/demo` plus the narrated script | At the event |
| Officers and supervisors | The product itself | Continuous |
| Bank officers | Structured alerts | Per alert |
| MHA / I4C | Documentation and the prototype disclosure | Continuous |
| Team | Stand-up, phase exits, three retrospectives | Daily / per phase |

---

## 5. The Stakeholder Nobody Lists

**The offender.** Worth naming because it changes a design decision: if a system like this were deployed and became known, cash-out behaviour would adapt. Nothing in this prototype measures resistance to that, and `ai/evaluation-framework.md` §8 states the honest expectation that performance would degrade.

A predictive system in an adversarial domain has a shelf life. Planning as though it does not is how such systems quietly stop working while still producing confident output.
