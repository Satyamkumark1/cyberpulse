import { describe, expect, it } from "vitest";
import { checkCaller, checkLink, checkUpi } from "./verifyChecks";

describe("checkLink — TC-SAFE-003", () => {
  it.each([
    ["https://www.onlinesbi.bank.in", "PASS", "BANK_DOMAIN"],
    ["onlinesbi.bank.in/login", "PASS", "BANK_DOMAIN"],
    ["https://bank.in", "PASS", "BANK_DOMAIN"],
    ["http://www.onlinesbi.bank.in", "CAUTION", "BANK_DOMAIN_HTTP"],
    ["https://bank.in.evil.com", "WARNING", "LOOKALIKE"],
    ["https://sbibank.in", "WARNING", "LOOKALIKE"],
    ["https://sbi-kyc-update.co/verify", "WARNING", "LOOKALIKE"],
    ["https://onlinesbi.bank.in@evil.com", "CAUTION", "OTHER_DOMAIN"],
    ["https://xn--sbi-bnk-9za.com", "WARNING", "HOMOGRAPH"],
    ["http://192.168.10.4/kyc", "WARNING", "IP_ADDRESS"],
    ["https://bit.ly/3abcd", "CAUTION", "SHORTENER"],
    ["https://www.turbine-parts.com", "CAUTION", "OTHER_DOMAIN"],
    ["javascript:alert(1)", "WARNING", "INVALID"],
    ["not a link", "WARNING", "INVALID"],
  ] as const)("%s → %s %s", (input, level, reason) => {
    expect(checkLink(input)).toEqual({ level, reason });
  });

  it("returns null for an empty value", () => {
    expect(checkLink("   ")).toBeNull();
  });
});

describe("checkCaller — TC-SAFE-004", () => {
  it.each([
    ["1600123456", "PASS", "SERVICE_SERIES"],
    ["1600 123 456", "PASS", "SERVICE_SERIES"],
    ["+91 1600 123 456", "PASS", "SERVICE_SERIES"],
    ["160012345", "CAUTION", "UNRECOGNISED"],
    ["1601234567", "CAUTION", "UNRECOGNISED"],
    ["1401234567", "CAUTION", "PROMOTIONAL"],
    ["9876543210", "WARNING", "MOBILE"],
    ["+91 98765 43210", "WARNING", "MOBILE"],
    ["098765 43210", "WARNING", "MOBILE"],
    ["5876543210", "CAUTION", "UNRECOGNISED"],
    ["+1 415 555 0100", "WARNING", "INTERNATIONAL"],
  ] as const)("%s → %s %s", (input, level, reason) => {
    expect(checkCaller(input)).toEqual({ level, reason });
  });

  it("returns null for an empty value", () => {
    expect(checkCaller("")).toBeNull();
  });
});

describe("checkUpi — TC-SAFE-005", () => {
  it.each([
    ["abc.brk@validhdfc", "PASS", "VALIDATED_BROKER"],
    ["ABC.BRK@VALIDHDFC", "PASS", "VALIDATED_BROKER"],
    ["xyzfund.mf@valididbi", "PASS", "VALIDATED_FUND"],
    ["abc@validsbi", "PASS", "VALIDATED"],
    ["abc@valid", "WARNING", "NOT_VALIDATED"],
    ["growthtips@ybl", "WARNING", "NOT_VALIDATED"],
    ["abc.brk@hdfcvalid", "WARNING", "NOT_VALIDATED"],
    ["no-at-sign", "WARNING", "INVALID"],
    ["a@b@c", "WARNING", "INVALID"],
  ] as const)("%s → %s %s", (input, level, reason) => {
    expect(checkUpi(input)).toEqual({ level, reason });
  });
});
