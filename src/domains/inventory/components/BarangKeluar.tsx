"use client";

import { useCan } from '@/domains/auth/user-context';
import React, { useEffect, useRef, useState } from 'react';
import { Camera, Search, Calendar, Plus, Minus, AlertCircle, Download, X, ChevronDown, ChevronRight, Pencil, Lock, Filter, ScanLine, Trash2 } from 'lucide-react';
import { createOutbound, exportOutboundReport, getItemByCode, listOutbound, listItems, updateOutbound, deleteItem } from '@/domains/inventory/api';
import { getDokubah, getTrackingSpk, listDokubah } from '@/domains/ppic/api';
import type { TrackingSpkDetail } from '@/domains/ppic/types';
import type { BahanDokubah } from '@/domains/ppic/data/dokubah';
import type { RecipientType, ItemListRow, OutboundRow } from '@/domains/inventory/types';
import { displayDate, todayIso, toDateRange } from '@/domains/inventory/date';
import { ApiError } from '@/shared/lib/api-client';
import { useApiData } from '@/shared/lib/use-api-data';
import Pagination from '@/shared/components/Pagination';
import { INTEGER_INPUT, digitsOnly } from '@/shared/lib/input';
import SortableTh, { useSort } from '@/shared/components/SortableTh';
import DateFilter from '@/shared/components/DateFilter';
import SearchableSelect from '@/shared/components/SearchableSelect';
import { useClientSearch, useSpkSearch } from '@/domains/ppic/use-spk-search';
import { beepFail, beepOk } from '@/domains/inventory/beep';


// Satu baris barang hasil scan. SPK dan Nama Produk/Proyek diisi sekali di atas untuk seluruh transaksi.
type BarisForm = { itemId: number; code: string; name: string; unit: string; stock: number; qty: string };

const PAGE_SIZE = 20;
// Pilihan tambahan di Nama Produk/Proyek untuk barang yang keluar bukan untuk produk SPK tertentu
const PILIHAN_STOK = 'Stok';
const CAMERA_COOLDOWN_MS = 2000; // a camera reads the same QR on every frame; ignore repeats of one code for this long

const formKosong = () => ({
  namaPengambil: "",
  client: "",
  tanggal: todayIso(),
  spk: "",
  namaItem: "",
  // Form tidak punya pilihan penerima lagi, sedangkan API mewajibkannya; barang keluar gudang diambil untuk produksi
  recipientType: "PRODUKSI" as RecipientType,
  baris: [] as BarisForm[],
});

