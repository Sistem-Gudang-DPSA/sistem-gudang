"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, ChevronDown } from 'lucide-react';
import { alokasiBarangPath, type StatusBarang } from '@/domains/ppic/data/spk-internal';
import { listSpkInternal } from '@/domains/ppic/api';
import { useApiData } from '@/shared/lib/use-api-data';

const cellClass = 'px-4 py-3 border-b border-r border-gray-300';
const cardClass = 'bg-white rounded-sm border border-gray-100 shadow-md p-6 min-h-32';
const actionButtonClass = 'px-3 py-1 text-xs font-semibold rounded-lg border transition-colors';

const statusButtonClass: Record<StatusBarang, string> = {
  LOCKED: 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100',
  BUFFER: 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100',
};

export default function SpkInternalMutasiStokPPIC() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | StatusBarang>('');

  const filters = { search: searchQuery || undefined, status: filterStatus || undefined };
  // ponytail: loads first 100 rows only, add real pagination when the list outgrows it
  const { data: result, loading, error } = useApiData(
    () => listSpkInternal({ ...filters, pageSize: 100 }),
    JSON.stringify(filters),
    'Gagal memuat SPK Internal.',
  );
  const rows = result?.rows ?? [];
  const sum = (items: typeof rows, pick: (r: (typeof rows)[number]) => number) => items.reduce((acc, r) => acc + pick(r), 0);
  const buffer = rows.filter((r) => r.status === 'BUFFER');
  const locked = rows.filter((r) => r.status === 'LOCKED');

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-[18px] font-extrabold text-black tracking-wide">SPK Internal & Mutasi Stok</h1>
      </div>

      {/* Ringkasan stok */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div className={cardClass}>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Total Item Buffer Stock</h2>
          <p className="text-base font-bold text-gray-900">{sum(buffer, (r) => r.totalStock)} pcs</p>
        </div>
        <div className={cardClass}>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Stock Unallocated</h2>
          <p className="text-base font-bold text-gray-900">{sum(rows, (r) => r.totalBisaPakai)} pcs (Siap Pakai)</p>
        </div>
        <div className={cardClass}>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Dialokasikan ke SPK Klien</h2>
          <p className="text-base font-bold text-gray-900">{sum(locked, (r) => r.totalStock)} pcs (Locked)</p>
        </div>
      </div>

      {/* Pencarian & filter */}
      <h2 className="text-base font-bold text-gray-900 mb-3">Cari Kode Barang</h2>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex flex-wrap items-center gap-8 flex-1">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Cari"
              aria-label="Cari kode barang"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-800" />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="status-barang" className="text-sm font-medium text-gray-800">Status :</label>
            <div className="relative w-56">
              <select
                id="status-barang"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as '' | StatusBarang)}
                className="w-full appearance-none pl-3 pr-9 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
              >
                <option value="">Status Barang</option>
                <option value="BUFFER">BUFFER</option>
                <option value="LOCKED">LOCKED</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>

        <button
          type="button"
          className="px-5 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm"
        >
          Buat SPK Internal
        </button>
      </div>

      {/* Tabel barang */}
      <h2 className="text-base font-bold text-gray-900 mb-4">Tabel Barang</h2>
      <div className="overflow-x-auto border-t border-l border-gray-300 rounded-sm">
        <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
          <thead className="bg-gray-100 text-gray-800 font-semibold text-xs">
            <tr>
              <th scope="col" className={`${cellClass} w-14`}>No.</th>
              <th scope="col" className={cellClass}>No. SPK Internal</th>
              <th scope="col" className={cellClass}>SKU & Nama Barang</th>
              <th scope="col" className={cellClass}>Periode Pembuatan</th>
              <th scope="col" className={cellClass}>Total Stock</th>
              <th scope="col" className={cellClass}>Total Stock Bisa Pakai</th>
              <th scope="col" className={cellClass}>Action</th>
            </tr>
          </thead>
          <tbody className="text-gray-600">
            {rows.map((item, index) => (
              <tr key={item.id}>
                <td className={cellClass}>{index + 1}</td>
                <td className={`${cellClass} font-semibold text-gray-900`}>{item.noSpk}</td>
                <td className={cellClass}>{item.sku} - {item.namaBarang}</td>
                <td className={cellClass}>{item.periode}</td>
                <td className={cellClass}>{item.totalStock} pcs</td>
                <td className={cellClass}>{item.totalBisaPakai} pcs</td>
                <td className={cellClass}>
                  <div className="flex items-center gap-2">
                    <button type="button" className={`${actionButtonClass} ${statusButtonClass[item.status]}`}>
                      {item.status}
                    </button>
                    <span className="text-gray-400">/</span>
                    <Link
                      href={alokasiBarangPath(item.id)}
                      className={`${actionButtonClass} border-[#FF8A00] bg-[#FF8A00] text-white hover:bg-orange-600`}
                    >
                      DETAIL
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className={`${cellClass} py-10 text-center text-gray-400 italic`}>
                  {loading ? 'Memuat data...' : error || 'Data tidak ditemukan.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}