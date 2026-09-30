"use client";

import React, { useState } from 'react';
import { Search, Plus, Calendar, Eye } from 'lucide-react';
import Link from 'next/link';
import { listApprovals } from '@/domains/gudang/api';
import { displayDate, toDateRange } from '@/domains/gudang/date';
import type { ApprovalRequest, ApprovalStatus } from '@/domains/gudang/types';
import { useApiData } from '@/shared/lib/use-api-data';

const STATUS_LABEL: Record<ApprovalStatus, { label: string; cls: string }> = {
  pending: { label: 'Menunggu', cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  approved: { label: 'Disetujui', cls: 'bg-green-100 text-green-800 border-green-200' },
  rejected: { label: 'Ditolak', cls: 'bg-red-100 text-red-800 border-red-200' },
  revision_requested: { label: 'Perlu Revisi', cls: 'bg-orange-100 text-orange-800 border-orange-200' },
};

const summarize = (req: ApprovalRequest) => {
  const p = req.payload;
  if (!p) return '-';
  const names = p.items.map((it) => it.namaBarang).join(', ');
  return `${p.bagian} - ${p.items.length} barang (${names})`;
};

export default function PermintaanPembelianGudang() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const [detail, setDetail] = useState<ApprovalRequest | null>(null);

  const dateRange = toDateRange(filterDay, filterMonth, filterYear);

  // ponytail: loads first 100 rows only, add real pagination when the list outgrows it
  const { data: result, loading, error } = useApiData(
    () => listApprovals({ pageSize: 100, type: 'purchase-request', ...dateRange }),
    JSON.stringify(dateRange),
    'Gagal memuat permintaan pembelian.',
  );
  const rows = result?.rows ?? [];
  const total = result?.total ?? 0;

  // ponytail: the approvals API has no working text search yet, so filter the loaded rows here
  const filteredData = rows.filter((req) => summarize(req).toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col justify-start mb-8 gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">PERMINTAAN PEMBELIAN</h1>
        <p className="text-gray-500 text-sm">Kelola pengajuan permintaan pembelian barang dari gudang.</p>
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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all shadow-sm"
                placeholder="Cari bagian atau nama barang..." 
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={filterDay}
                  onChange={(e) => setFilterDay(e.target.value)}
                  className="appearance-none w-[70px] border border-gray-200 rounded-xl py-2.5 pl-3 pr-8 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-orange-500 text-sm text-gray-700 bg-white transition-all duration-200 cursor-pointer"
                >
                  <option value="">Tgl</option>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{(i + 1).toString().padStart(2, '0')}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="relative">
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="appearance-none w-[110px] border border-gray-200 rounded-xl py-2.5 pl-3 pr-8 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-orange-500 text-sm text-gray-700 bg-white transition-all duration-200 cursor-pointer"
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
                  className="appearance-none w-[90px] border border-gray-200 rounded-xl py-2.5 pl-3 pr-8 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-orange-500 text-sm text-gray-700 bg-white transition-all duration-200 cursor-pointer"
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

              {(filterDay || filterMonth || filterYear) && (
                <button 
                  onClick={() => { setFilterDay(""); setFilterMonth(""); setFilterYear(""); }}
                  className="text-xs text-orange-600 font-bold hover:underline ml-1"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <Link href="/dashboard/gudang/transaksi/permintaan-pembelian/tambah" className="w-full lg:w-auto">
            <button className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm shrink-0 w-full">
              <Plus className="w-4 h-4" />
              <span>Tambah Data</span>
            </button>
          </Link>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th scope="col" className="px-6 py-4 w-16 text-center">No</th>
                <th scope="col" className="px-6 py-4">Tanggal</th>
                <th scope="col" className="px-6 py-4 text-center">Rincian Permintaan</th>
                <th scope="col" className="px-6 py-4 text-center">Status</th>
                <th scope="col" className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">Memuat data...</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-red-500">{error}</td></tr>
              )}
              {!loading && !error && filteredData.map((item, index) => (
                <tr key={item.id} className="hover:bg-[#FF8A00]/5 transition-colors group">
                  <td className="px-6 py-4 text-gray-500 text-center font-medium">{index + 1}.</td>
                  <td className="px-6 py-4 text-gray-500 font-bold">{displayDate(item.payload?.tanggalPengajuan ?? item.createdAt)}</td>
                  <td className="px-6 py-4 text-gray-700 italic max-w-md truncate">{summarize(item)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_LABEL[item.status].cls}`}>
                      {STATUS_LABEL[item.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setDetail(item)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-50 text-blue-600 font-bold rounded-lg text-xs hover:bg-blue-100 transition-all"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && !error && filteredData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic">
                    Data tidak ditemukan untuk filter tersebut.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 text-sm text-gray-500">
          Menampilkan <span className="font-semibold text-gray-900">{filteredData.length}</span> dari <span className="font-semibold text-gray-900">{total}</span> data
        </div>
      </div>
      {detail && detail.payload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[800px] max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[20px] font-extrabold text-gray-900 uppercase">Permintaan Pembelian</h2>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2">✕</button>
            </div>
            <div className="space-y-2 text-sm mb-6">
              <p><span className="text-gray-500 inline-block w-40">Bagian</span>{detail.payload.bagian}</p>
              <p><span className="text-gray-500 inline-block w-40">Nama</span>{detail.payload.namaPemohon}</p>
              <p><span className="text-gray-500 inline-block w-40">Jabatan</span>{detail.payload.jabatan}</p>
              <p><span className="text-gray-500 inline-block w-40">Tanggal Pengajuan</span>{displayDate(detail.payload.tanggalPengajuan)}</p>
              <p><span className="text-gray-500 inline-block w-40">Status</span>{STATUS_LABEL[detail.status].label}</p>
              {detail.payload.notes && <p><span className="text-gray-500 inline-block w-40">Catatan</span>{detail.payload.notes}</p>}
            </div>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Nama Barang</th>
                    <th className="px-4 py-3 text-center">QTY</th>
                    <th className="px-4 py-3 text-center">Satuan</th>
                    <th className="px-4 py-3">Proyek</th>
                    <th className="px-4 py-3">No SPK</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detail.payload.items.map((it, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 font-medium text-gray-900">{it.namaBarang}</td>
                      <td className="px-4 py-3 text-center">{it.qty}</td>
                      <td className="px-4 py-3 text-center">{it.satuan}</td>
                      <td className="px-4 py-3">{it.proyek}</td>
                      <td className="px-4 py-3">{it.noSpk}</td>
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
