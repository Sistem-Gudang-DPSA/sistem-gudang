import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SidebarNav from "./SidebarNav";
import type { AuthUser } from "../types";

vi.mock("./LaporMasalahButton", () => ({ default: () => null }));

const user: AuthUser = {
  id: 1, username: "admin", email: "admin@example.com", roleId: 1,
  roleName: "Superadmin", isSuperadmin: true, permissions: [],
};

describe("production sidebar", () => {
  it("highlights only the production link in blue on a production detail page", () => {
    const onNavigate = vi.fn();
    render(<SidebarNav user={user} pathname="/dashboard/produksi/laporan/realisasi-spk/SPK-1" onNavigate={onNavigate} />);
    const production = screen.getByText("Produksi").closest("details")!;
    const finance = screen.getByText("Keuangan").closest("details")!;
    const link = within(production).getByRole("link", { name: "Realisasi SPK" });
    expect(link.getAttribute("href")).toBe("/dashboard/produksi/laporan/realisasi-spk");
    expect(link.className).toContain("bg-blue-500");
    expect(within(finance).getByRole("link", { name: "Realisasi SPK" }).className).not.toContain("finance-nav-active");
    fireEvent.click(link);
    expect(onNavigate).toHaveBeenCalledOnce();
  });
});
