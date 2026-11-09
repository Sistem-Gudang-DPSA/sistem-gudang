"use client";

import React, { useState } from 'react';
import { useCan } from '@/domains/auth/user-context';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import { formatAngka } from '@/domains/ppic/data/dokubah';
import { getPenawaran, publishPenawaran, updatePenawaran } from '@/domains/ppic/api';
import {
  barisBahanKosong,
  detailKeForm,
  formKePayload,
  KATEGORI_BAHAN,
  penawaranBasePath,
  STATUS_UI,
  type BarisBahan,
  type EstimasiPenawaran,
} from '@/domains/ppic/data/penawaran-harga';
import type { PenawaranDetail } from '@/domains/ppic/types';
import { ApiError } from '@/shared/lib/api-client';
import { INTEGER_INPUT, decimalOnly, digitsOnly } from '@/shared/lib/input';
import { useApiData } from '@/shared/lib/use-api-data';

type FieldInfo = Exclude<keyof EstimasiPenawaran, 'bahan'>;

// Sel tabel dibuat ramping supaya seperti kotak-kotak kosong di desain
const cellClass = 'px-1 py-0.5 border-b border-r border-gray-300';
const catCellClass = 'px-2 py-1.5 border-b border-r border-gray-300';
const headCellClass = 'px-2 py-2 border-b border-r border-gray-300 text-center align-middle';
const fieldClass = 'w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors';
// Input di dalam tabel tanpa border, supaya sel terlihat polos seperti desain
const cellInputClass = 'w-full px-2 py-1 bg-transparent border-0 rounded text-xs text-gray-800 focus:outline-none focus:bg-orange-50/40 focus:ring-1 focus:ring-orange-500/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';
const orangeButtonClass = 'min-w-24 px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm text-center';

// Input kosong atau bukan angka dihitung 0
const toNumber = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

function Field({ id, label, labelClass = 'w-28 text-left', children }: { id: string; label: string; labelClass?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className={`${labelClass} shrink-0 text-xs font-medium text-gray-800`}>{label} :</label>
      <div className="w-48">{children}</div>
    </div>
  );
}

// Tampil sebagai teks berisi placeholder ("Isi tanggal"), berubah jadi pemilih tanggal saat diklik
function DateInput({ id, value, onChange, placeholder, min }: {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  min?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      id={id}
      type={focused || value ? 'date' : 'text'}
      value={value}
      min={min}
      placeholder={placeholder}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={fieldClass}
    />
  );
}

