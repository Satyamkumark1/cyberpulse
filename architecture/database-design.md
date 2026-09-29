# DATABASE DESIGN — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Engine | PostgreSQL 16 (Neon serverless; local Postgres in Docker for development) |
| ORM | Drizzle ORM · migrations via drizzle-kit |
| Spatial | H3 index columns (text); PostGIS optional and never required (ASM-07) |
| Related | `diagrams/database-erd.md`, `.claude/rules/database.md` |

---

## 1. Design Rules

1. **Money is `bigint` paise.** Never float, never numeric-with-decimals in application paths. Formatting to rupees happens at the presentation edge only (NFR-27).
2. **Time is `timestamptz` in UTC.** Rendering to IST happens at the edge (NFR-28).
3. **Every table has `id bigserial` as its surrogate key** and, where the domain has one, a separate human-facing business key (`complaint_id`, `account_id`, …) with a unique index.
4. **Every table has `created_at`.** Tables that mutate also have `updated_at`.
5. **No hard deletes on operational tables.** `alerts` and `investigations` use status transitions. The only delete path in the system is the demo reset, scoped by `origin = 'demo'`.
6. **Foreign keys are declared and enforced.** Referential integrity is not an application concern.
7. **Enumerations are Postgres enums**, so an invalid value cannot be written by any client.
8. **Every column that appears in a `WHERE`, `ORDER BY` or `JOIN` on a user-facing path has an index**, and every index is justified in §5.

---

## 2. Entity List

| # | Table | Purpose | Volume (seed) | Mutability |
|---|---|---|---|---|
| 1 | `complaints` | Registered cybercrime complaints | 500 | Read-mostly; `status` mutates |
| 2 | `accounts` | Synthetic accounts in the money trail | 12,000 | Read-only after seed |
| 3 | `transactions` | Fund movements between accounts | 60,000 | Read-only after seed |
| 4 | `withdrawals` | Cash-out events at ATMs | 2,400 | Read-only after seed |
| 5 | `atms` | ATM locations | 520 | Read-only after seed |
| 6 | `hotspots` | Candidate/known cash-out cells | ~1,200 | Refreshed by the hotspot engine |
| 7 | `predictions` | Model outputs per complaint | grows | Append-only |
| 8 | `risk_factors` | SHAP attributions per prediction | grows (≥ 5 per prediction) | Append-only |
| 9 | `alerts` | Dispatched intelligence alerts | grows | `status`, `acknowledged_at` mutate |
| 10 | `investigations` | Case lifecycle records | grows | `status`, `priority` mutate |
| 11 | `investigation_notes` | Timestamped case notes | grows | Append-only |
| 12 | `simulation_events` | In-app transaction stream events | ephemeral | Append-only; truncated on reset |
| 13 | `model_metrics` | Published prototype evaluation results | small | Append-only per training run |
| 14 | `settings` | Single-row platform configuration | 1 | Mutates |
| 15 | `audit_events` | Privileged action record | grows | Append-only, immutable |
| 16 | `analytics_events` | Product telemetry | grows | Append-only |
| 17 | `citizen_reports` | Hash of a citizen report's tracking code (FEAT-17) | grows | Insert-only; cleared with its complaint by demo reset |

Tables 14–16 extend the thirteen named in the source specification. `settings` is required by FR-22, `audit_events` by FR-21/SR-03, and `analytics_events` by the metric definitions in `product/success-metrics.md`. Each is justified rather than assumed.

---

## 3. Enumerations

