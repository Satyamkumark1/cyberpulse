import { describe, expect, it } from "vitest";
import { ForbiddenError } from "@/lib/errors";
import {
  ADMIN_KEEP_TTL_MS,
  ADMIN_SESSION_TTL_MS,
  issueRoleCookie,
  requireCapability,
  requireAdminOrDemo,
  resolveOrigin,
  resolveRole,
} from "./auth";

const NOW_MS = Date.UTC(2026, 9, 10, 6, 0, 0);
const withCookie = (value: string) =>
  new Request("http://localhost/api/complaints", { headers: { cookie: `cyberpulse_role=${value}` } });

describe("resolveRole", () => {
  it("resolves from the x-cyberpulse-role header when present", () => {
    const req = new Request("http://localhost/api/complaints", { headers: { "x-cyberpulse-role": "BANK" } });
    expect(resolveRole(req)).toBe("BANK");
  });

  it("falls back to the cookie when no header is present", () => {
    expect(resolveRole(withCookie("BANK"))).toBe("BANK");
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
      headers: { "x-cyberpulse-role": "I4C", cookie: "cyberpulse_role=BANK" },
    });
    expect(resolveRole(req)).toBe("I4C");
  });
});

describe("resolveRole — ADMIN must be earned with the access code (ADR-023)", () => {
  const signedAdmin = () => issueRoleCookie("ADMIN", process.env.ADMIN_ACCESS_CODE, NOW_MS).value;

  it("resolves a signed ADMIN cookie within its lifetime", () => {
    expect(resolveRole(withCookie(signedAdmin()), NOW_MS + ADMIN_SESSION_TTL_MS - 1)).toBe("ADMIN");
  });

  it("drops an ADMIN cookie to LEA once it expires", () => {
    expect(resolveRole(withCookie(signedAdmin()), NOW_MS + ADMIN_SESSION_TTL_MS)).toBe("LEA");
  });

  it("drops a hand-written ADMIN cookie to LEA", () => {
    expect(resolveRole(withCookie("ADMIN"), NOW_MS)).toBe("LEA");
  });

  it("drops an ADMIN cookie with an edited expiry to LEA", () => {
    const [, expiresAt, signature] = signedAdmin().split(".");
    const extended = `ADMIN.${Number(expiresAt) + ADMIN_SESSION_TTL_MS}.${signature}`;
    expect(resolveRole(withCookie(extended), NOW_MS + ADMIN_SESSION_TTL_MS)).toBe("LEA");
  });

  it("never grants ADMIN from the role header", () => {
    const req = new Request("http://localhost/api/demo/reset", { headers: { "x-cyberpulse-role": "ADMIN" } });
    expect(resolveRole(req, NOW_MS)).toBe("LEA");
  });

  it("lets the header lower a signed ADMIN cookie to another role", () => {
    const req = new Request("http://localhost/api/complaints", {
      headers: { "x-cyberpulse-role": "BANK", cookie: `cyberpulse_role=${signedAdmin()}` },
    });
    expect(resolveRole(req, NOW_MS)).toBe("BANK");
  });
});

describe("issueRoleCookie (ADR-023)", () => {
  it("refuses ADMIN with a wrong access code", () => {
    expect(() => issueRoleCookie("ADMIN", "not-the-code", NOW_MS)).toThrow(ForbiddenError);
  });

  it("refuses ADMIN with no access code", () => {
    expect(() => issueRoleCookie("ADMIN", undefined, NOW_MS)).toThrow(ForbiddenError);
  });

  it("issues an ADMIN cookie that lasts the session lifetime", () => {
    expect(issueRoleCookie("ADMIN", process.env.ADMIN_ACCESS_CODE, NOW_MS).maxAgeSeconds).toBe(ADMIN_SESSION_TTL_MS / 1000);
  });

  it("keeps ADMIN for seven days when asked", () => {
    const kept = issueRoleCookie("ADMIN", process.env.ADMIN_ACCESS_CODE, NOW_MS, true);
    expect(kept.maxAgeSeconds).toBe(ADMIN_KEEP_TTL_MS / 1000);
    expect(resolveRole(withCookie(kept.value), NOW_MS + ADMIN_KEEP_TTL_MS - 1)).toBe("ADMIN");
    expect(resolveRole(withCookie(kept.value), NOW_MS + ADMIN_KEEP_TTL_MS)).toBe("LEA");
  });

  it.each(["LEA", "BANK", "GUARD", "I4C", "CITIZEN"] as const)("issues %s without an access code", (role) => {
    expect(issueRoleCookie(role, undefined, NOW_MS)).toEqual({ value: role });
  });
});

describe("resolveOrigin — FEAT-14 / FR-19.2", () => {
  it("resolves DEMO from the x-cyberpulse-origin header", () => {
    const req = new Request("http://localhost/api/predict", { headers: { "x-cyberpulse-origin": "DEMO" } });
    expect(resolveOrigin(req)).toBe("DEMO");
  });

  it("defaults to USER when the header is absent", () => {
    const req = new Request("http://localhost/api/predict");
    expect(resolveOrigin(req)).toBe("USER");
  });

  it("defaults to USER for any unrecognised value, never falling open to DEMO", () => {
    const req = new Request("http://localhost/api/predict", { headers: { "x-cyberpulse-origin": "SEED" } });
    expect(resolveOrigin(req)).toBe("USER");
  });
});

