"use client";

import React, { useState } from 'react';
import { Search, Plus, Eye, Filter, Pencil } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { gudangBasePath } from '../base-path';
import { getStockOpname, listStockOpname, openStockOpname, submitStockOpname } from '@/domains/inventory/api';
import type { StockOpnameStatus } from '@/domains/inventory/types';
import { ApiError } from '@/shared/lib/api-client';
import { useApiData } from '@/shared/lib/use-api-data';
import { fetchAllPagesResult } from '@/shared/lib/fetch-all';
import { mapConcurrent } from '@/shared/lib/map-concurrent';
import { useSelection } from '@/shared/lib/use-selection';
import SortableTh, { useSort } from '@/shared/components/SortableTh';
import DateFilter from '@/shared/components/DateFilter';
import ScrollableTable, { STICKY_HEAD_CLASS } from '@/shared/components/ScrollableTable';
import SelectAllCheckbox from '@/shared/components/SelectAllCheckbox';
import TableFooter from '@/shared/components/TableFooter';
import SelectionBanner from '@/shared/components/SelectionBanner';
import Modal from '@/shared/components/Modal';
import { ExportExcellButton } from '@/shared/components/Tombol';
import { useCan } from '@/domains/auth/user-context';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const periodeLabel = (month: number, year: number) => `Stok Opname ${BULAN[month - 1]} ${year}`;
const STATUS_LABEL: Record<StockOpnameStatus, string> = { OPEN: 'Open', SUBMITTED: 'Disubmit', POSTED: 'Diposting' };

type Props = { basePath: string; mode: 'gudang' | 'ppic' };

