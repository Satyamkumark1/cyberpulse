# PHASE 10 — HOLD ADVICE, HOLD-RULE REPLAY AND SCAM SHIELD ADDITIONS

| Field | Value |
|---|---|
| Duration | 10.5 person-days · one developer · just over two working weeks |
| Output | Officer side: per-account hold advice on the money trail, and a replay of RBI's proposed transfer-hold rule. Citizen side: QR X-ray, a mule-recruitment scenario, an after-loss panel and an "ask someone you trust" button |
| Entry | Phase 9 merged; DEC-014 and ADR-023 accepted |
| Features | FEAT-18 (new), FEAT-19 (new), FEAT-17 (extended) |

> **Why this phase exists.** At least five public SIH 26184 repositories already predict ATM cash-outs, and some add citizen portals, recovery trackers and hash-chained logs. The prediction alone no longer sets CyberPulse apart. Nobody, in government tooling or among those teams, does these three things. First, turn MHA's 2 January 2026 account-freeze SOP ("hold the disputed amount, not the whole account") into per-account figures. Second, test RBI's 9 April 2026 proposed one-hour hold on transfers above ₹10,000 against a money trail. Third, explain what a UPI QR code will do before the citizen scans it. This phase builds all three, plus two cheap citizen additions: the mule-recruitment check and the after-loss panel.

> **Status: planned 2026-09-24.** Not started.

---

## 1. Objectives

1. For every account the complaint's money reached, show the amount traced into it and whether that money is likely still there or already passed on. Holds are sized to the disputed amount, per the 2026 SOP. Identity and account-type fields are never used.
2. Replay each complaint's synthetic transfer timings under RBI's proposed hold rule, per complaint and in aggregate. The replay says plainly what it cannot measure.
3. Let a citizen check a UPI QR code on their own phone before paying. The code is decoded in the browser, explained in plain language, and never sent anywhere.
4. Add a seventh Scam Check scenario for mule recruitment, and correct the stale collect-request question.
5. Tell a citizen who has already lost money what happens after the 1930 call: the acknowledgement number, the Money Restoration Module, and the recovery-scam warning.
6. Let a citizen send "is this real?" to someone they trust, in one tap, without anything leaving through us.

---

## 2. Deliverables

| Deliverable | Acceptance |
|---|---|
| `services/lib/holdAdvice.ts` | Pure; traced amount and advice per account; never receives account type, risk score or status |
| Hold advice on the money trail | Badge, detail panel block and accessible-table column on every traced account node |
| "Show onward accounts" toggle | Requests the existing `view=related`; not rendered for `BANK`, whose 403 stays the control |
| `services/lib/holdReplay.ts` | Pure; replays one complaint's hops under `{ holdMinutes, thresholdPaise }` |
| `holdReplayService` | `forComplaint` (scoped, 404 out of scope) and `summary` (scoped counts) |
| Replay panel on complaint detail | Actual vs replayed timeline at RBI's proposed values, with its caption |
| Replay section on `/reports` | GET form with allow-listed hold lengths and thresholds; outcome counts; caption |
| QR X-ray on `/safety/verify` | Image in, plain-language result out; no network request; manual checklist where unsupported |
| `lib/safety/qrCheck.ts` | `parseUpiQr`, `checkQr`; pure; boundary-tested |
| `ACCOUNT_RENTAL` scenario | Four sourced questions, English and Hindi |
| QR_UPI question 4 | No longer describes person-to-person collect requests (ended 1 Oct 2025) |
| After-loss panel | On the report confirmation and the status page, English and Hindi |
| "Ask someone you trust" | Web Share with a copy fallback; message built only from the scenario and ticked flags |
| `docs/demo-script.md` | Hold-advice beat inside the officer segment; the whole demo still ≤ 180 s |

No migration, no new endpoint, no new capability, no new dependency.

---

## 3. Implementation Tasks

Ordered for one developer. The officer features come first because they carry the pitch. Tests ship inside each task (`.claude/rules/testing.md` rule 1).

