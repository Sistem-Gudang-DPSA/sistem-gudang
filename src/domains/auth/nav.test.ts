import { describe, expect, it } from "vitest";
import { canAccess, visibleNav } from "./nav";
import type { AuthUser } from "./types";

const user = (permissions: string[], isSuperadmin = false): AuthUser => ({
  id: 1, username: "u", email: "u@x", roleId: 1, roleName: "r", isSuperadmin, permissions,
});
const withDomain = (u: AuthUser, domainCode: string | null): AuthUser => ({ ...u, domainCode });
const labels = (u: AuthUser) => visibleNav(u).map((d) => d.key);

describe("visibleNav", () => {
  it("shows finance reports only to the keuangan domain with report permission", () => {
    const finance = withDomain(user(["report.view"]), "keuangan");
    const nav = visibleNav(finance);
    expect(nav.map((division) => division.key)).toEqual(["keuangan"]);
    expect(nav[0].theme).toBe("emerald");
    expect(nav[0].groups.map((group) => group.title)).toEqual(["Laporan"]);
    expect(nav[0].groups[0].items).toEqual([
      expect.objectContaining({ href: "/dashboard/keuangan/laporan/data-barang" }),
      expect.objectContaining({ href: "/dashboard/keuangan/laporan/realisasi-spk" }),
    ]);
    expect(canAccess(finance, "/dashboard/keuangan/laporan/data-barang")).toBe(true);
    expect(canAccess(withDomain(user(["report.view"]), "inventory"), "/dashboard/keuangan/laporan/data-barang")).toBe(false);
    expect(visibleNav({ ...finance, permissions: [] })).toEqual([]);
  });

  it("shows production reports in blue only to production users with report permission", () => {
    const production = withDomain(user(["report.view"]), "produksi");
    const nav = visibleNav(production);
    expect(nav.map((division) => division.key)).toEqual(["produksi"]);
    expect(nav[0].theme).toBe("blue");
    expect(nav[0].groups[0].items.map((item) => item.href)).toEqual([
      "/dashboard/produksi/laporan/data-barang",
      "/dashboard/produksi/laporan/realisasi-spk",
    ]);
    for (const item of nav[0].groups[0].items) {
      expect(canAccess(production, item.href)).toBe(true);
      expect(canAccess(withDomain(user(["report.view"]), "keuangan"), item.href)).toBe(false);
    }
    expect(canAccess(production, "/dashboard/produksi/laporan/realisasi-spk/123")).toBe(true);
    expect(canAccess(production, "/dashboard/keuangan/laporan/data-barang")).toBe(false);
    expect(visibleNav({ ...production, permissions: [] })).toEqual([]);
    expect(canAccess({ ...production, permissions: [] }, "/dashboard/produksi/laporan/data-barang")).toBe(false);
  });

  it("keeps keuangan away from ppic and purchasing users who also hold report.view", () => {
    expect(labels(withDomain(user(SEEDED.ppic), "ppic"))).toEqual(["ppic"]);
    expect(labels(withDomain(user(SEEDED.kPurchasing), "purchasing"))).toEqual(["purchasing"]);
  });

  it("shows every division to a superadmin", () => {
    expect(labels(user([], true))).toEqual(["superadmin", "gudang", "gudang-barang-jadi", "ppic", "purchasing", "keuangan", "produksi"]);
  });

  it("keeps the Super Admin division away from non-superadmins, whatever their permissions", () => {
    const everything = user(["item.view", "location.view", "supplier.view", "inbound.view", "purchase-request.create", "item.set-price"]);
    expect(labels(everything)).not.toContain("superadmin");
  });

  it("shows only the gudang division to an inventory user, without pages outside their permissions", () => {
    const inventory = withDomain(user(["inbound.view", "report.view", "dokubah.view", "item.view", "location.view", "supplier.view"]), "inventory");
    const nav = visibleNav(inventory);
    expect(nav.map((d) => d.key)).toEqual(["gudang"]);
    const hrefs = nav[0].groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toContain("/dashboard/gudang/laporan/rekap-permintaan");
    expect(hrefs).not.toContain("/dashboard/gudang/transaksi/barang-keluar");
    expect(hrefs).toContain("/dashboard/gudang/laporan/dokubah");
  });

  it("shows only gudang-barang-jadi to a gudang-barang-jadi domain user, even with inventory permissions", () => {
    const gbj = withDomain(user(SEEDED.kInventory), "gudang-barang-jadi");
    expect(labels(gbj)).toEqual(["gudang-barang-jadi"]);
    expect(canAccess(gbj, "/dashboard/gudang/laporan/rekap-permintaan")).toBe(false);
    expect(canAccess(gbj, "/dashboard/gudang-barang-jadi/laporan/rekap-permintaan")).toBe(true);
  });

  it("maps ppic and purchasing users to their own division", () => {
    expect(labels(user(["material-request.create", "item.view"]))).toEqual(["ppic"]);
    expect(labels(user(["item.set-price", "supplier.view", "item.view"]))).toEqual(["purchasing"]);
  });

  it("falls back to permissions only when the user has no domainCode", () => {
    expect(labels(withDomain(user(SEEDED.ppic), null))).toEqual(["ppic", "keuangan", "produksi"]);
    expect(labels(withDomain(user(SEEDED.kInventory), null))).toEqual(["gudang", "gudang-barang-jadi", "keuangan", "produksi"]);
  });

  it("puts permintaan pembelian under ppic, and also under gudang", () => {
    const hrefs = (u: AuthUser, key: string) => visibleNav(u).find((d) => d.key === key)?.groups.flatMap((g) => g.items.map((i) => i.href)) ?? [];
    const ppic = user(["purchase-request.create", "material-request.create", "item.view"]);
    expect(hrefs(ppic, "ppic")).toContain("/dashboard/ppic/transaksi/permintaan-pembelian");
    expect(hrefs(user(["inbound.view"]), "gudang").some((h) => h.includes("pembelian"))).toBe(false);
  });

  it("also shows permintaan pembelian under gudang, only with purchase-request.create", () => {
    const hrefs = (u: AuthUser) => visibleNav(u).find((d) => d.key === "gudang")?.groups.flatMap((g) => g.items.map((i) => i.href)) ?? [];
    expect(hrefs(user(["inbound.view", "purchase-request.create"]))).toContain("/dashboard/gudang/transaksi/permintaan-pembelian");
    expect(hrefs(withDomain(user(SEEDED.kInventory), "inventory"))).toContain("/dashboard/gudang/transaksi/permintaan-pembelian");
    expect(hrefs(withDomain(user(SEEDED.stafInventory), "inventory"))).toContain("/dashboard/gudang/transaksi/permintaan-pembelian");
  });

  it("shows no division to a user without permissions", () => {
    expect(labels(user([]))).toEqual([]);
  });
});

