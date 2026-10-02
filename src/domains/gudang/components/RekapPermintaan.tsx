"use client";

import React, { useState } from 'react';
import { Search, FileUp, Download, Eye, Loader2, AlertCircle } from 'lucide-react';
import { exportRequestsReport, getMaterialRequest, getRequestsReport } from '@/domains/gudang/api';
import { displayDate } from '@/domains/gudang/date';
import type { MaterialRequestDetail, MaterialRequestStatus } from '@/domains/gudang/types';
import { ApiError } from '@/shared/lib/api-client';
import { useApiData } from '@/shared/lib/use-api-data';
import Pagination from '@/shared/components/Pagination';

const STATUS_LABEL: Record<MaterialRequestStatus, { label: string; cls: string }> = {
    PENDING: { label: 'Menunggu PPIC', cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    PROSES: { label: 'Menunggu Proses', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
    SELESAI: { label: 'Selesai', cls: 'bg-green-100 text-green-800 border-green-200' },
};

const monthStart = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');


export default function RekapPermintaan(){
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<'ALL' | MaterialRequestStatus>('ALL');
    const [startDate, setStartDate] = useState<string>(monthStart());
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10));
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [detail, setDetail] = useState<MaterialRequestDetail | null>(null);
    const [actionError, setActionError] = useState('');
    const [exporting, setExporting] = useState(false);

    const filters = {
        q: searchQuery || undefined,
        status: filterStatus === 'ALL' ? undefined : filterStatus,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
    };

    const filterKey = JSON.stringify(filters);
    const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
    const page = pageState.key === filterKey ? pageState.page : 1;
    const { data: report, loading, error } = useApiData(
        () => getRequestsReport({ ...filters, page, pageSize: 20 }),
        `${filterKey}|${page}`,
        'Gagal memuat rekap permintaan.',
    );

    const rows = report?.rows ?? [];
    const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
    const anySelected = selected.size > 0;

    const toggleRow = (id: number) =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });

    const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

    const openDetail = async (id: number) => {
        setActionError('');
        try {
            setDetail(await getMaterialRequest(id));
        } catch (err) {
            setActionError(err instanceof ApiError ? err.message : 'Gagal memuat detail permintaan.');
        }
    };

    // Rows ticked -> export only those; nothing ticked -> export everything matching the filters.
    const handleExport = async () => {
        setExporting(true);
        setActionError('');
        try {
            await exportRequestsReport(anySelected ? { ids: [...selected] } : filters);
        } catch (err) {
            setActionError(err instanceof ApiError ? err.message : 'Gagal mengekspor rekap permintaan.');
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

        const rowsToPrint = anySelected ? rows.filter((r) => selected.has(r.id)) : rows;
        const statusText = filterStatus === 'ALL' ? 'Semua Status' : STATUS_LABEL[filterStatus].label;
        const periodeText = `${startDate ? displayDate(startDate) : '-'} s/d ${endDate ? displayDate(endDate) : '-'}`;

        const bodyRows = rowsToPrint.map((item, index) => `
            <tr>
            <td class="center">${index + 1}</td>
            <td>${escapeHtml(displayDate(item.requestDate))}</td>
            <td>${escapeHtml(item.spk)}</td>
            <td>${escapeHtml(item.clientName)}</td>
            <td>${escapeHtml(String(item.productionItem))}<div class="sub">${item.lineCount} barang</div></td>
            <td class="center">${escapeHtml(String(item.toolGroup))}</td>
            <td class="center">${escapeHtml(STATUS_LABEL[item.status].label)}</td>
            </tr>`).join('');

        const emptyRow = `<tr><td colspan="7" class="center">Tidak ada data permintaan.</td></tr>`;

        win.document.write(`<!doctype html>
            <html>
            <head>
                <title>Rekap Permintaan</title>
                <style>
                @page { size: A4 landscape; margin: 12mm; }
                body { font-family: Arial, sans-serif; color: #111; }
                h1 { font-size: 18px; margin: 0 0 4px; text-transform: uppercase; }
                .meta { font-size: 12px; margin: 0 0 12px; color: #444; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; }
                th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: top; }
                th { background: #eee; }
                thead { display: table-header-group; }
                tr { page-break-inside: avoid; }
                .center { text-align: center; }
                .sub { font-size: 10px; color: #555; }
                </style>
            </head>
            <body>
                <h1>Rekap Permintaan</h1>
                <p class="meta">Periode: ${periodeText} &nbsp;|&nbsp; Status: ${escapeHtml(statusText)}${
                searchQuery ? ` &nbsp;|&nbsp; Pencarian: ${escapeHtml(searchQuery)}` : ''
                }${anySelected ? ` &nbsp;|&nbsp; ${rowsToPrint.length} baris dipilih` : ''}</p>
                <table>
                <thead>
                    <tr>
                    <th class="center">No</th>
                    <th>Tgl Permintaan</th>
                    <th>SPK</th>
                    <th>Nama Klien</th>
                    <th>Item Produksi</th>
                    <th class="center">Group Tukang</th>
                    <th class="center">Status</th>
                    </tr>
                </thead>
                <tbody>${rowsToPrint.length ? bodyRows : emptyRow}</tbody>
                </table>
            </body>
            </html>`);
        win.document.close();
        win.focus();
        win.print();
        };

    return(
        <div className='animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10'>
            <div className='flex flex-col justify-start mb-8 gap-2'>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">REKAP PERMINTAAN</h1>
                <p className="text-gray-500 text-sm">Kelola pengajuan permintaan pengeluaran bahan & barang dari gudang.</p>
            </div>

            <div className="flex flex-wrap justify-between items-center bg-white p-4 border border-gray-200 rounded-lg shadow-sm gap-4 mt-5 print:hidden">
                <div className="flex flex-wrap gap-3 items-center">
                    <div>
                        <label className="block text-xs text-black mb-1">Cari Permintaan</label>
                        <span className="relative flex items-center w-100">
                            <input
                            type="text"
                            placeholder="Cari SPK, Proyek, Tukang"
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
                        <label className="block text-xs text-black mb-1">Status Permintaan</label>
                        <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as 'ALL' | MaterialRequestStatus)}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500c text-black"
                        >
                        <option value="ALL" className='text-black'>Semua Status</option>
                        <option value="SELESAI" className='text-black'>Selesai</option>
                        <option value="PROSES" className='text-black'>Menunggu Proses</option>
                        <option value="PENDING" className='text-black'>Menunggu PPIC</option>
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
                        <p className="text-xs font-semibold text-gray-500 uppercase m-2">
                            Tabel Rekap Permintaan Barang{anySelected ? ` (${selected.size} dipilih)` : ''}
                        </p>
                    </div>
                    <div className="flex gap-2 items-end m-2 print:hidden">
                        <button
                        onClick={handleExport}
                        disabled={exporting || loading || rows.length === 0}
                        title="Export Data ke CSV"
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-60"
                        >
                        <FileUp className="w-4 h-4" />
                        <span className="hidden sm:inline">{exporting ? 'Mengekspor...' : 'Export'}</span>
                        </button>
                        <button
                        onClick={handlePrintPdf}
                        disabled={loading || rows.length === 0}
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
                        <th className="px-4 py-3 text-left">Tgl Permintaan</th>
                        <th className="px-4 py-3 text-left">SPK</th>
                        <th className="px-4 py-3 text-left">Nama Klien</th>
                        <th className="px-4 py-3 text-right">Item Produksi</th>
                        <th className="px-4 py-3 text-center">Group Tukang</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-center print:hidden">Aksi</th>
                        <th className="flex px-4 py-3 text-center print:hidden">
                            <div className="flex items-center justify-center">Check
                                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="ml-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                            </div>
                        </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                        <tr>
                            <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                            <div className="flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                <span>Memuat data rekap permintaan...</span>
                            </div>
                            </td>
                        </tr>
                        ) : error ? (
                        <tr>
                            <td colSpan={9} className="px-4 py-8 text-center text-red-500">
                            <div className="flex flex-col items-center justify-center gap-2">
                                <AlertCircle className="w-6 h-6 text-red-500" />
                                <span className="font-semibold">{error}</span>
                            </div>
                            </td>
                        </tr>
                        ) : rows.length === 0 ? (
                        <tr>
                            <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                            Tidak ada data permintaan ditemukan.
                            </td>
                        </tr>
                        ) : (
                        rows.map((item, index) => (
                            <tr
                                key={item.id}
                                className={`hover:bg-gray-50 transition-colors ${anySelected && !selected.has(item.id) ? 'print:hidden' : ''}`}
                            >
                            <td className="px-4 py-3 text-center text-gray-500">{index + 1}</td>
                            <td className="px-4 py-3 text-gray-700 font-medium">{displayDate(item.requestDate)}</td>
                            <td className="px-4 py-3 font-mono font-semibold text-blue-600">{item.spk}</td>
                            <td className="px-4 py-3 text-gray-900">{item.clientName}</td>
                            <td className="px-4 py-3 text-right text-gray-700">
                                {item.productionItem}
                                <span className="block text-xs text-gray-400">{item.lineCount} barang</span>
                            </td>
                            <td className="px-4 py-3 text-center text-gray-700">{item.toolGroup}</td>
                            <td className="px-4 py-3 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_LABEL[item.status].cls}`}>
                                    {STATUS_LABEL[item.status].label}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-center print:hidden">
                                <button
                                onClick={() => openDetail(item.id)}
                                className="flex-1 lg:flex-none flex items-center justify-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded border border-blue-200 transition-colors"
                                >
                                <Eye className='h-4 w-4'></Eye>
                                <span>View Detail</span>
                                </button>
                            </td>
                            <td className="px-4 py-3 text-center print:hidden">
                                <input
                                    type="checkbox"
                                    checked={selected.has(item.id)}
                                    onChange={() => toggleRow(item.id)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                            </td>
                            </tr>
                        ))
                        )}
                    </tbody>
                </table>

                <div className="print:hidden">
                    <Pagination page={page} pageSize={20} total={report?.total ?? 0} onPageChange={(next) => setPageState({ key: filterKey, page: next })} />
                </div>
            </div>

            {detail && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-gray-100">
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Detail Permintaan</h3>
                            <button
                                onClick={() => setDetail(null)}
                                className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-500">SPK</span>
                                <span className="font-mono font-bold text-blue-600">{detail.spk}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-500">Tgl Permintaan</span>
                                <span className="font-medium text-gray-800">{displayDate(detail.requestDate)}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-500">Klien / Item Produksi</span>
                                <span className="font-medium text-gray-800">{detail.clientName} / {detail.productionItem}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-500">Group Tukang</span>
                                <span className="font-medium text-gray-800">{detail.toolGroup}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-500">Status</span>
                                <span className="font-semibold text-gray-800">{STATUS_LABEL[detail.status].label}</span>
                            </div>
                            <div className="py-1">
                                <span className="text-gray-500 block mb-1">Barang diminta:</span>
                                <ul className="bg-gray-50 p-2.5 rounded border border-gray-100 text-xs text-gray-700 space-y-1">
                                    {detail.lines.map((line) => (
                                        <li key={line.itemId} className="flex justify-between gap-2">
                                            <span>{line.itemCode ? `${line.itemCode} - ` : ''}{line.itemName}{line.locationCode ? ` (${line.locationCode})` : ''}</span>
                                            <span className="font-semibold whitespace-nowrap">{line.qty} {line.unit}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            {detail.notes && (
                                <div className="py-1">
                                    <span className="text-gray-500 block mb-1">Catatan:</span>
                                    <p className="bg-gray-50 p-2.5 rounded border border-gray-100 text-xs text-gray-700">{detail.notes}</p>
                                </div>
                            )}
                        </div>
                        <div className="mt-6 text-right">
                            <button
                                onClick={() => setDetail(null)}
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