```sql
CREATE TYPE fraud_type    AS ENUM ('UPI_FRAUD','INVESTMENT_SCAM','PHISHING','JOB_SCAM','QR_FRAUD','CARD_FRAUD');
CREATE TYPE complaint_status AS ENUM ('OPEN','ANALYZING','UNDER_REVIEW','ALERT_SENT','MONITORING','RESOLVED');
CREATE TYPE account_type  AS ENUM ('VICTIM','MULE','SUSPICIOUS','MERCHANT','NORMAL');
CREATE TYPE account_status AS ENUM ('ACTIVE','DORMANT','FROZEN_SIMULATED','CLOSED');
CREATE TYPE txn_channel   AS ENUM ('UPI','IMPS','NEFT','RTGS','CARD','ATM','WALLET');
CREATE TYPE risk_indicator AS ENUM ('NONE','LOW','MEDIUM','HIGH');
CREATE TYPE risk_level     AS ENUM ('LOW','MEDIUM','HIGH');
CREATE TYPE confidence_level AS ENUM ('LOW','MEDIUM','HIGH');
CREATE TYPE factor_direction AS ENUM ('INCREASES','REDUCES');
CREATE TYPE alert_status   AS ENUM ('DRAFT','SENT','ACKNOWLEDGED','CLOSED');
CREATE TYPE alert_severity AS ENUM ('LOW','MEDIUM','HIGH');
CREATE TYPE recipient_kind AS ENUM ('LEA','BANK','I4C');
CREATE TYPE investigation_status AS ENUM ('NEW','ANALYZING','UNDER_REVIEW','ALERT_SENT','MONITORING','RESOLVED');
CREATE TYPE priority_level AS ENUM ('LOW','MEDIUM','HIGH');
CREATE TYPE actor_role     AS ENUM ('LEA','BANK','ADMIN','GUARD','I4C','CITIZEN');
CREATE TYPE record_origin  AS ENUM ('SEED','USER','DEMO');
CREATE TYPE atm_status     AS ENUM ('ACTIVE','INACTIVE','MAINTENANCE');
```

`record_origin` is what makes the demo reset safe: it is the column the scoped delete filters on, and seed rows can never carry `DEMO`.

---

## 4. Table Definitions

### 4.1 `complaints`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | bigserial | PK | |
| `complaint_id` | text | UNIQUE NOT NULL | Format `C-[0-9]{5}` |
| `fraud_type` | fraud_type | NOT NULL | |
| `amount_paise` | bigint | NOT NULL CHECK > 0 | Integer paise |
| `complaint_timestamp` | timestamptz | NOT NULL | UTC |
| `victim_lat` | double precision | NOT NULL CHECK between 6.0 and 37.5 | India bounds |
| `victim_lon` | double precision | NOT NULL CHECK between 68.0 and 97.5 | India bounds |
| `victim_h3_r8` | text | NOT NULL | Derived at insert |
| `city` | text | NOT NULL | |
| `district` | text | NOT NULL | |
| `state` | text | NOT NULL | |
| `status` | complaint_status | NOT NULL DEFAULT 'OPEN' | |
| `origin` | record_origin | NOT NULL DEFAULT 'SEED' | |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() | |

The latitude/longitude `CHECK` constraints are not decoration — they make it impossible for a generator bug or a bad import to place a complaint outside India and silently break the map.

### 4.2 `accounts`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | bigserial | PK | |
| `account_id` | text | UNIQUE NOT NULL | Format `ACC-[0-9]{8}` |
| `account_type` | account_type | NOT NULL | |
| `bank_name` | text | NOT NULL | Synthetic institution label |
| `risk_score` | real | NOT NULL DEFAULT 0 CHECK 0–1 | |
| `opened_at` | timestamptz | NOT NULL | Drives `account_age_days_min` |
| `last_activity` | timestamptz | | |
| `status` | account_status | NOT NULL DEFAULT 'ACTIVE' | |
| `home_h3_r8` | text | | Nominal operating cell |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |

There is **no name, no address, no contact column**, by design (FR-01.7, CR-01). The schema cannot hold personal data because no column exists for it.

### 4.3 `transactions`

| Column | Type | Constraints |
|---|---|---|
| `id` | bigserial | PK |
| `transaction_id` | text | UNIQUE NOT NULL, format `TXN-[0-9]{10}` |
| `complaint_id` | bigint | FK → `complaints.id` ON DELETE RESTRICT, NULLABLE |
| `from_account_id` | bigint | FK → `accounts.id` NOT NULL |
| `to_account_id` | bigint | FK → `accounts.id` NOT NULL |
| `amount_paise` | bigint | NOT NULL CHECK > 0 |
| `timestamp` | timestamptz | NOT NULL |
| `channel` | txn_channel | NOT NULL |
| `latitude` | double precision | |
| `longitude` | double precision | |
| `h3_r8` | text | |
| `risk_indicator` | risk_indicator | NOT NULL DEFAULT 'NONE' |
| `hop_index` | smallint | NOT NULL DEFAULT 0 — position in the layering chain |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |

