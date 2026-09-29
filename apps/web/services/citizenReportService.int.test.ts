import { createHash } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { db, dbSchema } from "@cyberpulse/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { isValidCell } from "h3-js";
import { normaliseTrackingCode } from "@cyberpulse/shared/citizen";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { POST as postReport } from "@/app/api/citizen/reports/route";
import { POST as postStatus } from "@/app/api/citizen/reports/status/route";
import * as auditService from "./auditService";
import { cities, status, submit } from "./citizenReportService";

// Wraps the real audit writer so one test can make it fail inside the
// transaction. The database itself is never mocked (RULE-testing).
vi.mock("./auditService", async (importOriginal) => {
  const real = await importOriginal<typeof import("./auditService")>();
  return { ...real, record: vi.fn(real.record) };
});

const { auditEvents, citizenReports, complaints, investigations } = dbSchema;

const citizen = { role: "CITIZEN" as const, requestId: "test", origin: "DEMO" as const };
const lea = { role: "LEA" as const, requestId: "test", origin: "USER" as const };

const createdComplaintIds: string[] = [];
const createdInvestigationIds: number[] = [];

async function file(overrides: Partial<{ fraudType: "UPI_FRAUD" | "JOB_SCAM"; amountPaise: number; city: string }> = {}) {
  const result = await submit({ fraudType: "UPI_FRAUD", amountPaise: 2_500_000, city: "Delhi", ...overrides }, citizen);
  createdComplaintIds.push(result.complaintId);
  return result;
}

let ip = 0;
function request(path: string, body: unknown, headers: Record<string, string> = {}) {
  ip += 1; // a fresh rate-limit bucket per request unless a test pins the IP
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-cyberpulse-role": "CITIZEN", "x-forwarded-for": `10.0.0.${ip}`, ...headers },
    body: JSON.stringify(body),
  });
}

afterAll(async () => {
  if (createdInvestigationIds.length) await db.delete(investigations).where(inArray(investigations.id, createdInvestigationIds));
  // citizen_reports rows cascade; audit events are append-only and stay.
  if (createdComplaintIds.length) await db.delete(complaints).where(inArray(complaints.complaintId, createdComplaintIds));
});

