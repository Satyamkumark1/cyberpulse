# UNIT TEST CASES — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Count | 104 TypeScript + 9 data pipeline (Python unit and AI cases are in `ai/ai-test-cases.md`) |
| Tools | Vitest · pytest |
| Format | `test-cases/test-case-template.md` |

---

## Data Pipeline — TC-DATA-001 … 009

### TC-DATA-001 — Generator produces the complete output set
**Req** FR-01 · **Feature** FEAT-16 · **Phase** P2 · **Critical** · **Data** · **Automated**
**Steps:** Run `npm run generate:data` with seed 26184 into a clean directory; list the output.
**Expected:** `complaints.csv`, `accounts.csv`, `transactions.csv`, `withdrawals.csv`, `atms.csv`, `manifest.json` present. Manifest records seed, generator version, per-file row count and SHA-256.

### TC-DATA-002 — Byte-identical regeneration
**Req** FR-01.1, NFR-14 · **Critical** · **Automated**
**Steps:** Generate into directory A; generate again into directory B with the same seed; compare SHA-256 per file.
**Expected:** All six checksums identical. Changing the seed to 26185 changes every checksum.

### TC-DATA-003 — Volume floors
**Req** FR-01.2 · **High** · **Automated**
**Expected:** ≥ 500 complaints, ≥ 10,000 accounts, ≥ 50,000 transactions, ≥ 2,000 withdrawals, ≥ 500 ATMs. Defaults produce 500 / 12,000 / 60,000 / 2,400 / 520.

### TC-DATA-004 — Six fraud types present
**Req** FR-01.3 · **High** · **Automated**
**Expected:** Exactly the six enum values, each with ≥ 30 complaints. No seventh value.

### TC-DATA-005 — Seven metro clusters
**Req** FR-01.4 · **High** · **Automated**
**Expected:** Delhi/NCR, Mumbai, Hyderabad, Bengaluru, Chennai, Ahmedabad, Lucknow each represented. All coordinates within India bounds (lat 6.0–37.5, lon 68.0–97.5).

### TC-DATA-006 — Latent patterns present
**Req** FR-01.5 · **Critical** · **Automated**
**Expected:** All eight patterns in `ai/evaluation-framework.md` §5 clear their thresholds.

### TC-DATA-007 — Layered chains
**Req** FR-01.6 · **High** · **Automated**
**Expected:** ≥ 90% of complaints resolve to a victim → account → … → withdrawal chain of depth 2–4 inclusive. No chain exceeds depth 4. No self-transfer.

### TC-DATA-008 — Runnable via the documented command
**Req** FR-01.8 · **Medium** · **Automated**
**Expected:** `npm run generate:data` succeeds from a clean clone; exit code 0.

### TC-DATA-009 — Signal check blocks training
**Req** FR-01.9 · **Critical** · **Automated**
**Steps:** Run `signal_check.py` on a valid corpus; then on a corpus generated with the time-of-day pattern disabled; then attempt `train:model` on the second.
**Expected:** First exits 0. Second exits non-zero naming the failed pattern. Training is blocked. No CI flag bypasses it.

---

## Formatting — TC-UNIT-001 … 008

### TC-UNIT-001 — Currency formatting across the lakh boundary
**Req** NFR-27 · **Feature** cross · **Phase** P3 · **High** · **Unit** · **Automated**
**Test data:** 0, 100, 9900, 9999900, 10000000, 38000000 paise
**Expected:** `₹0`, `₹1`, `₹99`, `₹99,999`, `₹1,00,000`, `₹3,80,000`. Indian digit grouping, no decimals.
*The 99,999 → 1,00,000 transition is where a wrong locale silently produces `₹100,000`.*

### TC-UNIT-002 — Currency never accepts a float
**Req** NFR-27 · **High** · **Automated**
**Expected:** `formatPaise(3.5)` throws in development and is a type error at compile time.

### TC-UNIT-003 — UTC to IST rendering
**Req** NFR-28 · **High** · **Automated**
**Test data:** `2026-09-14T03:42:00Z`
**Expected:** `14 Sep 2026, 09:12`. A timestamp at `2026-09-14T18:45:00Z` renders as `15 Sep 2026, 00:15` — the date advances.

### TC-UNIT-004 — Time window rendering across midnight
**Req** FR-09 · **Medium** · **Automated**
**Test data:** start `2026-09-14T17:30:00Z`, end `2026-09-14T19:30:00Z`
**Expected:** `23:00 – 01:00 IST`; no negative duration; the day boundary is indicated.

