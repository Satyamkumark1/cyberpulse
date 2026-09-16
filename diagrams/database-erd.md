# DIAGRAM — DATABASE ERD

Full column definitions, constraints, indexes and rationale are in `architecture/database-design.md`. This document is the visual index.

---

## D-20 · Core entity relationships

```mermaid
erDiagram
  COMPLAINTS ||--o{ TRANSACTIONS : "originates"
  COMPLAINTS ||--o{ WITHDRAWALS : "labels (ground truth)"
  COMPLAINTS ||--o{ PREDICTIONS : "is analysed by"
  COMPLAINTS ||--o| INVESTIGATIONS : "has one case"

  ACCOUNTS ||--o{ TRANSACTIONS : "sends"
  ACCOUNTS ||--o{ TRANSACTIONS : "receives"
  ACCOUNTS ||--o{ WITHDRAWALS : "withdraws via"

  ATMS ||--o{ WITHDRAWALS : "hosts"

  HOTSPOTS ||--o{ PREDICTIONS : "is predicted as"

  PREDICTIONS ||--o{ RISK_FACTORS : "is explained by"
  PREDICTIONS ||--o{ ALERTS : "justifies"

  INVESTIGATIONS ||--o{ ALERTS : "tracks"
  INVESTIGATIONS ||--o{ INVESTIGATION_NOTES : "records"

  COMPLAINTS {
    bigserial id PK
    text complaint_id UK
    fraud_type fraud_type
    bigint amount_paise
    timestamptz complaint_timestamp
    double victim_lat
    double victim_lon
    text victim_h3_r8
    text city
    text district
    text state
    complaint_status status
    record_origin origin
  }

  ACCOUNTS {
    bigserial id PK
    text account_id UK
    account_type account_type
    text bank_name
    real risk_score
    timestamptz opened_at
    timestamptz last_activity
    account_status status
    text home_h3_r8
  }

  TRANSACTIONS {
    bigserial id PK
    text transaction_id UK
    bigint complaint_id FK
    bigint from_account_id FK
    bigint to_account_id FK
    bigint amount_paise
    timestamptz timestamp
    txn_channel channel
    double latitude
    double longitude
    text h3_r8
    risk_indicator risk_indicator
    smallint hop_index
  }

  WITHDRAWALS {
    bigserial id PK
    text withdrawal_id UK
    bigint account_id FK
    bigint atm_id FK
    bigint complaint_id FK
    bigint amount_paise
    timestamptz timestamp
    text h3_r8
  }

  ATMS {
    bigserial id PK
    text atm_id UK
    text bank_name
    double latitude
    double longitude
    text h3_r8
    text h3_r9
    text city
    text district
    text state
    atm_status status
  }

  HOTSPOTS {
    bigserial id PK
    text h3_index UK
    text name
    double latitude
    double longitude
    text district
    text state
    real risk_score
    risk_level risk_level
    timestamptz expected_start
    timestamptz expected_end
    integer likely_atm_count
    real historical_frequency
  }

  PREDICTIONS {
    bigserial id PK
    text prediction_ref UK
    bigint complaint_id FK
    bigint hotspot_id FK
    real risk_score
    risk_level risk_level
    confidence_level confidence
    timestamptz predicted_start
    timestamptz predicted_end
    confidence_level window_confidence
    boolean window_fallback
    integer likely_atms
    bigint estimated_exposure_paise
    jsonb ranked_hotspots
    boolean explanation_available
    boolean clustering_fallback
    text model_version
    text feature_schema_version
    record_origin origin
  }

  RISK_FACTORS {
    bigserial id PK
    bigint prediction_id FK
    text factor_name
    real contribution
    factor_direction direction
    smallint rank
  }

  ALERTS {
    bigserial id PK
    text alert_id UK
    bigint prediction_id FK
    bigint investigation_id FK
    alert_severity severity
    text location_name
    double latitude
    double longitude
    timestamptz window_start
    timestamptz window_end
    bigint exposure_paise
    array recipients
    alert_status status
    actor_role created_by_role
    record_origin origin
    timestamptz acknowledged_at
  }

  INVESTIGATIONS {
    bigserial id PK
    text case_id UK
    bigint complaint_id FK "UNIQUE"
    actor_role assigned_role
    investigation_status status
    priority_level priority
    record_origin origin
    timestamptz updated_at
  }

  INVESTIGATION_NOTES {
    bigserial id PK
    bigint investigation_id FK
    text body
    actor_role author_role
    timestamptz created_at
  }
```

