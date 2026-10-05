"use client";

import { useCan } from '@/domains/auth/user-context';
import React, { useEffect, useRef, useState } from 'react';
import { Search, Calendar, Plus, AlertCircle, Download, X, ChevronDown, Pencil, Lock } from 'lucide-react';
import { createOutbound, exportOutboundReport, listOutbound, listItems, updateOutbound } from '@/domains/inventory/api';
import type { RecipientType, WarehouseType, ItemListRow, OutboundRow } from '@/domains/inventory/types';
import { displayDate, todayIso } from '@/domains/inventory/date';
import { ApiError } from '@/shared/lib/api-client';
import { useApiData } from '@/shared/lib/use-api-data';
import Pagination from '@/shared/components/Pagination';
import { INTEGER_INPUT, digitsOnly } from '@/shared/lib/input';

// Satu baris di tabel form. SPK, client, dan item/project ada per baris di desain, sedangkan API
// menyimpannya per transaksi, jadi saat simpan baris dikelompokkan menjadi satu transaksi per kombinasi itu.
type BarisForm = { spk: string; namaClient: string; namaItem: string; itemId: string; qty: string; pic: string };

const barisKosong = (): BarisForm => ({ spk: "", namaClient: "", namaItem: "", itemId: "", qty: "", pic: "" });

const formKosong = () => ({
  namaPengambil: "",
  tanggal: todayIso(),
  warehouseType: "" as WarehouseType | "",
  recipientType: "" as RecipientType | "",
  baris: [barisKosong(), barisKosong(), barisKosong()],
});

// Barang keluar hanya bisa diedit selama 1 hari (24 jam) sejak transaksi dicatat
const BATAS_EDIT_MS = 24 * 60 * 60 * 1000;
const PESAN_TIDAK_BISA_EDIT = 'Data barang keluar ini sudah tidak bisa diedit karena sudah lewat 1 hari sejak dicatat.';

const batasEdit = (trx: OutboundRow) => new Date(trx.createdAt).getTime() + BATAS_EDIT_MS;
// createdAt yang tidak valid menghasilkan NaN, sehingga dianggap tidak bisa diedit
const bisaEdit = (trx: OutboundRow, now: number) => now < batasEdit(trx);