export function StockOpnameList({ basePath, mode }: Props) {
  const router = useRouter();
  const canOpen = useCan('stock-opname.open');
  const { sort, toggle, params: sortParams } = useSort();
  const [showFilter, setShowFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const activeDateFilters = [filterMonth, filterYear].filter(Boolean).length;

  const [actionError, setActionError] = useState('');
  const [showOpen, setShowOpen] = useState(false);
  const [openMonth, setOpenMonth] = useState(String(new Date().getMonth() + 1));
  const [openYear, setOpenYear] = useState(String(new Date().getFullYear()));
  const [opening, setOpening] = useState(false);
  const [closingRow, setClosingRow] = useState<{ id: number; month: number; year: number } | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState('');

  const filterKey = JSON.stringify([searchQuery, filterMonth, filterYear, sortParams]);
  const selection = useSelection<{ id: number }>();
  const { data: result, loading, error, reload } = useApiData(
    () => fetchAllPagesResult((page, pageSize) => listStockOpname({ page, pageSize, search: searchQuery || undefined, month: filterMonth ? Number(filterMonth) : undefined, year: filterYear ? Number(filterYear) : undefined, ...sortParams })),
    `${filterKey}|all`,
    'Gagal memuat data stok opname.',
  );
  const rows = result?.rows ?? [];
  const total = result?.total ?? 0;
  const allSelected = selection.allSelected(rows);

  const handleExportExcel = async () => {
    if (loading || rows.length === 0) return;
    setActionError("");
    try {
      const XLSX = await import("xlsx");
      const ids = selection.size > 0 ? [...selection.map.keys()] : rows.map((row) => row.id);
      const details = await mapConcurrent(ids, 4, (id) => getStockOpname(id));
      const headers = ["No", "Kode Barang", "Nama Barang", "Satuan", "Kategori", "Status", "Jumlah di Sistem", "Jumlah Fisik", "Selisih", "Keterangan"];
      const workbook = XLSX.utils.book_new();
      for (const detailData of details) {
        const dataRows = detailData.lines.map((line, index) => [
          index + 1,
          line.itemCode ?? "-",
          line.itemName,
          line.unit,
          line.category,
          STATUS_LABEL[detailData.status],
          line.systemQty ?? "-",
          line.physicalQty ?? "-",
          line.difference ?? "-",
          line.note ?? "-",
        ]);
        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
        worksheet["!cols"] = [{ wch: 6 }, { wch: 18 }, { wch: 30 }, { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(workbook, worksheet, `Opname ${detailData.month}-${detailData.year} #${detailData.id}`);
      }
      const first = details[0];
      XLSX.writeFile(workbook, details.length === 1 ? `Stok_Opname_Bulan_${first.month}_${first.year}.xlsx` : "Stok_Opname.xlsx");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Gagal mengekspor data stok opname.");
    }
  };

  const handleOpen = async () => {
    if (opening) return;
    setOpening(true);
    setActionError('');
    try {
      const detail = await openStockOpname({ month: Number(openMonth), year: Number(openYear) });
      setShowOpen(false);
      router.push(`${basePath}/transaksi/stock-opname/${detail.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        try {
          const existing = await listStockOpname({ month: Number(openMonth), year: Number(openYear), page: 1, pageSize: 1 });
          if (existing.rows[0]) {
            setShowOpen(false);
            router.push(`${basePath}/transaksi/stock-opname/${existing.rows[0].id}`);
            return;
          }
        } catch {
          // fall through to reload the list below
        }
        setActionError('Opname untuk periode ini sudah ada. Muat ulang daftar untuk membukanya.');
        reload();
      } else {
        setActionError(err instanceof ApiError ? err.message : 'Gagal membuka periode stok opname.');
      }
    } finally {
      setOpening(false);
    }
  };

  const handleCloseSession = async () => {
    if (!closingRow || closing) return;
    setClosing(true);
    setCloseError('');
    try {
      await submitStockOpname(closingRow.id);
      setClosingRow(null);
      reload();
    } catch (err) {
      setCloseError(err instanceof ApiError ? err.message : 'Gagal menutup sesi stok opname.');
    } finally {
      setClosing(false);
    }
  };

  const actionHref = (id: number, status: StockOpnameStatus | undefined) =>
    mode === 'gudang' && status === 'OPEN' ? `${basePath}/transaksi/stock-opname/isi/${id}` : `${basePath}/transaksi/stock-opname/${id}`;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col justify-start mb-8 gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">DATA STOK OPNAME</h1>
        <p className="text-gray-500 text-sm">{mode === 'ppic' ? 'Buka periode opname dan pantau pengisian Gudang.' : 'Isi jumlah fisik untuk opname yang dibuka PPIC.'}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="relative w-full max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-400" /></div>
              <input type="text" value={searchQuery} maxLength={100} onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all shadow-sm"
                placeholder="Cari periode stok opname..." />
            </div>
          </div>

          <div className="flex gap-2 w-full lg:w-auto">
            <ExportExcellButton onClick={handleExportExcel} disabled={loading || rows.length === 0} />
            {mode === 'ppic' && canOpen && (
              <button type="button" onClick={() => setShowOpen(true)} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm shrink-0 w-full lg:w-auto">
                <Plus className="w-4 h-4" /><span>Buka Periode</span>
              </button>
            )}
            <button type="button" onClick={() => setShowFilter((v) => !v)} aria-expanded={showFilter}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors text-sm font-medium ${showFilter || activeDateFilters > 0 ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <Filter className="w-4 h-4" /><span>Filter{activeDateFilters > 0 ? ` (${activeDateFilters})` : ''}</span>
            </button>
          </div>
        </div>

        {showFilter && <DateFilter day={filterDay} month={filterMonth} year={filterYear} onDayChange={setFilterDay} onMonthChange={setFilterMonth} onYearChange={setFilterYear} onReset={() => { setFilterDay(''); setFilterMonth(''); setFilterYear(''); }} showDay={false} />}
        <SelectionBanner count={selection.size} onClear={selection.clear} />
        {(actionError || (error && !loading)) && <p role="alert" className="px-6 pt-3 text-sm text-red-500">{actionError || error}</p>}

        <ScrollableTable ariaLabel="Tabel stok opname">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className={`${STICKY_HEAD_CLASS} bg-gray-50 text-gray-600 font-semibold border-b border-gray-100`}>
              <tr>
                <th scope="col" className="px-4 py-3 print:hidden w-12">
                  <SelectAllCheckbox ariaLabel="Pilih semua stok opname" checked={allSelected} indeterminate={rows.some((row) => selection.isSelected(row.id))} onChange={() => selection.toggleMany(rows)} className="w-4 h-4 accent-blue-600 cursor-pointer" />
                </th>
                <th scope="col" className="px-6 py-3 w-16 text-center">No</th>
                <SortableTh label='Periode Stock Opname' sortKey='period' sort={sort} onSort={toggle} />
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3">Progress</th>
                <th scope="col" className="px-6 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Memuat data...</td></tr>}
              {!loading && error && <tr><td colSpan={6} className="px-6 py-10 text-center text-red-500">{error}</td></tr>}
              {!loading && !error && rows.map((item, index) => (
                <tr key={item.id} className="hover:bg-[#FF8A00]/5 transition-colors group">
                  <td className="px-4 py-3 print:hidden w-12">
                    <input type="checkbox" aria-label={`Pilih ${periodeLabel(item.month, item.year)} #${item.id}`} checked={selection.isSelected(item.id)} onChange={() => selection.toggle(item)} className="w-4 h-4 accent-blue-600 cursor-pointer" />
                  </td>
                  <td className="px-6 py-3 text-gray-500 text-center">{index + 1}.</td>
                  <td className="px-6 py-3 font-bold text-gray-900">{periodeLabel(item.month, item.year)}</td>
                  <td className="px-6 py-3">{item.status ? STATUS_LABEL[item.status] : '-'}</td>
                  <td className="px-6 py-3">{item.progress ? `${item.progress.filled} / ${item.progress.total}` : '-'}</td>
                  <td className="px-6 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Link href={actionHref(item.id, item.status)} className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-50 text-blue-600 font-bold rounded-lg text-xs hover:bg-blue-100 transition-all">
                        {mode === 'gudang' && item.status === 'OPEN' ? <><Pencil className="h-3.5 w-3.5" />Isi Opname</> : <><Eye className="h-3.5 w-3.5" />Detail</>}
                      </Link>
                      {mode === 'ppic' && canOpen && item.status === 'OPEN' && (
                        <button type="button" onClick={() => { setCloseError(''); setClosingRow(item); }} className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-orange-50 text-orange-700 font-bold rounded-lg text-xs hover:bg-orange-100">Tutup Sesi</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !error && rows.length === 0 && <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400 italic">Data tidak ditemukan untuk filter tersebut.</td></tr>}
            </tbody>
          </table>
        </ScrollableTable>
        <TableFooter total={total} unit="stok opname" />
      </div>

      {showOpen && (
        <Modal title="Buka Periode Stok Opname" onClose={() => { if (!opening) setShowOpen(false); }} footer={<>
          <button type="button" disabled={opening} onClick={() => setShowOpen(false)} className="px-4 py-2 rounded-lg border border-gray-200 disabled:opacity-60">Batal</button>
          <button type="button" disabled={opening} onClick={() => void handleOpen()} className="px-4 py-2 rounded-lg bg-[#ff8a00] text-white disabled:opacity-60">{opening ? 'Membuka...' : 'Buka Periode'}</button>
        </>}>
          <p className="mb-4 text-sm text-gray-700">Satu bulan hanya boleh punya satu stok opname. Gudang akan mengisi jumlah fisik setelah periode dibuka.</p>
          <div className="flex gap-3">
            <select aria-label="Bulan opname" value={openMonth} onChange={(e) => setOpenMonth(e.target.value)} className="border border-gray-200 rounded-lg py-2 px-3 text-sm">
              {BULAN.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
            </select>
            <select aria-label="Tahun opname" value={openYear} onChange={(e) => setOpenYear(e.target.value)} className="border border-gray-200 rounded-lg py-2 px-3 text-sm">
              {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {actionError && <p role="alert" className="mt-3 text-sm text-red-600">{actionError}</p>}
        </Modal>
      )}
      {closingRow && (
        <Modal title="Tutup Sesi Stok Opname?" onClose={() => { if (!closing) setClosingRow(null); }} footer={<>
          <button type="button" disabled={closing} onClick={() => setClosingRow(null)} className="px-4 py-2 rounded-lg border border-gray-200 disabled:opacity-60">Batal</button>
          <button type="button" disabled={closing} onClick={() => void handleCloseSession()} className="px-4 py-2 rounded-lg bg-[#ff8a00] text-white disabled:opacity-60">{closing ? 'Menutup...' : 'Ya, Tutup Sesi'}</button>
        </>}>
          <p className="text-sm text-gray-700">Tutup sesi {periodeLabel(closingRow.month, closingRow.year)}? Gudang tidak bisa lagi mengisi jumlah fisik setelah sesi ditutup.</p>
          <p className="mt-2 text-sm text-gray-500">Stok sistem belum berubah. Selisih diproses lewat pemutihan.</p>
          {closeError && <p role="alert" className="mt-3 text-sm text-red-600">{closeError}</p>}
        </Modal>
      )}
    </div>
  );
}

export default function StockOpnameMasterGudang() {
  return <StockOpnameList basePath={gudangBasePath(usePathname())} mode="gudang" />;
}
