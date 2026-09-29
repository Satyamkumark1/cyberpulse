# PHASE 9 — SCAM SHIELD (CITIZEN SAFETY)

| Field | Value |
|---|---|
| Duration | 10.5 person-days · one developer · just over two working weeks |
| Output | A public `/safety` section: Scam Check, Verify Before You Pay, Report Now with status tracking, in English and Hindi |
| Entry | Phase 8 exited; DEC-013 and ADR-022 accepted |
| Features | FEAT-17 (new) |

> **Why this phase exists.** CyberPulse starts after a complaint exists. The money it tries to intercept is only recoverable if the victim reports fast. Scam Shield is the citizen-side front door: it helps people recognise a scam before paying, gets them to 1930 in the first hour if they already paid, and feeds their report into the same prediction path officers use.

> **Status: implemented 2026-09-24, not yet exited.** DEC-013 and ADR-022 recorded. Open exit items: native-speaker review of the Hindi copy, TC-SAFE-036 (axe) run manually, and two timed rehearsals of the citizen segment in `docs/demo-script.md`. See §17.

---

## 1. Objectives

1. Ship two browser-only tools that need no backend: Scam Check (rule-based red flags for six scam scenarios) and Verify Before You Pay (format checks for bank links, caller numbers and investment UPI IDs).
2. Ship Report Now: a first-hour checklist, a short report that creates a `DEMO`-origin complaint in the officer queue, and a status page that shows progress without any prediction detail.
3. Add `CITIZEN` as a sixth asserted role with no officer capability, extending ADR-019/ADR-021 without adding identity.
4. Extend demo reset so every citizen-created complaint and everything hanging off it is cleared.
5. Serve every `/safety` page in English and Hindi.
6. Extend the narrated demo with the citizen → officer → citizen chain.

---

## 2. Deliverables

| Deliverable | Acceptance |
|---|---|
| `/safety` shell | Prototype badge, disclaimer, report notice, sticky 1930 bar, language toggle on every route |
| Scam Check (`/safety/check`) | Six scenarios × four questions; result lists matched flags, reasons and next steps; no percentage |
| `lib/safety/scamRules.ts` | Every question carries a reason and a cited public advisory |
| Verify Before You Pay (`/safety/verify`) | Link, caller and UPI checks; runs in the browser; sends nothing |
| `lib/safety/verifyChecks.ts` | Pure functions, boundary-tested |
| Report Now (`/safety/report`) | Three steps: checklist → form → complaint ID and tracking code |
| Status page (`/safety/status`) | Four public stages; no score, hotspot, window or amount |
| `POST /api/citizen/reports` | Strict schema, rate-limited, one transaction with audit |
| `POST /api/citizen/reports/status` | ID + tracking code; wrong code and unknown ID return identical 404s |
| Migration `0006_add_citizen_reports.sql` | Additive; rollback note |
| `CITIZEN` role | Denied all 22 officer capabilities; matrix 24 × 6 = 144 cases |
| Demo reset extension | Clears `DEMO` complaints and dependants; seed untouched |
| Hindi copy | Every `/safety` string in `en` and `hi` |
| `docs/demo-script.md` update | Citizen chain added, still inside 180 s |

---

## 3. Implementation Tasks

Ordered for one developer. Tests ship inside each task (`.claude/rules/testing.md` rule 1); the separate test tasks cover only E2E and regression.

