"use client";

import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import Link from 'next/link';

export default function DataSupplierPurchasing() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nama: '', bank: '', npwp: '', noTelf: '', alamat: '' });

  const [dataSupplier, setDataSupplier] = useState([
    {
      id: '001',
      nama: 'Sumber Jaya',
      bank: 'Bank BCA',
      npwp: '20394848747',
      noTelf: '0872636644777',
      alamat: 'Jl. Wahid Hasyim, Yogyakarta'
    }
  ]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col justify-start mb-8 gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">DATA SUPPLIER</h1>
        <p className="text-gray-500 text-sm">Kelola informasi mitra pemasok dan rincian kontak mereka.</p>
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
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all shadow-sm"
                placeholder="Cari supplier, npwp, atau ID..." 
              />
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
                <th scope="col" className="px-6 py-4 w-16 text-center">ID</th>
                <th scope="col" className="px-6 py-4">Nama Supplier</th>
                <th scope="col" className="px-6 py-4 text-center">Bank</th>
                <th scope="col" className="px-6 py-4 text-center">NPWP</th>
                <th scope="col" className="px-6 py-4 text-center">Kontak</th>
                <th scope="col" className="px-6 py-4">Alamat</th>
                <th scope="col" className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-600">
              {dataSupplier.map((item, index) => (
                <tr key={index} className="hover:bg-[#FF8A00]/5 transition-colors group">
                  <td className="px-6 py-4 text-gray-500 text-center font-medium">{item.id}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{item.nama}</td>
                  <td className="px-6 py-4 text-center">{item.bank}</td>
                  <td className="px-6 py-4 text-center font-mono text-xs">{item.npwp}</td>
                  <td className="px-6 py-4 text-center text-xs">{item.noTelf}</td>
                  <td className="px-6 py-4 max-w-xs truncate" title={item.alamat}>{item.alamat}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                       <Link href="/dashboard/purchasing/master/data-supplier/detail" className="px-3 py-1 bg-green-50 text-green-600 font-bold rounded-lg text-xs hover:bg-green-100 transition-all border border-green-100">
                        Detail Barang
                      </Link>
                      <button className="px-3 py-1 bg-amber-50 text-amber-600 font-bold rounded-lg text-xs hover:bg-amber-100 transition-all border border-amber-100">
                        Edit
                      </button>
                      <button className="px-3 py-1 bg-red-50 text-red-600 font-bold rounded-lg text-xs hover:bg-red-100 transition-all border border-red-100">
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div>
            Menampilkan <span className="font-semibold text-gray-900">1</span> sampai <span className="font-semibold text-gray-900">{dataSupplier.length}</span> dari <span className="font-semibold text-gray-900">{dataSupplier.length}</span> data
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

      {/* Download Button Outside */}
      <div className="flex justify-end mt-6">
        <button className="flex items-center justify-center gap-2 px-8 py-2.5 bg-[#FF8A00] text-white font-bold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm tracking-wide uppercase">
          Download Data
        </button>
      </div>

      {/* Modal Tambah Data */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6 uppercase tracking-wide">DATA SUPPLIER</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-6">
              <div>
                <label className="block text-[15px] font-medium text-gray-800 mb-2">Nama Supplier</label>
                <input 
                  type="text" 
                  value={formData.nama}
                  onChange={(e) => setFormData({...formData, nama: e.target.value})}
                  placeholder="Masukan nama supplier" 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors" 
                />
              </div>
              
              <div>
                <label className="block text-[15px] font-medium text-gray-800 mb-2">Jenis Bank</label>
                <input 
                  type="text" 
                  value={formData.bank}
                  onChange={(e) => setFormData({...formData, bank: e.target.value})}
                  placeholder="Masukan nama Bank" 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors" 
                />
              </div>

              <div>
                <label className="block text-[15px] font-medium text-gray-800 mb-2">NPWP</label>
                <input 
                  type="text" 
                  value={formData.npwp}
                  onChange={(e) => setFormData({...formData, npwp: e.target.value})}
                  placeholder="Masukan nama Npwp" 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors" 
                />
              </div>
              
              <div>
                <label className="block text-[15px] font-medium text-gray-800 mb-2">Kontak</label>
                <input 
                  type="text" 
                  value={formData.noTelf}
                  onChange={(e) => setFormData({...formData, noTelf: e.target.value})}
                  placeholder="Masukan nama Bank" 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors" 
                />
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-[15px] font-medium text-gray-800 mb-2">Alamat</label>
              <input 
                type="text" 
                value={formData.alamat}
                onChange={(e) => setFormData({...formData, alamat: e.target.value})}
                placeholder="Masukan nama alamat" 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors" 
              />
            </div>
            
            <div className="flex justify-end gap-3 mt-4">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="px-8 py-2.5 border-2 border-[#FF8A00] text-[#FF8A00] font-semibold rounded-lg hover:bg-orange-50 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  if(!formData.nama) {
                     alert("Data belum lengkap!");
                     return;
                  }
                  const newSupplier = {
                    id: `00${dataSupplier.length + 1}`,
                    nama: formData.nama,
                    bank: formData.bank,
                    npwp: formData.npwp,
                    noTelf: formData.noTelf,
                    alamat: formData.alamat
                  };
                  setDataSupplier([...dataSupplier, newSupplier]);
                  setIsModalOpen(false);
                  setFormData({ nama: '', bank: '', npwp: '', noTelf: '', alamat: '' });
                }} 
                className="px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-lg hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-colors"
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