| # | Task | Days | Day |
|---|---|---|---|
| T-10.1 | DEC-014 (scope) and ADR-023 (trail analytics are computed values, not predictions) | 0.5 | 1 |
| T-10.2 | FEAT-18, FEAT-19 and the FEAT-17 additions in `REQUIREMENTS.md`, `FEATURE_SPECIFICATIONS.md`, `ACCEPTANCE_CRITERIA.md`; API-022 additive fields in `architecture/api-design.md` | 0.5 | 1 |
| T-10.3 | `holdAdvice.ts` + unit tests; `HOLD_ADVICE` enum and constants in `packages/shared` | 1.0 | 2 |
| T-10.4 | `getNetwork` attaches `holdAdvice` to account nodes in both views + integration tests | 0.5 | 3 |
| T-10.5 | Graph UI: onward-accounts toggle, `HoldAdviceBadge`, detail panel block, accessible-table column, legend | 1.25 | 3–4 |
| T-10.6 | `holdReplay.ts` + unit tests; `REPLAY_OUTCOMES` enum and rule constants | 0.75 | 4–5 |
| T-10.7 | `holdReplayService` (scoped query with a limit, `EXPLAIN ANALYZE` in the PR) + integration tests | 0.75 | 5–6 |
| T-10.8 | `HoldReplayPanel` on complaint detail; replay section on `/reports` | 1.0 | 6–7 |
| T-10.9 | `qrCheck.ts` + unit tests | 0.75 | 7 |
| T-10.10 | `QrCheck` component on `/safety/verify` | 0.75 | 8 |
| T-10.11 | `ACCOUNT_RENTAL` scenario, QR_UPI question 4 fix, Hindi for both | 0.5 | 8–9 |
| T-10.12 | After-loss panel + recovery-scam fixed string, English and Hindi | 0.5 | 9 |
| T-10.13 | "Ask someone you trust" button | 0.5 | 9–10 |
| T-10.14 | E2E suite additions and the §11 regression run | 0.75 | 10 |
| T-10.15 | Demo script update and two timed rehearsals | 0.25 | 11 |
| T-10.16 | Close-out docs: threat model, `CLAUDE.md` fixed strings, wireframes, test catalogue, `phase-test-matrix.md`, `CHANGELOG.md` | 0.25 | 11 |

**Milestones.**
- **M1 (day 4):** C-10284's money trail shows hold advice, including on its onward accounts.
- **M2 (day 7):** the replay works on complaint detail and on `/reports`.
- **M3 (day 9):** the citizen additions work in both languages.
- **M4 (day 11, half day):** exit criteria met.

**Cut line.** If M2 slips past day 7, cut T-10.13 first. Next, cut the `/reports` replay form, but keep the complaint-detail replay at RBI's proposed values. Hold advice is never cut.

---

## 4. Design

### 4.1 Evidence from the corpus

Measured on the seed-26184 corpus on 2026-09-24. These facts justify the thresholds below, and they also mark what this corpus cannot show.

| Fact | Value | Used for |
|---|---|---|
| Receivers inside complaint chains | 371 mule-type and 46 suspicious-type accounts; no ordinary or merchant accounts | Onward accounts appear only in the related view, hence the toggle |
| Accounts receiving money from chain accounts after the victim's money arrived | 577 ordinary, 215 merchant, 330 mule-type, 167 suspicious-type accounts; median ₹200–260 per transfer | The accounts the SOP's "disputed amount only" rule protects |
| Minutes from an account receiving a hop to sending the next one | p10 0.6 · p50 4.2 · p90 14.1 | Passed-on window of 30 minutes |
| Minutes from the first hop to the complaint | p10 10.9 · p50 33.2 · p90 54.2 | Why a one-hour hold matters, and why a 30-minute one would miss about half |
| Minutes from the first hop to the first cash-out | p10 30 · p50 376 · p90 1062 | The replay's cash-out shift |
| Chain hops above ₹10,000 | 100% (median ₹1.7–2 lakh) | Every chain hop falls under the proposed rule |
| Transfers not linked to any complaint above ₹10,000 | 3 of about 58,500 | The corpus cannot measure the rule's cost to ordinary payments |
| Prior-30-day credits into chain receivers | median 3; account ages match ordinary accounts | Credit caps on low-turnover accounts are out of scope: the corpus does not separate them |
| C-10284 | 3 hops in 5 minutes from 00:20 IST (₹65,296 → ₹62,747 → ₹61,561); complaint 00:58; first cash-out 07:08; onward transfers of ₹100–785 to 2 merchant and 3 ordinary accounts, 1–34 days later | The demo fixture for both officer features (read-only) |

Every threshold below is a heuristic fitted to how the generator behaves, not a trained or validated figure. ADR-023 records that, and the UI never presents these figures as model output.

