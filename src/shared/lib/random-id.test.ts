import { describe, it, expect, vi, afterEach } from "vitest";
import { randomId } from "./random-id";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => vi.unstubAllGlobals());

describe("randomId", () => {
  it("returns a UUID v4", () => {
    expect(randomId()).toMatch(UUID_V4);
  });

  it("still works without crypto.randomUUID (plain HTTP on the LAN)", () => {
    vi.stubGlobal("crypto", { getRandomValues: crypto.getRandomValues.bind(crypto) });
    const a = randomId();
    expect(a).toMatch(UUID_V4);
    expect(randomId()).not.toBe(a);
  });
});