describe("requireAdminOrDemo — architecture/api-design.md API-023", () => {
  it("allows ADMIN regardless of origin", () => {
    expect(() => requireAdminOrDemo({ role: "ADMIN", requestId: "t", origin: "USER" })).not.toThrow();
  });

  it("denies a non-ADMIN role even with a DEMO origin", () => {
    expect(() => requireAdminOrDemo({ role: "LEA", requestId: "t", origin: "DEMO" })).toThrow(ForbiddenError);
  });

  it("denies a non-ADMIN role outside the demo route", () => {
    expect(() => requireAdminOrDemo({ role: "LEA", requestId: "t", origin: "USER" })).toThrow(ForbiddenError);
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

  it("allows every officer role to read hotspots", () => {
    for (const role of ["LEA", "BANK", "ADMIN", "GUARD", "I4C"] as const) {
      expect(() => requireCapability(role, "hotspots:read")).not.toThrow();
    }
  });
});

describe("requireCapability — GUARD (ADR-021, read-only and identity-free)", () => {
  it("allows GUARD to read hotspots, metrics, settings and health", () => {
    for (const capability of ["hotspots:read", "metrics:read", "settings:read"] as const) {
      expect(() => requireCapability("GUARD", capability)).not.toThrow();
    }
  });

  it("denies GUARD every complaint, transaction, prediction, alert and investigation capability", () => {
    for (const capability of [
      "complaints:list",
      "complaints:read",
      "complaints:updateStatus",
      "transactions:list",
      "transactions:network",
      "prediction:run",
      "alerts:create",
      "alerts:read",
      "alerts:acknowledge",
      "alerts:close",
      "investigations:create",
      "investigations:read",
      "investigations:transition",
      "investigations:addNote",
      "reports:read",
      "settings:write",
      "simulation:control",
      "demo:reset",
    ] as const) {
      expect(() => requireCapability("GUARD", capability)).toThrow(ForbiddenError);
    }
  });
});

describe("requireCapability — I4C (ADR-021, national-scope reader, no case-management writes)", () => {
  it("allows I4C every read capability its profile grants", () => {
    for (const capability of [
      "complaints:list",
      "complaints:read",
      "transactions:list",
      "transactions:network",
      "hotspots:read",
      "alerts:read",
      "investigations:read",
      "reports:read",
      "metrics:read",
      "settings:read",
    ] as const) {
      expect(() => requireCapability("I4C", capability)).not.toThrow();
    }
  });

  it("denies I4C every case-management write and every ADMIN-only capability", () => {
    for (const capability of [
      "complaints:updateStatus",
      "prediction:run",
      "alerts:create",
      "alerts:acknowledge",
      "alerts:close",
      "investigations:create",
      "investigations:transition",
      "investigations:addNote",
      "settings:write",
      "simulation:control",
      "demo:reset",
    ] as const) {
      expect(() => requireCapability("I4C", capability)).toThrow(ForbiddenError);
    }
  });
});

// ADR-022 / TC-SAFE-019. The 22 officer capabilities, listed here rather than
// imported so a capability added to the matrix without a CITIZEN decision
// shows up as a missing row in review, not as a silent pass.
const OFFICER_CAPABILITIES = [
  "complaints:list",
  "complaints:read",
  "complaints:updateStatus",
  "transactions:list",
  "transactions:network",
  "prediction:run",
  "hotspots:read",
  "alerts:create",
  "alerts:read",
  "alerts:acknowledge",
  "alerts:close",
  "investigations:create",
  "investigations:read",
  "investigations:transition",
  "investigations:addNote",
  "reports:read",
  "metrics:read",
  "settings:read",
  "settings:write",
  "simulation:control",
  "demo:reset",
  "health:read",
] as const;

describe("requireCapability — CITIZEN (ADR-022, public Scam Shield caller)", () => {
  it.each(OFFICER_CAPABILITIES)("denies CITIZEN the officer capability %s", (capability) => {
    expect(() => requireCapability("CITIZEN", capability)).toThrow(ForbiddenError);
  });

  it.each(["citizenReports:create", "citizenReports:status"] as const)("allows CITIZEN %s", (capability) => {
    expect(() => requireCapability("CITIZEN", capability)).not.toThrow();
  });

  it.each(["LEA", "BANK", "ADMIN", "GUARD", "I4C"] as const)(
    "denies %s both citizen-report capabilities — officers never file or track as a citizen",
    (role) => {
      expect(() => requireCapability(role, "citizenReports:create")).toThrow(ForbiddenError);
      expect(() => requireCapability(role, "citizenReports:status")).toThrow(ForbiddenError);
    },
  );
});
