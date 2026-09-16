# WIREFRAMES — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Primary viewport | 1920×1080 |
| Supported range | 1280×720 to 2560×1440 |
| Notation | ASCII layout diagrams with annotated regions |
| Note | All figures shown inside wireframes are **layout placeholders**. Runtime values come from the API (AC-GLOBAL-01). |

---

## Grid and Spacing

- 12-column grid, 24 px gutter, 32 px page padding.
- Sidebar 240 px fixed (64 px collapsed); header 64 px fixed.
- Content area is everything else, scrolling independently of the sidebar.
- Vertical rhythm on a 4 px base; section spacing 24 px; card padding 20 px.
- Maximum content width 1680 px, centred above 1760 px viewport width.

---

## W-01 — Dashboard

```
┌────────────┬─────────────────────────────────────────────────────────────────────┐
│ ◈ CYBER    │ National View ▾ │ Last 30 days ▾ │ Role: LEA ▾ │ ●Live │ SYNTHETIC  │
│   PULSE AI ├─────────────────────────────────────────────────────────────────────┤
│ Cyber-Fraud│                                                                     │
│ Intel Plat.│  ┌───────────────┐┌───────────────┐┌───────────────┐┌─────────────┐ │
├────────────┤  │ TOTAL         ││ SUSPICIOUS    ││ HIGH-RISK     ││ PREDICTED   │ │
│ ▣ Dashboard│  │ COMPLAINTS    ││ TRANSACTIONS  ││ ALERTS        ││ HOTSPOTS    │ │
│ ▤ Complnts │  │ 500           ││ 1,284         ││ 3             ││ 12          │ │
│ ◉ Risk Map │  │ ↑ 12% 30d     ││ ↑ 8% 30d      ││ 2 unack.      ││ 4 HIGH      │ │
│ ⇄ Txns     │  └───────────────┘└───────────────┘└───────────────┘└─────────────┘ │
│ ⌕ Investig.│                                                    [ RUN DEMO ▸ ]   │
│ ⚑ Alerts   ├────────────────────────────────────────────┬────────────────────────┤
│ ▦ Reports  │  NATIONAL RISK MAP        [Heat][Hot][ATM] │ TOP PREDICTED HOTSPOTS │
│ ⚙ Settings │  ┌──────────────────────────────────────┐  │ ┌────────────────────┐ │
├────────────┤  │                                      │  │ │1 Sector 18, Noida  │ │
│ Safer      │  │         (MapLibre canvas)            │  │ │  HIGH · 91.7%      │ │
│ Citizens.  │  │      heatmap + ranked markers        │  │ ├────────────────────┤ │
│ Smarter    │  │                                      │  │ │2 Gurugram          │ │
│ Enforcement│  │                                      │  │ │  HIGH · 87.2%      │ │
│ Stronger   │  │                                      │  │ ├────────────────────┤ │
│ India.     │  │  Legend: ■HIGH ■MEDIUM ■LOW          │  │ │3 Dwarka, Delhi     │ │
├────────────┤  └──────────────────────────────────────┘  │ │  HIGH · 81.4%      │ │
│ MHA │ I4C  ├────────────────────────────────────────────┴────────────────────────┤
│ CIS Div.   │  RECENT ALERTS                                        [View all →]  │
│            │  ┌───────────────────────────────────────────────────────────────┐  │
│ ⚠ PROTOTYPE│  │ ⚑ HIGH  Sector 18, Noida   14:00–16:00  ₹2,80,000  SENT  2m   │  │
│  Not an    │  │ ⚑ HIGH  Gurugram Sec 29    15:00–17:00  ₹1,45,000  ACK   18m  │  │
│  official  │  └───────────────────────────────────────────────────────────────┘  │
│  MHA/I4C   ├──────────────────┬──────────────────────┬─────────────────────────  │
│  system    │ RISK PREDICTION  │ TRANSACTION NETWORK  │ ACTIONABLE ALERT          │
│            │ ┌──────────────┐ │ ┌──────────────────┐ │ ┌───────────────────────┐ │
│            │ │ C-10284      │ │ │  V→M1→M2→ATM     │ │ │ HIGH-RISK WITHDRAWAL  │ │
│            │ │ 91.7% HIGH   │ │ │  (mini graph)    │ │ │ Sector 18 · 14–16h    │ │
│            │ │ Sector 18    │ │ │                  │ │ │ [Generate Alert]      │ │
│            │ └──────────────┘ │ └──────────────────┘ │ └───────────────────────┘ │
└────────────┴──────────────────┴──────────────────────┴───────────────────────────┘
```

