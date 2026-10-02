"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { formatTanggal } from '@/domains/ppic/data/dokubah';
import { getPermintaanList, lihatPermintaanPath } from '@/domains/ppic/data/pembelian';

const cellClass = 'px-4 py-3 border-b border-r border-gray-300';

export default function RekapPembelian() {
  const data = getPermintaanList();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = data.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    return q === '' ||
      item.permintaan.toLowerCase().includes(q) ||
      item.status.toLowerCase().includes(q) ||
      formatTanggal(item.tanggal).includes(q);
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-[18px] font-extrabold text-black tracking-wide">Rekap Pembelian</h1>
      </div>
      
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {/* Pencarian */}
            <div className="relative w-full max-w-md mb-6">
                <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari"
                aria-label="Cari pembelian"
                className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-800 pointer-events-none" />
            </div>

            {/* Tabel */}
            <div className="overflow-x-auto border-t border-l border-gray-300 rounded-sm">
                <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                <thead className="bg-gray-100 text-gray-900 font-bold text-base">
                    <tr>
                    <th scope="col" className={`${cellClass} w-16`}>No</th>
                    <th scope="col" className={cellClass}>Tanggal</th>
                    <th scope="col" className={`${cellClass} w-1/3`}>Permintaan</th>
                    <th scope="col" className={`${cellClass} text-center`}>Status</th>
                    <th scope="col" className={`${cellClass} text-center`}>Action</th>
                    </tr>
                </thead>
                <tbody className="text-gray-800">
                    {filteredData.map((item, index) => (
                    <tr key={item.id} className="hover:bg-orange-50/20 transition-colors">
                        <td className={cellClass}>{index + 1}.</td>
                        <td className={cellClass}>{formatTanggal(item.tanggal)}</td>
                        <td className={cellClass}>{item.permintaan}</td>
                        <td className={`${cellClass} text-center font-bold text-gray-900`}>{item.status}</td>
                        <td className={`${cellClass} text-center`}>
                        <Link
                            href={lihatPermintaanPath(item.id)}
                            className="inline-block px-3 py-1 bg-[#FF8A00] text-white text-xs font-semibold rounded-md hover:bg-orange-600 transition-colors"
                        >
                            Lihat Permintaan
                        </Link>
                        </td>
                    </tr>
                    ))}
                    {filteredData.length === 0 && (
                    <tr>
                        <td colSpan={5} className={`${cellClass} px-6 py-10 text-center text-gray-400 italic`}>
                        Data tidak ditemukan.
                        </td>
                    </tr>
                    )}
                </tbody>
                </table>
            </div>
        </div>   
    </div>
  );
}