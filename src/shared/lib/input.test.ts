import { describe, expect, it } from "vitest";
import { decimalOnly, digitsOnly, roundQty } from "./input";

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


describe("roundQty", () => {
  it("rounds float noise for display", () => {
    expect(roundQty(0.1 + 0.2)).toBe(0.3);
    expect(roundQty(1.0005, 2)).toBe(1);
    expect(roundQty(25 - 0.7)).toBe(24.3);
  });
});
