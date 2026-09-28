"use client";

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import { PENANGGUNG_JAWAB, TUJUAN_PRODUKSI } from '../data';
import { dataDokubah } from '../../dokubah/data';

const MIN_ROWS = 4;

type BarisBarang = {
  id: number;
  sku: string;
  nama: string;
  totalQty: string;
  alokasiKlien: string;
};

const barisKosong = (id: number): BarisBarang => ({ id, sku: "", nama: "", totalQty: "", alokasiKlien: "" });

const fieldClass = "w-56 h-9 border border-gray-300 rounded-lg px-3 text-sm text-gray-800 bg-white focus:outline-none focus:border-orange-500";

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center">
      <span className="w-36 text-sm text-gray-800">{label}</span>
      <span className="w-6 text-sm text-gray-800">:</span>
      {children}
    </div>
  );
}

export default function BuatSpkInternalPage() {
  const router = useRouter();
  const nextId = useRef(2);

  const [tanggalTerbit, setTanggalTerbit] = useState("");
  const [targetSelesai, setTargetSelesai] = useState("");
  const [tujuan, setTujuan] = useState("");
  const [spkKlien, setSpkKlien] = useState("");
  const [penanggungJawab, setPenanggungJawab] = useState("");
  const [catatan, setCatatan] = useState("");
  const [barang, setBarang] = useState<BarisBarang[]>([barisKosong(1)]);

  const emptyRowCount = Math.max(MIN_ROWS - barang.length, 0);

  const updateBaris = (id: number, field: keyof Omit<BarisBarang, "id">, value: string) => {
    setBarang((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const tambahBaris = () => {
    setBarang((prev) => [...prev, barisKosong(nextId.current++)]);
  };

  const hapusBaris = (id: number) => {
    setBarang((prev) => prev.filter((row) => row.id !== id));
  };

  const cellInput = "w-full h-7 px-3 bg-transparent focus:outline-none focus:bg-orange-50";
  const actionButton = "px-5 py-2 bg-[#ff8a00] text-white text-sm font-medium rounded-lg hover:bg-[#eb7d00] transition-colors";

  return (
    <div className="flex flex-col bg-white min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-800 hover:opacity-70 transition-opacity">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-extrabold text-black tracking-wide">Buat SPK Internal</h1>
      </div>

      {/* Form SPK */}
      <div className="grid grid-cols-2 gap-x-10 max-w-5xl px-8 mb-6">
        <div className="flex flex-col gap-3">
          <FormRow label="No. SPK Internal">
            {/* Nomor dibuat otomatis oleh sistem saat disimpan */}
            <div className={`${fieldClass} flex items-center text-xs text-gray-400`}>auto</div>
          </FormRow>
          <FormRow label="Tanggal Terbit">
            <input type="date" value={tanggalTerbit} onChange={(e) => setTanggalTerbit(e.target.value)} className={fieldClass} />
          </FormRow>
          <FormRow label="Tujuan Produksi">
            <select value={tujuan} onChange={(e) => setTujuan(e.target.value)} className={fieldClass}>
              <option value="" />
              {TUJUAN_PRODUKSI.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </FormRow>
          <FormRow label="SPK Klien Induk">
            <select value={spkKlien} onChange={(e) => setSpkKlien(e.target.value)} className={fieldClass}>
              <option value="" />
              {dataDokubah.map((item) => (
                <option key={item.id} value={item.spk}>{item.spk} / {item.client}</option>
              ))}
            </select>
          </FormRow>
        </div>
        <div className="flex flex-col gap-3">
          <FormRow label="Penanggung Jawab">
            <select value={penanggungJawab} onChange={(e) => setPenanggungJawab(e.target.value)} className={fieldClass}>
              <option value="" />
              {PENANGGUNG_JAWAB.map((nama) => (
                <option key={nama} value={nama}>{nama}</option>
              ))}
            </select>
          </FormRow>
          <FormRow label="Target Selesai">
            <input type="date" value={targetSelesai} onChange={(e) => setTargetSelesai(e.target.value)} className={fieldClass} />
          </FormRow>
        </div>
      </div>

      {/* Tabel Barang */}
      <h2 className="text-sm font-bold text-black px-5 mb-3">Tabel Barang</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse border border-gray-300 [&_th]:border [&_td]:border [&_th]:border-gray-300 [&_td]:border-gray-300">
          <thead className="bg-gray-100 text-gray-800 font-semibold">
            <tr>
              <th className="px-3 py-2 w-12">No.</th>
              <th className="px-3 py-2">Kode SKU</th>
              <th className="px-3 py-2">Nama Barang &amp; Spesifikasi</th>
              <th className="px-3 py-2">Total Qty Diproduksi</th>
              <th className="px-3 py-2">Alokasi SPK Klien</th>
              <th className="px-3 py-2">Alokasi Stok Bebas</th>
              <th className="px-3 py-2 w-28">Action</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {barang.map((row, index) => {
              // Stok bebas = sisa produksi yang tidak dialokasikan ke SPK klien
              const stokBebas = Number(row.totalQty) - Number(row.alokasiKlien);
              return (
                <tr key={row.id} className="h-7">
                  <td className="px-3">{index + 1}</td>
                  <td>
                    <input type="text" value={row.sku} onChange={(e) => updateBaris(row.id, "sku", e.target.value)} className={cellInput} />
                  </td>
                  <td>
                    <input type="text" value={row.nama} onChange={(e) => updateBaris(row.id, "nama", e.target.value)} className={cellInput} />
                  </td>
                  <td>
                    <input type="number" min={0} value={row.totalQty} onChange={(e) => updateBaris(row.id, "totalQty", e.target.value)} className={cellInput} />
                  </td>
                  <td>
                    <input type="number" min={0} value={row.alokasiKlien} onChange={(e) => updateBaris(row.id, "alokasiKlien", e.target.value)} className={cellInput} />
                  </td>
                  <td className={`px-3 ${stokBebas < 0 ? "text-red-600" : ""}`}>
                    {row.totalQty !== "" && stokBebas}
                  </td>
                  <td className="px-3">
                    <button onClick={() => hapusBaris(row.id)} className="hover:text-red-600 hover:underline">
                      HAPUS
                    </button>
                  </td>
                </tr>
              );
            })}
            {Array.from({ length: emptyRowCount }, (_, i) => (
              <tr key={`empty-${i}`} className="h-7">
                {Array.from({ length: 7 }, (_, j) => <td key={j} />)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={tambahBaris}
        className="self-start flex items-center gap-3 mt-1 px-2 py-0.5 bg-[#ff8a00] text-white text-sm rounded-md hover:bg-[#eb7d00] transition-colors"
      >
        Tambah Baris
        <Plus className="w-3.5 h-3.5" />
      </button>

      {/* Catatan */}
      <label htmlFor="catatan" className="block text-sm text-gray-800 mt-6 mb-2">Catatan :</label>
      <textarea
        id="catatan"
        value={catatan}
        onChange={(e) => setCatatan(e.target.value)}
        placeholder="Tulis catatan"
        rows={6}
        className="w-full max-w-6xl border border-gray-300 rounded-lg py-2 px-3 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:border-orange-500"
      />

      {/* Tombol Aksi */}
      <div className="flex items-center justify-between mt-12">
        <button onClick={() => router.back()} className={actionButton}>Batal</button>
        <div className="flex gap-8">
          <button className={actionButton}>Simpan Draft</button>
          <button className={actionButton}>Simpan</button>
        </div>
      </div>
    </div>
  );
}