| # | Task | Days | Day |
|---|---|---|---|
| T-9.1 | DEC-013 (scope change) and ADR-022 (CITIZEN role, public intake) | 0.5 | 1 |
| T-9.2 | FEAT-17 in `REQUIREMENTS.md`, `FEATURE_SPECIFICATIONS.md`, `ACCEPTANCE_CRITERIA.md`; API and schema entries in `architecture/` | 0.5 | 1 |
| T-9.3 | `/safety` layout and home page (Server Components) | 0.5 | 2 |
| T-9.4 | `scamRules.ts` + `evaluateAnswers()` + unit tests | 0.5 | 2 |
| T-9.5 | `ScamCheck` client component and page | 0.75 | 3 |
| T-9.6 | `verifyChecks.ts` + boundary unit tests | 0.5 | 3–4 |
| T-9.7 | `VerifyChecks` client component and page | 0.5 | 4 |
| T-9.8 | Shared contracts: `CITIZEN` in `ACTOR_ROLES`, `CITIZEN_STAGES`, request/response Zod schemas, `RATE_LIMITS.citizenReport` | 0.25 | 4 |
| T-9.9 | Migration 0006 + Drizzle schema for `citizen_reports` | 0.5 | 5 |
| T-9.10 | Capability matrix: `CITIZEN` column, two new capabilities, `auth.test.ts` to 144 cases | 0.5 | 5 |
| T-9.11 | `citizenReportService` (`cities`, `submit`, `status`) + integration tests on a real database | 1.5 | 6–7 |
| T-9.12 | Two route handlers (validate → delegate → respond) | 0.25 | 7 |
| T-9.13 | Report Now UI (three steps) and status page | 1.0 | 7–8 |
| T-9.14 | `CITIZEN` on officer routes: dashboard layout gate panel, Sidebar | 0.25 | 8 |
| T-9.15 | Demo reset extension + reset confirmation counts | 0.5 | 9 |
| T-9.16 | Hindi: copy dictionary, `?lang=hi`, `lang` attribute, Hindi terms in the prohibited-claims scan | 0.75 | 9–10 |
| T-9.17 | E2E suite for `/safety` and the full chain; axe on every route in both languages | 0.75 | 10 |
| T-9.18 | Demo script update and two timed rehearsals | 0.25 | 11 |
| T-9.19 | Close-out docs: `security/threat-model.md`, `security/authorization.md`, `.claude/rules/security.md` audit list, `CLAUDE.md` fixed strings, `phase-test-matrix.md`, `CHANGELOG.md` | 0.25 | 11 |

**Milestones.** M1 (day 3): Scam Check works on its own and can be shown. M2 (day 4): Verify works; both browser-only tools done. M3 (day 8): full chain works end to end. M4 (day 11, half day): exit criteria met.

**Cut line.** If M3 slips past day 8, T-9.16 (Hindi) moves out of the phase. Nothing else is cut; the chain and its tests are the point of the phase.

---

## 4. Design

### 4.1 Routes and files

```
apps/web/app/safety/layout.tsx          Server · badge, disclaimer, report notice, 1930 bar, lang toggle
apps/web/app/safety/page.tsx            Server · three entry cards + "track my complaint"
apps/web/app/safety/check/page.tsx      Server wrapper → <ScamCheck/>
apps/web/app/safety/verify/page.tsx     Server wrapper → <VerifyChecks/>
apps/web/app/safety/report/page.tsx     Server · loads city list via citizenReportService.cities()
apps/web/app/safety/status/page.tsx     Server wrapper → <StatusLookup/>
apps/web/app/api/citizen/reports/route.ts
apps/web/app/api/citizen/reports/status/route.ts
apps/web/components/safety/             ScamCheck, VerifyChecks, ReportNow, StatusLookup, StatusTimeline
apps/web/lib/safety/scamRules.ts        six scenarios, reasons, sources, evaluateAnswers()
apps/web/lib/safety/verifyChecks.ts     checkLink, checkCaller, checkUpi
apps/web/lib/safety/copy.ts             { en, hi } dictionary
apps/web/services/citizenReportService.ts
packages/shared/zod/citizen-report.ts
packages/db/schema/citizenReports.ts
packages/db/migrations/0006_add_citizen_reports.sql
```

`ScamCheck`, `VerifyChecks`, `ReportNow` and `StatusLookup` are client components; the reason on each is interactivity. Nothing on `/safety` is dynamically imported because nothing heavy is used. No map, graph or chart appears on any `/safety` route.

### 4.2 Scam Check rules

