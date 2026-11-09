"use client";

import React, { useState } from 'react';
import { useCan } from '@/domains/auth/user-context';
import NoPermission from './NoPermission';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { allocateSpkInternal, getSpkInternal } from '@/domains/ppic/api';
import { useDokubahSearch } from '@/domains/ppic/use-dokubah-search';
import SearchableSelect from '@/shared/components/SearchableSelect';
import { ApiError } from '@/shared/lib/api-client';
import { useApiData } from '@/shared/lib/use-api-data';
import { spk_internal_path } from '@/domains/ppic/data/spk-internal';
import { INTEGER_INPUT, digitsOnly } from '@/shared/lib/input';

const fieldClass = 'w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors';
const readOnlyFieldClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-gray-50 cursor-default focus:outline-none';
const orangeButtonClass = 'min-w-24 px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm text-center disabled:opacity-50 disabled:cursor-not-allowed';

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <label htmlFor={id} className="w-40 shrink-0 py-2 text-sm font-medium text-gray-800">{label}</label>
      <span className="py-2 text-gray-800">:</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export default function AlokasiBarangPPIC() {
  const canAllocate = useCan('spk-internal.allocate');
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: spk, loading, error } = useApiData(
    () => getSpkInternal(id).catch((err) => { if (err instanceof ApiError && err.status === 404) return null; throw err; }),
    `spk|${id}`,
    'Gagal memuat SPK Internal.',
  );
  const { rows: dokubahRows, onSearch: searchDokubah, pending: dokubahPending, error: dokubahError } = useDokubahSearch();
  const [spkKlien, setSpkKlien] = useState('');
  const [spkKlienLabel, setSpkKlienLabel] = useState('');
  const [jumlah, setJumlah] = useState('');
  const [catatan, setCatatan] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const header = (
    <div className="flex items-center gap-3 mb-6">
      <Link href={spk_internal_path} replace aria-label="Kembali ke SPK Internal & Mutasi Stok" className="text-gray-800 hover:opacity-70 transition-opacity">
        <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
      </Link>
      <h1 className="text-[18px] font-extrabold text-black tracking-wide">Alokasikan Barang</h1>
    </div>
  );

  if (!canAllocate) return <NoPermission action="mengalokasikan barang" />;

  if (!spk) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        {header}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-10 text-center text-gray-400 italic">
          {loading ? 'Memuat data...' : error || 'SPK Internal tidak ditemukan.'}
        </div>
      </div>
    );
  }

  // Stock bebas = stok yang belum dikaitkan ke SPK klien mana pun
  const stockBebas = spk.totalBisaPakai;

  const handleKaitkan = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;
    const jumlahMutasi = Number(jumlah);
    if (!spkKlien) {
      setFormError('Pilih SPK Klien terlebih dahulu.');
      return;
    }
    if (jumlah.trim() === '' || !Number.isInteger(jumlahMutasi) || jumlahMutasi <= 0) {
      setFormError('Jumlah Mutasi wajib diisi dengan angka bulat lebih dari 0.');
      return;
    }
    if (jumlahMutasi > stockBebas) {
      setFormError(`Jumlah Mutasi tidak boleh melebihi stock bebas (${stockBebas} pcs).`);
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      // the API only takes jumlah; SPK Klien and catatan are not stored yet
      await allocateSpkInternal(spk.id, jumlahMutasi);
      router.replace(spk_internal_path);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Gagal mengaitkan stock.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {header}

      <form onSubmit={handleKaitkan} noValidate className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-4 max-w-4xl mb-6">
          <Field id="alokasi-spk-internal" label="No. SPK Internal">
            <input id="alokasi-spk-internal" type="text" readOnly value={spk.noSpk} className={readOnlyFieldClass} />
          </Field>
          <Field id="alokasi-spk-klien" label="Pilih SPK Klien">
            <SearchableSelect
              value={spkKlien}
              onChange={(v) => { const d = dokubahRows.find((item) => item.noSpk === v); setSpkKlien(v); setSpkKlienLabel(d ? `${v} - ${d.client}` : v === spkKlien ? spkKlienLabel : v); }}
              onSearch={searchDokubah}
              pending={dokubahPending}
              // SPK Klien terpilih tetap ada di pilihan walau di luar hasil pencarian terakhir
              options={[
                ...(spkKlien && !dokubahRows.some((item) => item.noSpk === spkKlien) ? [{ value: spkKlien, label: spkKlienLabel }] : []),
                ...dokubahRows.map((item) => ({ value: item.noSpk, label: `${item.noSpk} - ${item.client}` })),
              ]}
              placeholder="Pilih SPK Klien"
              aria-label="Pilih SPK Klien"
              className={fieldClass}
            />
          </Field>

          <Field id="alokasi-barang" label="SKU & Nama Barang">
            <input id="alokasi-barang" type="text" readOnly value={`${spk.sku} - ${spk.namaBarang}`} className={readOnlyFieldClass} />
            <p className={`mt-1 text-xs text-right font-medium ${stockBebas === 0 ? 'text-red-600' : 'text-gray-700'}`}>
              Stock bebas : {stockBebas} pcs
            </p>
          </Field>
          <Field id="alokasi-jumlah" label="Jumlah Mutasi">
            <input
              id="alokasi-jumlah"
              {...INTEGER_INPUT}
              maxLength={9}
              value={jumlah}
              onChange={(e) => setJumlah(digitsOnly(e.target.value))}
              placeholder="0"
              className={fieldClass}
            />
          </Field>
        </div>

        <label htmlFor="alokasi-catatan" className="block text-sm font-medium text-gray-800 mb-2">Catatan :</label>
        <textarea
          id="alokasi-catatan"
          rows={6}
          maxLength={500}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="Tulis catatan (opsional)"
          className={`${fieldClass} resize-y`}
        />

        {(formError || dokubahError) && (
          <p className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{formError || dokubahError}</p>
        )}
        {stockBebas === 0 && (
          <p className="mt-4 p-3 bg-amber-50 text-amber-700 text-sm rounded-lg">
            Stock bebas barang ini sudah habis, jadi tidak ada yang bisa dikaitkan ke SPK Klien.
          </p>
        )}

        <div className="flex justify-end gap-4 mt-10">
          <Link href={spk_internal_path} replace className={orangeButtonClass}>Batal</Link>
          <button type="submit" disabled={stockBebas === 0 || saving} className={orangeButtonClass}>Kaitkan</button>
        </div>
      </form>
    </div>
  );
}