### 4.2 Routes and files

```
packages/shared/enums.ts                       HOLD_ADVICE, REPLAY_OUTCOMES
packages/shared/constants.ts                   HOLD_ADVICE_WINDOW_MINUTES, HOLD_ADVICE_PASSED_ON_RATIO,
                                               HOLD_RULE_PROPOSED, HOLD_REPLAY_*_OPTIONS
apps/web/services/lib/holdAdvice.ts            pure · adviseHolds(trail)
apps/web/services/lib/holdReplay.ts            pure · replayHold(chain, rule)
apps/web/services/holdReplayService.ts         forComplaint(id, rule, ctx) · summary(rule, ctx)
apps/web/services/transactionService.ts        getNetwork: data.holdAdvice on account nodes
apps/web/components/graph/HoldAdviceBadge.tsx  prop `advice`, never `color`; colour + text + icon
apps/web/components/graph/NodeDetailPanel.tsx  advice block + hold note
apps/web/components/graph/GraphAccessibleTable.tsx   "Hold advice" column, same data
apps/web/components/graph/MoneyTrailGraph.tsx  "Show onward accounts" → ?view=related
apps/web/components/replay/HoldReplayPanel.tsx Server · actual vs replayed timeline
apps/web/app/(dashboard)/complaints/[complaintId]/page.tsx   + HoldReplayPanel
apps/web/app/(dashboard)/reports/page.tsx      + replay section, GET form
apps/web/lib/safety/qrCheck.ts                 parseUpiQr · checkQr
apps/web/components/safety/QrCheck.tsx         client · file input + BarcodeDetector
apps/web/components/safety/AfterLoss.tsx       server · next steps after 1930
apps/web/components/safety/AskSomeone.tsx      client · navigator.share, copy fallback
apps/web/lib/safety/scamRules.ts               + ACCOUNT_RENTAL; QR_UPI question 4
apps/web/lib/safety/copy.ts                    new keys, en + hi
```

`QrCheck` and `AskSomeone` are client components; the reasons are a browser API and interactivity. Everything else added here is a Server Component or pure logic.

### 4.3 Hold advice (FEAT-18)

**Input:** the deduplicated edges `getNetwork` already built, the withdrawals, the victim account, the complaint amount, and `recordsLimited`. Nothing else. By construction, the function signature cannot reach `accounts.account_type`, `risk_score` or `status`.

**Algorithm:**
1. Sort the edges by `(timestamp, id)`.
2. **Traced balance.** Each account keeps a running `remainingPaise` of traced money. The victim account starts at the complaint amount.
3. **Walk the edges in order.** Each outbound edge or withdrawal carries `min(amount, sender.remainingPaise)` of traced money. That amount leaves the sender's `remainingPaise` and is added to the receiver's `tracedInPaise` and `remainingPaise`. An edge from an account with nothing remaining carries nothing.
   - **Convention:** traced money is assumed to leave first. A mule that passed on 96% of the money within minutes can therefore pass on at most the remaining 4% later. This stops a small payment days later from counting as the full complaint amount.
4. **Money moved on.** `movedOnPaise` is the traced money that left an account within `HOLD_ADVICE_WINDOW_MINUTES` (30) of its first traced credit.
5. **Advice:**
   - `PASSED_ON` when `movedOnPaise ≥ HOLD_ADVICE_PASSED_ON_RATIO × tracedInPaise` (0.9).
   - Otherwise `HOLD_AMOUNT`, with the hold equal to `tracedInPaise`.
6. **Untraced accounts** carry `holdAdvice: null`, rendered "—".
7. **Truncated trail.** When `recordsLimited` is true, every advice carries `incomplete: true` and the panel says the amounts may be understated.

**Shape** added to each `MULE_ACCOUNT` node's `data`, as an additive and backwards-compatible change to API-022:

```ts
holdAdvice: {
  advice: "HOLD_AMOUNT" | "PASSED_ON";
  tracedInPaise: number;
  movedOnPaise: number;
  firstTracedAt: string;          // UTC; rendered IST
  minutesToFirstOutflow: number | null;
  incomplete: boolean;
} | null
```

**Rendering:**

| Advice | Badge | Panel line |
|---|---|---|
| `HOLD_AMOUNT` | ● Hold amount | `Hold ₹X (disputed amount), not the whole account.` |
| `PASSED_ON` | → Passed on | `₹Y moved on within Z min. Follow it to the next account.` |
| `null` | — | `No traced money reached this account.` |

