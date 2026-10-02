"use client";

import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2, CheckCircle, XCircle, Clock, Download, Calendar } from 'lucide-react';

export default function RekapDokubah() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const dataDokubah = [
    { id: 1, client: 'PT Bintang Raya', spk: 'SPK-2026-001', noRekap: 'RKP/04/001', approval: 'Approved' },
    { id: 2, client: 'CV Indo Makmur', spk: 'SPK-2026-002', noRekap: 'RKP/04/002', approval: 'Pending' },
    { id: 3, client: 'Global Mas', spk: 'SPK-2026-003', noRekap: 'RKP/04/003', approval: 'Rejected' },
  ];

  const filteredData = dataDokubah.filter(item => {
    if (searchQuery === "" && filterMonth === "" && filterYear === "") return true;

    const searches = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === "" ||
      item.client.toLowerCase().includes(searches) ||
      item.spk.toLowerCase().includes(searches) ||
      item.noRekap.toLowerCase().includes(searches);

    // Scan Month in noRekap (format RKP/04/001)
    const matchesMonth = filterMonth === "" || item.noRekap.split('/')[1] === filterMonth;

    // Scan Year in spk (format SPK-2026-001)
    const matchesYear = filterYear === "" || item.spk.includes(filterYear);

    return matchesSearch && matchesMonth && matchesYear;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200"><CheckCircle className="w-3 h-3" /> Approved</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200"><XCircle className="w-3 h-3" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200"><Clock className="w-3 h-3" /> Pending</span>;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col justify-start mb-8 gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">REKAP DOKUBAH</h1>
        <p className="text-gray-500 text-sm">Manajemen rekap dokumen perubahan (Dokubah) PPIC.</p>
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
                maxLength={100}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all shadow-sm"
                placeholder="Cari client, spk, atau rekap..."
              />
            </div>

            <div className="flex items-center gap-2">
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

              {(filterMonth || filterYear) && (
                <button
                  onClick={() => { setFilterMonth(""); setFilterYear(""); }}
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
                <th scope="col" className="px-6 py-4 w-16 text-center">No</th>
                <th scope="col" className="px-6 py-4">Client</th>
                <th scope="col" className="px-6 py-4">SPK</th>
                <th scope="col" className="px-6 py-4">No. Rekap</th>
                <th scope="col" className="px-6 py-4 text-center">Approval</th>
                <th scope="col" className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-600">
              {filteredData.map((item, index) => (
                <tr key={item.id} className="hover:bg-orange-50/20 transition-colors group">
                  <td className="px-6 py-3.5 text-gray-700 border-r border-gray-200 text-center">{index + 1}</td>

                  <td className="px-6 py-3.5 border-r border-gray-200">
                    <span className="font-semibold text-gray-900">{item.client}</span>
                  </td>

                  <td className="px-6 py-3.5 border-r border-gray-200 text-gray-600">
                    {item.spk}
                  </td>

                  <td className="px-6 py-3.5 border-r border-gray-200 text-gray-600">
                    {item.noRekap}
                  </td>

                  <td className="px-6 py-3.5 border-r border-gray-200 text-center">
                    {getApprovalBadge(item.approval)}
                  </td>

                  <td className="px-6 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit Data">
                         <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Hapus Data">
                         <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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

              {/* Extra empty rows to simulate the wireframe empty box lines */}
              {[...Array(5)].map((_, i) => (
                 <tr key={`empty-${i}`} className="h-12 border-b border-gray-200 last:border-b-0">
                   <td className="px-6 border-r border-gray-200"></td>
                   <td className="px-6 border-r border-gray-200"></td>
                   <td className="px-6 border-r border-gray-200"></td>
                   <td className="px-6 border-r border-gray-200"></td>
                   <td className="px-6 border-r border-gray-200"></td>
                   <td className="px-6 flex justify-center py-2 h-12"></td>
                 </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simpan Button at Bottom Right */}
      <div className="flex justify-end mt-6">
        <button className="flex items-center gap-2 px-8 py-2.5 bg-[#FF8A00] text-white font-bold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm tracking-wide uppercase">
          Simpan Data
        </button>
      </div>

      {/* Modal / Popup Tambah Data */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-opacity">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 font-sans">Rekap Dokubah</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 row-gap-6 col-gap-8 gap-y-6 gap-x-8 mb-10">
                {/* Client */}
                <div>
                  <label className="block text-[15px] font-medium text-gray-800 mb-2 font-sans">Client</label>
                  <input
                    type="text"
                    placeholder="Masukkan nama client"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors font-sans"
                  />
                </div>

                {/* SPK */}
                <div>
                  <label className="block text-[15px] font-medium text-gray-800 mb-2 font-sans">SPK</label>
                  <input
                    type="text"
                    placeholder="Masukkan nama spk"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors font-sans"
                  />
                </div>

                {/* Upload File Dokubah */}
                <div>
                  <label className="block text-[15px] font-medium text-gray-800 mb-2 font-sans">Upload File Dokubah</label>
                  <div className="relative">
                    <input type="file" id="file-dokubah" className="hidden" />
                    <label
                      htmlFor="file-dokubah"
                      className="flex items-center w-full pl-4 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors font-sans"
                    >
                      <span className="text-gray-400 flex-1 truncate text-left">Upload file dokubah</span>
                      <Download className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    </label>
                  </div>
                </div>

                {/* Upload File Rekap */}
                <div>
                  <label className="block text-[15px] font-medium text-gray-800 mb-2 font-sans">Upload File Rekap</label>
                  <div className="relative">
                    <input type="file" id="file-rekap" className="hidden" />
                    <label
                      htmlFor="file-rekap"
                      className="flex items-center w-full pl-4 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors font-sans"
                    >
                      <span className="text-gray-400 flex-1 truncate text-left">Upload file rekap</span>
                      <Download className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 mt-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-2.5 border-2 border-[#FF8A00] text-[#FF8A00] font-semibold rounded-lg hover:bg-orange-50 transition-colors font-sans"
                >
                  Batal
                </button>
                <button
                  className="px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-lg hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-colors font-sans"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
