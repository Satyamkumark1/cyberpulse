# INTEGRATIONS — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Status of external integrations in v1.0 | **None are connected.** Every external data source is simulated by the synthetic generator. |
| Purpose of this document | Define the adapter boundary that a lawful production deployment would use, so the architecture is credible without overclaiming |

---

## 1. Integration Position Statement

CyberPulse AI has **no connection** to NCRP, CFCFRMS, NPCI, UPI switches, bank core banking systems, or any government or financial network. It has never had one. Every complaint, account, transaction, withdrawal and ATM in the system was produced by `scripts/generate-data/generator.py` from seed `26184`.

This document exists because "how would this get real data?" is the first question a serious evaluator asks, and the honest answer is a designed boundary rather than a hand-wave. Nothing here should be read as a claim that any of it is built, authorised, or agreed with any party.

---

## 2. Active Integrations (v1.0)

| Integration | Type | Criticality | Failure behaviour |
|---|---|---|---|
| Map tile provider (OpenStreetMap-compatible vector tiles via MapLibre) | Outbound HTTP, browser | Low | Falls back to a bundled India outline GeoJSON with a visible notice; data layers still render |
| Neon PostgreSQL | Outbound TCP/TLS, server | Critical | Retry with backoff; health reports `degraded`; UI shows retryable errors |
| ML service | Outbound HTTPS, server | Critical for prediction | 503 → degraded panel with no fabricated values |

That is the complete list. There is no email provider, no SMS gateway, no push service, no third-party analytics, no error-reporting SaaS, no authentication provider. "Sending" an alert means persisting it with recipient metadata and surfacing it in the recipients' views — the product is explicit about this in the UI and in `FEATURE_SPECIFICATIONS.md` FEAT-11.

---

## 3. The Adapter Boundary

All external ingestion would enter through one interface, so that the core never learns the shape of any particular source.

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ NCRP adapter │   │ Bank adapter │   │ NPCI adapter │   │ Synthetic    │
│  (future)    │   │  (future)    │   │  (future)    │   │ generator ✓  │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       └──────────────────┴──────────────────┴──────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   IngestionPort (interface) │
                    │   ingestComplaints()        │
                    │   ingestTransactions()      │
                    │   ingestAccounts()          │
                    │   ingestWithdrawals()       │
                    │   ingestAtms()              │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   Normalisation + validation│
                    │   → canonical schema        │
                    │   → PII minimisation        │
                    │   → H3 enrichment           │
                    └──────────────┬──────────────┘
                                   ▼
                              Application core
