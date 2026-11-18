import { describe, expect, it } from "vitest";
import { formatNamaPengambil, inputJumlah, jumlahValid } from "./form-utils";

describe("jumlah pengambilan", () => {
  it.each(["1", "0.5", ".25", "1.25", "1.234", "0.001", ".123", "1000000"])("accepts %s", (value) => {
    expect(jumlahValid(value)).toBe(true);
  });

  it.each(["", "0", "0.00", "-1", "1e2", "1.2345", "0.0001", "0.123456789012345", "1..5", "1000001", "1000000.001", "999999999"])(
    "rejects %s",
    (value) => expect(jumlahValid(value)).toBe(false),
  );

  it("normalizes commas and preserves invalid input for validation", () => {
    expect(inputJumlah("0,75")).toBe("0.75");
    expect(inputJumlah("1.25")).toBe("1.25");
    expect(inputJumlah("e-1.5")).toBe("e-1.5");
  });
});

describe("nama pengambil", () => {
  it.each([
    ["pak mul", "Pak Mul"],
    ["PAK MUL", "Pak Mul"],
    ["pAk mUL", "Pak Mul"],
    ["  pak  mul ", "  Pak  Mul "],
    ["ÉLI D'ANGELO", "Éli D'Angelo"],
    ["ALI-SAID", "Ali-Said"],
    ["", ""],
  ])("formats %s as %s without dropping spaces or punctuation", (input, expected) => {
    expect(formatNamaPengambil(input)).toBe(expected);
  });
});
