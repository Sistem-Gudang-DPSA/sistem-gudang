"use client";

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { dataDokubah, type BahanDokubah } from '../../data';

const MIN_ROWS = 5;

type EditableField = "kuota" | "harga" | "keterangan";

function InfoField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-800">{label} :</span>
      <div className="w-72 h-10 border border-gray-300 rounded-lg py-2 px-3 text-sm text-gray-800">
        {value}
      </div>
    </div>
  );
}

function EditMaterial() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dokubah = dataDokubah.find((item) => String(item.id) === searchParams.get("id"));
  const [bahan, setBahan] = useState<BahanDokubah[]>(dokubah?.bahan ?? []);

  const emptyRowCount = Math.max(MIN_ROWS - bahan.length, 0);

  const updateBahan = (kode: string, field: EditableField, value: string) => {
    setBahan((prev) =>
      prev.map((item) =>
        item.kode === kode ? { ...item, [field]: field === "keterangan" ? value : Number(value) } : item
      )
    );
  };

  const hapusBahan = (kode: string) => {
    setBahan((prev) => prev.filter((item) => item.kode !== kode));
  };

  const cellInput = "w-full h-7 px-3 bg-transparent focus:outline-none focus:bg-orange-50";
  const actionButton = "w-28 py-2 bg-[#ff8a00] text-white text-sm font-medium rounded-lg hover:bg-[#eb7d00] transition-colors";

  return (
    <div className="flex flex-col bg-white min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-800 hover:opacity-70 transition-opacity">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-extrabold text-black tracking-wide">Edit Material</h1>
      </div>

      {/* Info SPK */}
      <div className="grid grid-cols-2 mb-12">
        <InfoField label="Nomor SPK" value={dokubah?.spk} />
        <InfoField label="Nama Client" value={dokubah?.client} />
      </div>

      {/* Tabel Material */}
      <div className="overflow-x-auto mb-10">
        <table className="w-full text-left text-xs border-collapse border border-gray-300 [&_th]:border [&_td]:border [&_th]:border-gray-300 [&_td]:border-gray-300">
          <thead className="bg-gray-100 text-gray-800 font-semibold">
            <tr>
              <th className="px-3 py-2 w-12">No.</th>
              <th className="px-3 py-2">Kode Barang</th>
              <th className="px-3 py-2">Nama &amp; Spesifikasi Bahan</th>
              <th className="px-3 py-2">Kuota Alokasi (Dokubah)</th>
              <th className="px-3 py-2">Estimasi Harga Bahan</th>
              <th className="px-3 py-2">Keterangan</th>
              <th className="px-3 py-2 w-32">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {bahan.map((item, index) => (
              <tr key={item.kode} className="h-7">
                <td className="px-3">{index + 1}</td>
                <td className="px-3">{item.kode}</td>
                <td className="px-3">{item.nama}</td>
                <td>
                  <input type="number" min={0} value={item.kuota} onChange={(e) => updateBahan(item.kode, "kuota", e.target.value)} className={cellInput} />
                </td>
                <td>
                  <input type="number" min={0} value={item.harga} onChange={(e) => updateBahan(item.kode, "harga", e.target.value)} className={cellInput} />
                </td>
                <td>
                  <input type="text" value={item.keterangan} onChange={(e) => updateBahan(item.kode, "keterangan", e.target.value)} className={cellInput} />
                </td>
                <td className="px-2 text-center">
                  <button
                    onClick={() => hapusBahan(item.kode)}
                    className="px-2 py-0.5 bg-[#ff8a00] text-white text-xs rounded-md hover:bg-[#eb7d00] transition-colors whitespace-nowrap"
                  >
                    Hapus Material
                  </button>
                </td>
              </tr>
            ))}
            {Array.from({ length: emptyRowCount }, (_, i) => (
              <tr key={`empty-${i}`} className="h-7">
                {Array.from({ length: 7 }, (_, j) => <td key={j} />)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-8">
        <button onClick={() => router.back()} className={actionButton}>Batal</button>
        <button className={actionButton}>Simpan</button>
      </div>
    </div>
  );
}

// useSearchParams wajib dibungkus Suspense agar build production tidak gagal
export default function EditMaterialPage() {
  return (
    <Suspense>
      <EditMaterial />
    </Suspense>
  );
}