`CHECK (from_account_id <> to_account_id)` prevents self-transfers.
`hop_index` is stored rather than derived because the graph traversal and the `linked_depth` feature both need it, and recomputing it per request would be the single most expensive query in the system.

### 4.4 `withdrawals`

| Column | Type | Constraints |
|---|---|---|
| `id` | bigserial | PK |
| `withdrawal_id` | text | UNIQUE NOT NULL |
| `account_id` | bigint | FK → `accounts.id` NOT NULL |
| `atm_id` | bigint | FK → `atms.id` NOT NULL |
| `complaint_id` | bigint | FK → `complaints.id` NULLABLE — the ground-truth link used for training labels |
| `amount_paise` | bigint | NOT NULL CHECK > 0 |
| `timestamp` | timestamptz | NOT NULL |
| `h3_r8` | text | NOT NULL — denormalised from the ATM for fast label joins |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |

`complaint_id` here is the **label column**. It is what makes supervised training possible on the synthetic corpus, and it is exactly the column that would be absent in production — a limitation stated openly in `ai/evaluation-framework.md`.

### 4.5 `atms`

| Column | Type | Constraints |
|---|---|---|
| `id` | bigserial | PK |
| `atm_id` | text | UNIQUE NOT NULL, format `ATM-[0-9]{3,5}` |
| `bank_name` | text | NOT NULL |
| `latitude` / `longitude` | double precision | NOT NULL, India-bounds CHECK |
| `h3_r8` / `h3_r9` | text | NOT NULL — r8 for hotspot cells, r9 for density |
| `locality` | text | nullable — the zone inside the city ("T Nagar" within Chennai) |
| `city` / `district` / `state` | text | NOT NULL |
| `status` | atm_status | NOT NULL DEFAULT 'ACTIVE' |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |

### 4.5a `guard_posts`

A staffed duty **position** at one ATM — not a person. The table has nowhere to
put a name, phone number or any other personal identifier, which is the same
rule `accounts` follows: FR-01.7 and `pii_scan.py` reject those shapes in the
corpus and TC-SEC-022 introspects the schema for them. Who stands at a post on
a given day is the operating bank's record, never this prototype's.

| Column | Type | Constraints |
|---|---|---|
| `id` | bigserial | PK |
| `post_id` | text | UNIQUE NOT NULL, format `GRD-[0-9]{5}` |
| `atm_id` | bigint | NOT NULL FK → `atms.id` |
| `shift_start_hour_ist` | integer | NOT NULL, CHECK 0–23 |
| `shift_end_hour_ist` | integer | NOT NULL, CHECK 0–23, CHECK ≠ start |
| `origin` | record_origin | NOT NULL DEFAULT 'SEED' |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |

UNIQUE `(atm_id, shift_start_hour_ist)` — one post per ATM per shift start.
Index `idx_guard_posts_atm_id` serves `guardPostService.listForCell`, the posts
covering the ATMs inside a predicted hotspot cell.

### 4.6 `hotspots`

| Column | Type | Constraints |
|---|---|---|
| `id` | bigserial | PK |
| `h3_index` | text | UNIQUE NOT NULL — resolution 8 |
| `name` | text | NOT NULL — locality label from the centroid's district |
| `latitude` / `longitude` | double precision | NOT NULL — cell centroid |
| `city` / `district` / `state` | text | NOT NULL |
| `risk_score` | real | NOT NULL CHECK 0–1 |
| `risk_level` | risk_level | NOT NULL |
| `expected_start` / `expected_end` | timestamptz | NULLABLE |
| `likely_atm_count` | integer | NOT NULL DEFAULT 0 |
| `historical_frequency` | real | NOT NULL DEFAULT 0 |
| `last_refreshed_at` | timestamptz | NOT NULL DEFAULT now() |

