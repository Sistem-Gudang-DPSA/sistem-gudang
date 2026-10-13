import { PackageCheck, ShieldCheck, ShoppingCart, UserCog, Warehouse, type LucideIcon } from "lucide-react";
import type { AuthUser } from "./types";

export interface NavItem {
  href: string;
  label: string;
  // Visible when the user has ANY of these permissions. Omitted = visible to anyone who sees the division.
  anyOf?: string[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export type NavTheme = "orange" | "rose" | "purple" | "teal" | "indigo";

export interface NavDivision {
  key: string;
  label: string;
  icon: LucideIcon;
  theme: NavTheme;
  // The division shows up for users with ANY of these permissions (superadmin sees all).
  anyOf: string[];
  // Only superadmins see this division, whatever their permissions say.
  superadminOnly?: boolean;
  groups: NavGroup[];
}

// Links whose pages do not exist yet are left out on purpose (they used to 404):
// ppic: laporan/barang-masuk, barang-keluar, barang-dikembalikan, stok-opname
export const NAV_DIVISIONS: NavDivision[] = [
  {
    // Master data managed from the Super Admin menu; pages live under /dashboard/superadmin.
    key: "superadmin",
    label: "Super Admin",
    icon: ShieldCheck,
    theme: "indigo",
    superadminOnly: true,
    anyOf: [],
    groups: [
      {
        title: "Master",
        items: [
          { href: "/dashboard/superadmin/master/data-barang", label: "Data Barang" },
          { href: "/dashboard/superadmin/master/data-lokasi", label: "Data Lokasi" },
          { href: "/dashboard/superadmin/master/kategori", label: "Kategori" },
          { href: "/dashboard/superadmin/master/satuan", label: "Satuan" },
          { href: "/dashboard/superadmin/master/data-supplier", label: "Data Supplier" },
        ],
      },
    ],
  },
  {
    key: "gudang",
    label: "Gudang",
    icon: Warehouse,
    theme: "orange",
    // report.view is shared with PPIC reports, so it must not open the Gudang division by itself.
    anyOf: ["inbound.view", "outbound.view", "stock-opname.view", "location.view"],
    groups: [
      {
        title: "Master",
        items: [
          { href: "/dashboard/gudang/master/data-barang", label: "Data Barang", anyOf: ["item.view"] },
          { href: "/dashboard/gudang/master/data-lokasi", label: "Data Lokasi", anyOf: ["location.view"] },
        ],
      },
      {
        title: "Transaksi",
        items: [
          { href: "/dashboard/gudang/transaksi/barang-masuk", label: "Barang Masuk", anyOf: ["inbound.view"] },
          { href: "/dashboard/gudang/transaksi/barang-keluar", label: "Barang Keluar", anyOf: ["outbound.view"] },
          { href: "/dashboard/gudang/transaksi/stock-opname", label: "Stock Opname", anyOf: ["stock-opname.view"] },
        ],
      },
      {
        title: "Laporan",
        items: [
          { href: "/dashboard/gudang/laporan/barang-masuk", label: "Rekap Data Barang Masuk", anyOf: ["report.view"] },
          { href: "/dashboard/gudang/laporan/barang-keluar", label: "Rekap Data Barang Keluar", anyOf: ["report.view"] },
          { href: "/dashboard/gudang/laporan/rekap-permintaan", label: "Rekap Permintaan", anyOf: ["report.view"] },
          { href: "/dashboard/gudang/laporan/stock-opname", label: "Rekap Stok Opname", anyOf: ["report.view"] },
          { href: "/dashboard/gudang/laporan/dokubah", label: "Rekap Dokubah", anyOf: ["dokubah.view"] },
        ],
      },
    ],
  },
  {
    key: "gudang-barang-jadi",
    label: "Gudang Barang Jadi",
    icon: PackageCheck,
    theme: "rose",
    // Own routes (re-exporting the Gudang screens) so only one division's link lights up in the sidebar.
    // report.view is shared with PPIC reports, so it must not open the Gudang division by itself.
    anyOf: ["inbound.view", "outbound.view", "stock-opname.view", "location.view"],
    groups: [
      {
        title: "Master",
        items: [
          { href: "/dashboard/gudang-barang-jadi/master/data-barang", label: "Data Barang", anyOf: ["item.view"] },
          { href: "/dashboard/gudang-barang-jadi/master/data-lokasi", label: "Data Lokasi", anyOf: ["location.view"] },
        ],
      },
      {
        title: "Transaksi",
        items: [
          { href: "/dashboard/gudang-barang-jadi/transaksi/barang-masuk", label: "Barang Masuk", anyOf: ["inbound.view"] },
          { href: "/dashboard/gudang-barang-jadi/transaksi/barang-keluar", label: "Barang Keluar", anyOf: ["outbound.view"] },
          { href: "/dashboard/gudang-barang-jadi/transaksi/stock-opname", label: "Stock Opname", anyOf: ["stock-opname.view"] },
        ],
      },
      {
        title: "Laporan",
        items: [
          { href: "/dashboard/gudang-barang-jadi/laporan/barang-masuk", label: "Rekap Data Barang Masuk", anyOf: ["report.view"] },
          { href: "/dashboard/gudang-barang-jadi/laporan/barang-keluar", label: "Rekap Data Barang Keluar", anyOf: ["report.view"] },
          { href: "/dashboard/gudang-barang-jadi/laporan/rekap-permintaan", label: "Rekap Permintaan", anyOf: ["report.view"] },
          { href: "/dashboard/gudang-barang-jadi/laporan/stock-opname", label: "Rekap Stok Opname", anyOf: ["report.view"] },
          { href: "/dashboard/gudang-barang-jadi/laporan/dokubah", label: "Rekap Dokubah", anyOf: ["dokubah.view"] },
        ],
      },
    ],
  },
  {
    key: "ppic",
    label: "PPIC",
    icon: UserCog,
    theme: "purple",
    anyOf: ["material-request.create", "purchase-request.create"],
    groups: [
      {
        title: "Master",
        items: [
          { href: "/dashboard/ppic/master/data-barang", label: "Data Barang", anyOf: ["item.view"] },
          { href: "/dashboard/ppic/master/penawaran-harga", label: "Penawaran Harga", anyOf: ["penawaran-harga.view"] },
        ],  
      },
      {
        title: "Transaksi",
        items: [
          { href: "/dashboard/ppic/transaksi/dokubah", label: "Dokubah", anyOf: ["dokubah.view"] },
          { href: "/dashboard/ppic/transaksi/spk-mutasi-internal", label: "SPK Internal & Mutasi Stok", anyOf: ["spk-internal.view"] },
          { href: "/dashboard/ppic/transaksi/permintaan-pembelian", label: "Permintaan Pembelian", anyOf: ["purchase-request.create"] },
          { href: "/dashboard/ppic/transaksi/approval", label: "Approval", anyOf: ["material-request.create", "purchase-request.create"] },
        ],
      },
      {
        title: "Laporan",
        items: [
          { href: "/dashboard/ppic/laporan/rekap-dokubah", label: "Rekap Dokubah", anyOf: ["dokubah.view"] },
          { href: "/dashboard/ppic/laporan/rekap-mutasi", label: "Rekap Mutasi Barang", anyOf: ["report.view"] },
          { href: "/dashboard/ppic/laporan/rekap-stock", label: "Rekap Stok Opname & Mutasi Stok", anyOf: ["report.view"] },
          { href: "/dashboard/ppic/laporan/rekap-pembelian", label: "Rekap Pembelian", anyOf: ["purchase-request.create"] },
        ],
      },
    ],
  },
  {
    key: "purchasing",
    label: "Purchasing",
    icon: ShoppingCart,
    theme: "teal",
    anyOf: ["item.set-price", "supplier.create", "supplier.update"],
    groups: [
      {
        title: "Master",
        items: [
          { href: "/dashboard/purchasing/master/data-barang", label: "Data Barang", anyOf: ["item.view"] },
          { href: "/dashboard/purchasing/master/data-supplier", label: "Data Supplier", anyOf: ["supplier.view"] },
        ],
      },
      {
        // Placeholder pages for now; items without a dedicated permission use the division's own set.
        title: "Transaksi",
        items: [
          { href: "/dashboard/purchasing/transaksi/buat-po", label: "Buat PO", anyOf: ["purchase-order.create"] },
          { href: "/dashboard/purchasing/transaksi/penawaran-harga", label: "Penawaran Harga / SPH", anyOf: ["item.set-price"] },
          { href: "/dashboard/purchasing/transaksi/retur-supplier", label: "Retur ke Supplier", anyOf: ["item.set-price", "supplier.create", "supplier.update"] },
        ],
      },
      {
        title: "Laporan",
        items: [
          { href: "/dashboard/purchasing/laporan/barang-masuk", label: "Rekap Data Barang Masuk", anyOf: ["item.set-price", "supplier.create", "supplier.update"] },
          { href: "/dashboard/purchasing/laporan/barang-keluar", label: "Rekap Data Barang Keluar", anyOf: ["item.set-price", "supplier.create", "supplier.update"] },
          { href: "/dashboard/purchasing/laporan/stock-opname", label: "Rekap Stock Opname", anyOf: ["item.set-price", "supplier.create", "supplier.update"] },
          { href: "/dashboard/purchasing/laporan/rekap-pembelian", label: "Rekap Pembelian", anyOf: ["purchase-request.approve"] },
        ],
      },
    ],
  },
];

const can = (user: AuthUser, anyOf?: string[]) =>
  user.isSuperadmin || !anyOf || anyOf.some((p) => user.permissions.includes(p));

// Divisions and items the user may see, with empty groups and divisions dropped.
export function visibleNav(user: AuthUser): NavDivision[] {
  return NAV_DIVISIONS.filter((d) => (d.superadminOnly ? user.isSuperadmin : can(user, d.anyOf)))
    .map((d) => ({
      ...d,
      groups: d.groups
        .map((g) => ({ ...g, items: g.items.filter((i) => can(user, i.anyOf)) }))
        .filter((g) => g.items.length > 0),
    }))
    .filter((d) => d.groups.length > 0);
}

// Route guard for /dashboard/*: false means "show the access-denied page".
// Paths that are not part of any division fall through so Next.js can answer 404.
export function canAccess(user: AuthUser, pathname: string): boolean {
  if (user.isSuperadmin) return true;
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/dashboard") return true;
  if (path === "/dashboard/superadmin" || path.startsWith("/dashboard/superadmin/")) return false;

  const division = NAV_DIVISIONS.find((d) => path === `/dashboard/${d.key}` || path.startsWith(`/dashboard/${d.key}/`));
  if (!division) return true;
  if (!can(user, division.anyOf)) return false;

  const item = division.groups
    .flatMap((g) => g.items)
    .find((i) => path === i.href || path.startsWith(`${i.href}/`));
  return item ? can(user, item.anyOf) : true;
}
