"use client";

import { useCan } from '@/domains/auth/user-context';
import React, { useEffect, useRef, useState } from 'react';
import { Search, Calendar, Plus, Minus, AlertCircle, Download, X, ChevronDown, Pencil, Lock, Filter, ScanLine, Trash2 } from 'lucide-react';
import { createOutbound, exportOutboundReport, getItemByCode, listOutbound, listItems, listMaterialRequests, updateOutbound, deleteItem } from '@/domains/inventory/api';
import { getDokubah, listDokubah, listTrackingSpk } from '@/domains/ppic/api';
import type { BahanDokubah } from '@/domains/ppic/data/dokubah';
import type { RecipientType, ItemListRow, OutboundRow } from '@/domains/inventory/types';
import { displayDate, todayIso, toDateRange } from '@/domains/inventory/date';
import { ApiError } from '@/shared/lib/api-client';
import { useApiData } from '@/shared/lib/use-api-data';
import Pagination from '@/shared/components/Pagination';
import { INTEGER_INPUT, digitsOnly } from '@/shared/lib/input';
import { randomId } from '@/shared/lib/random-id';
import SortableTh, { useSort } from '@/shared/components/SortableTh';
import DateFilter from '@/shared/components/DateFilter';
import SearchableSelect from '@/shared/components/SearchableSelect';


// Satu baris barang hasil scan. SPK dan Nama Produk/Proyek diisi sekali di atas untuk seluruh transaksi.
// Baris input manual dibuat kosong (itemId null) sampai materialnya dipilih dari dropdown.
type BarisForm = { key: string; manual: boolean; itemId: number | null; code: string; name: string; unit: string; stock: number; qty: string };

const barisManual = (): BarisForm => ({ key: randomId(), manual: true, itemId: null, code: '', name: '', unit: '', stock: 0, qty: '1' });

const PAGE_SIZE = 20;
// Pilihan tambahan di Nama Produk/Proyek untuk barang yang keluar bukan untuk produk SPK tertentu
const PILIHAN_STOK = 'Stok';

type TableRow = {
  trx: OutboundRow;
  line: OutboundRow['lines'][number];
  lineIndex: number;
  trxNo: number; // nomor urut per transaksi
};

const formKosong = () => ({
  namaPengambil: "",
  tanggal: todayIso(),
  spk: "",
  namaItem: "",
  // Form tidak punya pilihan penerima lagi, sedangkan API mewajibkannya; barang keluar gudang diambil untuk produksi
  recipientType: "PRODUKSI" as RecipientType,
  baris: [] as BarisForm[],
});

const tambahSatu = (baris: BarisForm[], key: string) =>
  baris.map((b) => (b.key === key ? { ...b, qty: String(Number(b.qty) + 1) } : b));

const samaNama = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

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
type EditForm = { tanggal: string; spk: string; namaItem: string; itemId: string; qty: string };

const formCellClass = 'border-b border-r border-gray-300';
const formHeadClass = `${formCellClass} px-2 py-2.5 font-medium whitespace-nowrap`;
const labelClass = 'block text-sm text-gray-800 mb-1.5';
const rowClass = 'grid grid-cols-1 sm:grid-cols-[140px_1fr] sm:items-center gap-x-4 gap-y-1.5';
const rowLabelClass = "text-sm text-gray-800 sm:flex sm:justify-between sm:after:content-[':']";
const selectClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors';
const fieldClass = 'w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors';
const orangeButtonClass = 'flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed';

