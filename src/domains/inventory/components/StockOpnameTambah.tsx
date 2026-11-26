"use client";

import React, { useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { gudangBasePath } from '../base-path';
import { getItemByCode, getStockOpname, saveStockOpnameLines, submitStockOpname } from '@/domains/inventory/api';
import type { StockOpnameDetail, StockOpnameLine, StockOpnameStatus } from '@/domains/inventory/types';
import { ApiError } from '@/shared/lib/api-client';
import { PHYSICAL_QTY_INPUT, decimalOnlyMax, physicalQtyValid } from '@/shared/lib/input';
import { useCan } from '@/domains/auth/user-context';
import { useApiData } from '@/shared/lib/use-api-data';
import Modal from '@/shared/components/Modal';
import ScrollableTable, { STICKY_HEAD_CLASS } from '@/shared/components/ScrollableTable';
import { KategoriBadge } from '@/domains/inventory/components/data-barang/DataBarangTable';
import QrCameraScanner from '@/domains/inventory/components/QrCameraScanner';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const STATUS_LABEL: Record<StockOpnameStatus, string> = { OPEN: 'Open', SUBMITTED: 'Disubmit', POSTED: 'Diposting' };
const CHUNK = 100;
type FillRow = StockOpnameLine & { jumlah: string; keterangan: string };
const toNum = (value: string) => Number(value.replace(',', '.'));
const fromLine = (line: StockOpnameLine): FillRow => ({
  ...line,
  jumlah: line.physicalQty == null ? '' : String(line.physicalQty).replace('.', ','),
  keterangan: line.note ?? '',
});

export function StockOpnameIsiGudang() {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const base = gudangBasePath(pathname);
  const opnameId = Number(id);
  const valid = /^\d+$/.test(id) && Number.isSafeInteger(opnameId) && opnameId > 0;
  const { data, loading, error } = useApiData(
    () => valid ? getStockOpname(opnameId) : Promise.reject(new Error('ID stok opname tidak valid.')),
    `stock-opname-isi:${id}`,
    'Gagal memuat stok opname.',
  );
  if (!valid) return <p role="alert" className="p-6 text-sm text-red-600">ID stok opname tidak valid.</p>;
  if (loading) return <p role="status" className="p-6">Memuat stok opname...</p>;
  if (error || !data) return <p role="alert" className="p-6 text-sm text-red-600">{error || 'Stok opname tidak ditemukan.'}</p>;
  return <FormIsi key={`${data.id}|${data.status}`} detail={data} base={base} />;
}

function FormIsi({ detail, base }: { detail: StockOpnameDetail; base: string }) {
  const router = useRouter();
  const canCreate = useCan('stock-opname.create');
  const [rows, setRows] = useState<FillRow[]>(() => detail.lines.map(fromLine));
  const [saved, setSaved] = useState<Map<number, number | null>>(() => new Map(detail.lines.map((line) => [line.itemId, line.physicalQty])));
  const [savedNotes, setSavedNotes] = useState<Map<number, string>>(() => new Map(detail.lines.map((line) => [line.itemId, line.note ?? ''])));
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [scanError, setScanError] = useState('');
  const [lockedName, setLockedName] = useState('');
  const [scanned, setScanned] = useState<{ line: StockOpnameLine; jumlah: string } | null>(null);
  const scanSession = useRef(0);

  const editable = canCreate && detail.status === 'OPEN';
  const filled = rows.filter((row) => row.jumlah !== '').length;
  const total = rows.length;
  const dirty = useMemo(() => rows.some((row) => (row.jumlah === '' ? null : toNum(row.jumlah)) !== (saved.get(row.itemId) ?? null) || row.keterangan.trim() !== (savedNotes.get(row.itemId) ?? '')), [rows, saved, savedNotes]);

  const patchRow = (itemId: number, patch: Partial<FillRow>) => setRows((prev) => prev.map((row) => row.itemId === itemId ? { ...row, ...patch } : row));

  const toggleCamera = () => {
    scanSession.current++;
    setCameraOn((value) => !value);
    setScanned(null);
    setScanError('');
    setLockedName('');
  };

  const handleScan = async (code: string) => {
    const session = ++scanSession.current;
    setScanError('');
    setScanned(null);
    setLockedName('');
    try {
      const item = await getItemByCode(code);
      if (session !== scanSession.current) return;
      const line = rows.find((row) => row.itemId === item.id);
      if (!line) {
        setScanError(`Barang "${item.name}" tidak ada pada periode opname ini.`);
        return;
      }
      setLockedName(item.name);
      setScanned({ line, jumlah: line.jumlah });
    } catch (err) {
      if (session !== scanSession.current) return;
      setScanError(err instanceof ApiError && err.status === 404 ? `Kode "${code}" tidak dikenal.` : err instanceof ApiError ? err.message : 'Gagal membaca kode.');
    }
  };

  const masukkanScan = () => {
    if (!scanned || scanned.jumlah === '') return;
    patchRow(scanned.line.itemId, { jumlah: scanned.jumlah });
    setScanned(null);
    setCameraOn(false);
  };

  const changes = () => rows
    .filter((row) => row.jumlah !== '' || saved.get(row.itemId) != null)
    .map((row) => ({
      itemId: row.itemId,
      physicalQty: row.jumlah === '' ? null : toNum(row.jumlah),
      note: row.keterangan.trim() || undefined,
    }));

  const saveAll = async () => {
    const lines = changes();
    for (let start = 0; start < lines.length; start += CHUNK) {
      await saveStockOpnameLines(detail.id, { lines: lines.slice(start, start + CHUNK) });
    }
    setSaved(new Map(lines.map((line) => [line.itemId, line.physicalQty])));
    setSavedNotes(new Map(lines.map((line) => [line.itemId, line.note ?? ''])));
    return lines;
  };

  const handleSave = async () => {
    if (saving || !editable) return;
    if (rows.some((row) => row.jumlah !== '' && !physicalQtyValid(row.jumlah))) {
      setError('Jumlah fisik harus 0 sampai 1.000.000, maksimal 3 angka di belakang koma.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await saveAll();
      setNotice('Isian tersimpan. Stok sistem belum berubah.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menyimpan isian opname.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (confirmed = false) => {
    if (saving || submitting || !editable) return;
    if (rows.some((row) => row.jumlah !== '' && !physicalQtyValid(row.jumlah))) {
      setError('Jumlah fisik harus 0 sampai 1.000.000, maksimal 3 angka di belakang koma.');
      return;
    }
    if (!confirmed) {
      setError('');
      setConfirmSubmit(true);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await saveAll();
      await submitStockOpname(detail.id);
      setConfirmSubmit(false);
      router.push(`${base}/transaksi/stock-opname`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal submit stok opname.');
      setConfirmSubmit(false);
    } finally {
      setSubmitting(false);
    }
  };

  const readOnly = !editable;

  return (
    <div className="flex flex-col bg-white min-h-screen p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`${base}/transaksi/stock-opname`} aria-label="Kembali" className="text-gray-800 hover:opacity-70 transition-opacity"><ArrowLeft className="w-5 h-5" strokeWidth={2.5} /></Link>
        <div>
          <h1 className="text-[19px] font-extrabold text-black tracking-wide">Stok Opname {BULAN[detail.month - 1]} {detail.year}</h1>
          <p className="text-sm text-gray-500">Status: {STATUS_LABEL[detail.status]} · Progress: {filled} / {total} barang</p>
        </div>
      </div>

      <p className="mb-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Simpan Sebagian untuk menyimpan isian ke server. Stok sistem belum berubah. Selisih diproses setelah PPIC memposting pemutihan.</p>

      {editable && (
        <div className="mb-6">
          <button type="button" onClick={toggleCamera} aria-pressed={cameraOn} className={`flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium ${cameraOn ? 'bg-orange-50 border-orange-300 text-orange-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
            <Camera className="w-4 h-4" />{cameraOn ? 'Matikan kamera' : 'Scan QR'}
          </button>
          {cameraOn && (
            <div className="mt-4">
              <QrCameraScanner onScan={(code) => void handleScan(code)} lockedLabel={lockedName} rejected={scanError !== ''} onFail={(message) => { setScanError(message); setCameraOn(false); }} />
              {scanError && <p role="alert" className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{scanError}</p>}
              {scanned && (
                <div className="mb-4 p-4 max-w-sm bg-white border border-gray-200 rounded-xl shadow-sm text-sm">
                  <p className="font-bold text-gray-900">{scanned.line.itemName}</p>
                  <p className="text-xs font-mono text-gray-500">{scanned.line.itemCode ?? '-'}</p>
                  <label className="mt-3 flex flex-col gap-1 text-gray-500">Jumlah fisik
                    <input {...PHYSICAL_QTY_INPUT} aria-label="Jumlah fisik scan" value={scanned.jumlah} placeholder="0" onChange={(e) => setScanned((value) => value && { ...value, jumlah: decimalOnlyMax(e.target.value, 3) })} className="border border-gray-200 rounded-lg px-3 py-2 text-center text-gray-900" />
                  </label>
                  <button type="button" onClick={masukkanScan} disabled={scanned.jumlah === ''} className="mt-3 w-full px-4 py-2.5 bg-[#ff8a00] text-white rounded-lg font-semibold disabled:opacity-60">Masukkan ke opname</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <ScrollableTable ariaLabel="Tabel isi stok opname">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className={`${STICKY_HEAD_CLASS} bg-gray-50 text-gray-600 font-semibold border-b border-gray-100`}>
              <tr>
                {['No', 'Kode Barang', 'Nama Barang', 'Kategori', 'Satuan', 'Jumlah Fisik', 'Keterangan', 'Aksi'].map((label) => <th key={label} scope="col" className={`px-6 py-3 ${['Jumlah Fisik', 'Aksi'].includes(label) ? 'text-center' : ''}`}>{label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row, index) => (
                <tr key={row.itemId} className="hover:bg-[#FF8A00]/5 transition-colors">
                  <td className="px-6 py-3 text-gray-500">{index + 1}</td>
                  <td className="px-6 py-3 font-mono text-xs text-gray-600">{row.itemCode ?? '-'}</td>
                  <td className="px-6 py-3 font-bold text-gray-900">{row.itemName}</td>
                  <td className="px-6 py-3"><KategoriBadge category={row.category} /></td>
                  <td className="px-6 py-3 text-gray-700">{row.unit}</td>
                  <td className="px-4 py-2 w-32">
                    {readOnly ? <p className="px-2 text-right">{row.jumlah || '-'}</p> : <input {...PHYSICAL_QTY_INPUT} aria-label={`Jumlah fisik ${row.itemName}`} value={row.jumlah} placeholder="0" onChange={(e) => patchRow(row.itemId, { jumlah: decimalOnlyMax(e.target.value, 3) })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-right" />}
                  </td>
                  <td className="px-4 py-2 min-w-44">
                    {readOnly ? <p className="px-2">{row.keterangan || '-'}</p> : <input type="text" aria-label={`Keterangan ${row.itemName}`} maxLength={255} value={row.keterangan} onChange={(e) => patchRow(row.itemId, { keterangan: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" />}
                  </td>
                  <td className="px-6 py-3 text-center">
                    {!readOnly && <button type="button" aria-label={`Hapus isian ${row.itemName}`} onClick={() => patchRow(row.itemId, { jumlah: '', keterangan: '' })} className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"><Trash2 className="w-3.5 h-3.5" />Hapus</button>}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400">Tidak ada barang pada opname ini.</td></tr>}
            </tbody>
          </table>
        </ScrollableTable>
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
      {notice && <p role="status" className="mt-4 text-sm text-green-700">{notice}</p>}

      <div className="flex justify-end gap-3 mt-6">
        {editable && <button type="button" onClick={() => void handleSave()} disabled={saving || submitting || !dirty} className="px-6 py-2.5 border border-orange-300 text-orange-700 rounded-lg font-semibold text-sm disabled:opacity-60">{saving ? 'Menyimpan...' : 'Simpan Sebagian'}</button>}
        {editable && <button type="button" onClick={() => void handleSubmit()} disabled={saving || submitting} className="px-8 py-2.5 bg-[#ff8a00] text-white rounded-lg font-semibold text-sm disabled:opacity-60">{submitting ? 'Mengirim...' : 'Submit'}</button>}
      </div>

      {confirmSubmit && (
        <Modal title="Submit Stok Opname?" onClose={() => { if (!submitting) setConfirmSubmit(false); }} footer={<>
          <button type="button" disabled={submitting} onClick={() => setConfirmSubmit(false)} className="px-4 py-2 rounded-lg border border-gray-200 disabled:opacity-60">Batal</button>
          <button type="button" disabled={submitting} onClick={() => void handleSubmit(true)} className="px-4 py-2 rounded-lg bg-[#ff8a00] text-white disabled:opacity-60">{submitting ? 'Mengirim...' : 'Ya, Submit'}</button>
        </>}>
          <p className="text-sm text-gray-700">Stok sistem belum berubah. Selisih akan diproses setelah PPIC memposting pemutihan.</p>
          <p className="mt-2 text-sm text-gray-500">{filled} dari {total} barang sudah diisi. Pastikan seluruh barang aktif sudah dihitung; barang yang tidak ditemukan harus diisi 0.</p>
          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        </Modal>
      )}
    </div>
  );
}

export default function StockOpnameTambahGudang() {
  return <div className="p-6"><p className="text-sm text-gray-700">Stok opname dibuka oleh PPIC. Pilih periode berstatus <strong>Open</strong> dari daftar untuk mulai mengisi.</p><Link href="/dashboard/gudang/transaksi/stock-opname" className="mt-4 inline-block rounded-lg bg-[#ff8a00] px-4 py-2 text-sm font-semibold text-white">Kembali ke daftar</Link></div>;
}