describe("canAccess", () => {
  const inventory = withDomain(user(["inbound.view", "report.view", "item.view", "location.view"]), "inventory");

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

  it("denies another domain's dashboard even when the permissions match", () => {
    expect(canAccess(withDomain(user(SEEDED.ppic), "ppic"), "/dashboard/keuangan/laporan/data-barang")).toBe(false);
    expect(canAccess(withDomain(user(SEEDED.kPurchasing), "purchasing"), "/dashboard/keuangan/laporan/realisasi-spk")).toBe(false);
  });

  it("lets unknown paths through so Next.js can answer 404", () => {
    expect(canAccess(inventory, "/dashboard/tidak-ada")).toBe(true);
  });
});

// Permission sets copied from the seeded accounts of the backend (login response, 2026-10-02).
const SEEDED = {
  kInventory: ["purchase-request.create", "inbound.view", "inbound.create", "outbound.view", "outbound.create", "stock-opname.view", "stock-opname.create", "material-request.view", "material-request.update", "report.view", "item.view", "item.create", "item.update", "item.delete", "item.assign-location", "item.adjust-stock", "dokubah.view", "dokubah.approve", "spk-internal.view", "location.view", "location.create", "location.update", "location.delete", "supplier.view"],
  stafInventory: ["purchase-request.create", "inbound.view", "inbound.create", "outbound.view", "outbound.create", "stock-opname.view", "stock-opname.create", "material-request.view", "material-request.update", "report.view", "item.view", "item.create", "item.update", "item.assign-location", "item.adjust-stock", "dokubah.view", "spk-internal.view", "location.view", "location.create", "location.update", "supplier.view"],
  ppic: ["purchase-request.create", "material-request.view", "material-request.create", "report.view", "item.view", "item.create", "item.update", "dokubah.view", "dokubah.create", "dokubah.update", "penawaran-harga.view", "penawaran-harga.create", "penawaran-harga.update", "penawaran-harga.publish", "spk-internal.view", "spk-internal.create", "spk-internal.allocate"],
  kPurchasing: ["purchase-request.approve", "item.view", "item.update", "item.set-price", "purchase-order.view", "purchase-order.create", "supplier.view", "supplier.create", "supplier.update", "supplier.delete", "report.view", "penawaran-harga.view", "penawaran-harga.create", "penawaran-harga.update"],
};

