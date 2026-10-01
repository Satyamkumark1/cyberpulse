// FEAT-17 Verify Before You Pay (FR-27). Format checks against conventions the
// RBI, TRAI and SEBI already require. Pure functions, no network: nothing the
// citizen types leaves the browser.

export type CheckLevel = "PASS" | "CAUTION" | "WARNING";

export type LinkReason =
  | "BANK_DOMAIN"
  | "BANK_DOMAIN_HTTP"
  | "SHORTENER"
  | "IP_ADDRESS"
  | "HOMOGRAPH"
  | "LOOKALIKE"
  | "OTHER_DOMAIN"
  | "INVALID";
export type CallerReason = "SERVICE_SERIES" | "PROMOTIONAL" | "MOBILE" | "INTERNATIONAL" | "UNRECOGNISED";
export type UpiReason = "VALIDATED_BROKER" | "VALIDATED_FUND" | "VALIDATED" | "NOT_VALIDATED" | "INVALID";

export interface CheckResult<R extends string> {
  level: CheckLevel;
  reason: R;
}

const SHORTENERS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "cutt.ly",
  "rb.gy",
  "is.gd",
  "shorturl.at",
  "tiny.cc",
  "ow.ly",
]);

// Short names must be a whole token or its prefix/suffix ("onlinesbi",
// "rbiupdate"), so "turbine" and "cupid" do not read as "rbi" and "upi".
const SHORT_BANK_WORDS = ["sbi", "rbi", "upi", "pnb", "kyc", "axis"];
const LONG_BANK_WORDS = ["bank", "hdfc", "icici", "kotak", "canara", "baroda", "yono", "paytm", "phonepe"];

function looksLikeBank(host: string): boolean {
  return host.split(/[.-]/).some(
    (token) =>
      LONG_BANK_WORDS.some((w) => token.includes(w)) ||
      SHORT_BANK_WORDS.some((w) => token === w || token.startsWith(w) || token.endsWith(w)),
  );
}

export function checkLink(raw: string): CheckResult<LinkReason> | null {
  const value = raw.trim();
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
  } catch {
    return { level: "WARNING", reason: "INVALID" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { level: "WARNING", reason: "INVALID" };

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".") && !host.startsWith("[")) return { level: "WARNING", reason: "INVALID" };
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("[")) return { level: "WARNING", reason: "IP_ADDRESS" };
  if (host.split(".").some((label) => label.startsWith("xn--"))) return { level: "WARNING", reason: "HOMOGRAPH" };
  if (host === "bank.in" || host.endsWith(".bank.in")) {
    return url.protocol === "https:" ? { level: "PASS", reason: "BANK_DOMAIN" } : { level: "CAUTION", reason: "BANK_DOMAIN_HTTP" };
  }
  if (SHORTENERS.has(host)) return { level: "CAUTION", reason: "SHORTENER" };
  if (looksLikeBank(host)) return { level: "WARNING", reason: "LOOKALIKE" };
  return { level: "CAUTION", reason: "OTHER_DOMAIN" };
}

export function checkCaller(raw: string): CheckResult<CallerReason> | null {
  const value = raw.trim();
  if (!value) return null;

  const compact = value.replace(/[\s()-]/g, "");
  if (compact.startsWith("+") && !compact.startsWith("+91")) return { level: "WARNING", reason: "INTERNATIONAL" };

  let digits = compact.replace(/\D/g, "");
  if (compact.startsWith("+91") || (digits.length === 12 && digits.startsWith("91"))) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);

  if (/^1600\d{6}$/.test(digits)) return { level: "PASS", reason: "SERVICE_SERIES" };
  if (/^140\d{7}$/.test(digits)) return { level: "CAUTION", reason: "PROMOTIONAL" };
  if (/^[6-9]\d{9}$/.test(digits)) return { level: "WARNING", reason: "MOBILE" };
  return { level: "CAUTION", reason: "UNRECOGNISED" };
}

export function checkUpi(raw: string): CheckResult<UpiReason> | null {
  const value = raw.trim().toLowerCase();
  if (!value) return null;

  const match = /^([a-z0-9._-]{2,256})@([a-z]{2,64})$/.exec(value);
  if (!match) return { level: "WARNING", reason: "INVALID" };
  const [, user, handle] = match;

  // SEBI's validated handles are "@valid" followed by the bank's name.
  if (!/^valid[a-z]+$/.test(handle!)) return { level: "WARNING", reason: "NOT_VALIDATED" };
  if (user!.endsWith(".brk")) return { level: "PASS", reason: "VALIDATED_BROKER" };
  if (user!.endsWith(".mf")) return { level: "PASS", reason: "VALIDATED_FUND" };
  return { level: "PASS", reason: "VALIDATED" };
}

// One-click examples for demos, one per verdict. Links use real domains (a
// bank's bank.in site, a real shortener) plus a lookalike built the way scam
// SMS links are. Phone numbers and UPI user names are fictional; the UPI
// handles follow SEBI's @valid<bank> format. verifyChecks.test.ts pins each verdict.
export const VERIFY_EXAMPLES = {
  link: ["https://sbi.bank.in", "https://bit.ly/3xYz9Ab", "http://sbi-kyc-update.co/verify"],
  caller: ["1600 123 456", "140 1234567", "+91 90000 00000"],
  upi: ["demobroker.brk@validhdfc", "demofund.mf@validicici", "quickreturns@ybl"],
} as const;
