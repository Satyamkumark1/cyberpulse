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
| T−25 | **Reset Demo** |
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

> "Sector 18, Noida. Ninety-one point seven percent. Three ATMs in that cell.
>
> And it doesn't just give one answer — there's a ranked list. Gurugram second, Dwarka third. If the first deployment comes up empty, the officer already has the next option.
>
> Expected window: two in the afternoon to four. That's what makes it a deployment rather than an indefinite stakeout."

---

### Step 5 · Why — 35 s

*Expand the factor panel.*

> "This is the part that matters most. Transaction velocity, twenty-seven percent. Historical hotspot, twenty-two. Linked account pattern, nineteen. ATM proximity, fourteen.
>
> These are exact Shapley values from the model that produced the score — not an after-the-fact story. An officer can read this to a supervisor. A supervisor can disagree with it.
>
> And if we can't produce an explanation, we say so. We never show a score and pretend it's explained."

Thirty-five seconds is the longest block in the script, deliberately. Explainability is the differentiator, and it is the thing a technical evaluator will probe.

---

### Step 6 · The action — 25 s

*Click Generate Alert.*

> "Intelligence that stays in a dashboard isn't intelligence. Location, window, risk, exposure, top factors — pre-filled. The officer picks recipients: their own unit, the banks, I4C."

*Send.*

> "Sent. It's now on the dashboard, in the alerts queue, and on the case timeline — with an audit record of who sent it and when. The bank officer can acknowledge it from their own view."

---

### Closing — 10 s

> "Complaint to dispatched intelligence in five clicks.
>
> To be clear about what this is: synthetic data, a prototype, decision support. It predicts locations and time windows, never people. It never acts on its own. And our published accuracy figures are measured on synthetic data — we're not claiming real-world performance we can't demonstrate."

---

## If the service is cold or down

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

\* Overlaps with the alert confirmation rendering. Rehearsed total: 180 s.

**If it runs long, cut narration — never a step.** The chain is the product; removing a link demonstrates something lesser.

---

## Between evaluators

1. **Reset Demo** — confirm the counts
2. Check the health tab
3. Reload `/demo`
4. Confirm `C-10284` is present

Thirty seconds, every time, without exception.
