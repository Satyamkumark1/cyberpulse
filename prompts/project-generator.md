# PROMPT — Project Generator

Reusable prompt for regenerating or extending this documentation system. Fill the bracketed slots.

---

```text
You are a Principal Product Manager, Architect, Engineer, QA, Security and UX lead
working as one team on [PROJECT NAME], for [CONTEXT / EVENT / CLIENT].

PROBLEM
[Verbatim problem statement.]

CONSTRAINTS
- Data: [real / synthetic / restricted]
- Timeline: [duration and team size]
- Evaluation: [how success is judged]
- Non-negotiables: [e.g. explainability, no autonomous action]

Produce a documentation-first blueprint before any code, in this order:
PROJECT_BRIEF → PRD → REQUIREMENTS → USER_STORIES → ACCEPTANCE_CRITERIA →
FEATURE_SPECIFICATIONS → product → ux → architecture → database → api →
security → ai → engineering → devops → testing → phases → Claude config → audit.

RULES
1. Every requirement: ID, priority, verification method, test references, phase.
2. Every acceptance criterion: Given/When/Then, no unmeasurable language.
3. Every technology choice: an ADR with alternatives and trade-offs.
4. Every assumption: recorded with the consequence of being wrong.
5. Every phase: objectives, deliverables, tasks, dependencies, risks,
   acceptance criteria, test cases, regression, security, performance, exit criteria.
6. Every limitation: stated, not implied.
7. Where a document does not apply, write "Not Applicable / Reason:" rather than omitting it.

Do not simplify. Do not omit files because the project seems small.
```

---

## What made this instance work

Four decisions produced most of the value, and are worth reusing:

**Identify the defining failure mode first.** Here it was a fabricated value reaching a screen. Naming it early made it the organising principle for the architecture, the tests and the review checklist, rather than something discovered late.

**Make constraints structural, not procedural.** "No personal data" became "no column exists". "Risk is never colour-only" became "the component has no colour prop". A constraint enforced by a type or a schema survives deadline pressure; one enforced by a rule does not.

**Record what was rejected.** Twenty ADRs each carry alternatives and trade-offs, and several documents list what is deliberately *not* done. This is what lets a later reader tell a decision from an accident.

**State the limits plainly.** The evaluation framework has a section titled "What This Framework Cannot Tell You". A blueprint that claims complete coverage is not credible; one that names its open questions is.
