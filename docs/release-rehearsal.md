# Release rehearsal record

This is the evidence sheet for the final hackathon release check. It is
deliberately a blank record: a command being documented is not evidence that
the run happened.

## Required environment

Record the commit, model bundle ID, dataset manifest hash, Node/Python
versions, database mode, browser, viewport and whether the ML service was
cold or warm. Do not report a warm run as a cold-start result.

## Automated release checks

```text
[ ] pnpm lint
[ ] pnpm typecheck
[ ] pnpm test:unit
[ ] pnpm test:int (with migrated, seeded database and ready ML service)
[ ] pnpm test:e2e
[ ] pnpm pii:scan
[ ] pnpm signal:check
[ ] pnpm audit --prod
[ ] pnpm audit (development dependencies; record "not applicable" with reason if unavailable)
[ ] Python audit (`pip-audit` or the project's configured equivalent; record "not applicable" with reason if unavailable)
[ ] model bundle manifest hashes verify
```

For each audit, record the command, date, environment and result. If a tool is
not installed or a dependency class is not used, write `N/A — <reason>` rather
than leaving the check ambiguous.

## Timed narrated runs

The acceptance gate is two independent complete runs of `docs/demo-script.md`
in 180 seconds or less. Record wall-clock start/end times and the observed
duration; do not infer a pass from the script's nominal timings.

| Run | Date/time | Environment | Duration | Complete chain | Reset verified | Notes |
|---|---|---|---:|:---:|:---:|---|
| 1 | | | | [ ] | [ ] | |
| 2 | | | | [ ] | [ ] | |

## Failure drills

| Drill | Expected honest behavior | Observed | Pass |
|---|---|---|:---:|
| ML cold/unavailable | degraded state, retry path, no fabricated prediction values | | [ ] |
| malformed ML response | typed failure, no prediction row | | [ ] |
| failed refresh with an older result | older result marked historical/unavailable; alert action disabled | | [ ] |
| corrupt/incompatible model bundle | ML readiness fails; no fallback score | | [ ] |
| map/geocoder failure | map fallback only; prediction state remains independent | | [ ] |
| demo reset | demo records and audit event commit atomically | | [ ] |

## Known limitations to disclose

- The data and published metrics are synthetic and measure recovery of planted
  patterns, not field accuracy.
- The role selector is asserted prototype context, not authentication.
- Alerts are internal prototype queue records; no email, SMS, bank, I4C or
  other external notification is sent.
- A completed release requires the manual rows above to be filled with actual
  evidence; this file alone does not certify the release.
