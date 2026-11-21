import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SidebarNav from "./SidebarNav";
import type { AuthUser } from "../types";

vi.mock("./LaporMasalahButton", () => ({ default: () => null }));

const user: AuthUser = {
  id: 1, username: "admin", email: "admin@example.com", roleId: 1,
  roleName: "Superadmin", isSuperadmin: true, permissions: [],
};

describe("notifications sidebar", () => {
  it.each([true, false])("shows the shared Notifications link for superadmin=%s and highlights it", (isSuperadmin) => {
    const onNavigate = vi.fn();
    render(<SidebarNav user={{ ...user, isSuperadmin }} pathname="/dashboard/notifications" onNavigate={onNavigate} />);
    const link = screen.getByRole("link", { name: "Notifications" });
    expect(link.getAttribute("href")).toBe("/dashboard/notifications");
    expect(link.className).toContain("bg-blue-600");
    fireEvent.click(link);
    expect(onNavigate).toHaveBeenCalledOnce();
  });
});

describe("dashboard sidebar", () => {
  it("menampilkan Dashboard menuju divisi role dan bukan Overview", () => {
    const ppic: AuthUser = {
      ...user, username: "ppic", isSuperadmin: false, domainCode: "ppic",
      permissions: ["purchase-request.create", "material-request.create", "item.view"],
    };
    render(<SidebarNav user={ppic} pathname="/dashboard/ppic" />);
    expect(screen.queryByText("Overview")).toBeNull();
    const link = screen.getByRole("link", { name: "Dashboard" });
    expect(link.getAttribute("href")).toBe("/dashboard/ppic");
    expect(link.className).toContain("bg-blue-600");
  });

  it("superadmin hanya punya satu Dashboard menuju /dashboard/superadmin", () => {
    render(<SidebarNav user={user} pathname="/dashboard/superadmin" />);
    const links = screen.getAllByRole("link", { name: "Dashboard" });
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("/dashboard/superadmin");
  });
});

describe("production sidebar", () => {
  it("highlights only the production link in blue on a production detail page", () => {
    const onNavigate = vi.fn();
    render(<SidebarNav user={user} pathname="/dashboard/produksi/laporan/realisasi-spk/SPK-1" onNavigate={onNavigate} />);
    const production = screen.getByText("Produksi").closest("details")!;
    const finance = screen.getByText("Keuangan").closest("details")!;
    const link = within(production).getByRole("link", { name: "Realisasi Dokubah" });
    expect(link.getAttribute("href")).toBe("/dashboard/produksi/laporan/realisasi-spk");
    expect(link.className).toContain("bg-blue-500");
    expect(within(finance).getByRole("link", { name: "Realisasi Dokubah" }).className).not.toContain("finance-nav-active");
    fireEvent.click(link);
    expect(onNavigate).toHaveBeenCalledOnce();
  });
});
