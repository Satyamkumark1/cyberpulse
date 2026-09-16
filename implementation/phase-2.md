# PHASE 2 — INFRASTRUCTURE & DATA FOUNDATION

| Field | Value |
|---|---|
| Duration | 12 person-days · Week 1, days 3–7 |
| Output | A running skeleton, a migrated schema, a validated synthetic corpus, CI, health |
| Entry | Phase 1 exited |
| Features | FEAT-16, part of FEAT-15 (health) |

---

## 1. Objectives

1. Stand up the monorepo, both runtimes and Docker Compose so any developer reaches a running stack in under 30 minutes.
2. Create the schema with every constraint enforced by PostgreSQL, not only by application validation.
3. Build the deterministic synthetic generator and prove its output contains learnable signal.
4. Make the two non-bypassable gates real: `signal_check` before training, `pii_scan` before seeding.
5. Establish CI, structured logging and the composed health endpoint.

---

## 2. Deliverables

| Deliverable | Acceptance |
|---|---|
| pnpm workspace monorepo | `apps/web`, `apps/ml-service`, `packages/{db,shared,config}`, `scripts/` |
| Docker Compose | Three services with health checks; models mounted read-only |
| `Makefile` | `make setup`, `make dev`, `make verify` |
| Drizzle schema | 16 tables, 17 enums, all constraints, 31 indexes |
| Migrations | `0001_init.sql` … , reviewed SQL, rollback notes |
| `packages/shared` | JSON Schema → Zod + Pydantic generation working |
| Synthetic generator | 500 / 12,000 / 60,000 / 2,400 / 520 with 8 planted patterns |
| `signal_check.py` | Blocks training on any undetectable pattern |
| `pii_scan.py` | Blocks seeding on any match |
| Seeding | Idempotent, checksum-verified, dependency-ordered |
| FastAPI skeleton | `/health` reporting `modelLoaded` |
| Next.js skeleton | Shell, sidebar, header, prototype badge |
| `GET /api/health` | Composes web, database, ML with per-component latency |
| CI pipeline | Gates 1–7 green |
| Structured logging | JSON lines with `requestId` in both services |

---

## 3. Implementation Tasks

| # | Task | Owner | Days |
|---|---|---|---|
| T-2.1 | Monorepo, workspace config, shared ESLint/TS/Tailwind presets | Frontend | 0.5 |
| T-2.2 | Docker Compose with health checks and read-only model mount | DevOps | 0.5 |
| T-2.3 | Drizzle schema: tables, enums, constraints, indexes | DB | 1.5 |
| T-2.4 | Migrations with rollback notes | DB | 0.5 |
| T-2.5 | `packages/shared` schema → Zod + Pydantic codegen | Backend | 1.0 |
| T-2.6 | Generator: regions, fraud types, chains, ATM placement | ML | 2.0 |
| T-2.7 | Plant the 8 latent patterns | ML | 1.0 |
| T-2.8 | `signal_check.py` with 8 statistical tests | ML | 0.75 |
| T-2.9 | `pii_scan.py` with 6 pattern classes | Security | 0.5 |
| T-2.10 | Seeding with manifest checksum verification | DB | 0.75 |
| T-2.11 | FastAPI skeleton, lifespan loading, `/health` | ML | 0.75 |
| T-2.12 | Next.js shell, sidebar, header, prototype badge | Frontend | 1.0 |
| T-2.13 | `GET /api/health` composition | Backend | 0.5 |
| T-2.14 | CI pipeline gates 1–7 | DevOps | 1.0 |
| T-2.15 | Structured logging both services | Backend | 0.5 |
| T-2.16 | `make setup` and README setup path | DevOps | 0.25 |

---

## 4. Dependencies

**Inbound:** Phase 1 schema design, generator design, API contract.
**Outbound:** P3 cannot train without a corpus that passes `signal_check`; P3 cannot build against the contract without `packages/shared` generation working.