- Scenarios: Digital arrest, Courier / customs, Job / task, Investment, QR / UPI, KYC / bank update. The first five map to the existing `FRAUD_TYPES`; digital arrest is advice-only and never becomes a fraud type.
- Each question has `{ text: {en, hi}, reason: {en, hi}, source }`. `source` names a public advisory: RBI BE(A)WARE, I4C CyberDost, the NITI Aayog digital-arrest paper, the SEBI validated-UPI circular, the RBI 1600xx and bank.in announcements.
- `evaluateAnswers(matched)` returns `NONE` (0 matched), `CAUTION` (1) or `STOP` (2 or more). The result shows the matched reasons and the scenario's next steps. It shows a count of the user's own ticks and no score, percentage or probability.
- Every result ends with the mule-recruitment line: never let anyone use your bank account.
- Copy never uses "guaranteed" or "official". Use "promise of fixed high returns" and "National Cybercrime Helpline 1930".

### 4.3 Verify checks

| Check | Pass | Caution | Warning |
|---|---|---|---|
| Link | host is `bank.in` or ends in `.bank.in`, over https | `.bank.in` over http; a known URL shortener; any other non-bank domain | bare IP; bank-like name not ending in `.bank.in`; unparseable |
| Caller | starts `1600` after stripping `+91`/`0` | starts `140` (promotional); unrecognised format | ordinary 10-digit mobile; international (`+` other than `+91`) |
| Investment UPI ID | handle matches `@valid<bank>` | none | any other handle; malformed ID |

These are pure functions with no network access. Each result links to the right public tool: Chakshu, SEBI Check or Sachet.

### 4.4 Report Now data flow

```
ReportNow (client) ── POST /api/citizen/reports  header x-cyberpulse-role: CITIZEN
  body { fraudType, amountPaise, city }                         strict; unknown keys → 400
    └─ citizenReportService.submit(input, ctx)
         requireCapability(ctx.role, "citizenReports:create")
         city → { district, state, lat, lon } from seeded complaints   (city not found → 400)
         one transaction:
           complaints   INSERT  complaint_id = 'C-' || nextval('citizen_complaint_seq')
                                origin = 'DEMO', status = 'OPEN', complaint_timestamp = now() UTC
                                victim_h3_r8 = latLngToCell(lat, lon, H3_RESOLUTION_HOTSPOT)
           citizen_reports INSERT complaint_id FK, tracking_hash = sha256(code)
           auditService.record(tx, { action: "citizen_report.submit", actorRole: "CITIZEN", ... })
    ← 201 { complaintId, trackingCode }            trackingCode shown once, never stored in clear
```

- **What the form collects:** fraud type, amount and city. Nothing else, and no free text anywhere, so there is nowhere for personal data to enter. "When it happened" and "number of transfers" were in the mockup and are cut because no column stores them and the model does not use them. Add them when transaction intake exists.
- **Coordinates:** the city's centroid, computed as the mean of seeded victim coordinates for that city; district is the most frequent seeded district. `ponytail:` city-level precision only, so the distance features are coarse; upgrade to locality picking via the existing location search if predictions on citizen complaints need it.
- **IDs:** `citizen_complaint_seq` runs from 90000 to 99999. The seed corpus tops out at `C-10284`, so the ranges cannot collide. The sequence is not reset by demo reset; IDs only move forward. `ponytail:` 10,000 IDs, enough for a prototype; widen the ID format if it is ever exhausted.
- **Server-derived fields:** `complaintId`, `status`, `origin`, `victimLat`, `victimLon`, `victimH3R8`, `district`, `state` and `complaintTimestamp` are rejected with 400 if a client sends them.
- **Prediction:** citizen complaints have no transaction chain, so analysis takes the documented defaults path (the `C-10281` fixture, TC-UNIT-013). Expect LOW confidence. The demo narrates this honestly: the bank trail arrives later, and the model gives a first estimate from what the citizen reported.

### 4.5 Status lookup

```
POST /api/citizen/reports/status   body { complaintId, trackingCode }   code never in a URL or log
  → citizenReportService.status()
      look up citizen_reports by complaint; timingSafeEqual(sha256(code), tracking_hash)
      mismatch or unknown ID → NotFoundError (byte-identical bodies)
      stage = CITIZEN_STAGE_OF[investigation.status ?? complaint.status]
  ← 200 { complaintId, stage, updatedAt }   strict response schema; no other key can leave
```

