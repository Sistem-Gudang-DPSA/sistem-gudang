"use client";

import React, { useState } from 'react';
import { Search, Eye, Download, FileUp, Loader2, AlertCircle } from 'lucide-react';
import { exportInboundReport, getInboundReport } from '@/domains/inventory/api';
import type { InboundRow, InboundSource } from '@/domains/inventory/types';
import { ApiError } from '@/shared/lib/api-client';
import { useApiData } from '@/shared/lib/use-api-data';
import Pagination from '@/shared/components/Pagination';
import { ExportExcellButton, PrintPdfButton } from '@/shared/components/Tombol';

const PAGE_SIZE = 20;

const SUMBER_LABEL: Record<InboundSource, string> = {
  SUPPLIER: 'Supplier External',
  PRODUKSI: 'Produksi Internal',
  KLIEN: 'Barang Kembali (Klien)',
};

const displayDateTime = (iso: string) => {
  const [d, t] = iso.slice(0, 16).split(/[T ]/);
  return `${d.split('-').reverse().join('-')}${t ? ` ${t}` : ''}`;
};

const monthStart = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const QC_LABEL: Record<string, string> = {
  PASS: 'Pass (IPM)',
  PARTIAL_RETUR: 'Part (Retur)',
};

const formatTanggalCetak = (iso: string) => {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
};

const emptySummary = { total: 0, supplier: 0, produksi: 0, klien: 0, qtyTotal: 0, qtySupplier: 0, qtyProduksi: 0, qtyKlien: 0 };

