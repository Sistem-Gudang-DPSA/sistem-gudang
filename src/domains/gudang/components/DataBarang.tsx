"use client";

import React, { useState } from 'react';
import { Search, Plus, Download, Filter, MoreHorizontal } from 'lucide-react';

export default function DataBarangGudang() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ lokasi: "", stok: "" });

  const [dataBarang, setDataBarang] = useState([
    { id: 1, kode: '-', nama: 'Triplex 3mm', stok: 0, satuan: 'Lembar', kategori: 'Lembaran', supplier: 'Sumber Jaya', lokasi: '-', hasAction: true },
    { id: 2, kode: 'T3-LBR-001-A04', nama: 'Triplex 3mm', stok: 100, satuan: 'Lembar', kategori: 'Lembaran', supplier: 'Sumber Mulai', lokasi: 'A04', hasAction: true },
    { id: 3, kode: 'BSI-HLW-044-C01', nama: 'Besi Hollow 4x4', stok: 200, satuan: 'Batang', kategori: 'Logam', supplier: 'Baja Sentosa', lokasi: 'C01', hasAction: true },
    { id: 4, kode: 'CT-PPU-010-D05', nama: 'Cat Polyurethane 5L', stok: 12, satuan: 'Kaleng', kategori: 'Finishing', supplier: 'CV Warna Agung', lokasi: 'D05', hasAction: true },
    { id: 5, kode: 'SKP-KAY-008-E01', nama: 'Sekrup Kayu 5cm', stok: 1500, satuan: 'Pcs', kategori: 'Aksesoris', supplier: 'Toko Baut Jaya', lokasi: 'E01', hasAction: false },
  ]);

  const getCategoryColor = (kategori: string) => {
    if (!kategori) return 'bg-gray-100 text-gray-700 border-gray-200/50';
    switch(kategori.toLowerCase()) {
      case 'lembaran': return 'bg-blue-100 text-blue-700 border-blue-200/50';
      case 'kayu solid': return 'bg-amber-100 text-amber-700 border-amber-200/50';
      case 'logam': return 'bg-slate-100 text-slate-700 border-slate-200/50';
      case 'finishing': return 'bg-teal-100 text-teal-700 border-teal-200/50';
      case 'aksesoris': return 'bg-pink-100 text-pink-700 border-pink-200/50';
      default: return 'bg-purple-100 text-purple-700 border-purple-200/50';
    }
  };

  const handleExportCSV = () => {
    const headers = ['No,Kode Barang,Nama Barang,Supplier,Jumlah Stok,Satuan,Kategori,Lokasi'];
    const csvData = dataBarang.map((item, index) => 
      `${index + 1},${item.kode},"${item.nama}","${item.supplier}",${item.stok},${item.satuan},${item.kategori},${item.lokasi}`
    );
    const csvString = [...headers, ...csvData].join('\n');
    
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Data_Barang_Gudang.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">Data Barang</h1>
          <p className="text-gray-500 text-sm">Kelola master data barang dan lokasi inventaris Gudang.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all"
              placeholder="Cari kode, nama barang, atau supplier..." 
            />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              title="Export Data ke CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th scope="col" className="px-6 py-4">No</th>
                <th scope="col" className="px-6 py-4">Informasi Barang</th>
                <th scope="col" className="px-6 py-4">Supplier</th>
                <th scope="col" className="px-6 py-4">Stok & Satuan</th>
                <th scope="col" className="px-6 py-4">Kategori</th>
                <th scope="col" className="px-6 py-4">Lokasi</th>
                <th scope="col" className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {dataBarang.map((item, index) => (
                <tr key={item.id} className="hover:bg-[#FF8A00]/5 transition-colors group">
                  <td className="px-6 py-4 text-gray-500">{index + 1}</td>
                  
                  {/* Informasi Barang */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{item.nama}</span>
                      <span className="text-xs font-mono text-gray-500 mt-0.5">{item.kode}</span>
                    </div>
                  </td>
                  
                  {/* Supplier */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                        {item.supplier ? item.supplier.charAt(0) : '-'}
                      </div>
                      <span>{item.supplier || '-'}</span>
                    </div>
                  </td>

                  {/* Stok & Satuan */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <span className={`font-bold ${item.stok < 20 ? 'text-red-600' : item.stok < 50 ? 'text-amber-600' : 'text-gray-800'}`}>
                         {item.stok}
                       </span>
                       <span className="text-gray-500 text-xs bg-gray-100 px-2 py-0.5 rounded-md">{item.satuan}</span>
                    </div>
                  </td>

                  {/* Kategori */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor(item.kategori)}`}>
                      {item.kategori || '-'}
                    </span>
                  </td>

                  {/* Lokasi */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-gray-600 font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FF8A00]"></div>
                      {item.lokasi || '-'}
                    </span>
                  </td>

                  {/* Aksi */}
                  <td className="px-6 py-4 text-center">
                    {item.hasAction ? (
                      <button 
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#FF8A00]/10 text-[#FF8A00] text-xs font-bold rounded-lg hover:bg-[#FF8A00]/20 transition-all duration-200 w-24 opacity-90 group-hover:opacity-100"
                      >
                        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                        Tambah
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination / Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div>
             Menampilkan <span className="font-semibold text-gray-900">1</span> sampai <span className="font-semibold text-gray-900">5</span> dari <span className="font-semibold text-gray-900">142</span> data
          </div>
          <div className="flex gap-1">
             <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-white text-gray-400 cursor-not-allowed">Sec</button>
             <button className="px-3 py-1 bg-[#FF8A00] text-white rounded-md font-medium shadow-sm shadow-orange-500/20">1</button>
             <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-white text-gray-600 hover:text-[#FF8A00] font-medium transition-colors">2</button>
             <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-white text-gray-600 hover:text-[#FF8A00] font-medium transition-colors">3</button>
             <span className="px-2 py-1 text-gray-400">...</span>
             <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-white text-gray-600 hover:text-[#FF8A00] font-medium transition-colors">Selanjutnya</button>
          </div>
        </div>
      </div>
      
      {/* Modal Tambah Lokasi */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
                TAMBAH LOKASI
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 mb-8">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Lokasi</label>
                <div className="relative">
                  <select 
                    className="w-full border border-gray-200 bg-gray-50/50 rounded-xl py-2.5 pl-4 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] focus:bg-white appearance-none text-sm transition-all duration-200"
                    style={{ backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%20%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')", backgroundRepeat: "no-repeat", backgroundPosition: "right 1rem center", backgroundSize: "1.2em" }}
                    value={modalData.lokasi}
                    onChange={(e) => setModalData({ ...modalData, lokasi: e.target.value })}
                  >
                    <option value="" disabled>Pilih Lokasi</option>
                    <option value="A01">A01</option>
                    <option value="A02">A02</option>
                    <option value="A03">A03</option>
                    <option value="A04">A04</option>
                  </select>
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Stok</label>
                <input 
                  type="number"
                  placeholder="0"
                  className="w-full border border-gray-200 bg-gray-50/50 rounded-xl py-2.5 px-4 text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] focus:bg-white transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={modalData.stok}
                  onChange={(e) => setModalData({ ...modalData, stok: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setModalData({ lokasi: "", stok: "" });
                }}
                className="px-6 py-2.5 bg-[#FF8A00] text-white font-medium rounded-xl hover:bg-[#E67A00] shadow-sm shadow-[#FF8A00]/20 transition-all text-sm"
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
