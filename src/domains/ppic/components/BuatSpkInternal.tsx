"use client";

import React, { useState } from 'react';
import { useCan } from '@/domains/auth/user-context';
import NoPermission from './NoPermission';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, Plus } from 'lucide-react';
import { spk_internal_path } from '@/domains/ppic/data/spk-internal';
import { createSpkInternal, listTrackingPic } from '@/domains/ppic/api';
import { useSpkSearch } from '@/domains/ppic/use-spk-search';
import { listItems } from '@/domains/inventory/api';
import { ApiError } from '@/shared/lib/api-client';
import { useApiData } from '@/shared/lib/use-api-data';
import { INTEGER_INPUT, digitsOnly } from '@/shared/lib/input';
import SearchableSelect from '@/shared/components/SearchableSelect';

type BarangRow = { id: number; kodeSku: string; namaBarang: string; totalQty: string; alokasiSpkKlien: string; alokasiStokBebas: string };
type BarangField = Exclude<keyof BarangRow, 'id'>;

const JUMLAH_BARIS_AWAL = 4;

// Baru 'STOCK'; pilihan lain menyusul setelah dikonfirmasi (belum ada daftar dari API)
const TUJUAN_PRODUKSI = ['STOCK'];

const emptyForm = { tanggalTerbit: '', tujuanProduksi: '', spkKlienInduk: '', penanggungJawab: '', targetSelesai: '', catatan: '' };
const createRow = (id: number): BarangRow => ({ id, kodeSku: '', namaBarang: '', totalQty: '', alokasiSpkKlien: '', alokasiStokBebas: '' });

const cellClass = 'px-4 py-3 border-b border-r border-gray-300';
const inputCellClass = 'p-0 border-b border-r border-gray-300 bg-white';
const cellInputClass = 'w-full px-4 py-3 bg-transparent text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500/50';
const fieldClass = 'w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors';
const readOnlyFieldClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 bg-gray-50 cursor-default focus:outline-none';
const orangeButtonClass = 'min-w-24 px-6 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm text-center';

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="w-36 shrink-0 text-sm font-medium text-gray-800">{label}</label>
      <span className="text-gray-800">:</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// Opsi dropdown datang dari API lewat prop `options`
