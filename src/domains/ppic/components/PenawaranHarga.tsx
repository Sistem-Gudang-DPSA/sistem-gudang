"use client";

import { useState } from 'react';
import { Search } from 'lucide-react';
import Link from 'next/link';

export default function PenawaranHarga() {
  const [searchQuery, setSearchQuery] = useState("");

  const dataLokasi = [
    { no : "1." , Tanggal : "01/02/2026", Permintaan: "Permintaan Hari Jumat", Status: "Belum Disetujui"},
  ];

  const MIN_ROWS = 7;
  const keyword = searchQuery.trim().toLowerCase();

  const filteredData = dataLokasi.filter((item) =>
    !keyword ||
    [item.no, item.Tanggal, item.Permintaan, item.Status].some((value) =>
      value.toLowerCase().includes(keyword)
    )
  );

  // Tambahkan baris kosong agar tinggi tabel tetap konsisten
  const emptyRowCount = Math.max(MIN_ROWS - filteredData.length, 0);
  const displayData = [
    ...filteredData,
    ...Array.from({ length: emptyRowCount }, () => ({ no: "", Tanggal: "", Permintaan: "", Status: "" })),
  ];

  return (
    <div className="flex flex-col bg-white min-h-screen p-6">
      {/* Title */}
      <div className="mb-4">
        <h1 className="text-lg font-extrabold text-black tracking-wide">
          Rekap Pembelian
        </h1>
      </div>

      <div className="w-full max-w-5xl">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-112 lg:w-128">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari..."
              className="w-full border border-gray-200 rounded-lg py-2.5 pl-5 pr-20 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 text-sm text-gray-700 placeholder-gray-400 transition-all duration-200"
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden w-full bg-white rounded-xl shadow-sm border border-gray-200/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse [&_th]:border [&_td]:border [&_th]:border-gray-300 [&_td]:border-gray-300">
              <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider text-xs font-semibold border-b border-gray-200 text-center">
                <tr>
                  <th className="px-2 py-4 whitespace-nowrap">No</th>
                  <th className="px-6 py-4 whitespace-nowrap ">Tanggal</th>
                  <th className="px-6 py-4 whitespace-nowrap w-1/2">Permintaan</th>
                  <th className="px-6 py-4 whitespace-nowrap ">Status</th>
                  <th className="px-6 py-4 whitespace-nowrap ">Action</th>
                </tr>
              </thead>
              <tbody>
                {keyword && filteredData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 h-[52px] text-center text-gray-400">
                      Data tidak ditemukan
                    </td>
                  </tr>
                )}
                {displayData.map((item, index) => (
                  <tr key={index} className="bg-white hover:bg-orange-50/30 transition-colors duration-200">
                    <td className="px-6 py-4 h-[52px] text-gray-700 font-medium">{item.no}</td>
                    <td className="px-6 py-4 text-gray-600">{item.Tanggal}</td>
                    <td className="px-6 py-4 text-gray-600">{item.Permintaan}</td>
                    <td className="px-6 py-4 text-gray-600">{item.Status}</td>
                    <td className="px-6 py-4 text-center">
                      {item.no && (
                        <Link
                        href="/dashboard/ppic/master/penawaran-harga/detail-permintaan"
                        className="px-3 py-1 bg-[#ff8a00] text-white text-xs font-medium rounded hover:bg-[#eb7d00] transition-colors whitespace-nowrap"
                        >
                        Lihat Permintaan
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
