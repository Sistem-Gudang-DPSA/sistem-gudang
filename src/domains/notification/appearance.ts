import { Bell, ClipboardCheck, MessageSquareWarning, Package, PackageCheck } from "lucide-react";
import type { Notification } from "./types";

const divisions: Record<string, { label: string; className: string }> = {
  inventory: { label: "Gudang", className: "bg-orange-50 text-orange-700" },
  gudang: { label: "Gudang", className: "bg-orange-50 text-orange-700" },
  "gudang-barang-jadi": { label: "Gudang Barang Jadi", className: "bg-rose-50 text-rose-700" },
  ppic: { label: "PPIC", className: "bg-purple-50 text-purple-700" },
  purchasing: { label: "Purchasing", className: "bg-teal-50 text-teal-700" },
  keuangan: { label: "Keuangan", className: "bg-emerald-50 text-emerald-700" },
  produksi: { label: "Produksi", className: "bg-blue-50 text-blue-700" },
  superadmin: { label: "Superadmin", className: "bg-indigo-50 text-indigo-700" },
};

export function notificationAppearance(notification: Notification) {
  const source = divisions[notification.sourceDomain ?? (notification.type === "LOW_STOCK" ? "inventory" : "")];
  const type = notification.type;
  if (type === "LOW_STOCK") return { source, label: "Stok", Icon: Package, className: "bg-amber-50 text-amber-700" };
  if (type.startsWith("BUG_REPORT")) return { source, label: "Laporan Masalah", Icon: MessageSquareWarning, className: "bg-rose-50 text-rose-700" };
  if (type.includes("APPROVAL") || type.startsWith("PURCHASE_REQUEST")) return { source, label: "Persetujuan", Icon: ClipboardCheck, className: "bg-teal-50 text-teal-700" };
  if (type.startsWith("OUTBOUND")) return { source, label: "Barang Keluar", Icon: PackageCheck, className: "bg-sky-50 text-sky-700" };
  return { source, label: "Informasi", Icon: Bell, className: "bg-indigo-50 text-indigo-700" };
}