**Regions.** KPI row (4 cards, each a navigation control) · map (8 cols) · hotspot rail (4 cols) · recent alerts (12 cols) · secondary triptych (4 cols each).
**Responsive.** Below 1440 px the hotspot rail moves under the map; below 1280 px the triptych stacks.
**States.** Skeletons per region; map renders basemap first; empty KPI shows `—` with "No data for this range", never `0` when the cause is a filter.

---

## W-02 — Complaints Registry

```
┌────────────┬─────────────────────────────────────────────────────────────────────┐
│  SIDEBAR   │ [header]                                                            │
│            ├─────────────────────────────────────────────────────────────────────┤
│            │ Complaints                                          500 total        │
│            │ ┌─────────────────────────────────────────────────────────────────┐ │
│            │ │ ⌕ Search complaint ID or city                        [/]        │ │
│            │ └─────────────────────────────────────────────────────────────────┘ │
│            │ [Fraud type ▾][Status ▾][Risk ▾][Date range ▾][City ▾][State ▾]      │
│            │ Active: UPI Fraud ✕  Uttar Pradesh ✕                    Clear all    │
│            │ ┌────────┬──────────┬─────────┬──────────┬───────┬───────┬────────┐ │
│            │ │ ID  ▲▼ │ Type     │ Amount ▼│ Filed    │ City  │ Status│ Risk   │ │
│            │ ├────────┼──────────┼─────────┼──────────┼───────┼───────┼────────┤ │
│            │ │C-10284 │UPI Fraud │₹3,80,000│14 Sep 09:│Noida  │Open   │▲ HIGH  │ │
│            │ │C-10283 │Phishing  │₹1,20,000│14 Sep 08:│Delhi  │Open   │● MED   │ │
│            │ │C-10281 │Job Scam  │  ₹45,000│13 Sep 22:│Jaipur │Review │▼ LOW   │ │
│            │ │C-10279 │QR Fraud  │  ₹92,500│13 Sep 19:│Mumbai │Open   │— n/a   │ │
│            │ └────────┴──────────┴─────────┴──────────┴───────┴───────┴────────┘ │
│            │ ‹ Prev   Page 1 of 20   Next ›            25 per page ▾              │
└────────────┴─────────────────────────────────────────────────────────────────────┘
```

**Risk column** shows icon + text (`▲ HIGH`, `● MED`, `▼ LOW`, `— n/a`) — never colour alone (AR-02). `— n/a` means not yet analysed.
**Row interaction.** Entire row is a link; keyboard `Enter` opens it.
**Empty state.** Centred: "No complaints match these filters" + `Clear all filters`.

---

## W-03 — Complaint Detail with Prediction