const tambahSatu = (baris: BarisForm[], itemId: number) =>
  baris.map((b) => (b.itemId === itemId ? { ...b, qty: String(Number(b.qty) + 1) } : b));

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
  // Baris yang baru discan berkedip hijau sebentar; n berubah tiap scan supaya scan ulang kode yang sama tetap memicu efek
  const [flash, setFlash] = useState<{ itemId: number; n: number } | null>(null);
  // Satu key per draft: dipakai ulang saat retry atau klik ganda, ganti hanya kalau isi draft berubah
  const draftKey = useRef({ key: '', payload: '' });
  // Kamera HP: qr-scanner hanya dimuat saat kamera dibuka, dan pembacaan ulang kode yang sama diabaikan sebentar
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastCameraRead = useRef({ code: '', at: 0 });
  // Callback kamera tidak diperbarui tiap render, jadi cek nama pengambil lewat ref
  const pengambilRef = useRef('');
  const pengambilOk = form.namaPengambil.trim() !== '';

  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [peringatan, setPeringatan] = useState("");
  const [actionError, setActionError] = useState<string>('');
  // Diperbarui tiap menit supaya tombol Edit otomatis terkunci begitu batas 1 hari lewat
  const [now, setNow] = useState(() => Date.now());
  // Transaksi yang sedang disorot kursor; semua barisnya ikut disorot
  const [hoverTrx, setHoverTrx] = useState<number | null>(null);
  // Transaksi yang rincian barangnya sedang dibuka di tabel, dan transaksi yang rinciannya tampil di pop-up
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [detailTrx, setDetailTrx] = useState<OutboundRow | null>(null);
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

  // Dropdown SPK di form dan di Edit: pencarian dikirim ke server. The client comes from the tracking system through the SPK; the API ignores a client name from the FE.
  const clientForm = useClientSearch();
  const clientPilihan = clientForm.options.map((c) => ({ value: c, label: c }));
  const spkForm = useSpkSearch(form.spk, form.client);
  const spkPilihan = spkForm.options.map((t) => ({ value: t.noSpk, label: t.noSpk }));
  const spkEdit = useSpkSearch(editForm?.spk ?? '');
  const clientOf = (spk: string) => spkEdit.options.find((t) => t.noSpk === spk)?.client ?? '';

  // Detail SPK (client dan produk) dari tracking, dimuat tiap SPK di form dipilih
  const [detailSpk, setDetailSpk] = useState<{ noSpk: string; data: TrackingSpkDetail | null } | null>(null);
  useEffect(() => {
    if (!form.spk) return;
    const spk = form.spk;
    let batal = false;
    getTrackingSpk(spk)
      .then((data) => !batal && setDetailSpk({ noSpk: spk, data }))
      .catch(() => !batal && setDetailSpk({ noSpk: spk, data: null }));
    return () => { batal = true; };
  }, [form.spk]);
  const detailAktif = detailSpk?.noSpk === form.spk ? detailSpk : null;
  const detailGagal = !!form.spk && detailAktif !== null && detailAktif.data === null;
  const detailMemuat = !!form.spk && detailAktif === null;

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
  useEffect(() => { pengambilRef.current = form.namaPengambil.trim(); }, [form.namaPengambil]);
  useEffect(() => { if (scanOpen) scanRef.current?.focus(); }, [scanOpen]);
  useEffect(() => {
    if (!flash) return;
    document.getElementById(`bk-baris-${flash.itemId}`)?.scrollIntoView?.({ block: 'nearest' });
    const timer = setTimeout(() => setFlash(null), 700);
    return () => clearTimeout(timer);
  }, [flash]);
  // Toast gagal scan hilang sendiri
  useEffect(() => {
    if (!scanError) return;
    const timer = setTimeout(() => setScanError(''), 4000);
    return () => clearTimeout(timer);
  }, [scanError]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Tabel menampilkan satu baris per transaksi, nomor urut dihitung dari halaman
  const trxRows = rows.map((trx, trxIndex) => ({ trx, trxNo: (page - 1) * PAGE_SIZE + trxIndex + 1 }));

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

  const toggleExpand = (id: number) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  // Tombol Edit satu baris barang; terkunci setelah 1 hari. onBuka dipanggil dulu, misalnya untuk menutup pop-up rincian
  const tombolEdit = (trx: OutboundRow, lineIndex: number, onBuka?: () => void) => {
    if (!canUpdate) return null;
    const line = trx.lines[lineIndex];
    return bisaEdit(trx, now) ? (
      <button
        type="button"
        onClick={() => { onBuka?.(); openEdit(trx, lineIndex); }}
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
    );
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
  const patchBaris = (itemId: number, patch: Partial<BarisForm>) =>
    setBaris((bs) => bs.map((b) => (b.itemId === itemId ? { ...b, ...patch } : b)));

  const bukaScan = () => {
    if (!pengambilRef.current) return;
    if (scanOpen) scanRef.current?.focus();
    else setScanOpen(true);
  };

  // Barang yang sudah ada di tabel cukup ditambah jumlahnya, barang baru diambil datanya dari database
  const tambahKode = async (code: string) => {
    setScanError("");
    if (!pengambilRef.current) { setScanError("Isi nama pengambil dulu."); beepFail(); return; }
    const ok = (itemId: number) => { setFlash((f) => ({ itemId, n: (f?.n ?? 0) + 1 })); beepOk(); };
    const ada = barisRef.current.find((b) => b.code === code);
    if (ada) { setBaris((bs) => tambahSatu(bs, ada.itemId)); ok(ada.itemId); return; }
    try {
      const item = await getItemByCode(code);
      // Dua scan cepat untuk kode baru yang sama sama-sama sampai di sini sebelum barisnya ada
      setBaris((bs) => bs.some((b) => b.itemId === item.id)
        ? tambahSatu(bs, item.id)
        : [...bs, { itemId: item.id, code: item.code ?? code, name: item.name, unit: item.unit, stock: item.stock, qty: '1' }]);
      ok(item.id);
    } catch (err) {
      beepFail();
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

  // Phone camera. Needs HTTPS (or localhost) for getUserMedia. Stopped by toggling off, closing the form, or unmount.
  useEffect(() => {
    if (!cameraOn || !videoRef.current) return;
    let stop = () => {};
    let cancelled = false;
    (async () => {
      if (!window.isSecureContext) {
        setScanError('Kamera hanya jalan di HTTPS atau localhost.');
        setCameraOn(false);
        return;
      }
      try {
        const { default: QrScanner } = await import('qr-scanner');
        if (cancelled || !videoRef.current) return;
        const scanner = new QrScanner(
          videoRef.current,
          (result) => {
            const code = result.data.trim();
            const last = lastCameraRead.current;
            const now = Date.now();
            if (!code || (code === last.code && now - last.at < CAMERA_COOLDOWN_MS)) return;
            lastCameraRead.current = { code, at: now };
            void tambahKode(code);
          },
          { preferredCamera: 'environment', highlightScanRegion: true, returnDetailedScanResult: true },
        );
        stop = () => { scanner.stop(); scanner.destroy(); };
        await scanner.start();
        if (cancelled) stop();
      } catch {
        if (!cancelled) {
          setScanError('Kamera tidak bisa dibuka. Periksa izin kamera di browser.');
          setCameraOn(false);
        }
      }
    })();
    return () => { cancelled = true; stop(); };
    // tambahKode only uses refs and functional state updates, so the scanner is not restarted on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn]);

  const pilihClient = (client: string) => {
    setForm((prev) => (prev.client === client ? prev : { ...prev, client, spk: "", namaItem: "" }));
  };

  const pilihSpk =(spk: string) => {
    setForm((prev) => ({ ...prev, spk, namaItem: "" }));
    muatDokubah(spk);
  };

  const dokubahSpk = dokubahBySpk[form.spk];
  // Material dokubah dicocokkan lewat kode barang, kalau tidak ketemu lewat nama
  const bahanDokubah = (b: BarisForm) => Array.isArray(dokubahSpk)
    ? dokubahSpk.find((m) => m.kodeBarang === b.code) ?? dokubahSpk.find((m) => samaNama(m.namaBahan, b.name))
    : undefined;

  const selDokubah = (b: BarisForm) => {
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

  // Produk dari tracking, nama yang sama hanya sekali; Stok selalu ada
  const produkTracking = (detailAktif?.data?.products ?? []).filter((p, i, arr) => arr.findIndex((x) => x.name === p.name) === i);
  const pilihanProduk = [
    ...produkTracking.map((p) => ({ value: p.name, label: `${p.name} (${p.qty} ${p.unit})` })),
    { value: PILIHAN_STOK, label: PILIHAN_STOK },
  ];

  const handleSimpan = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { namaPengambil, tanggal, client, spk, namaItem, recipientType, baris } = form;
    if (!tanggal || !client || !spk || !namaPengambil.trim() || !namaItem.trim()) {
      setModalError("Lengkapi tanggal, client, SPK, nama pengambil, dan nama produk/proyek.");
      return;
    }
    if (baris.length === 0) {
      setModalError("Scan minimal satu barang yang keluar.");
      return;
    }
    if (baris.some((b) => !b.qty || Number(b.qty) <= 0)) {
      setModalError("Isi jumlah pengambilan di setiap barang.");
      return;
    }

    setSaving(true);
    setModalError("");
    try {
      const input = {
        date: tanggal,
        spk,
        itemName: namaItem.trim(),
        recipientType,
        // API belum punya kolom nama pengambil, jadi dicatat di notes
        notes: `Pengambil: ${namaPengambil.trim()}`,
        // Form tidak punya kolom PIC lagi, sedangkan API mewajibkan pic per baris, jadi diisi nama pengambil
        lines: baris.map((b) => ({ itemId: b.itemId, qty: Number(b.qty), pic: namaPengambil.trim() })),
      };
      const payload = JSON.stringify(input);
      if (!draftKey.current.key || draftKey.current.payload !== payload) draftKey.current = { key: crypto.randomUUID(), payload };
      await createOutbound(input, draftKey.current.key);
      draftKey.current = { key: '', payload: '' };
      setCameraOn(false);
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
                  <th scope="col" className="px-6 py-4">Pengambil</th>
                  <th scope="col" className="px-6 py-4">Barang</th>
                  <th scope="col" className="px-6 py-4 text-right">Jumlah</th>
                  <th scope="col" className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading && (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400">Memuat data...</td></tr>
                )}
                {!loading && error && (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-red-500">{error}</td></tr>
                )}
                {!loading && !error && trxRows.map(({ trx, trxNo }) => {
                  // Satu transaksi punya satu warna zebra, satu sorotan hover, dan satu garis aksen di semua barisnya, termasuk baris rincian
                  const aktif = hoverTrx === trx.id;
                  const zebra = trxNo % 2 === 0 ? 'bg-gray-50/60' : 'bg-white';
                  const garisKiri = `border-l-[3px] ${aktif ? 'border-[#FF8A00]' : 'border-transparent'}`;
                  const barisClass = `transition-colors group ${aktif ? 'bg-[#FF8A00]/5' : zebra}`;
                  const hoverProps = {
                    'data-hover': aktif ? 'true' : undefined,
                    onMouseEnter: () => setHoverTrx(trx.id),
                    onMouseLeave: () => setHoverTrx(null),
                  };
                  const terbuka = expanded.has(trx.id);
                  const banyak = trx.lines.length > 1;
                  const pertama = trx.lines[0];
                  const jumlah = trx.lines.reduce((sum, l) => sum + l.qty, 0);
                  // Nama yang bisa diklik membuka pop-up rincian transaksi
                  const tombolRincian = (teks: React.ReactNode, className: string) => (
                    <button
                      type="button"
                      onClick={() => setDetailTrx(trx)}
                      aria-label={`Lihat rincian ${trx.id}`}
                      className={`text-left hover:underline ${className}`}
                    >
                      {teks}
                    </button>
                  );
                  return (
                    <React.Fragment key={trx.id}>
                      <tr {...hoverProps} className={`${barisClass} border-t border-gray-100`}>
                        <td className={`px-6 py-4 text-gray-500 ${garisKiri}`}>
                          <div className="flex items-center gap-2">
                            {banyak ? (
                              <button
                                type="button"
                                onClick={() => toggleExpand(trx.id)}
                                aria-expanded={terbuka}
                                aria-label={`${terbuka ? 'Tutup' : 'Buka'} rincian barang ${trx.id}`}
                                className="p-0.5 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-200/60"
                              >
                                <ChevronRight className={`w-4 h-4 transition-transform ${terbuka ? 'rotate-90' : ''}`} />
                              </button>
                            ) : (
                              <span className="w-5" />
                            )}
                            <span>{trxNo}.</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col items-start">
                            {tombolRincian(trx.noTransaksi ?? trx.id, 'font-semibold text-gray-900')}
                            <span className="text-xs text-gray-500">{displayDate(trx.date)}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{trx.clientName}</span>
                            <span className="text-xs text-gray-500">{trx.spk}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-gray-600">{tombolRincian(trx.itemName, 'text-gray-600')}</td>

                        <td className="px-6 py-4 text-gray-700">{pertama?.pic ?? '-'}</td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col items-start">
                            {tombolRincian(pertama?.itemName ?? '-', 'font-medium text-gray-900')}
                            <span className="text-xs font-mono text-gray-500 mt-0.5">{pertama?.itemCode ?? '-'}</span>
                            {banyak && <span className="text-xs text-gray-400 mt-0.5">{`+${trx.lines.length - 1} barang lainnya`}</span>}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right font-bold text-gray-800">{jumlah}</td>

                        <td className="px-6 py-4">
                          {/* Menggunakan kontainer flex agar tombol berjejer rapi ke samping */}
                          <div className="flex items-center justify-center gap-2">
                            {/* Transaksi satu barang punya Edit di sini; transaksi banyak barang Edit ada per baris di rincian */}
                            {!banyak && pertama && tombolEdit(trx, 0)}
                          </div>
                        </td>
                      </tr>

                      {terbuka && banyak && trx.lines.map((line, lineIndex) => (
                        <tr key={lineIndex} {...hoverProps} className={barisClass}>
                          <td className={`px-6 py-3 ${garisKiri}`} />
                          <td className="px-6 py-3" />
                          <td className="px-6 py-3" />
                          <td className="px-6 py-3" />
                          <td className="px-6 py-3" />
                          <td className="py-3 pl-12 pr-6">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">{line.itemName}</span>
                              <span className="text-xs font-mono text-gray-500 mt-0.5">{line.itemCode ?? '-'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right font-bold text-gray-800">{line.qty}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center justify-center gap-2">{tombolEdit(trx, lineIndex)}</div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
                {!loading && !error && rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-gray-400 italic">
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
              onClick={() => { setCameraOn(false); setIsModalOpen(false); }}
              aria-label="Tutup form"
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>

            <h2 className="text-[18px] font-extrabold text-black tracking-wide uppercase mb-6">Form Barang Keluar</h2>

            {/* Data transaksi, dua kolom: kiri No. Transaksi, Tanggal, Nama Pengambil; kanan Client, SPK, Nama Produk/Proyek */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-4 mb-8">
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
                <span className={rowLabelClass}>Client</span>
                <SearchableSelect
                  value={form.client}
                  onChange={pilihClient}
                  onSearch={clientForm.onSearch}
                  options={clientPilihan}
                  placeholder="Pilih client"
                  aria-label="Client"
                  className={selectClass}
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
                  onSearch={spkForm.onSearch}
                  options={spkPilihan}
                  placeholder={form.client ? "Pilih SPK" : "Pilih client dulu"}
                  aria-label="SPK"
                  className={selectClass}
                />
              </div>
              <div className={rowClass}>
                <span className={rowLabelClass}>Nama Produk/Proyek</span>
                <div className="min-w-0">
                  <SearchableSelect
                    value={form.namaItem}
                    onChange={(namaItem) => setForm((prev) => ({ ...prev, namaItem }))}
                    options={pilihanProduk}
                    placeholder="Pilih produk/proyek atau stok"
                    aria-label="Nama Produk/Proyek"
                    className={selectClass}
                  />
                  {detailMemuat && <p className="mt-1 text-xs text-gray-400">Memuat produk...</p>}
                  {detailGagal && <p className="mt-1 text-xs text-red-600">Gagal memuat produk dari tracking. Pilih SPK lagi.</p>}
                </div>
              </div>
            </div>

            {/* Daftar barang yang keluar, diisi dengan scan QR barang */}
            <button type="button" onClick={bukaScan} disabled={!pengambilOk} className={orangeButtonClass}>
              <ScanLine className="w-4 h-4" strokeWidth={2.5} />
              <span>Scan Barang</span>
            </button>
            {!pengambilOk && <p className="mt-2 text-xs text-gray-500">Isi Nama Pengambil dulu</p>}

            {scanOpen && (
              <div className="flex gap-2 mt-4">
                <div className="relative flex-1">
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
                {/* Saat kamera sudah menyala tombol tetap bisa dipakai untuk mematikannya, walau nama pengambil kosong */}
                <button
                  type="button"
                  onClick={() => { setScanError(''); setCameraOn((v) => !v); }}
                  disabled={!pengambilOk && !cameraOn}
                  aria-pressed={cameraOn}
                  className={`flex items-center justify-center gap-2 px-4 border-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${cameraOn ? 'bg-orange-50 border-orange-300 text-orange-700' : 'border-orange-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  <Camera className="w-4 h-4" />
                  {cameraOn ? 'Matikan kamera' : 'Kamera'}
                </button>
              </div>
            )}
            {cameraOn && <video ref={videoRef} muted playsInline className="mt-4 w-full max-w-sm rounded-xl bg-black" />}
            {scanError && <p role="alert" className="fixed bottom-6 right-6 z-70 max-w-sm p-3 bg-red-600 text-white text-sm rounded-lg shadow-lg">{scanError}</p>}
            {form.baris.length > 0 && (
              <p className="mt-3 text-sm text-gray-700">Terscan: <span className="font-bold">{form.baris.reduce((n, b) => n + (Number(b.qty) || 0), 0)}</span> item, {form.baris.length} jenis</p>
            )}

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
                        Belum ada barang. Tekan Scan Barang lalu scan QR pada barang yang diambil.
                      </td>
                    </tr>
                  )}
                  {form.baris.map((b, i) => (
                    <tr key={b.itemId} id={`bk-baris-${b.itemId}`} className={`transition-colors duration-500 ${flash?.itemId === b.itemId ? 'bg-green-200' : ''}`}>
                      <td className={`${formCellClass} text-center text-gray-700`}>{i + 1}</td>
                      <td className={`${formCellClass} px-2 py-2 font-medium text-gray-900`}>{b.name}</td>
                      <td className={`${formCellClass} px-2 text-center text-gray-700`}>{b.unit}</td>
                      <td className={`${formCellClass} px-2 text-center font-mono text-xs text-gray-600`}>{b.code}</td>
                      <td className={`${formCellClass} px-2 text-center`}>{selDokubah(b)}</td>
                      <td className={`${formCellClass} px-2 py-1.5`}>
                        <div className="flex items-center justify-center">
                          <button type="button" aria-label={`Kurangi ${b.name}`} disabled={Number(b.qty) <= 1} onClick={() => patchBaris(b.itemId, { qty: String(Math.max(Number(b.qty) - 1, 1)) })} className="p-1 text-gray-500 hover:text-gray-900 disabled:opacity-30"><Minus className="w-4 h-4" /></button>
                          <input
                            {...INTEGER_INPUT}
                            maxLength={9}
                            value={b.qty}
                            aria-label={`Pengambilan ${b.name}`}
                            title={`Stok ${b.stock} ${b.unit}`}
                            onChange={(e) => patchBaris(b.itemId, { qty: digitsOnly(e.target.value) })}
                            className={`w-16 border rounded-md py-1.5 px-2 text-center text-sm ${Number(b.qty) > b.stock ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                          />
                          <button type="button" aria-label={`Tambah ${b.name}`} onClick={() => setBaris((bs) => tambahSatu(bs, b.itemId))} className="p-1 text-gray-500 hover:text-gray-900"><Plus className="w-4 h-4" /></button>
                        </div>
                        <p className={`mt-0.5 text-center text-xs ${Number(b.qty) > b.stock ? 'text-red-600' : 'text-gray-400'}`}>stok {b.stock}</p>
                      </td>
                      <td className={`${formCellClass} px-2 text-center`}>
                        <button type="button" aria-label={`Hapus ${b.name}`} onClick={() => setBaris((bs) => bs.filter((x) => x.itemId !== b.itemId))} className="text-gray-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
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
                <span className={labelClass}>SPK</span>
                <SearchableSelect
                  value={editForm.spk}
                  onChange={(spk) => updateEdit({ spk })}
                  onSearch={spkEdit.onSearch}
                  options={spkEdit.options.map((t) => ({ value: t.noSpk, label: t.noSpk }))}
                  placeholder="Pilih SPK"
                  aria-label="SPK"
                  className={fieldClass}
                />
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

      {/* Pop-up rincian transaksi: header, semua barang, dan status edit */}
      {detailTrx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md transition-opacity duration-300 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rincian-bk-judul"
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-full overflow-y-auto p-6 sm:p-8 relative animate-in zoom-in-95 duration-200"
          >
            <button
              type="button"
              onClick={() => setDetailTrx(null)}
              aria-label="Tutup rincian"
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>

            <h2 id="rincian-bk-judul" className="text-[18px] font-extrabold text-black tracking-wide uppercase mb-6">Rincian Barang Keluar</h2>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mb-6 text-sm">
              {([
                ['No. Transaksi', detailTrx.noTransaksi ?? detailTrx.id],
                ['Tanggal', displayDate(detailTrx.date)],
                ['Client', detailTrx.clientName],
                ['SPK', detailTrx.spk],
                ['Nama Item/Projek', detailTrx.itemName],
                ['Pengambil', detailTrx.lines[0]?.pic ?? '-'],
                ['Dicatat', tampilWaktu(new Date(detailTrx.createdAt).getTime())],
              ] as const).map(([k, v]) => (
                <div key={k} className="flex flex-col">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="font-semibold text-gray-900">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-semibold">
                  <tr>
                    <th scope="col" className="px-4 py-2.5">No</th>
                    <th scope="col" className="px-4 py-2.5">Nama Barang</th>
                    <th scope="col" className="px-4 py-2.5">Kode</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Jumlah</th>
                    <th scope="col" className="px-4 py-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detailTrx.lines.map((line, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2.5 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{line.itemName}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{line.itemCode ?? '-'}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-800">{line.qty}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-center">{tombolEdit(detailTrx, i, () => setDetailTrx(null))}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className={`mt-4 text-sm ${bisaEdit(detailTrx, now) ? 'text-gray-600' : 'text-red-600'}`}>
              {bisaEdit(detailTrx, now)
                ? `Bisa diedit sampai ${tampilWaktu(batasEdit(detailTrx))}`
                : 'Sudah lewat 1 hari, tidak bisa diedit'}
            </p>
          </div>
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


