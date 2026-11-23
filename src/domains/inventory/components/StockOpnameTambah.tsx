"use client";

import { useAuthUser, useCan } from '@/domains/auth/user-context';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, Camera } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { gudangBasePath } from '../base-path';
import { createStockOpname, getItemByCode, listItems } from '@/domains/inventory/api';
import type { Item, ItemListRow } from '@/domains/inventory/types';
import { ApiError } from '@/shared/lib/api-client';
import { PHYSICAL_QTY_INPUT, decimalOnlyMax, physicalQtyValid } from '@/shared/lib/input';
import Pagination from '@/shared/components/Pagination';
import { useSort, type Sort } from '@/shared/components/SortableTh';
import { useApiData } from '@/shared/lib/use-api-data';
import { clearOpnameDraft, opnameDraftKey, readOpnameDraft, writeOpnameDraft, type OpnameDraft, type OpnameDraftRow } from '../stock-opname-draft';
import { randomId } from '@/shared/lib/random-id';
import Modal from '@/shared/components/Modal';
import QrCameraScanner from '@/domains/inventory/components/QrCameraScanner';

// SortableTh has no rowSpan, and this header spans two rows, so the same sort button is written here.
type SortThProps = { label: string; sortKey: string; sort: Sort; onSort: (by: string) => void; className: string; rowSpan?: number };
function SortTh({ label, sortKey, sort, onSort, className, rowSpan }: SortThProps) {
  const active = sort?.by === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th rowSpan={rowSpan} scope="col" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={className}>
      <button type="button" onClick={() => onSort(sortKey)} className="flex w-full items-center gap-1.5 text-left font-[inherit] hover:text-gray-900">
        <span>{label}</span>
        <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? "text-orange-500" : "text-gray-300"}`} strokeWidth={2.5} aria-hidden />
      </button>
    </th>
  );
}

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
// stock is kept on the row so the confirm count is right for items scanned in from another page
// The item info is kept too, so a row scanned in from another page can still be shown and corrected.
type Row = OpnameDraftRow;
const rowInfo = (item: Item | ItemListRow) => ({ itemName: item.name, code: item.code, unit: item.unit, category: item.category, price: item.price, stock: item.stock });
const toNum = (v: string) => Number(v.replace(",", "."));

function StockOpnameForm({ draft, draftKey, draftId, warning }: { draft: OpnameDraft | null; draftKey: string; draftId?: string; warning?: string }) {
  const router = useRouter();
  const [id] = useState(() => draftId ?? randomId());
  const base = gudangBasePath(usePathname());
  const canCreate = useCan('stock-opname.create');

  const now = new Date();
  const [month, setMonth] = useState(draft?.month ?? String(now.getMonth() + 1));
  const [year, setYear] = useState(draft?.year ?? String(now.getFullYear()));
  const [items, setItems] = useState<ItemListRow[]>([]);
  const [data, setData] = useState<Row[]>(draft?.rows ?? []);
  const [saving, setSaving] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [loadingItems, setLoadingItems] = useState(false);
  const { sort, toggle } = useSort();
  // a sort change starts again from page 1, like the pager does
  const sortBy = (by: string) => {
    toggle(by);
    setPage(1);
  };


  useEffect(() => {
    let cancelled = false;

    async function loadItems() {
      setLoadingItems(true);
      setError("");

      try {
        const res = await listItems({ page, pageSize, sortBy: sort?.by, sortDir: sort?.dir });

        if (cancelled) return;

        setItems(res.rows);
        setTotalItems(res.total);

        setData((prev) => {
          const existing = new Map(
            prev.map((row) => [row.itemId, row])
          );

          const newRows = res.rows.map((item) => {
            const id = String(item.id);
            const saved = existing.get(id);

            if (saved) return { ...saved, ...rowInfo(item) };
            return {
              itemId: id,
              ...rowInfo(item),
              jumlah: "",
              keterangan: "",
            };
          });

          const currentPageIds = new Set(
            res.rows.map((item) => String(item.id))
          );

          return [
            ...prev.filter(
              (row) => !currentPageIds.has(row.itemId)
            ),
            ...newRows,
          ];
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Gagal memuat data barang."
          );
        }
      } finally {
        if (!cancelled) setLoadingItems(false);
      }
    }

    loadItems();

    return () => {
      cancelled = true;
    };
  }, [page, pageSize, sort]);

  const handleChange = (itemId: string, patch: Partial<Row>) => {
    setData((prev) => prev.map((row) => row.itemId === itemId ? {...row, ...patch} : row));
  };

  const [cameraOn, setCameraOn] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanNotice, setScanNotice] = useState("");
  const [lockedName, setLockedName] = useState("");
  const [scanned, setScanned] = useState<{ item: Item; jumlah: string; keterangan: string } | null>(null);

  // Bumped on every scan and when the camera toggles; an answer from an older session is dropped.
  const scanSession = useRef(0);

  const toggleCamera = () => {
    scanSession.current++;
    setCameraOn((v) => !v);
    setScanned(null);
    setScanError("");
    setScanNotice("");
    setLockedName("");
  };

  const handleScan = async (code: string) => {
    const session = ++scanSession.current;
    setScanError("");
    setScanNotice("");
    setScanned(null);
    setLockedName("");
    try {
      const item = await getItemByCode(code);
      if (session !== scanSession.current) return;
      // An item already in the list keeps its typed count, so a rescan corrects it instead of duplicating it.
      const existing = data.find((row) => row.itemId === String(item.id));
      setLockedName(item.name);
      setScanned({ item, jumlah: existing?.jumlah ?? "", keterangan: existing?.keterangan ?? "" });
    } catch (err) {
      if (session !== scanSession.current) return;
      setScanError(
        err instanceof ApiError && err.status === 404 ? `Kode "${code}" tidak dikenal.`
        : err instanceof ApiError ? err.message : "Gagal membaca kode.",
      );
    }
  };

  const handleMasukkan = () => {
    if (!scanned || scanned.jumlah === "") return;
    const { item, jumlah, keterangan } = scanned;
    const id = String(item.id);
    setData((prev) => prev.some((row) => row.itemId === id)
      ? prev.map((row) => row.itemId === id ? { ...row, jumlah, keterangan } : row)
      : [...prev, { itemId: id, ...rowInfo(item), jumlah, keterangan }]);
    setScanNotice(`${item.name} dimasukkan ke opname: ${toNum(jumlah).toLocaleString('id-ID')} ${item.unit}.`);
    setScanned(null);
  };

  const handleSubmit = async (confirmed = false) => {
    if (saving || submitted) return;
    if (scanned && scanned.jumlah !== '') {
      setError('Masukkan hasil scan ke opname sebelum menyimpan atau submit.');
      return;
    }
    // Only rows with a physical count go to the API; an empty row must not zero that item's stock.
    const filled = data.filter((row) => row.jumlah !== "");
    if (filled.length === 0) {
      setError("Isi jumlah fisik minimal satu barang.");
      return;
    }
    if (filled.some((row) => !physicalQtyValid(row.jumlah))) {
      setError("Jumlah fisik harus 0 sampai 1.000.000, maksimal 3 angka di belakang koma.");
      return;
    }
    const ids = filled.map((row) => row.itemId);
    if (new Set(ids).size !== ids.length) {
      setError("Satu barang hanya boleh muncul sekali per stok opname.");
      return;
    }
    if (!confirmed) {
      setError("");
      setConfirmSubmit(true);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createStockOpname({
        month: Number(month),
        year: Number(year),
        lines: filled.map((row) => ({
          itemId: Number(row.itemId),
          physicalQty: toNum(row.jumlah),
          note: row.keterangan || undefined,
        })),
      });
      setSubmitted(true);
      setConfirmSubmit(false);
      try { clearOpnameDraft(draftKey, id); } catch {
        setError('Stok opname berhasil disubmit, tetapi draft browser belum bisa dihapus. Jangan submit ulang draft ini. Kembali ke daftar untuk melihat hasil final.');
        return;
      }
      router.push(`${base}/transaksi/stock-opname`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan stok opname.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = () => {
    if (saving || submitted) return;
    if (scanned && scanned.jumlah !== '') {
      setError('Masukkan hasil scan ke opname sebelum menyimpan atau submit.');
      return;
    }
    setError("");
    try {
      writeOpnameDraft(draftKey, id, { version: 1, month, year, rows: data.filter((row) => row.jumlah !== ''), savedAt: new Date().toISOString() });
      router.push(`${base}/transaksi/stock-opname`);
    } catch {
      setError("Draft gagal disimpan. Periksa ruang penyimpanan dan izin browser, lalu coba lagi. Isian tetap ada di halaman ini.");
    }
  };

  if (!canCreate) return <div className="p-6 text-sm text-gray-600">Anda tidak punya izin untuk membuat stock opname.</div>;

  // Every counted row stays visible whatever page it came from; empty rows show only on their own page.
  const pageData = data.filter((row) =>
    row.jumlah !== "" || items.some((item) => String(item.id) === row.itemId)
  );

  return (
    <div className="flex flex-col bg-white min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="text-gray-800 hover:opacity-70 transition-opacity">
          <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
        </button>
        <h1 className="text-[19px] font-extrabold text-black tracking-wide">
          {draft ? 'Lanjutkan' : 'Tambah'} Stok Opname {BULAN[Number(month) - 1]} {year}
        </h1>
      </div>

      {warning && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{warning} Draft tidak dimuat. Isian baru akan disimpan sebagai draft terpisah; data draft sebelumnya tetap disimpan di browser.</p>}
      <p className="mb-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{draft ? 'Draft dimuat. ' : ''}Simpan Draft untuk melanjutkan penghitungan di browser dan akun yang sama. Draft belum mengubah stok. Submit setelah seluruh penghitungan selesai.</p>
      <div className="max-w-5xl">
        <div className="flex gap-3 mb-6">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-gray-200 rounded-xl py-2.5 px-3 shadow-sm text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20"
          >
            {BULAN.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="border border-gray-200 rounded-xl py-2.5 px-3 shadow-sm text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20"
          >
            {[...new Set([Number(year), now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1])].sort((a, b) => a - b).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="mb-6">
          <button
            type="button"
            onClick={toggleCamera}
            aria-pressed={cameraOn}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium ${cameraOn ? 'bg-orange-50 border-orange-300 text-orange-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            <Camera className="w-4 h-4" />
            {cameraOn ? 'Matikan kamera' : 'Scan QR'}
          </button>
          {scanNotice && <p className="text-sm text-green-700 mt-3">{scanNotice}</p>}
          {cameraOn && (
            <div className="mt-4">
              <QrCameraScanner
                onScan={(code) => void handleScan(code)}
                lockedLabel={lockedName}
                rejected={scanError !== ''}
                onFail={(message) => { setScanError(message); setCameraOn(false); }}
              />
              {scanError && <p role="alert" className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{scanError}</p>}
              {scanned && (() => {
                const { item, jumlah } = scanned;
                return (
                  <div className="mb-4 p-4 max-w-sm bg-white border border-gray-200 rounded-xl shadow-sm text-sm">
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                      <dt className="text-gray-500">Kode</dt>
                      <dd className="font-mono text-gray-700">{item.code ?? '-'}</dd>
                      <dt className="text-gray-500">Nama</dt>
                      <dd className="font-bold text-gray-900">{item.name}</dd>
                      {item.externalCode && <>
                        <dt className="text-gray-500">Kode bawaan</dt>
                        <dd className="font-mono text-gray-700">{item.externalCode}</dd>
                      </>}
                    </dl>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <label className="flex flex-col gap-1 text-gray-500">
                        Jumlah fisik
                        <input {...PHYSICAL_QTY_INPUT} aria-label="Jumlah fisik" value={jumlah} placeholder="0" onChange={(e) => setScanned((s) => s && { ...s, jumlah: decimalOnlyMax(e.target.value, 3) })} className="border border-gray-200 rounded-lg px-3 py-2 text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20" />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={handleMasukkan}
                      disabled={jumlah === ""}
                      className="mt-4 w-full px-4 py-2.5 bg-[#ff8a00] text-white rounded-lg shadow-sm hover:bg-[#eb7d00] transition-colors font-semibold disabled:opacity-60"
                    >
                      Masukkan ke opname
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        <datalist id="stock-opname-items">
          {items.map((it) => <option key={it.id} value={it.name} />)}
        </datalist>

        <div className="relative">
          {/* Table Wrapper */}
          <div className="overflow-hidden w-full bg-white rounded-xl shadow-sm border border-gray-200/80">
            <div className="overflow-x-auto w-full">
              <table className="w-full table-auto text-left text-sm border-collapse">
                <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider text-xs font-semibold">
                  <tr>
                    <th className="border-r border-b border-gray-200 px-6 py-4 align-top w-12 whitespace-nowrap text-center">No</th>
                    <SortTh label="Nama Barang" sortKey="name" sort={sort} onSort={sortBy} className="border-r border-b border-gray-200 px-6 py-4 align-top whitespace-nowrap" />
                    <SortTh label="Satuan" sortKey="unit" sort={sort} onSort={sortBy} className="border-r border-b border-gray-200 px-6 py-4 align-top whitespace-nowrap" />
                    <SortTh label="Kategori" sortKey="category" sort={sort} onSort={sortBy} className="border-r border-b border-gray-200 px-6 py-4 align-top whitespace-nowrap" />
                    <th className="border-b border-gray-200 px-6 py-4 align-top whitespace-nowrap text-center">Jumlah Fisik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageData.map((row, index) => {
                    return (
                      <tr key={row.itemId} className="bg-white hover:bg-orange-50/10 transition-colors duration-150">
                        <td className="border-r border-b border-gray-100/50 h-12 text-gray-400 font-medium text-center text-xs"> {index + 1}</td>
                        <td className="border-r border-b border-gray-100/50 p-0 whitespace-normal">
                          <div className='flex flex-col'>
                            <span className="font-bold text-gray-900">{row.itemName}</span>
                            <span className="text-xs font-mono text-gray-500 mt-0.5">{row.code ?? '-'}</span>
                          </div>
                        </td>
                        <td className="border-r border-b border-gray-100/50 p-0 w-24">
                          <input type="text" readOnly value={row.unit} placeholder="Unit" className="w-full h-full min-h-12 px-4 py-2 bg-transparent text-center text-gray-700 text-sm placeholder-gray-300 focus:outline-none" />
                        </td>
                        <td className="border-r border-b border-gray-100/50 p-0 w-32">
                          <input type="text" readOnly value={row.category} placeholder="Kategori" className="w-full h-full min-h-12 px-4 py-2 bg-transparent text-center text-gray-700 text-sm placeholder-gray-300 focus:outline-none" />
                        </td>
                        <td className="border-b border-gray-100/50 p-0 w-28">
                          <input {...PHYSICAL_QTY_INPUT} value={row.jumlah} placeholder="0" onChange={(e) => handleChange(row.itemId, { jumlah: decimalOnlyMax(e.target.value, 3) })} className="w-full h-full min-h-12 px-4 py-2 bg-transparent text-center focus:outline-none focus:ring-1 focus:ring-inset focus:ring-orange-500/50 text-gray-700 text-sm transition-all placeholder-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {loadingItems && (
                <p className="text-sm text-gray-500 p-4">
                  Memuat data barang...
                </p>
              )}

              <Pagination page={page} pageSize={pageSize} total={totalItems} onPageChange={setPage} />
            </div>
          </div>
        </div>
      </div>

      {confirmSubmit && (
        <Modal title="Submit Stok Opname?" onClose={() => { if (!saving) setConfirmSubmit(false); }} footer={<>
          <button type="button" disabled={saving} onClick={() => setConfirmSubmit(false)} className="px-4 py-2 rounded-lg border border-gray-200 disabled:opacity-60">Batal</button>
          <button type="button" disabled={saving} onClick={() => void handleSubmit(true)} className="px-4 py-2 rounded-lg bg-[#ff8a00] text-white disabled:opacity-60">{saving ? 'Mengirim...' : 'Ya, Submit'}</button>
        </>}>
          <p className="text-sm text-gray-700">Stok {data.filter((row) => row.jumlah !== '').length} barang akan disetel sesuai jumlah fisik. Setelah disubmit, stok opname menjadi final. Pastikan seluruh penghitungan sudah selesai.</p>
          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        </Modal>
      )}
      {error && <p className="text-sm text-red-500 text-right mt-4">{error}</p>}
      <div className="flex justify-end gap-3 mt-6">
        <button type="button" onClick={handleSaveDraft} disabled={saving || loadingItems || submitted} className="px-6 py-2.5 border border-orange-300 text-orange-700 rounded-lg font-semibold text-sm disabled:opacity-60">Simpan Draft</button>
        <button
          onClick={() => void handleSubmit()}
          disabled={saving || loadingItems || submitted}
          className="px-8 py-2.5 bg-[#ff8a00] text-white rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:bg-[#eb7d00] transition-all duration-200 font-semibold text-sm disabled:opacity-60"
        >
          {saving ? 'Mengirim...' : 'Submit'}
        </button>
      </div>
    </div>
  );
}

type DraftLoad = { draft: OpnameDraft | null; warning: string };

export default function TambahStockOpnameGudang() {
  const base = gudangBasePath(usePathname());
  const userId = useAuthUser()?.id;
  const canCreate = useCan('stock-opname.create');
  const key = opnameDraftKey(base, userId);
  const draftId = useSearchParams().get('draft');
  // A damaged or unreadable draft must not lock the form: open it empty with a warning instead.
  const { data, loading } = useApiData<DraftLoad>(() => Promise.resolve().then((): DraftLoad => {
    if (!canCreate || !draftId) return { draft: null, warning: '' };
    try {
      const draft = readOpnameDraft(key, draftId);
      return { draft, warning: draft ? '' : 'Draft stok opname tidak ditemukan.' };
    } catch {
      return { draft: null, warning: 'Draft stok opname tidak dapat dibaca.' };
    }
  }), `${key}|${draftId ?? 'new'}`);
  if (!canCreate) return <div className="p-6 text-sm text-gray-600">Anda tidak punya izin untuk membuat stock opname.</div>;
  if (loading) return <p role="status">Memuat draft stok opname...</p>;
  return <StockOpnameForm key={`${key}|${draftId ?? 'new'}`} draft={data?.draft ?? null} warning={data?.warning} draftKey={key} draftId={data?.draft && draftId ? draftId : undefined} />;
}