export default function BarangKeluarGudang() {
  const canCreate = useCan('outbound.create');
  const canUpdate = useCan('outbound.update');
  const canExport = useCan('report.view');
  const [searchQuery, setSearchQuery] = useState("");

  const { sort, toggle, params: sortParams } = useSort();
  const [showFilter, setShowFilter] = useState(false);
  const [filterDay, setFilterDay] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const [items, setItems] = useState<ItemListRow[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(formKosong);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const formTanggalRef = useRef<HTMLInputElement>(null);

  const [scanOpen, setScanOpen] = useState(false);
  const [scanValue, setScanValue] = useState("");
  const [scanError, setScanError] = useState("");
  const scanRef = useRef<HTMLInputElement>(null);
  // Scan bisa datang lebih cepat dari render, jadi pengecekan kode yang sudah ada memakai ref
  const barisRef = useRef<BarisForm[]>([]);

  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [peringatan, setPeringatan] = useState("");
  const [actionError, setActionError] = useState<string>('');
  // Diperbarui tiap menit supaya tombol Edit otomatis terkunci begitu batas 1 hari lewat
  const [now, setNow] = useState(() => Date.now());
  const editTanggalRef = useRef<HTMLInputElement>(null);

  const dateRange = toDateRange(filterDay, filterMonth, filterYear);
  const activeDateFilters = [filterDay, filterMonth, filterYear].filter(Boolean).length;

  const filterKey = JSON.stringify([searchQuery, filterDay, filterMonth, filterYear, sortParams]);

  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ key: filterKey, page: next });
  const { data: result, loading, error, reload } = useApiData(
    () => listOutbound({ page, pageSize: PAGE_SIZE, search: searchQuery || undefined, ...dateRange, ...sortParams }),
    `${filterKey}|${page}`,
    'Gagal memuat data barang keluar.',
  );
  const rows = result?.rows ?? [];
  const total = result?.total ?? 0;

  // The client comes from the tracking system through the SPK; the API ignores a client name from the FE.
  const { data: spkList } = useApiData(() => listTrackingSpk(), 'spk', 'Gagal memuat daftar SPK.');
  const clientOf = (spk: string) => spkList?.find((t) => t.noSpk === spk)?.client ?? '';

  // Pilihan Nama Item/Produk: Item Produksi dari permintaan material SPK itu, dimuat sekali per SPK.
  const [produkBySpk, setProdukBySpk] = useState<Record<string, string[]>>({});
  const muatProduk = (spk: string) => {
    if (!spkList?.some((t) => t.noSpk === spk) || produkBySpk[spk]) return;
    setProdukBySpk((prev) => ({ ...prev, [spk]: [] }));
    listMaterialRequests({ search: spk, pageSize: 100 })
      .then((res) => {
        const produk = [...new Set(res.rows.filter((r) => r.spk === spk).map((r) => r.productionItem))];
        setProdukBySpk((prev) => ({ ...prev, [spk]: produk }));
      })
      .catch(() => {});
  };

  // Kuota material per SPK dari dokubah PPIC. Tidak ada key = belum dimuat, null = gagal dimuat.
  const [dokubahBySpk, setDokubahBySpk] = useState<Record<string, BahanDokubah[] | 'loading' | null>>({});
  const muatDokubah = (spk: string) => {
    const sekarang = dokubahBySpk[spk];
    if (!spk || (sekarang !== undefined && sekarang !== null)) return;
    setDokubahBySpk((prev) => ({ ...prev, [spk]: 'loading' }));
    listDokubah({ search: spk, pageSize: 100 })
      .then(async (res) => {
        const milikSpk = res.rows.filter((d) => d.noSpk === spk);
        // Dokubah yang sudah disetujui yang dipakai; kalau belum ada, dokubah SPK itu yang pertama
        const dipakai = milikSpk.find((d) => d.status === 'Approved') ?? milikSpk[0];
        const bahan = dipakai ? (await getDokubah(dipakai.id)).bahan : [];
        setDokubahBySpk((prev) => ({ ...prev, [spk]: bahan }));
      })
      .catch(() => setDokubahBySpk((prev) => ({ ...prev, [spk]: null })));
  };

  useEffect(() => {
    listItems({ pageSize: 100 }).then((res) => setItems(res.rows)).catch(() => {});
  }, []);

  useEffect(() => { barisRef.current = form.baris; }, [form.baris]);
  useEffect(() => { if (scanOpen) scanRef.current?.focus(); }, [scanOpen]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // The table shows one row per item line, the API returns one row per transaction.
  const tableRows: TableRow[] = rows.flatMap((trx, trxIndex) =>
    trx.lines.map((line, lineIndex) => ({
      trx, line, lineIndex,
      trxNo: (page - 1) * PAGE_SIZE + trxIndex + 1,
    })),
  );

  const openEdit = (trx: OutboundRow, lineIndex: number) => {
    const line = trx.lines[lineIndex];
    setEditTarget({ trx, lineIndex });
    setEditForm({
      tanggal: trx.date.slice(0, 10),
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
    const { tanggal, spk, namaItem, itemId, qty } = editForm;
    if (!tanggal || !spk || !namaItem.trim() || !itemId || !qty || Number(qty) <= 0) {
      setEditError("Isi tanggal, SPK, nama item/projek, nama barang, dan jumlah.");
      return;
    }

    setEditSaving(true);
    setEditError("");
    try {
      // API menyimpan per transaksi, jadi baris lain di transaksi yang sama ikut dikirim apa adanya
      await updateOutbound(trx.id, {
        date: tanggal,
        spk,
        itemName: namaItem.trim(),
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
    setScanOpen(false);
    setScanValue("");
    setScanError("");
    setIsModalOpen(true);
  };

  const setBaris = (fn: (baris: BarisForm[]) => BarisForm[]) => setForm((prev) => ({ ...prev, baris: fn(prev.baris) }));
  const patchBaris = (key: string, patch: Partial<BarisForm>) =>
    setBaris((bs) => bs.map((b) => (b.key === key ? { ...b, ...patch } : b)));

  const tambahManual = () => setBaris((bs) => [...bs, barisManual()]);

  const pilihMaterial = (key: string, itemId: string) => {
    const item = items.find((it) => String(it.id) === itemId);
    if (item) patchBaris(key, { itemId: item.id, code: item.code ?? '', name: item.name, unit: item.unit, stock: item.stock });
  };

  // Material yang sudah ada di baris lain tidak ditawarkan lagi, jumlahnya cukup ditambah di baris itu
  const pilihanMaterial = (b: BarisForm) => items
    .filter((it) => it.id === b.itemId || !form.baris.some((x) => x.itemId === it.id))
    .map((it) => ({ value: String(it.id), label: it.code ? `${it.name} (${it.code})` : it.name }));

  const bukaScan = () => {
    if (scanOpen) scanRef.current?.focus();
    else setScanOpen(true);
  };

  // Barang yang sudah ada di tabel cukup ditambah jumlahnya, barang baru diambil datanya dari database
  const tambahKode = async (code: string) => {
    setScanError("");
    const ada = barisRef.current.find((b) => b.code === code);
    if (ada) { setBaris((bs) => tambahSatu(bs, ada.key)); return; }
    try {
      const item = await getItemByCode(code);
      // Dua scan cepat untuk kode baru yang sama sama-sama sampai di sini sebelum barisnya ada
      setBaris((bs) => {
        const sama = bs.find((b) => b.itemId === item.id);
        return sama
          ? tambahSatu(bs, sama.key)
          : [...bs, { key: randomId(), manual: false, itemId: item.id, code: item.code ?? code, name: item.name, unit: item.unit, stock: item.stock, qty: '1' }];
      });
    } catch (err) {
      setScanError(err instanceof ApiError && err.status === 404 ? `Kode "${code}" tidak dikenal.` : err instanceof ApiError ? err.message : 'Gagal membaca kode.');
    }
  };

  // Scanner USB mengetik kode lalu menekan Enter; Enter juga tidak boleh mengirim form
  const onScanKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const code = scanValue.trim();
    setScanValue("");
    if (code) void tambahKode(code);
  };

  const pilihSpk = (spk: string) => {
    setForm((prev) => ({ ...prev, spk, namaItem: "" }));
    muatProduk(spk);
    muatDokubah(spk);
  };

  const dokubahSpk = dokubahBySpk[form.spk];
  // Material dokubah dicocokkan lewat kode barang, kalau tidak ketemu lewat nama
  const bahanDokubah = (b: BarisForm) => Array.isArray(dokubahSpk)
    ? dokubahSpk.find((m) => m.kodeBarang === b.code) ?? dokubahSpk.find((m) => samaNama(m.namaBahan, b.name))
    : undefined;

  const selDokubah = (b: BarisForm) => {
    if (b.itemId === null) return null;
    if (!form.spk) return <span className="text-xs text-gray-400">Pilih SPK dulu</span>;
    if (dokubahSpk === 'loading' || dokubahSpk === undefined) return <span className="text-xs text-gray-400">Memuat...</span>;
    if (dokubahSpk === null) return <span className="text-xs text-red-500">Gagal dimuat</span>;
    const bahan = bahanDokubah(b);
    if (!bahan) return <span className="text-xs text-gray-400">Tidak ada di dokubah</span>;
    const sisa = bahan.kuota - bahan.realisasi;
    return (
      <div className="flex flex-col">
        <span className="font-medium text-gray-900">{bahan.kuota} {bahan.satuan}</span>
        <span className={`text-xs ${Number(b.qty) > sisa ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>sisa {sisa}</span>
      </div>
    );
  };

  const pilihanProduk = [...new Set([...(produkBySpk[form.spk] ?? []), PILIHAN_STOK])];

  const handleSimpan = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { namaPengambil, tanggal, spk, namaItem, recipientType, baris } = form;
    if (!tanggal || !spk || !namaPengambil.trim() || !namaItem.trim()) {
      setModalError("Lengkapi tanggal, SPK, nama pengambil, dan nama produk/proyek.");
      return;
    }
    // Baris input manual yang belum dipilih materialnya diabaikan
    const terisi = baris.flatMap((b) => (b.itemId === null ? [] : [{ ...b, itemId: b.itemId }]));
    if (terisi.length === 0) {
      setModalError("Scan atau pilih minimal satu barang yang keluar.");
      return;
    }
    if (terisi.some((b) => !b.qty || Number(b.qty) <= 0)) {
      setModalError("Isi jumlah pengambilan di setiap barang.");
      return;
    }

    setSaving(true);
    setModalError("");
    try {
      await createOutbound({
        date: tanggal,
        spk,
        itemName: namaItem.trim(),
        recipientType,
        // API belum punya kolom nama pengambil, jadi dicatat di notes
        notes: `Pengambil: ${namaPengambil.trim()}`,
        // Form tidak punya kolom PIC lagi, sedangkan API mewajibkan pic per baris, jadi diisi nama pengambil
        lines: terisi.map((b) => ({ itemId: b.itemId, qty: Number(b.qty), pic: namaPengambil.trim() })),
      });
      setIsModalOpen(false);
      reload();
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : "Gagal menyimpan barang keluar.");
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative w-full max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              id="barang-keluar-cari"
              type="text"
              value={searchQuery}
              maxLength={100}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Silahkan cari data"
              aria-label="Cari barang keluar"
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all shadow-sm"
            />
          </div>

          <div className="flex gap-2 w-full lg:w-auto lg:justify-end">
            {canCreate && (
              <button type="button" onClick={openModal} className={orangeButtonClass}>
                <Plus className="w-4 h-4" />
                <span>Barang Keluar</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowFilter((v) => !v)}
              aria-expanded={showFilter}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-colors text-sm font-semibold ${
                showFilter || activeDateFilters > 0
                  ? 'bg-orange-50 border-orange-300 text-orange-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filter{activeDateFilters > 0 ? ` (${activeDateFilters})` : ''}</span>
            </button>
          </div>
        </div>

        {showFilter && (
          <DateFilter
            day={filterDay}
            month={filterMonth}
            year={filterYear}
            onDayChange={setFilterDay}
            onMonthChange={setFilterMonth}
            onYearChange={setFilterYear}
            onReset={() => { setFilterDay(''); setFilterMonth(''); setFilterYear(''); }}
          />
        )}

        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-4">No</th>
                  <SortableTh label="Transaksi" sortKey="tanggal" sort={sort} onSort={toggle} />
                  <SortableTh label="Client / SPK" sortKey="clientName" sort={sort} onSort={toggle} />
                  <SortableTh label="Nama Item/Projek" sortKey="itemName" sort={sort} onSort={toggle} />
                  <th scope="col" className="px-6 py-4">Barang</th>
                  <th scope="col" className="px-6 py-4 text-right">Jumlah</th>
                  <th scope="col" className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading && (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">Memuat data...</td></tr>
                )}
                {!loading && error && (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-red-500">{error}</td></tr>
                )}
                {!loading && !error && tableRows.map(({ trx, line, lineIndex, trxNo }) => (
                  <tr
                    key={`${trx.id}-${lineIndex}`}
                    className={`hover:bg-[#FF8A00]/5 transition-colors group ${lineIndex === 0 ? 'border-t border-gray-100' : ''}`}
                  >
                    <td className="px-6 py-4 text-gray-500">{lineIndex === 0 ? `${trxNo}.` : ''}</td>

                    <td className="px-6 py-4">
                      {lineIndex === 0 && (
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">{trx.id}</span>
                          <span className="text-xs text-gray-500">{displayDate(trx.date)}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {lineIndex === 0 && (
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{trx.clientName}</span>
                          <span className="text-xs text-gray-500">{trx.spk}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-gray-600">{lineIndex === 0 ? trx.itemName : ''}</td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{line.itemName}</span>
                        <span className="text-xs font-mono text-gray-500 mt-0.5">{line.itemCode ?? '-'}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right font-bold text-gray-800">{line.qty}</td>

                    <td className="px-6 py-4">
                        {/* Menggunakan kontainer flex agar tombol berjejer rapi ke samping */}
                        <div className="flex items-center justify-center gap-2">
                          {/* Kondisional Tombol Edit */}
                          {canUpdate && (bisaEdit(trx, now) ? (
                            <button
                              type="button"
                              onClick={() => openEdit(trx, lineIndex)}
                              title={`Bisa diedit sampai ${tampilWaktu(batasEdit(trx))}`}
                              aria-label={`Edit barang keluar ${trx.id} ${line.itemName}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FF8A00] text-[#FF8A00] text-xs font-semibold hover:bg-orange-50 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              title="Sudah lewat 1 hari, tidak bisa diedit"
                              aria-label={`Edit barang keluar ${trx.id} ${line.itemName} (terkunci)`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 text-xs font-semibold cursor-not-allowed opacity-70"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          ))}
                          
                        </div>
                      </td>
                  </tr>
                ))}
                {!loading && !error && tableRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-400 italic">
                      Data tidak ditemukan untuk filter tersebut.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>

        {canExport && (
          <div className="flex flex-col items-end gap-2 mt-6">
            {downloadError && <p role="alert" className="text-sm text-red-600">{downloadError}</p>}
            <button type="button" onClick={handleDownload} disabled={downloading || total === 0} className={orangeButtonClass}>
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
        )}

      {/* Modal Form Barang Keluar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md transition-opacity duration-300 p-4">
          <form
            onSubmit={handleSimpan}
            noValidate
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-full overflow-y-auto p-6 sm:p-8 relative animate-in zoom-in-95 duration-200"
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

            {/* Data transaksi, dua kolom: kiri No. Transaksi, Tanggal, Nama Pengambil; kanan Client, SPK, Nama Produk/Proyek */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-4 mb-8">
              <div className={rowClass}>
                <label htmlFor="form-bk-transaksi" className={rowLabelClass}>No. Transaksi</label>
                <input
                  id="form-bk-transaksi"
                  type="text"
                  readOnly
                  value=""
                  placeholder="Dibuat otomatis oleh sistem"
                  className={`${fieldClass} bg-gray-50 cursor-default`}
                />
              </div>
              <div className={rowClass}>
                <label htmlFor="form-bk-client" className={rowLabelClass}>Client</label>
                <input
                  id="form-bk-client"
                  type="text"
                  readOnly
                  value={clientOf(form.spk)}
                  placeholder="Terisi otomatis dari SPK"
                  className={`${fieldClass} bg-gray-50 cursor-default`}
                />
              </div>
              <div className={rowClass}>
                <label htmlFor="form-bk-tanggal" className={rowLabelClass}>Tanggal</label>
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
              <div className={rowClass}>
                <span className={rowLabelClass}>SPK</span>
                <SearchableSelect
                  value={form.spk}
                  onChange={pilihSpk}
                  options={(spkList ?? []).map((t) => ({ value: t.noSpk, label: t.noSpk }))}
                  placeholder="Pilih SPK"
                  aria-label="SPK"
                  className={selectClass}
                />
              </div>
              <div className={rowClass}>
                <label htmlFor="form-bk-pengambil" className={rowLabelClass}>Nama Pengambil</label>
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
              <div className={rowClass}>
                <span className={rowLabelClass}>Nama Produk/Proyek</span>
                <SearchableSelect
                  value={form.namaItem}
                  onChange={(namaItem) => setForm((prev) => ({ ...prev, namaItem }))}
                  options={pilihanProduk.map((nama) => ({ value: nama, label: nama }))}
                  placeholder="Pilih produk/proyek atau stok"
                  aria-label="Nama Produk/Proyek"
                  className={selectClass}
                />
              </div>
            </div>

            {/* Daftar barang yang keluar, diisi dengan scan QR barang atau input manual */}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={bukaScan} className={orangeButtonClass}>
                <ScanLine className="w-4 h-4" strokeWidth={2.5} />
                <span>Scan Barang</span>
              </button>
              <button
                type="button"
                onClick={tambahManual}
                className="flex items-center justify-center gap-2 px-5 py-2.5 border border-[#FF8A00] text-[#FF8A00] font-semibold rounded-xl hover:bg-orange-50 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                <span>Input Manual</span>
              </button>
            </div>

            {scanOpen && (
              <div className="relative mt-4">
                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={scanRef}
                  type="text"
                  autoComplete="off"
                  maxLength={191}
                  value={scanValue}
                  onChange={(e) => setScanValue(e.target.value)}
                  onKeyDown={onScanKey}
                  placeholder="Arahkan scanner ke QR barang..."
                  aria-label="Hasil scan"
                  className="w-full border-2 border-orange-200 rounded-lg py-3 pl-10 pr-4 text-sm text-gray-800 focus:outline-none focus:border-[#FF8A00]/60 focus:ring-2 focus:ring-[#FF8A00]/20"
                />
              </div>
            )}
            {scanError && <p role="alert" className="mt-3 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{scanError}</p>}

            <div className="mt-4 overflow-x-auto border-t border-l border-gray-300 rounded-sm">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 text-gray-900 font-medium text-base">
                  <tr>
                    <th scope="col" className={`${formHeadClass} w-10`}>No</th>
                    <th scope="col" className={`${formHeadClass} min-w-48 text-left`}>Nama Material</th>
                    <th scope="col" className={`${formHeadClass} min-w-24`}>Satuan/Vol</th>
                    <th scope="col" className={`${formHeadClass} min-w-24`}>Kode</th>
                    <th scope="col" className={`${formHeadClass} min-w-28`}>Dokubah</th>
                    <th scope="col" className={`${formHeadClass} min-w-36`}>Pengambilan</th>
                    <th scope="col" className={`${formHeadClass} w-10`}><span className="sr-only">Hapus</span></th>
                  </tr>
                </thead>
                <tbody>
                  {form.baris.length === 0 && (
                    <tr>
                      <td colSpan={7} className={`${formCellClass} px-4 py-8 text-center text-gray-400`}>
                        Belum ada barang. Tekan Scan Barang lalu scan QR barang, atau Input Manual untuk memilih material.
                      </td>
                    </tr>
                  )}
                  {form.baris.map((b, i) => {
                    // Baris manual yang belum dipilih materialnya belum punya nama untuk label tombolnya
                    const nama = b.name || `baris ${i + 1}`;
                    const lebihStok = b.itemId !== null && Number(b.qty) > b.stock;
                    return (
                      <tr key={b.key}>
                        <td className={`${formCellClass} text-center text-gray-700`}>{i + 1}</td>
                        {b.manual ? (
                          <td className={`${formCellClass} px-1 py-1`}>
                            <SearchableSelect
                              value={b.itemId === null ? '' : String(b.itemId)}
                              onChange={(itemId) => pilihMaterial(b.key, itemId)}
                              options={pilihanMaterial(b)}
                              placeholder="Pilih material"
                              emptyText="Material tidak ditemukan"
                              aria-label={`Nama material ${nama}`}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                            />
                          </td>
                        ) : (
                          <td className={`${formCellClass} px-2 py-2 font-medium text-gray-900`}>{b.name}</td>
                        )}
                        <td className={`${formCellClass} px-2 text-center text-gray-700`}>{b.unit}</td>
                        <td className={`${formCellClass} px-2 text-center font-mono text-xs text-gray-600`}>{b.code}</td>
                        <td className={`${formCellClass} px-2 text-center`}>{selDokubah(b)}</td>
                        <td className={`${formCellClass} px-2 py-1.5`}>
                          <div className="flex items-center justify-center">
                            <button type="button" aria-label={`Kurangi ${nama}`} disabled={Number(b.qty) <= 1} onClick={() => patchBaris(b.key, { qty: String(Math.max(Number(b.qty) - 1, 1)) })} className="p-1 text-gray-500 hover:text-gray-900 disabled:opacity-30"><Minus className="w-4 h-4" /></button>
                            <input
                              {...INTEGER_INPUT}
                              maxLength={9}
                              value={b.qty}
                              aria-label={`Pengambilan ${nama}`}
                              title={b.itemId === null ? undefined : `Stok ${b.stock} ${b.unit}`}
                              onChange={(e) => patchBaris(b.key, { qty: digitsOnly(e.target.value) })}
                              className={`w-16 border rounded-md py-1.5 px-2 text-center text-sm ${lebihStok ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                            />
                            <button type="button" aria-label={`Tambah ${nama}`} onClick={() => setBaris((bs) => tambahSatu(bs, b.key))} className="p-1 text-gray-500 hover:text-gray-900"><Plus className="w-4 h-4" /></button>
                          </div>
                          {b.itemId !== null && (
                            <p className={`mt-0.5 text-center text-xs ${lebihStok ? 'text-red-600' : 'text-gray-400'}`}>stok {b.stock}</p>
                          )}
                        </td>
                        <td className={`${formCellClass} px-2 text-center`}>
                          <button type="button" aria-label={`Hapus ${nama}`} onClick={() => setBaris((bs) => bs.filter((x) => x.key !== b.key))} className="text-gray-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

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
                <label htmlFor="edit-bk-client" className={labelClass}>Nama Client</label>
                <input id="edit-bk-client" type="text" readOnly value={clientOf(editForm.spk)} className={fieldClass} />
              </div>
              <div>
                <label htmlFor="edit-bk-spk" className={labelClass}>SPK</label>
                <select id="edit-bk-spk" value={editForm.spk} onChange={(e) => updateEdit({ spk: e.target.value })} className={fieldClass}>
                  <option value="">Pilih SPK</option>
                  {(spkList ?? []).map((t) => <option key={t.noSpk} value={t.noSpk}>{t.noSpk}</option>)}
                </select>
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