### 4.7 `predictions`

| Column | Type | Constraints |
|---|---|---|
| `id` | bigserial | PK |
| `prediction_ref` | text | UNIQUE NOT NULL, format `PRD-[0-9]{4,}` |
| `complaint_id` | bigint | FK → `complaints.id` NOT NULL |
| `hotspot_id` | bigint | FK → `hotspots.id` NOT NULL — the top-ranked cell |
| `risk_score` | real | NOT NULL CHECK 0–1 |
| `risk_level` | risk_level | NOT NULL |
| `confidence` | confidence_level | NOT NULL |
| `predicted_start` / `predicted_end` | timestamptz | NOT NULL |
| `window_confidence` | confidence_level | NOT NULL |
| `window_fallback` | boolean | NOT NULL DEFAULT false |
| `likely_atms` | integer | NOT NULL DEFAULT 0 |
| `estimated_exposure_paise` | bigint | NOT NULL DEFAULT 0 |
| `ranked_hotspots` | jsonb | NOT NULL — the full ordered list as returned |
| `explanation_available` | boolean | NOT NULL DEFAULT true |
| `clustering_fallback` | boolean | NOT NULL DEFAULT false |
| `model_version` | text | NOT NULL |
| `feature_schema_version` | text | NOT NULL |
| `inference_ms` | integer | |
| `origin` | record_origin | NOT NULL DEFAULT 'USER' |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |

`CHECK (predicted_end > predicted_start AND predicted_end - predicted_start <= interval '4 hours')` enforces AC-008-02 in the database, so no code path can persist an over-wide window.

`ranked_hotspots` is stored as `jsonb` rather than a child table because it is written once, read whole, and never queried by its elements. Storing it preserves exactly what the model returned, which is what makes NFR-26 verifiable.

### 4.8 `risk_factors`

| Column | Type | Constraints |
|---|---|---|
| `id` | bigserial | PK |
| `prediction_id` | bigint | FK → `predictions.id` ON DELETE CASCADE NOT NULL |
| `factor_name` | text | NOT NULL |
| `contribution` | real | NOT NULL CHECK between −100 and 100 |
| `direction` | factor_direction | NOT NULL |
| `rank` | smallint | NOT NULL |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |

`UNIQUE (prediction_id, rank)`. Cascade delete is correct here and only here: a factor has no meaning without its prediction.

### 4.9 `alerts`

| Column | Type | Constraints |
|---|---|---|
| `id` | bigserial | PK |
| `alert_id` | text | UNIQUE NOT NULL, format `ALT-[0-9]{4,}` |
| `prediction_id` | bigint | FK → `predictions.id` NOT NULL |
| `investigation_id` | bigint | FK → `investigations.id` NULLABLE |
| `severity` | alert_severity | NOT NULL — derived server-side |
| `location_name` | text | NOT NULL |
| `latitude` / `longitude` | double precision | NOT NULL |
| `window_start` / `window_end` | timestamptz | NOT NULL |
| `exposure_paise` | bigint | NOT NULL |
| `recipients` | recipient_kind[] | NOT NULL CHECK `array_length >= 1` |
| `notes` | text | |
| `status` | alert_status | NOT NULL DEFAULT 'SENT' |
| `created_by_role` | actor_role | NOT NULL |
| `origin` | record_origin | NOT NULL DEFAULT 'USER' |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |
| `acknowledged_at` | timestamptz | |
| `acknowledged_by_role` | actor_role | |

The `array_length >= 1` check enforces AC-011-03 at the storage layer, not only in validation.

### 4.10 `investigations`

| Column | Type | Constraints |
|---|---|---|
| `id` | bigserial | PK |
| `case_id` | text | UNIQUE NOT NULL, format `INV-[0-9]{4,}` |
| `complaint_id` | bigint | FK → `complaints.id` **UNIQUE** NOT NULL |
| `assigned_role` | actor_role | NOT NULL DEFAULT 'LEA' |
| `status` | investigation_status | NOT NULL DEFAULT 'NEW' |
| `priority` | priority_level | NOT NULL DEFAULT 'MEDIUM' |
| `origin` | record_origin | NOT NULL DEFAULT 'USER' |
| `created_at` / `updated_at` | timestamptz | NOT NULL DEFAULT now() |

