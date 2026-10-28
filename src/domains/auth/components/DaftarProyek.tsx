"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import Pagination from "@/shared/components/Pagination";

type Proyek = {
  id: number;
  client: string;
  namaProyek: string;
  noSpk: string;
  spkMasuk: string;
};

const DATA_PROYEK: Proyek[] = [
  { id: 1, client: "HERMINA TASIKMALAYA", namaProyek: "RAK SEPATU TERTUTUP", noSpk: "1501/SP-Jan/2026", spkMasuk: "26 Oct 2026" },
  { id: 2, client: "SENIOR LIVING CARE", namaProyek: "WALLPAPER DAN GORDYN", noSpk: "PO260922001", spkMasuk: "26 Oct 2026" },
  { id: 3, client: "HERMINA PERIUK TANGERANG", namaProyek: "SOFA RUANG TUNGGU IGD P...", noSpk: "3740/SPK/Jan/2026", spkMasuk: "24 Oct 2026" },
  { id: 4, client: "DOKTER ARFAN", namaProyek: "FURNITURE RESIDENTIAL D...", noSpk: "019 /SSDA/2026", spkMasuk: "19 Oct 2026" },
  { id: 5, client: "RS HAMORI", namaProyek: "Pengadaan Furniture Rehab...", noSpk: "215/PT HM/2026", spkMasuk: "22 Oct 2026" },
  { id: 6, client: "HERMINA KEMAYORAN", namaProyek: "ADD. HARGA SOFA BED DE...", noSpk: "4438/SPK/Jan/2026", spkMasuk: "23 Oct 2026" },
  { id: 7, client: "HERMINA KEPANJEN", namaProyek: "PINTU PK 1 TANPA KACA", noSpk: "22.10/01.01...", spkMasuk: "22 Oct 2026" },
  { id: 8, client: "RS HAMORI", namaProyek: "KAMAR RAWAT INAP VIP & ...", noSpk: "192/PT HM/2026", spkMasuk: "19 Oct 2026" },
  { id: 9, client: "YAYASAN TARAKANITA", namaProyek: "AUDITORIUM SMA STELLA ...", noSpk: "125/BU-PO/2026", spkMasuk: "22 Oct 2026" },
  { id: 10, client: "HERMINA ARCAMANIK", namaProyek: "Cafe Kokarmina Lt 1", noSpk: "1778/SPK/Jan/2026", spkMasuk: "22 Oct 2026" },
];

const ITEMS_PER_PAGE = 5; // Jumlah item per halaman

export default function DaftarProyekPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter Data Berdasarkan Input Pencarian
  const filteredData = DATA_PROYEK.filter(
    (item) =>
      item.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.namaProyek.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.noSpk.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Logika Pagination Data
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset ke halaman 1 saat mengetik pencarian
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-in fade-in duration-300">
      {/* Header Judul */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Daftar Proyek</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola data proyek, SPK masuk, dan progres pekerjaan client.
        </p>
      </div>

      {/* Card Kontainer Utama */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {/* Baris Filter Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari client, proyek, atau SPK..."
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
                <th className="py-3.5 px-4 font-bold text-gray-700 min-w-56">Nama Projek</th>
                <th className="py-3.5 px-4 font-bold text-gray-700 min-w-44">No SPK</th>
                <th className="py-3.5 px-4 font-bold text-gray-700 min-w-32">SPK Masuk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {paginatedData.length > 0 ? (
                paginatedData.map((item, index) => {
                  const isHighlight = index % 2 === 1;
                  const itemNumber = startIndex + index + 1;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-orange-50/50 ${
                        isHighlight ? "bg-[#FFFDF9]" : "bg-white"
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
                      <td className="py-3.5 px-4 font-semibold text-blue-600 hover:underline cursor-pointer">
                        <Link href={`/dashboard/proyek/${item.id}`}>
                          {item.noSpk}
                        </Link>
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
        <div className="mt-6 flex justify-end border-t border-gray-100 pt-4">
          <Pagination
            page={currentPage}
            pageSize={ITEMS_PER_PAGE}
            total={filteredData.length}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
      </div>
    </div>
  );
}