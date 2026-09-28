"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Search, Filter } from 'lucide-react';
import { dataDokubah, STATUS_OPTIONS } from './data';

const MIN_ROWS = 5;

export default function DokubahPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const keyword = searchQuery.trim().toLowerCase();
  const filteredData = dataDokubah.filter((item) =>
    (!filterStatus || item.status === filterStatus) &&
    (!keyword ||
      [item.spk, item.client, item.tanggalMulai, item.tanggalSelesai, item.status].some((value) =>
        value.toLowerCase().includes(keyword)
      ))
  );

  const emptyRowCount = Math.max(MIN_ROWS - filteredData.length, 0);

  const toggleOne = (id: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const actionButton = "px-4 py-2 bg-[#ff8a00] text-white text-sm font-medium rounded-lg hover:bg-[#eb7d00] transition-colors";
  const checkbox = "h-4 w-4 accent-[#ff8a00] cursor-pointer";

  return (
    <div className="flex flex-col bg-white min-h-screen p-6">
      <h1 className="text-lg font-extrabold text-black tracking-wide mb-4">Dokubah</h1>

      {/* Search & Filter */}
      <div className="flex items-center gap-4 mb-2">
        <div className="flex items-center gap-2 w-full max-w-lg border border-gray-300 rounded-lg px-3 focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:border-orange-500">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari"
            className="flex-1 min-w-0 py-2 bg-transparent focus:outline-none text-sm text-gray-700 placeholder-gray-400"
          />
          <Search className="h-4 w-4 shrink-0 text-gray-700" />
        </div>
        <button
          onClick={() => setShowFilter((prev) => !prev)}
          className="flex items-center gap-3 px-4 py-2 bg-gray-100 border border-gray-400 rounded-lg text-sm font-semibold text-gray-800 hover:bg-gray-200 transition-colors"
        >
          <Filter className="h-5 w-5" />
          Filter
        </button>
        {showFilter && (
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-lg py-2 px-3 text-sm text-gray-700 focus:outline-none focus:border-orange-500"
          >
            <option value="">Semua Status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4 mt-6 mb-[30px]">
        <button className={actionButton}>Export Excell</button>
        <button className={actionButton}>Print PDF</button>
        <Link href="/dashboard/ppic/transaksi/dokubah/buat-dokubah" className={actionButton}>
          Buat Dokubah
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse border border-gray-300 [&_th]:border [&_td]:border [&_th]:border-gray-300 [&_td]:border-gray-300">
          <thead className="bg-gray-100 text-gray-800 font-semibold">
            <tr>
              <th className="px-3 py-2 w-12">No.</th>
              <th className="px-3 py-2">No. SPK / Proyek</th>
              <th className="px-3 py-2">Nama Client</th>
              <th className="px-3 py-2">Tanggal Mulai</th>
              <th className="px-3 py-2">Tanggal Selesai</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 w-16">Aksi</th>
              <th className="px-3 py-2 w-16">
                <div className="flex items-center gap-2">
                  Check
                  {/* Hanya simbol: tampilannya sama dengan checkbox baris, tapi tidak bisa diklik */}
                  <input type="checkbox" checked readOnly tabIndex={-1} className={`${checkbox} pointer-events-none`} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {filteredData.map((item, index) => (
              <tr key={item.id} className="h-7 hover:bg-orange-50/30">
                <td className="px-3">{index + 1}</td>
                <td className="px-3">{item.spk}</td>
                <td className="px-3">{item.client}</td>
                <td className="px-3">{item.tanggalMulai}</td>
                <td className="px-3">{item.tanggalSelesai}</td>
                <td className="px-3">{item.status}</td>
                <td className="px-1 text-center">
                  <Link
                    href={`/dashboard/ppic/transaksi/dokubah/view-dokubah?id=${item.id}`}
                    className="block w-full py-0.5 bg-[#ff8a00] text-white text-[10px] rounded-md hover:bg-[#eb7d00] transition-colors"
                  >
                    View
                  </Link>
                </td>
                <td className="text-center">
                  <input type="checkbox" checked={checked.has(item.id)} onChange={() => toggleOne(item.id)} className={checkbox} />
                </td>
              </tr>
            ))}
            {Array.from({ length: emptyRowCount }, (_, i) => (
              <tr key={`empty-${i}`} className="h-7">
                {Array.from({ length: 8 }, (_, j) => <td key={j} />)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
