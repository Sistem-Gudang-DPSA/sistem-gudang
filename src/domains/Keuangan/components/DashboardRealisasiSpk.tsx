"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, Search } from 'lucide-react';
import { formatRupiah } from '@/domains/ppic/data/dokubah';
import { toDateRange } from '@/domains/inventory/date';
import { SUMBER_DATA_NOTICE, loadRealisasiList, periodeLabel, realisasiSpkDetailPath, type RealisasiListRow, type StatusRealisasi } from '@/domains/inventory/components/RealisasiSPK';
import { exportRealisasiExcel, openPrintWindow, printRealisasiPdf } from '@/shared/components/ExportRealisasi';
import { useApiData } from '@/shared/lib/use-api-data';
import { useDebouncedValue } from '@/shared/lib/use-debounced-value';
import { usePage } from '@/shared/lib/use-page';
import Pagination from '@/shared/components/Pagination';
import SortableTh, { useSort } from '@/shared/components/SortableTh';
import DateFilter from '@/shared/components/DateFilter';
import { ExportExcellButton, PrintPdfButton } from '@/shared/components/Tombol';

const PAGE_SIZE = 20;
const cellClass = 'px-4 py-3 border-b border-r border-gray-300';
const cardClass = 'bg-white rounded-sm border border-gray-100 shadow-md p-6 min-h-32';
const checkboxClass = 'w-4 h-4 accent-[#FF8A00] cursor-pointer disabled:cursor-not-allowed';