const tampilWaktu = (ms: number) => {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

type EditTarget = { trx: OutboundRow; lineIndex: number };
type EditForm = { tanggal: string; namaClient: string; spk: string; namaItem: string; itemId: string; qty: string };

const cellClass = 'px-3 py-2.5 border-b border-r border-gray-300';
const formCellClass = 'border-b border-r border-gray-300';
const formHeadClass = `${formCellClass} px-2 py-2.5 font-medium whitespace-nowrap`;
const formInputClass = 'w-full px-2 py-2 bg-transparent text-sm text-gray-800 focus:outline-none focus:bg-orange-50/60';
const labelClass = 'block text-sm text-gray-800 mb-1.5';
const fieldClass = 'w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors';
const orangeButtonClass = 'flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed';

export default function BarangKeluarGudang() {
  const canCreate = useCan('outbound.create');
  const canExport = useCan('report.view');
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTanggal, setFilterTanggal] = useState("");
  const tanggalRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<ItemListRow[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(formKosong);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const formTanggalRef = useRef<HTMLInputElement>(null);

  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [peringatan, setPeringatan] = useState("");
  // Diperbarui tiap menit supaya tombol Edit otomatis terkunci begitu batas 1 hari lewat
  const [now, setNow] = useState(() => Date.now());
  const editTanggalRef = useRef<HTMLInputElement>(null);

  const dateRange = filterTanggal ? { startDate: filterTanggal, endDate: filterTanggal } : {};

  const filterKey = JSON.stringify([searchQuery, dateRange]);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ key: filterKey, page: next });
  const { data: result, loading, error, reload } = useApiData(
    () => listOutbound({ page, pageSize: 20, search: searchQuery || undefined, ...dateRange }),
    `${filterKey}|${page}`,
    'Gagal memuat data barang keluar.',
  );
  const rows = result?.rows ?? [];
  const total = result?.total ?? 0;

  useEffect(() => {
    listItems({ pageSize: 100 }).then((res) => setItems(res.rows)).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // The table shows one row per item line, the API returns one row per transaction.
  const tableRows = rows.flatMap((trx) => trx.lines.map((line, lineIndex) => ({ trx, line, lineIndex })));

  const openEdit = (trx: OutboundRow, lineIndex: number) => {
    const line = trx.lines[lineIndex];
    setEditTarget({ trx, lineIndex });
    setEditForm({
      tanggal: trx.date.slice(0, 10),
      namaClient: trx.clientName,
      spk: trx.spk,
      namaItem: trx.itemName,
      itemId: String(line.itemId),
      qty: String(line.qty),
    });
    setEditError("");
  };

  const closeEdit = () => {
    setEditTarget(null);
    setEditForm(null);
  };

  const editLine = editTarget ? editTarget.trx.lines[editTarget.lineIndex] : undefined;

  const updateEdit = (patch: Partial<EditForm>) => setEditForm((prev) => (prev ? { ...prev, ...patch } : prev));

  const handleSimpanEdit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editTarget || !editForm) return;
    const { trx, lineIndex } = editTarget;
    // Dicek ulang saat simpan, karena batas waktu bisa lewat selagi pop-up masih terbuka
    if (!bisaEdit(trx, Date.now())) {
      closeEdit();
      setPeringatan(PESAN_TIDAK_BISA_EDIT);
      return;
    }
    const { tanggal, namaClient, spk, namaItem, itemId, qty } = editForm;
    if (!tanggal || !namaClient.trim() || !spk.trim() || !namaItem.trim() || !itemId || !qty || Number(qty) <= 0) {
      setEditError("Isi tanggal, nama client, SPK, nama item/projek, nama barang, dan jumlah.");
      return;
    }

    setEditSaving(true);
    setEditError("");
    try {
      // API menyimpan per transaksi, jadi baris lain di transaksi yang sama ikut dikirim apa adanya
      await updateOutbound(trx.id, {
        date: tanggal,
        clientName: namaClient.trim(),
        spk: spk.trim(),
        itemName: namaItem.trim(),
        warehouseType: trx.warehouseType,
        recipientType: trx.recipientType,
        notes: trx.notes ?? undefined,
        lines: trx.lines.map((l, i) =>
          i === lineIndex
            ? { itemId: Number(itemId), qty: Number(qty), pic: l.pic }
            : { itemId: l.itemId, qty: l.qty, pic: l.pic },
        ),
      });
      closeEdit();
      reload();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Gagal menyimpan perubahan barang keluar.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError("");
    try {
      await exportOutboundReport({ q: searchQuery || undefined, ...dateRange });
    } catch (err) {
      setDownloadError(err instanceof ApiError ? err.message : "Gagal mengunduh data barang keluar.");
    } finally {
      setDownloading(false);
    }
  };

  const openModal = () => {
    setForm(formKosong());
    setModalError("");
    setIsModalOpen(true);
  };

  const updateBaris = (index: number, patch: Partial<BarisForm>) =>
    setForm((prev) => ({ ...prev, baris: prev.baris.map((b, i) => (i === index ? { ...b, ...patch } : b)) }));

  const tambahBaris = () => setForm((prev) => ({ ...prev, baris: [...prev.baris, barisKosong()] }));

  const handleSimpan = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { namaPengambil, tanggal, warehouseType, recipientType } = form;
    // Baris yang belum diisi sama sekali diabaikan
    const terisi = form.baris.filter((b) => Object.values(b).some((v) => v.trim() !== ""));
    if (!namaPengambil.trim() || !tanggal || !warehouseType || !recipientType) {
      setModalError("Lengkapi nama pengambil, tanggal, asal gudang, dan penerima.");
      return;
    }
    if (terisi.length === 0 || terisi.some((b) => !b.spk.trim() || !b.namaClient.trim() || !b.namaItem.trim() || !b.itemId || !b.qty || !b.pic.trim())) {
      setModalError("Isi No. SPK, nama client, nama item/project, barang, jumlah, dan PIC di setiap baris yang dipakai.");
      return;
    }

    const kelompok = new Map<string, BarisForm[]>();
    for (const b of terisi) {
      const kunci = JSON.stringify([b.spk.trim(), b.namaClient.trim(), b.namaItem.trim()]);
      kelompok.set(kunci, [...(kelompok.get(kunci) ?? []), b]);
    }

    setSaving(true);
    setModalError("");
    const tersimpan = new Set<BarisForm>();
    try {
      for (const lines of kelompok.values()) {
        const [pertama] = lines;
        await createOutbound({
          date: tanggal,
          clientName: pertama.namaClient.trim(),
          spk: pertama.spk.trim(),
          itemName: pertama.namaItem.trim(),
          warehouseType,
          recipientType,
          // API belum punya kolom nama pengambil, jadi dicatat di notes
          notes: `Pengambil: ${namaPengambil.trim()}`,
          lines: lines.map((b) => ({ itemId: Number(b.itemId), qty: Number(b.qty), pic: b.pic.trim() })),
        });
        lines.forEach((b) => tersimpan.add(b));
      }
      setIsModalOpen(false);
      reload();
    } catch (err) {
      const pesan = err instanceof ApiError ? err.message : "Gagal menyimpan barang keluar.";
      if (tersimpan.size > 0) {
        // Transaksi yang sudah tersimpan dikeluarkan dari form supaya tidak terkirim dua kali
        setForm((prev) => ({ ...prev, baris: prev.baris.filter((b) => !tersimpan.has(b)) }));
        setModalError(`Sebagian baris sudah tersimpan dan dihapus dari form. Baris yang tersisa gagal: ${pesan}`);
        reload();
      } else {
        setModalError(pesan);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-[18px] font-extrabold text-black tracking-wide uppercase">Data Barang Keluar</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Pencarian, filter tanggal & tambah data */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-full sm:w-64">
              <label htmlFor="barang-keluar-cari" className={labelClass}>Cari</label>
              <div className="relative">
                <input
                  id="barang-keluar-cari"
                  type="text"
                  value={searchQuery}
                  maxLength={100}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Silahkan cari data"
                  className={fieldClass}
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-800 pointer-events-none" />
              </div>
            </div>

            <div className="w-44">
              <label htmlFor="barang-keluar-tanggal" className={labelClass}>Tanggal</label>
              <div className="relative">
                <input
                  ref={tanggalRef}
                  id="barang-keluar-tanggal"
                  type="date"
                  value={filterTanggal}
                  onChange={(e) => setFilterTanggal(e.target.value)}
                  className={`${fieldClass} [&::-webkit-calendar-picker-indicator]:hidden`}
                />
                <button
                  type="button"
                  aria-label="Pilih tanggal"
                  onClick={() => tanggalRef.current?.showPicker()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-800 hover:opacity-70"
                >
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
            </div>

            {filterTanggal && (
              <button
                type="button"
                onClick={() => setFilterTanggal("")}
                className="text-xs text-orange-600 font-bold hover:underline pb-2.5"
              >
                Reset
              </button>
            )}
          </div>

          {canCreate && (
            <button type="button" onClick={openModal} className={orangeButtonClass}>
              <Plus className="w-4 h-4" />
              <span>Barang Keluar</span>
            </button>
          )}
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto border-t border-l border-gray-300 rounded-sm">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="bg-gray-100 text-gray-900 font-semibold text-xs">
              <tr>
                <th scope="col" className={`${cellClass} w-12`}>No</th>
                <th scope="col" className={cellClass}>No. Transaksi</th>
                <th scope="col" className={cellClass}>Kode Barang</th>
                <th scope="col" className={cellClass}>Nama Client</th>
                <th scope="col" className={cellClass}>SPK</th>
                <th scope="col" className={cellClass}>Tanggal</th>
                <th scope="col" className={cellClass}>Nama Item/Projek</th>
                <th scope="col" className={cellClass}>Nama Barang</th>
                <th scope="col" className={cellClass}>Jumlah</th>
                <th scope="col" className={cellClass}>Action</th>
              </tr>
            </thead>
            <tbody className="text-gray-800">
              {loading && (
                <tr><td colSpan={10} className={`${cellClass} px-6 py-10 text-center text-gray-400`}>Memuat data...</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={10} className={`${cellClass} px-6 py-10 text-center text-red-500`}>{error}</td></tr>
              )}
              {!loading && !error && tableRows.map(({ trx, line, lineIndex }, index) => (
                <tr key={`${trx.id}-${index}`} className="hover:bg-orange-50/20 transition-colors">
                  <td className={cellClass}>{(page - 1) * 20 + index + 1}</td>
                  {/* API belum punya nomor transaksi tersendiri, jadi yang tampil id transaksinya */}
                  <td className={`${cellClass} font-semibold text-gray-900`}>{trx.id}</td>
                  <td className={`${cellClass} font-mono text-xs`}>{line.itemCode ?? '-'}</td>
                  <td className={cellClass}>{trx.clientName}</td>
                  <td className={cellClass}>{trx.spk}</td>
                  <td className={cellClass}>{displayDate(trx.date)}</td>
                  <td className={cellClass}>{trx.itemName}</td>
                  <td className={cellClass}>{line.itemName}</td>
                  <td className={`${cellClass} text-right`}>{line.qty}</td>
                  <td className={cellClass}>
                    {canCreate && (bisaEdit(trx, now) ? (
                      <button
                        type="button"
                        onClick={() => openEdit(trx, lineIndex)}
                        title={`Bisa diedit sampai ${tampilWaktu(batasEdit(trx))}`}
                        aria-label={`Edit barang keluar ${trx.id} ${line.itemName}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FF8A00] text-[#FF8A00] text-xs font-semibold hover:bg-orange-50 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    ) : (
                      // Tetap bisa diklik (aria-disabled, bukan disabled) supaya peringatannya muncul
                      <button
                        type="button"
                        aria-disabled="true"
                        onClick={() => setPeringatan(PESAN_TIDAK_BISA_EDIT)}
                        title="Sudah lewat 1 hari, tidak bisa diedit"
                        aria-label={`Edit barang keluar ${trx.id} ${line.itemName} (terkunci)`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-gray-100 text-gray-400 text-xs font-semibold cursor-not-allowed"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
              {!loading && !error && tableRows.length === 0 && (
                <tr>
                  <td colSpan={10} className={`${cellClass} px-6 py-10 text-center text-gray-400 italic`}>
                    Data tidak ditemukan untuk filter tersebut.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />

        {canExport && (
          <div className="flex flex-col items-end gap-2 mt-6">
            {downloadError && <p role="alert" className="text-sm text-red-600">{downloadError}</p>}
            <button type="button" onClick={handleDownload} disabled={downloading || total === 0} className={orangeButtonClass}>
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal Form Barang Keluar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md transition-opacity duration-300 p-4">
          <form
            onSubmit={handleSimpan}
            noValidate
            className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-full overflow-y-auto p-6 sm:p-8 relative animate-in zoom-in-95 duration-200"
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              aria-label="Tutup form"
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>

            <h2 className="text-[18px] font-extrabold text-black tracking-wide uppercase mb-6">Form Barang Keluar</h2>

            {/* Data transaksi */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mb-8">
              <div>
                <label htmlFor="form-bk-transaksi" className={labelClass}>No. Transaksi</label>
                <input
                  id="form-bk-transaksi"
                  type="text"
                  readOnly
                  value=""
                  placeholder="Dibuat otomatis oleh sistem"
                  className={`${fieldClass} bg-gray-50 cursor-default`}
                />
              </div>
              <div>
                <label htmlFor="form-bk-pengambil" className={labelClass}>Nama Pengambil</label>
                <input
                  id="form-bk-pengambil"
                  type="text"
                  value={form.namaPengambil}
                  maxLength={191}
                  onChange={(e) => setForm((prev) => ({ ...prev, namaPengambil: e.target.value }))}
                  placeholder="Isi nama pengambil"
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="form-bk-tanggal" className={labelClass}>Tanggal</label>
                <div className="relative">
                  <input
                    ref={formTanggalRef}
                    id="form-bk-tanggal"
                    type="date"
                    value={form.tanggal}
                    onChange={(e) => setForm((prev) => ({ ...prev, tanggal: e.target.value }))}
                    className={`${fieldClass} [&::-webkit-calendar-picker-indicator]:hidden`}
                  />
                  <button
                    type="button"
                    aria-label="Pilih tanggal transaksi"
                    onClick={() => formTanggalRef.current?.showPicker()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-800 hover:opacity-70"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="form-bk-gudang" className={labelClass}>Asal Gudang</label>
                <div className="relative">
                  <select
                    id="form-bk-gudang"
                    value={form.warehouseType}
                    onChange={(e) => setForm((prev) => ({ ...prev, warehouseType: e.target.value as WarehouseType }))}
                    className={`${fieldClass} appearance-none cursor-pointer`}
                  >
                    <option value="" disabled>Pilih asal gudang</option>
                    <option value="BAHAN_BAKU">Gudang Bahan Baku</option>
                    <option value="WIP">Gudang WIP</option>
                    <option value="BARANG_JADI">Gudang Barang Jadi</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>
              <div>
                <label htmlFor="form-bk-penerima" className={labelClass}>Tujuan / Penerima</label>
                <div className="relative">
                  <select
                    id="form-bk-penerima"
                    value={form.recipientType}
                    onChange={(e) => setForm((prev) => ({ ...prev, recipientType: e.target.value as RecipientType }))}
                    className={`${fieldClass} appearance-none cursor-pointer`}
                  >
                    <option value="" disabled>Pilih penerima</option>
                    <option value="PRODUKSI">Tukang / Produksi</option>
                    <option value="KLIEN">Klien</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Daftar barang yang keluar */}
            <div className="overflow-x-auto border-t border-l border-gray-300 rounded-sm">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 text-gray-900 font-medium text-base">
                  <tr>
                    <th scope="col" className={`${formHeadClass} w-10`}>No</th>
                    <th scope="col" className={`${formHeadClass} min-w-36`}>No. SPK</th>
                    <th scope="col" className={`${formHeadClass} min-w-32`}>Nama Client</th>
                    <th scope="col" className={`${formHeadClass} min-w-40`}>Nama Item/Project</th>
                    <th scope="col" className={`${formHeadClass} min-w-40`}>Nama Barang</th>
                    <th scope="col" className={`${formHeadClass} min-w-24`}>Kode</th>
                    <th scope="col" className={`${formHeadClass} w-24`}>Jumlah</th>
                    <th scope="col" className={`${formHeadClass} min-w-24`}>PIC</th>
                  </tr>
                </thead>
                <tbody>
                  {form.baris.map((b, i) => (
                    <tr key={i}>
                      <td className={`${formCellClass} text-center text-gray-700`}>{i + 1}</td>
                      <td className={formCellClass}>
                        <input type="text" value={b.spk} maxLength={100} onChange={(e) => updateBaris(i, { spk: e.target.value })} aria-label={`No. SPK baris ${i + 1}`} className={formInputClass} />
                      </td>
                      <td className={formCellClass}>
                        <input type="text" value={b.namaClient} maxLength={191} onChange={(e) => updateBaris(i, { namaClient: e.target.value })} aria-label={`Nama client baris ${i + 1}`} className={formInputClass} />
                      </td>
                      <td className={formCellClass}>
                        <input type="text" value={b.namaItem} maxLength={191} onChange={(e) => updateBaris(i, { namaItem: e.target.value })} aria-label={`Nama item/project baris ${i + 1}`} className={formInputClass} />
                      </td>
                      <td className={formCellClass}>
                        <select value={b.itemId} onChange={(e) => updateBaris(i, { itemId: e.target.value })} aria-label={`Nama barang baris ${i + 1}`} className={`${formInputClass} cursor-pointer`}>
                          <option value="">Pilih barang</option>
                          {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                        </select>
                      </td>
                      <td className={`${formCellClass} px-2 font-mono text-xs text-gray-600`}>
                        {items.find((it) => String(it.id) === b.itemId)?.code ?? ''}
                      </td>
                      <td className={formCellClass}>
                        <input {...INTEGER_INPUT} maxLength={9} value={b.qty} onChange={(e) => updateBaris(i, { qty: digitsOnly(e.target.value) })} aria-label={`Jumlah baris ${i + 1}`} className={`${formInputClass} text-right`} />
                      </td>
                      <td className={formCellClass}>
                        <input type="text" value={b.pic} maxLength={191} onChange={(e) => updateBaris(i, { pic: e.target.value })} aria-label={`PIC baris ${i + 1}`} className={formInputClass} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={tambahBaris}
              aria-label="Tambah baris barang"
              className="mt-2 flex items-center justify-center w-6 h-6 rounded-md border border-[#FF8A00] text-[#FF8A00] hover:bg-orange-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>

            {modalError && (
              <p role="alert" className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{modalError}</p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 mt-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 rounded-full text-gray-800">
                <AlertCircle className="w-4 h-4" strokeWidth={2.2} />
                <span className="text-sm">Penulisan nama item tidak boleh disingkat</span>
              </div>
              <button type="submit" disabled={saving} className={orangeButtonClass}>Simpan</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Edit Barang Keluar */}
      {editTarget && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md transition-opacity duration-300 p-4">
          <form
            onSubmit={handleSimpanEdit}
            noValidate
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-full overflow-y-auto p-6 sm:p-8 relative animate-in zoom-in-95 duration-200"
          >
            <button
              type="button"
              onClick={closeEdit}
              aria-label="Tutup form edit"
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>

            <h2 className="text-[18px] font-extrabold text-black tracking-wide uppercase mb-2">Edit Barang Keluar</h2>
            <p className="text-sm text-gray-500 mb-6">
              No. Transaksi <span className="font-semibold text-gray-800">{editTarget.trx.id}</span> · bisa diedit sampai{' '}
              <span className="font-semibold text-gray-800">{tampilWaktu(batasEdit(editTarget.trx))}</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-bk-tanggal" className={labelClass}>Tanggal</label>
                <div className="relative">
                  <input
                    ref={editTanggalRef}
                    id="edit-bk-tanggal"
                    type="date"
                    value={editForm.tanggal}
                    onChange={(e) => updateEdit({ tanggal: e.target.value })}
                    className={`${fieldClass} [&::-webkit-calendar-picker-indicator]:hidden`}
                  />
                  <button
                    type="button"
                    aria-label="Pilih tanggal edit"
                    onClick={() => editTanggalRef.current?.showPicker()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-800 hover:opacity-70"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="edit-bk-spk" className={labelClass}>SPK</label>
                <input id="edit-bk-spk" type="text" value={editForm.spk} maxLength={100} onChange={(e) => updateEdit({ spk: e.target.value })} className={fieldClass} />
              </div>
              <div>
                <label htmlFor="edit-bk-client" className={labelClass}>Nama Client</label>
                <input id="edit-bk-client" type="text" value={editForm.namaClient} maxLength={191} onChange={(e) => updateEdit({ namaClient: e.target.value })} className={fieldClass} />
              </div>
              <div>
                <label htmlFor="edit-bk-item" className={labelClass}>Nama Item/Projek</label>
                <input id="edit-bk-item" type="text" value={editForm.namaItem} maxLength={191} onChange={(e) => updateEdit({ namaItem: e.target.value })} className={fieldClass} />
              </div>
              <div>
                <label htmlFor="edit-bk-barang" className={labelClass}>Nama Barang</label>
                <div className="relative">
                  <select
                    id="edit-bk-barang"
                    value={editForm.itemId}
                    onChange={(e) => updateEdit({ itemId: e.target.value })}
                    className={`${fieldClass} appearance-none cursor-pointer`}
                  >
                    <option value="" disabled>Pilih barang</option>
                    {/* Barang lama tetap muncul walau tidak termasuk 100 barang yang dimuat */}
                    {editLine && !items.some((it) => it.id === editLine.itemId) && (
                      <option value={editLine.itemId}>{editLine.itemName}</option>
                    )}
                    {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-bk-kode" className={labelClass}>Kode Barang</label>
                  <input
                    id="edit-bk-kode"
                    type="text"
                    readOnly
                    value={items.find((it) => String(it.id) === editForm.itemId)?.code ?? editLine?.itemCode ?? '-'}
                    className={`${fieldClass} bg-gray-50 cursor-default font-mono text-xs`}
                  />
                </div>
                <div>
                  <label htmlFor="edit-bk-jumlah" className={labelClass}>Jumlah</label>
                  <input
                    {...INTEGER_INPUT}
                    id="edit-bk-jumlah"
                    maxLength={9}
                    value={editForm.qty}
                    onChange={(e) => updateEdit({ qty: digitsOnly(e.target.value) })}
                    className={`${fieldClass} text-right`}
                  />
                </div>
              </div>
            </div>

            {editTarget.trx.lines.length > 1 && (
              <div className="flex items-start gap-2 mt-5 px-4 py-2 bg-yellow-100 rounded-xl text-gray-800">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2.2} />
                <span className="text-sm">
                  Tanggal, SPK, nama client, dan nama item/projek berlaku untuk semua barang di transaksi {editTarget.trx.id}.
                </span>
              </div>
            )}

            {editError && (
              <p role="alert" className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{editError}</p>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={closeEdit}
                className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button type="submit" disabled={editSaving} className={orangeButtonClass}>
                {editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Peringatan data sudah tidak bisa diedit */}
      {peringatan && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="peringatan-edit-judul"
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center animate-in zoom-in-95 duration-200"
          >
            <div className="mx-auto mb-4 w-12 h-12 flex items-center justify-center rounded-full bg-red-50 text-red-500">
              <Lock className="w-6 h-6" />
            </div>
            <h2 id="peringatan-edit-judul" className="text-base font-extrabold text-black mb-2">Tidak Bisa Diedit</h2>
            <p className="text-sm text-gray-600 mb-6">{peringatan}</p>
            <button type="button" onClick={() => setPeringatan("")} className={`${orangeButtonClass} w-full`}>
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
