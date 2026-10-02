"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Funnel, FileSpreadsheet, Printer, Plus, Eye, CircleCheck, CircleX, Clock, FilePen } from 'lucide-react';
import {
  buat_dokubah_path,
  escapeHtml,
  formatTanggal,
  type StatusDokubah,
  viewDokubahPath,
} from '@/domains/ppic/data/dokubah';
import { listDokubah } from '@/domains/ppic/api';
import { useApiData } from '@/shared/lib/use-api-data';

export const STATUS_OPTIONS: StatusDokubah[] = ['Draft', 'Pending', 'Approved', 'Rejected'];

export const getStatusBadge =(status: StatusDokubah) => {
  switch (status) {
    case 'Draft':
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"><FilePen className="w-3 h-3" /> Draft</span>;
    case 'Approved':
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200"><CircleCheck className="w-3 h-3" /> Approved</span>;
    case 'Rejected':
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200"><CircleX className="w-3 h-3" /> Rejected</span>;
    default:
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200"><Clock className="w-3 h-3" /> Pending</span>;
  }
};

const cellClass = 'px-4 py-3 border-b border-r border-gray-200';
const lastCellClass = 'px-4 py-3 border-b border-gray-200';
const checkboxClass = 'w-4 h-4 accent-[#FF8A00] cursor-pointer disabled:cursor-not-allowed';
const orangeButtonClass = 'flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed';
const filterInputClass = 'border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00]';