The unique constraint on `complaint_id` is what guarantees "one complaint, one case" and makes the alert-dispatch upsert deterministic under concurrency.

### 4.11 `investigation_notes`

`id`, `investigation_id` FK (CASCADE), `body` text NOT NULL CHECK `length(trim(body)) > 0`, `author_role` actor_role NOT NULL, `created_at`. The check enforces AC-012-04's rejection of empty notes in the database.

### 4.12 `simulation_events`

`id`, `event_ref` text UNIQUE, `payload` jsonb NOT NULL, `emitted_at` timestamptz NOT NULL, `created_at`. Truncated by simulation reset. Deliberately isolated from `transactions` so a simulation can never contaminate the analysable corpus (FR-24.1).

### 4.13 `model_metrics`

| Column | Type |
|---|---|
| `id` | bigserial PK |
| `model_version` | text NOT NULL |
| `trained_at` | timestamptz NOT NULL |
| `dataset_seed` | integer NOT NULL |
| `split` | text NOT NULL — `holdout` \| `cv` |
| `precision` / `recall` / `f1` / `roc_auc` | real NOT NULL |
| `top1_hit_rate` / `top3_hit_rate` / `top5_hit_rate` | real NOT NULL |
| `temporal_exact` / `temporal_within_1` | real NOT NULL |
| `calibration_ece` | real |
| `operating_threshold` | real NOT NULL |
| `n_train` / `n_test` | integer NOT NULL |
| `notes` | text |
| `created_at` | timestamptz NOT NULL DEFAULT now() |

`UNIQUE (model_version, trained_at)`. `dataset_seed` is stored so that any published metric can be traced to the exact corpus it was measured on.

### 4.14 `settings`

Single row enforced by `CHECK (id = 1)`. Columns: `threshold_high` real NOT NULL DEFAULT 0.70, `threshold_medium` real NOT NULL DEFAULT 0.40 with `CHECK (threshold_high > threshold_medium)`, `system_mode` text NOT NULL DEFAULT 'PROTOTYPE', `data_mode` text NOT NULL DEFAULT 'SYNTHETIC', `active_model_version` text NOT NULL, `notify_toast_on_alert` boolean, `notify_announce_prediction` boolean, `updated_at`.

The `CHECK` implements AC-015-03's rejection rule at the storage layer.

### 4.15 `audit_events`

`id`, `actor_role` actor_role NOT NULL, `action` text NOT NULL, `subject_type` text NOT NULL, `subject_id` bigint NOT NULL, `metadata` jsonb, `occurred_at` timestamptz NOT NULL DEFAULT now().

No update or delete path exists in application code. A database role used by the application is granted `INSERT` and `SELECT` on this table only.

### 4.16 `analytics_events`

`id`, `event` text NOT NULL, `session_id` uuid NOT NULL, `role` actor_role NOT NULL, `route` text NOT NULL, `props` jsonb NOT NULL DEFAULT '{}', `app_version` text, `model_version` text, `occurred_at` timestamptz NOT NULL DEFAULT now(). No identity column exists (see `product/product-analytics.md` §6).

### 4.17 `citizen_reports` (FEAT-17, ADR-022, migration 0006)

`complaint_id` bigint PRIMARY KEY REFERENCES complaints(id) ON DELETE CASCADE, `tracking_hash` text NOT NULL with `CHECK (tracking_hash ~ '^[0-9a-f]{64}$')`, `created_at` timestamptz NOT NULL DEFAULT now().

A citizen report is a `complaints` row (`origin = 'DEMO'`) plus this row, nothing more. The table holds a foreign key, a SHA-256 hash and a timestamp — there is no column in which a name, phone or contact detail could be stored. The primary key is the only index; the one query (status lookup by complaint) joins on it.

