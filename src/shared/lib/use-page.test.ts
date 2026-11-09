import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useClampPage, usePage } from "./use-page";

describe("usePage", () => {
  it("falls back to page 1 when the reset key changes", () => {
    const { result, rerender } = renderHook(({ k }) => usePage(k), { initialProps: { k: "a" } });
    act(() => result.current[1](3));
    expect(result.current[0]).toBe(3);
    rerender({ k: "b" });
    expect(result.current[0]).toBe(1);
  });
});

describe("useClampPage", () => {
  it("moves to the last page when the current page is past the end", () => {
    const { result, rerender } = renderHook(({ t }) => {
      const [page, setPage] = usePage("k");
      useClampPage(page, t, 20, setPage);
      return [page, setPage] as const;
    }, { initialProps: { t: 41 } });
    act(() => result.current[1](3));
    expect(result.current[0]).toBe(3);
    rerender({ t: 40 }); // last row of page 3 deleted
    expect(result.current[0]).toBe(2);
    rerender({ t: 0 }); // load error / not loaded: leave the page alone
    expect(result.current[0]).toBe(2);
  });
});