### TC-UNIT-005 — Score formatting
**Req** FR-07 · **Medium** · **Automated**
**Expected:** 0.917 → `91.7%` in the UI, `0.917` in the metrics panel. 1.0 → `100.0%`. 0.0 → `0.0%`.

### TC-UNIT-006 — Distance formatting
**Medium** · **Automated**
**Expected:** 220 → `220 m`; 999 → `999 m`; 1000 → `1.0 km`; 1400 → `1.4 km`.

### TC-UNIT-007 — Empty numeric renders an em dash
**Req** `ux/ui-guidelines.md` §6 · **Medium** · **Automated**
**Expected:** `null` renders `—`; a measured `0` renders `0`. The two are distinguishable.

### TC-UNIT-008 — Coordinate formatting
**Low** · **Automated**
**Expected:** 28.57 → `28.5700`; four decimals always.

---

## Threshold and Derivation Logic — TC-UNIT-020 … 029

### TC-UNIT-020 — Estimated exposure formula
**Req** FR-13.3 · **Feature** FEAT-11 · **Phase** P5 · **Critical** · **Automated**
**Steps:** Construct three complaints linked to the predicted cell, one of them `RESOLVED`, one outside the 24-hour horizon; compute exposure.
**Expected:** Only the unresolved, in-horizon complaints are summed. Result in integer paise. Matches the formula in `architecture/low-level-design.md` §3.1 exactly.

### TC-UNIT-021 — Severity derives from risk level
**Req** FR-14.2 · **Critical** · **Automated**
**Expected:** HIGH → HIGH, MEDIUM → MEDIUM, LOW → LOW. The function takes no client input and has no override parameter.

### TC-UNIT-022 — Risk level boundaries
**Req** FR-07.1 · **Critical** · **Automated**
**Test data:** 0.000, 0.399, 0.400, 0.699, 0.700, 0.701, 1.000 at thresholds 0.70 / 0.40
**Expected:** LOW, LOW, MEDIUM, MEDIUM, HIGH, HIGH, HIGH. Lower bound inclusive.

### TC-UNIT-023 — Threshold change does not alter stored scores
**Req** FR-22, AC-015-03 · **High** · **Automated**
**Expected:** Raising `high` to 0.85 reclassifies a 0.80 score from HIGH to MEDIUM in display; the stored `riskScore` is unchanged.

### TC-UNIT-024 — Confidence margin rule
**Req** FR-07.2 · **High** · **Automated**
**Test data:** (0.92, 0.91) · (0.92, 0.70) · (0.55, 0.50) · single candidate
**Expected:** LOW · HIGH · LOW · LOW.

### TC-UNIT-025 — Investigation transition validity
**Req** FR-15.2 · **Critical** · **Automated**
**Expected:** Every valid transition returns true; every other pair returns false; backward moves are valid only to the immediately preceding state.

### TC-UNIT-026 — Pagination arithmetic
**Req** FR-02.4 · **High** · **Automated**
**Test data:** total 500, pageSize 25 → totalPages 20. total 0 → totalPages 0, page 1 valid. total 1 → totalPages 1.
**Expected:** No division-by-zero; page beyond totalPages yields an empty set with correct metadata, not an error.

### TC-UNIT-027 — Factor collapse keeps five and sums to 100
**Req** FR-10.3, FR-10.5 · **Critical** · **Automated**
**Test data:** One factor at 98%, six others below 2%
**Expected:** ≥ 5 named factors returned; residual grouped as "Other factors"; sum exactly 100 ± 0.5.

### TC-UNIT-028 — Window width construction
**Req** FR-09.2 · **Critical** · **Automated**
**Expected:** One bin → 2 h. Two adjacent bins within 0.05 → 4 h. Never three bins. Never more than 4 h.

### TC-UNIT-029 — Scope predicate shape
**Req** NFR-25 · **High** · **Automated**
**Expected:** `complaintScope('BANK')` returns a predicate; `complaintScope('LEA')` and `('ADMIN')` return undefined in v1.0.

---

## Schema Validation — TC-UNIT-030 … 039

### TC-UNIT-030 — Money stored and typed as integer paise
**Req** NFR-27 · **Critical** · **Automated**
**Expected:** Schema rejects a non-integer amount; the Drizzle column type is `bigint`; no float path exists.

### TC-UNIT-031 — Timestamps typed as UTC
**Req** NFR-28 · **Critical** · **Automated**
**Expected:** Schema requires ISO-8601 with a `Z` offset; a local-time string is rejected.

### TC-UNIT-032 — Factor sum refinement
**Req** FR-10.3 · **Critical** · **Automated**
**Expected:** Factors summing to 140 fail; summing to 99.7 pass; summing to 99.4 fail.

