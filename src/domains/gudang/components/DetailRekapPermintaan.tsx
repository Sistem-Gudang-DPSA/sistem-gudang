"use client";

import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { RekapPermintaanItems } from "../types";

interface InfoRowProps {
  label: string;
  value?: string;
  labelWidth?: string;
}

function InfoRow({ label, value, labelWidth = "w-[150px]" }: InfoRowProps) {
  return (
    <div className="flex items-center">
      <span className={`${labelWidth} shrink-0 text-sm text-gray-700`}>{label}</span>
      <span className="w-6 shrink-0 text-center text-gray-700">:</span>
      <div className="flex min-h-[40px] flex-1 items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-900 shadow-sm">
        {value}
      </div>
    </div>
  );
}

const formatTanggal = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

export default function DetailRekapPermintaan() {
  const router = useRouter();
  const [data, setData] = useState<RekapPermintaanItems[]>([]);

  // Header diambil dari baris pertama (kosong jika data belum ada)
  const header = data[0];

  return (
    <div className="flex flex-col bg-white min-h-screen p-6">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.back()}
          className="text-gray-800 hover:opacity-70 transition-opacity"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
        </button>
        <h1 className="text-[19px] font-extrabold text-black tracking-wide">
          Detail Rekap Permintaan
        </h1>
      </div>

      <h2 className="mb-6 text-center text-[18px] font-bold text-gray-900">
        Permintaan Pengambilan Bahan
      </h2>

      {/* Informasi permintaan */}
      <div className="grid grid-cols-1 gap-x-16 gap-y-4 lg:grid-cols-2 mb-8">
        <div className="flex flex-col gap-4">
          <InfoRow label="Kepala Group Tukang" value={header?.grupTukang} />
          <InfoRow label="Item Pekerjaan" value={header?.itemProduksi} />
          <InfoRow label="Nama Proyek" value={header?.namaKlien} />
        </div>
        <div className="flex flex-col gap-4">
          <InfoRow
            label="Tanggal Mulai"
            value={formatTanggal(header?.tanggalMulai)}
            labelWidth="w-[110px]"
          />
          <InfoRow
            label="Tanggal Selesai"
            value={formatTanggal(header?.tanggalSelesai)}
            labelWidth="w-[110px]"
          />
        </div>
      </div>

      {/* Tabel bahan */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-100 font-semibold text-gray-700">
            <tr>
              <th className="px-4 py-3 text-center w-12">No</th>
              <th className="px-4 py-3 text-left">Item Bahan</th>
              <th className="px-4 py-3 text-center">Jumlah Permintaan</th>
              <th className="px-4 py-3 text-center">Sisa Kuota Dokubah</th>
              <th className="px-4 py-3 text-center">Stok Gudang</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Belum ada data bahan.
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-center text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{item.ItemBahan}</td>
                  <td className="px-4 py-3 text-center">{item.jumlahPermintaan}</td>
                  {/* <td className="px-4 py-3 text-center">{item.}</td>
                  <td className="px-4 py-3 text-center">{item.stokGudang}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full ${
                      item.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button className="text-blue-500 hover:text-blue-700">
                      Edit
                    </button>
                  </td>  */}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}