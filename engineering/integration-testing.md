# INTEGRATION TESTING — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Tools | Vitest + a real PostgreSQL instance · pytest + httpx for the ML contract |
| Scope | Route handler → service → database, and web → ML service |
| Related | `test-cases/integration-tests.md`, `test-cases/api-tests.md` |

---

## 1. Why the Database Is Never Mocked Here

Every correctness property this system leans on lives partly in Postgres:

| Property | Enforced by |
|---|---|
| Window width ≤ 4 hours | `CHECK` on `predictions` |
| One investigation per complaint | `UNIQUE` on `investigations.complaint_id` |
| At least one alert recipient | `CHECK (array_length(recipients, 1) >= 1)` |
| `thresholdHigh > thresholdMedium` | `CHECK` on `settings` |
| Non-empty note body | `CHECK (length(trim(body)) > 0)` |
| Referential integrity | Foreign keys |
| Atomicity of alert + audit + investigation | Transactions |

A mocked ORM asserts that the application called a method. It cannot assert that Postgres would have accepted the write. Since several of these constraints exist precisely as a last line of defence against an application bug, testing them through a mock would test the wrong thing entirely.

---

## 2. Environment

| Context | Database |
|---|---|
| Local | `postgres:16-alpine` from Docker Compose, or a throwaway testcontainer |
| CI | Neon branch created per PR, destroyed on merge |

Each test file opens a transaction, seeds what it needs, runs, and rolls back. Tests that must observe a real commit — the alert atomicity cases — use a dedicated schema that is truncated in `afterEach` instead.

```ts
beforeEach(async () => { tx = await db.begin(); });
afterEach(async () => { await tx.rollback(); });
```

---

## 3. What an Integration Test Covers

```
HTTP request
   ↓  validation
   ↓  role resolution and authorisation
   ↓  service layer
   ↓  SQL against a real database
   ↓  (ML service, real or contract-stubbed)
   ↓  transaction commit or rollback
HTTP response
```

Anything narrower is a unit test. Anything wider — involving a browser — is E2E.

---

## 4. Representative Tests

### 4.1 The response equals the persisted row

```ts
it('returns exactly what was written, not what the ML service returned', async () => {
  const res  = await POST('/api/predict', { complaintId: 'C-10284' }, { role: 'LEA' });
  const body = await res.json();

  const row = await db.query.predictions.findFirst({
    where: eq(predictions.predictionRef, body.predictionRef),
    with: { riskFactors: { orderBy: asc(riskFactors.rank) } },
  });

  expect(body.riskScore).toBe(row.riskScore);
  expect(body.rankedHotspots).toEqual(row.rankedHotspots);   // jsonb round-trip
  expect(body.factors).toHaveLength(row.riskFactors.length);
  expect(body.factors[0].contribution).toBeCloseTo(row.riskFactors[0].contribution, 3);
});
```

This is TC-INT-013, and it is the test that makes NFR-26 real. A float that rounds differently on the way into a `real` column would surface here and nowhere else.

### 4.2 Atomicity under injected failure

```ts
it('writes nothing when the audit insert fails', async () => {
  const before = await counts(['alerts', 'audit_events', 'investigations']);
  vi.spyOn(auditService, 'record').mockRejectedValueOnce(new Error('injected'));

  const res = await POST('/api/alerts', { predictionRef: 'PRD-4821', recipients: ['LEA'] }, { role: 'LEA' });

  expect(res.status).toBe(500);
  expect(await counts(['alerts', 'audit_events', 'investigations'])).toEqual(before);
});
```

Run three times, injecting the failure at each of the three writes in turn. An alert that dispatches without its audit record is the failure this test exists to make impossible.

### 4.3 Authorisation across the whole matrix

```ts
describe.each(CAPABILITY_MATRIX)('%s', (capability, expectations) => {
  it.each(['LEA', 'BANK', 'ADMIN'])('behaves as specified for %s', async (role) => {
    const before = await totalRowCount();
    const res = await callCapability(capability, role);
    expect(res.status).toBe(expectations[role]);
    if (res.status === 403) expect(await totalRowCount()).toBe(before);   // denied means no write
  });
});
```

Sixty-six cases generated from the matrix in `security/authorization.md` §2. Adding a capability to the matrix without implementing it fails the suite, which keeps the document and the code honest in both directions.

### 4.4 Scope indistinguishability

