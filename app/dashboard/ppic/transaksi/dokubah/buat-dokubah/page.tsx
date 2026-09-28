"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { dataDokubah } from '../data';

const MIN_ROWS = 5;

function InfoField({ label, value, placeholder }: { label: string; value?: string; placeholder: string }) {
  return (
    <div className="flex items-center">
      <span className="w-36 text-sm text-gray-800">{label}</span>
      <span className="w-6 text-sm text-gray-800">:</span>
      <div className={`w-56 border border-gray-300 rounded-lg py-2 px-3 text-sm ${value ? "text-gray-800" : "text-gray-400"}`}>
        {value || placeholder}
      </div>
    </div>
  );
}

export default function BuatDokubahPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");

  const dokubah = dataDokubah.find((item) => String(item.id) === selectedId);
  const bahan = dokubah?.bahan ?? [];
  const emptyRowCount = Math.max(MIN_ROWS - bahan.length, 0);

  const actionButton = "w-40 py-2 bg-[#ff8a00] text-white text-sm font-medium rounded-lg hover:bg-[#eb7d00] transition-colors";

  return (
    <div className="flex flex-col bg-white min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-800 hover:opacity-70 transition-opacity">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-extrabold text-black tracking-wide">Buat Dokubah</h1>
      </div>

      {/* Info Dokubah */}
      <div className="grid grid-cols-2 gap-y-3 mb-8">
        <div className="flex items-center">
          <span className="w-36 text-sm text-gray-800">Pilih SPK / Proyek</span>
          <span className="w-6 text-sm text-gray-800">:</span>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className={`w-56 border border-gray-300 rounded-lg py-2 px-3 text-sm bg-white focus:outline-none focus:border-orange-500 ${selectedId ? "text-gray-800" : "text-gray-400"}`}
          >
            <option value="">No. SPK / Nama Proyek</option>
            {dataDokubah.map((item) => (
              <option key={item.id} value={item.id}>{item.spk} / {item.proyek}</option>
            ))}
          </select>
        </div>
        <InfoField label="Tanggal Mulai" value={dokubah?.tanggalMulai} placeholder="DD/MM/YYYY" />
        <InfoField label="Nama Client" value={dokubah?.client} placeholder="Nama Client" />
        <InfoField label="Tanggal Selesai" value={dokubah?.tanggalSelesai} placeholder="DD/MM/YYYY" />
        <InfoField label="Status Dokubah" value={dokubah?.status} placeholder="Status" />
      </div>

      {/* Tabel Bahan */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-left text-xs border-collapse border border-gray-300 [&_th]:border [&_td]:border [&_th]:border-gray-300 [&_td]:border-gray-300">
          <thead className="bg-gray-100 text-gray-800 font-semibold">
            <tr>
              <th className="px-3 py-2 w-12">No.</th>
              <th className="px-3 py-2">Kode Barang</th>
              <th className="px-3 py-2">Nama &amp; Spesifikasi Bahan</th>
              <th className="px-3 py-2">Kuota Alokasi (Dokubah)</th>
              <th className="px-3 py-2">Realisasi Pengambilan</th>
              <th className="px-3 py-2">Sisa Jatah Kuota</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {bahan.map((item, index) => (
              <tr key={item.kode} className="h-7 hover:bg-orange-50/30">
                <td className="px-3">{index + 1}</td>
                <td className="px-3">{item.kode}</td>
                <td className="px-3">{item.nama}</td>
                <td className="px-3">{item.kuota} {item.satuan}</td>
                <td className="px-3">{item.realisasi} {item.satuan}</td>
                <td className="px-3">{item.kuota - item.realisasi} {item.satuan}</td>
              </tr>
            ))}
            {Array.from({ length: emptyRowCount }, (_, i) => (
              <tr key={`empty-${i}`} className="h-7">
                {Array.from({ length: 6 }, (_, j) => <td key={j} />)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-8">
        <button className={actionButton}>Simpan Draft</button>
        <button className={actionButton}>Rilis</button>
      </div>
    </div>
  );
}
