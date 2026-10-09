import { describe, expect, it } from "vitest";
import { fallbackVoiceAnswer, redactSensitiveText, VoiceAnswer, VoiceRequest } from "./voiceAgent";

describe("Safety voice agent", () => {
  it("redacts explicitly labelled secrets and long financial numbers", () => {
    const redacted = redactSensitiveText("My OTP code number is 123456, backup is 4567, and card is 4111 1111 1111 1111");
    expect(redacted).not.toContain("123456");
    expect(redacted).not.toContain("4567");
    expect(redacted).not.toContain("4111");
    expect(redacted).toContain("[sensitive value removed]");
    expect(redacted).toContain("[long number removed]");
  });

  it("routes a person who already paid to urgent report steps", () => {
    expect(fallbackVoiceAnswer("I already paid the caller")).toMatchObject({ intent: "REPORT", route: "/safety/report", urgent: true });
  });

  it("routes verification and status requests without marking them urgent", () => {
    expect(fallbackVoiceAnswer("Please verify this UPI ID")).toMatchObject({ intent: "VERIFY", route: "/safety/verify", urgent: false });
    expect(fallbackVoiceAnswer("Track my complaint status")).toMatchObject({ intent: "STATUS", route: "/safety/status", urgent: false });
  });

  it("bounds request history and response routes", () => {
    expect(VoiceRequest.safeParse({ message: "Help", history: [] }).success).toBe(true);
    expect(VoiceRequest.safeParse({ message: "Help", history: Array.from({ length: 11 }, () => ({ role: "user", content: "x" })) }).success).toBe(false);
    expect(VoiceAnswer.safeParse({ reply: "Open another site", intent: "GENERAL", route: "https://example.com", urgent: false }).success).toBe(false);
  });
});
