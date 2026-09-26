"use client";

import React, { useState } from 'react';
import { Search, Download } from 'lucide-react';
import Link from 'next/link';

export default function DetailDataBarang() {
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{index: number, month: string} | null>(null);
  const [inputHarga, setInputHarga] = useState('');

  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const [dataDetail, setDataDetail] = useState([
    {
      id: 1,
      no: '1.',
      kode: 'L000001',
      nama: 'Triplex 3mm',
      suplier: 'Sumber Jaya',
      pajak: 'PKP',
      satuan: 'Lembar',
      kategori: 'Lembaran',
      hargaJanuari: '55.000',
      hargaFebruari: '',
      hargaMaret: '',
      hargaApril: '',
      hargaMei: '',
      hargaJuni: '',
      hargaJuli: '',
      hargaAgustus: '',
      hargaSeptember: '',
      hargaOktober: '',
      hargaNovember: '',
      hargaDesember: '',
      rata2025: '55.000',
      rata2024: '55.000'
    }
  ]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col justify-start mb-8 gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">DETAIL DATA BARANG</h1>
        <p className="text-gray-500 text-sm">Kelola daftar harga barang per bulan untuk supplier terkait.</p>
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
                placeholder="Cari kode atau nama barang..." 
              />
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-[13px] whitespace-nowrap border-collapse">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th rowSpan={2} className="px-4 py-3 border-r border-gray-100 text-center align-middle w-12">No</th>
                <th rowSpan={2} className="px-4 py-3 border-r border-gray-100 align-middle min-w-[100px]">Kode Barang</th>
                <th rowSpan={2} className="px-4 py-3 border-r border-gray-100 align-middle min-w-[140px] whitespace-normal uppercase font-bold text-gray-900">Nama Barang</th>
                <th rowSpan={2} className="px-4 py-3 border-r border-gray-100 align-middle min-w-[120px] whitespace-normal">Supplier</th>
                <th rowSpan={2} className="px-4 py-3 border-r border-gray-100 text-center align-middle whitespace-normal w-20">Pajak Vendor</th>
                <th rowSpan={2} className="px-4 py-3 border-r border-gray-100 align-middle w-16 text-center">Satuan</th>
                <th rowSpan={2} className="px-4 py-3 border-r border-gray-100 align-middle w-20 text-center">Kategori</th>
                <th colSpan={12} className="px-4 py-3 border-r border-gray-100 text-center font-bold text-[#FF8A00] bg-orange-50/30">Harga (Belum Termasuk PPN)</th>
                
                {/* Sticky Columns Headers */}
                <th rowSpan={2} className="px-4 py-3 border-l border-gray-100 text-center align-middle whitespace-normal w-24 min-w-[96px] sticky right-[96px] bg-amber-50/90 text-amber-900 font-bold shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)] z-20">
                  Rata-rata 2025
                </th>
                <th rowSpan={2} className="px-4 py-3 border-l border-gray-100 text-center align-middle whitespace-normal w-24 min-w-[96px] sticky right-0 bg-blue-50/90 text-blue-900 font-bold z-20">
                  Rata-rata 2024
                </th>
              </tr>
              <tr className="bg-orange-50/10">
                {months.map(m => (
                  <th key={m} className="px-3 py-2 border-r border-gray-100 font-bold text-center min-w-[100px] text-[11px] uppercase tracking-wider">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-600">
              {dataDetail.map((item, index) => (
                <tr key={index} className="hover:bg-[#FF8A00]/5 transition-colors group">
                  <td className="px-4 py-4 text-gray-500 text-center font-medium">{item.no}</td>
                  <td className="px-4 py-4 text-gray-400 font-mono text-[11px]">{item.kode}</td>
                  <td className="px-4 py-4 font-bold text-gray-900 whitespace-normal">{item.nama}</td>
                  <td className="px-4 py-4 whitespace-normal">{item.suplier}</td>
                  <td className="px-4 py-4 text-center">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">
                      {item.pajak}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center text-gray-500">{item.satuan}</td>
                  <td className="px-4 py-4 text-center">
                    <span className="px-2 py-1 bg-orange-50 text-[#FF8A00] rounded text-[10px] font-bold">
                      {item.kategori}
                    </span>
                  </td>
                  
                  {months.map(month => (
                    <td key={month} className="border-r border-gray-100 text-gray-900 cursor-pointer transition-colors group/cell p-0 relative min-w-[100px]">
                      {editingCell?.index === index && editingCell?.month === month ? (
                        <input 
                          type="text"
                          autoFocus
                          value={inputHarga}
                          onChange={(e) => setInputHarga(e.target.value)}
                          onBlur={() => {
                            const newData = [...dataDetail];
                            (newData[index] as unknown as Record<string, string>)[`harga${month}`] = inputHarga;
                            setDataDetail(newData);
                            setEditingCell(null);
                          }}
                          onKeyDown={(e) => {
                             if (e.key === 'Enter') {
                               const newData = [...dataDetail];
                               (newData[index] as unknown as Record<string, string>)[`harga${month}`] = inputHarga;
                               setDataDetail(newData);
                               setEditingCell(null);
                             }
                          }}
                          className="w-full h-full min-h-[48px] px-2 border-2 border-[#FF8A00] font-bold focus:outline-none bg-white z-10 relative text-center text-sm shadow-inner"
                        />
                      ) : (
                        <div 
                          onClick={() => {
                            setEditingCell({ index, month });
                            setInputHarga((item as unknown as Record<string, string>)[`harga${month}`] || '');
                          }}
                          className="w-full h-full min-h-[48px] flex justify-center items-center px-1 font-bold text-gray-700 hover:bg-[#FF8A00]/10 transition-colors"
                          title={`Klik untuk edit harga ${month}`}
                        >
                          {(item as unknown as Record<string, string>)[`harga${month}`] ? (
                            <span className="text-sm">{(item as unknown as Record<string, string>)[`harga${month}`]}</span>
                          ) : (
                            <span className="text-gray-300 font-medium text-[10px] italic group-hover/cell:text-[#FF8A00]">+ Input</span>
                          )}
                        </div>
                      )}
                    </td>
                  ))}
                  
                  <td className="px-4 py-4 font-bold text-amber-600 text-center sticky right-[96px] bg-amber-50/50 group-hover:bg-amber-100/50 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)] z-10 transition-colors border-l border-gray-100">
                    {item.rata2025}
                  </td>
                  <td className="px-4 py-4 font-bold text-blue-600 text-center sticky right-0 bg-blue-50/50 group-hover:bg-blue-100/50 z-10 transition-colors border-l border-gray-100">
                    {item.rata2024}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div>
            Menampilkan <span className="font-semibold text-gray-900">1</span> sampai <span className="font-semibold text-gray-900">{dataDetail.length}</span> dari <span className="font-semibold text-gray-900">{dataDetail.length}</span> data
          </div>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-white text-gray-400 cursor-not-allowed">Sec</button>
            <button className="px-3 py-1 bg-[#FF8A00] text-white rounded-md font-medium shadow-sm shadow-orange-500/20">1</button>
            <span className="px-2 py-1 text-gray-400">...</span>
          </div>
        </div>
      </div>

      {/* Buttons Action */}
      <div className="flex flex-wrap justify-end gap-3 mt-8">
        <button className="flex items-center gap-2 px-6 py-2.5 border-2 border-[#FF8A00] text-[#FF8A00] font-bold rounded-xl hover:bg-orange-50 transition-all text-xs uppercase tracking-wider">
          <Download className="w-4 h-4" />
          Download PDF
        </button>
        <Link href="/dashboard/purchasing/master/data-supplier" className="flex items-center justify-center px-8 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all text-xs uppercase tracking-wider">
          Kembali
        </Link>
        <button 
          onClick={() => setIsConfirmModalOpen(true)}
          className="px-8 py-2.5 bg-[#FF8A00] text-white font-bold rounded-xl hover:bg-orange-600 transition-all text-xs uppercase tracking-wider shadow-sm shadow-orange-500/20"
        >
          Simpan Perubahan
        </button>
      </div>

      {/* Modal Konfirmasi */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-6 mx-auto">
              <Download className="w-8 h-8 text-[#FF8A00] rotate-180" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Konfirmasi Update</h2>
            <p className="text-gray-500 mb-8 text-center leading-relaxed">
              Apakah Anda yakin ingin menyimpan semua perubahan harga pada data barang ini?
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setIsConfirmModalOpen(false)} 
                className="flex-1 px-6 py-3 border-2 border-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition-colors uppercase text-xs tracking-wider"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  alert("Data Detail Barang berhasil disimpan!");
                }} 
                className="flex-1 px-6 py-3 bg-[#FF8A00] text-white font-bold rounded-2xl hover:bg-orange-600 shadow-lg shadow-orange-500/30 transition-colors uppercase text-xs tracking-wider"
              >
                Ya, Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
