"use client";

import React from "react";
import Link from "next/link";
import { ShoppingCart, ClipboardCheck, FileClock, Truck } from "lucide-react";
import StatCard from "@/shared/components/StatCard";
import { apiClient, toQuery } from "@/shared/lib/api-client";
import { useApiData } from "@/shared/lib/use-api-data";
import { useCan } from "@/domains/auth/user-context";
import { listApprovals } from "@/domains/ppic/api";
import { formatRupiah } from "@/domains/ppic/data/dokubah";
import { listPurchaseOrders, listSuppliers } from "@/domains/purchasing/api";

const REKAP = "/dashboard/purchasing/laporan/rekap-pembelian";

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const tanggal = (iso?: string) => {
  const d = iso ? new Date(iso) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : iso || "-";
};

function PendingCard() {
  const { data, error } = useApiData(() => listApprovals({ type: "purchase-request", status: "pending", pageSize: 1 }), "pending");
  return <StatCard label="Menunggu Persetujuan" value={data?.total} error={error} icon={ClipboardCheck} tone="amber" href={REKAP} hint="Permintaan pembelian" />;
}

function BelumPoCard() {
  const { data, error } = useApiData(
    () => listApprovals({ type: "purchase-request", status: "approved", hasPurchaseOrder: false, pageSize: 1 }).then((r) => r.total),
    "belum-po",
  );
  return <StatCard label="Disetujui, Belum Dibuat PO" value={data} error={error} icon={FileClock} tone="orange" href={REKAP} hint="Siap dibuatkan PO" />;
}

function PoBulanIniCard() {
  const { data, error } = useApiData(() => {
    const now = new Date();
    return listPurchaseOrders({ pageSize: 1, startDate: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: isoDate(now) });
  }, "po-bulan-ini");
  return <StatCard label="PO Bulan Ini" value={data?.total} error={error} icon={ShoppingCart} tone="teal" hint="Purchase order dibuat bulan ini" />;
}

function SupplierCard() {
  const { data, error } = useApiData(() => listSuppliers({ pageSize: 1 }), "suppliers");
  return <StatCard label="Total Supplier" value={data?.total} error={error} icon={Truck} tone="blue" href="/dashboard/purchasing/master/data-supplier" />;
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
      <h2 className="text-lg font-bold text-gray-800">{title}</h2>
    </div>
    <div className="p-6 overflow-x-auto">{children}</div>
  </div>
);

const Status = ({ loading, error, empty, text }: { loading: boolean; error: string; empty: boolean; text: string }) =>
  loading ? <p className="text-sm text-gray-500">Memuat...</p>
  : error ? <p role="alert" className="text-sm text-red-600">{error}</p>
  : empty ? <p className="text-sm text-gray-500">{text}</p>
  : null;

const th = "px-4 py-3";

function PoTerbaru() {
  const { data, loading, error } = useApiData(() => listPurchaseOrders({ pageSize: 5 }), "po-terbaru");
  const rows = data?.rows ?? [];
  return (
    <Section title="PO Terbaru">
      <Status loading={loading} error={error} empty={!rows.length} text="Belum ada purchase order." />
      {rows.length > 0 && (
        <table className="w-full text-left text-sm text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr><th className={th}>Nomor PO</th><th className={th}>Tanggal</th><th className={th}>Supplier</th><th className={`${th} text-right`}>Grand Total</th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-900">{p.nomorPo}</td>
                <td className="px-4 py-3">{tanggal(p.tanggalPo)}</td>
                <td className="px-4 py-3 text-gray-800">{p.supplierName}</td>
                <td className="px-4 py-3 text-right">{formatRupiah(p.grandTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}

function PerluTindakan() {
  const { data, loading, error } = useApiData(() => listApprovals({ type: "purchase-request", status: "pending", pageSize: 5 }), "perlu-tindakan");
  const rows = data?.rows ?? [];
  return (
    <Section title="Perlu Tindakan">
      <Status loading={loading} error={error} empty={!rows.length} text="Tidak ada permintaan pembelian yang menunggu." />
      {rows.length > 0 && (
        <table className="w-full text-left text-sm text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr><th className={th}>Tanggal</th><th className={th}>Bagian</th><th className={`${th} text-right`}>Aksi</th></tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-b border-gray-50">
                <td className="px-4 py-3">{tanggal(a.payload?.tanggalPengajuan ?? a.createdAt)}</td>
                <td className="px-4 py-3 text-gray-800">{a.payload?.bagian ?? "-"}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`${REKAP}/permintaan-pembelian/${a.id}`} className="text-teal-600 font-medium hover:underline">Tinjau</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}

export default function PurchasingDashboard() {
  const canApprove = useCan("purchase-request.approve");
  const canPo = useCan("purchase-order.view");
  const canSupplier = useCan("supplier.view");

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Dashboard Purchasing</h1>
        <p className="text-gray-500">Pantau permintaan pembelian, purchase order, dan supplier.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {canApprove && <PendingCard />}
        {canApprove && <BelumPoCard />}
        {canPo && <PoBulanIniCard />}
        {canSupplier && <SupplierCard />}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {canPo && <PoTerbaru />}
        {canApprove && <PerluTindakan />}
      </div>
    </div>
  );
}
