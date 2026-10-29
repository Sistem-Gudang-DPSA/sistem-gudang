"use client";

import React, { useState } from 'react';
import { useCan } from '@/domains/auth/user-context';
import NoPermission from './NoPermission';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import {
  dokubah_path,
  formatAngka,
  viewDokubahPath,
  type BahanDokubah,
  type DokubahItem,
} from '@/domains/ppic/data/dokubah';
import { getDokubah, replaceDokubahMaterials } from '@/domains/ppic/api';
import { ApiError } from '@/shared/lib/api-client';
import { useApiData } from '@/shared/lib/use-api-data';
import { INTEGER_INPUT, digitsOnly } from '@/shared/lib/input';

// Struktur data terpadu agar baris bawaan API dan baris baru dikelola dalam satu state tunggal
type BahanDraftRow = {
  id: string; // ID unik internal untuk kestabilan key rendering
  isNew: boolean; // Penanda baris baru (agar bisa input kodeBarang & namaBahan)
  kodeBarang: string;
  namaBahan: string;
  satuan: string;
  kuota: string;
  hargaSatuan: string;
  keterangan: string;
};

const toDraftRow = (b: BahanDokubah): BahanDraftRow => ({
  id: `existing-${b.kodeBarang}`,
  isNew: false,
  kodeBarang: b.kodeBarang,
  namaBahan: b.namaBahan,
  satuan: b.satuan,
  kuota: String(b.kuota),
  hargaSatuan: String(b.hargaSatuan),
  keterangan: b.keterangan || '',
});

