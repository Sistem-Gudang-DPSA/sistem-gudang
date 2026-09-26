"use client";

import React, { useState } from 'react';
import { Search, Calendar, Plus, Download } from 'lucide-react';

interface BarangMasukItem {
  id: string;
  tanggalJam: string;
  noReferensi: string;
  noSuratJalanSupplier?: string;
  namaPemasok: string;
  sumberInbound: 'SUPPLIER' | 'PRODUKSI';
  totalVolumeQty: number;
  satuan: string;
  statusQc: 'PASS' | 'PARTIAL_RETUR';
  catatan?: string;
}

const mockDataBarangMasuk: BarangMasukItem[] = [
  {
    id: '1',
    tanggalJam: '2026-09-25 09:15',
    noReferensi: 'PO-2026-09-001',
    noSuratJalanSupplier: 'SJ-SUP-8821',
    namaPemasok: 'PT Sumber Jaya Steel',
    sumberInbound: 'SUPPLIER',
    totalVolumeQty: 500,
    satuan: 'Pcs',
    statusQc: 'PASS',
    catatan: 'Penerimaan bahan baku plat besi',
  },
  {
    id: '2',
    tanggalJam: '2026-09-24 14:30',
    noReferensi: 'PROD-2026-09-042',
    namaPemasok: 'Divisi Produksi A',
    sumberInbound: 'PRODUKSI',
    totalVolumeQty: 250,
    satuan: 'Unit',
    statusQc: 'PASS',
    catatan: 'Hasil rakitan unit komplit QC Pass',
  },
  {
    id: '3',
    tanggalJam: '2026-09-22 11:00',
    noReferensi: 'PO-2026-09-005',
    noSuratJalanSupplier: 'SJ-AB-1029',
    namaPemasok: 'CV Anugrah Baut',
    sumberInbound: 'SUPPLIER',
    totalVolumeQty: 1000,
    satuan: 'Pcs',
    statusQc: 'PARTIAL_RETUR',
    catatan: '50 pcs retur karena ulir rusak',
  },
];

