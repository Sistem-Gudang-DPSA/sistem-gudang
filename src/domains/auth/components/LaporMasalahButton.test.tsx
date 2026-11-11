import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LaporMasalahButton from "./LaporMasalahButton";

const router = { push: vi.fn(), replace: vi.fn() };
let query = "";
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(query),
}));

describe("Lapor Masalah sidebar link", () => {
  beforeEach(() => {
    query = "";
    router.replace.mockClear();
  });

  it("links to the reports page", () => {
    render(<LaporMasalahButton />);
    expect(screen.getByRole("link", { name: "Laporkan Masalah" }).getAttribute("href")).toBe("/dashboard/laporan-masalah");
  });

  it("sends the notification deep link to the reports page", () => {
    query = "laporan=saya";
    render(<LaporMasalahButton />);
    expect(router.replace).toHaveBeenCalledWith("/dashboard/laporan-masalah");
  });
});