- **Hold note** (fixed string, §5): shown under every advice.
- **Sizing:** there is no "freeze account" advice. Every hold is sized to the disputed amount, as the SOP requires.
- **What officers see on C-10284:** the last chain account shows `Hold ₹61,561`, the first two show `Passed on`, and each merchant or ordinary onward account shows a hold no larger than the ₹100–785 it received. TC-HOLD-010 pins the exact figures from the database rows.

`ponytail:` no account balances exist in the corpus, so this is inflow and outflow tracing, not lowest-intermediate-balance tracing. Upgrade when a balance column exists.

### 4.4 Hold-rule replay (FEAT-19)

**Rule:** `{ holdMinutes, thresholdPaise }`. `HOLD_RULE_PROPOSED = { holdMinutes: 60, thresholdPaise: 10_000_00 }` is RBI's discussion-paper value. A transfer is held when its amount is strictly above the threshold.

**Replay of one complaint.** Hops are ordered by `hop_index`. `dwell_k` is each account's original delay before forwarding, and `dwell_w` is the final account's delay before its first cash-out.

```
send'_0   = t_0
arrive'_k = send'_k + (amount_k > threshold ? hold : 0)
send'_k+1 = arrive'_k + dwell_k+1
cashout'  = arrive'_last + dwell_w
```

**Outcome** is decided at the complaint time `c`:
- `HELD_AT_SOURCE`: `c` falls inside hop 0's hold. The money is still in the victim's bank.
- `HELD_IN_CHAIN`: `c` falls inside a later hop's hold.
- `NOT_IN_HOLD`: any other case.

The response also carries both timelines, `cashout'` and the original first cash-out.

**Summary:**
- counts per outcome over the scoped complaints, which sum to the scoped complaint count
- median minutes from report to first cash-out, actual vs replayed

**Allow-list:** `holdMinutes ∈ {15, 30, 60, 120, 240}`, threshold ∈ {₹5,000, ₹10,000, ₹50,000}. It is validated with Zod from the query string. A value outside the list renders "Choose a value from the list" and no numbers.

**Assumptions, all shown in the caption:**
1. Each account forwards after the same delay as in the corpus.
2. Nobody splits transfers to stay under the threshold.
3. A report that arrives during a hold can stop that transfer.
4. The rule's cost to ordinary payments cannot be measured, because the corpus has almost no large everyday transfers (§4.1).

**Query:** complaints joined through the scope predicate to `transactions` on `complaint_id` (`idx_txn_complaint`), plus the first withdrawal per complaint. The limit is 5,000 transfer rows, with a `recordsLimited` flag. `EXPLAIN (ANALYZE, BUFFERS)` goes in the PR.

**Placement:**
- **Complaint detail** gets `HoldReplayPanel` at the proposed values, with no form. On C-10284 it reads:

  > The report (00:58 IST) arrives while the first transfer is still held (until 01:20 IST).

- **`/reports`** gets the GET form and the outcome counts. It needs no client JavaScript and no new endpoint, because Server Components call the service directly.

### 4.5 QR X-ray (FEAT-17)

**Input:** the citizen uploads an image with `<input type="file" accept="image/*">`, which on a phone offers the camera or the gallery. QR codes usually arrive as WhatsApp images, so there is no live camera scanning.

**Decoding:**
- **Supported browsers:** `new BarcodeDetector({ formats: ["qr_code"] })` on `createImageBitmap(file)`.
- **No `BarcodeDetector`** (iPhone Safari, desktop Linux): show a three-item manual checklist and no error.

**`parseUpiQr(raw)`:**
- `upi://pay` (scheme case-insensitive) → the fields `pa`, `pn`, `am`, `tn` and `mc`
- `upi://mandate` → `MANDATE`
- `http(s)` → `URL`
- anything else → `OTHER`

**`checkQr` rules.** Levels are the same as `verifyChecks`. The reason line on every pay result reuses the existing QR_UPI reason: "Scanning a QR code only ever sends money. You never scan to receive."

