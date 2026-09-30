"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Search, Eye, Download, FileUp } from 'lucide-react';
import { exportInboundReport, getInboundReport } from '@/domains/gudang/api';
import type { InboundReport, InboundRow, InboundSource } from '@/domains/gudang/types';
import { ApiError } from '@/shared/lib/api-client';

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

const emptySummary = { total: 0, supplier: 0, produksi: 0, klien: 0 };

export default function LaporanBarangMasuk() {
    const [filterSumber, setFilterSumber] = useState<'ALL' | InboundSource>('ALL');
    const [startDate, setStartDate] = useState<string>(monthStart());
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10));
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedDetail, setSelectedDetail] = useState<InboundRow | null>(null);

    const [report, setReport] = useState<InboundReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [exporting, setExporting] = useState(false);

    const filters = {
      q: searchQuery || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      source: filterSumber === 'ALL' ? undefined : filterSumber,
    };

    // ponytail: loads first 100 rows only, add real pagination when the list outgrows it
    const loadReport = useCallback(async () => {
      setLoading(true);
      setError('');
      try {
        setReport(await getInboundReport({
          pageSize: 100,
          q: searchQuery || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          source: filterSumber === 'ALL' ? undefined : filterSumber,
        }));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Gagal memuat laporan barang masuk.');
      } finally {
        setLoading(false);
      }
    }, [searchQuery, startDate, endDate, filterSumber]);

    useEffect(() => {
      loadReport();
    }, [loadReport]);

    const handleExport = async () => {
      setExporting(true);
      try {
        await exportInboundReport(filters);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Gagal mengekspor laporan.');
      } finally {
        setExporting(false);
      }
    };

    const rows = report?.rows ?? [];
    const summary = report?.summary ?? emptySummary;

    return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        <div className="flex flex-col justify-start mb-8 gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">REKAP BARANG MASUK</h1>
            <p className="text-gray-500 text-sm">Arsip pencatatan riwayat penerimaan fisik barang dari supplier dan hasil produksi.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Penerimaan</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.total.toLocaleString('id-ID')} Transaksi</p>
            </div>
            <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase">Penerimaan Supplier (PO)</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{summary.supplier.toLocaleString('id-ID')} Transaksi</p>
            </div>
            <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase">Barang Jadi Produksi (QC Pass)</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{summary.produksi.toLocaleString('id-ID')} Transaksi</p>
            </div>
            <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase">Barang Kembali (Klien)</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{summary.klien.toLocaleString('id-ID')} Transaksi</p>
            </div>
        </div>

        <div className="flex flex-wrap justify-between items-center bg-white p-4 border border-gray-200 rounded-lg shadow-sm gap-4 mt-5">
            <div className="flex flex-wrap gap-3 items-center">
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
                    placeholder="Cari No. PO / SJ / Barang / Supplier..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border border-gray-300 rounded-md pl-3 pr-10 py-1.5 text-sm w-full bg-white text-black placeholder:text-gray focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Search className="absolute right-3 text-black w-4 h-4" />
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
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm shrink-0 disabled:opacity-60"
              >
                <FileUp className='h-4 w-4'></FileUp>
                <span>{exporting ? 'Mengekspor...' : 'Export Excel'}</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm shrink-0"
              >
                <Download className='h-4 w-4'></Download>
                <span>Cetak PDF</span>
              </button>
            </div>
        </div>
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-100 font-semibold text-gray-700">
            <tr>
              <th className="px-4 py-3 text-center w-12">No</th>
              <th className="px-4 py-3 text-left">Tgl &amp; Jam Penerimaan</th>
              <th className="px-4 py-3 text-left">No. Referensi / PO</th>
              <th className="px-4 py-3 text-left">Sumber / Pemasok</th>
              <th className="px-4 py-3 text-right">Total Volume Item (Qty)</th>
              <th className="px-4 py-3 text-center">Status QC</th>
              <th className="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Memuat data...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-red-500">{error}</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
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
                    <button
                      onClick={() => setSelectedDetail(item)}
                      className="flex-1 lg:flex-none flex items-center justify-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded border border-blue-200 transition-colors print:hidden"
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

        <div className="p-4 border-t border-gray-100 bg-gray-50/50 text-sm text-gray-500">
          Menampilkan <span className="font-semibold text-gray-900">{rows.length}</span> dari <span className="font-semibold text-gray-900">{report?.total ?? 0}</span> data
        </div>
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
