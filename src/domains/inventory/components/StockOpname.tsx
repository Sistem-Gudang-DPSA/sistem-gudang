"use client";

import { useCan } from '@/domains/auth/user-context';
import React, { useState } from 'react';
import { Search, Calendar, Plus, Eye } from 'lucide-react';
import Link from 'next/link';
import { getStockOpname, listStockOpname } from '@/domains/inventory/api';
import type { StockOpnameDetail } from '@/domains/inventory/types';
import { ApiError } from '@/shared/lib/api-client';
import { useApiData } from '@/shared/lib/use-api-data';
import Pagination from '@/shared/components/Pagination';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const periodeLabel = (month: number, year: number) => `Stok Opname ${BULAN[month - 1]} ${year}`;
const rupiah = (n: number) => n.toLocaleString('id-ID');

export default function StockOpnameMasterGudang() {
  const canCreate = useCan('stock-opname.create');
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const [detail, setDetail] = useState<StockOpnameDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const filterKey = JSON.stringify([searchQuery, filterMonth, filterYear]);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ key: filterKey, page: next });
  const { data: result, loading, error } = useApiData(
    () => listStockOpname({ page, pageSize: 20, search: searchQuery || undefined, month: filterMonth ? Number(filterMonth) : undefined, year: filterYear ? Number(filterYear) : undefined }),
    `${filterKey}|${page}`,
    'Gagal memuat data stok opname.',
  );
  const rows = result?.rows ?? [];
  const total = result?.total ?? 0;

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    setDetailError("");
    try {
      setDetail(await getStockOpname(id));
    } catch (err) {
      setDetailError(err instanceof ApiError ? err.message : "Gagal memuat detail stok opname.");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col justify-start mb-8 gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">DATA STOK OPNAME</h1>
        <p className="text-gray-500 text-sm">Kelola riwayat pemeriksaan berkala stok inventaris gudang.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="relative w-full max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input 
                type="text" 
                value={searchQuery}
                maxLength={100}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all shadow-sm"
                placeholder="Cari periode stok opname..." 
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="appearance-none w-27.5 border border-gray-200 rounded-xl py-2.5 pl-3 pr-8 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-orange-500 text-sm text-gray-700 bg-white transition-all duration-200 cursor-pointer"
                >
                  <option value="">Bulan</option>
                  {[
                    { v: '01', l: 'Januari' }, { v: '02', l: 'Februari' }, { v: '03', l: 'Maret' },
                    { v: '04', l: 'April' }, { v: '05', l: 'Mei' }, { v: '06', l: 'Juni' },
                    { v: '07', l: 'Juli' }, { v: '08', l: 'Agustus' }, { v: '09', l: 'September' },
                    { v: '10', l: 'Oktober' }, { v: '11', l: 'November' }, { v: '12', l: 'Desember' }
                  ].map(m => (
                    <option key={m.v} value={m.v}>{m.l}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="relative">
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="appearance-none w-22.5 border border-gray-200 rounded-xl py-2.5 pl-3 pr-8 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-orange-500 text-sm text-gray-700 bg-white transition-all duration-200 cursor-pointer"
                >
                  <option value="">Tahun</option>
                  {["2024", "2025", "2026"].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              {(filterMonth || filterYear) && (
                <button 
                  onClick={() => { setFilterMonth(""); setFilterYear(""); }}
                  className="text-xs text-orange-600 font-bold hover:underline ml-1"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {canCreate && <Link href="/dashboard/gudang/transaksi/stock-opname/tambah" className="w-full lg:w-auto">
            <button className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm shrink-0 w-full">
              <Plus className="w-4 h-4" />
              <span>Tambah Data</span>
            </button>
          </Link>}
        </div>

        {detailError && <p className="px-6 pt-3 text-sm text-red-500">{detailError}</p>}

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th scope="col" className="px-6 py-4 w-16 text-center">No</th>
                <th scope="col" className="px-6 py-4">Periode Stock Opname</th>
                <th scope="col" className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={3} className="px-6 py-10 text-center text-gray-400">Memuat data...</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={3} className="px-6 py-10 text-center text-red-500">{error}</td></tr>
              )}
              {!loading && !error && rows.map((item, index) => (
                <tr key={item.id} className="hover:bg-[#FF8A00]/5 transition-colors group">
                  <td className="px-6 py-4 text-gray-500 text-center">{index + 1}.</td>
                  <td className="px-6 py-4 font-bold text-gray-900">
                    {periodeLabel(item.month, item.year)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button className="px-4 py-1.5 bg-[#FF8A00]/10 text-[#FF8A00] font-bold rounded-lg text-xs hover:bg-[#FF8A00]/20 transition-all">
                        Edit
                      </button>
                      <button className="px-4 py-1.5 bg-blue-50 text-blue-600 font-bold rounded-lg text-xs hover:bg-blue-100 transition-all">
                        Download
                      </button>
                      <button
                        onClick={() => openDetail(item.id)}
                        disabled={detailLoading}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-50 text-blue-600 font-bold rounded-lg text-xs hover:bg-blue-100 transition-all disabled:opacity-60"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Detail
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-gray-400 italic">
                    Data tidak ditemukan untuk filter tersebut.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
      </div>
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[900px] max-h-[90vh] overflow-y-auto p-8 relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[20px] font-extrabold text-gray-900 uppercase">{periodeLabel(detail.month, detail.year)}</h2>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2">✕</button>
            </div>
            {detail.notes && <p className="text-sm text-gray-600 mb-4">{detail.notes}</p>}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Barang</th>
                    <th className="px-4 py-3">Satuan</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3 text-center">Sistem</th>
                    <th className="px-4 py-3 text-center">Fisik</th>
                    <th className="px-4 py-3 text-center">Selisih</th>
                    <th className="px-4 py-3 text-right">Harga</th>
                    <th className="px-4 py-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detail.lines.map((line) => (
                    <tr key={line.itemId}>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{line.itemName}</span>
                        <span className="block text-xs font-mono text-gray-500">{line.itemCode ?? '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{line.unit}</td>
                      <td className="px-4 py-3 text-gray-600">{line.category}</td>
                      <td className="px-4 py-3 text-center">{line.systemQty}</td>
                      <td className="px-4 py-3 text-center font-bold">{line.physicalQty}</td>
                      <td className={`px-4 py-3 text-center font-bold ${line.difference < 0 ? 'text-red-600' : line.difference > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                        {line.difference > 0 ? `+${line.difference}` : line.difference}
                      </td>
                      <td className="px-4 py-3 text-right">{rupiah(line.physicalPrice)}</td>
                      <td className="px-4 py-3 text-gray-600">{line.note ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 text-right">
              <button onClick={() => setDetail(null)} className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