const createEmptyRow = (): BahanDraftRow => ({
  id: `new-row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  isNew: true,
  kodeBarang: '',
  namaBahan: '',
  satuan: '',
  kuota: '',
  hargaSatuan: '0',
  keterangan: '',
});

const isAngkaValid = (value: string) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
const isRowKosong = (row: BahanDraftRow) => 
  row.kodeBarang.trim() === '' && row.namaBahan.trim() === '' && row.kuota.trim() === '' && row.satuan.trim() === '';

const cellClass = 'px-4 py-3 border-b border-r border-gray-200';
const inputCellClass = 'p-0 border-b border-r border-gray-200';
const cellInputClass = 'w-full px-4 py-3 bg-transparent text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500/50';
const readOnlyFieldClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-gray-50 cursor-default focus:outline-none';
const orangeButtonClass = 'px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm text-center disabled:opacity-50 cursor-pointer';

export default function EditMaterialPPIC() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error } = useApiData(() => getDokubah(Number(id)), id, 'Gagal memuat Dokubah.');
  return <EditMaterialForm key={data?.id ?? 'loading'} dokubah={data} message={loading ? 'Memuat data...' : error || 'Dokubah tidak ditemukan.'} />;
}
function EditMaterialForm({ dokubah, message }: { dokubah?: DokubahItem; message: string }) {
  const router = useRouter();
  const canUpdate = useCan('dokubah.update');
  const [draft, setDraft] = useState<BahanDraftRow[]>(() => dokubah?.bahan.map(toDraftRow) ?? []);
  const [, setShowError] = useState(false);
  const [saveError, setSaveError] = useState('');

  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const backHref = dokubah ? (from === 'edit-dokubah' ? viewDokubahPath(dokubah.id) : dokubah_path) : dokubah_path;

  // Fungsi manajemen baris dinamis
  const tambahBaris = () => setDraft((prev) => [...prev, createEmptyRow()]);
  const hapusBaris = (id: string) => setDraft((prev) => prev.filter((b) => b.id !== id));

  const handleRowChange = (id: string, field: keyof Omit<BahanDraftRow, 'id' | 'isNew'>, value: string) => {
    setDraft((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const header = (
    <div className="flex items-center gap-3 mb-6">
      <Link href={backHref} replace aria-label="Kembali" className="text-gray-800 hover:opacity-70 transition-opacity">
        <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
      </Link>
      <h1 className="text-[18px] font-extrabold text-black tracking-wide">Edit Material</h1>
    </div>
  );

  if (!canUpdate) return <NoPermission action="mengubah material Dokubah" />;

  if (!dokubah) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        {header}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-10 text-center text-gray-400 italic">
          {message}
        </div>
      </div>
    );
  }

  // Filter baris kosong agar tidak ikut memicu validasi error
  const activeRows = draft.filter((b) => !b.isNew || !isRowKosong(b));
  const hasInvalid = activeRows.some((b) => !isAngkaValid(b.kuota) || !isAngkaValid(b.hargaSatuan) || !b.kodeBarang.trim() || !b.namaBahan.trim());

  const handleSimpan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    if (hasInvalid) {
      setShowError(true);
      return;
    }
    if (activeRows.length === 0) {
      setSaveError('Dokubah harus punya minimal satu bahan.');
      return;
    }

    // Cek duplikasi kode barang
    const kodeList = activeRows.map((b) => b.kodeBarang.trim().toLowerCase());
    if (new Set(kodeList).size !== kodeList.length) {
      setSaveError('Kode Barang tidak boleh ada yang sama di dalam satu Dokubah.');
      return;
    }

    setSaveError('');
    try {
      await replaceDokubahMaterials(
        dokubah.id,
        activeRows.map((b) => ({
          kodeBarang: b.kodeBarang.trim(),
          namaBahan: b.namaBahan.trim(),
          satuan: b.satuan.trim() || 'Pcs',
          kuota: Number(b.kuota),
          hargaSatuan: Number(b.hargaSatuan),
          keterangan: b.keterangan.trim(),
        })),
      );
      router.replace(viewDokubahPath(dokubah.id));
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Gagal menyimpan material.');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {header}

      <form onSubmit={handleSimpan} noValidate className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Info SPK */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-3 max-w-4xl mb-10">
          <div className="flex items-center gap-2">
            <label htmlFor="edit-material-spk" className="w-28 shrink-0 text-sm font-medium text-gray-800">Nomor SPK :</label>
            <input id="edit-material-spk" type="text" readOnly value={dokubah.noSpk} className={readOnlyFieldClass} />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="edit-material-client" className="w-28 shrink-0 text-sm font-medium text-gray-800">Nama Client :</label>
            <input id="edit-material-client" type="text" readOnly value={dokubah.client} className={readOnlyFieldClass} />
          </div>
        </div>

        {/* Tabel material */}
        <div className="overflow-x-auto border-t border-l border-gray-200">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="bg-gray-100 text-gray-700 font-semibold">
              <tr>
                <th scope="col" className={`${cellClass} w-14 text-center`}>No.</th>
                <th scope="col" className={cellClass}>Kode Barang</th>
                <th scope="col" className={cellClass}>Nama &amp; Spesifikasi Bahan</th>
                <th scope="col" className={cellClass}>Kuota Alokasi (Dokubah)</th>
                <th scope="col" className={cellClass}>Realisasi Pengambilan</th>
                <th scope="col" className={cellClass}>Sisa Jatah Kuota</th>
                <th scope="col" className={cellClass}><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              {draft.map((row, index) => {
                const nomor = index + 1;
                const satuan = row.satuan.trim();
                const kosong = isRowKosong(row);
                return (
                  <tr key={index}>
                    <td className={`${cellClass} bg-gray-50/60 text-center text-gray-700`}>{nomor}</td>
                    <td className={inputCellClass}>
                      <input
                        type="text"
                        value={row.kodeBarang}
                        maxLength={191}
                        onChange={(e) => handleRowChange(row.id, 'kodeBarang', e.target.value)}
                        placeholder="Contoh: BRG-001"
                        aria-label={`Kode barang baris ${nomor}`}
                        className={`${cellInputClass} min-w-36`}
                      />
                    </td>
                    <td className={inputCellClass}>
                      <input
                        type="text"
                        value={row.namaBahan}
                        maxLength={191}
                        onChange={(e) => handleRowChange(row.id, 'namaBahan', e.target.value)}
                        placeholder="Nama & spesifikasi bahan"
                        aria-label={`Nama dan spesifikasi bahan baris ${nomor}`}
                        className={`${cellInputClass} min-w-64`}
                      />
                    </td>
                    <td className={inputCellClass}>
                      <div className="flex items-center">
                        <input
                        {...INTEGER_INPUT}
                        maxLength={9}
                          value={row.kuota}
                          onChange={(e) => handleRowChange(row.id, 'kuota', digitsOnly(e.target.value))}
                          placeholder="0"
                          aria-label={`Kuota alokasi baris ${nomor}`}
                          className={`${cellInputClass} min-w-24`}
                        />
                        <input
                          type="text"
                          value={row.satuan}
                          maxLength={50}
                          onChange={(e) => handleRowChange(row.id, 'satuan', e.target.value)}
                          placeholder="satuan"
                          aria-label={`Satuan baris ${nomor}`}
                          className={`${cellInputClass} w-28 border-l border-gray-200`}
                        />
                      </div>
                    </td>
                    {/* Dokubah baru belum punya pengambilan, jadi realisasi 0 dan sisa = kuota */}
                    <td className={`${cellClass} bg-gray-50/60`}>{kosong ? '' : `0 ${satuan}`}</td>
                    <td className={`${cellClass} bg-gray-50/60`}>
                      {isAngkaValid(row.kuota) ? `${formatAngka(Number(row.kuota))} ${satuan}` : ''}
                    </td>
                    <td className={`${cellClass} text-center`}>
                      <button type="button" onClick={() => hapusBaris(row.id)} aria-label={`Hapus baris ${nomor}`} className="text-sm text-red-600 hover:underline">Hapus</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Tombol Tambah Baris */}
        <div className="flex justify-end me-2 mt-1">
          <button
            type="button"
            onClick={tambahBaris}
            className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-[#FF8A00] hover:text-orange-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Baris
          </button>
        </div>

        {saveError && (
          <p className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{saveError}</p>
        )}

        <div className="flex justify-end mt-6 items-center gap-3">
          <Link href={backHref} replace className="text-sm text-gray-500 hover:underline">Batal</Link>
          <button type="submit" className={orangeButtonClass}>Simpan Perubahan</button>
        </div>
      </form>
    </div>
  );
}