| Condition | Level | Reason |
|---|---|---|
| `am` present and valid | Caution | Amount already filled in: ₹X |
| `am` present but not a valid amount | Warning | Payment code has an unreadable amount |
| `upi://mandate` | Warning | Sets up repeated automatic payments |
| Investment words in `pn`/`tn` and the handle not `@valid…` | Warning | Via `checkUpi`: registered brokers and funds use `@valid` handles |
| No `mc` (a personal ID) and organisation words in `pn`/`tn` (customs, police, court, electricity, KYC, bank) | Warning | A personal UPI ID using an organisation's name |
| Receive-money words in `tn` (refund, cashback, prize, receive) | Warning | Scanning never brings money in |
| `URL` | As `checkLink` | — |
| Missing `pa` or unparseable | Warning | Not a normal UPI payment code |

The keyword lists are in English and Devanagari.

**Rendering:** the payee ID and name show exactly as decoded, in monospace. The amount is formatted from `am` with Indian grouping.

**Privacy:** the payload can contain a phone-number UPI ID. It never leaves the page and never goes to analytics, and a test asserts no network request.

`ponytail:` native decoding only. iPhone support needs a decoder library, which is a separate dependency decision.

### 4.6 Scam Check changes

**`ACCOUNT_RENTAL`, "Someone wants to use your bank account".** It is advice-only, like `DIGITAL_ARREST`, and never becomes a fraud type.
1. Offered money to receive payments into your account and send them on
2. Asked to open a new bank account, or to share your SIM, UPI PIN or net-banking login, for a job
3. Money arrived "by mistake" and a caller asks you to send it to a different account
4. Paid a commission per transfer, with no interview, office or offer letter

**Next steps:** do not forward any money; call your bank on the number in its app or on your card; if money arrived unexpectedly, tell the bank and report on 1930. Every question needs a reason and a real, checked source: RBI's BE(A)WARE booklet, I4C CyberDost mule-account advisories, or state police advisories. A question that cannot be sourced is replaced, not shipped.

**QR_UPI question 4:**
- Text becomes: "You get a payment request in your UPI app that you did not start".
- Reason becomes: "Approving a payment request sends money out of your account."
- Source: NPCI circular of 29 July 2025, which ended person-to-person collect requests on 1 October 2025.

### 4.7 After-loss panel

Shown on the report confirmation (step 3) and on the status page, in both languages:

1. Keep the acknowledgement number that 1930 or cybercrime.gov.in gives you. The complaint ID from this prototype is not that number.
2. If police hold the money in another account, you can ask for it back through I4C's Money Restoration Module, using that acknowledgement number.
3. Releasing held money can need a court order. National Lok Adalat sittings handle many of these.
4. The recovery-scam line (fixed string, §5).

The Money Restoration Module link points to cybercrime.gov.in; confirm the exact entry path during T-10.12. Each line carries its source with an "as of" date in `copy.ts`.

### 4.8 Ask someone you trust

**Placement:** a button on every Scam Check result at Caution or Stop.

**Message:** `buildAskMessage(lang, scenario, matchedFlags)` returns:

> I am getting a call or message about: {scenario}. They told me: {flag}; {flag}. Scam Shield says to stop and check. Can you call me now?

Nothing else goes into the text. It uses `navigator.share({ text })`. Without Web Share, the text is copied and the page shows "Copied. Paste it into WhatsApp or SMS." There is no `wa.me` link, so no new outbound host.

### 4.9 What does not change

- **No schema, migration, endpoint or capability.** Hold advice reuses `transactions:network`. The replay reuses `complaints:read`, with its scope and 404, and `reports:read`. The matrix stays at 144 cases.
- **`BANK` still gets 403 on `view=related`,** so it sees hold advice only on the complaint's own chain.
- **Citizens never see hold advice or the replay.**

---

## 5. Fixed strings added

| Context | String |
|---|---|
| Hold note (every hold advice) | `Hold advice is computed from the money trail. The decision to hold funds stays with the officer and the bank.` |
| Replay caption (every replay) | `Replay of synthetic transaction timings under a proposed rule. Not an estimate of real-world impact.` |
| Recovery-scam line (after-loss panel) | `Nobody from the police, a bank or 1930 will ask you to pay to get your money back. Anyone who does is running a second scam.` |

Each also gets a Hindi version in `copy.ts`, and the Hindi versions join the Phase 9 native-speaker review.

---

## 6. Dependencies

**Inbound:**
- Phase 9 merged. FEAT-17's `/safety`, `copy.ts` and `scamRules.ts` are extended, not rebuilt.
- API-022's related view and `recordsLimited` flag are green.

**Outbound:** none. Message X-ray and Scam Weather (§15) would build on this phase's `qrCheck`/`verifyChecks` pattern and on the complaint stream.

