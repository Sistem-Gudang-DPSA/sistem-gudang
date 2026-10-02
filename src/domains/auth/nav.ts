import { Package, ShoppingCart, UserCog, type LucideIcon } from "lucide-react";
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

export type NavTheme = "orange" | "purple" | "teal";

export interface NavDivision {
  key: string;
  label: string;
  icon: LucideIcon;
  theme: NavTheme;
  // The division shows up for users with ANY of these permissions (superadmin sees all).
  anyOf: string[];
  groups: NavGroup[];
}

// Links whose pages do not exist yet are left out on purpose (they used to 404):
// ppic: laporan/barang-masuk, barang-keluar, barang-dikembalikan, stok-opname
// purchasing: laporan/barang-masuk, barang-keluar, stok-opname
export const NAV_DIVISIONS: NavDivision[] = [
  {
    key: "gudang",
    label: "Gudang",
    icon: Package,
    theme: "orange",
    anyOf: ["inbound.view", "outbound.view", "stock-opname.view", "report.view", "location.view"],
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
          { href: "/dashboard/ppic/master/penawaran-harga", label: "Penawaran Harga" },
        ],
      },
      {
        title: "Transaksi",
        items: [
          { href: "/dashboard/ppic/transaksi/dokubah", label: "Dokubah", anyOf: ["dokubah.view"] },
          { href: "/dashboard/ppic/transaksi/spk-mutasi-internal", label: "SPK Internal & Mutasi Stok", anyOf: ["spk-internal.view"] },
          { href: "/dashboard/ppic/transaksi/permintaan-pembelian", label: "Permintaan Pembelian", anyOf: ["purchase-request.create"] },
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
        title: "Laporan",
        items: [
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
  return NAV_DIVISIONS.filter((d) => can(user, d.anyOf))
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
