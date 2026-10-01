"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import { addDokubah, dokubah_path, formatAngka, getDokubahList, type StatusDokubah } from '@/domains/ppic/data/dokubah';

// Kuota disimpan sebagai teks selama diisi supaya kolomnya boleh dikosongkan dulu
type BahanRow = { kodeBarang: string; namaBahan: string; kuota: string; satuan: string };

const JUMLAH_BARIS_AWAL = 5;

const emptyRow: BahanRow = { kodeBarang: '', namaBahan: '', kuota: '', satuan: '' };
const emptyForm = { noSpk: '', client: '', tanggalMulai: '', tanggalSelesai: '' };

const isRowKosong = (row: BahanRow) => Object.values(row).every((value) => value.trim() === '');
const isAngkaValid = (value: string) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;

const cellClass = 'px-4 py-3 border-b border-r border-gray-200';
const inputCellClass = 'p-0 border-b border-r border-gray-200 bg-white';
const cellInputClass = 'w-full px-4 py-3 bg-transparent text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500/50';
const fieldClass = 'w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors';
const readOnlyFieldClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-gray-50 cursor-default focus:outline-none';
const orangeButtonClass = 'min-w-32 px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm text-center';

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="w-36 shrink-0 text-sm font-medium text-gray-800">{label}</label>
      <span className="text-gray-800">:</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export default function BuatDokubahPPIC() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [rows, setRows] = useState<BahanRow[]>(() => Array.from({ length: JUMLAH_BARIS_AWAL }, () => ({ ...emptyRow })));
  const [formError, setFormError] = useState('');

  const handleRowChange = (index: number, field: keyof BahanRow, value: string) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const tambahBaris = () => setRows((prev) => [...prev, { ...emptyRow }]);

  // Baris yang dibiarkan kosong tidak ikut disimpan
  const validasi = (status: StatusDokubah, rowsTerisi: BahanRow[]) => {
    if (!form.noSpk.trim() || !form.client.trim() || !form.tanggalMulai || !form.tanggalSelesai) {
      return 'No. SPK / Proyek, Nama Client, Tanggal Mulai, dan Tanggal Selesai wajib diisi.';
    }
    if (form.tanggalSelesai < form.tanggalMulai) {
      return 'Tanggal Selesai tidak boleh sebelum Tanggal Mulai.';
    }
    if (rowsTerisi.some((row) => !row.kodeBarang.trim() || !row.namaBahan.trim() || !isAngkaValid(row.kuota))) {
      return 'Setiap baris bahan yang diisi wajib punya Kode Barang, Nama & Spesifikasi Bahan, dan Kuota Alokasi (angka 0 atau lebih).';
    }
    const kodeList = rowsTerisi.map((row) => row.kodeBarang.trim().toLowerCase());
    if (new Set(kodeList).size !== kodeList.length) {
      return 'Kode Barang tidak boleh sama dalam satu Dokubah.';
    }
    if (status === 'Pending' && rowsTerisi.length === 0) {
      return 'Isi minimal satu bahan sebelum Rilis.';
    }
    return '';
  };

  // Simpan Draft -> status Draft, Rilis -> status Pending (menunggu approval)
  const handleSimpan = (status: StatusDokubah) => {
    const rowsTerisi = rows.filter((row) => !isRowKosong(row));
    const error = validasi(status, rowsTerisi);
    if (error) {
      setFormError(error);
      return;
    }
    const nextId = getDokubahList().reduce((max, item) => Math.max(max, item.id), 0) + 1;
    addDokubah({
      id: nextId,
      noSpk: form.noSpk.trim(),
      client: form.client.trim(),
      tanggalMulai: form.tanggalMulai,
      tanggalSelesai: form.tanggalSelesai,
      status,
      totalAnggaran: 0,
      bahan: rowsTerisi.map((row) => ({
        kodeBarang: row.kodeBarang.trim(),
        namaBahan: row.namaBahan.trim(),
        satuan: row.satuan.trim(),
        hargaSatuan: 0,
        kuota: Number(row.kuota),
        realisasi: 0,
        keterangan: '',
      })),
    });
    router.replace(dokubah_path);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <Link href={dokubah_path} replace aria-label="Kembali ke daftar Dokubah" className="text-gray-800 hover:opacity-70 transition-opacity">
          <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
        </Link>
        <h1 className="text-[18px] font-extrabold text-black tracking-wide">Buat Dokubah</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Info SPK */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-3 max-w-4xl mb-8">
          <Field id="buat-dokubah-spk" label="Pilih SPK / Proyek">
            <input
              id="buat-dokubah-spk"
              type="text"
              value={form.noSpk}
              onChange={(e) => setForm({ ...form, noSpk: e.target.value })}
              placeholder="No. SPK / Nama Proyek"
              className={fieldClass}
            />
          </Field>
          <Field id="buat-dokubah-mulai" label="Tanggal Mulai">
            <input
              id="buat-dokubah-mulai"
              type="date"
              value={form.tanggalMulai}
              onChange={(e) => setForm({ ...form, tanggalMulai: e.target.value })}
              className={fieldClass}
            />
          </Field>

          <Field id="buat-dokubah-client" label="Nama Client">
            <input
              id="buat-dokubah-client"
              type="text"
              value={form.client}
              onChange={(e) => setForm({ ...form, client: e.target.value })}
              placeholder="Nama Client"
              className={fieldClass}
            />
          </Field>
          <Field id="buat-dokubah-selesai" label="Tanggal Selesai">
            <input
              id="buat-dokubah-selesai"
              type="date"
              value={form.tanggalSelesai}
              min={form.tanggalMulai || undefined}
              onChange={(e) => setForm({ ...form, tanggalSelesai: e.target.value })}
              className={fieldClass}
            />
          </Field>

          <Field id="buat-dokubah-status" label="Status Dokubah">
            <input id="buat-dokubah-status" type="text" readOnly value="Draft" className={readOnlyFieldClass} />
          </Field>
        </div>

        {/* Tabel bahan */}
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
              </tr>
            </thead>
            <tbody className="text-gray-600">
              {rows.map((row, index) => {
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
                        onChange={(e) => handleRowChange(index, 'kodeBarang', e.target.value)}
                        placeholder="Contoh: BRG-001"
                        aria-label={`Kode barang baris ${nomor}`}
                        className={`${cellInputClass} min-w-36`}
                      />
                    </td>
                    <td className={inputCellClass}>
                      <input
                        type="text"
                        value={row.namaBahan}
                        onChange={(e) => handleRowChange(index, 'namaBahan', e.target.value)}
                        placeholder="Nama & spesifikasi bahan"
                        aria-label={`Nama dan spesifikasi bahan baris ${nomor}`}
                        className={`${cellInputClass} min-w-64`}
                      />
                    </td>
                    <td className={inputCellClass}>
                      <div className="flex items-center">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={row.kuota}
                          onChange={(e) => handleRowChange(index, 'kuota', e.target.value)}
                          placeholder="0"
                          aria-label={`Kuota alokasi baris ${nomor}`}
                          className={`${cellInputClass} min-w-24`}
                        />
                        <input
                          type="text"
                          value={row.satuan}
                          onChange={(e) => handleRowChange(index, 'satuan', e.target.value)}
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={tambahBaris}
          className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-[#FF8A00] hover:text-orange-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Baris
        </button>

        {formError && (
          <p className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{formError}</p>
        )}

        <div className="flex justify-end gap-4 mt-10">
          <button type="button" onClick={() => handleSimpan('Draft')} className={orangeButtonClass}>Simpan Draft</button>
          <button type="button" onClick={() => handleSimpan('Pending')} className={orangeButtonClass}>Rilis</button>
        </div>
      </div>
    </div>
  );
}