export default function LaporanBarangMasuk() {
    const [filterSumber, setFilterSumber] = useState<'ALL' | InboundSource>('ALL');
    const [startDate, setStartDate] = useState<string>(monthStart());
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10));
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedDetail, setSelectedDetail] = useState<InboundRow | null>(null);

    const [actionError, setActionError] = useState('');
    const [exporting, setExporting] = useState(false);

    const filters = {
      q: searchQuery || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      source: filterSumber === 'ALL' ? undefined : filterSumber,
    };

    const filterKey = JSON.stringify(filters);
    const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
    const page = pageState.key === filterKey ? pageState.page : 1;
    const setPage = (next: number) => setPageState({ key: filterKey, page: next });

    const { data: report, loading, error } = useApiData(
      () => getInboundReport({ ...filters, page, pageSize: PAGE_SIZE }),
      `${filterKey}|${page}`,
      'Gagal memuat laporan barang masuk.',
    );

    const handleExport = async () => {
      setExporting(true);
      setActionError('');
      try {
        await exportInboundReport(filters);
      } catch (err) {
        setActionError(err instanceof ApiError ? err.message : 'Gagal mengekspor laporan.');
      } finally {
        setExporting(false);
      }
    };

    const handlePrintPdf = () => {
      const win = window.open('', '_blank');
      if (!win) {
        setActionError('Pop-up diblokir browser. Izinkan pop-up untuk mencetak PDF.');
        return;
      }
      setActionError('');

      const sumberText = filterSumber === 'ALL' ? 'Semua Sumber' : SUMBER_LABEL[filterSumber];
      const periodeText = `${formatTanggalCetak(startDate)} s/d ${formatTanggalCetak(endDate)}`;

      const bodyRows = rows.map((item, index) => {
        const referensi =
          escapeHtml(item.referenceNo ?? '-') +
          (item.supplierDeliveryNo
            ? `<div class="sub">(SJ: ${escapeHtml(item.supplierDeliveryNo)})</div>`
            : '');
        const sumber =
          escapeHtml(item.supplierName ?? item.clientName ?? '-') +
          `<div class="sub">(${escapeHtml(SUMBER_LABEL[item.source])})</div>`;
        const qc = item.statusQc ? (QC_LABEL[item.statusQc] ?? item.statusQc) : '-';

        return `
          <tr>
            <td class="center">${index + 1}</td>
            <td>${escapeHtml(displayDateTime(item.date))}</td>
            <td>${referensi}</td>
            <td>${sumber}</td>
            <td class="right">${item.qtyArrived.toLocaleString('id-ID')}</td>
            <td class="center">${escapeHtml(qc)}</td>
            <td class="center">${escapeHtml(item.locationCode ?? '-')}</td>
          </tr>`;
      }).join('');

      const emptyRow = `<tr><td colspan="7" class="center">Tidak ada data penerimaan barang masuk.</td></tr>`;

      win.document.write(`<!doctype html>
        <html>
          <head>
            <title>Rekap Barang Masuk</title>
            <style>
              @page { size: A4 landscape; margin: 12mm; }
              body { font-family: Arial, sans-serif; color: #111; }
              h1 { font-size: 18px; margin: 0 0 4px; text-transform: uppercase; }
              .meta { font-size: 12px; margin: 0 0 12px; color: #444; }
              .summary { font-size: 12px; margin: 0 0 12px; }
              .summary span { margin-right: 24px; }
              table { width: 100%; border-collapse: collapse; font-size: 11px; }
              th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: top; }
              th { background: #eee; }
              thead { display: table-header-group; }
              tr { page-break-inside: avoid; }
              .center { text-align: center; }
              .right { text-align: right; }
              .sub { font-size: 10px; color: #555; }
            </style>
          </head>
          <body>
            <h1>Rekap Barang Masuk (halaman ini)</h1>
            <p class="meta">Periode: ${periodeText} &nbsp;|&nbsp; Sumber: ${escapeHtml(sumberText)}${
              searchQuery ? ` &nbsp;|&nbsp; Pencarian: ${escapeHtml(searchQuery)}` : ''
            }</p>
            <p class="summary">
              <span><b>Total:</b> ${summary.qtyTotal.toLocaleString('id-ID')} Qty / ${summary.total.toLocaleString('id-ID')} Transaksi</span>
              <span><b>Supplier:</b> ${summary.qtySupplier.toLocaleString('id-ID')} Qty (${summary.supplier.toLocaleString('id-ID')} Transaksi)</span>
              <span><b>Produksi:</b> ${summary.qtyProduksi.toLocaleString('id-ID')} Qty (${summary.produksi.toLocaleString('id-ID')} Transaksi)</span>
            </p>
            <table>
              <thead>
                <tr>
                  <th class="center">No</th>
                  <th>Tgl &amp; Jam Penerimaan</th>
                  <th>No. Referensi / PO</th>
                  <th>Sumber / Pemasok</th>
                  <th class="right">Total Volume Item (Qty)</th>
                  <th class="center">Status QC</th>
                  <th class="center">Lokasi</th>
                </tr>
              </thead>
              <tbody>${rows.length ? bodyRows : emptyRow}</tbody>
            </table>
          </body>
        </html>`);
      win.document.close();
      win.focus();
      win.print();
    };

    const rows = report?.rows ?? [];
    const summary = report?.summary ?? emptySummary;


    return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        <div className="flex flex-col justify-start mb-8 gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">REKAP BARANG MASUK</h1>
            <p className="text-gray-500 text-sm">Arsip pencatatan riwayat penerimaan fisik barang dari supplier dan hasil produksi.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Inbound Bulan Ini</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
                {summary.qtyTotal.toLocaleString('id-ID')} Qty / {summary.total.toLocaleString('id-ID')} Transaksi
            </p>
            </div>
            <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase">Penerimaan Supplier (PO)</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
                {summary.qtySupplier.toLocaleString('id-ID')} Qty ({summary.supplier.toLocaleString('id-ID')} Transaksi)
            </p>
            </div>
            <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase">Barang Jadi Produksi (QC Pass)</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
                {summary.qtyProduksi.toLocaleString('id-ID')} Qty ({summary.produksi.toLocaleString('id-ID')} Transaksi)
            </p>
            </div>
        </div>

        <div className="flex flex-wrap justify-between items-center bg-white p-4 border border-gray-200 rounded-lg shadow-sm gap-4 mt-5">
            <div className="flex flex-wrap gap-3 items-center print:hidden">
            <div>
                <label className="block text-xs text-black mb-1">Sumber Inbound</label>
                <select
                value={filterSumber}
                onChange={(e) => setFilterSumber(e.target.value as 'ALL' | InboundSource)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500c text-black"
                >
                <option value="ALL" className='text-black'>Semua Sumber (Supplier / Produksi)</option>
                <option value="SUPPLIER" className='text-black'>Supplier (PO)</option>
                <option value="PRODUKSI" className='text-black'>Barang Jadi Produksi</option>
                <option value="KLIEN" className='text-black'>Barang Kembali</option>
                </select>
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
                <label className="block text-xs text-black mb-1">Pencarian</label>
                <span className="relative flex items-center w-60">
                  <input
                    type="text"
                    placeholder="Cari No. PO / SJ / SKU..."
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
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-sm mt-5">
        <div className="flex gap-2 items-end justify-between">
            <div className="flex gap-2 items-end m-2">
                <p className="text-xs font-semibold text-gray-500 uppercase m-2">Tabel Rekap Barang Masuk</p>
            </div>
            <div className="flex gap-2 items-end m-2 print:hidden">
                <ExportExcellButton onClick={handleExport} disabled={exporting || loading || rows.length === 0} />
                <PrintPdfButton onClick={handlePrintPdf} disabled={loading || rows.length === 0} />  
            </div>
        </div>
        {actionError && <p className="px-4 pb-2 text-sm text-red-500">{actionError}</p>}
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-100 font-semibold text-gray-700">
            <tr>
              <th className="px-4 py-3 text-center w-12">No</th>
              <th className="px-4 py-3 text-left">Tgl &amp; Jam Penerimaan</th>
              <th className="px-4 py-3 text-left">No. Referensi / PO</th>
              <th className="px-4 py-3 text-left">Sumber / Pemasok</th>
              <th className="px-4 py-3 text-right">Total Volume Item (Qty)</th>
              <th className="px-4 py-3 text-center">Status QC</th>
              <th className="px-4 py-3 text-center">Lokasi</th>
              <th className="px-4 py-3 text-center print:hidden">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span>Memuat data laporan barang masuk...</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-red-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                    <span className="font-semibold">{error}</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Tidak ada data penerimaan barang masuk ditemukan.
                </td>
              </tr>
            ) : (
              rows.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-center text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{displayDateTime(item.date)}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-blue-600">
                    {item.referenceNo ?? '-'}
                    {item.supplierDeliveryNo && (
                      <span className="block text-xs font-normal text-gray-500">
                        (SJ: {item.supplierDeliveryNo})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{item.supplierName ?? item.clientName ?? '-'}</span>
                    <span className="block text-xs text-gray-500">({SUMBER_LABEL[item.source]})</span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">
                    {item.qtyArrived}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.statusQc === 'PASS' && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                        Pass (IPM)
                      </span>
                    )}
                    {item.statusQc === 'PARTIAL_RETUR' && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                        Part (Retur)
                      </span>
                    )}
                    {item.statusQc === null && <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-medium text-gray-900">{item.locationCode ?? '-'}</span>
                  </td>
                  <td className="px-4 py-3 text-center print:hidden">
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

        <Pagination page={page} pageSize={PAGE_SIZE} total={report?.total ?? 0} onPageChange={setPage} />
      </div>

      {selectedDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Detail Penerimaan Barang</h3>
              <button
                onClick={() => setSelectedDetail(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">No. Referensi / PO</span>
                <span className="font-mono font-bold text-blue-600">{selectedDetail.referenceNo ?? '-'}</span>
              </div>
              {selectedDetail.supplierDeliveryNo && (
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-500">No. Surat Jalan</span>
                  <span className="font-mono font-medium text-gray-800">{selectedDetail.supplierDeliveryNo}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Tgl & Jam</span>
                <span className="font-medium text-gray-800">{displayDateTime(selectedDetail.date)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Barang</span>
                <span className="font-medium text-gray-800">
                  {selectedDetail.itemCode ? `${selectedDetail.itemCode} - ` : ''}{selectedDetail.itemName}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Sumber / Pemasok</span>
                <span className="font-medium text-gray-800">{selectedDetail.supplierName ?? selectedDetail.clientName ?? '-'}</span>
              </div>
              {selectedDetail.spk && (
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-500">SPK</span>
                  <span className="font-medium text-gray-800">{selectedDetail.spk}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Jumlah Kedatangan</span>
                <span className="font-bold text-gray-900">{selectedDetail.qtyArrived}</span>
              </div>
              {selectedDetail.qtyPurchased !== null && (
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-500">Jumlah Rekap Pembelian</span>
                  <span className="font-bold text-gray-900">{selectedDetail.qtyPurchased}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Status QC</span>
                <span className="font-semibold text-gray-800">{selectedDetail.statusQc ?? '-'}</span>
              </div>
              {selectedDetail.notes && (
                <div className="py-1">
                  <span className="text-gray-500 block mb-1">Catatan:</span>
                  <p className="bg-gray-50 p-2.5 rounded border border-gray-100 text-xs text-gray-700">{selectedDetail.notes}</p>
                </div>
              )}
            </div>
            <div className="mt-6 text-right">
              <button
                onClick={() => setSelectedDetail(null)}
                className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    )
}