export default function LaporanBarangMasuk() {
    const [filterSumber, setFilterSumber] = useState<string>('ALL');
    const [startDate, setStartDate] = useState<string>('2026-09-01');
    const [endDate, setEndDate] = useState<string>('2026-09-26');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedDetail, setSelectedDetail] = useState<BarangMasukItem | null>(null);

    const data = mockDataBarangMasuk;

    const filteredData = data.filter((item) => {
        const matchSumber = filterSumber === 'ALL' || item.sumberInbound === filterSumber;
        const matchSearch =
        item.noReferensi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.namaPemasok.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.noSuratJalanSupplier && item.noSuratJalanSupplier.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchSumber && matchSearch;
    });

    const totalInboundUnit = filteredData.reduce((acc, curr) => acc + curr.totalVolumeQty, 0);
    const totalSupplierUnit = filteredData
      .filter((d) => d.sumberInbound === 'SUPPLIER')
      .reduce((acc, curr) => acc + curr.totalVolumeQty, 0);
    const totalProduksiUnit = filteredData
      .filter((d) => d.sumberInbound === 'PRODUKSI')
      .reduce((acc, curr) => acc + curr.totalVolumeQty, 0);
    
    return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        <div className="flex flex-col justify-start mb-8 gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">REKAP BARANG MASUK</h1>
            <p className="text-gray-500 text-sm">Arsip pencatatan riwayat penerimaan fisik barang dari Supplier dan Hasil Produksi</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Inbound Bulan Ini</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
                {totalInboundUnit.toLocaleString('id-ID')} Qty / {filteredData.length} Transaksi
            </p>
            </div>
            <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase">Penerimaan Supplier (PO)</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
                {totalSupplierUnit.toLocaleString('id-ID')} Qty ({filteredData.filter((d) => d.sumberInbound === 'SUPPLIER').length} Transaksi)
            </p>
            </div>
            <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase">Barang Jadi Produksi (QC Pass)</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
                {totalProduksiUnit.toLocaleString('id-ID')} Qty ({filteredData.filter((d) => d.sumberInbound === 'PRODUKSI').length} Transaksi)
            </p>
            </div>
        </div>

        <div className="flex flex-wrap justify-between items-center bg-white p-4 border border-gray-200 rounded-lg shadow-sm gap-4 mt-5">
            <div className="flex flex-wrap gap-3 items-center">
            <div>
                <label className="block text-xs text-black mb-1">Sumber Inbound</label>
                <select
                value={filterSumber}
                onChange={(e) => setFilterSumber(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500c text-black"
                >
                <option value="ALL" className='text-black'>Semua Sumber (Supplier / Produksi)</option>
                <option value="SUPPLIER" className='text-black'>Supplier (PO)</option>
                <option value="PRODUKSI" className='text-black'>Barang Jadi Produksi</option>
                </select>
            </div>

            <div>
                <label className="block text-xs text-black mb-1">Periode Tanggal</label>
                <div className="flex gap-2 items-center">
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white text-black"
                />
                <span className="text-xs text-black font-medium">s/d</span>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white text-black"
                />
                </div>
            </div>

            <div>
                <label className="block text-xs text-black mb-1">Pencarian</label>
                <input
                type="text"
                placeholder="🔍 Cari No. PO / SJ / SKU..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-60 bg-white text-black placeholder:text-gray focus:outline-none focus:ring-2 focus:ring-blue-500 "
                />
            </div>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-sm mt-5">
        <div className="flex gap-2 items-end justify-between">
            <div className="flex gap-2 items-end m-2">
                <p className="text-xs font-semibold text-gray-500 uppercase m-2">Tabel Rekap Barang Masuk</p>
            </div>
            <div className="flex gap-2 items-end m-2">
                <button
                    onClick={() => alert('Exporting to Excel...')}
                    className="bg-green-600 hover:bg-green-700 text-white px-3.5 py-2 rounded-md text-sm font-medium transition-colors"
                >
                    📥 Export Excel
                </button>
                <button
                    onClick={() => alert('Printing PDF Laporan...')}
                    className="bg-slate-700 hover:bg-slate-800 text-white px-3.5 py-2 rounded-md text-sm font-medium transition-colors"
                >
                    🖨️ Cetak PDF
                </button>
            </div>
        </div>
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-100 font-semibold text-gray-700">
            <tr>
              <th className="px-4 py-3 text-center w-12">No</th>
              <th className="px-4 py-3 text-left">Tgl &amp; Jam Penerimaan</th>
              <th className="px-4 py-3 text-left">No. Referensi / PO</th>
              <th className="px-4 py-3 text-left">Sumber / Pemasok</th>
              <th className="px-4 py-3 text-right">Total Volume Item (Qty)</th>
              <th className="px-4 py-3 text-center">Status QC</th>
              <th className="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Tidak ada data penerimaan barang masuk ditemukan.
                </td>
              </tr>
            ) : (
              filteredData.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-center text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{item.tanggalJam}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-blue-600">
                    {item.noReferensi}
                    {item.noSuratJalanSupplier && (
                      <span className="block text-xs font-normal text-gray-500">
                        (SJ: {item.noSuratJalanSupplier})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{item.namaPemasok}</span>
                    <span className="block text-xs text-gray-500">
                      ({item.sumberInbound === 'SUPPLIER' ? 'Supplier External' : 'Produksi Internal'})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">
                    {item.totalVolumeQty} {item.satuan}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.statusQc === 'PASS' && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                        🟢 Pass (IPM)
                      </span>
                    )}
                    {item.statusQc === 'PARTIAL_RETUR' && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                        🟡 Part (Retur)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedDetail(item)}
                      className="text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded border border-blue-200 transition-colors"
                    >
                      👁️ View Detail
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Detail Penerimaan Barang</h3>
              <button
                onClick={() => setSelectedDetail(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">No. Referensi / PO</span>
                <span className="font-mono font-bold text-blue-600">{selectedDetail.noReferensi}</span>
              </div>
              {selectedDetail.noSuratJalanSupplier && (
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-500">No. Surat Jalan</span>
                  <span className="font-mono font-medium text-gray-800">{selectedDetail.noSuratJalanSupplier}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Tgl & Jam</span>
                <span className="font-medium text-gray-800">{selectedDetail.tanggalJam}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Sumber / Pemasok</span>
                <span className="font-medium text-gray-800">{selectedDetail.namaPemasok}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Total Volume</span>
                <span className="font-bold text-gray-900">{selectedDetail.totalVolumeQty} {selectedDetail.satuan}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Status QC</span>
                <span className="font-semibold text-gray-800">{selectedDetail.statusQc}</span>
              </div>
              {selectedDetail.catatan && (
                <div className="py-1">
                  <span className="text-gray-500 block mb-1">Catatan:</span>
                  <p className="bg-gray-50 p-2.5 rounded border border-gray-100 text-xs text-gray-700">{selectedDetail.catatan}</p>
                </div>
              )}
            </div>
            <div className="mt-6 text-right">
              <button
                onClick={() => setSelectedDetail(null)}
                className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    )
}