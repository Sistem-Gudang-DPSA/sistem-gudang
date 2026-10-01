"use client";

import React, { useState } from "react";
import { Search, FileUp, Download, Loader2, AlertCircle  } from "lucide-react";
import * as XLSX from 'xlsx';
import type { RekapDokubahItems } from "../types";

// ponytail: dummy data, no backend endpoint yet (BE confirmed none planned). Swap for useApiData once /reports/dokubah exists.
const DUMMY_DOKUBAH: RekapDokubahItems[] = [
    { id: 1, spk: "SPK-2026-001", projectName: "PT Bintang Raya", budget: 50000000, status: "AKTIF", totalMaterialUsage: 32000000, totalOverbudget: 0, startDate: "2026-08-01", endDate: "2026-10-30" },
    { id: 2, spk: "SPK-2026-002", projectName: "CV Indo Makmur", budget: 30000000, status: "AKTIF", totalMaterialUsage: 34500000, totalOverbudget: 4500000, startDate: "2026-08-15", endDate: "2026-11-15" },
    { id: 3, spk: "SPK-2026-003", projectName: "Global Mas", budget: 75000000, status: "SELESAI", totalMaterialUsage: 71200000, totalOverbudget: 0, startDate: "2026-06-01", endDate: "2026-09-20" },
]; 

export default function RekapDokubah() {
    const [searchQuery, setSearchQuery] = useState("");
    const [startDate, setStartDate] = useState("01-01-2026"); 
    const [endDate, setEndDate] = useState("31-12-2026");
    const [filterSumber, setFilterSumber] = useState("ALL");
    const [data, setData] = useState<RekapDokubahItems[]>(DUMMY_DOKUBAH);
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
            'Nomor SPK': item.spk,
            'Nama Proyek / Klien': item.projectName,
            'Anggaran': item.budget,
            'Status SPK': item.status,
          }));
    
          const worksheet = XLSX.utils.json_to_sheet(exportData);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Dokubah');
        };
    
        const handlePrintPDF = () => {
          window.print();
        };

    return(
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <div className="flex flex-col justify-start mb-8 gap-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">REKAP DOKUBAH</h1>
                <p className="text-gray-500 text-sm">Arsip pencatatan riwayat dokubah produksi.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Total SPK Aktif</p>
                </div>
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Penggunaan Material Total</p>
                </div>
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Peringatan SPK Overbudget</p>
                </div>
            </div>

            <h3 className="font-bold tracking-tight text-gray-900 m-2 uppercase">Cari Proyek</h3>

            <div className="flex flex-wrap justify-between items-center bg-white p-4 border border-gray-200 rounded-lg shadow-sm gap-4 mt-2">
                <div className="flex flex-wrap gap-3 items-center">
                    <div>
                        <label className="block text-xs text-black mb-1">Pencarian</label>
                        <span className="relative flex items-center w-60">
                            <input
                                type="text"
                                placeholder="Cari No. SPK, Nama Proyek" 
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
                        <label className="block text-xs text-black mb-1">Status SPK</label>
                        <select
                        value={filterSumber}
                        onChange={(e) => setFilterSumber(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500c text-black"
                        >
                        <option value="ALL" className='text-black'>Semua Status</option>
                        <option value="AKTIF" className='text-black'>AKTIF</option>
                        <option value="SELESAI" className='text-black'>SELESAI</option>
                        <option value="BATAL" className='text-black'>BATAL</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-sm mt-6">
                    <div className="flex gap-2 items-end justify-between">
                        <div className="flex gap-2 items-end m-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase m-2">Tabel Rekapitulasi Dokubah</p>
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
                                <th className="px-4 py-3 text-center w-12">No. SPK</th>
                                <th className="px-4 py-3 text-center w-12">Klien &amp; Proyek</th>
                                <th className="px-4 py-3 text-center w-12">Anggaran</th>
                                <th className="px-4 py-3 text-center w-12">Realisasi</th>
                                <th className="px-4 py-3 text-center w-12">Sisa Anggaran</th>
                                <th className="px-4 py-3 text-center w-12">Status</th>
                                <th className="px-4 py-3 text-center w-12">
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
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                <div className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                    <span>Memuat data rekap dokubah...</span>
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
                                Tidak ada data dokubah ditemukan.
                                </td>
                            </tr>
                            ) : (
                            filteredData.map((item, index) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-center text-gray-500">{index + 1}</td>
                                <td className="px-4 py-3 text-gray-700 font-medium">{item.spk}</td>
                                <td className="px-4 py-3 font-mono font-semibold text-blue-600">{item.projectName}</td>
                                <td className="px-4 py-3">
                                    <span className="font-medium text-gray-900">{item.budget}</span>
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-gray-800">
                                    {item.totalMaterialUsage}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className="font-medium text-gray-900">{item.status}</span>
                                </td>
                                <td className="px-4 py-3 text-center print:hidden">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" 
                                        checked={selectedIds.has(item.id)}
                                        onChange={() => handleSelectRow(item.id)}
                                    />
                                </td>
                                </tr>
                            ))
                            )}
                        </tbody>
                    </table>
            </div>
        </div>
    )
}