| Source status | Citizen stage |
|---|---|
| `OPEN`, `NEW` | Received |
| `ANALYZING`, `UNDER_REVIEW` | Under review |
| `ALERT_SENT`, `MONITORING` | Alert sent to bank and police |
| `RESOLVED` | Resolved |

The investigation status is read first because alert dispatch updates `investigations.status` to `ALERT_SENT` and leaves `complaints.status` alone (`investigationService.ts`).

The tracking code is 80 random bits, base32, shown as four groups of four. A lost code cannot be recovered, by design.

### 4.6 Role and capabilities

- `CITIZEN` joins `ACTOR_ROLES` (migration 0006 adds it to `actor_role`, needed because audit events carry the actor role).
- New capabilities `citizenReports:create` and `citizenReports:status`, granted to `CITIZEN` only.
- `CITIZEN` is denied all 22 existing capabilities.
- `/safety` pages always send `x-cyberpulse-role: CITIZEN`, so they work regardless of the role cookie. The presenter switches roles only on the officer side.
- If the role cookie is `CITIZEN`, the dashboard layout renders a `StatePanel` saying the area is for officers, with a link to `/safety`. The 403s behind it remain the real control.
- Unchanged declared gap (ADR-019): with no cookie, the dashboard still resolves to LEA. Scam Shield does not change that and does not claim to.

### 4.7 Migration 0006

