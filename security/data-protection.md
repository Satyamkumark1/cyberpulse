# DATA PROTECTION — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Core claim | **The system contains no personal data, and the schema has nowhere to put any.** |
| Related | `security/privacy-policy-draft.md`, `security/compliance.md`, `docs/data-methodology.md` |

---

## 1. Data Inventory

| Data | Classification | Source | Retention | Personal? |
|---|---|---|---|---|
| Complaints | Synthetic | Generator, seed 26184 | Life of the deployment | No |
| Accounts | Synthetic | Generator | Life of the deployment | No |
| Transactions | Synthetic | Generator | Life of the deployment | No |
| Withdrawals | Synthetic | Generator | Life of the deployment | No |
| ATMs | Synthetic | Generator | Life of the deployment | No |
| Hotspots | Derived | Hotspot engine | Refreshed | No |
| Predictions | Derived | ML service | Append-only | No |
| Risk factors | Derived | SHAP | Append-only | No |
| Alerts | User-generated | Officers (prototype) | Append-only, demo-origin clearable | No |
| Investigations and notes | User-generated | Officers (prototype) | Append-only | Free text — see §4 |
| Audit events | System | Application | Append-only | Role only |
| Analytics events | System | Application | Append-only | No identity by construction |
| Server logs | System | Runtime | Platform default | Request ID, route, role, duration |

Every row reads "No" in the personal column, and §2 explains why that is a structural property rather than a claim about current contents.

---

## 2. Data Minimisation by Schema

The strongest privacy control in this system is an absence. No table has a column for a name, address, telephone number, email address, government identifier, real account number, IP address, device identifier or biometric. Adding one would require a migration, a review, a threat-model update and a decision-log entry.

```
Columns that exist for an account:
  account_id (ACC-88123390) · account_type · bank_name (synthetic label)
  risk_score · opened_at · last_activity · status · home_h3_r8

Columns that do not exist anywhere in the schema:
  name · address · phone · email · Aadhaar · PAN · real account number · IP
```

This matters beyond the prototype. When a real adapter is built, the minimisation happens at the boundary because the core has nowhere to store the surplus — the constraint propagates outward instead of relying on adapter discipline.

---

## 3. The Synthetic Guarantee

### 3.1 Generation

All data derives from `scripts/generate-data/generator.py` with seed `26184`. Identifiers are formatted synthetically (`C-10284`, `ACC-88123390`, `TXN-0000104821`, `ATM-102`). Institution names are synthetic labels, not real banks. Coordinates are placed within metropolitan clusters but are not real addresses; hotspot coordinates are H3 cell centroids, which are approximately 460-metre-scale points rather than locations.

### 3.2 The blocking scan

`scripts/evaluation/pii_scan.py` runs before seeding and **cannot be skipped in CI**. It fails the pipeline on any match for:

| Pattern | Rationale |
|---|---|
| 12-digit sequences with Aadhaar-like spacing | Government identifier shape |
| `[A-Z]{5}[0-9]{4}[A-Z]` | PAN shape |
| 10-digit sequences beginning 6–9 | Indian mobile shape |
| Email address pattern | Contact data |
| Common Indian given and family names from a reference list | Name leakage from any source |
| Account identifiers not matching `ACC-\d{8}` | Non-synthetic account format |

A failure blocks `db:seed`, so no dataset that trips the scan can ever reach a database (AC-016-06, TC-SEC-020).

### 3.3 Provenance

`manifest.json` records the seed, generator version, row counts and a SHA-256 per file. Seeding verifies each checksum before insert. Any file substituted between generation and seeding is rejected rather than loaded.

---

## 4. The One Genuine Personal-Data Risk

Investigation notes are free text typed by a user. Nothing in the schema prevents someone typing a real name into one.

| Control | Detail |
|---|---|
| Interface guidance | The note field's helper text states that notes must not contain personal data |
| Terminology lexicon | The UI vocabulary models the expected register throughout |
| Output escaping | Notes are rendered as text, never as HTML |
| Length cap | Bounded to discourage pasting documents |
| Not used for training | Notes never enter the feature pipeline |
| Not in analytics | The `investigation_note_added` event carries `bodyLength`, never the body |

This is the one place where the structural guarantee becomes a behavioural one, and this document says so rather than implying the absence is total. In a real deployment, notes would fall under the deploying department's record-handling policy, and the V1 retention policy would cover them.

---

## 5. Data in Transit and at Rest

| Path | Protection |
|---|---|
| Browser → Next.js | TLS 1.2+, HSTS with a one-year max-age |
| Next.js → PostgreSQL | TLS required (`sslmode=require`) |
| Next.js → ML service | TLS; origin allow-listed; not publicly routable |
| Browser → tile provider | TLS; no application data transmitted — tile coordinates only |
| At rest | Managed encryption at the database provider |
| Model artefacts | Baked into the container image; mounted read-only in local development |

No data leaves the deployment boundary other than tile requests, which carry map coordinates and nothing else. There is no third-party analytics processor, no external error-reporting service, and no external inference API (`architecture/integrations.md` §7).

---

## 6. Logging Discipline

| Logged | Never logged |
|---|---|
| `requestId` | Request bodies |
| Route pattern (`/complaints/[id]`) | Resolved paths containing IDs |
| Role | Any identity |
| Duration, outcome, error code | Error messages containing user content |
| Model version | Feature values or model internals |

Route *patterns* rather than resolved paths is a small decision with a large effect: a complaint ID never enters the log store, so log access cannot become case-data access.

---

## 7. Analytics Privacy

The event schema cannot answer "what did this person do", because it has no field for a person. It carries role, route pattern, session UUID (ephemeral, unlinked to any identity) and bucketed values wherever a raw value could be re-identifying — score buckets rather than scores, exposure buckets rather than amounts, `bodyLength` rather than body text.

This is structural. There is no field to misuse, so no configuration change or future feature can quietly begin collecting personal data without a visible schema change and a review (`product/product-analytics.md` §6).

---

## 8. Secrets

| Rule | Enforcement |
|---|---|
| Secrets only in environment variables | No secret file is committed; `.env.example` holds placeholders |
| No secret carries a `NEXT_PUBLIC_` prefix | Build check asserts no `NEXT_PUBLIC_*` value matches a secret pattern |
| Secret scanning in CI | Blocks merge on a detected credential |
| Environment validated at startup | Zod schema; the application refuses to boot on a missing or malformed variable |
| ML service holds no database credential | Architectural (`architecture/security-architecture.md` §2) |

---

## 9. Deletion and the Right to Erasure

There is no data subject in the prototype, so there is no erasure obligation. The only delete path in application code is the demo reset, scoped to `origin = 'DEMO'`.

In a real deployment, erasure would be complicated by the fact that predictions and audit events are append-only. The intended approach — recorded here so that a future implementer inherits the reasoning rather than the conclusion — is that case records would be subject to the deploying department's statutory retention rules rather than to general erasure, while derived analytics would be deletable. This is a legal determination that a prototype cannot make, and `security/compliance.md` states that plainly.

---

## 10. Verification

| Control | Test |
|---|---|
| No personal-data column exists in any table | TC-SEC-022 (schema introspection) |
| PII scan blocks seeding on a match | TC-SEC-020 |
| Manifest checksums verified before insert | TC-DATA-002 |
| No secret in the client bundle | TC-SEC-003 |
| Logs contain no request bodies or resolved paths | TC-SEC-023 |
| Analytics events carry no identity field | TC-SEC-024 |
| Notes render as text, never HTML | TC-SEC-025 |
| Graph node payloads have no name field | TC-SEC-021 |