export default function EstimasiPenawaranBiayaPPIC() {
  const { id } = useParams<{ id: string }>();
  const { data: detail, loading, error } = useApiData(() => getPenawaran(id), id, 'Gagal memuat penawaran harga.');

  if (loading || error || !detail) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        <PageHeader />
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-10 text-center italic ${error ? 'text-red-600' : 'text-gray-400'}`}>
          {error || (loading ? 'Memuat data...' : 'Penawaran harga tidak ditemukan.')}
        </div>
      </div>
    );
  }

  // The form is built once the detail is loaded, so its initial state comes from the saved data.
  return <FormEstimasi detail={detail} />;
}

function PageHeader() {
  return (
    <div className="flex items-center gap-3 mb-6">
      <Link href={penawaranBasePath(usePathname())} aria-label="Kembali ke Estimasi Penawaran Harga" className="text-gray-800 hover:opacity-70 transition-opacity">
        <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
      </Link>
      <h1 className="text-[18px] font-extrabold text-black tracking-wide">Estimasi Penawaran Harga</h1>
    </div>
  );
}

const hitungTotal = (row: BarisBahan) => Math.round(toNumber(row.jumlahOrder) * toNumber(row.hargaSatuan));

function FormEstimasi({ detail }: { detail: PenawaranDetail }) {
  const [saved, setSaved] = useState(detail);
  const [form, setForm] = useState<EstimasiPenawaran>(() => detailKeForm(detail));
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const canUpdate = useCan('penawaran-harga.update');
  // Publish saves first (PUT), so it needs the update permission as well
  const canPublish = useCan('penawaran-harga.publish') && canUpdate;
  const published = saved.status === 'PUBLISH';
  const locked = published || !canUpdate;

  const subtotal = (rows: BarisBahan[]) => rows.reduce((sum, row) => sum + hitungTotal(row), 0);
  const grandTotal = form.bahan.reduce((sum, rows) => sum + subtotal(rows), 0);

  const setInfo = (field: FieldInfo) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const updateBaris = (kategori: number, baris: number, field: keyof BarisBahan, value: string) => {
    setForm((prev) => ({
      ...prev,
      bahan: prev.bahan.map((rows, k) => (k === kategori ? rows.map((row, b) => (b === baris ? { ...row, [field]: value } : row)) : rows)),
    }));
  };

  const tambahBaris = (kategori: number) => {
    setForm((prev) => ({
      ...prev,
      bahan: prev.bahan.map((rows, k) => (k === kategori ? [...rows, barisBahanKosong()] : rows)),
    }));
  };

  // Validates and saves; returns the saved detail, or null when something is wrong.
  const simpan = async () => {
    if (form.namaClient.trim() === '' || form.namaProyek.trim() === '') {
      setFormError('Nama client dan nama projek wajib diisi.');
      return null;
    }
    if (form.tglMulaiProduksi && form.tglSelesaiProduksi && form.tglSelesaiProduksi < form.tglMulaiProduksi) {
      setFormError('Tgl Selesai Produksi tidak boleh lebih awal dari Tgl Mulai Produksi.');
      return null;
    }
    if (form.bahan.some((rows) => rows.some((b) => Object.values(b).some((v) => v.trim() !== '') && b.namaBahan.trim() === ''))) {
      setFormError('Nama bahan wajib diisi untuk setiap baris yang dipakai.');
      return null;
    }
    const result = await updatePenawaran(saved.id, formKePayload(form));
    setSaved(result);
    return result;
  };

  const jalankan = async (aksi: () => Promise<boolean | void>, pesan: string) => {
    setBusy(true);
    setFormError('');
    setNotice('');
    try {
      if ((await aksi()) === false) return;
      setNotice(pesan);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Gagal memproses penawaran harga.');
    } finally {
      setBusy(false);
    }
  };

  const handleSimpan = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    // simpan() returns null when validation fails; `false` tells jalankan to skip the success notice.
    void jalankan(async () => (await simpan()) !== null, 'Penawaran harga tersimpan.');
  };

  const handlePublish = () => {
    if (!window.confirm('Publish akan mengunci penawaran ini dan tidak bisa diubah lagi. Lanjutkan?')) return;
    void jalankan(async () => {
      if (!(await simpan())) return false;
      setSaved(await publishPenawaran(saved.id));
    }, 'Penawaran harga dipublish dan dikunci.');
  };

  type Jenis = 'teks' | 'desimal' | 'bulat';
  const cellInput = (kategori: number, baris: number, field: keyof BarisBahan, label: string, jenis: Jenis = 'teks') => {
    const batas = { namaBahan: 191, satuan: 50, keterangan: 500 }[field as 'namaBahan' | 'satuan' | 'keterangan'];
    return (
      <input
        {...(jenis === 'bulat' ? INTEGER_INPUT : jenis === 'desimal' ? { type: 'text', inputMode: 'decimal', autoComplete: 'off' } : { type: 'text' })}
        maxLength={jenis === 'bulat' ? 9 : jenis === 'desimal' ? 13 : batas}
        value={form.bahan[kategori][baris][field]}
        onChange={(e) => updateBaris(kategori, baris, field, jenis === 'bulat' ? digitsOnly(e.target.value) : jenis === 'desimal' ? decimalOnly(e.target.value) : e.target.value)}
        aria-label={`${label} ${KATEGORI_BAHAN[kategori]} baris ${baris + 1}`}
        className={`${cellInputClass} ${jenis === 'teks' ? '' : 'text-right'}`}
      />
    );
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <PageHeader />

      <form onSubmit={handleSimpan} noValidate className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-sm font-bold text-gray-900 text-center mb-2">Estimasi Penawaran Biaya</h2>
        <p className="text-xs text-gray-600 text-center mb-8">
          No Order {saved.noOrder} · <span className="font-semibold">{STATUS_UI[saved.status]}</span>
          {published && ' · sudah dipublish, tidak bisa diubah'}
          {!published && !canUpdate && ' · Anda tidak punya izin untuk mengubah penawaran ini'}
        </p>

        <fieldset disabled={locked || busy} className="contents">

        {/* Info pekerjaan */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-2 max-w-4xl mx-auto items-start">
          <div className="flex flex-col gap-2">
            <Field id="estimasi-client" label="Nama Client">
              <input id="estimasi-client" type="text" maxLength={191} value={form.namaClient} onChange={setInfo('namaClient')} placeholder="Isi nama client" className={fieldClass} />
            </Field>
            <Field id="estimasi-proyek" label="Nama Projek">
              <input id="estimasi-proyek" type="text" maxLength={191} value={form.namaProyek} onChange={setInfo('namaProyek')} placeholder="Isi nama projek" className={fieldClass} />
            </Field>
            <Field id="estimasi-tanggal" label="Tanggal">
              <DateInput id="estimasi-tanggal" value={form.tanggal} onChange={setInfo('tanggal')} placeholder="Isi tanggal" />
            </Field>
            <Field id="estimasi-pekerjaan" label="Pekerjaan">
              <input id="estimasi-pekerjaan" type="text" maxLength={191} value={form.pekerjaan} onChange={setInfo('pekerjaan')} placeholder="Isi pekerjaan" className={fieldClass} />
            </Field>
            <Field id="estimasi-ruangan" label="Ruangan/Lantai">
              <input id="estimasi-ruangan" type="text" maxLength={191} value={form.ruangan} onChange={setInfo('ruangan')} placeholder="Isi ruangan / lantai" className={fieldClass} />
            </Field>
            <Field id="estimasi-ukuran" label="Ukuran">
              <input id="estimasi-ukuran" type="text" maxLength={191} value={form.ukuran} onChange={setInfo('ukuran')} placeholder="Isi ukuran" className={fieldClass} />
            </Field>
            <Field id="estimasi-jumlah" label="Jumlah">
              <input id="estimasi-jumlah" {...INTEGER_INPUT} maxLength={9} value={form.jumlah} onChange={(e) => setForm((prev) => ({ ...prev, jumlah: digitsOnly(e.target.value) }))} placeholder="Isi jumlah" className={`${fieldClass} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`} />
            </Field>
          </div>
          <div className="flex flex-col gap-2">
            <Field id="estimasi-mulai" label="Tgl Mulai Produksi" labelClass="w-36 text-right">
              <DateInput id="estimasi-mulai" value={form.tglMulaiProduksi} onChange={setInfo('tglMulaiProduksi')} placeholder="Isi tanggal mulai produksi" />
            </Field>
            <Field id="estimasi-selesai" label="Tgl Selesai Produksi" labelClass="w-36 text-right">
              <DateInput id="estimasi-selesai" value={form.tglSelesaiProduksi} min={form.tglMulaiProduksi || undefined} onChange={setInfo('tglSelesaiProduksi')} placeholder="Isi tanggal selesai produksi" />
            </Field>
          </div>
        </div>

        <hr className="border-t border-gray-400 my-6" />

        {/* Tabel bahan per kategori */}
        <div className="overflow-x-auto border-t border-l border-gray-300 rounded-sm">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="text-gray-900 font-bold text-xs">
              <tr>
                <th scope="col" rowSpan={2} className={`${headCellClass} w-12`}>No</th>
                <th scope="col" rowSpan={2} className={`${headCellClass} min-w-48`}>Nama Bahan</th>
                <th scope="col" rowSpan={2} className={`${headCellClass} min-w-24`}>Satuan</th>
                <th scope="colgroup" colSpan={3} className={headCellClass}>Dimension</th>
                <th scope="col" rowSpan={2} className={`${headCellClass} min-w-24`}>Jumlah<br />Satuan</th>
                <th scope="col" rowSpan={2} className={`${headCellClass} min-w-24`}>Jumlah<br />Order</th>
                <th scope="col" rowSpan={2} className={`${headCellClass} min-w-32`}>Harga<br />Satuan</th>
                <th scope="col" rowSpan={2} className={`${headCellClass} min-w-32`}>Harga<br />Total</th>
                <th scope="col" rowSpan={2} className={`${headCellClass} min-w-40`}>Keterangan</th>
              </tr>
              <tr>
                <th scope="col" className={`${headCellClass} min-w-16`}>P</th>
                <th scope="col" className={`${headCellClass} min-w-16`}>L</th>
                <th scope="col" className={`${headCellClass} min-w-16`}>T</th>
              </tr>
            </thead>
            <tbody className="text-gray-800">
              {KATEGORI_BAHAN.map((kategori, k) => (
                <React.Fragment key={kategori}>
                  {/* Baris judul kategori: nomor + nama kategori, sisanya sel kosong */}
                  <tr>
                    <td className={`${catCellClass} text-center text-[10px] font-bold text-gray-900`}>{k + 1}.</td>
                    <td className={`${catCellClass} text-[10px] font-bold text-gray-900 uppercase`}>{kategori}</td>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <td key={i} className={catCellClass} />
                    ))}
                    <td className={`${catCellClass} text-right`}>
                      <button
                        type="button"
                        onClick={() => tambahBaris(k)}
                        aria-label={`Tambah baris ${kategori}`}
                        title="Tambah baris"
                        className="inline-flex items-center justify-center w-5 h-5 text-[#FF8A00] hover:bg-orange-50 rounded transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                  {form.bahan[k].map((row, b) => (
                    <tr key={b}>
                      <td className={cellClass} />
                      <td className={cellClass}>{cellInput(k, b, 'namaBahan', 'Nama bahan')}</td>
                      <td className={cellClass}>{cellInput(k, b, 'satuan', 'Satuan')}</td>
                      <td className={cellClass}>{cellInput(k, b, 'panjang', 'Panjang', 'desimal')}</td>
                      <td className={cellClass}>{cellInput(k, b, 'lebar', 'Lebar', 'desimal')}</td>
                      <td className={cellClass}>{cellInput(k, b, 'tinggi', 'Tinggi', 'desimal')}</td>
                      <td className={cellClass}>{cellInput(k, b, 'jumlahSatuan', 'Jumlah satuan', 'desimal')}</td>
                      <td className={cellClass}>{cellInput(k, b, 'jumlahOrder', 'Jumlah order', 'desimal')}</td>
                      <td className={cellClass}>{cellInput(k, b, 'hargaSatuan', 'Harga satuan', 'bulat')}</td>
                      <td className={`${cellClass} px-2 text-right text-xs`}>{formatAngka(hitungTotal(row))}</td>
                      <td className={cellClass}>{cellInput(k, b, 'keterangan', 'Keterangan')}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={9} className={`${cellClass} px-2 text-right text-[10px] font-bold text-gray-900 uppercase`}>Subtotal {kategori}</td>
                    <td className={`${cellClass} px-2 text-right text-xs font-semibold`}>{formatAngka(subtotal(form.bahan[k]))}</td>
                    <td className={cellClass} />
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        </fieldset>

        <p className="mt-4 text-right text-sm font-bold text-gray-900">Grand Total: Rp. {formatAngka(grandTotal)}</p>

        {formError && (
          <p role="alert" className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{formError}</p>
        )}
        {notice && <p role="status" className="mt-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg">{notice}</p>}

        <div className="flex justify-end gap-4 mt-10">
          {!locked && (
            <>
              {canPublish && <button type="button" onClick={handlePublish} disabled={busy} className={`${orangeButtonClass} disabled:opacity-60`}>Publish</button>}
              <button type="submit" disabled={busy} className={`${orangeButtonClass} disabled:opacity-60`}>{busy ? 'Menyimpan...' : 'Simpan'}</button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}