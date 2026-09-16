import { describe, expect, it } from "vitest";
import { ForbiddenError } from "@/lib/errors";
import { requireCapability, resolveRole } from "./auth";

describe("resolveRole", () => {
  it("resolves from the x-cyberpulse-role header when present", () => {
    const req = new Request("http://localhost/api/complaints", { headers: { "x-cyberpulse-role": "BANK" } });
    expect(resolveRole(req)).toBe("BANK");
  });

  it("falls back to the cookie when no header is present", () => {
    const req = new Request("http://localhost/api/complaints", { headers: { cookie: "cyberpulse_role=ADMIN" } });
    expect(resolveRole(req)).toBe("ADMIN");
  });

  it("falls back to LEA, never ADMIN, for an unrecognised role (TC-SEC-010)", () => {
    const req = new Request("http://localhost/api/complaints", { headers: { "x-cyberpulse-role": "SUPERUSER" } });
    expect(resolveRole(req)).toBe("LEA");
  });

  it("falls back to LEA when neither header nor cookie is present", () => {
    const req = new Request("http://localhost/api/complaints");
    expect(resolveRole(req)).toBe("LEA");
  });

  it("prefers the header over the cookie when both are present", () => {
    const req = new Request("http://localhost/api/complaints", {
      headers: { "x-cyberpulse-role": "ADMIN", cookie: "cyberpulse_role=BANK" },
    });
    expect(resolveRole(req)).toBe("ADMIN");
  });
});

describe("requireCapability", () => {
  it("allows LEA to run a prediction", () => {
    expect(() => requireCapability("LEA", "prediction:run")).not.toThrow();
  });

  it("throws ForbiddenError when BANK attempts to run a prediction (security/authorization.md §2)", () => {
    expect(() => requireCapability("BANK", "prediction:run")).toThrow(ForbiddenError);
  });

  it("allows ADMIN to write settings but denies LEA", () => {
    expect(() => requireCapability("ADMIN", "settings:write")).not.toThrow();
    expect(() => requireCapability("LEA", "settings:write")).toThrow(ForbiddenError);
  });

  it("allows every role to read hotspots", () => {
    for (const role of ["LEA", "BANK", "ADMIN"] as const) {
      expect(() => requireCapability(role, "hotspots:read")).not.toThrow();
    }
  });
});
