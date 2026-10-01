import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "./apiFetch";

function respond(status: number, body: string) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status, headers: { "content-type": "application/json" } })));
}

afterEach(() => vi.unstubAllGlobals());

describe("apiFetch", () => {
  it("returns the parsed body on success", async () => {
    respond(200, JSON.stringify({ data: [1, 2] }));
    await expect(apiFetch<{ data: number[] }>("/api/x")).resolves.toEqual({ data: [1, 2] });
  });

  it("throws ApiError carrying the envelope's code, message and field", async () => {
    respond(400, JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Invalid input.", field: "amount", requestId: "r" } }));
    const error = await apiFetch("/api/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "VALIDATION_ERROR", message: "Invalid input.", field: "amount" });
  });

  it("falls back to the caller's message and UNKNOWN when the body is not an envelope", async () => {
    respond(502, "<html>bad gateway</html>");
    await expect(apiFetch("/api/x", undefined, "Map data could not be loaded.")).rejects.toMatchObject({
      code: "UNKNOWN",
      message: "Map data could not be loaded.",
    });
  });
});
