"use client";

import React, { useState } from 'react';
import { Search, FileUp, Download, Eye, AlertCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import type { BarangKeluarItems } from '../types';
import { ApiError } from '@/shared/lib/api-client';



export default function LaporanBarangKeluar(){
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filterSumber, setFilterSumber] = useState<string>('ALL');
    const [filterDate, setFilterDate] = useState<string>('2026-09-01');

    const [selectedDetail, setSelectedDetail] = useState<BarangKeluarItems | null>(null);
    const [data, setData] = useState<BarangKeluarItems[]>([]);
    const filteredData = data;

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleExportCSV = () => {
        const exportData = filteredData.map((item, index) => ({
        'No': index + 1,
        'Tgl & Jam Penerimaan': item.tanggal,
        'Total Volume (Qty)': item.jumlah,
        'Lokasi Gudang': item.asalGudang,
        'SPK': item.noSPK,
        'Tujuan / Penerima': item.tujuanPenerima
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Barang Masuk');
    };

    const handlePrintPDF = () => {
      window.print();
    };

    return(
        <div className='animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10'>
            <div className='flex flex-col justify-start mb-8 gap-2'>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">REKAP BARANG KELUAR</h1>
                <p className="text-gray-500 text-sm">Arsip pencatatan riwayat pengeluaran fisik barang dari gudang</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Total Bahan Baku Keluar</p>
                    {/* <p className="text-2xl font-bold text-gray-900 mt-1">
                        {totalInboundUnit.toLocaleString('id-ID')} Qty / {filteredData.length} Transaksi
                    </p> */}
                </div>
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Total Pengeluaran Item WIP</p>
                    {/* <p className="text-2xl font-bold text-blue-600 mt-1">
                        {totalSupplierUnit.toLocaleString('id-ID')} Qty ({filteredData.filter((d) => d.sumberInbound === 'SUPPLIER').length} Transaksi)
                    </p> */}
                </div>
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Total Barang Jadi Keluar</p>
                    {/* <p className="text-2xl font-bold text-green-600 mt-1">
                        {totalProduksiUnit.toLocaleString('id-ID')} Qty ({filteredData.filter((d) => d.sumberInbound === 'PRODUKSI').length} Transaksi)
                    </p> */}
                </div>
            </div>
            
            <div className='flex flex-wrap justify-between items-center bg-white p-4 border border-gray-200 rounded-lg shadow-sm gap-4 mt-5'>
                <div className="flex flex-wrap gap-3 items-center">
                    <div>
                        <label className="block text-xs text-black mb-1">Pencarian</label>
                        <span className="relative flex items-center w-60">
                        <input
                            type="text"
                            placeholder="Cari Client, SPK, Item, atau Penerima" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="border border-gray-300 rounded-md pl-3 pr-10 py-1.5 text-sm w-full bg-white text-black placeholder:text-gray focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button className="absolute right-2 flex items-center justify-center">
                            <Search className="text-black w-4 h-4" />
                        </button>
                        </span>
                    </div>

                    <div>
                        <label className="block text-xs text-black mb-1">Asal Gudang</label>
                        <select
                        value={filterSumber}
                        onChange={(e) => setFilterSumber(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500c text-black"
                        >
                        <option value="ALL" className='text-black'>Semua Jenis Gudang</option>
                        <option value="BahanBaku" className='text-black'>Gudang Bahan Baku</option>
                        <option value="WIP" className='text-black'>Gudang WIP</option>
                        <option value="BarangJadi" className='text-black'>Gudang Barang Jadi</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-black mb-1">Tujuan / Penerima</label>
                        <select
                        value={filterSumber}
                        onChange={(e) => setFilterSumber(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500c text-black"
                        >
                        <option value="ALL" className='text-black'>Semua Penerima</option>
                        <option value="Produksi" className='text-black'>Tukang / Produksi</option>
                        <option value="Klien" className='text-black'>Klien</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-black mb-1">Periode Tanggal</label>
                        <div className="flex gap-2 items-center">
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white text-black"
                        />
                        </div>
                    </div>
                </div>   
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-sm mt-5">
                <div className="flex gap-2 items-end justify-between">
                    <div className="flex gap-2 items-end m-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase m-2">Tabel Rekap Barang Keluar</p>
                    </div>
                    <div className="flex gap-2 items-end m-2">
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                            title="Export Data ke CSV"
                            >
                            <FileUp className="w-4 h-4" />
                            <span className="hidden sm:inline">Export</span>
                            </button>
                            <button
                            onClick={handlePrintPDF}
                            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                            title="Print Data ke PDF"
                            >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Print PDF</span>
                        </button>
                    </div>
                </div>
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-100 font-semibold text-gray-700">
                    <tr>
                        <th className="px-4 py-3 text-center w-12">No</th>
                        <th className="px-4 py-3 text-left">Informasi Barang</th>
                        <th className="px-4 py-3 text-left">Asal Gudang</th>
                        <th className="px-4 py-3 text-left">Tujuan / Penerima</th>
                        <th className="px-4 py-3 text-right">SPK</th>
                        <th className="px-4 py-3 text-center">Tanggal</th>
                        <th className="px-4 py-3 text-center">Jumlah</th>
                        <th className="px-4 py-3 text-center">Aksi</th>
                    </tr>
                </thead>
                    <tbody className="divide-y divide-gray-200">
                        {isLoading ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                <div className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                    <span>Memuat data laporan barang masuk...</span>
                                </div>
                                </td>
                            </tr>
                            ) : errorMessage ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-red-500">
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <AlertCircle className="w-6 h-6 text-red-500" />
                                    <span className="font-semibold">{errorMessage}</span>
                                    <span className="text-xs text-gray-400">Pastikan server backend sudah menyala dan endpoint laporan sudah tersedia.</span>
                                </div>
                                </td>
                            </tr>
                            ) : filteredData.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                Tidak ada data penerimaan barang masuk ditemukan.
                                </td>
                            </tr>
                        ) : (
                        filteredData.map((item, index) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-center text-gray-500">{index + 1}</td>
                            <td className="px-4 py-3 text-gray-700 font-medium">{item.namaBarang}</td>
                            <td className="px-4 py-3 font-mono font-semibold text-blue-600">
                                {item.asalGudang}
                            </td>
                            <td className="px-4 py-3">
                                <span className="font-medium text-gray-900">{item.tujuanPenerima}</span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-gray-800">
                                {item.noSPK} 
                            </td>
                            <td className="px-4 py-3 text-center">
                                {item.tanggal}
                            </td>
                            <td className="px-4 py-3 text-center">
                                {item.jumlah}
                            </td>
                            <td className="px-4 py-3 text-center">
                                <button
                                onClick={() => setSelectedDetail(item)}
                                className="flex-1 lg:flex-none flex items-center justify-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded border border-blue-200 transition-colors"
                                >
                                <Eye className='h-4 w-4'></Eye>
                                <span>View Detail</span>
                                </button>
                            </td>
                            </tr>
                        ))
                        )}
                    </tbody>
                </table>

                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
                    {/* <div>
                      Menampilkan <span className="font-semibold text-gray-900">1</span> sampai <span className="font-semibold text-gray-900">{filteredData.filter(i=>i.no).length}</span> dari <span className="font-semibold text-gray-900">{filteredData.filter(i=>i.no).length}</span> data
                    </div> */}
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
    )
}