"use client";

import React, { useState } from "react";
import { Search, Loader2, Eye, AlertCircle} from "lucide-react";
import { listStockOpname } from "@/domains/inventory/api";
import { displayDate } from "@/domains/inventory/date";
import { useApiData } from "@/shared/lib/use-api-data";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Pagination from "@/shared/components/Pagination";
import SortableTh, { useSort } from "@/shared/components/SortableTh";

const PAGE_SIZE = 20;

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function RekapStokOpname() {

    const [searchQuery, setSearchQuery] = useState("");
    const [filterDate, setFilterDate] = useState<string>("");
    const pathname = usePathname();

    // Stock opname is per month, so the date input narrows to that month and year.
    const filters = {
        search: searchQuery || undefined,
        year: filterDate ? Number(filterDate.slice(0, 4)) : undefined,
        month: filterDate ? Number(filterDate.slice(5, 7)) : undefined,
    };

    const { sort, toggle, params: sortParams } = useSort();
    // a filter or sort change starts again from page 1
    const filterKey = JSON.stringify({ ...filters, ...sortParams });
    const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
    const page = pageState.key === filterKey ? pageState.page : 1;
    const setPage = (next: number) => setPageState({ key: filterKey, page: next });

    const { data: report, loading: isLoading, error: errorMessage } = useApiData(
        () => listStockOpname({ ...filters, ...sortParams, page, pageSize: PAGE_SIZE }),
        `${filterKey}|${page}`,
        "Gagal memuat rekap stok opname.",
    );
    const filteredData = report?.rows ?? [];

    return(
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <div className="flex flex-col justify-start mb-8 gap-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">REKAP STOK OPNAME</h1>
                <p className="text-gray-500 text-sm">Monitor dan kelola jumlah barang sistem dan fisik.</p>
            </div>

            <div className='flex flex-wrap justify-between items-center bg-white p-4 border border-gray-200 rounded-lg shadow-sm gap-4 mt-5'>
                <div className="flex flex-wrap gap-3 items-center">
                    <div>
                        <label className="block text-xs text-black mb-1">Pencarian</label>
                        <span className="relative flex items-center w-60">
                        <input
                            type="text"
                            placeholder="Cari Auditor, Nama" 
                            value={searchQuery}
                            maxLength={100}
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
                                <SortableTh label="Stock Opname" sortKey="period" sort={sort} onSort={toggle} className="px-4 py-3" align="left" />
                                <SortableTh label="Tanggal" sortKey="createdAt" sort={sort} onSort={toggle} className="px-4 py-3" align="center" />
                                <SortableTh label="Auditor" sortKey="createdBy" sort={sort} onSort={toggle} className="px-4 py-3" align="center" />
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
                            <td className="px-4 py-3 text-center text-gray-500">{(page - 1) * PAGE_SIZE + index + 1}</td>
                            <td className="px-4 py-3 text-gray-700 font-medium">Stok Opname {BULAN[item.month - 1]} {item.year}</td>
                            <td className="px-4 py-3 font-mono font-semibold text-blue-600" align="center">
                                {displayDate(item.createdAt)}
                            </td>
                            <td className="px-4 py-3" align="center">
                                <span className="font-medium text-gray-900">User #{item.createdBy}</span>
                            </td>
                            <td className="flex justify-center px-4 py-3 text-center">
                                <Link
                                href={`${pathname}/${item.id}`}
                                className="flex-1 lg:flex-none flex items-center justify-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded border border-blue-200 transition-colors"
                                >
                                <Eye className='h-4 w-4'></Eye>
                                <span>View Detail</span>
                                </Link>
                            </td>
                            </tr>
                        ))
                        )}  
                        </tbody>
                    </table>
                    <Pagination page={page} pageSize={PAGE_SIZE} total={report?.total ?? 0} onPageChange={setPage} />
                </div>
            </div>

        </div>
    )
}