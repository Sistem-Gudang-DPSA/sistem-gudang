"use client";

import React from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ClipboardList, Layers } from "lucide-react";
import StatCard from "@/shared/components/StatCard";
import { useApiData } from "@/shared/lib/use-api-data";
import { useCan } from "@/domains/auth/user-context";
import { listItems } from "@/domains/inventory/api";
import { getInboundReport, getOutboundReport, getRequestsReport } from "../api";
import { displayDate, todayIso } from "../date";

const fmt = (n: number) => n.toLocaleString("id-ID");

function TotalBarang() {
  const { data, error } = useApiData(() => listItems({ page: 1, pageSize: 1 }), "dash-items");
  return <StatCard label="Total Barang" value={data && fmt(data.summary?.totalJenis ?? data.total)} hint={data?.summary ? `${fmt(data.summary.totalStock)} unit stok` : undefined} error={error} icon={Layers} tone="orange" href="/dashboard/gudang/master/data-barang" />;
}

function BarangMasukHariIni() {
  const today = todayIso();
  const { data, error } = useApiData(() => getInboundReport({ startDate: today, endDate: today, page: 1, pageSize: 1 }), `dash-in-${today}`);
  return <StatCard label="Barang Masuk Hari Ini" value={data && fmt(data.total)} error={error} icon={ArrowDownRight} tone="blue" href="/dashboard/gudang/laporan/barang-masuk" />;
}

function BarangKeluarHariIni() {
  const today = todayIso();
  const { data, error } = useApiData(() => getOutboundReport({ startDate: today, endDate: today, page: 1, pageSize: 1 }), `dash-out-${today}`);
  return <StatCard label="Barang Keluar Hari Ini" value={data && fmt(data.total)} error={error} icon={ArrowUpRight} tone="green" href="/dashboard/gudang/laporan/barang-keluar" />;
}

function PermintaanMenunggu() {
  const { data, error } = useApiData(() => getRequestsReport({ status: "PENDING", page: 1, pageSize: 1 }), "dash-req");
  return <StatCard label="Permintaan Material Menunggu" value={data && fmt(data.total)} error={error} icon={ClipboardList} tone="amber" href="/dashboard/gudang/laporan/rekap-permintaan" />;
}

interface Movement {
  key: string;
  date: string;
  createdAt: string;
  jenis: "Masuk" | "Keluar";
  barang: string;
  qty: number;
  ref: string;
}

async function loadMovements(): Promise<Movement[]> {
  const [inb, out] = await Promise.all([getInboundReport({ page: 1, pageSize: 5 }), getOutboundReport({ page: 1, pageSize: 5 })]);
  const rows: Movement[] = [
    ...inb.rows.map((r) => ({ key: `in-${r.id}`, date: r.date, createdAt: r.createdAt, jenis: "Masuk" as const, barang: r.itemName, qty: r.qtyArrived, ref: r.referenceNo ?? "-" })),
    ...out.rows.map((r) => ({ key: `out-${r.id}`, date: r.date, createdAt: r.createdAt, jenis: "Keluar" as const, barang: r.itemName, qty: r.lines.reduce((s, l) => s + l.qty, 0), ref: r.spk || "-" })),
  ];
  return rows.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

function PergerakanTerakhir({ canIn, canOut }: { canIn: boolean; canOut: boolean }) {
  const { data, loading, error } = useApiData(loadMovements, "dash-movements");
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <h2 className="text-lg font-bold text-gray-800">Pergerakan Terakhir</h2>
        <div className="flex gap-4 text-sm font-semibold">
          {canIn && <Link href="/dashboard/gudang/laporan/barang-masuk" className="text-orange-600 hover:text-orange-800">Lihat semua masuk</Link>}
          {canOut && <Link href="/dashboard/gudang/laporan/barang-keluar" className="text-orange-600 hover:text-orange-800">Lihat semua keluar</Link>}
        </div>
      </div>
      <div className="p-6 overflow-x-auto">
        {error ? (
          <p role="alert" className="text-sm text-red-600">{error}</p>
        ) : loading ? (
          <p className="text-sm text-gray-500">Memuat...</p>
        ) : !data?.length ? (
          <p className="text-sm text-gray-500">Belum ada pergerakan barang.</p>
        ) : (
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Jenis</th>
                <th className="px-4 py-3">Barang</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Referensi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m) => (
                <tr key={m.key} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">{displayDate(m.date)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${m.jenis === "Masuk" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}>{m.jenis}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{m.barang}</td>
                  <td className="px-4 py-3">{fmt(m.qty)}</td>
                  <td className="px-4 py-3">{m.ref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function GudangDashboard() {
  const canItems = useCan("item.view");
  const canReport = useCan("report.view");
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Dashboard Gudang</h1>
        <p className="text-gray-500">Ringkasan stok, barang masuk dan keluar, serta permintaan material hari ini.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {canItems && <TotalBarang />}
        {canReport && <BarangMasukHariIni />}
        {canReport && <BarangKeluarHariIni />}
        {canReport && <PermintaanMenunggu />}
      </div>
      {canReport && <PergerakanTerakhir canIn canOut />}
    </div>
  );
}
