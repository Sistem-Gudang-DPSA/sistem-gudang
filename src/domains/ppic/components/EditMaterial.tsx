"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  dokubah_path,
  viewDokubahPath,
  type BahanDokubah,
  type DokubahItem,
} from '@/domains/ppic/data/dokubah';
import { getDokubah, replaceDokubahMaterials } from '@/domains/ppic/api';
import { ApiError } from '@/shared/lib/api-client';
import { useApiData } from '@/shared/lib/use-api-data';

// Angka disimpan sebagai teks selama diedit supaya kolomnya boleh dikosongkan dulu
type BahanDraft = Omit<BahanDokubah, 'kuota' | 'hargaSatuan'> & { kuota: string; hargaSatuan: string };

const toDraft = (b: BahanDokubah): BahanDraft => ({ ...b, kuota: String(b.kuota), hargaSatuan: String(b.hargaSatuan) });

const isAngkaValid = (value: string) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;

const cellClass = 'px-4 py-3 border-b border-r border-gray-200';
const inputCellClass = 'p-0 border-b border-r border-gray-200';
const cellInputClass = 'w-full px-4 py-3 bg-transparent text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500/50';
const readOnlyFieldClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-gray-50 cursor-default focus:outline-none';
const orangeButtonClass = 'px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm text-center';

// Loads the dokubah, then mounts the form keyed by id so the draft starts from the loaded materials.
export default function EditMaterialPPIC() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error } = useApiData(() => getDokubah(Number(id)), id, 'Gagal memuat Dokubah.');
  return <EditMaterialForm key={data?.id ?? 'loading'} dokubah={data} message={loading ? 'Memuat data...' : error || 'Dokubah tidak ditemukan.'} />;
}

function EditMaterialForm({ dokubah, message }: { dokubah?: DokubahItem; message: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<BahanDraft[]>(() => dokubah?.bahan.map(toDraft) ?? []);
  const [showError, setShowError] = useState(false);
  const [saveError, setSaveError] = useState('');

  const backHref = dokubah ? viewDokubahPath(dokubah.id) : dokubah_path;

  const header = (
    <div className="flex items-center gap-3 mb-6">
      <Link href={backHref} replace aria-label="Kembali" className="text-gray-800 hover:opacity-70 transition-opacity">
        <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
      </Link>
      <h1 className="text-[18px] font-extrabold text-black tracking-wide">Edit Material</h1>
    </div>
  );

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

  const hasInvalid = draft.some((b) => !isAngkaValid(b.kuota) || !isAngkaValid(b.hargaSatuan));
  const invalidClass = (value: string) => (showError && !isAngkaValid(value) ? 'bg-red-50' : 'bg-white');

  const handleChange = (kodeBarang: string, field: 'kuota' | 'hargaSatuan' | 'keterangan', value: string) => {
    setDraft((prev) => prev.map((b) => (b.kodeBarang === kodeBarang ? { ...b, [field]: value } : b)));
  };

  const handleHapus = (kodeBarang: string) => {
    setDraft((prev) => prev.filter((b) => b.kodeBarang !== kodeBarang));
  };

  const handleSimpan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasInvalid) {
      setShowError(true);
      return;
    }
    if (draft.length === 0) {
      setSaveError('Dokubah harus punya minimal satu bahan.');
      return;
    }
    setSaveError('');
    try {
      await replaceDokubahMaterials(
        dokubah.id,
        draft.map((b) => ({
          kodeBarang: b.kodeBarang,
          namaBahan: b.namaBahan,
          satuan: b.satuan,
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
                <th scope="col" className={cellClass}>Estimasi Harga Bahan</th>
                <th scope="col" className={cellClass}>Keterangan</th>
                <th scope="col" className={`${cellClass} text-center`}>Aksi</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              {draft.map((b, index) => (
                <tr key={b.kodeBarang}>
                  <td className={`${cellClass} bg-gray-50/60 text-center text-gray-700`}>{index + 1}</td>
                  <td className={`${cellClass} bg-gray-50/60 font-semibold text-gray-900`}>{b.kodeBarang}</td>
                  <td className={`${cellClass} bg-gray-50/60`}>{b.namaBahan}</td>
                  <td className={`${inputCellClass} ${invalidClass(b.kuota)}`}>
                    <div className="flex items-center">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={b.kuota}
                        onChange={(e) => handleChange(b.kodeBarang, 'kuota', e.target.value)}
                        placeholder="0"
                        aria-label={`Kuota alokasi ${b.kodeBarang}`}
                        className={`${cellInputClass} min-w-24`}
                      />
                      <span className="pr-4 text-gray-500">{b.satuan}</span>
                    </div>
                  </td>
                  <td className={`${inputCellClass} ${invalidClass(b.hargaSatuan)}`}>
                    <div className="flex items-center">
                      <span className="pl-4 text-gray-500">Rp</span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={b.hargaSatuan}
                        onChange={(e) => handleChange(b.kodeBarang, 'hargaSatuan', e.target.value)}
                        placeholder="0"
                        aria-label={`Estimasi harga ${b.kodeBarang}`}
                        className={`${cellInputClass} pl-2 min-w-32`}
                      />
                    </div>
                  </td>
                  <td className={`${inputCellClass} bg-white`}>
                    <input
                      type="text"
                      value={b.keterangan}
                      onChange={(e) => handleChange(b.kodeBarang, 'keterangan', e.target.value)}
                      placeholder="Tambahkan keterangan"
                      aria-label={`Keterangan ${b.kodeBarang}`}
                      className={`${cellInputClass} min-w-56`}
                    />
                  </td>
                  <td className={`${cellClass} text-center`}>
                    <button
                      type="button"
                      onClick={() => handleHapus(b.kodeBarang)}
                      aria-label={`Hapus material ${b.kodeBarang}`}
                      className="px-4 py-1.5 bg-[#FF8A00] text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      Hapus Material
                    </button>
                  </td>
                </tr>
              ))}
              {draft.length === 0 && (
                <tr>
                  <td colSpan={7} className={`${cellClass} px-6 py-10 text-center text-gray-400 italic`}>
                    Tidak ada material pada Dokubah ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {showError && hasInvalid && (
          <p className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
            Kuota Alokasi dan Estimasi Harga Bahan wajib diisi dengan angka 0 atau lebih.
          </p>
        )}

        {saveError && <p className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{saveError}</p>}

        <div className="flex justify-end gap-4 mt-10">
          <Link href={backHref} replace className={orangeButtonClass}>Batal</Link>
          <button type="submit" className={orangeButtonClass}>Simpan</button>
        </div>
      </form>
    </div>
  );
}
