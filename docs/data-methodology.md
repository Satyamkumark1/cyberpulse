# DATA METHODOLOGY — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Seed | `26184` |
| Claim | Every record in this system was produced by software. No real complaint, account, transaction, ATM or person is represented. |

---

## 1. Why Synthetic

No lawful access to complaint or banking data exists for this project, and none is claimed. That constraint turned out to be productive rather than merely limiting:

- The corpus regenerates byte-identically in three minutes, so a defect reproduces anywhere.
- The ground-truth labels the model needs exist, which they would not in production without outcome capture.
- The system is safe to demonstrate publicly.
- Backup becomes almost unnecessary — only user-generated alerts and cases are irreplaceable.

---

## 2. What Is Generated

| Entity | Count | Notes |
|---|:--:|---|
| Complaints | 500 | Six fraud types, seven metro regions |
| Accounts | 12,000 | Victim, mule, suspicious, merchant, normal |
| Transactions | 60,000 | Chains of depth 2–4 plus background activity |
| Withdrawals | 2,400 | The label source |
| ATMs | 520 | Placed within metro clusters |

Fraud types: UPI Fraud, Investment Scam, Phishing, Job Scam, QR Fraud, Card Fraud.
Regions: Delhi/NCR, Mumbai, Hyderabad, Bengaluru, Chennai, Ahmedabad, Lucknow.

---

## 3. Generation Model

```
For each complaint:
  sample region → sample fraud type → sample amount from that type's distribution
  sample complaint hour from that type's hour profile
  build a chain of depth 2–4:
      victim → account₁ → … → accountₙ
      each hop delayed by a per-hop distribution
  place a withdrawal at an ATM sampled from a
      REGION-SPECIFIC HOTSPOT PREFERENCE          ← the latent pattern
  emit background transactions so the chain is not trivially separable
```

The line marked with the arrow is the entire point. The hotspot preference is the pattern the model must recover; everything else exists so that recovering it is not trivial.

---

## 4. The Eight Planted Patterns

| Pattern | How it is planted | How it is checked |
|---|---|---|
| Time of day | Withdrawal hour sampled from a bimodal profile | χ² vs uniform, p < 0.01 |
| Day of week | Weekday preference | χ² vs uniform, p < 0.01 |
| Withdrawal density | Region-specific ATM preference | Gini across cells ≥ 0.40 |
| Transaction velocity | Fraud chains move faster than background | Mann-Whitney, p < 0.01 |
| Linked-account behaviour | Fraud chains are deeper | Mean depth difference ≥ 1.0 hop |
| Distance | Cash-out correlates with victim proximity, imperfectly | KS test, p < 0.01 |
| Historical hotspot | Cells reused across complaints | Rank correlation ρ ≥ 0.30 |
| Amount behaviour | Distributions differ by fraud type | KS test, p < 0.01 |

`signal_check.py` runs all eight and **blocks training** on any failure. This is the mitigation for the project's worst data risk: a generator that produces plausible-looking noise, discovered only after a day of unexplained model failure.

The check was written **before** the patterns were planted, so it drove the generator rather than rationalising it.

---

## 5. Deliberate Imperfection

A generator that plants patterns too cleanly produces a model that scores beautifully and means nothing. Four sources of noise:

| Noise | Purpose |
|---|---|
| ~10% of chains break the depth-2–4 rule | Prevents a trivially learnable structure |
| Some withdrawals occur outside the preferred cell | Prevents perfect recall |
| Background transactions share channels and amounts with fraud chains | Prevents separation on a single feature |
| Amount distributions overlap across fraud types | Prevents fraud type acting as a proxy label |

The second row creates the **recall ceiling**: some complaints have a true cash-out cell that candidate generation never proposes. Those complaints are deliberately retained in evaluation as all-negative groups, so top-k hit rate is not inflated by excluding the cases the engine cannot solve.

---

## 6. What Is Not Generated

No names. No addresses. No phone numbers. No email addresses. No government identifiers. No real account numbers. No IP addresses. No device identifiers.

The schema has no column for any of them, so this is structural rather than a property of the current generator output.

Institution names are synthetic labels. Coordinates are placed within metro clusters but correspond to no real address; hotspot coordinates are H3 cell centroids at roughly 460-metre scale.

---

## 7. The PII Gate

`pii_scan.py` runs before seeding and **cannot be skipped in CI**. It fails on any match for: Aadhaar-shaped 12-digit sequences, PAN-shaped patterns, 10-digit Indian mobile patterns, email addresses, common Indian given and family names from a reference list, and account identifiers not matching `ACC-\d{8}`.

A failure blocks `db:seed`, so no dataset that trips the scan can reach a database.

---

## 8. Provenance

`manifest.json` records the seed, the generator version, per-file row counts and a SHA-256 per file. Seeding verifies every checksum before inserting — a substituted or corrupted file is rejected rather than loaded.

Reproducing the corpus:

```bash
DATA_SEED=26184 pnpm generate:data
sha256sum -c manifest.json
```

Identical output, byte for byte, on any machine.

---

## 9. Honest Limitations

| Limitation | Consequence |
|---|---|
| Patterns are ours | Metrics measure recovery of what we planted, not real behaviour |
| Geography is a design choice | **Bias evaluation is impossible** — any disparity found would be a property of the generator |
| Labels come from `withdrawals.complaint_id` | This column would not exist in production without outcome capture |
| Seven regions, one generative process | Real regional variation is not represented |
| No adversarial adaptation | Real cash-out behaviour would change if such a system were known |
| 24-hour horizon assumed | Real distributions may be longer-tailed |

Row two is the most serious, and it is stated identically in `ai/evaluation-framework.md` §8, `security/compliance.md` §4 and `security/security-checklist.md` G-7.

---

## 10. The Position, Plainly

This corpus is good enough to prove that the pipeline works end to end, that the explanations are exact and stable, and that the system behaves correctly when it cannot answer.

It is not evidence that cash-out locations are predictable in the real world. That question needs real data with real outcomes, and this project does not have it. Saying so is the difference between a credible prototype and an overclaimed one.
