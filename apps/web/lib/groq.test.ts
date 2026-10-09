import { afterEach, describe, expect, it, vi } from "vitest";
import { groqFetchWith } from "./groq";

function stubStatuses(...statuses: number[]) {
  const fetchMock = vi.fn();
  for (const status of statuses) fetchMock.mockResolvedValueOnce(new Response("{}", { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const keyOf = (call: unknown[]) => (call[1] as RequestInit & { headers: Headers }).headers.get("Authorization");

describe("groqFetchWith", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses only the first key when it succeeds", async () => {
    const fetchMock = stubStatuses(200);
    const res = await groqFetchWith(["key-a", "key-b"], "chat/completions", { method: "POST" }, 1_000);
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(keyOf(fetchMock.mock.calls[0]!)).toBe("Bearer key-a");
  });

  it("moves to the second key when the first is rate-limited", async () => {
    const fetchMock = stubStatuses(429, 200);
    const res = await groqFetchWith(["key-a", "key-b"], "chat/completions", { method: "POST" }, 1_000);
    expect(res.status).toBe(200);
    expect(keyOf(fetchMock.mock.calls[1]!)).toBe("Bearer key-b");
  });

  it("does not try another key for a 400, which is about the request", async () => {
    const fetchMock = stubStatuses(400);
    const res = await groqFetchWith(["key-a", "key-b"], "audio/transcriptions", { method: "POST" }, 1_000);
    expect(res.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns the last refusal when every key is refused", async () => {
    stubStatuses(429, 401);
    const res = await groqFetchWith(["key-a", "key-b"], "chat/completions", { method: "POST" }, 1_000);
    expect(res.status).toBe(401);
  });

  it("does not try another key after a network error", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(groqFetchWith(["key-a", "key-b"], "chat/completions", { method: "POST" }, 1_000)).rejects.toThrow("fetch failed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