---

## D-21 · Supporting tables

```mermaid
erDiagram
  SIMULATION_EVENTS {
    bigserial id PK
    text event_ref UK
    jsonb payload
    timestamptz emitted_at
  }
  MODEL_METRICS {
    bigserial id PK
    text model_version
    timestamptz trained_at
    integer dataset_seed
    text split
    real precision
    real recall
    real f1
    real roc_auc
    real top1_hit_rate
    real top3_hit_rate
    real top5_hit_rate
    real temporal_exact
    real temporal_within_1
    real calibration_ece
    real operating_threshold
    integer n_train
    integer n_test
  }
  SETTINGS {
    bigserial id PK "CHECK id = 1"
    real threshold_high
    real threshold_medium
    text system_mode
    text data_mode
    text active_model_version
    boolean notify_toast_on_alert
    boolean notify_announce_prediction
  }
  AUDIT_EVENTS {
    bigserial id PK
    actor_role actor_role
    text action
    text subject_type
    bigint subject_id
    jsonb metadata
    timestamptz occurred_at
  }
  ANALYTICS_EVENTS {
    bigserial id PK
    text event
    uuid session_id
    actor_role role
    text route
    jsonb props
    text app_version
    text model_version
    timestamptz occurred_at
  }
```

These five tables carry no foreign keys by design. `audit_events` and `analytics_events` reference subjects by type and ID rather than by constraint, so a subject's later removal cannot cascade away its record. `simulation_events` is deliberately isolated from `transactions` so a simulation can never contaminate the analysable corpus.

---

## D-22 · Absence of personal data

```mermaid
graph LR
  subgraph "Columns that exist"
    C1[account_id<br/>ACC-88123390]
    C2[bank_name<br/>synthetic label]
    C3[risk_score]
    C4[city / district / state]
    C5[h3 index]
  end
  subgraph "Columns that do not exist anywhere"
    X1[name]:::none
    X2[address]:::none
    X3[phone]:::none
    X4[email]:::none
    X5[Aadhaar / PAN]:::none
    X6[real account number]:::none
    X7[IP address]:::none
  end
  classDef none fill:#FBEAE8,stroke:#C0392B,stroke-dasharray:4 4,color:#C0392B
```

This is the structural implementation of CR-01: the schema has nowhere to put personal data, so no adapter, import or feature can introduce it without a visible migration and a review.

---

## D-23 · Cascade and origin behaviour

```mermaid
graph TB
  P[predictions] -->|ON DELETE CASCADE| RF[risk_factors]
  I[investigations] -->|ON DELETE CASCADE| N[investigation_notes]
  C[complaints] -->|ON DELETE RESTRICT| T[transactions]
  C -->|ON DELETE RESTRICT| P

  subgraph "The only delete path in the system"
    DR[POST /api/demo/reset] --> F{origin = 'DEMO'}
    F --> DA[alerts]
    F --> DI[investigations]
  end

  style DR fill:#FDF2E2,stroke:#C97A0E
```

`CASCADE` appears exactly twice, in both cases where the child has no meaning without its parent. Everything else is `RESTRICT`. The demo reset is the only delete path in application code, and the `origin` filter is what makes it incapable of touching seed data.

---

## D-24 · Index coverage of hot paths

```mermaid
graph LR
  Q1[Complaint list<br/>state + fraud type] --> I1[idx_complaints_filters]
  Q2[Complaint detail chain] --> I2[idx_txn_complaint]
  Q3[Graph traversal forward] --> I3[idx_txn_from_ts]
  Q4[Graph traversal reverse] --> I4[idx_txn_to_ts]
  Q5[Historical hotspot feature] --> I5[idx_wd_h3_ts]
  Q6[Map hotspot layer] --> I6[idx_hotspots_score]
  Q7[ATM viewport query] --> I7[idx_atms_bbox]
  Q8[Latest prediction] --> I8[idx_pred_complaint_created]
  Q9[Alerts list + dashboard] --> I9[idx_alerts_status_created]
  Q10[Ordered factors] --> I10[idx_rf_prediction_rank]
  Q11[Audit reconstruction] --> I11[idx_audit_subject]
```

Every index names the query it serves. An index whose query is deleted is deleted with it.