```
┌────────────┬─────────────────────────────────────────────────────────────────────┐
│  SIDEBAR   │ [header]                                                            │
│            ├─────────────────────────────────────────────────────────────────────┤
│            │ Complaints › C-10284                                                │
│            │ ┌──────────────────────────────────┐┌─────────────────────────────┐ │
│            │ │ COMPLAINT SUMMARY                ││ AI PREDICTION               │ │
│            │ │ C-10284 · UPI Fraud              ││ ┌─────────────────────────┐ │ │
│            │ │ ₹3,80,000                        ││ │ RISK  91.7%   ▲ HIGH    │ │ │
│            │ │ Filed 14 Sep 2026, 09:12 IST     ││ │ Confidence: HIGH        │ │ │
│            │ │ Noida · Gautam Buddha Nagar · UP ││ │ CyberPulse-Demo-v1      │ │ │
│            │ │ Status: Open                     ││ └─────────────────────────┘ │ │
│            │ │            [ Analyze Complaint ] ││ PREDICTED LOCATION          │ │
│            │ ├──────────────────────────────────┤│ Sector 18, Noida            │ │
│            │ │ TRANSACTION TIMELINE             ││ 28.5700, 77.3200 · 3 ATMs   │ │
│            │ │ ● 09:04 ACC-10029421 → ACC-      ││ EXPECTED WINDOW             │ │
│            │ │        88123390  ₹3,80,000 UPI   ││ 14:00 – 16:00 IST           │ │
│            │ │ ● 09:11 ACC-88123390 → ACC-      ││ ⓘ Predicted window based on │ │
│            │ │        44902117  ₹2,10,000 IMPS  ││   temporal patterns in      │ │
│            │ │ ● 09:26 ACC-88123390 → ACC-      ││   related transactions and  │ │
│            │ │        44902118  ₹1,70,000 IMPS  ││   withdrawals.              │ │
│            │ ├──────────────────────────────────┤│ ESTIMATED EXPOSURE          │ │
│            │ │ LINKED ACCOUNTS            3     ││ ₹2,80,000                   │ │
│            │ │ ACC-88123390  Mule · 0.91 · Actv ││ ─────────────────────────── │ │
│            │ │ ACC-44902117  Susp · 0.74 · Actv ││ ▾ RISK FACTORS         (6)  │ │
│            │ │ ACC-44902118  Susp · 0.68 · Actv ││ Transaction Velocity   +27% │ │
│            │ └──────────────────────────────────┘│ ████████████░░░░  increases │ │
│            │                                     │ Historical Hotspot     +22% │ │
│            │                                     │ █████████░░░░░░░  increases │ │
│            │                                     │ Linked Accounts        +19% │ │
│            │                                     │ ████████░░░░░░░░  increases │ │
│            │                                     │ ATM Proximity          +14% │ │
│            │                                     │ Time Pattern           +11% │ │
│            │                                     │ Amount / Frequency      +7% │ │
│            │                                     │ ─────────────────────────── │ │
│            │                                     │ ▸ RANKED ALTERNATIVES  (4)  │ │
│            │                                     │ [View Money Trail]          │ │
│            │                                     │ [ Generate Alert ]          │ │
│            │                                     └─────────────────────────────┘ │
└────────────┴─────────────────────────────────────────────────────────────────────┘
```

**Before analysis** the right column shows an empty state with the "Analyze Complaint" explanation. **During** it shows a skeleton in that column only. **On failure** it shows the degraded panel with no numbers.

---

## W-04 — Risk Map with Hotspot Drawer

```
┌────────────┬──────────────────────────────────────────────┬──────────────────────┐
│  SIDEBAR   │ [header]                                     │ SECTOR 18, NOIDA   ✕ │
│            ├──────────────────────────────────────────────┤ ▲ HIGH · 91.7%       │
│            │ Layers: [✓]Risk Heatmap [✓]Hotspots [ ]ATMs  │ Rank 1 of 12         │
│            │ Filters: [State ▾][Risk ▾][Window ▾]         ├──────────────────────┤
│            │ [⊞ Accessible table]                         │ EXPECTED WINDOW      │
│            │ ┌──────────────────────────────────────────┐ │ 14:00 – 16:00 IST    │
│            │ │                                          │ ├──────────────────────┤
│            │ │                                          │ │ NEARBY ATMS      (3) │
│            │ │           (MapLibre canvas)              │ │ ATM-102 HDFC 220 m   │
│            │ │                                          │ │ ATM-108 SBI  340 m   │
│            │ │        ◉1 Noida                          │ │ ATM-114 ICICI 610 m  │
│            │ │      ◉3  ◉2 Gurugram                     │ ├──────────────────────┤
│            │ │                                          │ │ TOP RISK FACTORS     │
│            │ │              ◉4 Navi Mumbai              │ │ Txn Velocity    +27% │
│            │ │                    ◉5 Bengaluru          │ │ Hist. Hotspot   +22% │
│            │ │                                          │ │ Linked Accounts +19% │
│            │ │ ■ HIGH  ■ MEDIUM  ■ LOW      [+][−][⌖]   │ ├──────────────────────┤
│            │ └──────────────────────────────────────────┘ │ RELATED COMPLAINTS(4)│
│            │                                              │ C-10284 ₹3,80,000    │
│            │                                              │ C-10262 ₹1,15,000    │
│            │                                              ├──────────────────────┤
│            │                                              │ [ Generate Alert ]   │
└────────────┴──────────────────────────────────────────────┴──────────────────────┘
```

