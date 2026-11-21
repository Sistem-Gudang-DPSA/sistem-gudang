"use client";

import { useAuthUser, useCan } from '@/domains/auth/user-context';
import React, { useState } from 'react';
import { Search, Plus, Eye, Filter } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { gudangBasePath } from '../base-path';
import { getStockOpname, listStockOpname } from '@/domains/inventory/api';
import { ApiError } from '@/shared/lib/api-client';
import { useApiData } from '@/shared/lib/use-api-data';
import { opnameDraftKey, readOpnameDraft } from '../stock-opname-draft';
import Pagination from '@/shared/components/Pagination';
import SortableTh, { useSort } from '@/shared/components/SortableTh';
import DateFilter from '@/shared/components/DateFilter';
import { ExportExcellButton } from '@/shared/components/Tombol';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const periodeLabel = (month: number, year: number) => `Stok Opname ${BULAN[month - 1]} ${year}`;

export default function StockOpnameMasterGudang() {
  const canCreate = useCan('stock-opname.create');
  const base = gudangBasePath(usePathname());
  const draftKey = opnameDraftKey(base, useAuthUser()?.id);
  const { data: draft, error: draftError } = useApiData(() => Promise.resolve().then(() => canCreate ? readOpnameDraft(draftKey) : null), draftKey, 'Gagal memuat draft dari browser.');
  const { sort, toggle, params: sortParams } = useSort();
  const [showFilter, setShowFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const activeDateFilters = [filterMonth, filterYear].filter(Boolean).length;

  const [actionError, setActionError] = useState('');

  const filterKey = JSON.stringify([searchQuery, filterMonth, filterYear, sortParams]);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const viewKey = `${filterKey}|${page}`;
  const [selState, setSelState] = useState<{ key: string; ids: Set<number> }>({ key: viewKey, ids: new Set() });
  const selected = selState.key === viewKey ? selState.ids : new Set<number>();
  const setPage = (next: number) => setPageState({ key: filterKey, page: next });
  const setSelected = (ids: Set<number>) => setSelState({ key: viewKey, ids });
  const { data: result, loading, error } = useApiData(
    () => listStockOpname({ page, pageSize: 20, search: searchQuery || undefined, month: filterMonth ? Number(filterMonth) : undefined, year: filterYear ? Number(filterYear) : undefined, ...sortParams }),
    `${filterKey}|${page}`,
    'Gagal memuat data stok opname.',
  );
  const rows = result?.rows ?? [];
  const total = result?.total ?? 0;
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggleRow = (id: number) =>
    setSelected((() => {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    })());

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

  const handleExportExcel = async () => {
    if (selected.size === 0) {
      setActionError("Pilih data stok opname yang ingin diekspor.");
      return;
    }
    setActionError("");

    try {
      const XLSX = await import("xlsx");
      const details = await Promise.all([...selected].map((id) => getStockOpname(id)));
      const headers = [
        "No",
        "Kode Barang",
        "Nama Barang",
        "Satuan",
        "Kategori",
        "Jumlah di Sistem",
        "Jumlah Fisik",
        "Selisih",
        "Keterangan",
      ];

      // Membuat workbook
      const workbook = XLSX.utils.book_new();

      // Satu sheet per periode terpilih
      for (const detailData of details) {
        const rows = detailData.lines.map((line, index) => [
          index + 1,
          line.itemCode ?? "-",
          line.itemName,
          line.unit,
          line.category,
          line.systemQty,
          line.physicalQty,
          line.difference,
          line.note ?? "-",
        ]);

        // Membuat worksheet dari header dan data
        const worksheet = XLSX.utils.aoa_to_sheet([
          headers,
          ...rows,
        ]);

        // Mengatur lebar setiap kolom
        worksheet["!cols"] = [
          { wch: 6 },
          { wch: 18 },
          { wch: 30 },
          { wch: 12 },
          { wch: 20 },
          { wch: 20 },
          { wch: 16 },
          { wch: 12 },
          { wch: 30 },
        ];

        // Nama sheet maksimal 31 karakter dan harus unik; id menjaga dua opname di bulan yang sama
        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          `Opname ${detailData.month}-${detailData.year} #${detailData.id}`
        );
      }

      // Mengunduh file XLSX asli
      const first = details[0];
      XLSX.writeFile(workbook, details.length === 1 ? `Stok_Opname_Bulan_${first.month}_${first.year}.xlsx` : "Stok_Opname.xlsx");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Gagal mengekspor data stok opname.");
    }
  };

  
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col justify-start mb-8 gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">DATA STOK OPNAME</h1>
        <p className="text-gray-500 text-sm">Kelola riwayat pemeriksaan berkala stok inventaris gudang.</p>
      </div>

      {draftError && <p role="alert" className="mb-4 text-sm text-red-600">{draftError}</p>}
      {canCreate && draft && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div><p className="font-semibold text-amber-900">Draft: {periodeLabel(Number(draft.month), Number(draft.year))}</p><p className="mt-1 text-sm text-amber-800">{draft.rows.length} barang diisi. Tersimpan di browser ini, belum mengubah stok.</p></div>
          <Link href={`${base}/transaksi/stock-opname/tambah`} className="rounded-lg bg-amber-100 px-4 py-2 text-sm font-bold text-amber-900 hover:bg-amber-200">Lanjutkan Draft</Link>
        </div>
      )}
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
                value={searchQuery}
                maxLength={100}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all shadow-sm"
                placeholder="Cari periode stok opname..."
              />
            </div>
          </div>

          <div className="flex gap-2 w-full lg:w-auto">
            <ExportExcellButton onClick={handleExportExcel} disabled={rows.length===0}/>
            {canCreate && <Link href={`${base}/transaksi/stock-opname/tambah`} className="w-full lg:w-auto">
              <button className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm shrink-0 w-full">
                <Plus className="w-4 h-4" />
                <span>Tambah Data</span>
              </button>
            </Link>}

            <button
              type="button"
              onClick={() => setShowFilter((v) => !v)}
              aria-expanded={showFilter}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors text-sm font-medium ${showFilter || activeDateFilters > 0 ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <Filter className="w-4 h-4" />
              <span>Filter{activeDateFilters > 0 ? ` (${activeDateFilters})` : ''}</span>
            </button>
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
            showDay={false}
          />
        )}

        {actionError && <p className="px-6 pt-3 text-sm text-red-500">{actionError}</p>}

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th scope="col" className="px-4 py-4 print:hidden w-12">
                  <input type="checkbox" aria-label="Pilih semua stok opname di halaman ini" checked={allSelected} onChange={toggleAll} className="w-4 h-4 accent-blue-600 cursor-pointer" />
                </th>
                <th scope="col" className="px-6 py-4 w-16 text-center">No</th>
                <SortableTh label='Periode Stock Opname' sortKey='period' sort={sort} onSort={toggle} />
                <th scope="col" className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400">Memuat data...</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-red-500">{error}</td></tr>
              )}
              {!loading && !error && rows.map((item, index) => (
                <tr key={item.id} className="hover:bg-[#FF8A00]/5 transition-colors group">
                  <td className="px-4 py-4 print:hidden w-12">
                    <input
                      type="checkbox"
                      aria-label={`Pilih ${periodeLabel(item.month, item.year)} #${item.id}`}
                      checked={selected.has(item.id)}
                      onChange={() => toggleRow(item.id)}
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-center">{index + 1}.</td>
                  <td className="px-6 py-4 font-bold text-gray-900">
                    {periodeLabel(item.month, item.year)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`${base}/transaksi/stock-opname/${item.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-50 text-blue-600 font-bold rounded-lg text-xs hover:bg-blue-100 transition-all disabled:opacity-60"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Detail
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic">
                    Data tidak ditemukan untuk filter tersebut.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
      </div>

    </div>

  );
}
