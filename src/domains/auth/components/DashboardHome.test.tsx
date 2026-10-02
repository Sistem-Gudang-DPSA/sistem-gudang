import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardHome from "./DashboardHome";
import { AuthUserProvider } from "../user-context";
import type { AuthUser } from "../types";

const user = (permissions: string[], over: Partial<AuthUser> = {}): AuthUser => ({
  id: 1, username: "budi", email: "b@x", roleId: 1, roleName: "Staf PPIC", isSuperadmin: false, permissions, ...over,
});

const renderFor = (u: AuthUser) =>
  render(
    <AuthUserProvider user={u}>
      <DashboardHome />
    </AuthUserProvider>,
  );

const hrefs = () => screen.queryAllByRole("link").map((a) => a.getAttribute("href"));

describe("DashboardHome", () => {
  it("greets the user and lists only the divisions and pages they may open", () => {
    renderFor(user(["purchase-request.create", "dokubah.view", "report.view", "item.view"]));
    expect(screen.getByText("Selamat datang, budi")).not.toBeNull();
    expect(document.body.textContent).toContain("Anda masuk sebagai Staf PPIC");
    expect(hrefs()).toContain("/dashboard/ppic");
    expect(hrefs()).toContain("/dashboard/ppic/transaksi/permintaan-pembelian");
    expect(hrefs()).not.toContain("/dashboard/gudang");
    expect(hrefs()).not.toContain("/dashboard/purchasing");
    expect(hrefs()).not.toContain("/dashboard/superadmin");
  });

  it("shows every division and the Super Admin shortcut to a superadmin", () => {
    renderFor(user([], { isSuperadmin: true, roleName: "Superadmin" }));
    expect(hrefs()).toEqual(expect.arrayContaining(["/dashboard/superadmin", "/dashboard/gudang", "/dashboard/ppic", "/dashboard/purchasing"]));
    expect(document.body.textContent).toContain("Super Admin");
  });

  it("explains when the account has no access to any page", () => {
    renderFor(user([]));
    expect(screen.getByRole("status").textContent).toContain("belum punya akses");
    expect(hrefs()).toEqual([]);
  });

  it("does not show invented statistics", () => {
    renderFor(user(["inbound.view"]));
    expect(document.body.textContent).not.toMatch(/1,245|Production Rate|Welcome back/);
  });
});
