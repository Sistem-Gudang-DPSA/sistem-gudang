import { describe, expect, it } from "vitest";
import { inputJumlah, jumlahValid } from "./form-utils";

describe("jumlah pengambilan", () => {
  it.each(["1", "0.5", ".25", "1.25", "999999999"])("accepts %s", (value) => {
    expect(jumlahValid(value)).toBe(true);
  });

  it.each(["", "0", "0.00", "-1", "1e2", "1.234", "1..5", "1000000000", "999999999.01"])(
    "rejects %s",
    (value) => expect(jumlahValid(value)).toBe(false),
  );

  it("normalizes commas and preserves invalid input for validation", () => {
    expect(inputJumlah("0,75")).toBe("0.75");
    expect(inputJumlah("1.25")).toBe("1.25");
    expect(inputJumlah("e-1.5")).toBe("e-1.5");
  });
});