**Internal order:** schema → migrations → generator → signal check → PII scan → seed. The generator can be written in parallel with the schema, but cannot be validated until the schema exists.

---

## 5. Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **RSK-01 — generator produces no learnable signal** | Medium | **Critical** | `signal_check` is written *before* the patterns are planted, so the check drives the generator rather than rationalising it |
| Generator complexity overruns | Medium | High | Volumes are parameterised; start at 10% scale and grow once patterns verify |
| Schema churn in later phases | Medium | Medium | Constraints designed in P1; changes require a decision-log entry |
| Codegen tooling friction | Low | Medium | Generated output is committed, so a fresh clone type-checks without running codegen |
| Docker parity problems on mixed machines | Medium | Low | Pinned image tags; `make setup` verified on each team member's machine before the phase exits |
| CI free-tier minutes exhausted | Low | Medium | Concurrency cancellation; aggressive caching |

---

## 6. Acceptance Criteria

**AC-P2-01** — `make setup` from a clean clone produces a running, seeded stack in ≤ 30 minutes (NFR-17).
**AC-P2-02** — Migrations apply cleanly to an empty database and every documented constraint is enforced by PostgreSQL.
**AC-P2-03** — The generator with seed 26184 produces byte-identical output on repeated runs (AC-016-02).
**AC-P2-04** — Volume floors met; six fraud types; seven metro clusters; ≥ 90% of complaints resolve to a depth-2–4 chain.
**AC-P2-05** — `signal_check.py` passes on a valid corpus and exits non-zero when a pattern is removed, blocking training.
**AC-P2-06** — `pii_scan.py` reports zero matches on the corpus and blocks seeding on a deliberately tainted copy.
**AC-P2-07** — Seeding is idempotent and verifies every manifest checksum before inserting.
**AC-P2-08** — `GET /api/health` reports all three components with latency; stopping ML changes the overall status to `degraded` within one poll.
**AC-P2-09** — CI gates 1–7 run and block on failure.
**AC-P2-10** — The prototype badge and disclaimer render on every route of the shell.
**AC-P2-11** — A field rename in `packages/shared` breaks both the TypeScript build and the Python type check.

---

## 7. Test Strategy

Data-pipeline correctness dominates this phase, because everything downstream inherits it. Testing is weighted towards determinism, gate behaviour and constraint enforcement — and specifically towards **proving the gates block**, not merely that they run.

---

## 8. Phase 2 Test Cases

| ID | Title | Priority | Type |
|---|---|---|---|
| TC-DATA-001 | Generator produces the complete output set | Critical | Data |
| TC-DATA-002 | Byte-identical regeneration; a different seed differs | Critical | Data |
| TC-DATA-003 | Volume floors met | High | Data |
| TC-DATA-004 | Exactly six fraud types, each with ≥ 30 complaints | High | Data |
| TC-DATA-005 | Seven metro clusters; all coordinates inside India bounds | High | Data |
| TC-DATA-006 | All eight planted patterns detectable | Critical | Data |
| TC-DATA-007 | ≥ 90% of complaints resolve to a depth-2–4 chain; no self-transfer | High | Data |
| TC-DATA-008 | `npm run generate:data` succeeds from a clean clone | Medium | Data |
| TC-DATA-009 | Signal check blocks training when a pattern is removed | Critical | Data |
| TC-SEC-020 | PII scan blocks seeding on a tainted corpus | Critical | Security |
| TC-SEC-022 | Schema introspection finds zero personal-data columns | Critical | Security |
| TC-INT-080 | Health composes all three components and never throws | High | Integration |
| TC-INT-081 | Health distinguishes warming from down | Medium | Integration |
| TC-API-080 | Health endpoint contract | High | API |
| TC-DOC-001 | Clean clone to running stack ≤ 30 minutes | High | Documentation |
| TC-P2-01 | Migrations apply to an empty database | Critical | Integration |
| TC-P2-02 | Every constraint rejects its invalid value | Critical | Integration |
| TC-P2-03 | Seeding is idempotent | High | Integration |
| TC-P2-04 | Manifest checksum mismatch aborts seeding | High | Integration |
| TC-P2-05 | Contract codegen breaks both builds on a rename | High | Integration |
| TC-P2-06 | Prototype badge on every shell route | High | UI |
| TC-P2-07 | Environment validation refuses to boot on a missing variable | High | Integration |
| TC-P2-08 | Structured logs carry `requestId` and no request bodies | High | Security |

