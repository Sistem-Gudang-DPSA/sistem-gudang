import { describe, expect, it } from "vitest";
import { canAccess, visibleNav } from "./nav";
import type { AuthUser } from "./types";

const user = (permissions: string[], isSuperadmin = false): AuthUser => ({
  id: 1, username: "u", email: "u@x", roleId: 1, roleName: "r", isSuperadmin, permissions,
});
const labels = (u: AuthUser) => visibleNav(u).map((d) => d.key);

describe("visibleNav", () => {
  it("shows every division to a superadmin", () => {
    expect(labels(user([], true))).toEqual(["gudang", "ppic", "purchasing"]);
  });

  it("shows only gudang to an inventory user, without pages outside their permissions", () => {
    const inventory = user(["inbound.view", "report.view", "item.view", "location.view", "supplier.view"]);
    const nav = visibleNav(inventory);
    expect(nav.map((d) => d.key)).toEqual(["gudang"]);
    const hrefs = nav[0].groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toContain("/dashboard/gudang/laporan/rekap-permintaan");
    expect(hrefs).not.toContain("/dashboard/gudang/transaksi/barang-keluar");
    expect(hrefs).toContain("/dashboard/gudang/laporan/dokubah");
  });

  it("maps ppic and purchasing users to their own division", () => {
    expect(labels(user(["purchase-request.create", "material-request.create", "item.view"]))).toEqual(["ppic"]);
    expect(labels(user(["item.set-price", "supplier.view", "item.view"]))).toEqual(["purchasing"]);
  });

  it("shows no division to a user without permissions", () => {
    expect(labels(user([]))).toEqual([]);
  });
});

describe("canAccess", () => {
  const inventory = user(["inbound.view", "report.view", "item.view", "location.view"]);

  it("allows the overview and pages of the user's own division", () => {
    expect(canAccess(inventory, "/dashboard")).toBe(true);
    expect(canAccess(inventory, "/dashboard/gudang")).toBe(true);
    expect(canAccess(inventory, "/dashboard/gudang/transaksi/barang-masuk")).toBe(true);
  });

  it("denies pages that need a permission the user lacks, including sub-pages", () => {
    expect(canAccess(inventory, "/dashboard/gudang/transaksi/stock-opname")).toBe(false);
    expect(canAccess(inventory, "/dashboard/gudang/transaksi/stock-opname/tambah")).toBe(false);
  });

  it("denies other divisions and superadmin pages", () => {
    expect(canAccess(inventory, "/dashboard/ppic/master/data-barang")).toBe(false);
    expect(canAccess(inventory, "/dashboard/superadmin/users")).toBe(false);
    expect(canAccess(user([], true), "/dashboard/superadmin/users")).toBe(true);
  });

  it("lets unknown paths through so Next.js can answer 404", () => {
    expect(canAccess(inventory, "/dashboard/tidak-ada")).toBe(true);
  });
});
