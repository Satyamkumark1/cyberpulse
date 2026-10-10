import { expect, type APIRequestContext } from "@playwright/test";

// ADR-023: ADMIN is no longer claimable by header or hand-written cookie, so
// tests earn it the way a presenter does — with the demo access code. Pass
// `page.request` to give a browser context the role, or the `request`
// fixture for API-only calls.
export async function becomeAdmin(request: APIRequestContext): Promise<void> {
  const accessCode = process.env.ADMIN_ACCESS_CODE;
  expect(accessCode, "set ADMIN_ACCESS_CODE to the running app's value").toBeTruthy();
  const res = await request.post("/api/role", { data: { role: "ADMIN", accessCode } });
  expect(res.ok(), "ADMIN_ACCESS_CODE must match the running app's value").toBe(true);
}
