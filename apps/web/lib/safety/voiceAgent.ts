import { z } from "zod";
import { SAFETY_LOCALES, type SafetyLocale } from "./locales";
import { PROHIBITED_TERMS } from "./prohibitedLexicon";

export const VoiceIntent = z.enum(["CHECK", "VERIFY", "REPORT", "STATUS", "GENERAL"]);
export type VoiceIntent = z.infer<typeof VoiceIntent>;

export const VoiceTurn = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(1_000),
});

export const VoiceRequest = z.object({
  message: z.string().trim().min(1).max(1_000),
  lang: z.enum(SAFETY_LOCALES.map((l) => l.code) as [SafetyLocale, ...SafetyLocale[]]).default("en"),
  history: z.array(VoiceTurn).max(10).default([]),
});

// The model picks references from this closed set; the UI owns every label,
// number and URL, so a model can never put an invented helpline on screen.
export const VoiceReference = z.enum(["HELPLINE_1930", "CYBERCRIME_PORTAL", "SANCHAR_SAATHI", "BANK"]);
export type VoiceReference = z.infer<typeof VoiceReference>;

// 300, not 200: Indic scripts spend more code units per word than English.
const Line = z.string().trim().min(1).max(300);

export const VoiceAnswer = z.object({
  verdict: Line,
  steps: z.array(Line).max(3),
  references: z.array(VoiceReference).max(3).refine((r) => new Set(r).size === r.length, "duplicate reference"),
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

/** The model writes these 11 reliably. Of the other 17 safety locales, the
 *  Hindi-belt ones are answered in Hindi and the rest in English: unreviewed
 *  safety advice in a low-resource language can invert its meaning. */
export const REPLY_LANGUAGES = {
  en: { name: "English", script: "Latin" },
  hi: { name: "Hindi", script: "Devanagari" },
  bn: { name: "Bengali", script: "Bengali" },
  mr: { name: "Marathi", script: "Devanagari" },
  gu: { name: "Gujarati", script: "Gujarati" },
  ta: { name: "Tamil", script: "Tamil" },
  te: { name: "Telugu", script: "Telugu" },
  kn: { name: "Kannada", script: "Kannada" },
  ml: { name: "Malayalam", script: "Malayalam" },
  pa: { name: "Punjabi", script: "Gurmukhi" },
  ur: { name: "Urdu", script: "Perso-Arabic (Nastaliq)" },
} as const;
export type ReplyLanguage = keyof typeof REPLY_LANGUAGES;

const HINDI_ANSWERED = new Set<SafetyLocale>(["bho", "raj", "mai", "doi", "brx", "gon", "kok", "ne", "sa"]);

// Letters only (not the shared danda), so a Bengali reply ending in "।" is not misread.
const REPLY_SCRIPT: Record<ReplyLanguage, RegExp | null> = {
  en: null, hi: /[\u0904-\u0939]/, mr: /[\u0904-\u0939]/, bn: /[\u0985-\u09B9]/, gu: /[\u0A85-\u0AB9]/, pa: /[\u0A05-\u0A39]/,
  ta: /[\u0B85-\u0BB9]/, te: /[\u0C05-\u0C39]/, kn: /[\u0C85-\u0CB9]/, ml: /[\u0D05-\u0D39]/, ur: /[\u0620-\u064A\u067E-\u06D2]/,
};

/** Whether the verdict is written in the reply language's script. */
export function inReplyScript(answer: VoiceAnswer, lang: ReplyLanguage): boolean {
  const script = REPLY_SCRIPT[lang];
  return !script || script.test(answer.verdict);
}

export function replyLanguage(lang: SafetyLocale): ReplyLanguage {
  if (lang in REPLY_LANGUAGES) return lang as ReplyLanguage;
  return HINDI_ANSWERED.has(lang) ? "hi" : "en";
}

export function usesProhibitedTerm(answer: VoiceAnswer): boolean {
  return [answer.verdict, ...answer.steps].some((line) => PROHIBITED_TERMS.test(line));
}

export function fallbackVoiceAnswer(message: string): VoiceAnswer {
  const text = message.toLowerCase();
  if (/already paid|sent money|lost money|money.*gone|भेज.*पैसे|पैसे.*भेज/.test(text)) {
    return {
      verdict: "Act now: stop any further payment.",
      steps: ["Call 1930 immediately.", "Contact your bank using its app or the number on your card.", "Keep screenshots, numbers and transaction IDs."],
      references: ["HELPLINE_1930", "BANK", "CYBERCRIME_PORTAL"],
      intent: "REPORT", route: "/safety/report", urgent: true,
    };
  }
  if (/track|status|complaint id|tracking code|स्थिति|ट्रैक/.test(text)) {
    return { verdict: "You can track a report filed in CyberPulse.", steps: ["Open report tracking.", "Enter your complaint ID and tracking code."], references: [], intent: "STATUS", route: "/safety/status", urgent: false };
  }
  if (/link|number|caller|upi|verify|website|लिंक|नंबर|यूपीआई/.test(text)) {
    return { verdict: "Do not pay yet.", steps: ["Check the link, caller number or UPI ID with Verify.", "Never share an OTP, PIN, password or CVV."], references: ["SANCHAR_SAATHI"], intent: "VERIFY", route: "/safety/verify", urgent: false };
  }
  return { verdict: "Tell me a little more.", steps: ["Who contacted you, and what did they ask you to do?", "Did they ask for money, secrecy, an OTP or screen sharing?"], references: [], intent: "CHECK", route: "/safety/check", urgent: false };
}

export const VOICE_SYSTEM_PROMPT = `You are Scam Shield, CyberPulse's focused cyber-fraud safety assistant for India.
Be brief and direct. Write "verdict" and "steps" only in the reply language named in the user turn, in its usual script, whatever language the message itself is in. Keep JSON keys and reference codes in English.
"verdict": one short sentence (max 15 words) saying what this most likely is or what to do first.
"steps": 0 to 3 short imperative actions (max 15 words each). No numbering, no markdown. A follow-up question may be one step.
"references": 0 to 3 codes from HELPLINE_1930 (money lost or urgent), CYBERCRIME_PORTAL (reporting online), SANCHAR_SAATHI (reporting a fraud call, SMS or number), BANK (block card or account). Never write phone numbers or URLs in the text; use references.
Never ask for or repeat OTPs, PINs, passwords, CVVs, Aadhaar numbers, full card numbers, or full account numbers.
Never claim to be police, a bank, RBI, or the 1930 helpline. Never promise that a payment is safe or that money will be recovered.
Never label any person; say "the caller" or "the sender". Never claim affiliation with or approval by any authority, and never promise an outcome.
If the user already paid: urgent true; stop further payments, call 1930, contact the bank, keep evidence.
Choose exactly one intent: CHECK, VERIFY, REPORT, STATUS, or GENERAL. Routes may only be /safety/check, /safety/verify, /safety/report, /safety/status, or null.
Return JSON only: {"verdict":"...","steps":["..."],"references":["HELPLINE_1930"],"intent":"CHECK","route":"/safety/check","urgent":false}.`;
