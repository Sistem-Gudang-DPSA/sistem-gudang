import { describe, expect, it } from "vitest";
import { canAccess, visibleNav } from "./nav";
import type { AuthUser } from "./types";

const user = (permissions: string[], isSuperadmin = false): AuthUser => ({
  id: 1, username: "u", email: "u@x", roleId: 1, roleName: "r", isSuperadmin, permissions,
});
const labels = (u: AuthUser) => visibleNav(u).map((d) => d.key);

describe("visibleNav", () => {
  it("shows every division to a superadmin", () => {
    expect(labels(user([], true))).toEqual(["superadmin", "gudang", "gudang-barang-jadi", "ppic", "purchasing"]);
  });

  it("keeps the Super Admin division away from non-superadmins, whatever their permissions", () => {
    const everything = user(["item.view", "location.view", "supplier.view", "inbound.view", "purchase-request.create", "item.set-price"]);
    expect(labels(everything)).not.toContain("superadmin");
  });

  it("shows only the gudang divisions to an inventory user, without pages outside their permissions", () => {
    const inventory = user(["inbound.view", "report.view", "dokubah.view", "item.view", "location.view", "supplier.view"]);
    const nav = visibleNav(inventory);
    expect(nav.map((d) => d.key)).toEqual(["gudang", "gudang-barang-jadi"]);
    const hrefs = nav[0].groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toContain("/dashboard/gudang/laporan/rekap-permintaan");
    expect(hrefs).not.toContain("/dashboard/gudang/transaksi/barang-keluar");
    expect(hrefs).toContain("/dashboard/gudang/laporan/dokubah");
  });

  it("maps ppic and purchasing users to their own division", () => {
    expect(labels(user(["purchase-request.create", "material-request.create", "item.view"]))).toEqual(["ppic"]);
    expect(labels(user(["item.set-price", "supplier.view", "item.view"]))).toEqual(["purchasing"]);
  });

  it("puts permintaan pembelian under ppic, not gudang", () => {
    const hrefs = (u: AuthUser, key: string) => visibleNav(u).find((d) => d.key === key)?.groups.flatMap((g) => g.items.map((i) => i.href)) ?? [];
    const ppic = user(["purchase-request.create", "item.view"]);
    expect(hrefs(ppic, "ppic")).toContain("/dashboard/ppic/transaksi/permintaan-pembelian");
    expect(hrefs(user(["inbound.view"]), "gudang").some((h) => h.includes("pembelian"))).toBe(false);
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
    expect(canAccess(user(["item.view"]), "/dashboard/superadmin/master/data-barang")).toBe(false);
    expect(canAccess(user([], true), "/dashboard/superadmin/master/kategori")).toBe(true);
  });

  it("lets unknown paths through so Next.js can answer 404", () => {
    expect(canAccess(inventory, "/dashboard/tidak-ada")).toBe(true);
  });
});

// Permission sets copied from the seeded accounts of the backend (login response, 2026-10-02).
const SEEDED = {
  kInventory: ["inbound.view", "inbound.create", "outbound.view", "outbound.create", "stock-opname.view", "stock-opname.create", "material-request.view", "material-request.update", "report.view", "item.view", "item.create", "item.update", "item.delete", "item.assign-location", "item.adjust-stock", "dokubah.view", "dokubah.approve", "spk-internal.view", "location.view", "location.create", "location.update", "location.delete", "supplier.view"],
  stafInventory: ["inbound.view", "inbound.create", "outbound.view", "outbound.create", "stock-opname.view", "stock-opname.create", "material-request.view", "material-request.update", "report.view", "item.view", "item.create", "item.update", "item.assign-location", "item.adjust-stock", "dokubah.view", "spk-internal.view", "location.view", "location.create", "location.update", "supplier.view"],
  ppic: ["purchase-request.create", "material-request.view", "material-request.create", "report.view", "item.view", "item.create", "item.update", "dokubah.view", "dokubah.create", "dokubah.update", "penawaran-harga.view", "penawaran-harga.create", "penawaran-harga.update", "penawaran-harga.publish", "spk-internal.view", "spk-internal.create", "spk-internal.allocate"],
  kPurchasing: ["purchase-request.approve", "item.view", "item.update", "item.set-price", "purchase-order.view", "purchase-order.create", "supplier.view", "supplier.create", "supplier.update", "supplier.delete"],
};

const itemsOf = (u: AuthUser, key: string) =>
  visibleNav(u).find((d) => d.key === key)?.groups.flatMap((g) => g.items.map((i) => i.label)) ?? [];

describe("sidebar per seeded role", () => {
  it("Inventory staff and coordinator see only the Gudang divisions", () => {
    expect(labels(user(SEEDED.kInventory))).toEqual(["gudang", "gudang-barang-jadi"]);
    expect(labels(user(SEEDED.stafInventory))).toEqual(["gudang", "gudang-barang-jadi"]);
    expect(itemsOf(user(SEEDED.kInventory), "gudang")).toContain("Rekap Dokubah");
  });

  it("PPIC sees only the PPIC division even though it holds report.view and item.view", () => {
    const ppic = user(SEEDED.ppic);
    expect(labels(ppic)).toEqual(["ppic"]);
    expect(itemsOf(ppic, "ppic")).toEqual([
      "Data Barang", "Penawaran Harga", "Dokubah", "SPK Internal & Mutasi Stok", "Permintaan Pembelian", "Approval",
      "Rekap Dokubah", "Rekap Mutasi Barang", "Rekap Stok Opname & Mutasi Stok", "Rekap Pembelian",
    ]);
    expect(canAccess(ppic, "/dashboard/gudang/laporan/rekap-permintaan")).toBe(false);
    expect(canAccess(ppic, "/dashboard/gudang/master/data-barang")).toBe(false);
  });

  it("Purchasing sees only the Purchasing division with its own pages", () => {
    const p = user(SEEDED.kPurchasing);
    expect(labels(p)).toEqual(["purchasing"]);
    expect(itemsOf(p, "purchasing")).toEqual([
      "Data Barang", "Data Supplier", "Buat PO", "Penawaran Harga / SPH", "Retur ke Supplier",
      "Rekap Data Barang Masuk", "Rekap Data Barang Keluar", "Rekap Stock Opname", "Rekap Pembelian",
    ]);
    expect(canAccess(p, "/dashboard/ppic/transaksi/permintaan-pembelian")).toBe(false);
    expect(canAccess(p, "/dashboard/purchasing/laporan/rekap-pembelian/buat-po/3")).toBe(true);
  });

  it("only PPIC can open the pembelian request pages and only Purchasing approvers see its rekap", () => {
    expect(itemsOf(user(SEEDED.kInventory), "gudang").some((l) => l.includes("Pembelian"))).toBe(false);
    expect(itemsOf(user(SEEDED.kPurchasing), "purchasing")).not.toContain("Permintaan Pembelian");
  });

  it("every nav item declares the permission it needs", () => {
    const all = visibleNav(user([], true)).flatMap((d) => d.groups.flatMap((g) => g.items));
    expect(all.length).toBeGreaterThan(0);
    // A superadmin sees everything, so a missing anyOf would show up as an item reachable with no permission.
    const nobody = visibleNav(user(["inbound.view", "purchase-request.create", "item.set-price"]));
    const leaked = nobody.flatMap((d) => d.groups.flatMap((g) => g.items.filter((i) => !i.anyOf).map((i) => i.label)));
    expect(leaked).toEqual([]);
  });
});
