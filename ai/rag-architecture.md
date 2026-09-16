# RAG ARCHITECTURE — CyberPulse AI

```text
Not Applicable
Reason: CyberPulse AI performs no retrieval-augmented generation. There is no
generative model, no embedding model, no vector store, and no retrieval-then-
generate pipeline. The system's "retrieval" is ordinary indexed SQL, and its
"generation" is tree-ensemble inference over a fixed numeric feature vector.
```

Retained rather than omitted, because the reasons RAG does not fit this problem are a real design finding, and because the retrieval-shaped parts of the system deserve to be documented somewhere.

---

## 1. Why RAG Does Not Apply

RAG exists to ground a generative model in documents it was not trained on. Every part of that sentence fails to describe this product.

| RAG assumes | CyberPulse AI |
|---|---|
| The output is generated text | The output is a probability, a ranked list, a time window and a set of numeric attributions |
| The knowledge is unstructured documents | The knowledge is a relational schema with sixteen typed tables |
| Relevance is semantic similarity | Relevance is a bounded graph traversal and an H3 spatial index — both exact, not approximate |
| Grounding is the hard problem | Grounding is trivial: every input is a database row with a primary key |
| Approximate recall is acceptable | Missing a transaction in the money trail is a correctness failure, not a quality degradation |

An embedding-based retrieval step over this data would replace exact joins with approximate nearest-neighbour lookups. That is strictly worse: slower, non-deterministic, unexplainable, and capable of silently omitting a hop in a mule chain.

---

## 2. What Plays The Retrieval Role

The system does assemble context before inference. It does so with indexed SQL, and the design deserves the same scrutiny a retrieval pipeline would get.

```
Complaint C
   │
   ├─ 1. Chain transactions        idx_txn_complaint            exact FK lookup
   ├─ 2. Linked accounts           idx_accounts_account_id      exact join
   ├─ 3. Prior withdrawals         idx_wd_account               exact join
   ├─ 4. Candidate cells           H3 k-ring (k=3) + historical cells in state
   ├─ 5. ATM density per cell      idx_atms_h3r8 / idx_atms_h3r9
   └─ 6. Historical hotspot score  idx_wd_h3_ts                 the hottest query
            │
            └──▶ 60 candidate cells × 13 features ──▶ inference
```

| Property | Value | Contrast with vector retrieval |
|---|---|---|
| Recall | Exact within the bound | Approximate |
| Determinism | Total | Depends on index build and search parameters |
| Explainability | Every retrieved row has a primary key | Similarity scores are not evidence |
| Latency (p95) | ~165 ms for steps 1–6 | Comparable at best, with an index to maintain |
| Failure mode | A row is absent, and that is visible | A row is ranked below the cut-off, silently |

The last row is the decisive one for an enforcement tool. A missing hop in a money trail must be an absence you can detect, not a ranking artefact.

---

## 3. Candidate Generation Is The Closest Analogue

The one step that genuinely resembles retrieval is candidate cell generation: from all possible H3 cells in India, select roughly sixty worth scoring.

```python
candidates  = h3.grid_disk(victim_cell, k=3)        # spatial proximity
candidates |= historical_cells_in_state(top_n=40)   # prior cash-out geography
candidates  = dedupe(candidates)[:60]               # hard cap
```

It shares RAG's central risk — **anything not retrieved cannot be used** — and that risk is documented rather than hidden. A cash-out in a cell outside the candidate set cannot be predicted at all. This is stated as a hard recall ceiling in `ai/ai-strategy.md` §10 and `ai/model-selection.md` §2.1, and the evaluation deliberately retains those complaints as all-negative groups so that top-k hit rate is not inflated by excluding the cases the engine cannot solve (`ai/evaluation-framework.md` §2.2).

| Candidate-generation concern | Mitigation | Test |
|---|---|---|
| True cell outside the k-ring | Historical cells in the same state are added regardless of distance | TC-ML-020 |
| Recall ceiling unmeasured | Evaluation reports the share of holdout complaints whose true cell was never a candidate | TC-ML-070 |
| Cap of 60 too tight | Configurable; the effect on recall is recorded in `model_card.json` | TC-ML-072 |

---

## 4. If Document Retrieval Were Ever Needed

A plausible future case exists: retrieving similar historical cases to show an officer "three prior complaints with this pattern cashed out here". That is a genuine product idea, and it still would not need RAG.

| Approach | Verdict |
|---|---|
| Structured similarity over the existing feature vector (cosine or learned metric) | **Preferred** — reuses the thirteen features, stays explainable, no new infrastructure |
| Embedding + vector store over case narratives | Rejected unless free-text narratives become a real input, which they are not today |
| LLM summarisation of retrieved cases | Rejected — reintroduces every property §1 of `ai/prompt-library.md` rules out |

If narrative text ever did become an input, the requirements in `ai/prompt-library.md` §4 would apply in full, and this file would be rewritten rather than amended.

---

## 5. Verification

| Claim | Test |
|---|---|
| No embedding model or vector store dependency | TC-AI-001 |
| Context assembly uses indexed SQL only | TC-PERF-011, code review |
| Candidate generation is bounded and deterministic | TC-ML-020, TC-ML-025 |
| Recall ceiling is measured and published | TC-ML-070, `model_card.json` |
