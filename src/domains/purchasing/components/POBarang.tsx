"use client";

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { Filter, Search } from 'lucide-react';
import Pagination from '@/shared/components/Pagination';
import { downloadCsv } from '@/shared/lib/csv';
import { useApiData } from '@/shared/lib/use-api-data';
import { usePage } from '@/shared/lib/use-page';
import { formatTanggal } from '@/domains/ppic/data/dokubah';
import { getPurchaseOrder, listPurchaseOrders } from '@/domains/purchasing/api';
import { toDateRange } from '@/domains/inventory/date';
import { detailPoPath, editPoPath, lihatPermintaanPoPath } from '@/domains/purchasing/data/pembelian';
import SortableTh, { useSort } from '@/shared/components/SortableTh';
import { ExportExcellButton, PrintPdfButton } from '@/shared/components/Tombol';
import DateFilter from '@/shared/components/DateFilter';
import SelectionBanner from '@/shared/components/SelectionBanner';
import { useCan } from '@/domains/auth/user-context';
import { useSelection } from '@/shared/lib/use-selection';
import { printPurchaseOrders } from '@/domains/purchasing/export/print-po';
import type { PurchaseOrder } from '@/domains/purchasing/types';


export default function POBarang() {
  const canView = useCan('purchase-order.view');
  const canUpdate = useCan('purchase-order.update');
  const canReview = useCan('purchase-request.approve');
  const [searchQuery, setSearchQuery] = useState('');
  const filterKey = searchQuery.trim();
  const { sort, toggle, params: sortParams } = useSort();
  const [showFilter, setShowFilter] = useState(false);
  const [filterDay, setFilterDay] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const range = toDateRange(filterDay, filterMonth, filterYear);
  const activeCount = [filterDay, filterMonth, filterYear].filter(Boolean).length;
  const [page, setPage] = usePage(`${filterKey}|${JSON.stringify(sortParams)}|${JSON.stringify(range)}`);
  const { data: result, loading, error } = useApiData(
    () => canView ? listPurchaseOrders({ page, pageSize: 20, search: filterKey || undefined, ...sortParams, ...range }) : Promise.resolve({ rows: [], total: 0, page, pageSize: 20 }),
    `purchase-orders|${canView}|${filterKey}|${JSON.stringify(sortParams)}|${JSON.stringify(range)}|${page}`,
    'Gagal memuat PO Barang.',
  );
  const filteredData = result?.rows ?? [];
  const total = result?.total ?? 0;
  const selection = useSelection<Omit<PurchaseOrder, 'barang'>>(String(canView));
  const [printing, setPrinting] = useState(false);
  const printingRef = useRef(false);
  const [printNotice, setPrintNotice] = useState<{ error: boolean; text: string } | null>(null);

  const handlePrint = async () => {
    if (!canView || printingRef.current || selection.size === 0) return;
    printingRef.current = true;
    setPrinting(true);
    setPrintNotice(null);
    const chosen = selection.rows;
    const loaded: PurchaseOrder[] = [];
    const failed: string[] = [];
    try {
      for (let start = 0; start < chosen.length; start += 4) {
        const group = chosen.slice(start, start + 4);
        const results = await Promise.allSettled(group.map((row) => getPurchaseOrder(row.id)));
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') loaded.push(result.value);
          else failed.push(`${group[index].nomorPo}: ${result.reason instanceof Error ? result.reason.message : 'Gagal memuat data PO.'}`);
        });
      }
      if (failed.length > 0) {
        setPrintNotice({ error: true, text: `Cetak dibatalkan; belum ada dialog cetak yang dibuka. Berhasil dimuat (${loaded.length}): ${loaded.map((po) => po.nomorPo).join(', ') || 'tidak ada'}. Gagal dimuat (${failed.length}): ${failed.join('; ')}.` });
        return;
      }
      await printPurchaseOrders(loaded);
      setPrintNotice({ error: false, text: `Dialog cetak dibuka untuk ${loaded.length} PO: ${loaded.map((po) => po.nomorPo).join(', ')}.` });
    } catch {
      setPrintNotice({ error: true, text: `Gagal membuka dialog cetak untuk ${chosen.map((po) => po.nomorPo).join(', ')}. Pilihan tetap tersimpan; silakan coba lagi.` });
    } finally {
      printingRef.current = false;
      setPrinting(false);
    }
  };

  const handleExportCSV = () => {
    const rows: unknown[][] = [['No', 'Tanggal', 'Nomor PO', 'Supplier', 'Status']];
    filteredData.forEach((item, index) => rows.push([(page - 1) * 20 + index + 1, item.tanggalPo.slice(0, 10), item.nomorPo, item.supplierName, item.status]));
    downloadCsv(`PO_Barang_halaman-${page}.csv`, rows);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">PO BARANG</h1>
        <p className="text-gray-500 text-sm">Kelola pemesanan pembelian barang.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Pencarian */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full max-w-md mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              maxLength={100}
              placeholder="Cari"
              aria-label="Cari PO Barang"
              className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-800 pointer-events-none" />
          </div>

          <div className="flex items-center gap-2">
            {canView && <PrintPdfButton onClick={() => void handlePrint()} disabled={printing || selection.size === 0} label={printing ? 'Menyiapkan cetak...' : 'Print'} />}
            <ExportExcellButton onClick={handleExportCSV} disabled={loading || filteredData.length === 0} />
            <button
              type="button"
              onClick={() => setShowFilter((v) => !v)}
              aria-expanded={showFilter}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors text-sm font-medium ${showFilter || activeCount > 0 ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <Filter className="w-4 h-4" />
              <span>Filter{activeCount > 0 ? ` (${activeCount})` : ''}</span>
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
          />
        )}

        {!canView && <p role="alert" className="mx-5 mt-5 text-sm text-gray-500">Anda tidak memiliki izin untuk melihat PO Barang.</p>}

        {error && (
          <div className="mx-5 mt-5 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
        )}


        <SelectionBanner
          count={selection.size}
          unit="PO"
          clearLabel="Reset pilihan PO"
          disabled={printing}
          onClear={() => { selection.clear(); setPrintNotice(null); }}
        />
        {printNotice && <p role={printNotice.error ? 'alert' : 'status'} className={`mx-5 my-3 rounded-lg p-3 text-sm ${printNotice.error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{printNotice.text}</p>}

        {/* Tabel */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th scope="col" className="px-6 py-4">No</th>
                <SortableTh label="Tanggal" sortKey="date" sort={sort} onSort={toggle} />
                <th scope="col" className="px-6 py-4">Nomor PO</th>
                <th scope="col" className="px-6 py-4">Supplier</th>
                <SortableTh label="Status" sortKey="status" sort={sort} onSort={toggle} />
                <th scope="col" className="px-6 py-4">Aksi</th>
                <th scope="col" className="px-6 py-4">
                  <label className="flex items-center gap-2">Check
                    {canView && <input type="checkbox" aria-label="Centang semua PO di halaman ini" checked={selection.allSelected(filteredData)} disabled={loading || printing || filteredData.length === 0} onChange={() => { selection.toggleMany(filteredData); setPrintNotice(null); }} className="h-4 w-4 accent-orange-500" />}
                  </label>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={7} className="px-6 py-6 text-center text-gray-400">Memuat data...</td></tr>
              )}
              {!loading && filteredData.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-6 text-center text-gray-400">Belum ada PO Barang.</td></tr>
              )}
              {!loading && filteredData.map((item, index) => (
                <tr key={item.id} className="hover:bg-purple-50/30 transition-colors group">
                  <td className="px-6 py-4 text-gray-500">{(page - 1) * 20 + index + 1}</td>

                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{formatTanggal(item.tanggalPo)}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{item.nomorPo}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4">{item.supplierName}</td>

                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{item.status}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">
                        {canView && <Link
                          href={detailPoPath(item.id)}
                          className="inline-block px-3 py-1 bg-[#FF8A00] text-white text-xs font-semibold rounded-md hover:bg-orange-600 transition-colors mr-2"
                        >
                          Lihat Detail PO
                        </Link>}
                        {canUpdate && item.status === 'ISSUED' && <Link
                          href={editPoPath(item.id)}
                          aria-label={`Edit ${item.nomorPo}`}
                          className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md hover:bg-blue-100 transition-colors mr-2"
                        >
                          Edit
                        </Link>}
                        {canReview && item.approvalRequestId !== null && <Link
                          href={lihatPermintaanPoPath(item.approvalRequestId)}
                          className="inline-block px-3 py-1 bg-[#FF8A00] text-white text-xs font-semibold rounded-md hover:bg-orange-600 transition-colors"
                        >
                          Lihat Permintaan
                        </Link>}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {canView && <input type="checkbox" aria-label={`Centang ${item.nomorPo}`} checked={selection.isSelected(item.id)} disabled={printing} onChange={() => { selection.toggle(item); setPrintNotice(null); }} className="h-4 w-4 accent-orange-500" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}