**New dependencies:** none. `BarcodeDetector`, Web Share and the Clipboard API are browser features.

---

## 7. Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Hold advice read as a legal finding about an account holder | Medium | **High** | Hold note on every advice; amounts only, never a "freeze account" advice; account type never used (AC-P10-02) |
| Heuristic thresholds tuned to the generator | High | Medium | ADR-023 says so; constants in one place; §4.1 published |
| Replay looks too good because the generator plants large, fast transfers | High | Medium | Caption and assumptions on every replay; the cost line says what cannot be measured; the hold-length selector shows the sensitivity |
| RBI's final directions differ from the discussion paper | Medium | Low | Rule parameters are data; labelled "proposed (RBI discussion paper, 9 Apr 2026)" |
| QR decoding unavailable on iPhone | Certain | Medium | Manual checklist path; a decoder library is a separate decision |
| Decoded QR payload leaks | Low | High | Device-only; no-request test; excluded from analytics |
| Money Restoration Module, e-Zero FIR or Lok Adalat details go stale | Medium | Medium | Sources with "as of" dates; review each phase |
| Mule-recruitment questions lack a checkable source | Medium | Medium | Replace the question; never ship one without a source |
| Demo overruns 180 s | Medium | Medium | Only the hold-advice beat is added (≤ 20 s); replay and QR go to Q&A |

---

## 8. Acceptance Criteria

**AC-P10-01**: Every account node reached by traced money carries hold advice; every other account node carries none and renders "—".
**AC-P10-02**: Hold advice is byte-identical when the accounts' `account_type`, `risk_score` and `status` are changed.
**AC-P10-03**: `HOLD_AMOUNT` equals the traced inflow capped at the complaint amount. `PASSED_ON` applies at exactly 90% moved on within 30:00 minutes and not at 89.99% or 30:01.
**AC-P10-04**: On a truncated trail, every hold advice is marked incomplete and the panel says so.
**AC-P10-05**: `BANK` never sees the onward-accounts toggle, and `view=related` still returns 403 for `BANK`.
**AC-P10-06**: The complaint-detail replay renders the times and outcome the service returns for that complaint.
**AC-P10-07**: The replay summary's outcome counts sum to the scoped complaint count for every role that can read reports.
**AC-P10-08**: A hold length or threshold outside the allow-list renders the validation message and no replay numbers.
**AC-P10-09**: The replay caption and the cost line render with every replay.
**AC-P10-10**: QR X-ray returns the documented level for every row of §4.5 and makes no network request.
**AC-P10-11**: The rendered payee ID, name and amount equal the decoded payload.
**AC-P10-12**: A browser without `BarcodeDetector` gets the manual checklist and no error.
**AC-P10-13**: `ACCOUNT_RENTAL` has four questions, each with a reason and a source. QR_UPI question 4 no longer describes a person-to-person collect request.
**AC-P10-14**: The after-loss panel and the recovery-scam line render on the report confirmation and on the status page, in both languages.
**AC-P10-15**: The ask-someone text contains the scenario name and the ticked flags and nothing else. Without Web Share it is copied instead.
**AC-P10-16**: The narrated demo with the hold-advice beat completes in ≤ 180 s, twice.

---

## 9. Test Strategy

- **Unit** owns both pure functions and the QR rules: boundaries, ordering, caps.
- **Integration** owns the network response, the replay service, scope and 404s, against a real database.
- **E2E** owns the journeys.

Nothing is asserted in two layers.

**Integrity:**
- **Hold advice in the graph:** asserted against the intercepted network response.
- **QR result:** asserted against the payload a stubbed `BarcodeDetector` returns.
- **Replay** (server-rendered): the E2E fixture asks the service for C-10284's replay and compares the page with it, never with constants.

C-10284 is read-only in every test, which these features respect because they only read.

---

## 10. Phase 10 Test Cases

### Unit
- **Hold advice:**
  - **TC-HOLD-001:** a trace follows the complaint's chain, and a related edge carries traced money only once its source holds some.
  - **TC-HOLD-002:** a related edge earlier than the source's first traced credit carries nothing.
  - **TC-HOLD-003:** an edge carries at most the sender's remaining traced amount. After a 96% pass-on, later edges share only the remaining 4%, and the total traced never exceeds the complaint amount.
  - **TC-HOLD-004:** `PASSED_ON` at 0.9 and not at 0.8999.
  - **TC-HOLD-005:** the window at 30:00 is in and 30:01 is out.
  - **TC-HOLD-006:** withdrawals count as moved on.
  - **TC-HOLD-007:** an untraced account gets `null`.
  - **TC-HOLD-008:** `recordsLimited` marks every advice incomplete.
  - **TC-HOLD-009:** equal timestamps order by id, deterministically.