describe("citizenReportService.cities", () => {
  it("lists the seeded cities alphabetically for CITIZEN", async () => {
    const list = await cities(citizen);
    expect(list.length).toBeGreaterThan(0);
    expect(list).toEqual([...list].sort());
    expect(list).toContain("Delhi");
  });

  it("denies LEA — officers never file as a citizen", async () => {
    await expect(cities(lea)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("citizenReportService.submit — API-100 (TC-SAFE-010, TC-SAFE-013, TC-SAFE-014)", () => {
  it("persists a DEMO complaint, its hashed tracking code and an audit event, and returns what it persisted", async () => {
    const result = await file({ fraudType: "JOB_SCAM", amountPaise: 4_200_000, city: "Mumbai" });

    expect(result.complaintId).toMatch(/^C-9\d{4}$/);
    expect(result.trackingCode).toMatch(/^[A-Z2-7]{4}(-[A-Z2-7]{4}){3}$/);

    const [complaint] = await db.select().from(complaints).where(eq(complaints.complaintId, result.complaintId));
    expect(complaint).toMatchObject({
      fraudType: "JOB_SCAM",
      amountPaise: 4_200_000,
      city: "Mumbai",
      state: "Maharashtra",
      status: "OPEN",
      origin: "DEMO",
    });
    expect(isValidCell(complaint!.victimH3R8)).toBe(true);

    const [report] = await db.select().from(citizenReports).where(eq(citizenReports.complaintId, complaint!.id));
    const expectedHash = createHash("sha256").update(normaliseTrackingCode(result.trackingCode)).digest("hex");
    expect(report!.trackingHash).toBe(expectedHash);

    const [audit] = await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.subjectType, "complaint"), eq(auditEvents.subjectId, complaint!.id)))
      .orderBy(desc(auditEvents.id))
      .limit(1);
    expect(audit).toMatchObject({ actorRole: "CITIZEN", action: "CITIZEN_REPORT_SUBMITTED" });
  });

  it("issues a different tracking code for every report", async () => {
    const [a, b] = [await file(), await file()];
    expect(a.trackingCode).not.toBe(b.trackingCode);
    expect(a.complaintId).not.toBe(b.complaintId);
  });

  it("rejects a city outside the seeded list and writes nothing", async () => {
    const [before] = await db.select({ n: sql<number>`count(*)::int` }).from(citizenReports);
    await expect(submit({ fraudType: "UPI_FRAUD", amountPaise: 10_000, city: "Atlantis" }, citizen)).rejects.toBeInstanceOf(
      ValidationError,
    );
    const [after] = await db.select({ n: sql<number>`count(*)::int` }).from(citizenReports);
    expect(after!.n).toBe(before!.n);
  });

  it("rolls the complaint back when the audit event cannot be written", async () => {
    const [before] = await db.select({ n: sql<number>`count(*)::int` }).from(complaints).where(eq(complaints.origin, "DEMO"));
    vi.mocked(auditService.record).mockRejectedValueOnce(new Error("audit store unavailable"));

    await expect(submit({ fraudType: "UPI_FRAUD", amountPaise: 10_000, city: "Delhi" }, citizen)).rejects.toThrow();

    const [after] = await db.select({ n: sql<number>`count(*)::int` }).from(complaints).where(eq(complaints.origin, "DEMO"));
    expect(after!.n).toBe(before!.n);
  });

  it("denies LEA", async () => {
    await expect(submit({ fraudType: "UPI_FRAUD", amountPaise: 10_000, city: "Delhi" }, lea)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("citizenReportService.status — API-101 (TC-SAFE-016, TC-SAFE-017, TC-SAFE-018)", () => {
  it("returns RECEIVED for a new report, accepting the code in any case and without dashes", async () => {
    const { complaintId, trackingCode } = await file();
    const loose = trackingCode.toLowerCase().replace(/-/g, "");
    await expect(status({ complaintId, trackingCode: normaliseTrackingCode(loose) }, citizen)).resolves.toMatchObject({
      complaintId,
      stage: "RECEIVED",
    });
  });

  it("returns ALERT_SENT once the complaint's investigation reaches ALERT_SENT", async () => {
    const { complaintId, trackingCode } = await file();
    const [complaint] = await db.select({ id: complaints.id }).from(complaints).where(eq(complaints.complaintId, complaintId));
    const [inv] = await db
      .insert(investigations)
      .values({ caseId: `INV-${90000 + createdComplaintIds.length}`, complaintId: complaint!.id, status: "ALERT_SENT", origin: "DEMO" })
      .returning();
    createdInvestigationIds.push(inv!.id);

    const result = await status({ complaintId, trackingCode: normaliseTrackingCode(trackingCode) }, citizen);
    expect(result.stage).toBe("ALERT_SENT");
    expect(result.updatedAt).toBe(new Date(inv!.updatedAt).toISOString());
  });

  it("returns exactly complaintId, stage and updatedAt — no prediction field can leave", async () => {
    const { complaintId, trackingCode } = await file();
    const result = await status({ complaintId, trackingCode: normaliseTrackingCode(trackingCode) }, citizen);
    expect(Object.keys(result).sort()).toEqual(["complaintId", "stage", "updatedAt"]);
  });

  it("returns NotFound for a wrong code", async () => {
    const { complaintId } = await file();
    await expect(status({ complaintId, trackingCode: "A".repeat(16) }, citizen)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("returns NotFound for a seeded complaint — only citizen reports are trackable", async () => {
    await expect(status({ complaintId: "C-10283", trackingCode: "A".repeat(16) }, citizen)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("denies LEA", async () => {
    await expect(status({ complaintId: "C-90000", trackingCode: "A".repeat(16) }, lea)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("POST /api/citizen/reports — route validation (TC-SAFE-011, TC-SAFE-012, TC-SAFE-015)", () => {
  const valid = { fraudType: "UPI_FRAUD", amountPaise: 100, city: "Delhi" };

  it("creates a report at the minimum amount of 100 paise and returns 201", async () => {
    const res = await postReport(request("/api/citizen/reports", valid));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { complaintId: string };
    createdComplaintIds.push(body.complaintId);
    expect(body.complaintId).toMatch(/^C-9\d{4}$/);
  });

  it.each([
    ["complaintId", "C-99999"],
    ["status", "RESOLVED"],
    ["origin", "SEED"],
    ["victimLat", 28.6],
    ["victimLon", 77.2],
    ["victimH3R8", "883da1"],
    ["district", "New Delhi"],
    ["state", "Delhi"],
    ["complaintTimestamp", "2026-09-24T00:00:00Z"],
  ])("rejects the server-derived field %s with 400", async (field, value) => {
    const res = await postReport(request("/api/citizen/reports", { ...valid, [field]: value }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { field: string } }).error.field).toBe(field);
  });

  it.each([
    ["an unknown key", { ...valid, name: "anyone" }],
    ["an amount of 0", { ...valid, amountPaise: 0 }],
    ["an amount of 99 paise", { ...valid, amountPaise: 99 }],
    ["a fractional amount", { ...valid, amountPaise: 150.5 }],
    ["an amount above ₹10 crore", { ...valid, amountPaise: 10_00_00_000_01 }],
    ["an unknown fraud type", { ...valid, fraudType: "DIGITAL_ARREST" }],
  ])("rejects %s with 400", async (_label, body) => {
    const res = await postReport(request("/api/citizen/reports", body));
    expect(res.status).toBe(400);
  });

  it("returns 403 to an officer role", async () => {
    const res = await postReport(request("/api/citizen/reports", valid, { "x-cyberpulse-role": "LEA" }));
    expect(res.status).toBe(403);
  });

  it("returns 429 on the sixth report in a minute from one IP and writes nothing for it", async () => {
    const pinned = { "x-forwarded-for": "10.9.9.9" };
    for (let i = 0; i < 5; i += 1) {
      const res = await postReport(request("/api/citizen/reports", valid, pinned));
      expect(res.status).toBe(201);
      createdComplaintIds.push(((await res.json()) as { complaintId: string }).complaintId);
    }
    const [before] = await db.select({ n: sql<number>`count(*)::int` }).from(citizenReports);
    const res = await postReport(request("/api/citizen/reports", valid, pinned));
    expect(res.status).toBe(429);
    const [after] = await db.select({ n: sql<number>`count(*)::int` }).from(citizenReports);
    expect(after!.n).toBe(before!.n);
  });
});

describe("POST /api/citizen/reports/status — route", () => {
  it("returns byte-identical 404 bodies for a wrong code and an unknown complaint ID", async () => {
    const { complaintId } = await file();
    const headers = { "x-request-id": "req_same" };
    const wrongCode = await postStatus(request("/api/citizen/reports/status", { complaintId, trackingCode: "AAAA-AAAA-AAAA-AAAA" }, headers));
    const unknownId = await postStatus(
      request("/api/citizen/reports/status", { complaintId: "C-99998", trackingCode: "AAAA-AAAA-AAAA-AAAA" }, headers),
    );
    expect(wrongCode.status).toBe(404);
    expect(unknownId.status).toBe(404);
    expect(await wrongCode.text()).toBe(await unknownId.text());
  });

  it("rejects a malformed tracking code with 400", async () => {
    const res = await postStatus(request("/api/citizen/reports/status", { complaintId: "C-90000", trackingCode: "not-a-code!" }));
    expect(res.status).toBe(400);
  });
});

describe("citizen_reports schema — TC-SAFE-021", () => {
  it("has exactly a complaint key, a hash and a timestamp — nowhere to put personal data", async () => {
    const rows = await db.execute<{ column_name: string }>(
      sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'citizen_reports' ORDER BY column_name`,
    );
    expect([...rows].map((r) => r.column_name)).toEqual(["complaint_id", "created_at", "tracking_hash"]);
  });
});
