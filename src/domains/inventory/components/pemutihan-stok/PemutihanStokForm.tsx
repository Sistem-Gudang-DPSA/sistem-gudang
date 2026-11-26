"use client";

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import {
  createStockReconciliation,
  getStockReconciliation,
  getStockReconciliationSuggestions,
  updateStockReconciliation,
} from '@/domains/inventory/api';
import type { StockReconciliationDetail, StockReconciliationLine } from '@/domains/inventory/types';
import { ApiError } from '@/shared/lib/api-client';
import { useApiData } from '@/shared/lib/use-api-data';
import { PHYSICAL_QTY_INPUT, decimalOnlyMax, physicalQtyValid } from '@/shared/lib/input';
import ScrollableTable, { STICKY_HEAD_CLASS } from '@/shared/components/ScrollableTable';
import { KategoriBadge } from '@/domains/inventory/components/data-barang/DataBarangTable';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const fmt = (value: number | null | undefined) => value == null ? '-' : value.toLocaleString('id-ID');
const toNum = (value: string) => Number(value.replace(',', '.'));
type Row = StockReconciliationLine & { jumlah: string; keterangan: string };
const fromLine = (line: StockReconciliationLine): Row => ({
  ...line,
  jumlah: line.physicalQty == null ? '' : String(line.physicalQty).replace('.', ','),
  keterangan: line.note ?? '',
});

export default function PemutihanStokForm() {
  const { id } = useParams<{ id?: string }>();
  const { data, loading, error } = useApiData(
    () => id ? getStockReconciliation(id) : Promise.resolve(null),
    `stock-reconciliation-form:${id ?? 'new'}`,
    'Gagal memuat draft pemutihan.',
  );
  if (loading) return <p role="status" className="p-6 text-sm text-gray-500">Memuat data pemutihan...</p>;
  if (error) return <p role="alert" className="p-6 text-sm text-red-600">{error}</p>;
  return <FormBody key={id ?? 'new'} detail={data ?? null} />;
}

