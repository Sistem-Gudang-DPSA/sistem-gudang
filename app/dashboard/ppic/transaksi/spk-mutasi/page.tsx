"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { dataSpkInternal, STATUS_BARANG, type StatusBarang } from './data';

const MIN_ROWS = 4;

const pill = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-colors";
const STATUS_COLOR: Record<StatusBarang, string> = {
  LOCKED: "bg-green-100 text-green-700 border-green-200/50",
  BUFFER: "bg-red-100 text-red-700 border-red-200/50 hover:bg-red-200",
};

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white shadow-md px-6 py-6 h-36">
      <h2 className="text-lg font-semibold text-black mb-4">{title}</h2>
      <p className="font-semibold text-black">{value}</p>
    </div>
  );
}

export default function SpkMutasiPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const keyword = searchQuery.trim().toLowerCase();
  const filteredData = dataSpkInternal.filter((item) =>
    (!filterStatus || item.status === filterStatus) &&
    (!keyword || item.sku.toLowerCase().includes(keyword) || item.namaBarang.toLowerCase().includes(keyword))
  );

  const emptyRowCount = Math.max(MIN_ROWS - filteredData.length, 0);

  const totalStock = dataSpkInternal.reduce((sum, item) => sum + item.totalStock, 0);
  const stockBisaPakai = dataSpkInternal.reduce((sum, item) => sum + item.stockBisaPakai, 0);
  const stockDialokasikan = totalStock - stockBisaPakai;

  return (
    <div className="flex flex-col bg-white min-h-screen p-6">
      <h1 className="text-lg font-extrabold text-black tracking-wide mb-6">SPK Internal &amp; Mutasi Stok</h1>

      {/* Ringkasan Stok */}
      <div className="grid grid-cols-3 gap-20 mb-6">
        <SummaryCard title="Total Item Buffer Stock" value={`${totalStock} pcs`} />
        <SummaryCard title="Stock Unallocated" value={`${stockBisaPakai} pcs (Siap Pakai)`} />
        <SummaryCard title="Dialokasikan ke SPK Klien" value={`${stockDialokasikan} pcs (Locked)`} />
      </div>

      {/* Pencarian */}
      <h2 className="text-base font-semibold text-black mb-2">Cari Kode Barang</h2>
      <div className="flex items-center gap-12 mb-6">
        <div className="flex items-center gap-2 w-full max-w-md border border-gray-300 rounded-lg px-3 focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:border-orange-500">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari"
            className="flex-1 min-w-0 py-2 bg-transparent focus:outline-none text-sm text-gray-700 placeholder-gray-400"
          />
          <Search className="h-4 w-4 shrink-0 text-gray-700" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-800">Status :</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`w-64 border border-gray-300 rounded-lg py-2 px-3 text-sm bg-white focus:outline-none focus:border-orange-500 ${filterStatus ? "text-gray-800" : "text-gray-400"}`}
          >
            <option value="">Status Barang</option>
            {STATUS_BARANG.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        <Link
          href="/dashboard/ppic/transaksi/spk-mutasi/spk-internal"
          className="px-4 py-2 bg-[#ff8a00] text-white text-sm font-medium rounded-lg hover:bg-[#eb7d00] transition-colors whitespace-nowrap"
        >
          Buat SPK Internal
        </Link>
      </div>

      {/* Tabel Barang */}
      <h2 className="text-base font-semibold text-black mb-4">Tabel Barang</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse border border-gray-300 [&_th]:border [&_td]:border [&_th]:border-gray-300 [&_td]:border-gray-300">
          <thead className="bg-gray-100 text-gray-800 font-semibold text-center">
            <tr>
              <th className="px-3 py-2 w-12">No.</th>
              <th className="px-3 py-2">No. SPK Internal</th>
              <th className="px-3 py-2">SKU &amp; Nama Barang</th>
              <th className="px-3 py-2">Periode Pembuatan</th>
              <th className="px-3 py-2">Total Stock</th>
              <th className="px-3 py-2">Total Stock Bisa Pakai</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {filteredData.map((item, index) => (
              <tr key={item.id} className="h-8 hover:bg-orange-50/30">
                <td className="px-3 text-center">{index + 1}</td>
                <td className="px-3">{item.noSpk}</td>
                <td className="px-3">{item.sku} - {item.namaBarang}</td>
                <td className="px-3">{item.periode}</td>
                <td className="px-3">{item.totalStock} pcs</td>
                <td className="px-3">{item.stockBisaPakai} pcs</td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    {/* Hanya BUFFER yang bisa dialokasikan; LOCKED sudah terkait ke SPK klien */}
                    {item.status === "BUFFER" ? (
                      <Link href={`/dashboard/ppic/transaksi/spk-mutasi/alokasi-barang?id=${item.id}`} className={`${pill} ${STATUS_COLOR.BUFFER}`}>
                        BUFFER
                      </Link>
                    ) : (
                      <span className={`${pill} ${STATUS_COLOR.LOCKED}`}>LOCKED</span>
                    )}
                    <button className={`${pill} bg-slate-100 text-slate-700 border-slate-200/50 hover:bg-slate-200`}>DETAIL</button>
                  </div>
                </td>
              </tr>
            ))}
            {Array.from({ length: emptyRowCount }, (_, i) => (
              <tr key={`empty-${i}`} className="h-8">
                {Array.from({ length: 7 }, (_, j) => <td key={j} />)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
