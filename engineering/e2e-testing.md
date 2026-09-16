# END-TO-END TESTING — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Tool | Playwright (Chromium; Edge in the release matrix) |
| Environment | Preview deployment with a per-PR Neon branch, real ML service, seeded corpus |
| Related | `test-cases/e2e-tests.md`, `ux/ux-test-cases.md` |

---

## 1. What E2E Is For Here

E2E is expensive and slow, so it covers only what no other layer can: **that the whole chain actually connects**, and that the journeys an evaluator will walk work in a real browser against a real stack.

| Covered by E2E | Left to lower layers |
|---|---|
| Complaint → prediction → alert, end to end | Threshold arithmetic |
| Map and graph rendering with real data | Combined-score maths |
| Degraded mode when the ML service is down | Error-envelope shape |
| Alert propagating to three surfaces | Audit atomicity |
| Demo scenario within its time budget | Feature vector correctness |
| Keyboard and screen-reader operability | Component props |

Around 35 cases. Every one of them earns its place by testing an integration that only exists when everything is running.

---

## 2. Configuration

```ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,          // one retry, and a retry-pass is reported as a flake
  workers: process.env.CI ? 2 : 4,
  reporter: [['html'], ['json', { outputFile: 'e2e-results.json' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1920, height: 1080 },
    timezoneId: 'Asia/Kolkata',
    locale: 'en-IN',
  },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'edge',     use: { ...devices['Desktop Edge'], channel: 'msedge' } },
    { name: 'a11y',     testMatch: /.*\.a11y\.spec\.ts/ },
  ],
});
```

Timezone and locale are pinned because currency grouping and IST rendering are asserted. A suite that passes in UTC and fails in IST is a suite that never tested the thing users see.

One retry, with retry-passes reported as flakes rather than swallowed — that is what keeps rule 7 of `engineering/testing-strategy.md` enforceable.

---

## 3. Selector Policy

| Priority | Selector | Example |
|---|---|---|
| 1 | Role + accessible name | `getByRole('button', { name: /analyze complaint/i })` |
| 2 | Label text | `getByLabelText('Fraud type')` |
| 3 | Visible text | `getByText('Sector 18, Noida')` |
| 4 | `data-testid` | `getByTestId('prediction-panel')` — only where no accessible handle exists |
| — | CSS or XPath | **Forbidden** |

Preferring accessible selectors means a change that breaks the E2E suite usually also broke accessibility, and the suite catches it for free.

---

## 4. Core Journeys

### E2E-01 · Complaint to dispatched alert

```ts
test('complaint to dispatched alert in five interactions', async ({ page }) => {
  await page.goto('/complaints');
  await page.getByRole('link', { name: /C-10284/ }).click();                       // 1

  await expect(page.getByText('₹3,80,000')).toBeVisible();
  await expect(page.getByTestId('prediction-panel')).toContainText('No prediction yet');

  const predictReq = page.waitForResponse(r => r.url().includes('/api/predict') && r.status() === 201);
  await page.getByRole('button', { name: /analyze complaint/i }).click();          // 2
  const body = await (await predictReq).json();

  // Every displayed figure must equal the response
  await expect(page.getByTestId('risk-score')).toHaveText(`${(body.riskScore * 100).toFixed(1)}%`);
  await expect(page.getByTestId('risk-level')).toHaveText(body.riskLevel);
  await expect(page.getByTestId('predicted-location')).toHaveText(body.predictedLocation.name);
  await expect(page.getByTestId('factor-list').getByRole('listitem')).toHaveCount(body.factors.length);

  await page.getByRole('button', { name: /generate alert/i }).click();             // 3
  await expect(page.getByRole('dialog', { name: 'HIGH-RISK WITHDRAWAL ALERT' })).toBeVisible();
  await expect(page.getByRole('button', { name: /send alert/i })).toBeDisabled();

  await page.getByRole('checkbox', { name: /LEA/ }).check();                       // 4
  await page.getByRole('button', { name: /send alert/i }).click();                 // 5

  await expect(page.getByText(/alert sent/i)).toBeVisible();
  await page.goto('/alerts');
  await expect(page.getByRole('row').filter({ hasText: 'SENT' }).first()).toBeVisible();
});
```

