"use client";

import React, { useState } from 'react';
import { Search, FileUp, Download, Eye, Loader2, AlertCircle } from 'lucide-react';
import { exportOutboundReport, getOutboundReport } from '@/domains/gudang/api';
import type { OutboundRow, RecipientType, WarehouseType } from '@/domains/gudang/types';
import { ApiError } from '@/shared/lib/api-client';
import { useApiData } from '@/shared/lib/use-api-data';

const GUDANG_LABEL: Record<WarehouseType, string> = {
    BAHAN_BAKU: 'Gudang Bahan Baku',
    WIP: 'Gudang WIP',
    BARANG_JADI: 'Gudang Barang Jadi',
};

const RECIPIENT_LABEL: Record<RecipientType, string> = {
    PRODUKSI: 'Tukang / Produksi',
    KLIEN: 'Klien',
};

const displayDate = (iso: string) => iso.slice(0, 10).split('-').reverse().join('-');

const monthStart = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};

const emptySummary = { bahanBaku: 0, wip: 0, barangJadi: 0 };

export default function LaporanBarangKeluar(){
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filterGudang, setFilterGudang] = useState<'ALL' | WarehouseType>('ALL');
    const [filterPenerima, setFilterPenerima] = useState<'ALL' | RecipientType>('ALL');
    const [startDate, setStartDate] = useState<string>(monthStart());
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10));
    const [selectedDetail, setSelectedDetail] = useState<OutboundRow | null>(null);

    const [actionError, setActionError] = useState('');
    const [exporting, setExporting] = useState(false);

    const filters = {
      q: searchQuery || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      warehouseType: filterGudang === 'ALL' ? undefined : filterGudang,
      recipientType: filterPenerima === 'ALL' ? undefined : filterPenerima,
    };

    // ponytail: loads first 100 rows only, add real pagination when the list outgrows it
    const { data: report, loading, error } = useApiData(
      () => getOutboundReport({ ...filters, pageSize: 100 }),
      JSON.stringify(filters),
      'Gagal memuat laporan barang keluar.',
    );

    const handleExport = async () => {
        setExporting(true);
        setActionError('');
        try {
            await exportOutboundReport(filters);
        } catch (err) {
            setActionError(err instanceof ApiError ? err.message : 'Gagal mengekspor laporan.');
        } finally {
            setExporting(false);
        }
    };

    const rows = report?.rows ?? [];
    const summary = report?.summary ?? emptySummary;
    // The table shows one row per item line, the API returns one row per transaction.
    const tableRows = rows.flatMap((trx) => trx.lines.map((line) => ({ trx, line })));

    return(
        <div className='animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10'>
            <div className='flex flex-col justify-start mb-8 gap-2'>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">REKAP BARANG KELUAR</h1>
                <p className="text-gray-500 text-sm">Arsip pencatatan riwayat pengeluaran fisik barang dari gudang</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Total Bahan Baku Keluar</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{summary.bahanBaku.toLocaleString('id-ID')} Transaksi</p>
                </div>
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Total Pengeluaran Item WIP</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{summary.wip.toLocaleString('id-ID')} Transaksi</p>
                </div>
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Total Barang Jadi Keluar</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{summary.barangJadi.toLocaleString('id-ID')} Transaksi</p>
                </div>
            </div>

            <div className='flex flex-wrap justify-between items-center bg-white p-4 border border-gray-200 rounded-lg shadow-sm gap-4 mt-5 print:hidden'>
                <div className="flex flex-wrap gap-3 items-center">
                    <div>
                        <label className="block text-xs text-black mb-1">Pencarian</label>
                        <span className="relative flex items-center w-60">
                        <input
                            type="text"
                            placeholder="Cari Client, SPK, Item, atau Penerima"
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
                        <label className="block text-xs text-black mb-1">Asal Gudang</label>
                        <select
                        value={filterGudang}
                        onChange={(e) => setFilterGudang(e.target.value as 'ALL' | WarehouseType)}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500c text-black"
                        >
                        <option value="ALL" className='text-black'>Semua Jenis Gudang</option>
                        <option value="BAHAN_BAKU" className='text-black'>Gudang Bahan Baku</option>
                        <option value="WIP" className='text-black'>Gudang WIP</option>
                        <option value="BARANG_JADI" className='text-black'>Gudang Barang Jadi</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-black mb-1">Tujuan / Penerima</label>
                        <select
                        value={filterPenerima}
                        onChange={(e) => setFilterPenerima(e.target.value as 'ALL' | RecipientType)}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500c text-black"
                        >
                        <option value="ALL" className='text-black'>Semua Penerima</option>
                        <option value="PRODUKSI" className='text-black'>Tukang / Produksi</option>
                        <option value="KLIEN" className='text-black'>Klien</option>
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
                </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-sm mt-5">
                <div className="flex gap-2 items-end justify-between">
                    <div className="flex gap-2 items-end m-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase m-2">Tabel Rekap Barang Keluar</p>
                    </div>
                    <div className="flex gap-2 items-end m-2 print:hidden">
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        title="Export Data ke CSV"
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-60"
                    >
                        <FileUp className="w-4 h-4" />
                        <span className="hidden sm:inline">{exporting ? 'Mengekspor...' : 'Export'}</span>
                    </button>
                    <button
                        onClick={() => window.print()}
                        title="Print Data ke PDF"
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-60"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Print PDF</span>
                    </button>
                    </div>
                </div>
                {actionError && <p className="px-4 pb-2 text-sm text-red-500">{actionError}</p>}
        <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-100 font-semibold text-gray-700">
                    <tr>
                        <th className="px-4 py-3 text-center w-12">No</th>
                        <th className="px-4 py-3 text-left">Informasi Barang</th>
                        <th className="px-4 py-3 text-left">Asal Gudang</th>
                        <th className="px-4 py-3 text-left">Tujuan / Penerima</th>
                        <th className="px-4 py-3 text-right">SPK</th>
                        <th className="px-4 py-3 text-center">Tanggal</th>
                        <th className="px-4 py-3 text-center">Jumlah</th>
                        <th className="px-4 py-3 text-center print:hidden">Aksi</th>
                    </tr>
                </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                        <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                            <div className="flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                <span>Memuat data laporan barang keluar...</span>
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
                        ) : tableRows.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                            Tidak ada data barang keluar ditemukan.
                            </td>
                        </tr>
                        ) : (
                        tableRows.map(({ trx, line }, index) => (
                            <tr key={`${trx.id}-${index}`} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-center text-gray-500">{index + 1}</td>
                            <td className="px-4 py-3">
                                <span className="font-medium text-gray-900">{line.itemName}</span>
                                <span className="block text-xs font-mono text-gray-500">
                                    {line.itemCode ?? '-'}{line.locationCode ? ` (${line.locationCode})` : ''}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-gray-700">{GUDANG_LABEL[trx.warehouseType]}</td>
                            <td className="px-4 py-3">
                                <span className="font-medium text-gray-900">{RECIPIENT_LABEL[trx.recipientType]}</span>
                                <span className="block text-xs text-gray-500">{trx.clientName}{line.pic ? ` - PIC ${line.pic}` : ''}</span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-semibold text-blue-600">{trx.spk}</td>
                            <td className="px-4 py-3 text-center text-gray-700">{displayDate(trx.date)}</td>
                            <td className="px-4 py-3 text-center font-bold text-gray-800">{line.qty}</td>
                            <td className="px-4 py-3 text-center print:hidden">
                                <button
                                onClick={() => setSelectedDetail(trx)}
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

                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
                    <div className="flex gap-1">
                      <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-white text-gray-400 cursor-not-allowed">Sec</button>
                      <button className="px-3 py-1 bg-[#FF8A00] text-white rounded-md font-medium shadow-sm shadow-orange-500/20">1</button>
                      <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-white text-gray-600 hover:text-[#FF8A00] font-medium transition-colors">2</button>
                      <span className="px-2 py-1 text-gray-400">...</span>
                      <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-white text-gray-600 hover:text-[#FF8A00] font-medium transition-colors">Selanjutnya</button>
                    </div>
                </div>
            </div>

            {selectedDetail && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-gray-100">
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Detail Pengeluaran Barang</h3>
                            <button
                                onClick={() => setSelectedDetail(null)}
                                className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-500">SPK</span>
                                <span className="font-mono font-bold text-blue-600">{selectedDetail.spk}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-500">Tanggal</span>
                                <span className="font-medium text-gray-800">{displayDate(selectedDetail.date)}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-500">Client / Item</span>
                                <span className="font-medium text-gray-800">{selectedDetail.clientName} / {selectedDetail.itemName}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-500">Asal Gudang</span>
                                <span className="font-medium text-gray-800">{GUDANG_LABEL[selectedDetail.warehouseType]}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-500">Tujuan / Penerima</span>
                                <span className="font-medium text-gray-800">{RECIPIENT_LABEL[selectedDetail.recipientType]}</span>
                            </div>
                            <div className="py-1">
                                <span className="text-gray-500 block mb-1">Barang:</span>
                                <ul className="bg-gray-50 p-2.5 rounded border border-gray-100 text-xs text-gray-700 space-y-1">
                                    {selectedDetail.lines.map((line, i) => (
                                        <li key={i} className="flex justify-between gap-2">
                                            <span>{line.itemCode ? `${line.itemCode} - ` : ''}{line.itemName}{line.locationCode ? ` (${line.locationCode})` : ''}</span>
                                            <span className="font-semibold whitespace-nowrap">{line.qty} - PIC {line.pic}</span>
                                        </li>
                                    ))}
                                </ul>
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