Drawer is 480 px, focus-trapped, dismissible by `Esc` or backdrop click. The map does not re-centre when the drawer opens; it pans only enough to keep the selected marker visible.

---

## W-05 — Money-Trail Network Graph

```
┌────────────┬─────────────────────────────────────────────────────────────────────┐
│  SIDEBAR   │ Complaints › C-10284 › Money Trail          [Fit][+][−][Re-layout]  │
│            ├─────────────────────────────────────────────────────────────────────┤
│            │                                              ┌────────────────────┐ │
│            │  ┌──────────┐                                │ NODE DETAIL        │ │
│            │  │ ▣ VICTIM │                                │ ▣ Mule Account     │ │
│            │  │ C-10284  │──₹3,80,000──┐                  │ ACC-88123390       │ │
│            │  │ ₹3,80,000│             │                  │ Risk score  0.91   │ │
│            │  └──────────┘             ▼                  │ Transactions  14   │ │
│            │                    ┌──────────────┐          │ Linked accts   5   │ │
│            │                    │ ▤ MULE ACCT  │          │ Opened 12 Aug 2026 │ │
│            │                    │ ACC-88123390 │          │ Status Active      │ │
│            │                    │ risk 0.91    │          │                    │ │
│            │                    └──────────────┘          │ ⓘ Risk indicator.  │ │
│            │                     │            │           │   Not a finding    │ │
│            │           ₹2,10,000 │            │ ₹1,70,000 │   about any person.│ │
│            │                     ▼            ▼           └────────────────────┘ │
│            │            ┌──────────────┐ ┌──────────────┐                        │
│            │            │ ▤ MULE ACCT  │ │ ▤ MULE ACCT  │                        │
│            │            │ ACC-44902117 │ │ ACC-44902118 │                        │
│            │            │ risk 0.74    │ │ risk 0.68    │                        │
│            │            └──────────────┘ └──────────────┘                        │
│            │              │        │            │                                │
│            │              ▼        ▼            ▼                                │
│            │        ┌────────┐┌────────┐  ┌────────┐                             │
│            │        │◉ ATM   ││◉ ATM   │  │◉ ATM   │                             │
│            │        │ATM-102 ││ATM-108 │  │ATM-114 │                             │
│            │        │Sec 18  ││Sec 18  │  │Gurugram│                             │
│            │        └────────┘└────────┘  └────────┘                             │
│            │                                                                     │
│            │  Legend: ▣ Victim   ▤ Mule Account   ◉ ATM   → fund movement        │
└────────────┴─────────────────────────────────────────────────────────────────────┘
```

Node types differ by **shape, icon and text label**, not colour alone. The node detail panel carries the standing neutrality note.

---

## W-06 — Alert Modal

