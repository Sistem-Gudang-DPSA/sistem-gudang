"use client";

import React, { useState } from "react";
import { Search, FileUp, Download, Loader2, AlertCircle  } from "lucide-react";
import * as XLSX from 'xlsx';
import { listDokubahRows } from "@/domains/ppic/api";
import { formatAngka } from "@/domains/ppic/data/dokubah";
import type { DokubahApiStatus } from "@/domains/ppic/types";
import Pagination from "@/shared/components/Pagination";
import { useApiData } from "@/shared/lib/use-api-data";

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');


export default function RekapDokubah() {
    const [searchQuery, setSearchQuery] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [filterSumber, setFilterSumber] = useState<"ALL" | DokubahApiStatus>("ALL");
    const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

    const filters = {
        search: searchQuery || undefined,
        status: filterSumber === "ALL" ? undefined : filterSumber,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
    };

    const filterKey = JSON.stringify(filters);
    const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
    const page = pageState.key === filterKey ? pageState.page : 1;
    const setPage = (next: number) => setPageState({ key: filterKey, page: next });
    const { data: result, loading: isLoading, error: errorMessage } = useApiData(
        () => listDokubahRows({ ...filters, page, pageSize: 20 }),
        `${filterKey}|${page}`,
        "Gagal memuat rekap dokubah.",
    );
    const filteredData = result?.rows ?? [];
    const total = result?.total ?? 0;
    const summary = result?.summary;
    const realisasiOf = (item: { totalRealisasiNilai: number }) => item.totalRealisasiNilai;
    const isAllSelected = filteredData.length > 0 && filteredData.every((item) => selectedIds.has(item.id));
    // Cards come from the API summary, computed over every row the filters match.
    const overbudgetCount = summary?.overbudgetCount ?? 0;
    const totalRealisasi = summary?.nilaiRealisasi ?? 0;
    const totalAnggaran = summary?.nilaiKuota ?? 0;
    const persenPenggunaan = totalAnggaran > 0 ? (totalRealisasi / totalAnggaran) * 100 : 0;

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredData.map((item) => item.id)));
        }
    };

    const handleSelectRow = (id: string | number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleExportCSV = () => {
          const exportData = filteredData.map((item, index) => ({
            'No': index + 1,
            'Nomor SPK': item.noSpk,
            'Nama Proyek / Klien': item.client,
            'Anggaran': item.totalAnggaran,
            'Realisasi': realisasiOf(item),
            'Status': item.status,
          }));
    
          const worksheet = XLSX.utils.json_to_sheet(exportData);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Dokubah');
          XLSX.writeFile(workbook, 'Rekap_Dokubah.xlsx');
        };

        const handlePrintPDF = () => {
            const win = window.open('', '_blank');
            if (!win) {
                alert('Pop-up diblokir browser. Izinkan pop-up untuk mencetak PDF.');
                return;
            }

            const rowsToPrint = selectedIds.size > 0
                ? filteredData.filter((item) => selectedIds.has(item.id))
                : filteredData;
            const statusText = filterSumber === 'ALL' ? 'Semua Status' : filterSumber;
            const periodeText = startDate || endDate ? `${startDate || '-'} s/d ${endDate || '-'}` : 'Semua Periode';

            const bodyRows = rowsToPrint.map((item, index) => `
                <tr>
                <td class="center">${index + 1}</td>
                <td>${escapeHtml(String(item.noSpk))}</td>
                <td>${escapeHtml(String(item.client))}</td>
                <td class="right">${formatAngka(item.totalAnggaran)}</td>
                <td class="right">${formatAngka(realisasiOf(item))}</td>
                <td class="right">${formatAngka(item.totalAnggaran - realisasiOf(item))}</td>
                <td class="center">${escapeHtml(String(item.status))}</td>
                </tr>`).join('');

            const emptyRow = `<tr><td colspan="7" class="center">Tidak ada data dokubah.</td></tr>`;

            win.document.write(`<!doctype html>
                <html>
                <head>
                    <title>Rekap Dokubah</title>
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
                    .right { text-align: right; }
                    </style>
                </head>
                <body>
                    <h1>Rekap Dokubah</h1>
                    <p class="meta">Periode: ${escapeHtml(periodeText)} &nbsp;|&nbsp; Status: ${escapeHtml(statusText)}${
                    searchQuery ? ` &nbsp;|&nbsp; Pencarian: ${escapeHtml(searchQuery)}` : ''
                    }${selectedIds.size > 0 ? ` &nbsp;|&nbsp; ${rowsToPrint.length} baris dipilih` : total > filteredData.length ? ` &nbsp;|&nbsp; halaman ini (${rowsToPrint.length} dari ${total} data)` : ''}</p>
                    <table>
                    <thead>
                        <tr>
                        <th class="center">No</th>
                        <th>No. SPK</th>
                        <th>Klien &amp; Proyek</th>
                        <th class="right">Anggaran</th>
                        <th class="right">Realisasi</th>
                        <th class="right">Sisa Anggaran</th>
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
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <div className="flex flex-col justify-start mb-8 gap-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">REKAP DOKUBAH</h1>
                <p className="text-gray-500 text-sm">Arsip pencatatan riwayat dokubah produksi.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Total SPK Aktif</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{summary?.totalDokubah ?? 0} SPK</p>
                </div>
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Penggunaan Material Total</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">Rp {formatAngka(totalRealisasi)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                        {persenPenggunaan.toFixed(1)}% dari anggaran Rp {formatAngka(totalAnggaran)}
                    </p>
                </div>
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Peringatan SPK Overbudget</p>
                    <p className={`text-2xl font-bold mt-1 ${overbudgetCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {overbudgetCount} SPK
                    </p>
                </div>
            </div>

            <h3 className="font-bold tracking-tight text-gray-900 m-2 uppercase">Cari Proyek</h3>

            <div className="flex flex-wrap justify-between items-center bg-white p-4 border border-gray-200 rounded-lg shadow-sm gap-4 mt-2">
                <div className="flex flex-wrap gap-3 items-center">
                    <div>
                        <label className="block text-xs text-black mb-1">Pencarian</label>
                        <span className="relative flex items-center w-60">
                            <input
                                type="text"
                                placeholder="Cari No. SPK, Nama Proyek" 
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
                        <label className="block text-xs text-black mb-1">Status SPK</label>
                        <select
                        value={filterSumber}
                        onChange={(e) => setFilterSumber(e.target.value as "ALL" | DokubahApiStatus)}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500c text-black"
                        >
                        <option value="ALL" className='text-black'>Semua Status</option>
                        <option value="DRAFT" className='text-black'>DRAFT</option>
                        <option value="PENDING" className='text-black'>PENDING</option>
                        <option value="APPROVED" className='text-black'>APPROVED</option>
                        <option value="REJECTED" className='text-black'>REJECTED</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-sm mt-6">
                    <div className="flex gap-2 items-end justify-between">
                        <div className="flex gap-2 items-end m-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase m-2">Tabel Rekapitulasi Dokubah</p>
                        </div>

                        <div className="flex gap-2 items-end m-2 print:hidden">
                            <button
                                onClick={handleExportCSV}
                                disabled={isLoading || filteredData.length === 0}
                                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                                title="Export Data ke CSV"
                            >
                                <FileUp className="w-4 h-4" />
                                <span className="hidden sm:inline">Export</span>
                            </button>
                            <button
                                onClick={handlePrintPDF}
                                disabled={isLoading || filteredData.length === 0}
                                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                                title="Print Data ke PDF"
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline">Print PDF</span>
                            </button>
                        </div>
                    </div>
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-100 font-semibold text-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-center w-12">No</th>
                                <th className="px-4 py-3 text-center w-12">No. SPK</th>
                                <th className="px-4 py-3 text-center w-12">Klien &amp; Proyek</th>
                                <th className="px-4 py-3 text-center w-12">Anggaran</th>
                                <th className="px-4 py-3 text-center w-12">Realisasi</th>
                                <th className="px-4 py-3 text-center w-12">Sisa Anggaran</th>
                                <th className="px-4 py-3 text-center w-12">Status</th>
                                <th className="px-4 py-3 text-center w-12">
                                    <div className="flex items-center justify-center">Check
                                        <input 
                                            type="checkbox" 
                                            className="ml-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            checked={isAllSelected}
                                            onChange={handleSelectAll}
                                        />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                <div className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                    <span>Memuat data rekap dokubah...</span>
                                </div>
                                </td>
                            </tr>
                            ) : errorMessage ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-red-500">
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <AlertCircle className="w-6 h-6 text-red-500" />
                                    <span className="font-semibold">{errorMessage}</span>
                                    <span className="text-xs text-gray-400">Pastikan server backend sudah menyala dan endpoint laporan sudah tersedia.</span>
                                </div>
                                </td>
                            </tr>
                            ) : filteredData.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                Tidak ada data dokubah ditemukan.
                                </td>
                            </tr>
                            ) : (
                            filteredData.map((item, index) => (
                                <tr
                                    key={item.id}
                                    className={`transition-colors ${realisasiOf(item) > item.totalAnggaran ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}
                                >
                                <td className="px-4 py-3 text-center text-gray-500">{(page - 1) * 20 + index + 1}</td>
                                <td className="px-4 py-3 text-gray-700 font-medium">{item.noSpk}</td>
                                <td className="px-4 py-3 font-mono font-semibold text-blue-600">{item.client}</td>
                                <td className="px-4 py-3">
                                    <span className="font-medium text-gray-900">{formatAngka(item.totalAnggaran)}</span>
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-gray-800">
                                    {formatAngka(realisasiOf(item))}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {formatAngka(item.totalAnggaran - realisasiOf(item))}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className="font-medium text-gray-900">{item.status}</span>
                                </td>
                                <td className="px-4 py-3 text-center print:hidden">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" 
                                        checked={selectedIds.has(item.id)}
                                        onChange={() => handleSelectRow(item.id)}
                                    />
                                </td>
                                </tr>
                            ))
                            )}
                        </tbody>
                    </table>
                    <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
            </div>
        </div>
    )
}