export default function DokubahPPIC() {
  // ponytail: loads first 100 rows and filters them here, move the filters to the API params when the list outgrows it
  const { data: result, loading, error } = useApiData(
    () => listDokubah({ pageSize: 100 }),
    'list',
    'Gagal memuat daftar Dokubah.',
  );
  const data = result?.rows ?? [];
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [filterStatus, setFilterStatus] = useState<StatusDokubah | ''>('');
  const [filterDari, setFilterDari] = useState('');
  const [filterSampai, setFilterSampai] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const isFilterActive = filterStatus !== '' || filterDari !== '' || filterSampai !== '';

  const filteredData = data.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = q === '' ||
      item.noSpk.toLowerCase().includes(q) ||
      item.client.toLowerCase().includes(q);
    const matchesStatus = filterStatus === '' || item.status === filterStatus;
    // Format YYYY-MM-DD bisa dibandingkan langsung sebagai string
    const matchesDari = filterDari === '' || item.tanggalMulai >= filterDari;
    const matchesSampai = filterSampai === '' || item.tanggalMulai <= filterSampai;
    return matchesSearch && matchesStatus && matchesDari && matchesSampai;
  });

  const checkedRows = filteredData.filter((item) => selectedIds.has(item.id));
  const allChecked = filteredData.length > 0 && checkedRows.length === filteredData.length;

  // Export & print pakai baris yang dicentang; kalau tidak ada yang dicentang, semua baris hasil filter
  const rowsToExport = checkedRows.length > 0 ? checkedRows : filteredData;

  const resetFilter = () => {
    setFilterStatus('');
    setFilterDari('');
    setFilterSampai('');
  };

  const toggleAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredData.forEach((item) => (allChecked ? next.delete(item.id) : next.add(item.id)));
      return next;
    });
  };

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const rows = rowsToExport.map((item, index) => ({
      'No.': index + 1,
      'No. SPK / Proyek': item.noSpk,
      'Nama Client': item.client,
      'Tanggal Mulai': formatTanggal(item.tanggalMulai),
      'Tanggal Selesai': formatTanggal(item.tanggalSelesai),
      'Status': item.status,
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Dokubah');
    XLSX.writeFile(book, 'Dokubah_PPIC.xlsx');
  };

  // Buka jendela berisi tabel saja lalu panggil dialog print (pilih "Save as PDF")
  const handlePrintPdf = () => {
    const win = window.open('', '_blank');
    if (!win) {
      alert('Pop-up diblokir browser. Izinkan pop-up untuk mencetak PDF.');
      return;
    }
    const bodyRows = rowsToExport.map((item, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td>${escapeHtml(item.noSpk)}</td>
        <td>${escapeHtml(item.client)}</td>
        <td>${formatTanggal(item.tanggalMulai)}</td>
        <td>${formatTanggal(item.tanggalSelesai)}</td>
        <td>${item.status}</td>
      </tr>`).join('');
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Dokubah PPIC</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 18px; margin: 0 0 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
            th { background: #eee; }
            .center { text-align: center; }
          </style>
        </head>
        <body>
          <h1>Dokubah PPIC</h1>
          <table>
            <thead>
              <tr><th class="center">No.</th><th>No. SPK / Proyek</th><th>Nama Client</th><th>Tanggal Mulai</th><th>Tanggal Selesai</th><th>Status</th></tr>
            </thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </body>
      </html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col justify-start mb-8 gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">DOKUBAH</h1>
        <p className="text-gray-500 text-sm">Pengajuan dan pemantauan dokumen perubahan (Dokubah) per SPK / proyek.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative w-full sm:max-w-xl">
              <input
                type="text"
                value={searchQuery}
                maxLength={100}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all shadow-sm"
                placeholder="Cari No. SPK / Proyek atau nama client..."
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            <button
              onClick={() => setShowFilter((v) => !v)}
              aria-expanded={showFilter}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 border rounded-xl text-sm font-semibold shadow-sm transition-all shrink-0 ${
                showFilter || isFilterActive
                  ? 'border-[#FF8A00] text-[#FF8A00] bg-orange-50'
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
            >
              <Funnel className="w-4 h-4" />
              <span>Filter</span>
              {isFilterActive && <span className="w-2 h-2 rounded-full bg-[#FF8A00]" />}
            </button>
          </div>

          {showFilter && (
            <div className="flex flex-wrap items-end gap-4 p-4 bg-white border border-gray-200 rounded-xl">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as StatusDokubah | '')}
                  className={`${filterInputClass} cursor-pointer`}
                >
                  <option value="">Semua Status</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal Mulai</label>
                <div className="flex items-center gap-2">
                  <input type="date" value={filterDari} onChange={(e) => setFilterDari(e.target.value)} className={filterInputClass} aria-label="Tanggal mulai dari" />
                  <span className="text-xs text-gray-500">s/d</span>
                  <input type="date" value={filterSampai} onChange={(e) => setFilterSampai(e.target.value)} className={filterInputClass} aria-label="Tanggal mulai sampai" />
                </div>
              </div>

              {isFilterActive && (
                <button onClick={resetFilter} className="text-xs text-orange-600 font-bold hover:underline pb-2.5">
                  Reset
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
            {checkedRows.length > 0 && (
              <p className="text-xs text-gray-500 sm:mr-auto">
                {checkedRows.length} data dicentang — Export &amp; Print hanya untuk data yang dicentang.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button onClick={handleExportExcel} disabled={rowsToExport.length === 0} className={orangeButtonClass}>
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
              <button onClick={handlePrintPdf} disabled={rowsToExport.length === 0} className={orangeButtonClass}>
                <Printer className="w-4 h-4" />
                <span>Print PDF</span>
              </button>
              <Link href={buat_dokubah_path} className={orangeButtonClass}>
                <Plus className="w-4 h-4" />
                <span>Buat Dokubah</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="bg-gray-100 text-gray-700 font-semibold">
              <tr>
                <th scope="col" className={`${cellClass} w-14 text-center`}>No.</th>
                <th scope="col" className={cellClass}>No. SPK / Proyek</th>
                <th scope="col" className={cellClass}>Nama Client</th>
                <th scope="col" className={cellClass}>Tanggal Mulai</th>
                <th scope="col" className={cellClass}>Tanggal Selesai</th>
                <th scope="col" className={cellClass}>Status</th>
                <th scope="col" className={`${cellClass} text-center`}>Aksi</th>
                <th scope="col" className={`${lastCellClass} text-center`}>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <span>Check</span>
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      disabled={filteredData.length === 0}
                      aria-label="Centang semua"
                      className={checkboxClass}
                    />
                  </label>
                </th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              {filteredData.map((item, index) => (
                <tr
                  key={item.id}
                  className={`transition-colors ${selectedIds.has(item.id) ? 'bg-orange-50/60' : 'hover:bg-orange-50/20'}`}
                >
                  <td className={`${cellClass} text-center text-gray-700`}>{index + 1}</td>
                  <td className={`${cellClass} font-semibold text-gray-900`}>{item.noSpk}</td>
                  <td className={cellClass}>{item.client}</td>
                  <td className={cellClass}>{formatTanggal(item.tanggalMulai)}</td>
                  <td className={cellClass}>{formatTanggal(item.tanggalSelesai)}</td>
                  <td className={cellClass}>{getStatusBadge(item.status)}</td>
                  <td className={`${cellClass} text-center`}>
                    <Link
                      href={viewDokubahPath(item.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#FF8A00] text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </Link>
                  </td>
                  <td className={`${lastCellClass} text-center`}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleOne(item.id)}
                      aria-label={`Centang ${item.noSpk}`}
                      className={checkboxClass}
                    />
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-400 italic border-b border-gray-200">
                    {loading ? 'Memuat data...' : error || 'Data tidak ditemukan.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