```
        ┌───────────────────────────────────────────────────────────┐
        │  ⚑ HIGH-RISK WITHDRAWAL ALERT                          ✕  │
        ├───────────────────────────────────────────────────────────┤
        │  ⓘ Decision-support intelligence. Review before acting.   │
        │                                                           │
        │  LOCATION          Sector 18, Noida, Gautam Buddha Nagar  │
        │  TIME WINDOW       14:00 – 16:00 IST, 14 Sep 2026         │
        │  RISK SCORE        91.7%  ▲ HIGH        Confidence HIGH   │
        │  ESTIMATED EXPOSURE ₹2,80,000            (computed)       │
        │  LIKELY ATMS       3 (ATM-102, ATM-108, ATM-114)          │
        │  SOURCE            Prediction PRD-4821 · C-10284          │
        │                                                           │
        │  TOP FACTORS                                              │
        │   Transaction Velocity  +27%   increases risk             │
        │   Historical Hotspot    +22%   increases risk             │
        │   Linked Accounts       +19%   increases risk             │
        │                                                           │
        │  RECIPIENTS                                               │
        │   [✓] LEA — District Cyber Cell, Gautam Buddha Nagar      │
        │   [✓] Bank — Nodal Officer (3 institutions)               │
        │   [ ] I4C — CIS Division Watch Desk                       │
        │                                                           │
        │  NOTES (optional)                                         │
        │   ┌─────────────────────────────────────────────────────┐ │
        │   │                                                     │ │
        │   └─────────────────────────────────────────────────────┘ │
        ├───────────────────────────────────────────────────────────┤
        │                                    [ Cancel ]  [ Send Alert ]│
        └───────────────────────────────────────────────────────────┘
```

Every intelligence field is read-only. Only recipients and notes are editable. `Send Alert` is disabled with zero recipients.

---

## W-07 — Investigation Detail

```
┌────────────┬─────────────────────────────────────────────────────────────────────┐
│  SIDEBAR   │ Investigations › INV-2041                                           │
│            │ C-10284 · UPI Fraud · ₹3,80,000        Status: Alert Sent ▾  ⚑ High │
│            ├───────────────────────────────────┬─────────────────────────────────┤
│            │ CASE SURFACE                      │ TIMELINE                        │
│            │ ┌───────────────────────────────┐ │ ┌─────────────────────────────┐ │
│            │ │ Complaint summary             │ │ │ 14 Sep 10:42 · LEA          │ │
│            │ ├───────────────────────────────┤ │ │ Status → Alert Sent (auto)  │ │
│            │ │ Money trail (embedded graph)  │ │ ├─────────────────────────────┤ │
│            │ ├───────────────────────────────┤ │ │ 14 Sep 10:42 · LEA          │ │
│            │ │ Predicted hotspot + window    │ │ │ ⚑ Alert ALT-9932 dispatched │ │
│            │ ├───────────────────────────────┤ │ │   LEA, Bank                 │ │
│            │ │ Risk factors                  │ │ ├─────────────────────────────┤ │
│            │ ├───────────────────────────────┤ │ │ 14 Sep 10:31 · LEA          │ │
│            │ │ Associated alerts        (1)  │ │ │ Note: Team briefed for      │ │
│            │ └───────────────────────────────┘ │ │ Sector 18 deployment.       │ │
│            │                                   │ └─────────────────────────────┘ │
│            │                                   │ ┌─────────────────────────────┐ │
│            │                                   │ │ Add a note…                 │ │
│            │                                   │ │                    [ Add ]  │ │
│            │                                   │ └─────────────────────────────┘ │
└────────────┴───────────────────────────────────┴─────────────────────────────────┘
```

---

## W-08 — Reports

```
┌────────────┬─────────────────────────────────────────────────────────────────────┐
│  SIDEBAR   │ Reports    [Date range ▾][City ▾][State ▾][Fraud type ▾]  Clear all │
│            ├──────────────────────────────────┬──────────────────────────────────┤
│            │ COMPLAINTS OVER TIME             │ SUSPICIOUS TRANSACTIONS          │
│            │ (line)                           │ (bar)                            │
│            ├──────────────────────────────────┼──────────────────────────────────┤
│            │ ALERT SEVERITY                   │ PREDICTED HOTSPOTS BY SCORE      │
│            │ (stacked bar)                    │ (horizontal bar)                 │
│            ├──────────────────────────────────┼──────────────────────────────────┤
│            │ TOP DISTRICTS                    │ FRAUD TYPE MIX                   │
│            │ (bar)                            │ (donut + labelled legend)        │
│            ├──────────────────────────────────┴──────────────────────────────────┤
│            │ PROTOTYPE MODEL EVALUATION                     CyberPulse-Demo-v1   │
│            │ Precision 0.781 │ Recall 0.734 │ F1 0.757 │ ROC-AUC 0.871           │
│            │ Top-1 0.482     │ Top-3 0.751  │ Top-5 0.874                        │
│            │ ⓘ Measured on a held-out split of synthetic data. Does not          │
│            │   represent operational performance of a deployed system.           │
└────────────┴─────────────────────────────────────────────────────────────────────┘
```

