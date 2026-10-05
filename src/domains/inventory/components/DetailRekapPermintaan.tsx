"use client";

<<<<<<< HEAD:src/domains/gudang/components/DetailRekapPermintaan.tsx
import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { RekapPermintaanItems } from "../types";
=======
import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { ApiError } from "@/shared/lib/api-client";
import { listItems } from "@/domains/inventory/api";
import type { ItemListRow } from "@/domains/inventory/types";
import { getDokubah, listDokubah } from "@/domains/ppic/api";
import type { DokubahItem } from "@/domains/ppic/data/dokubah";
import { getMaterialRequest } from "../api";
import { getQuotaStatus } from "../quota";
import type { MaterialRequestDetail } from "../types";
>>>>>>> 57a09a7a1d83afe9056698d497f4205f76edaf5c:src/domains/inventory/components/DetailRekapPermintaan.tsx

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
<<<<<<< HEAD:src/domains/gudang/components/DetailRekapPermintaan.tsx
    ? new Date(value).toLocaleDateString("id-ID", {
=======
    ? new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString("id-ID", {
>>>>>>> 57a09a7a1d83afe9056698d497f4205f76edaf5c:src/domains/inventory/components/DetailRekapPermintaan.tsx
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

export default function DetailRekapPermintaan() {
  const router = useRouter();
<<<<<<< HEAD:src/domains/gudang/components/DetailRekapPermintaan.tsx
  const [data, setData] = useState<RekapPermintaanItems[]>([]);

  // Header diambil dari baris pertama (kosong jika data belum ada)
  const header = data[0];
=======
  const params = useParams<{ id: string }>();
  const requestId = Number(params.id);

  const [detail, setDetail] = useState<MaterialRequestDetail | null>(null);
  const [stock, setStock] = useState<ItemListRow[]>([]);
  // Dokubah of the request's SPK: the quota that decides whether the items can be taken.
  const [dokubah, setDokubah] = useState<DokubahItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [d, items] = await Promise.all([
          getMaterialRequest(requestId),
          listItems({ pageSize: 100 }),
        ]);
        setDetail(d);
        setStock(items.rows);
        // No dokubah (or no dokubah.view permission) just means the quota is unknown.
        const match = (await listDokubah({ search: d.spk, pageSize: 100 }).catch(() => null))?.rows.find((x) => x.noSpk === d.spk);
        setDokubah(match ? await getDokubah(match.id).catch(() => null) : null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Gagal memuat detail permintaan.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [requestId]);

    const rows = useMemo(() => {
        const stokById = new Map(stock.map((s) => [s.id, s.stock]));
        return (detail?.lines ?? []).map((line) => {
        const stokGudang = stokById.get(line.itemId) ?? null;
        const bahan = dokubah?.bahan.find((b) => b.kodeBarang === line.itemCode);
        const sisaKuota = bahan ? bahan.kuota - bahan.realisasi : null;
        const status = getQuotaStatus(sisaKuota, line.qty);
        return { ...line, stokGudang, sisaKuota, status };
        });
    }, [detail, stock, dokubah]);

    const header = detail;
>>>>>>> 57a09a7a1d83afe9056698d497f4205f76edaf5c:src/domains/inventory/components/DetailRekapPermintaan.tsx

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
<<<<<<< HEAD:src/domains/gudang/components/DetailRekapPermintaan.tsx
          <InfoRow label="Kepala Group Tukang" value={header?.grupTukang} />
          <InfoRow label="Item Pekerjaan" value={header?.itemProduksi} />
          <InfoRow label="Nama Proyek" value={header?.namaKlien} />
=======
          <InfoRow label="Kepala Group Tukang" value={header?.toolGroup} />
          <InfoRow label="Item Pekerjaan" value={header?.productionItem} />
          <InfoRow label="Nama Proyek" value={header?.clientName} />
>>>>>>> 57a09a7a1d83afe9056698d497f4205f76edaf5c:src/domains/inventory/components/DetailRekapPermintaan.tsx
        </div>
        <div className="flex flex-col gap-4">
          <InfoRow
            label="Tanggal Mulai"
<<<<<<< HEAD:src/domains/gudang/components/DetailRekapPermintaan.tsx
            value={formatTanggal(header?.tanggalMulai)}
=======
            value={formatTanggal(dokubah?.tanggalMulai)}
>>>>>>> 57a09a7a1d83afe9056698d497f4205f76edaf5c:src/domains/inventory/components/DetailRekapPermintaan.tsx
            labelWidth="w-[110px]"
          />
          <InfoRow
            label="Tanggal Selesai"
<<<<<<< HEAD:src/domains/gudang/components/DetailRekapPermintaan.tsx
            value={formatTanggal(header?.tanggalSelesai)}
=======
            value={formatTanggal(dokubah?.tanggalSelesai)}
>>>>>>> 57a09a7a1d83afe9056698d497f4205f76edaf5c:src/domains/inventory/components/DetailRekapPermintaan.tsx
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
<<<<<<< HEAD:src/domains/gudang/components/DetailRekapPermintaan.tsx
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
=======
            {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Memuat data...</td></tr>
                ) : error ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-red-500">{error}</td></tr>
                ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Belum ada data bahan.</td></tr>
                ) : (
                rows.map((row, index) => (
                    <tr key={row.itemId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-center text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{row.itemName}</td>
                    <td className="px-4 py-3 text-center">{row.qty}</td>
                    <td className="px-4 py-3 text-center">{row.sisaKuota ?? "-"}</td>
                    <td className="px-4 py-3 text-center">{row.stokGudang ?? "-"}</td>
                    <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${
                        row.status === "Approved" ? "bg-green-100 text-green-800"
                        : row.status === "Perlu Approval" ? "bg-amber-100 text-amber-800"
                        : "bg-gray-100 text-gray-600"
                        }`}>{row.status}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                        <button className="text-blue-500 hover:text-blue-700">Edit</button>
                    </td>
                    </tr>
                ))
                )}
>>>>>>> 57a09a7a1d83afe9056698d497f4205f76edaf5c:src/domains/inventory/components/DetailRekapPermintaan.tsx
          </tbody>
        </table>
      </div>
    </div>
  );
}