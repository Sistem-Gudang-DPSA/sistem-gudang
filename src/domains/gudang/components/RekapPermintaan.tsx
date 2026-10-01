"use client";

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import type { RekapPermintaanItems } from '../types';

import { Search, FileUp, Download, Eye, Square, Loader2, AlertCircle } from 'lucide-react';

export default function RekapPermintaan(){
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filterSumber, setFilterSumber] = useState<string>('ALL');
    const [startDate, setStartDate] = useState<string>('2026-09-01');
    const [endDate, setEndDate] = useState<string>('2026-09-26');
    const [data, setData] = useState<RekapPermintaanItems[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

    const filteredData = data;
    const isAllSelected = filteredData.length > 0 && selectedIds.size === filteredData.length;

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredData.map((item) => item.id)));
        }
    };

    const handleSelectRow = (id: string | number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleExportCSV = () => {
              const exportData = filteredData.map((item, index) => ({
                'No': index + 1,
                'Nomor SPK': item.noSPK,
                'Nama Proyek / Klien': item.namaKlien,
                'Tanggal': item.tanggal,
                'Group Tukang': item.grupTukang,
                'Item Produksi': item.itemProduksi
              }));
        
              const worksheet = XLSX.utils.json_to_sheet(exportData);
              const workbook = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Dokubah');
            };
        
    const handlePrintPDF = () => {
        window.print();
    };

    return(
        <div className='animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10'>
            <div className='flex flex-col justify-start mb-8 gap-2'>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">REKAP PERMINTAAN</h1>
                <p className="text-gray-500 text-sm">Kelola pengajuan permintaan pengeluaran bahan & barang dari gudang.</p>
            </div>

            <div className="flex flex-wrap justify-between items-center bg-white p-4 border border-gray-200 rounded-lg shadow-sm gap-4 mt-5">
                <div className="flex flex-wrap gap-3 items-center">
                    <div>
                        <label className="block text-xs text-black mb-1">Cari Permintaan</label>
                        <span className="relative flex items-center w-100">
                            <input
                            type="text"
                            placeholder="Cari SPK, Proyek, Tukang" 
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
                        <label className="block text-xs text-black mb-1">Status Permintaan</label>
                        <select
                        value={filterSumber}
                        onChange={(e) => setFilterSumber(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500c text-black"
                        >
                        <option value="ALL" className='text-black'>Semua Status</option>
                        <option value="SELESAI" className='text-black'>Selesai</option>
                        <option value="PROSES" className='text-black'>Menunggu Proses</option>
                        <option value="PENDING" className='text-black'>Menunggu PPIC</option>
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
                </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-sm mt-5">
                <div className="flex gap-2 items-end justify-between">
                    <div className="flex gap-2 items-end m-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase m-2">Tabel Rekap Permintaan Barang</p>
                    </div>
                    <div className="flex gap-2 items-end m-2 print:hidden">
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
                        <th className="px-4 py-3 text-left">Tgl Permintaan</th>
                        <th className="px-4 py-3 text-left">SPK</th>
                        <th className="px-4 py-3 text-left">Nama Klien</th>
                        <th className="px-4 py-3 text-right">Item Produksi</th>
                        <th className="px-4 py-3 text-center">Group Tukang</th>
                        <th className="px-4 py-3 text-center">Aksi</th>
                        <th className="flex px-4 py-3 text-center">
                            <div className="flex items-center justify-center">Check
                                <input 
                                    type="checkbox" 
                                    className="ml-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    checked={isAllSelected}
                                    onChange={handleSelectAll}
                                />
                            </div>
                        </th>                        
                        </tr>
                    </thead>
                    <tbody>
                        {
                            isLoading ? (
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
                                filteredData.map((item, index)=> (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-center text-gray-500">{index + 1}</td>
                                        <td className="px-4 py-3 text-center text-gray-500">{item.tanggal}</td>
                                        <td className="px-4 py-3 text-center text-gray-500">{item.noSPK}</td>
                                        <td className="px-4 py-3 text-center text-gray-500">{item.namaKlien}</td>
                                        <td className="px-4 py-3 text-center text-gray-500">{item.itemProduksi}</td>
                                        <td className="px-4 py-3 text-center text-gray-500">{item.grupTukang}</td>
                                        <td className="px-4 py-3 text-center text-gray-500">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" 
                                                checked={selectedIds.has(item.id)}
                                                onChange={() => handleSelectRow(item.id)}
                                            />
                                        </td>
                                    </tr>
                                ))  
                            )
                        }
                    </tbody>
                </table>
            </div>
        </div>
    )
}