```

In v1.0 exactly one implementation exists — the synthetic generator — and it satisfies the same interface a real adapter would. That is what makes the boundary real rather than notional: the core already consumes data through it.

### 3.1 Port definition

```ts
export interface IngestionPort {
  readonly sourceId: string;                 // 'synthetic' | 'ncrp' | 'bank:<code>' | 'npci'
  readonly dataClassification: 'SYNTHETIC' | 'ANONYMISED' | 'RESTRICTED';
  ingestComplaints(since: Date): AsyncIterable<CanonicalComplaint>;
  ingestTransactions(since: Date): AsyncIterable<CanonicalTransaction>;
  ingestAccounts(ids: string[]): AsyncIterable<CanonicalAccount>;
  ingestWithdrawals(since: Date): AsyncIterable<CanonicalWithdrawal>;
  ingestAtms(): AsyncIterable<CanonicalAtm>;
  health(): Promise<AdapterHealth>;
}
```

`dataClassification` is not decoration. The application reads it to decide what the header badge says, and a deployment carrying `RESTRICTED` data would fail its own startup check unless the corresponding governance controls (real RBAC, audit retention, state partitioning) were enabled — all of which are V1 scope in `ROADMAP.md`.

---

## 4. Prospective Integrations (not built)

Each entry states what it would provide, what it would require, and what would have to change. None is scheduled; all are subject to lawful authorisation that this project does not hold.

### 4.1 Complaint intake

**Would provide:** complaint ID, fraud type, amount, timestamp, victim district-level location, and the account identifiers reported by the victim.
**Would require:** formal authorisation; a pull or webhook channel; district-level rather than point-level victim location to minimise identifiability.
**Would change:** `complaints` gains a `source_id` and `source_reference`; the generator becomes one adapter among several; `dataClassification` becomes `RESTRICTED` and the badge changes accordingly.

### 4.2 Bank transaction and account data

**Would provide:** the layered transaction chain and account attributes — the signals that currently take days to arrive.
**Would require:** a per-institution nodal channel, consent-and-authorisation workflow, and a strict field minimisation contract (no names, no addresses, no contact details — the schema has no columns for them and must not gain any).
**Would change:** ingestion becomes incremental and continuous rather than batch; `architecture/scalability.md` §4's streaming path becomes necessary rather than optional.

### 4.3 ATM registry

**Would provide:** authoritative ATM locations and operational status, replacing synthetic placements.
**Would require:** a periodic reference-data feed.
**Would change:** `atms` gains a `source_updated_at`; the hotspot engine's density term becomes materially more accurate. This is the lowest-risk and highest-value of the prospective integrations, because ATM locations are not personal data.

### 4.4 Alert delivery

**Would provide:** actual delivery of alerts to LEA units, bank nodal officers and the I4C desk.
**Would require:** an authenticated channel per recipient class, delivery receipts, and an escalation policy for unacknowledged HIGH alerts.
**Would change:** `alerts` gains delivery state distinct from workflow state; an outbound queue with retry becomes necessary; the alert SLA in V1 scope becomes enforceable.

### 4.5 Outcome capture

**Would provide:** ground truth — did a withdrawal actually occur in the predicted cell and window?
**Would require:** a feedback path from field response and bank confirmation.
**Would change:** everything. This is the integration that converts the model from one trained on synthetic labels into one trained on reality, and it is the only durable competitive asset identified in `product/competitive-analysis.md` §8.

---

## 5. Integration Principles

These would govern any future adapter and are stated now so that the boundary is not negotiated under delivery pressure later.

1. **Minimise at the boundary.** An adapter drops fields the core does not need before they enter the system. The core schema has no personal-identifier columns, and adding one would require a decision-log entry and a threat-model update.
2. **Classification travels with the data.** Every ingested record carries its `sourceId` and classification. The UI's data-mode indicator is derived from these, not configured independently.
3. **Adapters fail closed.** An adapter that cannot validate a record rejects it and reports it; it never inserts a partially normalised row.
4. **No adapter writes directly.** All writes go through normalisation and the same validation the synthetic path uses.
5. **Idempotency by source reference.** Re-ingesting a record must not duplicate it; `(source_id, source_reference)` would be unique.
6. **Every adapter has a health check** contributing to `/api/health`, so a silently stalled feed is visible rather than merely absent.

---

## 6. Internal Integration Points

The boundaries that do exist today and must be maintained.

| Boundary | Contract | Enforcement |
|---|---|---|
| Web → ML service | JSON Schema in `packages/shared`, generating both Zod and Pydantic | Build fails on divergence |
| Web → database | Drizzle typed schema | Type check |
| Training → serving | One `features.py`, symlinked | CI check that it is a symlink (`low-level-design.md` §7 contract 2) |
| Evaluation → application | `model_metrics` table | `reportService.metrics` reads it; hard-coded metrics fail TC-INT-011 |
| Generator → database | Canonical CSV plus `manifest.json` with per-file SHA-256 | Seed verifies checksums before inserting |

---

## 7. What Is Deliberately Not Integrated

| Not integrated | Reason |
|---|---|
| Email or SMS delivery | Would imply real-world notification capability the prototype does not have; alerts are persisted intelligence, and the UI says so |
| Third-party analytics SDK | Would send behavioural data to an external processor; the event store is local and identity-free by construction |
| External error-reporting SaaS | Same reason; errors are logged server-side with a request ID |
| Authentication provider | Prototype uses a role switch that is explicitly not a security control (ADR-019) |
| Any LLM or external inference API | The prediction path must be reproducible, explainable and offline-verifiable; an external model would compromise all three |

The last row is worth stating plainly given the project's context: there is no large language model anywhere in the prediction path. Every output is produced by a tree ensemble whose attributions are computed exactly, which is precisely why the explanation can be trusted enough to put in front of an investigator.
