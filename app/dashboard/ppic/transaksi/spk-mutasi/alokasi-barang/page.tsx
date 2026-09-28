"use client";

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { dataSpkInternal } from '../data';
import { dataDokubah } from '../../dokubah/data';

const labelClass = "w-40 text-sm text-gray-800";
const fieldClass = "w-56 h-10 border border-gray-300 rounded-lg py-2 px-3 text-sm text-gray-800 bg-white focus:outline-none focus:border-orange-500";

function AlokasiBarang() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const barang = dataSpkInternal.find((item) => String(item.id) === searchParams.get("id"));

  const [spkKlien, setSpkKlien] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [catatan, setCatatan] = useState("");

  const stockBebas = barang?.stockBisaPakai ?? 0;
  const jumlahMutasi = Number(jumlah);
  const melebihiStock = jumlahMutasi > stockBebas;
  const bisaDikaitkan = spkKlien !== "" && jumlahMutasi > 0 && !melebihiStock;

  const actionButton = "w-24 py-2 bg-[#ff8a00] text-white text-sm font-medium rounded-lg hover:bg-[#eb7d00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col bg-white min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-800 hover:opacity-70 transition-opacity">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-extrabold text-black tracking-wide">Alokasikan Barang</h1>
      </div>

      <div className="px-10 max-w-6xl">
        {/* Form */}
        <div className="grid grid-cols-2 gap-y-4 mb-6 max-w-5xl">
          <div className="flex items-center">
            <span className={labelClass}>No. SPK Internal</span>
            <span className="w-4 text-sm text-gray-800">:</span>
            <div className={fieldClass}>{barang?.noSpk}</div>
          </div>
          <div className="flex items-center">
            <span className={labelClass}>Pilih SPK Klien</span>
            <span className="w-4 text-sm text-gray-800">:</span>
            <select value={spkKlien} onChange={(e) => setSpkKlien(e.target.value)} className={fieldClass}>
              <option value="" />
              {dataDokubah.map((item) => (
                <option key={item.id} value={item.spk}>{item.spk} / {item.client}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center">
              <span className={labelClass}>SKU &amp; Nama Barang</span>
              <span className="w-4 text-sm text-gray-800">:</span>
              <div className={fieldClass}>{barang && `${barang.sku} - ${barang.namaBarang}`}</div>
            </div>
            {/* Lebar = label (w-40) + titik dua (w-4) + field (w-56), agar teks rata kanan di bawah field */}
            <p className="w-[25rem] mt-1 text-[11px] text-gray-800 text-right">
              Stock bebas : {stockBebas} pcs
            </p>
          </div>
          <div className="flex items-start">
            <span className={`${labelClass} h-10 flex items-center`}>Jumlah Mutasi</span>
            <span className="w-4 h-10 flex items-center text-sm text-gray-800">:</span>
            <div>
              <input
                type="number"
                min={1}
                max={stockBebas}
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                className={`${fieldClass} block ${melebihiStock ? "border-red-500" : ""}`}
              />
              {melebihiStock && <p className="mt-1 text-[11px] text-red-600">Melebihi stock bebas ({stockBebas} pcs)</p>}
            </div>
          </div>
        </div>

        {/* Catatan */}
        <label className="block text-sm text-gray-800 mb-2" htmlFor="catatan">Catatan :</label>
        <textarea
          id="catatan"
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="Tulis catatan"
          rows={5}
          className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:border-orange-500"
        />
      </div>

      <div className="flex justify-end gap-6 mt-10">
        <button onClick={() => router.back()} className={actionButton}>Batal</button>
        <button disabled={!bisaDikaitkan} className={actionButton}>Kaitkan</button>
      </div>
    </div>
  );
}

// useSearchParams wajib dibungkus Suspense agar build production tidak gagal
export default function AlokasiBarangPage() {
  return (
    <Suspense>
      <AlokasiBarang />
    </Suspense>
  );
}