```ts
it('cannot distinguish out-of-scope from non-existent', async () => {
  const outOfScope = await GET('/api/complaints/C-10284', { role: 'BANK' });   // exists, not theirs
  const absent     = await GET('/api/complaints/C-99999', { role: 'BANK' });   // does not exist
  expect(outOfScope.status).toBe(404);
  expect(await outOfScope.text()).toBe(await absent.text());                    // byte-identical
});
```

### 4.5 State-machine enforcement

```ts
it.each(INVALID_TRANSITIONS)('rejects %s → %s with 409', async (from, to) => {
  const inv = await seedInvestigation({ status: from });
  const res = await PATCH(`/api/investigations/${inv.caseId}`, { status: to, expectedUpdatedAt: inv.updatedAt });
  expect(res.status).toBe(409);
  expect((await res.json()).error.code).toBe('INVALID_TRANSITION');
  expect((await reload(inv)).status).toBe(from);     // unchanged
});
```

### 4.6 Optimistic concurrency

```ts
it('rejects the second of two concurrent status updates', async () => {
  const inv = await seedInvestigation({ status: 'ANALYZING' });
  const [a, b] = await Promise.all([
    PATCH(`/api/investigations/${inv.caseId}`, { status: 'UNDER_REVIEW', expectedUpdatedAt: inv.updatedAt }),
    PATCH(`/api/investigations/${inv.caseId}`, { status: 'UNDER_REVIEW', expectedUpdatedAt: inv.updatedAt }),
  ]);
  const codes = [a.status, b.status].sort();
  expect(codes).toEqual([200, 409]);
});
```

### 4.7 Graph traversal safety

```ts
it('terminates on a cyclic chain within the time budget', async () => {
  const complaint = await seedCyclicChain();          // A → B → C → A
  const t0 = performance.now();
  const res = await GET(`/api/transactions/network/${complaint.complaintId}?depth=6`);
  expect(performance.now() - t0).toBeLessThan(1000);
  expect(res.status).toBe(200);
  const { nodes } = await res.json();
  expect(new Set(nodes.map(n => n.id)).size).toBe(nodes.length);   // no duplicates
});
```

---

## 5. ML Service Contract Tests

Two directions, both required.

**Web → ML, with a stub.** Confirms the client rejects anything malformed rather than persisting it.

```ts
it.each([
  ['score out of range',      { riskScore: 1.5 }],
  ['too few factors',         { factors: threeFactors() }],
  ['factors summing to 140',  { factors: factorsSummingTo(140) }],
  ['nine-hour window',        { expectedWindow: nineHours() }],
  ['raw feature name',        { factors: [{ name: 'txn_velocity_1h', contribution: 100, direction: 'INCREASES' }] }],
])('rejects a malformed ML response: %s', async (_label, override) => {
  stubMl({ ...validCore, ...override });
  const res = await POST('/api/predict', { complaintId: 'C-10284' }, { role: 'LEA' });
  expect(res.status).toBe(500);
  expect(await db.query.predictions.findFirst({ where: eq(predictions.complaintId, ID) })).toBeUndefined();
});
```

**ML service against the shared schema.** The Python suite validates live responses against the generated schema, so a change on either side fails on both.

---

## 6. Failure Injection Matrix

| Injected | Expected |
|---|---|
| ML connection refused | 503 `ML_UNAVAILABLE`, nothing persisted |
| ML responds after 8 s | 504 `TIMEOUT`, nothing persisted, no retry |
| ML returns 503 | 503 propagated, degraded state |
| ML returns malformed JSON | 500, nothing persisted |
| Database connection dropped mid-transaction | Rollback, 503, health `degraded` |
| Statement timeout | 504, no partial write |
| Unique violation on concurrent investigation create | One 201, one 409 |
| Rate limit exceeded | 429, `Retry-After`, no write |

Every row is a test in `test-cases/integration-tests.md`. The column that matters is the second half of each expectation — *nothing persisted*. A failure that leaves a partial row is worse than a failure that returns an error.

---

## 7. Running

```bash
pnpm test:int                     # all
pnpm test:int predict             # filtered
DATABASE_URL=... pnpm test:int    # against a specific branch
pytest -m contract apps/ml-service/tests
```

Roughly 90 seconds locally. CI runs integration after unit and before building the preview environment, so a broken contract never reaches a deployment.
