"use client";

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { getStockOpnameSummary, listMutations } from '@/domains/ppic/api';
import { useApiData } from '@/shared/lib/use-api-data';

type TipeMutasi = 'Masuk' | 'Keluar';

type MutasiBarang = {
  id: string; // "in-12" / "out-34"
  tanggal: string; // ISO, contoh: 2026-10-01T09:30
  noReferensiSpk: string;
  kodeBarang: string;
  namaItem: string;
  tipe: TipeMutasi;
  qty: number;
};

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const cellClass = 'px-4 py-3 border-b border-r border-gray-300';
const cardClass = 'bg-white rounded-sm border border-gray-100 shadow-md p-6 min-h-32';
const labelClass = 'shrink-0 text-sm font-medium text-gray-800';
const fieldClass = 'w-full pl-3 pr-9 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors';
const checkboxClass = 'w-4 h-4 accent-[#FF8A00] cursor-pointer disabled:cursor-not-allowed';
const orangeButtonClass = 'px-5 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed';

const formatAngka = (n: number) => n.toLocaleString('id-ID');
// The API only has the date (no time of day), so a date-only value is shown without a time
const formatTanggalJam = (iso: string) =>
  iso.length === 10
    ? new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { dateStyle: 'medium' })
    : new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// YYYY-MM -> "September 2026"
const formatPeriode = (periode: string) => {
  const [y, m] = periode.split('-');
  return `${BULAN[Number(m) - 1]} ${y}`;
};

export default function RekapStokOpnameMutasiStok() {
  // State periode dipindah ke atas karena ringkasan mengikutinya
  const [filterPeriode, setFilterPeriode] = useState('');

  // ponytail: loads first 100 mutations and filters them here, move the filters to the API params when the list outgrows it
  const { data: result, loading, error } = useApiData(
    () => listMutations({ pageSize: 100 }),
    'list',
    'Gagal memuat rekap mutasi stok.',
  );
  const data: MutasiBarang[] = result?.rows ?? [];

  // Ringkasan stok opname mengikuti periode yang dipilih (semua periode kalau kosong)
  const summaryParams = filterPeriode ? { year: Number(filterPeriode.slice(0, 4)), month: Number(filterPeriode.slice(5, 7)) } : undefined;
  const { data: summary } = useApiData(
    () => getStockOpnameSummary(summaryParams),
    filterPeriode || 'all',
    'Gagal memuat ringkasan stok opname.',
  );
  const ringkasan = summary ?? { totalAudit: 0, totalItemSelisih: 0, totalAdjustmentNilai: 0 };

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Periode = bulan dari tanggal mutasi
  const periodeOptions = Array.from(new Set(data.map((d) => d.tanggal.slice(0, 7)))).sort();

  const filteredData = data.filter((item) =>
    filterPeriode === '' || item.tanggal.startsWith(filterPeriode)
  );

  const checkedRows = filteredData.filter((item) => selectedIds.has(item.id));
  const allChecked = filteredData.length > 0 && checkedRows.length === filteredData.length;

  // Export & cetak pakai baris yang dicentang; kalau tidak ada, semua hasil filter
  const rowsToExport = checkedRows.length > 0 ? checkedRows : filteredData;

  const toggleAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredData.forEach((item) => (allChecked ? next.delete(item.id) : next.add(item.id)));
      return next;
    });
  };

  const toggleOne = (id: string) => {
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
      'Tanggal & Jam': formatTanggalJam(item.tanggal),
      'No. Referensi SPK': item.noReferensiSpk,
      'Kode Barang': item.kodeBarang,
      'Nama Item': item.namaItem,
      'Tipe': item.tipe,
      'Qty Mutasi': item.qty,
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Mutasi Barang');
    XLSX.writeFile(book, 'Rekap_Stok_Opname_Mutasi_Stok.xlsx');
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
        <td>${escapeHtml(formatTanggalJam(item.tanggal))}</td>
        <td>${escapeHtml(item.noReferensiSpk)}</td>
        <td>${escapeHtml(item.kodeBarang)}</td>
        <td>${escapeHtml(item.namaItem)}</td>
        <td>${item.tipe}</td>
        <td class="right">${formatAngka(item.qty)}</td>
      </tr>`).join('');
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Rekap Stok Opname &amp; Mutasi Stok</title>
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
          <h1>Tabel Mutasi Barang</h1>
          <table>
            <thead>
              <tr><th class="center">No.</th><th>Tanggal &amp; Jam</th><th>No. Referensi SPK</th><th>Kode Barang</th><th>Nama Item</th><th>Tipe</th><th>Qty Mutasi</th></tr>
            </thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </body>
      </html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const adjustment = ringkasan.totalAdjustmentNilai;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-[18px] font-extrabold text-black tracking-wide">Rekap Stok Opname &amp; Mutasi Stok</h1>
      </div>

      {/* Kontainer konten */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Ringkasan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Total Audit Stok Opname</h2>
            <p className="text-base font-bold text-gray-900">{formatAngka(ringkasan.totalAudit)} kali selesai</p>
          </div>
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Total Item Selisih</h2>
            <p className="text-base font-bold text-gray-900">{formatAngka(ringkasan.totalItemSelisih)} item</p>
          </div>
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Total Adjusment Nilai (Rp)</h2>
            <p className={`text-base font-bold ${adjustment < 0 ? 'text-gray-900' : 'text-gray-900'}`}>
              {adjustment < 0 ? '\u2212' : '+'} {formatAngka(Math.abs(adjustment))} ({adjustment < 0 ? 'Kerugian' : 'Keuntungan'})
            </p>
          </div>
        </div>

        {/* Filter */}
        <h2 className="text-base font-bold text-gray-900 mb-3">Filter Proyek</h2>
        <div className="flex items-center gap-2 mb-12">
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

        {/* Tabel mutasi */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-base font-bold text-gray-900">Tabel Mutasi Barang</h2>
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
                <th scope="col" className={cellClass}>Tanggal &amp; Jam</th>
                <th scope="col" className={cellClass}>No. Referensi SPK</th>
                <th scope="col" className={cellClass}>Kode Barang</th>
                <th scope="col" className={cellClass}>Nama Item</th>
                <th scope="col" className={cellClass}>Tipe</th>
                <th scope="col" className={cellClass}>Qty Mutasi</th>
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
                  className={`transition-colors ${selectedIds.has(item.id) ? 'bg-orange-50/60' : 'hover:bg-orange-50/20'}`}
                >
                  <td className={cellClass}>{index + 1}</td>
                  <td className={cellClass}>{formatTanggalJam(item.tanggal)}</td>
                  <td className={cellClass}>{item.noReferensiSpk}</td>
                  <td className={cellClass}>{item.kodeBarang}</td>
                  <td className={cellClass}>{item.namaItem}</td>
                  <td className={cellClass}>{item.tipe}</td>
                  <td className={cellClass}>
                    {item.tipe === 'Masuk' ? '+' : '\u2212'} {formatAngka(item.qty)}
                  </td>
                  <td className={`${cellClass} text-right`}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleOne(item.id)}
                      aria-label={`Centang ${item.noReferensiSpk}`}
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