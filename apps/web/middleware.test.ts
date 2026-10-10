import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

// ADR-024: a tab's role travels in its address (?as=ROLE), so two tabs can
// hold two roles at once. The middleware turns that into the role header.
const request = (url: string, headers: Record<string, string> = {}) => new NextRequest(url, { headers });
const forwardedRole = (res: Response) => res.headers.get("x-middleware-request-x-cyberpulse-role");

describe("middleware — per-tab role (ADR-024)", () => {
  it("passes the tab's ?as= role to the page as the role header", () => {
    expect(forwardedRole(middleware(request("http://localhost/dashboard?as=BANK")))).toBe("BANK");
  });

  it("gives an API call the role of the tab that made it", () => {
    const res = middleware(request("http://localhost/api/alerts", { referer: "http://localhost/alerts?as=I4C" }));
    expect(forwardedRole(res)).toBe("I4C");
  });

  it("keeps ?as= on the address when the tab navigates to another page", () => {
    const res = middleware(request("http://localhost/alerts", { referer: "http://localhost/dashboard?as=GUARD" }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/alerts?as=GUARD");
  });

  it("leaves an explicit role header alone", () => {
    const res = middleware(request("http://localhost/api/citizen/reports?as=LEA", { "x-cyberpulse-role": "CITIZEN" }));
    expect(forwardedRole(res)).toBeNull();
  });

  it("ignores an unknown role", () => {
    expect(forwardedRole(middleware(request("http://localhost/dashboard?as=SUPERUSER")))).toBeNull();
  });

  it("ignores a role from another site's address", () => {
    const res = middleware(request("http://localhost/api/alerts", { referer: "https://example.com/?as=ADMIN" }));
    expect(forwardedRole(res)).toBeNull();
  });

  it("changes nothing for a tab with no role in its address", () => {
    const res = middleware(request("http://localhost/dashboard"));
    expect(forwardedRole(res)).toBeNull();
    expect(res.status).toBe(200);
  });
});
