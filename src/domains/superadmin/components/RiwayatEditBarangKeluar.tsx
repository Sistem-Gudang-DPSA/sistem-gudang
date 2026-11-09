"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listOutboundEditRequests } from "@/domains/inventory/api";
import DetailRiwayatEdit, {
  waktuEdit,
} from "@/domains/inventory/components/RiwayatEditBarangKeluar";
import Pagination from "@/shared/components/Pagination";
import { useApiData } from "@/shared/lib/use-api-data";
import { usePage } from "@/shared/lib/use-page";

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export default function RiwayatEditBarangKeluar() {
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = usePage(String(pageSize));
  const [historyId, setHistoryId] = useState<number | null>(null);
  const { data, loading, error, reload } = useApiData(
    () => listOutboundEditRequests({ page, pageSize, status: "USED" }),
    `outbound-edit-history|${page}|${pageSize}`,
    "Gagal memuat riwayat edit barang keluar.",
  );

  useEffect(() => {
    const timer = setInterval(reload, 15_000);
    window.addEventListener("focus", reload);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", reload);
    };
  }, [reload]);

  return (
    <div className="pb-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-extrabold uppercase">Riwayat Edit Barang Keluar</h1>
        <Link
          href="/dashboard/superadmin/transaksi/pengajuan-edit-barang-keluar"
          className="text-sm font-semibold text-indigo-600"
        >
          Lihat Pengajuan Edit
        </Link>
      </div>
      <p className="mb-5 text-sm text-gray-600">
        Daftar transaksi yang sudah diedit oleh gudang. Pilih Lihat Perubahan untuk melihat data
        yang diubah, nilai sebelum dan sesudah, pengedit, waktu edit, dan persetujuan superadmin.
      </p>
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-5">
          <span className="text-sm text-gray-600">{data?.total ?? 0} transaksi sudah diedit</span>
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="text-sm font-semibold text-indigo-600 disabled:opacity-50"
          >
            Muat ulang
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {[
                  "Transaksi",
                  "Client / SPK",
                  "Produk/Proyek",
                  "Diedit oleh",
                  "Waktu Edit",
                  "Action",
                ].map((label) => (
                  <th key={label} scope="col" className="px-5 py-4">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    Memuat riwayat...
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-red-600">
                    <p role="alert">{error}</p>
                    <button type="button" onClick={reload} className="mt-2 underline">
                      Coba lagi
                    </button>
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                data?.rows.map(({ request, outbound, requestedByName }) => (
                  <tr key={request.id}>
                    <td className="px-5 py-4 font-semibold">
                      {outbound.noTransaksi ?? outbound.id}
                    </td>
                    <td className="px-5 py-4">
                      {outbound.clientName}
                      <br />
                      <span className="text-xs text-gray-500">{outbound.spk}</span>
                    </td>
                    <td className="px-5 py-4">{outbound.itemName}</td>
                    <td className="px-5 py-4">{requestedByName}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      {request.editedAt ? `${waktuEdit(request.editedAt)} WIB` : "-"}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setHistoryId(outbound.id)}
                        aria-label={`Lihat perubahan barang keluar ${outbound.id}`}
                        className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                      >
                        Lihat Perubahan
                      </button>
                    </td>
                  </tr>
                ))}
              {!loading && !error && data?.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    Belum ada barang keluar yang diedit oleh gudang.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4">
          <label className="flex items-center justify-end gap-2 px-4 text-xs text-gray-500">
            Baris per halaman
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <Pagination
            page={page}
            total={data?.total ?? 0}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      </div>
      {historyId !== null && (
        <DetailRiwayatEdit id={historyId} onClose={() => setHistoryId(null)} />
      )}
    </div>
  );
}
