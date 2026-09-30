"use client";

import React, { useState } from "react";
import { Search, Loader2, Eye, AlertCircle} from "lucide-react";
import type { RekapStokOpname } from "../types";

export default function RekapStokOpname() {

    const [searchQuery, setSearchQuery] = useState("");
    const [filterDate, setFilterDate] = useState<string>('2026-09-01');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [selectedDetail, setSelectedDetail] = useState<RekapStokOpname | null>(null);

    const [data, setData] = useState<RekapStokOpname[]>([]);
    const filteredData = data;

    return(
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <div className="flex flex-col justify-start mb-8 gap-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">REKAP STOK OPNAME</h1>
                <p className="text-gray-500 text-sm">Monitor dan kelola jumlah barang sistem dan fisik.</p>
            </div>

            <div className='flex flex-wrap justify-between items-center bg-white p-4 border border-gray-200 rounded-lg shadow-sm gap-4 mt-5 block'>
                <div className="flex flex-wrap gap-3 items-center">
                    <div>
                        <label className="block text-xs text-black mb-1">Pencarian</label>
                        <span className="relative flex items-center w-60">
                        <input
                            type="text"
                            placeholder="Cari Auditor, Nama" 
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
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white text-black"
                        />
                        </div>
                    </div>
                </div>
            </div>
            <div>
                <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-sm mt-5">
                    <div className="flex gap-2 items-end justify-between">
                        <div className="flex gap-2 items-end m-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase m-2">Tabel Rekap Stok Opname</p>
                        </div>                    
                    </div>
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-100 font-semibold text-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-center w-12">No</th>
                                <th className="px-4 py-3 text-left">Stock Opname</th>
                                <th className="px-4 py-3 text-center">Tanggal</th>
                                <th className="px-4 py-3 text-center">Auditor</th>
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
                            <td className="px-4 py-3 text-gray-700 font-medium">{item.namaRekap}</td>
                            <td className="px-4 py-3 font-mono font-semibold text-blue-600">
                                {item.tanggal}
                            </td>
                            <td className="px-4 py-3">
                                <span className="font-medium text-gray-900">{item.auditor}</span>
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
                </div>
            </div>
        </div>
    )
}