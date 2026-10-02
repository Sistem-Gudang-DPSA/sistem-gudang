"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import { formatAngka } from '@/domains/ppic/data/dokubah';
import {
  barisBahanKosong,
  getEstimasi,
  getPenawaranList,
  KATEGORI_BAHAN,
  penawaran_harga_path,
  saveEstimasi,
  type BarisBahan,
  type EstimasiPenawaran,
} from '@/domains/ppic/data/penawaran-harga';

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
  const router = useRouter();
  const penawaran = getPenawaranList().find((item) => String(item.id) === id);
  const [form, setForm] = useState<EstimasiPenawaran>(() => getEstimasi(Number(id)));
  const [formError, setFormError] = useState('');

  const header = (
    <div className="flex items-center gap-3 mb-6">
      <Link href={penawaran_harga_path} aria-label="Kembali ke Estimasi Penawaran Harga" className="text-gray-800 hover:opacity-70 transition-opacity">
        <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
      </Link>
      <h1 className="text-[18px] font-extrabold text-black tracking-wide">Estimasi Penawaran Harga</h1>
    </div>
  );

  if (!penawaran) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        {header}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-10 text-center text-gray-400 italic">
          Penawaran harga tidak ditemukan.
        </div>
      </div>
    );
  }

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

  const handleSimpan = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (form.tglMulaiProduksi && form.tglSelesaiProduksi && form.tglSelesaiProduksi < form.tglMulaiProduksi) {
      setFormError('Tgl Selesai Produksi tidak boleh lebih awal dari Tgl Mulai Produksi.');
      return;
    }
    saveEstimasi(penawaran.id, form);
    router.replace(penawaran_harga_path);
  };

  const cellInput = (kategori: number, baris: number, field: keyof BarisBahan, label: string, type: 'text' | 'number' = 'text') => (
    <input
      type={type}
      min={type === 'number' ? 0 : undefined}
      value={form.bahan[kategori][baris][field]}
      onChange={(e) => updateBaris(kategori, baris, field, e.target.value)}
      aria-label={`${label} ${KATEGORI_BAHAN[kategori]} baris ${baris + 1}`}
      className={`${cellInputClass} ${type === 'number' ? 'text-right' : ''}`}
    />
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {header}

      <form onSubmit={handleSimpan} noValidate className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-sm font-bold text-gray-900 text-center mb-8">Estimasi Penawaran Biaya</h2>

        {/* Info pekerjaan */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-2 max-w-4xl mx-auto items-start">
          <div className="flex flex-col gap-2">
            <Field id="estimasi-tanggal" label="Tanggal">
              <DateInput id="estimasi-tanggal" value={form.tanggal} onChange={setInfo('tanggal')} placeholder="Isi tanggal" />
            </Field>
            <Field id="estimasi-pekerjaan" label="Pekerjaan">
              <input id="estimasi-pekerjaan" type="text" value={form.pekerjaan} onChange={setInfo('pekerjaan')} placeholder="Isi pekerjaan" className={fieldClass} />
            </Field>
            <Field id="estimasi-ruangan" label="Ruangan/Lantai">
              <input id="estimasi-ruangan" type="text" value={form.ruangan} onChange={setInfo('ruangan')} placeholder="Isi ruangan / lantai" className={fieldClass} />
            </Field>
            <Field id="estimasi-ukuran" label="Ukuran">
              <input id="estimasi-ukuran" type="text" value={form.ukuran} onChange={setInfo('ukuran')} placeholder="Isi ukuran" className={fieldClass} />
            </Field>
            <Field id="estimasi-jumlah" label="Jumlah">
              <input id="estimasi-jumlah" type="number" min={0} value={form.jumlah} onChange={setInfo('jumlah')} placeholder="Isi jumlah" className={`${fieldClass} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`} />
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
                      <td className={cellClass}>{cellInput(k, b, 'panjang', 'Panjang', 'number')}</td>
                      <td className={cellClass}>{cellInput(k, b, 'lebar', 'Lebar', 'number')}</td>
                      <td className={cellClass}>{cellInput(k, b, 'tinggi', 'Tinggi', 'number')}</td>
                      <td className={cellClass}>{cellInput(k, b, 'jumlahSatuan', 'Jumlah satuan', 'number')}</td>
                      <td className={cellClass}>{cellInput(k, b, 'jumlahOrder', 'Jumlah order', 'number')}</td>
                      <td className={cellClass}>{cellInput(k, b, 'hargaSatuan', 'Harga satuan', 'number')}</td>
                      <td className={`${cellClass} px-2 text-right text-xs`}>{formatAngka(toNumber(row.jumlahOrder) * toNumber(row.hargaSatuan))}</td>
                      <td className={cellClass}>{cellInput(k, b, 'keterangan', 'Keterangan')}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {formError && (
          <p className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{formError}</p>
        )}

        <div className="flex justify-end mt-10">
          <button type="submit" className={orangeButtonClass}>Simpan</button>
        </div>
      </form>
    </div>
  );
}