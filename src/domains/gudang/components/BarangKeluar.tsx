"use client";

import React, { useState } from 'react';
import { Search, Calendar, Plus, AlertCircle } from 'lucide-react';

export default function BarangKeluarGudang() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ namaClient: "", spk: "", namaItem: "", tanggal: "" });

  const dataBarangKeluar = [
    {
      no: "1.",
      kodeBarang: "BB-18-LBR-001-A04",
      namaClient: "Hermina Banyumanik",
      spk: "01/RSHB/III/2026",
      tanggal: "12-04-2026",
      namaItem: "Credensa Kulkas",
      namaBarang: "BB 18 mm",
      jumlah: "2"
    },
    {
      no: "2",
      kodeBarang: "H-5555-LBR-002-C01",
      namaClient: "Hermina Banyumanik",
      spk: "01/RSHB/III/2026",
      tanggal: "12-04-2026",
      namaItem: "Credensa Kulkas",
      namaBarang: "HPL 5555",
      jumlah: "4"
    },
    // Empty rows based on the screenshot
    { no: "", kodeBarang: "", namaClient: "", spk: "", tanggal: "", namaItem: "", namaBarang: "", jumlah: "" },
    { no: "", kodeBarang: "", namaClient: "", spk: "", tanggal: "", namaItem: "", namaBarang: "", jumlah: "" },
    { no: "", kodeBarang: "", namaClient: "", spk: "", tanggal: "", namaItem: "", namaBarang: "", jumlah: "" },
    { no: "", kodeBarang: "", namaClient: "", spk: "", tanggal: "", namaItem: "", namaBarang: "", jumlah: "" },
    { no: "", kodeBarang: "", namaClient: "", spk: "", tanggal: "", namaItem: "", namaBarang: "", jumlah: "" },
  ];

  const filteredData = dataBarangKeluar.filter(item => {
    // If all filters are empty, show everything (including placeholder rows)
    if (searchQuery === "" && filterDay === "" && filterMonth === "" && filterYear === "") return true;
    
    // If filtering, skip empty rows
    if (!item.tanggal && !item.no) return false;

    // Date filtering logic
    let matchesDate = true;
    if (item.tanggal) {
      const [d, m, y] = item.tanggal.split("-");
      const matchesDay = filterDay === "" || d === filterDay.padStart(2, '0');
      const matchesMonth = filterMonth === "" || m === filterMonth;
      const matchesYear = filterYear === "" || y === filterYear;
      matchesDate = matchesDay && matchesMonth && matchesYear;
    } else {
      // If row has no date but we are filtering by date, exclude it
      if (filterDay !== "" || filterMonth !== "" || filterYear !== "") matchesDate = false;
    }
    
    const searches = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === "" || 
      item.namaClient.toLowerCase().includes(searches) ||
      item.kodeBarang.toLowerCase().includes(searches) ||
      item.spk.toLowerCase().includes(searches) ||
      item.namaBarang.toLowerCase().includes(searches) ||
      item.namaItem.toLowerCase().includes(searches);

    return matchesDate && matchesSearch;
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col justify-start mb-8 gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">DATA BARANG KELUAR</h1>
        <p className="text-gray-500 text-sm">Monitor dan kelola pengeluaran barang untuk client dan projek.</p>
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
                placeholder="Cari client, spk, atau barang..." 
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

          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm shrink-0 w-full lg:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Data</span>
          </button>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th scope="col" className="px-6 py-4">No</th>
                <th scope="col" className="px-6 py-4">Informasi Barang</th>
                <th scope="col" className="px-6 py-4">Client</th>
                <th scope="col" className="px-6 py-4 text-center">SPK</th>
                <th scope="col" className="px-6 py-4 text-center">Tanggal</th>
                <th scope="col" className="px-6 py-4 text-center">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.map((item, index) => (
                <tr key={index} className="hover:bg-[#FF8A00]/5 transition-colors group">
                  <td className="px-6 py-4 text-gray-500 text-center">{item.no}</td>
                  
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{item.namaBarang}</span>
                      <span className="text-xs font-mono text-gray-500 mt-0.5">{item.kodeBarang}</span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 text-gray-600">
                    <div className="flex flex-col">
                       <span className="font-semibold text-gray-800">{item.namaClient}</span>
                       <span className="text-[11px] text-gray-400">{item.namaItem}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center text-gray-600 font-medium">
                    {item.spk}
                  </td>

                  <td className="px-6 py-4 text-center text-gray-500">
                    {item.tanggal}
                  </td>

                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-orange-50 text-orange-700 border border-orange-100">
                      {item.jumlah}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400 italic">
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

      {/* Modal Form Barang Keluar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md transition-opacity duration-300 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[800px] p-8 border border-white/20 relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-[20px] font-extrabold text-gray-900 mb-8 tracking-wide uppercase">
              FORM BARANG KELUAR
            </h2>

            <div className="flex flex-col gap-6 mb-8">
              {/* Row 1 */}
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Nama Client</label>
                  <input 
                    type="text"
                    placeholder="Isi nama client"
                    value={modalData.namaClient}
                    onChange={(e) => setModalData({...modalData, namaClient: e.target.value})}
                    className="w-full border border-gray-200 bg-gray-50/50 rounded-lg py-3 px-4 text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white transition-all duration-200"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">SPK</label>
                  <input 
                    type="text"
                    placeholder="Isi Nomor SPK"
                    value={modalData.spk}
                    onChange={(e) => setModalData({...modalData, spk: e.target.value})}
                    className="w-full border border-gray-200 bg-gray-50/50 rounded-lg py-3 px-4 text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white transition-all duration-200"
                  />
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Nama Item/Project</label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Isi Nama Item"
                      value={modalData.namaItem}
                      onChange={(e) => setModalData({...modalData, namaItem: e.target.value})}
                      className="w-full border border-gray-200 bg-gray-50/50 rounded-lg py-3 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 text-sm text-gray-700 placeholder-gray-400 transition-all duration-200"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-800" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Tanggal</label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Pilih Tanggal"
                      value={modalData.tanggal}
                      onChange={(e) => setModalData({...modalData, tanggal: e.target.value})}
                      className="w-full border border-gray-200 bg-gray-50/50 rounded-lg py-3 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 text-sm text-gray-700 placeholder-gray-400 transition-all duration-200"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Calendar className="h-4 w-4 text-gray-800" strokeWidth={2} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub Table inside Modal */}
            <div className="border border-gray-200/80 rounded-xl overflow-hidden mb-6 relative shadow-sm">
              <table className="w-full text-left text-[14px]">
                <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-200 text-sm">
                  <tr>
                    <th className="px-4 py-3.5 border-r border-gray-200 text-center w-16">No</th>
                    <th className="px-4 py-3.5 border-r border-gray-200 text-center w-32">Kode</th>
                    <th className="px-4 py-3.5 border-r border-gray-200 text-center">Nama Barang</th>
                    <th className="px-4 py-3.5 border-r border-gray-200 text-center w-32">Jumlah</th>
                    <th className="px-4 py-3.5 text-center w-32">PIC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[1, 2, 3].map((row, i) => (
                    <tr key={i} className="bg-white hover:bg-orange-50/30 transition-colors duration-150">
                      <td className="border-r border-gray-200 h-[45px]"></td>
                      <td className="border-r border-gray-200"></td>
                      <td className="border-r border-gray-200"></td>
                      <td className="border-r border-gray-200"></td>
                      <td className=""></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Section */}
            <div className="flex flex-wrap items-center justify-between gap-4 mt-8">
              <div className="flex items-center gap-3">
                <button className="flex items-center justify-center w-[36px] h-[36px] rounded-lg border-2 border-[#ff8a00] text-[#ff8a00] hover:bg-orange-50 hover:shadow-sm hover:-translate-y-0.5 transition-all bg-white z-10">
                  <Plus className="w-5 h-5" strokeWidth={2.5} />
                </button>
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl shadow-sm border border-amber-100 text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600" strokeWidth={2.2} />
                  <span className="text-[14px] font-medium tracking-tight">Penulisan nama item tidak boleh disingkat</span>
                </div>
              </div>

              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setModalData({ namaClient: "", spk: "", namaItem: "", tanggal: "" });
                }}
                className="px-8 py-2.5 bg-[#ff8a00] text-white rounded-lg shadow-sm hover:shadow-md hover:bg-[#f08000] hover:-translate-y-0.5 transition-all duration-200 font-semibold text-[15px] ml-auto"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