const statusBadge = (s: StatusRealisasi | null) => s === null ? <span className="text-gray-400">-</span> : (
  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${s === 'Untung' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
    {s}
  </span>
);

export default function RealisasiSpk() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery);
  const [showFilter, setShowFilter] = useState(false);
  const [filterDay, setFilterDay] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [selected, setSelected] = useState(() => new Map<string, RealisasiListRow>()); // lintas halaman
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const { sort, toggle, params: sortParams } = useSort();
  const activeCount = [filterDay, filterMonth, filterYear].filter(Boolean).length;
  const periode = periodeLabel(filterDay, filterMonth, filterYear);

  // Data diambil sekali per periode, lalu dicari, diurutkan, dan dipaginasi di sini (jumlah SPK kecil).
  const range = toDateRange(filterDay, filterMonth, filterYear);
  const { data: semua, loading, error } = useApiData(
    () => loadRealisasiList(range),
    `realisasi-outbound|${JSON.stringify(range)}`,
    'Gagal memuat realisasi SPK.',
  );
  const q = debouncedSearch.trim().toLowerCase();
  const filtered = (semua ?? [])
    .filter((r) => !q || r.noSpk.toLowerCase().includes(q) || r.client.toLowerCase().includes(q))
    .sort((a, b) => {
      if (!sort) return 0;
      const by = sort.by as 'noSpk' | 'client' | 'realisasi';
      const d = by === 'realisasi' ? a.realisasi - b.realisasi : a[by].localeCompare(b[by]);
      return sort.dir === 'asc' ? d : -d;
    });
  const total = filtered.length;
  const [page, setPage] = usePage(`${JSON.stringify(range)}|${q}|${sortParams.sortBy ?? ''}${sortParams.sortDir ?? ''}`);
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Ringkasan atas semua SPK yang cocok dengan pencarian dan filter, bukan hanya halaman ini
  const realisasiTotal = filtered.reduce((s, r) => s + r.realisasi, 0);

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Map(prev);
      rows.forEach((r) => (allChecked ? next.delete(r.id) : next.set(r.id, r)));
      return next;
    });
  const toggleOne = (row: RealisasiListRow) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(row.id)) next.delete(row.id);
      else next.set(row.id, row);
      return next;
    });

  // Ada yang dicentang: hanya itu. Tidak ada: semua SPK sesuai pencarian dan filter, dari semua halaman.
  const jalankan = async (aksi: (data: RealisasiListRow[]) => void | Promise<void>, saatGagal?: () => void) => {
    setExporting(true);
    setExportError('');
    try {
      await aksi(selected.size > 0 ? [...selected.values()] : filtered);
    } catch {
      saatGagal?.();
      setExportError('Gagal menyiapkan data export.');
    } finally {
      setExporting(false);
    }
  };
  const handleExcel = () => jalankan((data) => exportRealisasiExcel(data, periode));
  const handlePdf = () => {
    const win = openPrintWindow(); // dibuka saat klik supaya tidak diblokir browser
    if (!win) return;
    void jalankan((data) => printRealisasiPdf(win, data, periode), () => win.close());
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <h1 className="text-[18px] font-extrabold text-black tracking-wide mb-6">Realisasi SPK</h1>

      <p role="note" className="mb-6 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg">{SUMBER_DATA_NOTICE}</p>

      {/* Ringkasan global */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
        <div className={cardClass}>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Total SPK Aktif</h2>
          <p className="text-base font-bold text-gray-900">{total} Proyek</p>
        </div>
        <div className={cardClass}>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Anggaran vs Realisasi</h2>
          <p className="text-base font-bold text-gray-900">{formatRupiah(realisasiTotal)} <span className="font-normal text-gray-500">dari anggaran (belum tersedia)</span></p>
        </div>
        <div className={cardClass}>
          <h2 className="text-lg font-bold text-gray-900 mb-3">SPK Rugi (Overbudget)</h2>
          <p className="text-base font-bold text-gray-400">- <span className="font-normal text-sm">(butuh anggaran dokubah)</span></p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative w-full max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-400" /></div>
            <input
              type="text" value={searchQuery} maxLength={100} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="No. SPK atau klien" aria-label="Cari SPK"
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all shadow-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selected.size > 0 && (
              <button type="button" onClick={() => setSelected(new Map())} className="text-xs text-orange-600 font-bold hover:underline">
                {selected.size} dicentang · Reset
              </button>
            )}
            <button
              type="button" onClick={() => setShowFilter((v) => !v)} aria-expanded={showFilter}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors text-sm font-medium ${showFilter || activeCount > 0 ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <Filter className="w-4 h-4" />
              <span>Filter{activeCount > 0 ? ` (${activeCount})` : ''}</span>
            </button>
            <ExportExcellButton onClick={handleExcel} disabled={exporting || loading || total === 0} />
            <PrintPdfButton onClick={handlePdf} disabled={exporting || loading || total === 0} />
          </div>
        </div>

        {showFilter && (
          <DateFilter
            day={filterDay} month={filterMonth} year={filterYear}
            onDayChange={setFilterDay} onMonthChange={setFilterMonth} onYearChange={setFilterYear}
            onReset={() => { setFilterDay(''); setFilterMonth(''); setFilterYear(''); }}
          />
        )}
        {exportError && <p role="alert" className="mx-5 mt-5 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{exportError}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th scope="col" className={`${cellClass} w-14`}>No.</th>
                <SortableTh label="No. SPK" sortKey="noSpk" sort={sort} onSort={toggle} className={cellClass} />
                <SortableTh label="Klien & Proyek" sortKey="client" sort={sort} onSort={toggle} className={cellClass} />
                <th scope="col" className={cellClass}>Anggaran</th>
                <SortableTh label="Realisasi" sortKey="realisasi" sort={sort} onSort={toggle} className={cellClass} />
                <th scope="col" className={cellClass}>Sisa Anggaran</th>
                <th scope="col" className={cellClass}>Status</th>
                <th scope="col" className={`${cellClass} w-24`}>
                  <label className="flex items-center justify-between gap-2 cursor-pointer">
                    <span>Check</span>
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} disabled={rows.length === 0} aria-label="Centang semua" className={checkboxClass} />
                  </label>
                </th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              {rows.map((r, i) => (
                <tr
                  key={r.id}
                  onClick={() => router.push(realisasiSpkDetailPath(r.id))}
                  className={`cursor-pointer transition-colors ${selected.has(r.id) ? 'bg-orange-50/60' : 'hover:bg-orange-50/20'}`}
                >
                  <td className={cellClass}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className={`${cellClass} font-semibold text-gray-900`}>{r.noSpk}</td>
                  <td className={cellClass}>{r.client}</td>
                  <td className={cellClass}>{r.anggaran === null ? '-' : formatRupiah(r.anggaran)}</td>
                  <td className={cellClass}>{formatRupiah(r.realisasi)}</td>
                  <td className={`${cellClass} ${(r.sisa ?? 0) < 0 ? 'text-red-600 font-semibold' : ''}`}>{r.sisa === null ? '-' : formatRupiah(r.sisa)}</td>
                  <td className={cellClass}>{statusBadge(r.status)}</td>
                  {/* Sel centang tidak ikut membuka rincian */}
                  <td className={`${cellClass} text-right cursor-default`} onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r)} aria-label={`Centang ${r.noSpk}`} className={`${checkboxClass} align-middle`} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className={`${cellClass} px-6 py-10 text-center text-gray-400 italic`}>
                    {loading ? 'Memuat data...' : error || 'Data tidak ditemukan.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}