import { describe, expect, it } from "vitest";
import { decimalOnly, digitsOnly } from "./input";

describe("digitsOnly", () => {
  it("drops everything except digits", () => {
    expect(digitsOnly("1e5")).toBe("15");
    expect(digitsOnly("-12.5")).toBe("125");
    expect(digitsOnly("1.000")).toBe("1000");
    expect(digitsOnly("abc")).toBe("");
  });
});

describe("decimalOnly", () => {
  it("keeps digits and the first dot only", () => {
    expect(decimalOnly("1.5.2")).toBe("1.52");
    expect(decimalOnly("-2,5e3")).toBe("253");
    expect(decimalOnly(".5")).toBe(".5");
  });
});

