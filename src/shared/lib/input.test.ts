import { describe, expect, it } from "vitest";
import { digitsOnly } from "./input";

describe("digitsOnly", () => {
  it("drops everything except digits", () => {
    expect(digitsOnly("1e5")).toBe("15");
    expect(digitsOnly("-12.5")).toBe("125");
    expect(digitsOnly("1.000")).toBe("1000");
    expect(digitsOnly("abc")).toBe("");
  });
});
