# /review-code

## Purpose
Review a change against this project's standards, prioritising the failure modes that matter here rather than generic code smells.

## Inputs
- A diff, a PR, or a set of changed files

## Required reading
1. `engineering/code-review-checklist.md` → the full checklist
2. `.claude/rules/*` for every layer touched
3. The requirement and AC IDs the change claims to satisfy

## Execution

**Start with the four questions.** If any answer is unsatisfactory, the detailed checklist does not matter yet.

1. Could this put a number on screen that the model did not produce?
2. Could this let a role do something, or see something, it should not?
3. Could this leave the database in a partial state?
4. Would a new team member understand why this was done this way in six weeks?

Then work the checklist in `engineering/code-review-checklist.md` §1–10.

## What blocks, without negotiation

- A hard-coded prediction, score, hotspot name or metric value
- A missing authorisation check, or one implemented by hiding UI
- A privileged write outside a transaction, or without its audit event
- A swallowed error
- A missing test for a new failure path
- A personal-data column or a name field in a node payload
- An error response carrying internal detail

These five-plus-two are the ones where "we'll fix it later" reliably means "we won't".

## What does not block

Style preferences, naming debates, alternative-but-equivalent structures. Prefix these `nit:`. A review where everything reads as mandatory is a review the author cannot prioritise.

## Reporting

For each finding: the file and line, what is wrong, why it matters **in this system**, and the fix. Reference the rule or requirement it violates.

Ask rather than assert when unsure — "what happens if `rankedHotspots` is empty here?" surfaces the answer faster than "this will crash", and is right more often.

## Expected output
A prioritised list separating blocking findings from suggestions, each with a rule reference, and an explicit approve / request-changes recommendation.
