import { fireEvent, render, screen } from "@testing-library/react";
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
  it.each([true, false])("menampilkan divisi Manajemen kosong untuk superadmin atau domain manajemen: superadmin=%s", (isSuperadmin) => {
    render(<SidebarNav user={{ ...user, isSuperadmin, domainCode: isSuperadmin ? null : "manajemen" }} pathname="/dashboard" />);
    const title = screen.getByText("Manajemen");
    const section = title.closest("details")!;
    expect(title.closest("summary")).not.toBeNull();
    expect(section.querySelectorAll("a")).toHaveLength(0);
    expect(section.open).toBe(true);
    fireEvent.click(title);
    expect(section.open).toBe(false);
    fireEvent.click(title);
    expect(section.open).toBe(true);
    expect(screen.queryByRole("link", { name: "Manajemen" })).toBeNull();
  });

  it("tidak menampilkan divisi Manajemen untuk role divisi lain", () => {
    render(<SidebarNav user={{ ...user, isSuperadmin: false, domainCode: "inventory", permissions: ["inbound.view"] }} pathname="/dashboard/gudang" />);
    expect(screen.queryByText("Manajemen")).toBeNull();
    expect(screen.getByText("Gudang")).not.toBeNull();
  });

  it("tidak menampilkan divisi yang disembunyikan (#6)", () => {
    render(<SidebarNav user={user} pathname="/dashboard/superadmin" />);
    expect(screen.queryByText("Produksi")).toBeNull();
    expect(screen.getByText("Keuangan")).toBeTruthy();
    expect(screen.queryByText("Gudang Barang Jadi")).toBeNull();
  });
});