### Detail — the four cases that define the phase

**TC-P2-02 — every constraint rejects its invalid value.** For each of: window width > 4 h on `predictions`; a second investigation for one complaint; an empty recipients array; `thresholdHigh <= thresholdMedium`; a whitespace-only note body; a self-transfer; a coordinate outside India bounds — attempt a direct insert bypassing application validation.
**Expected:** PostgreSQL rejects all seven. A constraint that exists only in Zod is a finding.

**TC-DATA-009 — the signal gate blocks.** Generate a corpus with the time-of-day pattern disabled; run `signal_check.py`; attempt `train:model`.
**Expected:** Non-zero exit naming the failed pattern; training blocked; no CI flag bypasses it.

**TC-SEC-020 — the PII gate blocks.** Inject a name, an Aadhaar-shaped number, a PAN-shaped string, a mobile number and an email into a copy of the corpus; run `pii_scan.py`; attempt `db:seed`.
**Expected:** Every category reported; non-zero exit; seeding blocked.

**TC-P2-05 — the contract is one definition.** Rename a field in `packages/shared/schemas/prediction.schema.json`; run both builds.
**Expected:** `tsc --noEmit` fails and `mypy` fails, in the same commit.

---

## 9. Regression Tests

None from prior phases — P2 is the first implementation phase. P1's documentation checks are re-run if any contract, schema or requirement changed during P2:

- TC-DOC-015 if the schema changed
- TC-DOC-014 if the API contract changed
- TC-DOC-021 if any shared value changed

---

## 10. Security Validation

| Check | Case |
|---|---|
| Zero personal-data columns in any table | TC-SEC-022 |
| PII scan blocks seeding | TC-SEC-020 |
| No secret in the client bundle | TC-SEC-003 |
| Environment validated at startup | TC-P2-07 |
| Logs carry no request bodies or resolved paths | TC-P2-08 |
| Dependency audit clean | TC-SEC-040 |
| Secret scan clean on the diff and the bundle | CI gate 6 |
| `MODEL_DIR` mounted read-only | TC-SEC-019 (partial — full check in P3) |

---

## 11. Performance Validation

| Check | Target | Case |
|---|---|---|
| Migrations on an empty database | ≤ 30 s | TC-P2-01 |
| Full generation | ≤ 3 min | TC-DATA-008 |
| Seeding 75,000 rows | ≤ 90 s | TC-P2-03 |
| `GET /api/health` p95 | ≤ 200 ms | TC-API-080 |
| `make setup` total | ≤ 30 min | TC-DOC-001 |

Indexes are created in this phase, but index *effectiveness* is measured in P3 and P6 when real query patterns exist. Measuring plan quality against an empty query set would be meaningless.

---

## 12. Exit Criteria

- [ ] AC-P2-01 … AC-P2-11 pass
- [ ] All 23 phase test cases pass
- [ ] `make setup` verified on every team member's machine
- [ ] Both gates demonstrated **blocking**, not merely passing
- [ ] Zero personal-data columns confirmed by introspection
- [ ] CI gates 1–7 green on `main`
- [ ] Health endpoint reports all three components accurately, including when ML is stopped
- [ ] No unresolved Critical or High defects
- [ ] `CHANGELOG.md` updated

**The gate that matters most:** TC-DATA-006 and TC-DATA-009. If the corpus contains no learnable signal, Phase 3 will spend days debugging a model that had nothing to learn. This phase does not exit on a generator that merely runs.
