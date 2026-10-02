"use client";

import React, { useRef, useState } from 'react';
import { Search, ChevronDown, CalendarDays, FileUp, Download } from 'lucide-react';
import { listMutations } from '@/domains/ppic/api';
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
  lokasi: string;
};

const TIPE_OPTIONS: TipeMutasi[] = ['Masuk', 'Keluar'];

const cellClass = 'px-4 py-3 border-b border-r border-gray-300';
const cardClass = 'bg-white rounded-sm border border-gray-100 shadow-md p-6 min-h-32';
const labelClass = 'w-24 shrink-0 text-sm font-medium text-gray-800';
const fieldClass = 'w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors';
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

// Satu baris filter: label : isi
function FilterRow({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className={labelClass}>{label}</label>
      <span className="text-gray-800">:</span>
      <div className="relative w-56">{children}</div>
    </div>
  );
}

// Input tanggal dengan ikon kalender
function DateInput({ id, value, onChange, min, max }: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldClass} [&::-webkit-calendar-picker-indicator]:hidden`}
      />
      <button
        type="button"
        aria-label="Buka kalender"
        onClick={() => ref.current?.showPicker()}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-800 hover:opacity-70"
      >
        <CalendarDays className="w-5 h-5" />
      </button>
    </>
  );
}

export default function RekapMutasiBarang() {
  // ponytail: loads first 100 mutations and filters them here, move the filters to the API params when the list outgrows it
  const { data: result, loading, error } = useApiData(
    () => listMutations({ pageSize: 100 }),
    'list',
    'Gagal memuat rekap mutasi barang.',
  );
  const data: MutasiBarang[] = result?.rows ?? [];

  const [filterTipe, setFilterTipe] = useState<TipeMutasi | ''>('');
  const [filterLokasi, setFilterLokasi] = useState('');
  const [periodeAwal, setPeriodeAwal] = useState('');
  const [periodeAkhir, setPeriodeAkhir] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Ringkasan dihitung dari seluruh data, tidak ikut filter
  const totalTransaksi = data.length;
  const totalMasuk = data.filter((d) => d.tipe === 'Masuk').reduce((s, d) => s + d.qty, 0);
  const totalKeluar = data.filter((d) => d.tipe === 'Keluar').reduce((s, d) => s + d.qty, 0);

  const lokasiOptions = Array.from(new Set(data.map((d) => d.lokasi))).sort();

  const filteredData = data.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    const tgl = item.tanggal.slice(0, 10);
    const matchesSearch = q === '' ||
      item.noReferensiSpk.toLowerCase().includes(q) ||
      item.kodeBarang.toLowerCase().includes(q) ||
      item.namaItem.toLowerCase().includes(q);
    const matchesTipe = filterTipe === '' || item.tipe === filterTipe;
    const matchesLokasi = filterLokasi === '' || item.lokasi === filterLokasi;
    const matchesAwal = periodeAwal === '' || tgl >= periodeAwal;
    const matchesAkhir = periodeAkhir === '' || tgl <= periodeAkhir;
    return matchesSearch && matchesTipe && matchesLokasi && matchesAwal && matchesAkhir;
  });

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
    XLSX.writeFile(book, 'Rekap_Mutasi_Barang.xlsx');
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
          <title>Rekap Mutasi Barang</title>
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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-[18px] font-extrabold text-black tracking-wide">Rekap Mutasi Barang</h1>
      </div>

      {/* Kontainer konten */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Ringkasan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Total Transaksi Mutasi</h2>
            <p className="text-base font-bold text-gray-900">{formatAngka(totalTransaksi)} Transaksi</p>
          </div>
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Total Barang Masuk</h2>
            <p className="text-base font-bold text-gray-900">+ {formatAngka(totalMasuk)} Unit</p>
          </div>
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Total Barang Keluar</h2>
            <p className="text-base font-bold text-gray-900">&minus; {formatAngka(totalKeluar)} Unit</p>
          </div>
        </div>

        {/* Pencarian & filter */}
        <h2 className="text-base font-bold text-gray-900 mb-3">Cari Proyek</h2>
        <div className="grid grid-cols-1 md:grid-cols-[auto_auto] md:justify-start gap-x-16 gap-y-3 mb-8">
          <FilterRow id="mutasi-tipe" label="Tipe Mutasi">
            <select
              id="mutasi-tipe"
              value={filterTipe}
              onChange={(e) => setFilterTipe(e.target.value as TipeMutasi | '')}
              className={`${fieldClass} appearance-none cursor-pointer`}
            >
              <option value="">Semua Tipe</option>
              {TIPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </FilterRow>

          <FilterRow id="mutasi-lokasi" label="Lokasi">
            <select
              id="mutasi-lokasi"
              value={filterLokasi}
              onChange={(e) => setFilterLokasi(e.target.value)}
              className={`${fieldClass} appearance-none cursor-pointer`}
            >
              <option value="">Semua Lokasi</option>
              {lokasiOptions.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </FilterRow>

          <FilterRow id="mutasi-awal" label="Periode Awal">
            <DateInput id="mutasi-awal" value={periodeAwal} onChange={setPeriodeAwal} max={periodeAkhir || undefined} />
          </FilterRow>

          <FilterRow id="mutasi-cari" label="Cari Data">
            <input
              id="mutasi-cari"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={fieldClass}
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-800 pointer-events-none" />
          </FilterRow>

          <FilterRow id="mutasi-akhir" label="Periode Akhir">
            <DateInput id="mutasi-akhir" value={periodeAkhir} onChange={setPeriodeAkhir} min={periodeAwal || undefined} />
          </FilterRow>
        </div>

        {/* Tabel mutasi */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-base font-bold text-gray-900">Tabel Mutasi Barang</h2>
          <div className="flex gap-2 items-end m-2 print:hidden">
              <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  title="Export Data ke CSV"
              >
                  <FileUp className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
              </button>
              <button
                  onClick={handlePrintPdf}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  title="Print Data ke PDF"
              >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Print PDF</span>
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