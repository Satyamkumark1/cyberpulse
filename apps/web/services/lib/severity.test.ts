import { describe, expect, it } from "vitest";
import { deriveSeverity } from "./severity";

describe("deriveSeverity — TC-UNIT-021", () => {
  it("derives HIGH severity from HIGH risk level", () => {
    expect(deriveSeverity("HIGH")).toBe("HIGH");
  });

  it("derives MEDIUM severity from MEDIUM risk level", () => {
    expect(deriveSeverity("MEDIUM")).toBe("MEDIUM");
  });

  it("derives LOW severity from LOW risk level", () => {
    expect(deriveSeverity("LOW")).toBe("LOW");
  });

  it("has exactly one parameter and accepts no override", () => {
    expect(deriveSeverity.length).toBe(1);
  });
});
