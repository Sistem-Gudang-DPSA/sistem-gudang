"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { formatAngka } from '@/domains/ppic/data/dokubah';
import { useApiData } from '@/shared/lib/use-api-data';
import { cancelPurchaseOrder, exportPurchaseOrder, getPurchaseOrder, updatePurchaseOrder } from '@/domains/purchasing/api';
import { INTEGER_INPUT, decimalOnly, digitsOnly } from '@/shared/lib/input';
import { rekap_pembelian_path } from '@/domains/purchasing/data/pembelian';
import type { PurchaseOrder, UpdatePurchaseOrderInput } from '@/domains/purchasing/types';
import { useCan } from '@/domains/auth/user-context';
import { ApiError } from '@/shared/lib/api-client';

// lineIndex null untuk PO lama tanpa mapping; baris bermapping tidak boleh diubah jumlahnya.
type BarisEdit = { lineIndex: number | null; kodeBarang: string; namaBarang: string; satuan: string; jumlah: string; hargaSatuan: string; diskon: string };
type Draft = { tanggalPo: string; picSupplier: string; persenPpn: string; jasa: string; barang: BarisEdit[] };

const cellClass = 'px-3 py-2 border-b border-r border-gray-300';
const infoLabelClass = `${cellClass} w-40 text-xs text-gray-800 align-top`;
const infoValueClass = `${cellClass} text-xs text-gray-800 whitespace-normal`;
const fieldClass = 'w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors';
const cellInputClass = 'w-full min-w-24 px-2 py-1 bg-white border border-gray-300 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors';
const totalLabelClass = 'text-xs font-bold text-gray-900 uppercase';
const orangeButtonClass = 'min-w-24 px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm text-center';
const outlineButtonClass = 'px-6 py-2.5 border border-gray-300 bg-white text-gray-800 font-semibold rounded-xl hover:bg-gray-50 transition-all text-sm disabled:opacity-60';
const dividerClass = 'border-t border-gray-400 my-6';

// Input kosong atau bukan angka dihitung 0
const toNumber = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const tanggalIndo = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

// Sama dengan perhitungan BE; hanya dipakai untuk pratinjau saat edit
const hitungTotal = (barang: { jumlah: number; hargaSatuan: number; diskon: number }[], persenPpn: number, jasa: number) => {
  const subtotal = barang.reduce((sum, b) => sum + b.jumlah * b.hargaSatuan - b.diskon, 0);
  const dppLain = Math.round((subtotal * 11) / 12);
  const nilaiPpn = Math.round((dppLain * persenPpn) / 100);
  return { subtotal, dppLain, nilaiPpn, grandTotal: subtotal + nilaiPpn + jasa };
};

const teks = (value: string, max: number) => value.trim().length >= 1 && value.trim().length <= max;

// Pesan kosong berarti valid; aturan mengikuti validasi BE
const validasi = (d: Draft): string => {
  if (d.tanggalPo === '') return 'Tanggal PO wajib diisi.';
  if (!teks(d.picSupplier, 191)) return 'PIC supplier wajib diisi (maksimal 191 karakter).';
  const ppn = toNumber(d.persenPpn);
  if (ppn < 0 || ppn > 100) return 'PPN harus antara 0 sampai 100.';
  for (const b of d.barang) {
    if (!teks(b.kodeBarang, 191) || !teks(b.namaBarang, 191)) return 'Kode dan nama barang wajib diisi (maksimal 191 karakter).';
    if (!teks(b.satuan, 50)) return 'Satuan wajib diisi (maksimal 50 karakter).';
    if (toNumber(b.jumlah) <= 0) return 'Jumlah setiap barang wajib diisi lebih dari 0.';
    if (toNumber(b.diskon) > toNumber(b.jumlah) * toNumber(b.hargaSatuan)) return 'Diskon tidak boleh melebihi harga barang.';
  }
  return '';
};

const toDraft = (po: PurchaseOrder): Draft => ({
  tanggalPo: po.tanggalPo.slice(0, 10),
  picSupplier: po.picSupplier,
  persenPpn: String(po.persenPpn),
  jasa: String(po.jasa),
  barang: po.barang.map((b) => ({
    lineIndex: b.lineIndex ?? null,
    kodeBarang: b.kodeBarang,
    namaBarang: b.namaBarang,
    satuan: b.satuan,
    jumlah: String(b.jumlah),
    hargaSatuan: String(b.hargaSatuan),
    diskon: String(b.diskon),
  })),
});