Citizen complaint IDs come from `citizen_complaint_seq` (`START 90000 MINVALUE 90000 MAXVALUE 99999 NO CYCLE`), rendered `'C-' || nextval(...)`, so they satisfy `complaints_complaint_id_format` and cannot collide with the seed corpus, which tops out at `C-10284`. Demo reset never rewinds the sequence.

---

## 5. Indexes and Their Justification

| Index | Table | Columns | Serves |
|---|---|---|---|
| `idx_complaints_ts` | complaints | `complaint_timestamp DESC` | Default list ordering |
| `idx_complaints_filters` | complaints | `(state, fraud_type, complaint_timestamp DESC)` | The dominant filter combination |
| `idx_complaints_status` | complaints | `status` | Status filter and KPI counts |
| `idx_complaints_city` | complaints | `city` | City filter and search |
| `idx_complaints_h3` | complaints | `victim_h3_r8` | Distance feature and spatial joins |
| `idx_accounts_account_id` | accounts | `account_id` (unique) | Lookup by business key |
| `idx_accounts_risk` | accounts | `risk_score DESC` | Linked-account ordering |
| `idx_txn_from_ts` | transactions | `(from_account_id, timestamp)` | Forward graph traversal |
| `idx_txn_to_ts` | transactions | `(to_account_id, timestamp)` | Reverse traversal |
| `idx_txn_complaint` | transactions | `complaint_id` | Complaint timeline |
| `idx_txn_ts` | transactions | `timestamp DESC` | Ledger ordering |
| `idx_txn_risk` | transactions | `risk_indicator` | Suspicious-transaction KPI |
| `idx_wd_account` | withdrawals | `account_id` | Withdrawal history per account |
| `idx_wd_atm_ts` | withdrawals | `(atm_id, timestamp)` | ATM history in the graph drawer |
| `idx_wd_h3_ts` | withdrawals | `(h3_r8, timestamp)` | Historical hotspot feature — the hottest training query |
| `idx_wd_complaint` | withdrawals | `complaint_id` | Label join during training |
| `idx_atms_h3r8` | atms | `h3_r8` | ATM density per cell |
| `idx_atms_h3r9` | atms | `h3_r9` | Fine-grained density |
| `idx_atms_bbox` | atms | `(latitude, longitude)` | Viewport-scoped map queries |
| `idx_hotspots_h3` | hotspots | `h3_index` (unique) | Cell lookup |
| `idx_hotspots_score` | hotspots | `risk_score DESC` | Ranked list and map layer |
| `idx_pred_complaint_created` | predictions | `(complaint_id, created_at DESC)` | "Latest prediction for this complaint" |
| `idx_rf_prediction_rank` | risk_factors | `(prediction_id, rank)` (unique) | Ordered factor retrieval |
| `idx_alerts_status_created` | alerts | `(status, created_at DESC)` | Alerts list and dashboard panel |
| `idx_alerts_severity` | alerts | `severity` | Severity filter and KPI |
| `idx_alerts_prediction` | alerts | `prediction_id` | Alert ↔ prediction join |
| `idx_inv_complaint` | investigations | `complaint_id` (unique) | One case per complaint |
| `idx_inv_status_updated` | investigations | `(status, updated_at DESC)` | Case list |
| `idx_notes_inv_created` | investigation_notes | `(investigation_id, created_at DESC)` | Timeline |
| `idx_audit_subject` | audit_events | `(subject_type, subject_id, occurred_at DESC)` | Audit reconstruction |
| `idx_metrics_version` | model_metrics | `(model_version, trained_at DESC)` | Latest metrics |

**Index discipline.** Thirty-one indexes across sixteen tables is deliberate, not incidental. Each one above names the query it serves; an index whose query is removed must be removed with it. `engineering/performance.md` requires `EXPLAIN ANALYZE` evidence for any new index.

---

## 6. Relationships

