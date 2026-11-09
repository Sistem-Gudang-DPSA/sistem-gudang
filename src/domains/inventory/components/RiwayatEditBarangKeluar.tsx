"use client";

import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { getOutboundEditHistory } from "../api";
import { outboundEditChanges } from "../outbound-edit-history";
import { useApiData } from "@/shared/lib/use-api-data";

export const waktuEdit = (value: string) =>
  new Date(value).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

export default function RiwayatEditBarangKeluar({
  id,
  onClose,
}: {
  id: number;
  onClose: () => void;
}) {
  const { data, loading, error, reload } = useApiData(
    () => getOutboundEditHistory(id),
    String(id),
    "Gagal memuat riwayat edit.",
  );
  const before = data?.beforeValues;
  const after = data?.afterValues;
  const changes = before && after ? outboundEditChanges(before, after) : [];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="riwayat-edit-title"
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup riwayat edit"
          className="absolute right-5 top-5 p-1 text-gray-500"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 id="riwayat-edit-title" className="pr-8 text-lg font-bold">
          Riwayat Edit Barang Keluar #{id}
        </h2>
        {loading && <p className="mt-4 text-gray-500">Memuat riwayat...</p>}
        {error && (
          <div role="alert" className="mt-4 text-red-600">
            {error}{" "}
            <button type="button" onClick={reload} className="underline">
              Coba lagi
            </button>
          </div>
        )}
        {!loading && !error && !data && (
          <p className="mt-4 text-gray-500">Belum ada pengajuan edit.</p>
        )}
        {!loading && !error && data && (
          <>
            <dl className="my-4 space-y-2 text-sm">
              <div>
                <dt className="inline font-semibold">Diajukan: </dt>
                <dd className="inline">
                  {data.requestedByName} · {waktuEdit(data.requestedAt)} WIB
                </dd>
              </div>
              {data.reviewedAt && (
                <div>
                  <dt className="inline font-semibold">
                    {data.status === "REJECTED" ? "Ditolak" : "Disetujui"}:{" "}
                  </dt>
                  <dd className="inline">
                    {data.reviewedByName} · {waktuEdit(data.reviewedAt)} WIB
                  </dd>
                </div>
              )}
              {data.editedAt && (
                <div>
                  <dt className="inline font-semibold">Diedit: </dt>
                  <dd className="inline">
                    {data.requestedByName} · {waktuEdit(data.editedAt)} WIB
                  </dd>
                </div>
              )}
            </dl>
            {data.status === "PENDING" && (
              <p className="text-sm text-amber-700">Menunggu persetujuan superadmin.</p>
            )}
            {data.status === "APPROVED" && (
              <p className="text-sm text-green-700">
                Disetujui. Izin edit satu kali belum digunakan.
              </p>
            )}
            {before && after && (
              <div className="mt-5">
                <h3 className="font-semibold text-gray-900">Rincian Perubahan</h3>
                <p className="mb-3 mt-1 text-sm text-gray-500">
                  {changes.length} data diubah oleh gudang.
                </p>
                {changes.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table
                      aria-label="Data yang diubah oleh gudang"
                      className="w-full text-left text-sm"
                    >
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="p-3">
                            Data
                          </th>
                          <th scope="col" className="p-3">
                            Sebelum
                          </th>
                          <th scope="col" className="p-3">
                            Sesudah
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {changes.map((change, index) => (
                          <tr key={index}>
                            <th scope="row" className="p-3 font-medium">
                              {change.field}
                            </th>
                            <td className="whitespace-pre-wrap break-words p-3 text-gray-600">
                              {change.before}
                            </td>
                            <td className="whitespace-pre-wrap break-words bg-green-50/50 p-3 font-medium text-green-800">
                              {change.after}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                    Transaksi disimpan tanpa perubahan data.
                  </p>
                )}
              </div>
            )}
            {data.status === "USED" && (!before || !after) && (
              <p role="status" className="mt-4 text-sm text-gray-500">
                Rincian perubahan belum tersedia untuk transaksi ini.
              </p>
            )}
          </>
        )}
      </section>
    </div>,
    document.body,
  );
}