- **Hold-rule replay:**
  - **TC-RPL-001:** a hold of 0 reproduces the original timeline.
  - **TC-RPL-002:** exactly ₹10,000 is not held and ₹10,000.01 is.
  - **TC-RPL-003:** the shift accumulates across held and unheld hops.
  - **TC-RPL-004:** a report inside hop 0's hold gives `HELD_AT_SOURCE`, inside hop 2's hold `HELD_IN_CHAIN`, and after the last credit `NOT_IN_HOLD`.
  - **TC-RPL-005:** the cash-out shift equals the total hold applied.
  - **TC-RPL-006:** the allow-list parser rejects 45 and ₹20,000.
- **QR X-ray and Scam Check:**
  - **TC-SAFE-041:** `parseUpiQr` handles a basic pay code, an uppercase scheme, a percent-encoded `pn`, `am=10000.00` → 1,000,000 paise, a mandate code and an http URL.
  - **TC-SAFE-042:** `checkQr` covers every row of §4.5, including a `@valid` investment payee that passes, a personal ID named "Customs" that warns, and a missing `pa` that warns.
  - **TC-SAFE-043:** `buildAskMessage` contains the scenario and the flags and nothing else.
  - **TC-SAFE-044:** the recovery-scam line and the hold note match §5 exactly.
  - TC-SAFE-001 and TC-SAFE-007 extend automatically to `ACCOUNT_RENTAL` and the new keys.

### Integration (real database)
- **TC-HOLD-010:** C-10284's related view carries `HOLD_AMOUNT` on onward accounts, equal to their traced inflows as recomputed from the database rows.
- **TC-HOLD-011:** in the complaint view, the chain accounts carry advice and the last one is `HOLD_AMOUNT`.
- **TC-HOLD-012:** API-022's shape is otherwise unchanged.
- **TC-RPL-010:** `forComplaint("C-10284")` equals `replayHold` of its rows, with outcome `HELD_AT_SOURCE` at the proposed values.
- **TC-RPL-011:** the summary counts sum to the scoped complaint count for LEA, BANK, ADMIN and I4C.
- **TC-RPL-012:** an out-of-scope complaint returns a byte-identical 404.
- **TC-RPL-013:** `GUARD` and `CITIZEN` get 403 on both service functions.

### E2E
- **TC-HOLD-030:** the onward-accounts toggle leads to a node panel whose advice equals the intercepted response.
- **TC-HOLD-031:** the accessible table's hold-advice column holds the same data.
- **TC-HOLD-032:** the toggle is absent for `BANK`.
- **TC-RPL-030:** complaint detail renders the replay the service returns.
- **TC-RPL-031:** the `/reports` form with 30 minutes changes the counts, and `?holdMinutes=45` shows the validation message with no numbers.
- **TC-SAFE-050:** the QR journey with a stubbed `BarcodeDetector` renders the payload's `pa`, `pn` and `am`.
- **TC-SAFE-051:** without `BarcodeDetector`, the manual checklist shows.
- **TC-SAFE-052:** no request goes out after a QR upload.
- **TC-SAFE-053:** the `ACCOUNT_RENTAL` journey in English and Hindi.
- **TC-SAFE-054:** the after-loss panel on the confirmation and status pages.
- **TC-SAFE-055:** a stubbed `navigator.share` receives the built text, and the copy fallback works.
- **TC-SAFE-056:** axe on the new UI, manual as in Phase 9.

### Static
- **TC-SAFE-060:** the prohibited-claims scan covers the new English and Hindi strings.

**Total: 39 cases.**

---

## 11. Regression Tests