```
complaints 1──n transactions          (complaint_id, nullable)
complaints 1──n withdrawals           (complaint_id, nullable — the training label)
complaints 1──n predictions
complaints 1──1 investigations        (unique constraint)
accounts   1──n transactions          (twice: from_account_id, to_account_id)
accounts   1──n withdrawals
atms       1──n withdrawals
hotspots   1──n predictions
predictions 1──n risk_factors         (cascade)
predictions 1──n alerts
investigations 1──n alerts
investigations 1──n investigation_notes (cascade)
```

The double relationship between `accounts` and `transactions` is what makes the money trail a graph rather than a tree, and is the reason traversal needs both `idx_txn_from_ts` and `idx_txn_to_ts`.

---

## 7. The Graph Traversal Query

The single most performance-sensitive query in the system. Bounded recursive CTE with an explicit visited set:

```sql
WITH RECURSIVE trail AS (
  SELECT t.id, t.from_account_id, t.to_account_id, t.amount_paise,
         t.timestamp, t.channel, 1 AS depth,
         ARRAY[t.from_account_id, t.to_account_id] AS visited
  FROM transactions t
  WHERE t.complaint_id = $1

  UNION ALL

  SELECT t.id, t.from_account_id, t.to_account_id, t.amount_paise,
         t.timestamp, t.channel, tr.depth + 1,
         tr.visited || t.to_account_id
  FROM transactions t
  JOIN trail tr ON t.from_account_id = tr.to_account_id
  WHERE tr.depth < $2                       -- bounded, max 6
    AND NOT (t.to_account_id = ANY(tr.visited))   -- cycle guard
)
SELECT * FROM trail LIMIT 500;
```

Three protections in one query: a depth bound (FR-04.3), a cycle guard (the `visited` array), and a hard row cap. Any of the three alone would be insufficient — a cyclic chain within the depth bound would still loop without the visited set, and a wide fan-out within both bounds would still return unbounded rows without the `LIMIT`.

---

## 8. Migration Strategy

| Rule | Detail |
|---|---|
| Tooling | `drizzle-kit generate` produces SQL; SQL is reviewed and committed; `drizzle-kit migrate` applies |
| Naming | `NNNN_verb_subject.sql`, e.g. `0003_add_audit_events.sql` |
| Reversibility | Every migration has a documented rollback, either a down migration or a written procedure |
| Additive first | New columns are nullable or defaulted; a required column arrives in three steps (add nullable → backfill → set not null) |
| No destructive change without a decision-log entry | Drops and type narrowings are reviewed explicitly |
| Enums | Extended with `ALTER TYPE ... ADD VALUE`; removal requires a type rebuild and is documented as such |
| CI | Migrations run against a clean database on every PR; a failure blocks merge |
| Baseline | `0001_init.sql` creates all enums and tables; `0002` … add indexes, audit, analytics and settings |

---

## 9. Seeding

Idempotent. Truncates in reverse dependency order within one transaction, then inserts from the generator's output:

```
analytics_events → audit_events → investigation_notes → investigations
→ alerts → risk_factors → predictions → simulation_events
→ withdrawals → transactions → hotspots → atms → accounts → complaints
→ model_metrics → settings
```

The pipeline gates are non-bypassable: `signal_check` must pass before training and `pii_scan` must pass before seeding (FR-01.9, AC-016-04, AC-016-06).

---

## 10. Backup, Retention and Scaling

**Backup.** Neon's point-in-time restore is the mechanism; the deterministic generator is the true recovery path — the entire corpus is reproducible from seed `26184`, so backup exists to protect user-generated alerts and investigations rather than the dataset.

**Retention.** Nothing is deleted in the prototype except demo-origin rows. `analytics_events` and `audit_events` would need a retention policy at real scale; their absence here is a stated prototype limitation.

**Scaling limits and their remedies** (detailed in `architecture/scalability.md`): `transactions` is the first table to feel pressure and would be partitioned by month; `analytics_events` and `audit_events` would move to append-optimised storage; the recursive CTE would be replaced by a materialised edge table or a dedicated graph store beyond roughly 10⁷ transactions; `predictions.ranked_hotspots` as `jsonb` is correct at this scale but would become a child table if the elements ever needed querying.
