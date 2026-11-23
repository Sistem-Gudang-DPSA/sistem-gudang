"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import Pagination from "@/shared/components/Pagination";
import { listTrackingSpk } from "@/domains/ppic/api";
import { useApiData } from "@/shared/lib/use-api-data";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { usePage } from "@/shared/lib/use-page";

type Proyek = {
  client: string;
  namaProyek: string;
  noSpk: string;
  spkMasuk: string;
};

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;

export default function DaftarProyekPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // Search or page size change resets to page 1.
  const [currentPage, setCurrentPage] = usePage(`${debouncedSearch}|${pageSize}`);

  // The whole list is fetched once and searched on the client, so every column counts.
  const { data: spkList, loading, error } = useApiData(
    () => listTrackingSpk(),
    'daftar-proyek',
  );

  const dataProyek: Proyek[] = (spkList ?? []).map((spk) => ({
    client: spk.client,
    namaProyek: spk.projectName ?? "-",
    noSpk: spk.noSpk,
    // shown as is from tracking, "-" when it has no date
    spkMasuk: spk.tanggalMasuk
      ? new Date(`${spk.tanggalMasuk}T00:00:00`).toLocaleDateString("id-ID", { dateStyle: "medium" })
      : "-",
  }));

  // Pencarian mencakup semua kolom yang tampil, termasuk SPK Masuk yang sudah diformat.
  const query = debouncedSearch.trim().toLowerCase();
  const filteredData = dataProyek.filter((item) =>
    Object.values(item).some((value) => value.toLowerCase().includes(query))
  );

  // Logika Pagination Data
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Judul */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Daftar Proyek</h1>
          <p className="text-sm text-gray-500 mt-1">
            Daftar proyek yang tersedia.
          </p>
        </div>
      </div>

      {/* Card Kontainer Utama */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {/* Baris Filter Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari di semua kolom..."
              aria-label="Cari di semua kolom Daftar Proyek"
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>
        </div>

        {/* Tabel Data */}
        <div className="overflow-x-auto border-t border-gray-100">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4 font-bold text-gray-700 min-w-48">Client</th>
                <th className="py-3.5 px-4 font-bold text-gray-700 min-w-56">Nama Proyek</th>
                <th className="py-3.5 px-4 font-bold text-gray-700 min-w-44">No. SPK</th>
                <th className="py-3.5 px-4 font-bold text-gray-700 min-w-32">SPK Masuk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Memuat data...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              ) : paginatedData.length > 0 ? (
                paginatedData.map((item, index) => {
                  const isHighlight = index % 2 === 1;
                  const itemNumber = startIndex + index + 1;

                  return (
                    <tr
                      key={item.noSpk}
                      className={`transition-colors hover:bg-orange-50/50 ${isHighlight ? "bg-[#FFFDF9]" : "bg-white"
                        }`}
                    >
                      <td className="py-3.5 px-4 text-center text-gray-500 font-medium">
                        {itemNumber}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-900 uppercase">
                        {item.client}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-800">
                        {item.namaProyek}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        {item.noSpk}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 font-medium">
                        {item.spkMasuk}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 italic">
                    Data proyek tidak ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Komponen Pagination */}
        {filteredData.length > 0 && (
          <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-4">
            <label className="flex items-center justify-end gap-2 text-xs text-gray-500">
              Baris per halaman
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 bg-white border border-gray-200 rounded-md text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <Pagination
              page={currentPage}
              pageSize={pageSize}
              total={filteredData.length}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      <p role="status" className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        Sistem melakukan refresh setiap 30 menit.
      </p>
    </div>
  );
}