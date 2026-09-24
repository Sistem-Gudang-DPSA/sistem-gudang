"use client";

import React, { useState } from 'react';
import { Search, Plus, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function PermintaanPembelianGudang() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const dataPermintaan = [
    { no: "1.", tanggal: "01/02/2026", permintaan: "Permintaan hari jumat", status: "Menunggu Persetujuan" },
    { no: "",  tanggal: "", permintaan: "" },
    { no: "",  tanggal: "", permintaan: "" },
    { no: "",  tanggal: "", permintaan: "" },
    { no: "",  tanggal: "", permintaan: "" },
    { no: "",  tanggal: "", permintaan: "" },
    { no: "",  tanggal: "", permintaan: "" },
    { no: "",  tanggal: "", permintaan: "" },
  ];

  const filteredData = dataPermintaan.filter(item => {
    if (searchQuery === "" && filterDay === "" && filterMonth === "" && filterYear === "") return true;
    if (!item.tanggal && !item.no) return false;

    // Date filtering logic (Data uses DD/MM/YYYY)
    let matchesDate = true;
    if (item.tanggal) {
      const [d, m, y] = item.tanggal.split("/");
      const matchesDay = filterDay === "" || d === filterDay.padStart(2, '0');
      const matchesMonth = filterMonth === "" || m === filterMonth;
      const matchesYear = filterYear === "" || y === filterYear;
      matchesDate = matchesDay && matchesMonth && matchesYear;
    } else {
      if (filterDay !== "" || filterMonth !== "" || filterYear !== "") matchesDate = false;
    }
    
    const searches = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === "" || 
      item.permintaan.toLowerCase().includes(searches);

    return matchesDate && matchesSearch;
  });

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
                placeholder="Cari rincian permintaan..." 
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
                <th scope="col" className="px-6 py-4 text-center">Aksi</th>
                <th scope="col" className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.map((item, index) => (
                <tr key={index} className="hover:bg-[#FF8A00]/5 transition-colors group">
                  <td className="px-6 py-4 text-gray-500 text-center font-medium">{item.no}</td>
                  <td className="px-6 py-4 text-gray-500 font-bold">{item.tanggal}</td>
                  <td className="px-6 py-4 text-gray-700 italic">"{item.permintaan}"</td>
                  <td className="px-6 py-4 text-center">
                    {item.tanggal && (
                      <div className="flex items-center justify-center gap-2">
                        <button className="px-4 py-1.5 bg-[#FF8A00]/10 text-[#FF8A00] font-bold rounded-lg text-xs hover:bg-[#FF8A00]/20 transition-all">
                          Edit
                        </button>
                        <button className="px-4 py-1.5 bg-blue-50 text-blue-600 font-bold rounded-lg text-xs hover:bg-blue-100 transition-all">
                          Tambah
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-700 italic">"{item.status}"</td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic">
                    Data tidak ditemukan untuk filter tersebut.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div>
            Menampilkan <span className="font-semibold text-gray-900">1</span> sampai <span className="font-semibold text-gray-900">{filteredData.filter(i=>i.no).length}</span> dari <span className="font-semibold text-gray-900">{filteredData.filter(i=>i.no).length}</span> data
          </div>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-white text-gray-400 cursor-not-allowed">Sec</button>
            <button className="px-3 py-1 bg-[#FF8A00] text-white rounded-md font-medium shadow-sm shadow-orange-500/20">1</button>
            <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-white text-gray-600 hover:text-[#FF8A00] font-medium transition-colors">2</button>
            <span className="px-2 py-1 text-gray-400">...</span>
            <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-white text-gray-600 hover:text-[#FF8A00] font-medium transition-colors">Selanjutnya</button>
          </div>
        </div>
      </div>
    </div>
  );
}
