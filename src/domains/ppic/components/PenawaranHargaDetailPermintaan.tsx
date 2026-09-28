"use client";

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DetailPermintaan() {
  const router = useRouter();

  // Data permintaan "Permintaan Hari Jumat" (sementara dummy)
  const infoPermintaan = [
    { label: "Bagian/Sub bagian", value: "Purchasing" },
    { label: "Nama", value: "Fauzi" },
    { label: "Jabatan", value: "Admin Gudang" },
    { label: "Tanggal Pengajuan", value: "07/04/2026" },
  ];

  const daftarBarang = [
    { namaBarang: "Triplex 3mm", qty: "10", satuan: "Lembaran", proyek: "Hermina Banyumanik", noSpk: "97/SP/RSHPDN/I/2026" },
    { namaBarang: "Cat putih", qty: "5", satuan: "Kaleng", proyek: "Hermina Banyumanik", noSpk: "97/SP/RSHPDN/I/2026" },
  ];

  const lampiran = [
    { label: "Rekap Dokubah", file: "Rekap.jpg" },
    { label: "Kartu Stok", file: "Stok.jpg" },
  ];

  // Tambahkan baris kosong agar tabel minimal 8 baris
  const MIN_ROWS = 8;
  const emptyRows = Math.max(MIN_ROWS - daftarBarang.length, 0);

  return (
    <div className="flex flex-col min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-800 hover:opacity-70 transition-opacity">
          <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
        </button>
        <h1 className="text-[18px] font-extrabold text-black tracking-wide">
          Permintaan Pembelian Gudang
        </h1>
      </div>

      <div className="max-w-[70rem] w-full">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 px-8 py-10 w-full mb-6">
          <div className="text-center mb-10 w-full">
            <h2 className="text-[18px] font-bold text-gray-900 tracking-wide">Permintaan Pembelian</h2>
          </div>

          {/* Info Permintaan */}
          <div className="flex flex-col gap-3 mb-8 w-full max-w-md">
            {infoPermintaan.map((info) => (
              <div key={info.label} className="flex items-center">
                <span className="w-[150px] text-sm text-gray-700">{info.label}</span>
                <span className="w-6 text-center text-gray-700">:</span>
                <div className="flex-1 border border-gray-200 rounded-lg py-2 px-4 text-sm text-gray-800 bg-white">
                  {info.value}
                </div>
              </div>
            ))}
          </div>

          <hr className="border-t border-gray-400 mb-6" />

          {/* Detail Barang */}
          <h3 className="text-[16px] font-bold text-gray-900 mb-4">Detail Barang</h3>

          <div className="overflow-x-auto w-full mb-8">
            <table className="w-full text-sm border-collapse [&_th]:border [&_td]:border [&_th]:border-gray-300 [&_td]:border-gray-300">
              <thead className="text-gray-900 font-semibold">
                <tr>
                  <th className="px-3 py-2 w-12 text-left">No.</th>
                  <th className="px-3 py-2 text-center">Nama Barang</th>
                  <th className="px-3 py-2 w-24 text-center">QTY</th>
                  <th className="px-3 py-2 w-28 text-center">Satuan</th>
                  <th className="px-3 py-2 w-44 text-center">Proyek</th>
                  <th className="px-3 py-2 w-52 text-center">No SPK</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {daftarBarang.map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 h-10">{i + 1}.</td>
                    <td className="px-3 py-2">{row.namaBarang}</td>
                    <td className="px-3 py-2 text-center">{row.qty}</td>
                    <td className="px-3 py-2 text-center">{row.satuan}</td>
                    <td className="px-3 py-2 text-center">{row.proyek}</td>
                    <td className="px-3 py-2 text-center">{row.noSpk}</td>
                  </tr>
                ))}
                {Array.from({ length: emptyRows }, (_, i) => (
                  <tr key={`empty-${i}`}>
                    <td className="h-10"></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <hr className="border-t border-gray-400 mb-6" />

          {/* Lampiran */}
          <h3 className="text-[16px] font-bold text-gray-900 mb-10">Lampiran</h3>

          <div className="flex flex-col gap-6">
            {lampiran.map((item) => (
              <div key={item.label} className="flex items-center">
                <span className="w-40 text-[15px] font-bold text-gray-900">{item.label}</span>
                <span className="px-5 py-1 rounded-full bg-slate-200 text-gray-800 text-sm">
                  {item.file}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="flex justify-end gap-4 w-full">
          <button
            onClick={() => console.log("Revisi")}
            className="px-6 py-2 bg-[#ff8a00] text-white rounded-lg hover:bg-[#eb7d00] transition-colors font-semibold text-sm shadow-sm"
          >
            Revisi
          </button>
          <button
            onClick={() => console.log("Setuju")}
            className="px-6 py-2 bg-[#ff8a00] text-white rounded-lg hover:bg-[#eb7d00] transition-colors font-semibold text-sm shadow-sm"
          >
            Setuju
          </button>
        </div>
      </div>
    </div>
  );
}