| From | Re-run | Why |
|---|---|---|
| P4 | TC-API-020 … 022, TC-INT-060, TC-PERF-005 | `getNetwork` gains a computation and node fields |
| P4 | Graph E2E and accessible-table tests | New badge, column and toggle |
| P6 | TC-API-050, reports E2E | `/reports` gains a section |
| P9 | TC-SAFE-001 … 007, TC-SAFE-030, TC-SAFE-031, TC-SAFE-035 | Rules, copy and the verify page changed |
| P3, P9 | TC-SEC-010, TC-SEC-011, TC-SAFE-019 | Matrix must still be 144 cases |
| P2 | TC-DATA-002 | The phase writes nothing; corpus unchanged |
| All | TC-INT-010 … 013, TC-UX-012, TC-UX-013 | No hard-coded values; terminology |

---

## 12. Security Validation

| Check | Case |
|---|---|
| No new endpoint, capability, column or outbound host | Review; TC-SEC-010/011 still 144 |
| Related view still 403 for `BANK` | TC-HOLD-032 + existing API test |
| Replay scoped as a predicate; out-of-scope is a byte-identical 404 | TC-RPL-011, TC-RPL-012 |
| Hold advice cannot use identity or account-type fields | TC-HOLD-001 … 009 (signature) + AC-P10-02 |
| QR payload stays on the device | TC-SAFE-052 |
| Share text carries no data beyond the citizen's own ticks | TC-SAFE-043, TC-SAFE-055 |
| Threat model entries: advice misread as a finding about a person; QR payload privacy | `security/threat-model.md` |

---

## 13. Performance Validation

Measured on preview, never locally (`deployment.md`).

| Check | Target | Case |
|---|---|---|
| API-022 p95 with hold advice | Within 10% of the Phase 4 baseline | TC-PERF-005 |
| Replay summary, server time | ≤ 300 ms p95 | Preview measurement in the PR |
| Complaint detail LCP with the replay panel | ≤ 2500 ms | TC-PERF-010 extended |
| `/safety/verify` bundle | Within budget after `QrCheck` | CI bundle gate |

---

## 14. Documentation Updated in the Same Change

- **Requirements and specs:**
  - `REQUIREMENTS.md`: FEAT-18, FEAT-19, and FR-31 onward
  - `FEATURE_SPECIFICATIONS.md`: FEAT-18 and FEAT-19 with 14 sections each; the FEAT-17 additions
  - `ACCEPTANCE_CRITERIA.md`
- **Architecture:**
  - `architecture/api-design.md`: API-022 node fields
  - `architecture/architecture-decisions.md`: ADR-023
  - `project-management/decision-log.md`: DEC-014
- **Security:** `security/threat-model.md`
- **Project rules:** `CLAUDE.md` (three fixed strings)
- **UX:** `ux/wireframes.md` (advice badge, replay panel, QR check; layout only)
- **Tests:** `test-cases/*.md`, `implementation/phase-test-matrix.md`
- **Other:** `docs/demo-script.md`, `ROADMAP.md`, `CHANGELOG.md`

---

## 15. Out of Scope

| Item | Why |
|---|---|
| Message X-ray (paste a message, highlight warning signs) | Next candidate; builds on this phase's pattern |
| Scam Weather (district trends for the public) | Needs a publishing workflow and small-count suppression |
| Credit caps on low-turnover accounts | The corpus does not separate chain receivers from ordinary accounts (§4.1) |
| RBI's trusted-person rule for older citizens | Needs age, which the schema must not hold |
| Balance-based tracing | No balance column |
| iPhone QR decoding | Needs a decoder library; separate dependency decision |
| Live camera scanning | Image upload covers QR codes received on WhatsApp |
| Sending holds to banks | Prototype; decision support only |

---

## 16. Exit Criteria

- [ ] AC-P10-01 … AC-P10-16 pass
- [ ] All 39 phase test cases pass
- [ ] Regression set in §11 green
- [ ] `make verify` green; `no_hardcode_check.sh` green in both languages
- [ ] New Hindi strings reviewed by a native speaker
- [ ] Every document in §14 updated
- [ ] Two timed rehearsals, each ≤ 180 s
- [ ] Zero unresolved Critical or High defects

### The demonstrable gate

**Officer side:** the officer opens C-10284 and turns on onward accounts. The first two chain accounts read "Passed on". The last reads "Hold ₹61,561 (disputed amount), not the whole account". A merchant account that received ₹152 from the trail days later is held for at most that amount, not frozen. The replay panel on the same page shows that under RBI's proposed one-hour hold, the report at 00:58 IST would have arrived while the first transfer was still held.

**Citizen side:** a judge uploads a "scan to receive ₹5,000" QR image on `/safety/verify`. The page names the payee and the amount and says scanning sends money out.
