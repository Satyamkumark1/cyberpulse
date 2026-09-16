# CODE REVIEW CHECKLIST — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Use | Every pull request. The author self-reviews against it before requesting review. |
| Related | `security/security-checklist.md` §1, `engineering/coding-standards.md` |

---

## 0. The Four Questions

Before the checklist, a reviewer answers four questions. If any answer is unsatisfactory, the detailed items do not matter yet.

1. **Could this put a number on screen that the model did not produce?**
2. **Could this let a role do something it should not, or see something it should not?**
3. **Could this leave the database in a partial state?**
4. **Would a new team member understand why this was done this way in six weeks?**

Question 1 comes first because it is this product's defining failure mode.

---

## 1. Correctness

- [ ] The change does what the PR description says, and the description says why
- [ ] Requirement or ADR IDs referenced
- [ ] Edge cases handled: empty, single, maximum, boundary
- [ ] Failure paths handled, not just the happy path
- [ ] No off-by-one in pagination, depth bounds or bin indices
- [ ] Money is integer paise; variables end in `Paise`
- [ ] Timestamps are UTC in storage; variables name their zone
- [ ] No floating-point arithmetic on currency

## 2. Integrity — this product's defining risk

- [ ] No hard-coded prediction, score, hotspot name, percentage or metric value
- [ ] Every displayed figure traces to a field in an API response
- [ ] No client-side recomputation of a displayed figure beyond documented formatting
- [ ] No caching of prediction values
- [ ] No optimistic UI for anything model-derived
- [ ] Failure paths render no numbers at all
- [ ] Model metrics read from `model_metrics`, never literals
- [ ] Any new documentation placeholder value is absent from shipped code

## 3. Architecture and layering

- [ ] No SQL in a component or a route handler
- [ ] No ML call outside `services/`
- [ ] No HTTP or React types inside `services/`
- [ ] Route handler is validate → resolve role → authorise → delegate → respond
- [ ] New logic in `services/` would work identically in a CLI with no HTTP and no React
- [ ] No new cross-service import outside the documented compositions
- [ ] Shared types changed in `packages/shared`, not duplicated

## 4. Security and authorisation

- [ ] Input validated with a shared Zod schema; schemas strict
- [ ] New sortable column added to the allow-list, never interpolated
- [ ] New service function declares a capability or is explicitly marked public
- [ ] Capability failure returns 403; scope failure returns 404
- [ ] Scope applied as a query predicate, not a post-filter
- [ ] Pagination `total` computed after the scope predicate
- [ ] Server-derived fields rejected with 400 if client-supplied, not silently ignored
- [ ] New privileged action calls `auditService.record` with a transaction handle
- [ ] No new personal-data column, and no name field in any node payload
- [ ] No secret in a `NEXT_PUBLIC_*` variable; `.env.example` updated
- [ ] No `dangerouslySetInnerHTML`
- [ ] New outbound host accompanied by a CSP update and a reason

## 5. Data and transactions

- [ ] Multi-write operations wrapped in one transaction
- [ ] Nothing persists on a failure path
- [ ] Migration is additive-first, with a rollback note
- [ ] New index names the query it serves
- [ ] New query has a limit
- [ ] `EXPLAIN ANALYZE` included for a query on a table above 10,000 rows
- [ ] Constraints expressed in the database where they are invariants, not only in validation

## 6. Error handling

- [ ] Errors are typed classes, never strings
- [ ] Nothing swallowed; no bare catch that only logs
- [ ] All responses flow through the single serialiser
- [ ] No internal detail in any response body
- [ ] New error code added to the closed set and documented
- [ ] Retry policy correct: connection errors only, never timeouts or 4xx

## 7. UI and accessibility

- [ ] Loading, empty, error and degraded states all implemented
- [ ] Risk and status convey by colour **and** text **and** icon
- [ ] Keyboard reachable; focus visible; focus returns on overlay close
- [ ] Live region announcement where a change is not visually obvious
- [ ] Copy follows the voice rules; fixed strings exact
- [ ] Terminology lexicon respected; no accusatory language
- [ ] Prototype badge and disclaimer present on any new route
- [ ] Server Component unless a documented reason requires otherwise
- [ ] axe-core clean at `critical` and `serious`

## 8. Performance

- [ ] New heavy dependency dynamically imported
- [ ] Route within its bundle budget
- [ ] New async region reserves space with a matching skeleton
- [ ] No per-request model artefact load, no Python loop over candidates
- [ ] No `SELECT *`
- [ ] Measured, not assumed

## 9. Tests

- [ ] Tests included; a defect fix has a test that fails without the fix
- [ ] Happy path, one boundary, one invalid input
- [ ] Every new failure branch has a case
- [ ] New authorisation decision has a case per role
- [ ] New displayed value has a case asserting it comes from the response
- [ ] New persisted value has a case asserting the response matches the row
- [ ] No sleeps, no unseeded randomness, no real clock
- [ ] Coverage gates still met

## 10. Documentation

- [ ] Behaviour, schema or API change reflected in the relevant document **in this PR**
- [ ] `CHANGELOG.md` entry for anything user-visible
- [ ] `Model` entry with before/after metrics if the model changed
- [ ] ADR added for a significant technical decision
- [ ] Non-obvious constants carry the reason for their value
- [ ] No `TODO` without an owner and a reference

---

## 11. Reviewing Well

**Separate the blocking from the optional.** Prefix non-blocking comments with `nit:`. A review where everything reads as mandatory is a review the author cannot prioritise.

**Ask rather than assert when you are unsure.** "What happens if `rankedHotspots` is empty here?" surfaces the answer faster than "this will crash", and is right more often.

**Approve when it is better than what is there, not when it is perfect.** Blocking on preference is how a three-week window becomes four.

**Block without hesitation on:** a hard-coded model value, a missing authorisation check, a non-transactional privileged write, a swallowed error, or a missing test for a new failure path. These five are the ones where "we'll fix it later" reliably means "we won't".

---

## 12. Author Self-Review

Before requesting review, read your own diff top to bottom as though someone else wrote it. This catches, reliably: leftover debug code, a placeholder that was meant to be temporary, a test that asserts nothing, a copied block that no longer fits, and the file you meant to delete.

It takes five minutes and removes most of the first round of comments.
