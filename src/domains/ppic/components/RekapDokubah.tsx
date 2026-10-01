"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown } from 'lucide-react';
import { getStatusBadge, STATUS_OPTIONS } from '@/domains/ppic/components/Dokubah';
import { detailRekapDokubahPath, escapeHtml, formatRupiah, type StatusDokubah } from '@/domains/ppic/data/dokubah';
import { listDokubahRows, STATUS_TO_UI } from '@/domains/ppic/api';
import { useApiData } from '@/shared/lib/use-api-data';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const cellClass = 'px-4 py-3 border-b border-r border-gray-300';
const cardClass = 'bg-white rounded-sm border border-gray-100 shadow-md p-6 min-h-32';
const labelClass = 'shrink-0 text-sm font-medium text-gray-800';
const fieldClass = 'w-full pl-3 pr-9 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors';
const checkboxClass = 'w-4 h-4 accent-[#FF8A00] cursor-pointer disabled:cursor-not-allowed';
const orangeButtonClass = 'px-5 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed';

// YYYY-MM -> "September 2026"
const formatPeriode = (periode: string) => {
  const [y, m] = periode.split('-');
  return `${BULAN[Number(m) - 1]} ${y}`;
};

export default function RekapDokubah() {
  const router = useRouter();
  // ponytail: loads first 100 rows only; the API list rows already carry the rupiah realisation, so no per-row detail calls
  const { data: result, loading, error } = useApiData(
    () => listDokubahRows({ pageSize: 100 }),
    'list',
    'Gagal memuat rekap Dokubah.',
  );
  const data = (result?.rows ?? []).map((row) => ({
    ...row,
    status: STATUS_TO_UI[row.status],
    realisasi: row.totalRealisasiNilai,
    sisa: row.totalAnggaran - row.totalRealisasiNilai,
  }));
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusDokubah | ''>('');
  const [filterPeriode, setFilterPeriode] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Ringkasan dihitung dari seluruh SPK, tidak ikut filter
  const totalSpkAktif = data.filter((item) => item.status === 'Approved').length;
  const totalSpkOverbudget = data.filter((item) => item.sisa < 0).length;
  // Satuan bahan berbeda-beda, jadi pemakaian material dibandingkan dalam nilai rupiah
  // totalAnggaran is computed by the server as the sum of kuota * hargaSatuan
  const nilaiKuota = data.reduce((sum, item) => sum + item.totalAnggaran, 0);
  const nilaiRealisasi = data.reduce((sum, item) => sum + item.realisasi, 0);
  const persenMaterial = nilaiKuota === 0 ? 0 : Math.round((nilaiRealisasi / nilaiKuota) * 100);

  // Periode = bulan tanggal mulai SPK
  const periodeOptions = Array.from(new Set(data.map((item) => item.tanggalMulai.slice(0, 7)))).sort();

  const filteredData = data.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = q === '' ||
      item.noSpk.toLowerCase().includes(q) ||
      item.client.toLowerCase().includes(q);
    const matchesStatus = filterStatus === '' || item.status === filterStatus;
    const matchesPeriode = filterPeriode === '' || item.tanggalMulai.startsWith(filterPeriode);
    return matchesSearch && matchesStatus && matchesPeriode;
  });

  const checkedRows = filteredData.filter((item) => selectedIds.has(item.id));
  const allChecked = filteredData.length > 0 && checkedRows.length === filteredData.length;

  // Export & cetak pakai baris yang dicentang; kalau tidak ada yang dicentang, semua baris hasil filter
  const rowsToExport = checkedRows.length > 0 ? checkedRows : filteredData;

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
      'No. SPK': item.noSpk,
      'Klien & Proyek': item.client,
      'Anggaran': item.totalAnggaran,
      'Realisasi': item.realisasi,
      'Sisa Anggaran': item.sisa,
      'Status': item.status,
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Rekap Dokubah');
    XLSX.writeFile(book, 'Rekap_Dokubah_PPIC.xlsx');
  };

  // Buka jendela berisi tabel saja lalu panggil dialog print (pilih "Save as PDF")
  const handleCetakPdf = () => {
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
        <td class="right">${formatRupiah(item.totalAnggaran)}</td>
        <td class="right">${formatRupiah(item.realisasi)}</td>
        <td class="right">${formatRupiah(item.sisa)}</td>
        <td>${item.status}</td>
      </tr>`).join('');
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Rekap Dokubah PPIC</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 18px; margin: 0 0 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
            th { background: #eee; }
            .center { text-align: center; }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          <h1>Rekapitulasi Dokubah per SPK</h1>
          <table>
            <thead>
              <tr><th class="center">No.</th><th>No. SPK</th><th>Klien &amp; Proyek</th><th>Anggaran</th><th>Realisasi</th><th>Sisa Anggaran</th><th>Status</th></tr>
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
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-[18px] font-extrabold text-black tracking-wide">Rekap Dokubah</h1>
      </div>

      {/* Kontainer konten */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Ringkasan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Total SPK Aktif</h2>
            <p className="text-base font-bold text-gray-900">{totalSpkAktif} Proyek</p>
          </div>
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Penggunaan Material Total</h2>
            <p className="text-base font-bold text-gray-900">{persenMaterial} % dari total material</p>
          </div>
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Peringatan SPK Overbudget</h2>
            <p className={`text-base font-bold ${totalSpkOverbudget > 0 ? 'text-red-600' : 'text-gray-900'}`}>{totalSpkOverbudget} Proyek</p>
          </div>
        </div>

        {/* Pencarian & filter */}
        <h2 className="text-base font-bold text-gray-900 mb-3">Cari Proyek</h2>
        <div className="grid grid-cols-1 md:grid-cols-[auto_auto] md:justify-start gap-x-16 gap-y-3 mb-8">
          <div className="flex items-center gap-2">
            <label htmlFor="rekap-status" className={`${labelClass} w-20`}>Status SPK</label>
            <span className="text-gray-800">:</span>
            <div className="relative w-56">
              <select
                id="rekap-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as StatusDokubah | '')}
                className={`${fieldClass} appearance-none cursor-pointer`}
              >
                <option value="">Semua Status</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="rekap-periode" className={labelClass}>Periode</label>
            <span className="text-gray-800">:</span>
            <div className="relative w-56">
              <select
                id="rekap-periode"
                value={filterPeriode}
                onChange={(e) => setFilterPeriode(e.target.value)}
                className={`${fieldClass} appearance-none cursor-pointer`}
              >
                <option value="">Semua Periode</option>
                {periodeOptions.map((p) => (
                  <option key={p} value={p}>{formatPeriode(p)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="rekap-cari" className={`${labelClass} w-20`}>Cari Data</label>
            <span className="text-gray-800">:</span>
            <div className="relative w-56">
              <input
                id="rekap-cari"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="No. SPK atau klien"
                className={fieldClass}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-800 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tabel rekapitulasi */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-base font-bold text-gray-900">Tabel Rekapitulasi Dokubah per SPK</h2>
          <div className="flex flex-wrap gap-4">
            <button type="button" onClick={handleExportExcel} disabled={rowsToExport.length === 0} className={orangeButtonClass}>
              Export Excel
            </button>
            <button type="button" onClick={handleCetakPdf} disabled={rowsToExport.length === 0} className={orangeButtonClass}>
              Cetak PDF
            </button>
          </div>
        </div>
        <div className="overflow-x-auto border-t border-l border-gray-300 rounded-sm">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="bg-gray-100 text-gray-800 font-semibold text-xs">
              <tr>
                <th scope="col" className={`${cellClass} w-14`}>No.</th>
                <th scope="col" className={cellClass}>No. SPK</th>
                <th scope="col" className={cellClass}>Klien &amp; Proyek</th>
                <th scope="col" className={cellClass}>Anggaran</th>
                <th scope="col" className={cellClass}>Realisasi</th>
                <th scope="col" className={cellClass}>Sisa Anggaran</th>
                <th scope="col" className={cellClass}>Status</th>
                <th scope="col" className={`${cellClass} w-24`}>
                  <label className="flex items-center justify-between gap-2 cursor-pointer">
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
                  onClick={() => router.push(detailRekapDokubahPath(item.id))}
                  className={`cursor-pointer transition-colors ${selectedIds.has(item.id) ? 'bg-orange-50/60' : 'hover:bg-orange-50/20'}`}
                >
                  <td className={cellClass}>{index + 1}</td>
                  <td className={`${cellClass} font-semibold text-gray-900`}>
                    {/* Link supaya baris tetap bisa dibuka lewat keyboard; klik di sel lain ditangani onClick baris */}
                    <Link href={detailRekapDokubahPath(item.id)} onClick={(e) => e.stopPropagation()} className="hover:underline">
                      {item.noSpk}
                    </Link>
                  </td>
                  <td className={cellClass}>{item.client}</td>
                  <td className={cellClass}>{formatRupiah(item.totalAnggaran)}</td>
                  <td className={cellClass}>{formatRupiah(item.realisasi)}</td>
                  <td className={`${cellClass} ${item.sisa < 0 ? 'text-red-600 font-semibold' : ''}`}>{formatRupiah(item.sisa)}</td>
                  <td className={cellClass}>{getStatusBadge(item.status)}</td>
                  {/* Sel centang tidak ikut membuka halaman detail */}
                  <td className={`${cellClass} text-right cursor-default`} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleOne(item.id)}
                      aria-label={`Centang ${item.noSpk}`}
                      className={`${checkboxClass} align-middle`}
                    />
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={8} className={`${cellClass} px-6 py-10 text-center text-gray-400 italic`}>
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
