# /build-feature

## Purpose
Implement a feature end to end — data, service, API, UI, tests, documentation — against its existing specification. This command never invents scope; it realises what `FEATURE_SPECIFICATIONS.md` already defines.

## Inputs
- `FEAT-xx` (required)
- Phase (optional; defaults to the feature's phase in the spec)

## Required reading, in order
1. `FEATURE_SPECIFICATIONS.md` → the feature's 14 sections
2. `REQUIREMENTS.md` → its FR/NFR IDs
3. `ACCEPTANCE_CRITERIA.md` → its AC IDs
4. `USER_STORIES.md` → its stories
5. `architecture/api-design.md` and `architecture/database-design.md` → contracts
6. `architecture/architecture-decisions.md` → constraining ADRs
7. `implementation/phase-<n>.md` → phase scope and exit criteria
8. `.claude/rules/*` for every layer touched

## Execution
1. Restate the feature's acceptance criteria and the test IDs that verify them. Stop if any is ambiguous.
2. Schema: add or confirm tables, columns, constraints, indexes. Migration additive-first with a rollback note.
3. Shared contract: update the JSON Schema in `packages/shared`; regenerate Zod and Pydantic.
4. Service: implement in `services/`, declare the capability, apply the scope predicate, wrap multi-writes in a transaction with their audit event.
5. Route handler: validate → resolve role → authorise → rate limit → delegate → respond.
6. UI: Server Component unless interactivity requires otherwise; all four states; colour + text + icon for any status.
7. Tests at every layer touched, including the two project-specific ones: displayed value comes from the response, persisted value equals the response.
8. Update the documents the change affects, in the same commit.

## Validation
- [ ] Every AC for the feature is satisfiable and tested
- [ ] No hard-coded model value anywhere in the diff
- [ ] Layering respected (no SQL in components or handlers)
- [ ] Capability declared; 403 for capability, 404 for scope
- [ ] Privileged writes transactional with audit
- [ ] Four UI states implemented
- [ ] `make verify` green

## Test requirements
Happy path · one boundary · one invalid input · every new failure branch · one case per role for any new authorisation · displayed-value provenance · persisted-value equality.

## Expected output
Working feature, tests passing, documentation updated, PR description referencing FR and AC IDs and listing which test cases now cover them.
