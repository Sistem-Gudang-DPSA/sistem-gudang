"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Download, Eye, Search } from 'lucide-react';
import { listItems } from '@/domains/inventory/api';
import type { ItemListRow } from '@/domains/inventory/types';
import { kartuStokPath } from '@/domains/inventory/components/KartuStok';
import { exportDaftarExcel, printDaftarPdf } from '@/shared/components/ExportStok';
import Pagination from '@/shared/components/Pagination';
import { useApiData } from '@/shared/lib/use-api-data';
import { useDebouncedValue } from '@/shared/lib/use-debounced-value';
import { ExportExcellButton } from '@/shared/components/Tombol';

const PAGE_SIZE = 20;
const checkboxClass = 'w-4 h-4 accent-[#FF8A00] cursor-pointer disabled:cursor-not-allowed';

export default function KartuStok() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery);
  const [selected, setSelected] = useState<Map<number, ItemListRow>>(new Map());

  const filterKey = JSON.stringify([debouncedSearch]);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ key: filterKey, page: next });

  const { data: loaded, loading, error } = useApiData(
    () => listItems({ page, pageSize: PAGE_SIZE, search: debouncedSearch || undefined }),
    `${filterKey}|${page}`,
    "Gagal memuat data barang.",
  );
  const rows = loaded?.rows ?? [];
  const total = loaded?.total ?? 0;

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const rowsToExport = selected.size > 0 ? [...selected.values()] : rows;

  const toggleOne = (item: ItemListRow) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.set(item.id, item);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Map(prev);
      rows.forEach((r) => (allChecked ? next.delete(r.id) : next.set(r.id, r)));
      return next;
    });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">Kartu Stok</h1>
        <p className="text-gray-500 text-sm">Riwayat masuk dan keluar tiap barang, terisi otomatis dari transaksi.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              maxLength={100}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all"
              placeholder="Cari kode atau nama barang..."
            />
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <button type="button" onClick={() => setSelected(new Map())} className="text-xs text-orange-600 font-bold hover:underline">
                {selected.size} dicentang · Reset
              </button>
            )}
            <ExportExcellButton onClick={() => exportDaftarExcel(rowsToExport)} />
            <button
              type="button"
              onClick={() => printDaftarPdf(rowsToExport)}
              disabled={rowsToExport.length === 0}
              title="Print Data ke PDF"
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Print PDF</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th scope="col" className="px-6 py-4 w-16">No</th>
                <th scope="col" className="px-6 py-4">Kode Barang</th>
                <th scope="col" className="px-6 py-4">Kode Bawaan</th>
                <th scope="col" className="px-6 py-4">Nama Barang</th>
                <th scope="col" className="px-6 py-4 text-right">Stok Saat Ini</th>
                <th scope="col" className="px-6 py-4 text-center">Aksi</th>
                <th scope="col" className="px-6 py-4 text-center">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <span>Check</span>
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} disabled={rows.length === 0} aria-label="Centang semua" className={checkboxClass} />
                  </label>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">Memuat data...</td></tr>}
              {!loading && error && <tr><td colSpan={7} className="px-6 py-10 text-center text-red-500">{error}</td></tr>}
              {!loading && !error && rows.map((item, index) => (
                <tr key={item.id} className={`transition-colors ${selected.has(item.id) ? 'bg-orange-50/60' : 'hover:bg-[#FF8A00]/5'}`}>
                  <td className="px-6 py-4 text-gray-500">{(page - 1) * PAGE_SIZE + index + 1}</td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-700">{item.code ?? '-'}</td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">{item.externalCode ?? '-'}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-right font-bold text-gray-800">
                    {item.stock.toLocaleString('id-ID')} <span className="text-xs font-normal text-gray-500">{item.unit}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Link
                      href={kartuStokPath(item.id)}
                      className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded border border-blue-200 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Detail
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleOne(item)} aria-label={`Centang ${item.name}`} className={checkboxClass} />
                  </td>
                </tr>
              ))}
              {!loading && !error && rows.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400 italic">Barang tidak ditemukan.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}