Asserting the rendered values against the intercepted response — rather than against expected constants — is what makes this test also a fabrication test. A hard-coded UI value would pass a constant-based assertion and fail this one.

### E2E-02 · Degraded mode shows no numbers

```ts
test('shows no numeric output when the prediction service is unavailable', async ({ page }) => {
  await page.route('**/api/predict', r => r.fulfill({ status: 503, body: JSON.stringify({ error: { code: 'ML_UNAVAILABLE' } }) }));
  await page.goto('/complaints/C-10284');
  await page.getByRole('button', { name: /analyze complaint/i }).click();

  const panel = await page.getByTestId('prediction-panel').innerText();
  expect(panel.toLowerCase()).toContain('prediction service unavailable');
  expect(panel).not.toMatch(/\d+(\.\d+)?%/);                      // no percentage
  expect(panel).not.toMatch(/₹[\d,]+/);                            // no currency
  expect(panel).not.toMatch(/\d{2}:\d{2}\s*[–-]\s*\d{2}:\d{2}/);   // no time window
  await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
});
```

The assertions are negative and shape-based: no number of the relevant kind may appear at all. Asserting that specific wrong numbers are absent would miss a placeholder nobody anticipated.

### E2E-03 · Demo scenario within budget

```ts
test('demo scenario completes within 15 seconds using the real prediction path', async ({ page }) => {
  await page.goto('/demo');
  await page.waitForResponse(r => r.url().includes('/health'));      // pre-warm
  let predictCalls = 0;
  page.on('request', r => { if (r.url().includes('/api/predict')) predictCalls++; });

  const t0 = Date.now();
  await page.getByRole('button', { name: /start/i }).click();
  await expect(page.getByTestId('demo-step-6')).toBeVisible({ timeout: 15_000 });
  expect(Date.now() - t0).toBeLessThan(15_000);
  expect(predictCalls).toBe(1);                                      // real path, called once
});
```

### E2E-04 · Alert propagates to three surfaces

Dispatch once, then assert the alert appears on the dashboard panel, on `/alerts`, and on the investigation timeline — without a manual reload (AC-011-05).

### E2E-05 · Map drill-down to alert

Toggle layers, click a hotspot marker, assert the drawer contents match `GET /api/hotspots/:h3`, then generate an alert from the drawer.

### E2E-06 · Graph determinism

Open the money trail, record node positions, navigate away and back, reload, and assert all three position sets agree within 1 px (TC-UX-014).

### E2E-07 · Reset restores a known state

Generate demo alerts and investigations, reset, assert only `origin = 'DEMO'` rows disappear and seed counts are unchanged, then reset again and assert idempotency.

---

## 5. Accessibility Runs

```ts
for (const route of ['/dashboard','/complaints','/complaints/C-10284','/risk-map','/alerts','/investigations','/reports','/demo']) {
  test(`${route} has no critical or serious axe violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa']).analyze();
    const blocking = results.violations.filter(v => ['critical','serious'].includes(v.impact));
    expect(blocking, JSON.stringify(blocking, null, 2)).toHaveLength(0);
  });
}
```

Greyscale determinability, reduced motion and keyboard-only traversal run as separate specs in the same project (TC-A11Y-002, 003, 007).

---

## 6. Stability Practices

| Practice | Reason |
|---|---|
| Wait on responses and assertions, never on durations | Timing waits are the primary flake source |
| Seeded corpus, never generated per run | Reproducibility |
| `C-10284` is read-only in every test | Protects the demo fixture |
| Tests create their own alerts and investigations with `origin = 'DEMO'` | Cleanable, isolated |
| Map tiles stubbed | Removes an external dependency from the critical suite |
| Parallel-safe: no test depends on another's state | Enables `fullyParallel` |
| Trace and video retained on failure | A CI failure is diagnosable without a local repro |

---

## 7. Running

```bash
pnpm test:e2e                    # headless, all projects
pnpm test:e2e --ui               # interactive
pnpm test:e2e --project=a11y
pnpm test:e2e --grep "degraded"
npx playwright show-trace trace.zip
```

Roughly four minutes in CI with two workers, against the preview deployment. E2E runs after the preview is live and gates promotion to production.
