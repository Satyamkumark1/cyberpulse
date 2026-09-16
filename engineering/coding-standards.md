# CODING STANDARDS — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Languages | TypeScript (strict) · Python 3.11 |
| Enforcement | ESLint + Prettier + `tsc --noEmit` · Ruff + Black + mypy · CI gates |
| Related | `.claude/rules/frontend.md`, `.claude/rules/backend.md`, `engineering/code-review-checklist.md` |

Standards here are the ones that are **enforced**. A convention nobody checks is a preference, and preferences belong in a conversation rather than a document.

---

## 1. Universal Rules

1. **Never display or persist a value the model did not produce.** This outranks every other rule in this document.
2. **Types are the contract.** `packages/shared` is the single definition; do not restate a type by hand on either side of the wire.
3. **No `any` in TypeScript, no bare `except` in Python.** Both are lint errors, not warnings.
4. **Errors are typed.** Throwing a string, or catching and logging without rethrowing or handling, fails review.
5. **Names say what the thing is, not what it is made of.** `rankedHotspots`, not `hotspotArr`.
6. **A file over 300 lines needs a reason.** A function over 50 lines needs a better reason.
7. **Comments explain *why*.** The code already says what. A comment restating the next line is deleted in review.

---

## 2. TypeScript

### 2.1 Compiler configuration

```jsonc
{
  "strict": true,
  "noUncheckedIndexedAccess": true,     // arr[0] is T | undefined — catches the real bug class
  "noImplicitOverride": true,
  "exactOptionalPropertyTypes": true,
  "noFallthroughCasesInSwitch": true,
  "verbatimModuleSyntax": true
}
```

`noUncheckedIndexedAccess` is the setting most teams disable and the one that catches the most defects here — every `rankedHotspots[0]` in this codebase is a case where the array could legitimately be empty.

### 2.2 Naming

| Kind | Convention | Example |
|---|---|---|
| Component | PascalCase, one per file, file matches export | `RiskBadge.tsx` |
| Hook | `use` + PascalCase | `usePrediction.ts` |
| Service module | camelCase noun + `Service` | `predictionService.ts` |
| Type / interface | PascalCase, no `I` prefix | `PredictionResponse` |
| Zod schema | PascalCase matching the type | `PredictionResponseSchema` |
| Constant | SCREAMING_SNAKE at module scope | `MAX_TRAVERSAL_DEPTH` |
| Boolean | `is` / `has` / `can` / `should` prefix | `isDegraded`, `hasPrediction` |
| Money variable | **must** end `Paise` | `exposurePaise` |
| Timestamp variable | **must** carry its zone | `createdAtUtc`, `windowStartIst` |

The last two are not style. Mixing rupees and paise, or UTC and IST, is the defect class most likely to produce a wrong number on screen, and the naming rule is the cheapest possible defence (ADR-018).

### 2.3 Imports

```ts
// 1. node builtins   2. external   3. @cyberpulse/*   4. @/ absolute   5. ./relative   6. types
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { PredictionResponseSchema } from '@cyberpulse/shared';
import { predictionService } from '@/services/predictionService';
import { formatPaise } from './format';
import type { ActorRole } from '@cyberpulse/shared';
```

Enforced by `eslint-plugin-import` ordering. Forbidden edges are enforced by `no-restricted-imports` and are listed in `diagrams/system-architecture.md` D-05.

### 2.4 Functions

```ts
// Options object at three or more parameters — call sites stay readable
export async function listComplaints(opts: {
  page: number; pageSize: number; filters: ComplaintFilters; role: ActorRole;
}): Promise<Paginated<ComplaintRow>> { ... }

// Return early; do not nest
export function toRiskLevel(score: number, t: Thresholds): RiskLevel {
  if (score >= t.high) return 'HIGH';
  if (score >= t.medium) return 'MEDIUM';
  return 'LOW';
}
```

Exported functions are explicitly typed on both parameters and return. Inference is fine internally; it is not fine across a module boundary, because that is where a silent widening becomes someone else's problem.

### 2.5 React

- Server Component by default. `'use client'` requires a one-line comment naming the reason: interactivity, browser API, or a client-only library.
- Props typed with an exported interface; no inline object types on exported components.
- No `useEffect` for data fetching — server components or TanStack Query.
- No `useState` for anything derivable from props or from the URL. Filter state lives in the query string.
- Event handlers named `handleX`; props that accept them named `onX`.
- Keys are stable domain identifiers, never array indices.