```sql
ALTER TYPE "public"."actor_role" ADD VALUE 'CITIZEN';
--> statement-breakpoint
CREATE SEQUENCE citizen_complaint_seq START 90000 MINVALUE 90000 MAXVALUE 99999 NO CYCLE;
--> statement-breakpoint
CREATE TABLE citizen_reports (
  complaint_id  bigint PRIMARY KEY REFERENCES complaints(id) ON DELETE CASCADE,
  tracking_hash text NOT NULL CHECK (tracking_hash ~ '^[0-9a-f]{64}$'),
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

Additive only. No personal-data column: the table holds a foreign key, a hash and a timestamp. Rollback: drop the table and the sequence; the enum value needs the type rebuild described in 0005's rollback note. A web rollback alone is safe because an older build never writes `CITIZEN`.

### 4.8 Demo reset extension

Inside the existing reset transaction, in dependency order:

1. Alerts on any prediction for a `DEMO` complaint, plus the existing `origin = 'DEMO'` alerts
2. Investigations for `DEMO` complaints, plus the existing eligible set
3. Predictions for `DEMO` complaints (`risk_factors` cascade)
4. `DEMO` complaints (`citizen_reports` cascade)

Children are deleted by their complaint's origin, not their own, because an officer who analyses a citizen complaint writes `USER`-origin predictions and alerts. `database.md` invariant 5 is reworded in the same change to say so. Audit events are never deleted. The reset response gains `complaintsCleared`, and the confirmation names it.

### 4.9 Hindi

- `?lang=hi` in the query string (filter-style URL state, `frontend.md`), defaulting to English. The toggle is a link, not client state.
- `copy.ts` exports `{ en, hi }`, with `hi` typed as `Record<keyof typeof en, string>` so a missing key fails typecheck.
- Hindi content sits in an element with `lang="hi"` so screen readers switch voice.
- The prohibited-claims scan gains Hindi equivalents (आधिकारिक, गारंटी, प्रमाणित).
- A native speaker reviews the copy before M4. Machine translation alone is not accepted for safety instructions.

---

## 5. Fixed strings added

| Context | String |
|---|---|
| Report notice (every `/safety` route) | `This prototype does not send your report to police or banks. To report, call 1930 or use cybercrime.gov.in.` |
| Helpline label | `National Cybercrime Helpline 1930` |
| Status page note | `You will see status updates here. Investigation details are shared only with police and banks.` |
| Mule line (every Scam Check result) | `Never let anyone use your bank account. Money passed through it makes you part of the fraud chain.` |

The report notice matters most. A real person may find the prototype and believe they have reported a fraud; the notice has to stop that on every page.

---

## 6. Dependencies

**Inbound:** Phase 8 exited. The defaults prediction path (TC-UNIT-013) and alert → investigation upsert (FR-15.6) must be green; Report Now's chain depends on both.

**Outbound:** none inside the current roadmap. A v2 SMS/URL classifier would build on `/safety/verify` and needs its own ADR (a fourth model, `ai.md`).

**New dependencies:** none. `h3-js`, Zod, TanStack Query and Node `crypto` are already in use.

---

## 7. Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Someone uses the prototype as a real reporting channel | Medium | **Critical** | Report notice on every route; 1930 shown before the form; TC-SAFE-035 |
| Citizen complaint prediction is weak (no transaction chain) | High | Medium | Narrated as a first estimate; confidence shown as the model returns it, never inflated |
| Public write endpoint spammed | Medium | Low | 5 per minute per IP; rows are `DEMO` origin; reset clears them |
| Status enumeration or code guessing | Low | Medium | 80-bit code, hash-only storage, identical 404s, rate limit |
| Hindi copy wrong or unnatural | Medium | High | Native-speaker review is an exit criterion |
| Banned term slips into copy | Medium | Medium | Static scan in English and Hindi; TC-UX-012/013 |
| Advisory content goes out of date | Medium | Medium | Each rule cites its source; review the rules file each phase |
| Reset change deletes seed rows | Low | **Critical** | Deletion keyed on complaint origin; TC-DATA-002 corpus hash after reset |
| One developer runs late | Medium | Medium | Browser-only tools first (M1, M2); Hindi is the named cut |

---

## 8. Acceptance Criteria

**AC-P9-01**: Every `/safety` route shows the prototype badge, the global disclaimer and the report notice.
**AC-P9-02**: Scam Check returns `STOP` for two or more matched flags, `CAUTION` for one, `NONE` for zero, and never renders a percentage.
**AC-P9-03**: Every Scam Check question has a reason and a named source.
**AC-P9-04**: Verify returns the documented result for every row of §4.3 and makes no network request.
**AC-P9-05**: A valid report creates the complaint, the citizen report row and the audit event in one transaction, and the response equals the persisted row.
**AC-P9-06**: Every server-derived field in §4.4 and every unknown key is rejected with 400.
**AC-P9-07**: A wrong tracking code and an unknown complaint ID return byte-identical 404 bodies.
**AC-P9-08**: The status response contains exactly `complaintId`, `stage` and `updatedAt`.
**AC-P9-09**: `CITIZEN` receives 403 on all 22 officer capabilities; every other role receives 403 on both citizen capabilities.
**AC-P9-10**: After an officer dispatches an alert on a citizen complaint, that citizen's status shows "Alert sent to bank and police".
**AC-P9-11**: Demo reset removes every citizen complaint and its dependants and leaves the seed corpus byte-identical.
**AC-P9-12**: Every `/safety` route renders in Hindi with `?lang=hi`, with no missing keys.
**AC-P9-13**: The narrated demo including the citizen chain completes in ≤ 180 s, twice.

---

## 9. Test Strategy

Unit tests own the rules and checks (pure logic, boundaries). Integration tests own the endpoints, transactions, scope and reset, against a real database. E2E owns the journeys and the full chain. Nothing is asserted in two layers.

Displayed status is asserted against an intercepted response, never a constant (`testing.md` §Integrity). The status page absence test uses the three shape regexes (percentage, rupee amount, time range) plus the words "hotspot" and "window".

---

## 10. Phase 9 Test Cases

### Unit
TC-SAFE-001 each scenario has exactly four questions, each with reason and source · TC-SAFE-002 `evaluateAnswers` at 0, 1, 2 and 4 matched · TC-SAFE-003 link: `onlinesbi.bank.in` pass, `bank.in.evil.com` warning, `sbibank.in` warning, http caution, IP warning, shortener caution, unparseable warning · TC-SAFE-004 caller: `1600…` and `+91 1600…` pass, `160…` not pass, `140…` caution, 10-digit mobile warning, `+1…` warning · TC-SAFE-005 UPI: `abc.brk@validhdfc` pass, `abc@valid` warning, `growth@ybl` warning, malformed warning, uppercase normalised · TC-SAFE-006 stage mapping covers every complaint and investigation status · TC-SAFE-007 `hi` has every `en` key at runtime

### Integration (real database)
TC-SAFE-010 submit happy path, one transaction, response equals row, ID in 90000–99999 · TC-SAFE-011 each server-derived field → 400 · TC-SAFE-012 unknown key, amount 0, 99 and non-integer → 400; 100 paise accepted · TC-SAFE-013 unknown city → 400 · TC-SAFE-014 audit failure rolls back the complaint · TC-SAFE-015 429 writes nothing · TC-SAFE-016 status `Received`, then `Alert sent` after dispatch · TC-SAFE-017 identical 404 bodies · TC-SAFE-018 status response keys exact · TC-SAFE-019 capability matrix 24 × 6 · TC-SAFE-020 reset clears citizen complaint and dependants, seed untouched · TC-SAFE-021 schema introspection finds no personal-data column

### E2E
TC-SAFE-030 Scam Check journey, result announced in a live region · TC-SAFE-031 Verify journey · TC-SAFE-032 Report Now → code → status, rendered from the intercepted response · TC-SAFE-033 full chain: citizen report → LEA queue → Analyse → alert → citizen sees "Alert sent" · TC-SAFE-034 status page absence test · TC-SAFE-035 badge, disclaimer and report notice on every `/safety` route · TC-SAFE-036 axe clean at critical and serious on five routes in both languages · TC-SAFE-037 keyboard-only Report Now with focus moved to each step heading · TC-SAFE-038 Hindi toggle and `lang` attribute · TC-SAFE-039 `CITIZEN` cookie on `/dashboard` shows the gate panel

### Static
TC-SAFE-040 prohibited-claims scan catches the Hindi equivalents

**Total: 31 cases.**

---

## 11. Regression Tests

| From | Re-run | Why |
|---|---|---|
| P3 | TC-SEC-010, TC-SEC-011 | Capability matrix grew to 144 cases |
| P3 | TC-UNIT-013 | Citizen complaints depend on the defaults path |
| P5 | TC-E2E-010 … 014 | Alert flow now also runs on citizen complaints |
| P7 | TC-API-060, TC-SEC-042, TC-E2E-021 | Reset scope changed |
| P7 | TC-E2E-022 | Demo scenario must be unaffected |
| P2 | TC-DATA-002 | Corpus unchanged after citizen reports and reset |
| All | TC-INT-010 … 013, TC-UX-012, TC-UX-013 | No hard-coded values; terminology |

---

## 12. Security Validation

| Check | Case |
|---|---|
| Strict input; server-derived fields rejected | TC-SAFE-011, TC-SAFE-012 |
| Submission audited inside its transaction (seventh audited action) | TC-SAFE-014 |
| Tracking code never in URL or log; hash only at rest | Review + TC-SAFE-010 |
| Out-of-scope lookup is 404, byte-identical | TC-SAFE-017 |
| Citizen response cannot carry prediction data | TC-SAFE-018, TC-SAFE-034 |
| `CITIZEN` denied every officer capability | TC-SAFE-019 |
| No personal-data column | TC-SAFE-021, TC-SEC-022 |
| Rate limit chosen explicitly; 429 writes nothing | TC-SAFE-015 |
| No new outbound host (external links are navigation only) | Review |
| Threat model entries: public write, code guessing, misuse as a real reporting channel | `security/threat-model.md` |

---

## 13. Performance Validation

Measured on preview, never locally (`deployment.md`).

| Check | Target | Case |
|---|---|---|
| `/safety` routes LCP | ≤ 2500 ms | TC-PERF-010 extended |
| `/safety` route bundles | Within the budget table; rows added for five routes | CI bundle gate |
| Prediction on a citizen complaint | ≤ 1500 ms p95 warm | TC-PERF-002 |

---

## 14. Documentation Updated in the Same Change

`REQUIREMENTS.md` (FEAT-17, FR-26 onward) · `FEATURE_SPECIFICATIONS.md` (FEAT-17, 14 sections) · `ACCEPTANCE_CRITERIA.md` · `architecture/api-design.md` (two endpoints) · `architecture/database-design.md` (table, sequence, ERD) · `architecture/architecture-decisions.md` (ADR-022) · `project-management/decision-log.md` (DEC-013) · `security/authorization.md` (144-case matrix) · `security/auth-strategy.md` · `security/threat-model.md` · `.claude/rules/security.md` (seventh audited action) · `.claude/rules/database.md` (reset wording) · `CLAUDE.md` (fixed strings) · `ux/wireframes.md` (`/safety` screens, layout only) · `test-cases/*.md` · `implementation/phase-test-matrix.md` · `docs/demo-script.md` · `ROADMAP.md` · `CHANGELOG.md`

---

## 15. Out of Scope

| Item | Why |
|---|---|
| ML scam classifier for SMS or links | Needs a fourth model and its own ADR; no public Indian dataset exists. Candidate v2 using the Mishra & Soni smishing set and PhiUSIIL, tested on a hand-labelled Indian set |
| Looking up real phone numbers or UPI IDs | Needs personal data; DoT's Financial Fraud Risk Indicator already does this in UPI apps |
| Public map of predicted hotspots | Would tip off the people running mule accounts |
| Chatbot | No generative model anywhere (DEC-007) |
| Sending reports to NCRP, 1930 or banks | Prototype only; the report notice says so |
| SMS or push notifications for status | Needs contact details, which the schema must not hold |

---

## 16. Exit Criteria

- [ ] AC-P9-01 … AC-P9-13 pass
- [ ] All 31 phase test cases pass
- [ ] Regression set in §11 green
- [ ] `make verify` green; `no_hardcode_check.sh` green in both languages
- [ ] Hindi copy reviewed by a native speaker
- [ ] Every document in §14 updated
- [ ] Two timed rehearsals of the extended demo, each ≤ 180 s
- [ ] Zero unresolved Critical or High defects

### The demonstrable gate

A judge opens `/safety` on a phone. A "digital arrest" call matches three red flags and the page says stop. A second citizen who already paid gets to 1930 first, then files a short report and receives a complaint ID. On the officer side, that complaint is in the queue; Analyse returns a real prediction with its real confidence, and an alert goes out. Back on the phone, the status reads "Alert sent to bank and police", and nothing else about the prediction is visible there.

---

## 17. Implementation Notes (2026-09-24)

What changed against this plan while building it:

- **Acceptance criteria** are recorded as AC-017-01 … AC-017-11 in `ACCEPTANCE_CRITERIA.md`; AC-P9-12 (Hindi) and AC-P9-13 (rehearsal) remain phase-exit checks here.
- **Amount limits** live in `packages/shared/constants.ts`, not `citizen.ts`, so the `/safety` client bundle does not pull in Zod.
- **Layer ownership:** the wrong-code 404 (TC-SAFE-017) and the role matrix (TC-SAFE-019) are owned by integration; the E2E suite asserts only what the citizen sees for them.
- **TC-SAFE-036 (axe)** is manual: no axe dependency exists in the repo, and adding one is a separate dependency decision.
- **The 1930 bar** is hidden on `/safety/report`, whose first step is the 1930 call.
- **Found while testing:** a malformed JSON body returns 500 on every route, because the shared serialiser does not map `req.json()`'s `SyntaxError` to 400. Pre-existing and app-wide; not changed here.
- **Pre-existing, unrelated:** `tests/demo/scenario.spec.ts` has two strict-mode locator failures against the ten-complaint walkthrough (DEC-012), and TC-INT-011 fails locally until `evaluate.py` has written `model_metrics`.

### Exit checklist status

- [x] AC-017-01 … AC-017-11 covered by passing automated tests
- [x] Phase test cases pass (TC-SAFE-036 pending, manual)
- [x] `make verify` checks green (lint, typecheck, unit, integration apart from the pre-existing TC-INT-011, scanner)
- [x] Documents in §14 updated
- [ ] Hindi copy reviewed by a native speaker
- [ ] Two timed rehearsals of the citizen segment

