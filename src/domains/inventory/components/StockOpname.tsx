"use client";

import { useCan } from '@/domains/auth/user-context';
import React, { useState } from 'react';
import { Search, Plus, Eye, Filter, Download } from 'lucide-react';
import Link from 'next/link';
import { getStockOpname, listStockOpname } from '@/domains/inventory/api';
import type { StockOpnameDetail } from '@/domains/inventory/types';
import { ApiError } from '@/shared/lib/api-client';
import { useApiData } from '@/shared/lib/use-api-data';
import Pagination from '@/shared/components/Pagination';
import BarangFilterPanel, { countActiveFilters, emptyBarangFilters } from '@/domains/superadmin/components/BarangFilterPanel';
import SortableTh, { useSort } from '@/shared/components/SortableTh';
import DateFilter from '@/shared/components/DateFilter';
import { toDateRange } from '@/domains/inventory/date';
import { ExportExcellButton, PrintPdfButton } from '@/shared/components/Tombol';
import * as XLSX from "xlsx";

const escapeHtml = (value: unknown) =>
  String(value ?? "-").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]!);

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const periodeLabel = (month: number, year: number) => `Stok Opname ${BULAN[month - 1]} ${year}`;

export default function StockOpnameMasterGudang() {
  const canCreate = useCan('stock-opname.create');
  const { sort, toggle, params: sortParams } = useSort();
  const [filters, setFilters] = useState(emptyBarangFilters);
  const [showFilter, setShowFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const [detail, setDetail] = useState<StockOpnameDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [actionError, setActionError] = useState('');

  const dateRange = toDateRange(filterDay, filterMonth, filterYear);

  const filterKey = JSON.stringify([searchQuery, filterDay, filterMonth, filterYear]);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const viewKey = `${filterKey}|${page}`;
  const [selState, setSelState] = useState<{ key: string; ids: Set<number> }>({ key: viewKey, ids: new Set() });
  const selected = selState.key === viewKey ? selState.ids : new Set<number>();
  const setPage = (next: number) => setPageState({ key: filterKey, page: next });
  const setSelected = (ids: Set<number>) => setSelState({ key: viewKey, ids });
  const { data: result, loading, error } = useApiData(
    () => listStockOpname({ page, pageSize: 20, search: searchQuery || undefined, month: filterMonth ? Number(filterMonth) : undefined, year: filterYear ? Number(filterYear) : undefined }),
    `${filterKey}|${page}`,
    'Gagal memuat data stok opname.',
  );
  const rows = result?.rows ?? [];
  const total = result?.total ?? 0;
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    setDetailError("");
    try {
      setDetail(await getStockOpname(id));
    } catch (err) {
      setDetailError(err instanceof ApiError ? err.message : "Gagal memuat detail stok opname.");
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleRow = (id: number) =>
    setSelected((() => {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    })());

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

  const handleExportExcel = async () => {
    const id = selected.values().next().value;
    if (id === undefined) {
      alert("Pilih data stok opname yang ingin diekspor.");
      return;
    }

    try {
      const detailData = await getStockOpname(id);

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

      // Membuat workbook
      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Stok Opname"
      );

      // Mengunduh file XLSX asli
      XLSX.writeFile(
        workbook,
        `Stok_Opname_Bulan_${detailData.month}_${detailData.year}.xlsx`
      );
    } catch (err) {
      alert(
        err instanceof ApiError
          ? err.message
          : "Gagal mengekspor data stok opname."
      );
    }
  };

  
  const handlePrintPdf = async (id: number) => {
    const item = rows.find((item) => Number(item.id) === Number(id));

    if (!item) {
      setActionError("Data stok opname tidak ditemukan.");
      return;
    }

    const win = window.open("", "_blank");

    if (!win) {
      setActionError(
        "Pop-up diblokir browser. Izinkan pop-up untuk mencetak PDF."
      );
      return;
    }

    setActionError("");

    try {
      // Ambil detail hanya untuk ID yang diklik
      const detailData = await getStockOpname(id);

      const period = periodeLabel(
        detailData.month,
        detailData.year
      );

      const lines = detailData.lines.map((line, index) => `
        <tr>
          <td class="center">${index + 1}</td>
          <td>${escapeHtml(line.itemCode ?? "-")}</td>
          <td>${escapeHtml(line.itemName)}</td>
          <td class="center">${escapeHtml(line.unit)}</td>
          <td>${escapeHtml(line.category)}</td>
          <td class="center">${escapeHtml(line.systemQty)}</td>
          <td class="center">${escapeHtml(line.physicalQty)}</td>
          <td class="center">${escapeHtml(
            line.difference > 0
              ? `+${line.difference}`
              : line.difference
          )}</td>
          <td>${escapeHtml(line.note ?? "-")}</td>
        </tr>
      `).join("");

      win.document.write(`<!doctype html>
        <html lang="id">
        <head>
          <meta charset="utf-8">
          <title>Stok Opname ${escapeHtml(period)}</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body {
              font-family: Arial, sans-serif;
              color: #111;
              font-size: 11px;
            }
            h1 { font-size: 20px; }
            h2 { font-size: 15px; }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
            }
            th, td {
              border: 1px solid #999;
              padding: 6px;
              text-align: left;
              vertical-align: top;
            }
            th { background: #eee; }
            .center { text-align: center; }
            .meta { color: #444; }
            tr { page-break-inside: avoid; }
          </style>
        </head>
        <body>
          <h1>Rekap Stok Opname</h1>
          <h2>${escapeHtml(period)}</h2>
          <p class="meta">ID Stok Opname: ${escapeHtml(id)}</p>
          ${
            detailData.notes
              ? `<p class="meta">Catatan: ${escapeHtml(detailData.notes)}</p>`
              : ""
          }
          <table>
            <thead>
              <tr>
                <th class="center">No</th>
                <th>Kode Barang</th>
                <th>Nama Barang</th>
                <th class="center">Satuan</th>
                <th>Kategori</th>
                <th class="center">Jumlah Sistem</th>
                <th class="center">Jumlah Fisik</th>
                <th class="center">Selisih</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${
                lines ||
                '<tr><td colspan="9" class="center">Tidak ada detail barang.</td></tr>'
              }
            </tbody>
          </table>
        </body>
        </html>`);

      win.document.close();

      // Cetak setelah dokumen selesai dimuat
      win.onload = () => win.print();
    } catch (err) {
      win.close();
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Gagal menyiapkan dokumen cetak stok opname."
      );
    }
  };



  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col justify-start mb-8 gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">DATA STOK OPNAME</h1>
        <p className="text-gray-500 text-sm">Kelola riwayat pemeriksaan berkala stok inventaris gudang.</p>
      </div>

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
            {canCreate && <Link href="/dashboard/gudang/transaksi/stock-opname/tambah" className="w-full lg:w-auto">
              <button className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm shrink-0 w-full">
                <Plus className="w-4 h-4" />
                <span>Tambah Data</span>
              </button>
            </Link>}

            {/* <button
              type="button"
              onClick={() => setShowFilter((v) => !v)}
              aria-expanded={showFilter}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors text-sm font-medium ${showFilter || countActiveFilters(filters) > 0 ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <Filter className="w-4 h-4" />
              <span>Filter{countActiveFilters(filters) > 0 ? ` (${countActiveFilters(filters)})` : ''}</span>
            </button> */}
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

        {detailError && <p className="px-6 pt-3 text-sm text-red-500">{detailError}</p>}

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th scope="col" className="px-6 py-4 w-16 text-center">No</th>
                <SortableTh label='Periode Stock Opname' sortKey='periode' sort={sort} onSort={toggle} />
                <th scope="col" className="px-6 py-4 text-center">Aksi</th>
                <th scope="col" className="px-6 py-4 text-center print:hidden w-24">
                  <div className="flex items-center justify-center gap-2">
                    <span>Check</span>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 accent-blue-600 cursor-pointer" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={3} className="px-6 py-10 text-center text-gray-400">Memuat data...</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={3} className="px-6 py-10 text-center text-red-500">{error}</td></tr>
              )}
              {!loading && !error && rows.map((item, index) => (
                <tr key={item.id} className="hover:bg-[#FF8A00]/5 transition-colors group">
                  <td className="px-6 py-4 text-gray-500 text-center">{index + 1}.</td>
                  <td className="px-6 py-4 font-bold text-gray-900">
                    {periodeLabel(item.month, item.year)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openDetail(item.id)}
                        disabled={detailLoading}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-50 text-blue-600 font-bold rounded-lg text-xs hover:bg-blue-100 transition-all disabled:opacity-60"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Detail
                      </button>
                      <button
                        type='button'
                        onClick={() => handlePrintPdf(item.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-orange-50 text-orange-600 font-bold rounded-lg text-xs hover:bg-blue-100 transition-all disabled:opacity-60"
                      >
                        <Download className='h-3.5 w-3.5'/>
                        Download
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center print:hidden w-24">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleRow(item.id)}
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                      />
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
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-225 max-h-[90vh] overflow-y-auto p-8 relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[20px] font-extrabold text-gray-900 uppercase">{periodeLabel(detail.month, detail.year)}</h2>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2">✕</button>
            </div>
            {detail.notes && <p className="text-sm text-gray-600 mb-4">{detail.notes}</p>}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Barang</th>
                    <th className="px-4 py-3">Satuan</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3 text-center">Sistem</th>
                    <th className="px-4 py-3 text-center">Fisik</th>
                    <th className="px-4 py-3 text-center">Selisih</th>
                    {/* <th className="px-4 py-3 text-right">Harga</th> */}
                    <th className="px-4 py-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detail.lines.map((line) => (
                    <tr key={line.itemId}>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{line.itemName}</span>
                        <span className="block text-xs font-mono text-gray-500">{line.itemCode ?? '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{line.unit}</td>
                      <td className="px-4 py-3 text-gray-600">{line.category}</td>
                      <td className="px-4 py-3 text-center">{line.systemQty}</td>
                      <td className="px-4 py-3 text-center font-bold">{line.physicalQty}</td>
                      <td className={`px-4 py-3 text-center font-bold ${line.difference < 0 ? 'text-red-600' : line.difference > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                        {line.difference > 0 ? `+${line.difference}` : line.difference}
                      </td>
                      {/* <td className="px-4 py-3 text-right">{rupiah(line.physicalPrice)}</td> */}
                      <td className="px-4 py-3 text-gray-600">{line.note ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 text-right">
              <button onClick={() => setDetail(null)} className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}