function SelectField({ id, value, onChange, placeholder, options = [] }: { id: string; value: string; onChange: (value: string) => void; placeholder: string; options?: string[] }) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${fieldClass} appearance-none pr-9 cursor-pointer`}>
        <option value="">{placeholder}</option>
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
    </div>
  );
}

export default function BuatSpkInternalPPIC() {
  const canCreate = useCan('spk-internal.create');
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const spkKlien = useSpkSearch(form.spkKlienInduk);
  const { data: picList } = useApiData(() => listTrackingPic(), 'pic', 'Gagal memuat daftar penanggung jawab.');
  // ponytail: the SKU suggestions are the first 100 items
  const { data: itemResult } = useApiData(() => listItems({ pageSize: 100 }), 'items', 'Gagal memuat daftar barang.');
  const items = itemResult?.rows ?? [];
  const [rows, setRows] = useState<BarangRow[]>(() => Array.from({ length: JUMLAH_BARIS_AWAL }, (_, i) => createRow(i + 1)));

  const setField = (field: keyof typeof emptyForm, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleRowChange = (id: number, field: BarangField, value: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, [field]: value };
        // Picking a known SKU fills the item name
        if (field === 'kodeSku') {
          const item = items.find((it) => it.code === value);
          if (item) next.namaBarang = item.name;
        }
        return next;
      }),
    );
  };

  const handleSimpan = async () => {
    const { tanggalTerbit, tujuanProduksi, spkKlienInduk, penanggungJawab, targetSelesai, catatan } = form;
    if (!tanggalTerbit || !tujuanProduksi || !spkKlienInduk || !penanggungJawab || !targetSelesai) {
      setFormError('Tanggal Terbit, Target Selesai, Tujuan Produksi, SPK Klien Induk, dan Penanggung Jawab wajib diisi.');
      return;
    }
    if (targetSelesai < tanggalTerbit) {
      setFormError('Target Selesai tidak boleh sebelum Tanggal Terbit.');
      return;
    }
    const filled = rows.filter((row) => Object.entries(row).some(([key, value]) => key !== 'id' && String(value).trim() !== ''));
    if (filled.length === 0) {
      setFormError('Isi minimal satu barang.');
      return;
    }
    const lines = [];
    for (const row of filled) {
      const item = items.find((it) => it.code === row.kodeSku.trim());
      const [total, klien, bebas] = [row.totalQty, row.alokasiSpkKlien, row.alokasiStokBebas].map(Number);
      if (!item) {
        setFormError(`Kode SKU "${row.kodeSku}" tidak ditemukan di daftar barang.`);
        return;
      }
      if (![total, klien, bebas].every((n) => Number.isInteger(n) && n >= 0) || total <= 0) {
        setFormError(`Total Qty, Alokasi SPK Klien, dan Alokasi Stok Bebas untuk ${row.kodeSku} wajib angka bulat (Total Qty lebih dari 0).`);
        return;
      }
      if (klien + bebas !== total) {
        setFormError(`Alokasi SPK Klien + Alokasi Stok Bebas harus sama dengan Total Qty (${row.kodeSku}).`);
        return;
      }
      lines.push({ itemId: item.id, totalQty: total, alokasiSpkKlien: klien, alokasiStokBebas: bebas });
    }
    setSaving(true);
    setFormError('');
    try {
      await createSpkInternal({ tanggalTerbit, tujuanProduksi, spkKlienInduk, penanggungJawab, targetSelesai, catatan: catatan.trim() || undefined, lines });
      router.replace(spk_internal_path);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Gagal menyimpan SPK Internal.');
    } finally {
      setSaving(false);
    }
  };

  const tambahBaris = () => {
    setRows((prev) => [...prev, createRow(prev.reduce((max, row) => Math.max(max, row.id), 0) + 1)]);
  };

  const hapusBaris = (id: number) => setRows((prev) => prev.filter((row) => row.id !== id));

  if (!canCreate) return <NoPermission action="membuat SPK Internal" />;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <Link href={spk_internal_path} aria-label="Kembali ke SPK Internal & Mutasi Stok" className="text-gray-800 hover:opacity-70 transition-opacity">
          <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
        </Link>
        <h1 className="text-[18px] font-extrabold text-black tracking-wide">Buat SPK Internal</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Info SPK Internal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-3 max-w-4xl mb-8">
          <Field id="spk-internal-nomor" label="No. SPK Internal">
            <input id="spk-internal-nomor" type="text" readOnly value="" placeholder="auto" className={readOnlyFieldClass} />
          </Field>
          <Field id="spk-internal-pj" label="Penanggung Jawab">
            <SelectField id="spk-internal-pj" value={form.penanggungJawab} onChange={(v) => setField('penanggungJawab', v)} placeholder="Pilih Penanggung Jawab" options={(picList ?? []).map((p) => p.nama)} />
          </Field>

          <Field id="spk-internal-terbit" label="Tanggal Terbit">
            <input id="spk-internal-terbit" type="date" value={form.tanggalTerbit} onChange={(e) => setField('tanggalTerbit', e.target.value)} className={fieldClass} />
          </Field>
          <Field id="spk-internal-target" label="Target Selesai">
            <input
              id="spk-internal-target"
              type="date"
              value={form.targetSelesai}
              min={form.tanggalTerbit || undefined}
              onChange={(e) => setField('targetSelesai', e.target.value)}
              className={fieldClass}
            />
          </Field>

          <Field id="spk-internal-tujuan" label="Tujuan Produksi">
            <SelectField id="spk-internal-tujuan" value={form.tujuanProduksi} onChange={(v) => setField('tujuanProduksi', v)} placeholder="Pilih Tujuan Produksi" options={TUJUAN_PRODUKSI} />
          </Field>
          <div className="hidden lg:block" />

          <Field id="spk-internal-klien" label="SPK Klien Induk">
            <SearchableSelect
              value={form.spkKlienInduk}
              onChange={(v) => setField('spkKlienInduk', v)}
              onSearch={spkKlien.onSearch}
              options={spkKlien.options.map((t) => ({ value: t.noSpk, label: t.noSpk }))}
              placeholder="Pilih SPK Klien Induk"
              aria-label="SPK Klien Induk"
              className={fieldClass}
            />
          </Field>
        </div>

        {/* Tabel barang */}
        <datalist id="spk-internal-sku">
          {items.map((it) => <option key={it.id} value={it.code ?? ''}>{it.name}</option>)}
        </datalist>
        <h2 className="text-base font-bold text-gray-900 mb-4">Tabel Barang</h2>
        <div className="overflow-x-auto border-t border-l border-gray-300 rounded-sm">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="bg-gray-100 text-gray-800 font-semibold text-xs">
              <tr>
                <th scope="col" className={`${cellClass} w-14`}>No.</th>
                <th scope="col" className={cellClass}>Kode SKU</th>
                <th scope="col" className={cellClass}>Nama Barang &amp; Spesifikasi</th>
                <th scope="col" className={cellClass}>Total Qty Diproduksi</th>
                <th scope="col" className={cellClass}>Alokasi SPK Klien</th>
                <th scope="col" className={cellClass}>Alokasi Stok Bebas</th>
                <th scope="col" className={cellClass}>Action</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              {rows.map((row, index) => {
                const nomor = index + 1;
                return (
                  <tr key={row.id}>
                    <td className={`${cellClass} bg-gray-50/60 text-gray-700`}>{nomor}</td>
                    <td className={inputCellClass}>
                      <input
                        type="text"
                        value={row.kodeSku}
                        onChange={(e) => handleRowChange(row.id, 'kodeSku', e.target.value)}
                        list="spk-internal-sku"
                        aria-label={`Kode SKU baris ${nomor}`}
                        className={`${cellInputClass} min-w-36`}
                      />
                    </td>
                    <td className={inputCellClass}>
                      <input
                        type="text"
                        value={row.namaBarang}
                        onChange={(e) => handleRowChange(row.id, 'namaBarang', e.target.value)}
                        aria-label={`Nama barang dan spesifikasi baris ${nomor}`}
                        className={`${cellInputClass} min-w-56`}
                      />
                    </td>
                    <td className={inputCellClass}>
                      <input
                      {...INTEGER_INPUT}
                      maxLength={9}
                        value={row.totalQty}
                        onChange={(e) => handleRowChange(row.id, 'totalQty', digitsOnly(e.target.value))}
                        aria-label={`Total qty diproduksi baris ${nomor}`}
                        className={`${cellInputClass} min-w-32`}
                      />
                    </td>
                    <td className={inputCellClass}>
                      <input
                      {...INTEGER_INPUT}
                      maxLength={9}
                        value={row.alokasiSpkKlien}
                        onChange={(e) => handleRowChange(row.id, 'alokasiSpkKlien', digitsOnly(e.target.value))}
                        aria-label={`Alokasi SPK klien baris ${nomor}`}
                        className={`${cellInputClass} min-w-28`}
                      />
                    </td>
                    <td className={inputCellClass}>
                      <input
                      {...INTEGER_INPUT}
                      maxLength={9}
                        value={row.alokasiStokBebas}
                        onChange={(e) => handleRowChange(row.id, 'alokasiStokBebas', digitsOnly(e.target.value))}
                        aria-label={`Alokasi stok bebas baris ${nomor}`}
                        className={`${cellInputClass} min-w-28`}
                      />
                    </td>
                    <td className={cellClass}>
                      <button
                        type="button"
                        onClick={() => hapusBaris(row.id)}
                        aria-label={`Hapus baris ${nomor}`}
                        className="text-xs font-semibold text-gray-800 hover:text-red-600 transition-colors"
                      >
                        HAPUS
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className={`${cellClass} px-6 py-8 text-center text-gray-400 italic`}>
                    Belum ada barang. Klik Tambah Baris untuk menambah.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={tambahBaris}
          className="inline-flex items-center gap-2 mt-3 px-3 py-1 bg-[#FF8A00] text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors"
        >
          Tambah Baris
          <Plus className="w-4 h-4" />
        </button>

        <label htmlFor="spk-internal-catatan" className="block text-sm font-medium text-gray-800 mt-6 mb-2">Catatan :</label>
        <textarea
          id="spk-internal-catatan"
          rows={5}
          value={form.catatan}
          maxLength={500}
          onChange={(e) => setField('catatan', e.target.value)}
          className={`${fieldClass} max-w-4xl resize-y`}
        />

        {formError && <p className="mt-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg max-w-4xl">{formError}</p>}

        <div className="flex flex-wrap items-center justify-between gap-4 mt-10">
          <Link href={spk_internal_path} className={orangeButtonClass}>Batal</Link>
          <button type="button" onClick={handleSimpan} disabled={saving} className={`${orangeButtonClass} disabled:opacity-60`}>Simpan</button>
        </div>
      </div>
    </div>
  );
}
