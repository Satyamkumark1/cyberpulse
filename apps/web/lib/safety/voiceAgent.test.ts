import { describe, expect, it } from "vitest";
import { SAFETY_LOCALES } from "./locales";
import { fallbackVoiceAnswer, inReplyScript, redactSensitiveText, replyLanguage, REPLY_LANGUAGES, usesProhibitedTerm, VoiceAnswer, VoiceRequest } from "./voiceAgent";

const valid: VoiceAnswer = { verdict: "Likely a scam call.", steps: ["Hang up."], references: ["SANCHAR_SAATHI"], intent: "CHECK", route: "/safety/check", urgent: false };

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
    expect(VoiceAnswer.safeParse({ ...valid, route: "https://example.com" }).success).toBe(false);
  });

  it("accepts exactly 3 steps and rejects a 4th", () => {
    expect(VoiceAnswer.safeParse({ ...valid, steps: ["a", "b", "c"] }).success).toBe(true);
    expect(VoiceAnswer.safeParse({ ...valid, steps: ["a", "b", "c", "d"] }).success).toBe(false);
  });

  it("rejects a reference outside the closed set, and duplicates", () => {
    expect(VoiceAnswer.safeParse({ ...valid, references: ["https://fake-helpline.example"] }).success).toBe(false);
    expect(VoiceAnswer.safeParse({ ...valid, references: ["HELPLINE_1930", "HELPLINE_1930"] }).success).toBe(false);
  });

  it("flags a reply using a prohibited term in any line", () => {
    expect(usesProhibitedTerm(valid)).toBe(false);
    expect(usesProhibitedTerm({ ...valid, steps: ["Report it on the official portal."] })).toBe(true);
  });

  it("never uses a prohibited term in a fallback answer", () => {
    for (const msg of ["I already paid", "track my status", "verify this link", "hello"]) {
      expect(usesProhibitedTerm(fallbackVoiceAnswer(msg))).toBe(false);
    }
  });

  it("answers the 11 reliable languages natively", () => {
    for (const lang of ["en", "hi", "bn", "mr", "gu", "ta", "te", "kn", "ml", "pa", "ur"] as const) expect(replyLanguage(lang)).toBe(lang);
  });

  it("answers Hindi-belt languages in Hindi and the rest in English", () => {
    expect(replyLanguage("bho")).toBe("hi");
    expect(replyLanguage("sa")).toBe("hi");
    expect(replyLanguage("tcy")).toBe("en");
    expect(replyLanguage("or")).toBe("en");
  });

  it("maps every safety locale to a reply language the prompt can name", () => {
    for (const { code } of SAFETY_LOCALES) expect(REPLY_LANGUAGES[replyLanguage(code)]).toBeDefined();
  });

  it("rejects a language code outside the 28 safety locales", () => {
    expect(VoiceRequest.safeParse({ message: "Help", lang: "ta" }).success).toBe(true);
    expect(VoiceRequest.safeParse({ message: "Help", lang: "xx" }).success).toBe(false);
  });

  it("flags a prohibited term in a Hindi reply", () => {
    expect(usesProhibitedTerm({ ...valid, verdict: "यह आधिकारिक पोर्टल है।" })).toBe(true);
  });

  it("detects a reply that ignored its language", () => {
    expect(inReplyScript({ ...valid, verdict: "এটি সম্ভবত স্ক্যাম।" }, "bn")).toBe(true);
    expect(inReplyScript({ ...valid, verdict: "Do not share the OTP." }, "pa")).toBe(false);
    expect(inReplyScript({ ...valid, verdict: "Do not share the OTP." }, "en")).toBe(true);
  });
});