const itemsOf = (u: AuthUser, key: string) =>
  visibleNav(u).find((d) => d.key === key)?.groups.flatMap((g) => g.items.map((i) => i.label)) ?? [];

describe("sidebar per seeded role", () => {
  it("Inventory staff and coordinator see only the Gudang division", () => {
    const koor = withDomain(user(SEEDED.kInventory), "inventory");
    const staf = withDomain(user(SEEDED.stafInventory), "inventory");
    expect(labels(koor)).toEqual(["gudang"]);
    expect(labels(staf)).toEqual(["gudang"]);
    expect(itemsOf(koor, "gudang")).toContain("Rekap Dokubah");
  });

  it("PPIC sees only the PPIC division even though it holds report.view and item.view", () => {
    const ppic = withDomain(user(SEEDED.ppic), "ppic");
    expect(labels(ppic)).toEqual(["ppic"]);
    expect(itemsOf(ppic, "ppic")).toEqual([
      "Data Barang", "Penawaran Harga", "Dokubah", "SPK Internal & Mutasi Stok", "Permintaan Pembelian", "Approval",
      "Rekap Dokubah", "Rekap Mutasi Barang", "Rekap Stok Opname & Mutasi Stok", "Rekap Pembelian",
    ]);
    expect(canAccess(ppic, "/dashboard/gudang/laporan/rekap-permintaan")).toBe(false);
    expect(canAccess(ppic, "/dashboard/gudang/master/data-barang")).toBe(false);
  });

  it("Purchasing sees only the Purchasing division with its own pages", () => {
    const p = withDomain(user(SEEDED.kPurchasing), "purchasing");
    expect(labels(p)).toEqual(["purchasing"]);
    expect(itemsOf(p, "purchasing")).toEqual([
      "Data Barang", "Data Supplier", "PO Barang", "Penawaran Harga / SPH", "Retur ke Supplier",
      "Rekap Data Barang Masuk", "Rekap Data Barang Keluar", "Rekap Stock Opname", "Rekap Pembelian",
    ]);
    expect(canAccess(p, "/dashboard/ppic/transaksi/permintaan-pembelian")).toBe(false);
    expect(canAccess(p, "/dashboard/purchasing/laporan/rekap-pembelian/buat-po/3")).toBe(true);
  });

  it("only PPIC can open the pembelian request pages and only Purchasing approvers see its rekap", () => {
    expect(itemsOf(withDomain(user(SEEDED.kInventory), "inventory"), "gudang")).toContain("Permintaan Pembelian");
    expect(labels(withDomain(user(SEEDED.kInventory), "inventory"))).not.toContain("ppic");
    expect(itemsOf(withDomain(user(SEEDED.kPurchasing), "purchasing"), "purchasing")).not.toContain("Permintaan Pembelian");
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


describe("superadmin outbound edit history access", () => {
  const path = "/dashboard/superadmin/laporan/riwayat-edit-barang-keluar";
  it("exposes the history menu only to superadmin", () => {
    expect(itemsOf(user([], true), "superadmin")).toContain("Riwayat Edit Barang Keluar");
    expect(canAccess(user([], true), path)).toBe(true);
    expect(canAccess(user(["outbound.view", "outbound.update", "report.view"]), path)).toBe(false);
    expect(visibleNav(user(["outbound.view", "outbound.update", "report.view"])).flatMap((division) => division.groups.flatMap((group) => group.items)).some((item) => item.href === path)).toBe(false);
  });
});
