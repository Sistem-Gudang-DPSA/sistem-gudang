"use client";

import React, { useState } from "react";
import { Search, Loader2, Eye, AlertCircle} from "lucide-react";
import { getStockOpname, listStockOpname } from "@/domains/gudang/api";
import { displayDate } from "@/domains/gudang/date";
import type { StockOpnameDetail } from "@/domains/gudang/types";
import { ApiError } from "@/shared/lib/api-client";
import { useApiData } from "@/shared/lib/use-api-data";

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function RekapStokOpname() {

    const [searchQuery, setSearchQuery] = useState("");
    const [filterDate, setFilterDate] = useState<string>("");
    const [selectedDetail, setSelectedDetail] = useState<StockOpnameDetail | null>(null);
    const [actionError, setActionError] = useState("");

    // Stock opname is per month, so the date input narrows to that month and year.
    const filters = {
        search: searchQuery || undefined,
        year: filterDate ? Number(filterDate.slice(0, 4)) : undefined,
        month: filterDate ? Number(filterDate.slice(5, 7)) : undefined,
    };

    // ponytail: loads first 100 rows only, add real pagination when the list outgrows it
    const { data: report, loading: isLoading, error: errorMessage } = useApiData(
        () => listStockOpname({ ...filters, pageSize: 100 }),
        JSON.stringify(filters),
        "Gagal memuat rekap stok opname.",
    );
    const filteredData = report?.rows ?? [];

    const openDetail = async (id: number) => {
        setActionError("");
        try {
            setSelectedDetail(await getStockOpname(id));
        } catch (err) {
            setActionError(err instanceof ApiError ? err.message : "Gagal memuat detail stok opname.");
        }
    };

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
                            placeholder="Cari catatan stok opname" 
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
                                <th className="px-4 py-3 text-center">Dibuat</th>
                                <th className="px-4 py-3 text-center">Jumlah Barang</th>
                                <th className="px-4 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                <div className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                    <span>Memuat data rekap stok opname...</span>
                                </div>
                                </td>
                            </tr>
                            ) : errorMessage ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-red-500">
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <AlertCircle className="w-6 h-6 text-red-500" />
                                    <span className="font-semibold">{errorMessage}</span>
                                </div>
                                </td>
                            </tr>
                            ) : filteredData.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                Tidak ada data stok opname ditemukan.
                                </td>
                            </tr>
                        ) : (
                            filteredData.map((item, index) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-center text-gray-500">{index + 1}</td>
                            <td className="px-4 py-3 text-gray-700 font-medium">Stok Opname {BULAN[item.month - 1]} {item.year}</td>
                            <td className="px-4 py-3 font-mono font-semibold text-blue-600">
                                {displayDate(item.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                                <span className="font-medium text-gray-900">{item.lineCount}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                                <button
                                onClick={() => openDetail(item.id)}
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
                    {actionError && <p className="px-4 py-2 text-sm text-red-500">{actionError}</p>}
                </div>
            </div>

            {selectedDetail && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 border border-gray-100 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Stok Opname {BULAN[selectedDetail.month - 1]} {selectedDetail.year}</h3>
                            <button onClick={() => setSelectedDetail(null)} className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2">✕</button>
                        </div>
                        <table className="min-w-full text-xs">
                            <thead className="bg-gray-100 font-semibold text-gray-700">
                                <tr>
                                    <th className="px-3 py-2 text-left">Barang</th>
                                    <th className="px-3 py-2 text-center">Administrasi</th>
                                    <th className="px-3 py-2 text-center">Fisik</th>
                                    <th className="px-3 py-2 text-center">Selisih</th>
                                    <th className="px-3 py-2 text-left">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {selectedDetail.lines.map((line) => (
                                    <tr key={line.itemId}>
                                        <td className="px-3 py-2 text-gray-900">{line.itemName}<span className="block text-gray-500">{line.itemCode ?? '-'}</span></td>
                                        <td className="px-3 py-2 text-center">{line.systemQty} {line.unit}</td>
                                        <td className="px-3 py-2 text-center">{line.physicalQty} {line.unit}</td>
                                        <td className="px-3 py-2 text-center font-bold">{line.difference}</td>
                                        <td className="px-3 py-2 text-gray-600">{line.note ?? ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-6 text-right">
                            <button onClick={() => setSelectedDetail(null)} className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">Tutup</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}