Each chart has a `⊞` control revealing its accessible data table (AR-04).

---

## W-09 — Settings

```
┌────────────┬─────────────────────────────────────────────────────────────────────┐
│  SIDEBAR   │ Settings                                                            │
│            │ ┌─────────────────────────────────────────────────────────────────┐ │
│            │ │ SYSTEM MODE      Prototype                          (read-only) │ │
│            │ │ DATA MODE        Synthetic / Anonymised             (read-only) │ │
│            │ │ MODEL            CyberPulse-Demo-v1                 (read-only) │ │
│            │ └─────────────────────────────────────────────────────────────────┘ │
│            │ ┌─────────────────────────────────────────────────────────────────┐ │
│            │ │ RISK THRESHOLDS                                       ADMIN only│ │
│            │ │ HIGH   ≥ [0.70] ────●──────                                     │ │
│            │ │ MEDIUM ≥ [0.40] ──●────────                                     │ │
│            │ │ ⓘ Changes affect risk level display only. Stored scores are     │ │
│            │ │   unchanged.                                                    │ │
│            │ └─────────────────────────────────────────────────────────────────┘ │
│            │ ┌─────────────────────────────────────────────────────────────────┐ │
│            │ │ NOTIFICATION PREFERENCES                                        │ │
│            │ │ [✓] Show toast on alert dispatch                                │ │
│            │ │ [✓] Announce prediction completion to assistive technology      │ │
│            │ └─────────────────────────────────────────────────────────────────┘ │
│            │ ┌─────────────────────────────────────────────────────────────────┐ │
│            │ │ SYSTEM HEALTH                                        ● Healthy  │ │
│            │ │ Web application    ● up      12 ms                              │ │
│            │ │ Database           ● up      34 ms                              │ │
│            │ │ ML service         ● up     118 ms   CyberPulse-Demo-v1         │ │
│            │ └─────────────────────────────────────────────────────────────────┘ │
└────────────┴─────────────────────────────────────────────────────────────────────┘
```

---

## W-10 — Demo Mode

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ◈ CYBERPULSE AI — GUIDED DEMONSTRATION            SYNTHETIC DATA   [Reset Demo] │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ①Complaint ─── ②Money Trail ─── ③AI Analysis ─── ④Hotspot ─── ⑤Why ─── ⑥Alert │
│  ●───────────────●───────────────◉───────────────○──────────○─────────○         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   STEP 3 — AI ANALYSIS                                                          │
│                                                                                 │
│   Building features for 12 candidate locations…            ✓                    │
│   Scoring with CyberPulse-Demo-v1…                         ✓                    │
│   Ranking hotspots…                                        ●                    │
│   Computing explanation…                                                        │
│                                                                                 │
│   ⓘ This is a live call to the prediction service. No values are pre-set.       │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                        [ ‹ Back ]  [ Next › ]   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

Progress ticks reflect actual pipeline stages reported by the API, not a timed animation.

---

## Responsive Behaviour Summary

| Breakpoint | Change |
|---|---|
| ≥ 1760 px | Content max-width 1680 px, centred |
| 1440–1759 px | Full-width content; dashboard triptych stays in three columns |
| 1280–1439 px | Sidebar auto-collapses to 64 px; hotspot rail moves below the map; triptych becomes two columns |
| < 1280 px | Not a supported target. A notice states the recommended minimum, and the application remains operable with horizontal scrolling on tables. |
