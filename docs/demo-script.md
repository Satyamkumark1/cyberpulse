# DEMO SCRIPT — CyberPulse AI

| Field | Value |
|---|---|
| Duration | 180 seconds |
| Route | `/demo`, or the dashboard's **RUN DEMO SCENARIO** control |
| Rehearsal target | Two independent runs, each ≤ 180 s (TC-P8-01) |

---

## Before the room

| Time | Action |
|---|---|
| T−60 | `/api/health` all green; smoke suite; model version verified |
| T−30 | One full `/demo` run — warms the service and the caches |
| T−25 | Click **ADMIN** (opens a new tab), **Reset Demo**, close that tab |
| T−15 | Health tab open in a second window; mains power; screen sleep off; zoom 100%; window 1920×1080 |
| T−5 | Printed runbook to hand |

The 100% zoom at 1920×1080 matters: the layout is designed for that viewport, and a demonstration at 80% on a 4K panel shows a product nobody designed.

---

## The script

### Opening — 10 s

> "This is CyberPulse AI, built for problem statement 26184. When someone reports a cyber-fraud, the money is already moving. Within hours it's cash. We forecast **where** and **when** it comes out — so a team can be there first.
>
> Everything you'll see runs on synthetic data. Nothing here touches a real system."

Lead with the limitation. It costs four seconds and it changes how everything after it is heard.

---

### Step 1 · The complaint — 20 s

*Screen: complaint C-10284.*

> "A UPI fraud. Three lakh eighty thousand rupees. Filed this morning from Noida.
>
> Today, an officer with this on their desk waits days for bank statements. By then the money is gone."

---

### Step 2 · The money trail — 25 s

*Screen: money-trail graph.*

> "First thing we do is reconstruct the trail. The victim's money went to one account, then split across two more, and those accounts have withdrawal history at three ATMs.
>
> A bank statement is a list. The fraud is a graph — and the structure is where the intelligence is."

*Click a mule account node.*

> "Note the language. 'Mule account.' 'Risk indicator.' This system never says anyone is a criminal."

That last line is worth the three seconds. It pre-empts the objection a government evaluator is most likely to raise.

---

### Step 3 · The analysis — 30 s

*Click Analyze. Progress ticks appear.*

> "Now the model. It builds thirteen features for each of about sixty candidate locations — transaction velocity, how deep the account chain goes, distance, ATM density, historical cash-out patterns, time of day.
>
> These ticks are the actual pipeline stages. This is a live call — nothing here is pre-computed."

*Result renders.*

---

### Step 4 · Where — 35 s

*Screen: prediction panel; map zooms to the hotspot.*

> "The current prediction names [read the returned locality]. The risk level is [read the returned level], with [read the returned ATM count] nearby ATMs.
>
> And it doesn't just give one answer — there's a ranked list. If the first location is not actionable, the officer already has the next option.
>
> Expected window: two in the afternoon to four. That's what makes it a deployment rather than an indefinite stakeout."

---

### Step 5 · Why — 35 s

*Expand the factor panel.*

> "This is the part that matters most. Read the top returned factors and their relative contributions; do not memorise values from an earlier run.
>
> These are relative Shapley contributions from the served classifier, not an after-the-fact story and not a calibrated cash-out probability. An officer can read them to a supervisor. A supervisor can disagree with the model.
>
> And if we can't produce an explanation, we say so. We never show a score and pretend it's explained."

Thirty-five seconds is the longest block in the script, deliberately. Explainability is the differentiator, and it is the thing a technical evaluator will probe.

---

### Step 6 · The action — 25 s

*Click **Queue Internal Alert**.*

> "Intelligence that stays in a dashboard is easy to miss. Location, window, risk, exposure and top factors are pre-filled. This prototype queues an internal alert for authorised prototype roles; it does not contact a bank, I4C or any external system."

*Confirm the queue action.*

> "Queued. It is now in the internal alerts queue and on the case timeline, with an audit record of who queued it and when. An authorised prototype user can acknowledge it from their own view."

---

### Closing — 10 s

> "Complaint to an internally queued decision-support alert in five clicks.
>
> To be clear about what this is: synthetic data, a prototype, decision support. It predicts locations and time windows, never people. It never acts on its own. And our published accuracy figures are measured on synthetic data — we're not claiming real-world performance we can't demonstrate."

---

## Citizen segment — Scam Shield (FEAT-17), about 60 s

Run it before the Opening when the slot allows, or on its own when an evaluator asks what the product does for the public. **Not yet timed against the 180 s budget** — rehearse it twice (phase-9.md exit criteria) before adding it to the main run.

1. **Phone view, `/safety/check`.** Tick three digital-arrest statements.
   > "A citizen gets a 'digital arrest' call. Three red flags, each with the reason and the public advisory it comes from — and no score. A person deciding whether to hang up needs reasons, not a probability."
2. **`/safety/report`.** Show 1930 first, then file Delhi, UPI fraud, any amount. Read out the complaint ID; do not read the tracking code aloud.
   > "Someone who already paid is sent to 1930 first. The form asks three things and nothing personal. And it says plainly that this prototype does not forward the report."
3. **Officer side (LEA).** Open the new `C-9####` in Complaints; Analyze; Queue Internal Alert.
   > "The same report, in the officer queue, through the same model. It has no transaction trail yet, so the model says how confident it is — and that is what it shows."
4. **Back on the phone, `/safety/status`.** Enter the ID and code.
   > "The citizen sees that the report reached the prototype's internal workflow — and nothing about where or when. Prediction details stay with the officer view."

**Reset Demo** clears every citizen report along with the demo alerts.

Do not apologise or improvise. Say:

> "The prediction service has spun down — it's on a free tier. Watch what happens: it tells us it can't predict, and it shows no numbers at all. That's deliberate. The worst thing this system could do is invent a plausible number an officer then acts on."

Then retry, or switch to the local stack. **Honest failure, presented deliberately, is a stronger demonstration of engineering judgement than a demo that cannot fail.**

---

## If a number looks wrong

Stop. Reset. Reload. Do not explain it away.

---

## Timing

| Block | Seconds | Cumulative |
|---|:--:|:--:|
| Opening | 10 | 10 |
| Complaint | 20 | 30 |
| Money trail | 25 | 55 |
| Analysis | 30 | 85 |
| Where | 35 | 120 |
| Why | 35 | 155 |
| Action | 25 | 180 |
| Closing | 10 | 190* |

\* The scripted narration sums to 190 seconds. The release gate is a ≤180-second run, so the presenter must overlap the closing with the alert confirmation or trim narration. Record the observed time; do not call an unmeasured run rehearsed.

**If it runs long, cut narration — never a step.** The chain is the product; removing a link demonstrates something lesser.

---

## Between evaluators

1. **Reset Demo** in an ADMIN tab (click **ADMIN**) — confirm the counts, then close that tab
2. Check the health tab
3. Reload `/demo`
4. Confirm `C-10284` is present

Thirty seconds, every time, without exception.
