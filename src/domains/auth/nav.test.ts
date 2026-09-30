import { describe, expect, it } from "vitest";
import { visibleNav } from "./nav";
import type { AuthUser } from "./types";

const user = (permissions: string[], isSuperadmin = false): AuthUser => ({
  id: 1, username: "u", email: "u@x", roleId: 1, roleName: "r", isSuperadmin, permissions,
});
const labels = (u: AuthUser) => visibleNav(u).map((d) => d.key);

describe("visibleNav", () => {
  it("shows every division to a superadmin", () => {
    expect(labels(user([], true))).toEqual(["gudang", "ppic", "purchasing"]);
  });

  it("shows only gudang to an inventory user, without pages that do not exist", () => {
    const inventory = user(["inbound.view", "report.view", "item.view", "location.view", "supplier.view"]);
    const nav = visibleNav(inventory);
    expect(nav.map((d) => d.key)).toEqual(["gudang"]);
    const hrefs = nav[0].groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toContain("/dashboard/gudang/laporan/rekap-permintaan");
    expect(hrefs).not.toContain("/dashboard/gudang/transaksi/barang-keluar");
    expect(hrefs).not.toContain("/dashboard/gudang/laporan/dokubah");
  });

  it("maps ppic and purchasing users to their own division", () => {
    expect(labels(user(["purchase-request.create", "material-request.create", "item.view"]))).toEqual(["ppic"]);
    expect(labels(user(["item.set-price", "supplier.view", "item.view"]))).toEqual(["purchasing"]);
  });

  it("shows no division to a user without permissions", () => {
    expect(labels(user([]))).toEqual([]);
  });
});
