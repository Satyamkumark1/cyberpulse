import { z } from "zod";

export const VoiceIntent = z.enum(["CHECK", "VERIFY", "REPORT", "STATUS", "GENERAL"]);
export type VoiceIntent = z.infer<typeof VoiceIntent>;

export const VoiceTurn = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(1_000),
});

export const VoiceRequest = z.object({
  message: z.string().trim().min(1).max(1_000),
  lang: z.string().trim().min(2).max(8).default("en"),
  history: z.array(VoiceTurn).max(10).default([]),
});

export const VoiceAnswer = z.object({
  reply: z.string().trim().min(1).max(1_500),
  intent: VoiceIntent,
  route: z.enum(["/safety/check", "/safety/verify", "/safety/report", "/safety/status"]).nullable(),
  urgent: z.boolean(),
});

export type VoiceAnswer = z.infer<typeof VoiceAnswer>;

const SENSITIVE_NUMBER = /\b(?:\d[ -]?){12,19}\b/g;
const OTP = /\b(?:(?:otp|pin|cvv|password)(?:\s+(?:number|code|is|was)){0,3}[\s:=-]*\d{3,8}|\d{4,8})\b/gi;

export function redactSensitiveText(value: string): string {
  return value.replace(SENSITIVE_NUMBER, "[long number removed]").replace(OTP, "[sensitive value removed]");
}

export function fallbackVoiceAnswer(message: string): VoiceAnswer {
  const text = message.toLowerCase();
  if (/already paid|sent money|lost money|money.*gone|भेज.*पैसे|पैसे.*भेज/.test(text)) {
    return {
      reply: "Stop any further payment. Call 1930 now and contact your bank through its official app or phone number. I can open the urgent report steps when you are ready.",
      intent: "REPORT", route: "/safety/report", urgent: true,
    };
  }
  if (/track|status|complaint id|tracking code|स्थिति|ट्रैक/.test(text)) {
    return { reply: "I can help you check a report filed in CyberPulse. Open report tracking and enter your complaint ID and tracking code.", intent: "STATUS", route: "/safety/status", urgent: false };
  }
  if (/link|number|caller|upi|verify|website|लिंक|नंबर|यूपीआई/.test(text)) {
    return { reply: "Do not pay yet. Use Verify to check the link, caller number, or UPI ID independently. Never share an OTP, PIN, password, or CVV.", intent: "VERIFY", route: "/safety/verify", urgent: false };
  }
  return { reply: "Tell me who contacted you, what they asked you to do, and whether they requested money, secrecy, an OTP, or screen sharing. Do not include private banking details.", intent: "CHECK", route: "/safety/check", urgent: false };
}

export const VOICE_SYSTEM_PROMPT = `You are Scam Shield, CyberPulse's focused cyber-fraud safety assistant for India.
Respond calmly in the user's language when you can. Ask at most one short follow-up question.
Never ask for or repeat OTPs, PINs, passwords, CVVs, Aadhaar numbers, full card numbers, or full account numbers.
Never claim to be police, a bank, RBI, or the 1930 helpline. Never guarantee that a payment is safe or that money will be recovered.
If the user already paid, prioritize: stop further payments, call 1930, contact the bank through an official channel, preserve evidence, and use cybercrime.gov.in.
Choose exactly one intent: CHECK, VERIFY, REPORT, STATUS, or GENERAL. Routes may only be /safety/check, /safety/verify, /safety/report, /safety/status, or null.
Return JSON only: {"reply":"...","intent":"CHECK","route":"/safety/check","urgent":false}.`;