### TC-UNIT-033 — Minimum factor refinement
**Req** FR-10.5 · **Critical** · **Automated**
**Expected:** Four factors with `explanationAvailable: true` fail. Zero factors with `explanationAvailable: false` pass.

### TC-UNIT-034 — Factor name enum is closed
**Req** FR-10.2 · **Critical** · **Automated**
**Expected:** `txn_velocity_1h` as a factor name fails validation.

### TC-UNIT-035 — Identifier patterns
**Req** NFR-10 · **High** · **Automated**
**Expected:** `C-10284` passes, `C-1028` fails, `C-102845` fails, `c-10284` fails. Same discipline for `ACC-`, `TXN-`, `ALT-`, `INV-`, `PRD-`.

### TC-UNIT-036 — Strict schemas reject unknown keys
**Req** NFR-10 · **High** · **Automated**
**Expected:** An extra key fails parsing rather than being stripped.

### TC-UNIT-037 — Ranked hotspot ordering refinement
**Req** FR-08.4 · **High** · **Automated**
**Expected:** A non-monotonic score sequence fails validation.

### TC-UNIT-038 — Recipients array minimum
**Req** FR-13.2 · **Critical** · **Automated**
**Expected:** Empty array fails; duplicates are de-duplicated; unknown recipient fails.

### TC-UNIT-039 — Environment schema
**Req** NFR-12 · **High** · **Automated**
**Expected:** Missing `DATABASE_URL` fails at startup with a named field; a malformed URL fails; no `NEXT_PUBLIC_*` variable matches a secret pattern.

---

## Coverage — TC-UNIT-040

### TC-UNIT-040 — Coverage gates
**Req** NFR-16 · **High** · **Automated**
**Expected:** `app/engine/features.py` ≥ 95%, `services/lib/**` ≥ 95%, `services/**` ≥ 85%, `packages/shared` ≥ 90%, overall ≥ 75%. CI fails below any gate.

---

## Scam Shield (FEAT-17) — TC-SAFE-001 … 007, 040

Pure logic in `apps/web/lib/safety/` and `packages/shared/citizen.ts`. Files: `lib/safety/*.test.ts`.

| ID | Case | Req | Priority |
|---|---|---|---|
| TC-SAFE-001 | Each of six scenarios has exactly four statements, each with text and reason in both languages and a named source; every scenario's steps end with 1930 | FR-26, FR-26.1 | High |
| TC-SAFE-002 | `evaluateAnswers` at 0, 1, 2 and 4 matched → NONE, CAUTION, STOP, STOP | FR-26 | Critical |
| TC-SAFE-003 | `checkLink`: `.bank.in` https pass; http caution; `bank.in.evil.com`, `sbibank.in`, bank-like names warn; `user@host` disguise resolves to the real host; punycode, bare IP, shorteners, non-http schemes | FR-27 | High |
| TC-SAFE-004 | `checkCaller`: `1600` + 6 digits pass (with `+91`, spaces); 9-digit and `160x` do not; `140` caution; 10-digit mobile and international warn | FR-27 | High |
| TC-SAFE-005 | `checkUpi`: `@valid<bank>` pass (broker `.brk`, fund `.mf`); bare `@valid`, `@ybl`, reversed handles and malformed IDs warn; case-insensitive | FR-27 | High |
| TC-SAFE-006 | `citizenStageOf` maps every complaint and investigation status; investigation wins; strict status response rejects an extra key; tracking code normalised | FR-29 | Critical |
| TC-SAFE-007 | Hindi copy has a string for every English leaf, arrays included; report notice fixed string exact; `lang` read from the query string | FR-30 | High |
| TC-SAFE-040 | `no_hardcode_check.sh` fails on Hindi equivalents of prohibited claims and terms | FR-30 | High |

---

## Summary

| Group | Cases | Critical | High | Medium | Low |
|---|:--:|:--:|:--:|:--:|:--:|
| Data pipeline | 9 | 4 | 4 | 1 | 0 |
| Formatting | 8 | 0 | 3 | 4 | 1 |
| Derivation logic | 10 | 5 | 5 | 0 | 0 |
| Schema validation | 10 | 6 | 4 | 0 | 0 |
| Coverage | 1 | 0 | 1 | 0 | 0 |
| Component units | 58 | 8 | 22 | 24 | 4 |
| Scam Shield (FEAT-17) | 8 | 2 | 6 | 0 | 0 |
| **Total** | **104** | **25** | **45** | **29** | **5** |

Component unit cases are enumerated in `test-cases/frontend-tests.md`; they are counted here because they run in the unit tier.