function FormBody({ detail }: { detail: StockReconciliationDetail | null }) {
  const router = useRouter();
  const editing = !!detail;
  const idempotencyKey = useRef<string>(crypto.randomUUID());
  const [month, setMonth] = useState(String(detail?.month ?? new Date().getMonth() + 1));
  const [year, setYear] = useState(String(detail?.year ?? new Date().getFullYear()));
  const [rows, setRows] = useState<Row[]>(() => detail?.lines.map(fromLine) ?? []);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState(detail?.notes ?? '');

  const loadSuggestions = async (nextMonth = month, nextYear = year) => {
    setLoadingRows(true);
    setLoadError('');
    try {
      const suggestions = await getStockReconciliationSuggestions({ month: Number(nextMonth), year: Number(nextYear) });
      setRows(suggestions.map(fromLine));
    } catch (err) {
      setRows([]);
      setLoadError(err instanceof ApiError ? err.message : 'Gagal memuat saran pemutihan.');
    } finally {
      setLoadingRows(false);
    }
  };

  const patchRow = (itemId: number, patch: Partial<Row>) => setRows((prev) => prev.map((row) => row.itemId === itemId ? { ...row, ...patch } : row));

  const handleSave = async () => {
    if (saving) return;
    if (rows.length === 0) { setError('Tidak ada barang untuk diproses.'); return; }
    if (rows.some((row) => !physicalQtyValid(row.jumlah))) { setError('Jumlah fisik harus 0 sampai 1.000.000, maksimal 3 angka di belakang koma.'); return; }
    setSaving(true);
    setError('');
    const input = {
      month: Number(month),
      year: Number(year),
      notes: notes.trim() || undefined,
      lines: rows.map((row) => ({ itemId: row.itemId, physicalQty: toNum(row.jumlah), note: row.keterangan.trim() || undefined })),
    };
    try {
      if (!editing) idempotencyKey.current = crypto.randomUUID();
      const saved = editing ? await updateStockReconciliation(detail.id, input) : await createStockReconciliation(input, idempotencyKey.current);
      router.push(`/dashboard/ppic/transaksi/pemutihan-stok/${saved.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menyimpan pemutihan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-10">
      <Link href="/dashboard/ppic/transaksi/pemutihan-stok" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"><ArrowLeft className="h-4 w-4" />Kembali ke Pemutihan Stok</Link>
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900">{editing ? 'Edit Draft Pemutihan' : 'Buat Pemutihan Stok'}</h1>
          <p className="mt-2 text-sm text-gray-500">Angka sistem hanya untuk review PPIC. Sesuaikan jumlah fisik sebelum posting.</p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm text-gray-600">Bulan
              <select value={month} disabled={editing} onChange={(e) => { setMonth(e.target.value); if (!editing) void loadSuggestions(e.target.value, year); }} className="rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-50">
                {BULAN.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-600">Tahun
              <select value={year} disabled={editing} onChange={(e) => { setYear(e.target.value); if (!editing) void loadSuggestions(month, e.target.value); }} className="rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-50">
                {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            {!editing && <button type="button" onClick={() => void loadSuggestions()} disabled={loadingRows} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">{loadingRows ? 'Memuat...' : 'Muat Saran'}</button>}
            <label className="flex min-w-64 flex-1 flex-col gap-1 text-sm text-gray-600">Catatan
              <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} className="rounded-lg border border-gray-300 px-3 py-2" />
            </label>
          </div>
          {loadError && <p role="alert" className="mt-3 text-sm text-red-600">{loadError}</p>}
        </div>

        <ScrollableTable ariaLabel="Tabel pemutihan stok">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className={`${STICKY_HEAD_CLASS} bg-gray-50 text-gray-600 font-semibold border-b border-gray-100`}>
              <tr>
                {['No', 'Kode Barang', 'Nama Barang', 'Kategori', 'Satuan', 'Stok Sistem', 'Jumlah Fisik', 'Selisih', 'Harga Satuan', 'Keterangan'].map((label) => <th key={label} scope="col" className={`px-6 py-3 ${label.startsWith('Stok') || label.startsWith('Jumlah') || label.startsWith('Selisih') || label.startsWith('Harga') ? 'text-right' : ''}`}>{label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row, index) => {
                const system = row.reviewedSystemQty ?? row.systemQty;
                const diff = row.jumlah === '' ? null : toNum(row.jumlah) - (system ?? 0);
                return (
                  <tr key={row.itemId} className="hover:bg-[#FF8A00]/5 transition-colors">
                    <td className="px-6 py-3 text-gray-500">{index + 1}</td>
                    <td className="px-6 py-3 font-mono text-xs text-gray-600">{row.itemCode ?? '-'}</td>
                    <td className="px-6 py-3 font-bold text-gray-900">{row.itemName}</td>
                    <td className="px-6 py-3"><KategoriBadge category={row.category} /></td>
                    <td className="px-6 py-3 text-gray-700">{row.unit}</td>
                    <td className="px-6 py-3 text-right text-gray-700">{fmt(system)}</td>
                    <td className="px-4 py-2 w-32">
                      <input {...PHYSICAL_QTY_INPUT} aria-label={`Jumlah fisik ${row.itemName}`} value={row.jumlah} onChange={(e) => patchRow(row.itemId, { jumlah: decimalOnlyMax(e.target.value, 3) })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-right" />
                    </td>
                    <td className={`px-6 py-3 text-right font-bold ${diff != null && diff < 0 ? 'text-red-600' : 'text-gray-700'}`}>{diff == null ? '-' : diff.toLocaleString('id-ID')}</td>
                    <td className="px-6 py-3 text-right text-gray-700">{fmt(row.unitPrice)}</td>
                    <td className="px-4 py-2 min-w-44">
                      <input aria-label={`Keterangan ${row.itemName}`} value={row.keterangan} maxLength={255} onChange={(e) => patchRow(row.itemId, { keterangan: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={10} className="px-6 py-10 text-center text-gray-400">Belum ada barang. Muat saran untuk periode ini.</td></tr>}
            </tbody>
          </table>
        </ScrollableTable>
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-6 flex justify-end">
        <button type="button" onClick={() => void handleSave()} disabled={saving || rows.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-[#ff8a00] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"><Save className="w-4 h-4" />{saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Simpan Draft'}</button>
      </div>
    </div>
  );
}
