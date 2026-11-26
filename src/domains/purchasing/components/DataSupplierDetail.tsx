"use client";

import React, { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Search, Download, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getSupplierPrices } from '@/domains/purchasing/api';
import { useApiData } from '@/shared/lib/use-api-data';

const tahunSekarang = new Date().getFullYear();

export default function DetailDataBarang() {
  const { id } = useParams<{ id: string }>();
  const [searchQuery, setSearchQuery] = useState('');

  const searchParams = useSearchParams();
  const fromParam = searchParams.get('from');
  const backPath = fromParam === 'purchasing' ? '/dashboard/purchasing/master/data-supplier' : '/dashboard/superadmin/master/data-supplier';

  const { data, loading, error } = useApiData(() => getSupplierPrices(id, tahunSekarang), `${id}|${tahunSekarang}`, 'Gagal memuat barang supplier.');

  const keyword = searchQuery.trim().toLowerCase();
  const rows = (data?.rows ?? []).filter((r) => !keyword || r.nama.toLowerCase().includes(keyword) || (r.kode ?? '').toLowerCase().includes(keyword));
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col justify-start mb-5 gap-2">
        <div className="flex items-center gap-3">
          <Link href={backPath} aria-label="Kembali ke Data Supplier" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">DETAIL DATA BARANG</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Daftar barang untuk supplier {data?.supplierName ?? 'terkait'}.
        </p>
      </div>

      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="p-3 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="relative w-full max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                maxLength={100}
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all shadow-sm"
                placeholder="Cari kode atau nama barang..."
              />
            </div>
          </div>
        </div>

        {error && <div className="mx-5 mt-5 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-176 table-fixed text-left text-xs whitespace-nowrap border-collapse">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-3 py-2.5 border-r border-gray-100 text-center align-middle w-10">No</th>
                <th className="px-3 py-2.5 border-r border-gray-100 align-middle w-40">Kode Barang</th>
                <th className="px-3 py-2.5 border-r border-gray-100 align-middle w-56 whitespace-normal uppercase font-bold text-gray-900">Nama Barang</th>
                <th className="px-3 py-2.5 border-r border-gray-100 text-center align-middle whitespace-normal w-20">Pajak Vendor</th>
                <th className="px-3 py-2.5 border-r border-gray-100 align-middle w-16 text-center">Satuan</th>
                <th className="px-3 py-2.5 border-r border-gray-100 align-middle w-24 text-center">Kategori</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-600">
              {loading && (
                <tr><td colSpan={6} className="px-6 py-6 text-center text-gray-400">Memuat data...</td></tr>
              )}
              {!loading && !error && rows.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-6 text-center text-gray-400">Belum ada barang untuk supplier ini.</td></tr>
              )}
              {!loading && rows.map((item, index) => (
                <tr key={item.itemId} className="hover:bg-[#FF8A00]/5 transition-colors group">
                  <td className="px-3 py-2.5 text-gray-500 text-center font-medium">{index + 1}.</td>
                  <td className="px-3 py-2.5 text-gray-500 font-mono text-[11px] whitespace-normal wrap-break-word">{item.kode ?? '-'}</td>
                  <td className="px-3 py-2.5 font-bold text-gray-900 whitespace-normal wrap-break-word">{item.nama}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">
                      {data?.pajak === 'PKP' ? 'PKP' : 'Non PKP'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center text-gray-500">{item.satuan}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="px-2 py-1 bg-orange-50 text-[#FF8A00] rounded text-[10px] font-bold">{item.kategori}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-3 py-2.5 border-t border-gray-100 bg-gray-50/50 text-sm text-gray-500">
          {data ? `${rows.length} barang` : ''}
        </div>
      </div>

      <div className="flex w-full max-w-3xl flex-wrap justify-end gap-3 mt-5">
        <button className="flex items-center gap-2 px-6 py-2.5 border-2 border-[#FF8A00] text-[#FF8A00] font-bold rounded-xl hover:bg-orange-50 transition-all text-xs uppercase tracking-wider">
          <Download className="w-4 h-4" />
          Download PDF
        </button>
        <Link href={backPath} className="flex items-center justify-center px-8 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all text-xs uppercase tracking-wider">
          Kembali
        </Link>
      </div>
    </div>
  );
}
