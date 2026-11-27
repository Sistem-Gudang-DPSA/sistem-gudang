"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import Pagination from '@/shared/components/Pagination';
import { useApiData } from '@/shared/lib/use-api-data';
import { formatTanggal } from '@/domains/ppic/data/dokubah';
import { fetchPermintaanList } from '@/domains/ppic/data/pembelian';
import { lihatPermintaanPath } from '@/domains/purchasing/data/pembelian';
import StatusBadge, { type BadgeTone } from '@/shared/components/StatusBadge';
import type { ApprovalStatus } from '@/domains/ppic/types';

const STATUS_TONE: Record<ApprovalStatus, BadgeTone> = {
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
  revision_requested: 'blue',
  cancelled: 'gray',
};

export default function RekapPembelian() {
  return <RekapPembelianReport />;
}

export function RekapPembelianReport({
  lihatPath = lihatPermintaanPath,
}: {
  lihatPath?: (id: number | string) => string;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const filterKey = searchQuery.trim();
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ key: filterKey, page: next });
  const { data: result, loading, error } = useApiData(
    () => fetchPermintaanList({ page, search: filterKey }),
    `${filterKey}|${page}`,
    'Gagal memuat rekap pembelian.',
  );
  const filteredData = result?.rows ?? [];
  const total = result?.total ?? 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">DAFTAR PERMINTAAN PEMBELIAN</h1>
        <p className="text-gray-500 text-sm">Kelola pengajuan permintaan pembelian barang.</p>
      </div>

      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Pencarian */}
        <div className="relative w-full max-w-md mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            maxLength={100}
            placeholder="Cari"
            aria-label="Cari pembelian"
            className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-800 pointer-events-none" />
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] table-fixed text-left text-sm whitespace-nowrap">
            <colgroup>
              <col className="w-16" />
              <col className="w-[20%]" />
              <col className="w-[26%]" />
              <col className="w-[26%]" />
              <col />
            </colgroup>
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th scope="col" className="px-6 py-4 w-16 text-center">No</th>
                <th scope="col" className="px-6 py-4">Tanggal</th>
                <th scope="col" className="px-6 py-4">Permintaan</th>
                <th scope="col" className="px-6 py-4">Status</th>
                <th scope="col" className="px-6 py-4">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.map((item, index) => (
                <tr key={item.id} className="hover:bg-[#FF8A00]/5 transition-colors">
                  <td className="px-6 py-4 text-gray-500 text-center font-medium">{(page - 1) * 20 + index + 1}.</td>
                  <td className="px-6 py-4 text-gray-500 font-bold">{formatTanggal(item.tanggal)}</td>
                  <td className="px-6 py-4 text-gray-700 whitespace-normal break-words">{item.permintaan}</td>
                  <td className="px-6 py-4">
                    <StatusBadge tone={STATUS_TONE[item.statusApi]}>{item.status}</StatusBadge>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={lihatPath(item.id)}
                      className="inline-block px-3 py-1 bg-[#FF8A00] text-white text-xs font-semibold rounded-md hover:bg-orange-600 transition-colors"
                    >
                      Lihat Permintaan
                    </Link>
                  </td>
                </tr>
              ))}
              {(loading || error) && (
                <tr>
                  <td colSpan={5} className={`px-6 py-10 text-center ${error ? 'text-red-500' : 'text-gray-400 italic'}`}>
                    {error || 'Memuat data...'}
                  </td>
                </tr>
              )}
              {!loading && !error && filteredData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic">
                    Data tidak ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}
