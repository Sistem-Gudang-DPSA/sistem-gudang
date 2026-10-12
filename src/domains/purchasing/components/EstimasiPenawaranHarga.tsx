"use client"

import { useCan } from "@/domains/auth/user-context";
import { fetchPermintaanList } from "@/domains/ppic/data/pembelian";
import { countActiveFilters, emptyBarangFilters } from "@/domains/superadmin/components/BarangFilterPanel";
import DateFilter from "@/shared/components/DateFilter";
import Pagination from "@/shared/components/Pagination";
import SortableTh, { useSort } from "@/shared/components/SortableTh";
import { ExportExcellButton } from "@/shared/components/Tombol";
import { useApiData } from "@/shared/lib/use-api-data";
import { Filter, Plus, Search } from "lucide-react"
import Link from "next/link";
import { useState } from "react";



export default function EstimasiPenawaranHarga() {
    const canCreate = useCan("penawaran.create");
    const [searchQuery, setSearchQuery] = useState('');
    const [Exporting, setExporting] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [filters, setFilters] = useState(emptyBarangFilters);
    const [filterDay, setFilterDay] = useState("");
    const [filterMonth, setFilterMonth] = useState("");
    const [filterYear, setFilterYear] = useState("");
    const filterKey = searchQuery.trim();
    const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
    const page = pageState.key === filterKey ? pageState.page : 1;
    const { sort, toggle } = useSort();
    const setPage = (next: number) => setPageState({ key: filterKey, page: next });

    const { data: result, loading, error } = useApiData(
        () => fetchPermintaanList({ page, search: filterKey }),
        `${filterKey}|${page}`,
        'Gagal memuat rekap pembelian.',
    );
    const filteredData = result?.rows ?? [];
    const total = result?.total ?? 0;

    const handleExportCSV = () => {
        setExporting(true);
        const headers = ['No,Kode Barang,Nama Barang,Supplier,Jumlah Stok,Satuan,Kategori,Harga,Lokasi'];
        const csvData = filteredData.map((item, index) =>
            `${index + 1},${item.tanggal ?? '-'},"${item.nama}"`
        );
        const csvString = [...headers, ...csvData].join('\n');

        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'Data_Barang_Purchasing.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <div className="flex items-center gap-3 mb-4">
                <h1 className="text-[18px] font-extrabold text-black tracking-wide">Estimasi Penawaran Harga Pembelian</h1>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="relative w-full max-w-md mb-2">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            maxLength={100}
                            placeholder="Cari"
                            aria-label="Cari pembelian"
                            className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                        />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-800 pointer-events-none" />
                    </div>

                    <div className="flex items-center gap-2">
                        <ExportExcellButton onClick={handleExportCSV} disabled={Exporting || loading || filteredData.length === 0} />
                        <button
                            type="button"
                            onClick={() => setShowFilter((v) => !v)}
                            aria-expanded={showFilter}
                            className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors text-sm font-medium ${showFilter || countActiveFilters(filters) > 0 ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            <Filter className="w-4 h-4" />
                            <span>Filter{countActiveFilters(filters) > 0 ? ` (${countActiveFilters(filters)})` : ''}</span>
                        </button>
                        {canCreate && (
                            <Link
                                href="/dashboard/purchasing/transaksi/penawaran-harga/baru"
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#ff8a00] text-white rounded-lg hover:bg-[#eb7d00] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Buat Penawaran Baru
                            </Link>
                        )}
                    </div>
                </div>

                {showFilter && (
                    <DateFilter
                        day={filterDay}
                        month={filterMonth}
                        year={filterYear}
                        onDayChange={setFilterDay}
                        onMonthChange={setFilterMonth}
                        onYearChange={setFilterYear}
                        onReset={() => { setFilterDay(''); setFilterMonth(''); setFilterYear(''); }}
                    />
                )}

                {error && (
                    <div className="mx-5 mt-5 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
                            <tr>
                                <SortableTh label="No. Order" sortKey="orderId" sort={sort} onSort={toggle} />
                                <SortableTh label="Nama CLient" sortKey="clientName" sort={sort} onSort={toggle} />
                                <SortableTh label="Status" sortKey="status" sort={sort} onSort={toggle} />
                                <th scope="col" className="px-6 py-4">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading && (
                                <tr><td colSpan={4} className="px-6 py-6 text-center text-gray-400">Memuat data...</td></tr>
                            )}
                            {!loading && filteredData.length === 0 && (
                                <tr><td colSpan={4} className="px-6 py-6 text-center text-gray-400">Belum ada data Penawaran.</td></tr>
                            )}
                            {!loading && filteredData.map((item, index) => (
                                <tr key={item.id} className="hover:bg-purple-50/30 transition-colors group">
                                    <td className="px-6 py-4 text-gray-500">{(page - 1) * 20 + index + 1}</td>

                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900"></span>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900"></span>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900"></span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
            </div>
        </div>
    )
}