### 2.6 Forbidden

| Forbidden | Why | Enforcement |
|---|---|---|
| `any` | Defeats the contract | ESLint error |
| `as` outside a validated boundary | Assertion is not validation | Review + ESLint warn |
| `dangerouslySetInnerHTML` | XSS | ESLint error |
| `console.*` in application code | Use the structured logger | ESLint error |
| `process.env` outside `lib/env.ts` | Unvalidated configuration | ESLint error |
| SQL in a component or route handler | Layering | `no-restricted-imports` |
| `outline: none` without a replacement | Accessibility | ESLint error |
| Non-null assertion `!` | Hides the case that will occur | ESLint error |
| Default exports (except Next.js pages) | Rename drift | ESLint error |

---

## 3. Python

### 3.1 Tooling

Ruff (lint + import sort), Black (88 columns), mypy in strict mode for `app/engine/**` — the feature and inference code where a type error becomes a wrong prediction rather than a crash.

### 3.2 Conventions

```python
FEATURE_ORDER: Final[list[str]] = [...]        # module constant, SCREAMING_SNAKE
FEATURE_SCHEMA_VERSION: Final[str] = "fs-1"

def build_vector(
    complaint: ComplaintInput,
    transactions: Sequence[TransactionInput],
    accounts: Sequence[AccountInput],
    cell: CandidateCell,
) -> npt.NDArray[np.float64]:
    """Build the 13-feature vector for one complaint-cell pair.

    Deterministic: identical inputs produce an identical vector.
    Missing inputs resolve to the documented defaults; never raises on absence.
    """
```

- Type hints on every function signature, no exceptions in `engine/`.
- Docstrings on every public function, stating determinism and default behaviour where relevant.
- `Final` for module constants; no mutable module-level state.
- Custom exceptions inherit from a single `CyberPulseError` base so the FastAPI handler can map them exhaustively.
- Never catch bare `Exception` except in the top-level handler, and there it logs with the request ID and re-raises as a typed error.

### 3.3 Numeric discipline

```python
score = float(np.clip(raw, 0.0, 1.0))     # explicit float(), explicit clip
assert not np.isnan(vec).any(), "NaN in feature vector"
```

NaN reaching XGBoost produces a plausible, meaningless score rather than an error — which is why absence is asserted rather than assumed (TC-UNIT-013).

---

## 4. Database Code

- All access through Drizzle. No string-built SQL. The one raw CTE (`packages/db/queries/network.ts`) is parameterised, commented and individually reviewed.
- Every query that can return many rows takes an explicit limit.
- Transactions wrap any multi-write operation; `auditService.record` requires a transaction handle by signature.
- Column names `snake_case`; TypeScript fields `camelCase`; Drizzle maps between them in one place.

---

## 5. Error Handling

```ts
// Typed errors, mapped once
export class NotFoundError extends AppError {
  constructor(public readonly resource: string) { super('NOT_FOUND'); }
}
```

Full treatment in `engineering/error-handling.md`. The standard here: never swallow, never stringify, never let an internal error reach a client body.

---

## 6. Testing Conventions

- Test files sit beside their subject: `predictionService.test.ts`.
- Names describe behaviour: `returns 404 when the complaint is out of scope for BANK`.
- Arrange / Act / Assert, visually separated.
- One behaviour per test. A test asserting five unrelated things reports one failure for five causes.
- Fixtures in `__fixtures__/`, never inline in more than one file.
- No network, no clock, no randomness without an explicit seed or fake.

---

## 7. Comments and Documentation

```ts
// SHAP for the top cell only: explaining all 60 candidates costs ~4.2 s for
// information nobody reads. See ai/ai-strategy.md §7.
const explained = await explainTopCell(ranked[0]);
```

Good comments state a decision and point at where it is recorded. Every non-obvious constant carries the reason for its value, and every deviation from an ADR carries the decision-log reference that permitted it.

---

## 8. Commits

```
<type>(<scope>): <imperative summary>

<why, if not obvious from the summary>

Refs: FR-08.3, ADR-013
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `perf`, `chore`, `sec`, `model`. A `model` commit must include the metric deltas in its body and a `CHANGELOG.md` entry, per `engineering/release-process.md` §5.