const toInput = (d: Draft): UpdatePurchaseOrderInput => ({
  tanggalPo: d.tanggalPo,
  picSupplier: d.picSupplier.trim(),
  barang: d.barang.map((b) => ({
    kodeBarang: b.kodeBarang.trim(),
    namaBarang: b.namaBarang.trim(),
    satuan: b.satuan.trim(),
    jumlah: toNumber(b.jumlah),
    hargaSatuan: toNumber(b.hargaSatuan),
    diskon: toNumber(b.diskon),
    ...(b.lineIndex != null ? { lineIndex: b.lineIndex } : {}),
  })),
  persenPpn: toNumber(d.persenPpn),
  jasa: toNumber(d.jasa),
});

export default function DetailPO() {
  const { id } = useParams<{ id: string }>();
  const canView = useCan('purchase-order.view');
  const canUpdate = useCan('purchase-order.update');
  const canCancel = useCan('purchase-order.cancel');
  const { data, loading, error } = useApiData(() => getPurchaseOrder(id), id, 'Gagal memuat purchase order.');
  // Respons edit/batal menggantikan data hasil fetch
  const [hasil, setHasil] = useState<PurchaseOrder | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [membatalkan, setMembatalkan] = useState(false);
  const [alasan, setAlasan] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const header = (
    <div className="flex items-center gap-3 mb-6">
      <Link href={rekap_pembelian_path} aria-label="Kembali" className="text-gray-800 hover:opacity-70 transition-opacity">
        <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
      </Link>
      <h1 className="text-[18px] font-extrabold text-black tracking-wide">Detail Purchase Order</h1>
    </div>
  );

  if (!canView) {
    return <div className="py-10 text-center text-sm text-gray-500">Anda tidak memiliki izin untuk melihat purchase order.</div>;
  }

  const po = hasil && String(hasil.id) === id ? hasil : data;
  if (loading || error || !po) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        {header}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-10 text-center text-gray-400 italic">
          {error || (loading ? 'Memuat data...' : 'Purchase order tidak ditemukan.')}
        </div>
      </div>
    );
  }

  const isIssued = po.status === 'ISSUED';
  const sibuk = !draft && !membatalkan;

  const ubah = (patch: Partial<Draft>) => setDraft((prev) => prev && { ...prev, ...patch });
  const ubahBaris = (index: number, field: keyof BarisEdit, value: string) =>
    setDraft((prev) => prev && { ...prev, barang: prev.barang.map((b, i) => (i === index ? { ...b, [field]: value } : b)) });

  const ringkasan = draft
    ? hitungTotal(draft.barang.map((b) => ({ jumlah: toNumber(b.jumlah), hargaSatuan: toNumber(b.hargaSatuan), diskon: toNumber(b.diskon) })), toNumber(draft.persenPpn), toNumber(draft.jasa))
    : { subtotal: po.subtotal, dppLain: po.dppLain, nilaiPpn: po.nilaiPpn, grandTotal: po.grandTotal };

  const handleExport = async () => {
    setFormError('');
    try {
      await exportPurchaseOrder(po.id);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Gagal mengekspor PO.');
    }
  };

  const handleSimpan = async () => {
    if (!draft) return;
    const pesan = validasi(draft);
    if (pesan) {
      setFormError(pesan);
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      setHasil(await updatePurchaseOrder(po.id, toInput(draft)));
      setDraft(null);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Gagal menyimpan PO.');
    } finally {
      setSaving(false);
    }
  };

  const handleBatalkan = async () => {
    setSaving(true);
    setFormError('');
    try {
      setHasil(await cancelPurchaseOrder(po.id, alasan.trim()));
      setMembatalkan(false);
      setAlasan('');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Gagal membatalkan PO.');
    } finally {
      setSaving(false);
    }
  };

  const tutupBatal = () => {
    setMembatalkan(false);
    setAlasan('');
    setFormError('');
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {header}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-gray-900">{po.nomorPo}</h2>
            <span className={`inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-semibold ${isIssued ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {isIssued ? 'Terbit' : 'Dibatalkan'}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            {draft ? (
              <>
                <button type="button" onClick={() => { setDraft(null); setFormError(''); }} disabled={saving} className={outlineButtonClass}>Batal Edit</button>
                <button type="button" onClick={handleSimpan} disabled={saving} className={`${orangeButtonClass} disabled:opacity-60`}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
              </>
            ) : (
              <>
                <button type="button" onClick={handleExport} className={outlineButtonClass}>Ekspor Excel</button>
                {canUpdate && isIssued && sibuk && (
                  <button type="button" onClick={() => { setDraft(toDraft(po)); setFormError(''); }} className={orangeButtonClass}>Edit</button>
                )}
                {canCancel && isIssued && sibuk && (
                  <button type="button" onClick={() => { setMembatalkan(true); setFormError(''); }} className={outlineButtonClass}>Batalkan PO</button>
                )}
              </>
            )}
          </div>
        </div>

        {formError && <p className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{formError}</p>}

        {/* Info PO & supplier */}
        <div className="border-t border-l border-gray-300 rounded-sm max-w-2xl">
          <table className="w-full text-left border-collapse">
            <tbody>
              <tr>
                <td className={infoLabelClass}>Tanggal PO</td>
                <td className={infoValueClass}>
                  {draft ? (
                    <input type="date" aria-label="Tanggal PO" value={draft.tanggalPo} onChange={(e) => ubah({ tanggalPo: e.target.value })} className={cellInputClass} />
                  ) : (
                    tanggalIndo(po.tanggalPo)
                  )}
                </td>
              </tr>
              <tr>
                <td className={infoLabelClass}>Nama Supplier</td>
                <td className={infoValueClass}>{po.supplierName}</td>
              </tr>
              <tr>
                <td className={infoLabelClass}>PIC / Telp</td>
                <td className={infoValueClass}>
                  {draft ? (
                    <input type="text" maxLength={191} aria-label="PIC supplier" value={draft.picSupplier} onChange={(e) => ubah({ picSupplier: e.target.value })} className={cellInputClass} />
                  ) : (
                    po.picSupplier
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <hr className={dividerClass} />

        {/* Daftar barang */}
        <h3 className="text-xs font-bold text-gray-900 mb-3">Daftar / Spesifikasi Barang :</h3>
        <div className="overflow-x-auto border-t border-l border-gray-300 rounded-sm">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="bg-gray-100 text-gray-900 font-bold text-xs">
              <tr>
                <th scope="col" className={`${cellClass} w-12 text-center`}>No.</th>
                <th scope="col" className={`${cellClass} text-center`}>Kode Barang</th>
                <th scope="col" className={`${cellClass} text-center`}>Nama Item / Barang</th>
                <th scope="col" className={`${cellClass} text-center`}>Satuan</th>
                <th scope="col" className={`${cellClass} text-center`}>Jumlah</th>
                <th scope="col" className={`${cellClass} text-center`}>Harga / Sat (Rp)</th>
                <th scope="col" className={`${cellClass} text-center`}>Diskon (Rp)</th>
                <th scope="col" className={`${cellClass} text-center uppercase`}>Total (Rp)</th>
              </tr>
            </thead>
            <tbody className="text-gray-800">
              {(draft ? draft.barang.map((b) => ({ ...b, jumlah: toNumber(b.jumlah), hargaSatuan: toNumber(b.hargaSatuan), diskon: toNumber(b.diskon) })) : po.barang).map((b, index) => {
                const total = b.jumlah * b.hargaSatuan - b.diskon;
                const edit = (field: Exclude<keyof BarisEdit, 'lineIndex'>, label: string, numeric = false) => (
                  <input
                    {...(numeric ? INTEGER_INPUT : { type: 'text' })}
                    maxLength={field === 'satuan' ? 50 : numeric ? 9 : 191}
                    value={draft ? draft.barang[index][field] : ''}
                    onChange={(e) => ubahBaris(index, field, numeric ? digitsOnly(e.target.value) : e.target.value)}
                    aria-label={`${label} ${b.namaBarang}`}
                    className={`${cellInputClass} ${numeric ? 'text-right' : ''}`}
                  />
                );
                return (
                  <tr key={`${b.kodeBarang}-${index}`}>
                    <td className={`${cellClass} text-center`}>{index + 1}.</td>
                    <td className={cellClass}>{draft ? edit('kodeBarang', 'Kode barang') : b.kodeBarang}</td>
                    <td className={cellClass}>{draft ? edit('namaBarang', 'Nama barang') : b.namaBarang}</td>
                    <td className={`${cellClass} text-center`}>{draft ? edit('satuan', 'Satuan') : b.satuan}</td>
                    <td className={`${cellClass} text-center`}>{draft && b.lineIndex == null ? edit('jumlah', 'Jumlah', true) : formatAngka(b.jumlah)}</td>
                    <td className={`${cellClass} text-right`}>{draft ? edit('hargaSatuan', 'Harga satuan', true) : formatAngka(b.hargaSatuan)}</td>
                    <td className={`${cellClass} text-right`}>{draft ? edit('diskon', 'Diskon', true) : formatAngka(b.diskon)}</td>
                    <td className={`${cellClass} text-right font-semibold`}>{formatAngka(total)}</td>
                  </tr>
                );
              })}
              {po.barang.length === 0 && (
                <tr>
                  <td colSpan={8} className={`${cellClass} px-6 py-10 text-center text-gray-400 italic`}>Tidak ada barang.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div className="flex flex-col items-end gap-2 mt-6 text-sm text-gray-800">
          <div className="flex justify-between gap-6 w-full max-w-md">
            <span className={totalLabelClass}>Total Harga Setelah Diskon</span>
            <span>{formatAngka(ringkasan.subtotal)}</span>
          </div>
          <div className="flex justify-between gap-6 w-full max-w-md">
            <span className={totalLabelClass}>DPP Lain</span>
            <span>{formatAngka(ringkasan.dppLain)}</span>
          </div>
          <div className="flex justify-between items-center gap-6 w-full max-w-md">
            <span className={totalLabelClass}>PPN (%)</span>
            {draft ? (
              <input
                type="text"
                inputMode="decimal"
                maxLength={6}
                aria-label="PPN (persen)"
                value={draft.persenPpn}
                onChange={(e) => ubah({ persenPpn: decimalOnly(e.target.value) })}
                className={`${fieldClass} w-24 text-right`}
              />
            ) : (
              <span>{po.persenPpn}%</span>
            )}
          </div>
          <div className="flex justify-between gap-6 w-full max-w-md">
            <span className={totalLabelClass}>Nilai PPN</span>
            <span>{formatAngka(ringkasan.nilaiPpn)}</span>
          </div>
          <div className="flex justify-between items-center gap-6 w-full max-w-md">
            <span className={totalLabelClass}>Jasa</span>
            {draft ? (
              <input
                {...INTEGER_INPUT}
                maxLength={9}
                aria-label="Jasa"
                value={draft.jasa}
                onChange={(e) => ubah({ jasa: digitsOnly(e.target.value) })}
                className={`${fieldClass} w-40 text-right`}
              />
            ) : (
              <span>{formatAngka(po.jasa)}</span>
            )}
          </div>
          <div className="flex justify-between gap-6 w-full max-w-md border-t border-gray-400 pt-2 text-base">
            <span className={totalLabelClass}>Grand Total</span>
            <span className="font-bold">{formatAngka(ringkasan.grandTotal)}</span>
          </div>
        </div>

        {!isIssued && (
          <div className="mt-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
            Dibatalkan {po.cancelledAt ? tanggalIndo(po.cancelledAt) : ''}. Alasan: {po.cancelReason || '-'}
          </div>
        )}

        {membatalkan && (
          <div className="mt-6 border-t border-gray-400 pt-4">
            <label htmlFor="po-alasan-batal" className="text-sm font-medium text-gray-800">Alasan pembatalan</label>
            <textarea
              id="po-alasan-batal"
              rows={3}
              maxLength={255}
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              className={`${fieldClass} mt-2`}
            />
            <div className="flex justify-end gap-3 mt-3">
              <button type="button" onClick={tutupBatal} disabled={saving} className={outlineButtonClass}>Tutup</button>
              <button
                type="button"
                onClick={handleBatalkan}
                disabled={saving || alasan.trim() === ''}
                className="px-6 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all text-sm disabled:opacity-60"
              >
                {saving ? 'Membatalkan...' : 'Ya, Batalkan PO'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
