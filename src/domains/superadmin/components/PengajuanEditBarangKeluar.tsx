"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  approveOutboundEdit,
  listOutboundEditRequests,
  rejectOutboundEdit,
} from "@/domains/inventory/api";
import type { OutboundEditRequest } from "@/domains/inventory/types";
import RiwayatEditBarangKeluar, {
  waktuEdit,
} from "@/domains/inventory/components/RiwayatEditBarangKeluar";
import { useApiData } from "@/shared/lib/use-api-data";
import Pagination from "@/shared/components/Pagination";

const statuses = {
  PENDING: "Menunggu persetujuan",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  USED: "Sudah diedit",
};

export default function PengajuanEditBarangKeluar() {
  const [status, setStatus] = useState<OutboundEditRequest["status"] | "">("PENDING");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<number | null>(null);
  const acting = useRef(false);
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [historyId, setHistoryId] = useState<number | null>(null);
  const { data, loading, error, reload } = useApiData(
    () => listOutboundEditRequests({ page, pageSize: 20, status: status || undefined }),
    `${page}|${status}`,
    "Gagal memuat pengajuan edit barang keluar.",
  );
  useEffect(() => {
    const timer = setInterval(reload, 15_000);
    window.addEventListener("focus", reload);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", reload);
    };
  }, [reload]);

  const review = async (id: number, approve: boolean) => {
    if (acting.current) return;
    acting.current = true;
    setBusy(id);
    setActionError("");
    setMessage("");
    try {
      await (approve ? approveOutboundEdit(id) : rejectOutboundEdit(id));
      setMessage(
        approve
          ? "Pengajuan disetujui. Admin pengaju dapat mengedit transaksi satu kali."
          : "Pengajuan edit ditolak.",
      );
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal meninjau pengajuan.");
      reload();
    } finally {
      acting.current = false;
      setBusy(null);
    }
  };

  return (
    <div className="pb-10">
      <h1 className="mb-3 text-lg font-extrabold uppercase">Pengajuan Edit Barang Keluar</h1>
      <Link
        href="/dashboard/superadmin/laporan/riwayat-edit-barang-keluar"
        className="mb-4 inline-flex text-sm font-semibold text-indigo-600"
      >
        Lihat Riwayat Edit Gudang
      </Link>
      <p className="mb-5 text-sm text-gray-600">
        Pengajuan dibuat maksimal 24 jam setelah transaksi dicatat. Persetujuan memberi admin
        pengaju izin untuk satu kali penyimpanan perubahan, dengan riwayat sebelum dan sesudah edit.
      </p>
      {actionError && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {actionError}
        </p>
      )}
      {message && (
        <p role="status" className="mb-4 text-sm text-green-700">
          {message}
        </p>
      )}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-5">
          <label htmlFor="pengajuan-edit-status" className="text-sm font-semibold">
            Status
          </label>
          <select
            id="pengajuan-edit-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as typeof status);
              setPage(1);
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="">Semua</option>
            {Object.entries(statuses).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="ml-auto text-sm font-semibold text-indigo-600 disabled:opacity-50"
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
                  "Pengaju",
                  "Waktu Pengajuan",
                  "Status",
                  "Action",
                ].map((label) => (
                  <th key={label} className="px-5 py-4">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    Memuat pengajuan...
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td role="alert" colSpan={7} className="p-8 text-center text-red-600">
                    {error}
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
                    <td className="px-5 py-4 whitespace-nowrap">
                      {waktuEdit(request.requestedAt)} WIB
                    </td>
                    <td className="px-5 py-4">{statuses[request.status]}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {request.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              disabled={busy !== null}
                              onClick={() => void review(outbound.id, true)}
                              aria-label={`Setujui edit barang keluar ${outbound.id}`}
                              className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              {busy === outbound.id ? "Memproses..." : "Setujui"}
                            </button>
                            <button
                              type="button"
                              disabled={busy !== null}
                              onClick={() => void review(outbound.id, false)}
                              aria-label={`Tolak edit barang keluar ${outbound.id}`}
                              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50"
                            >
                              Tolak
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setHistoryId(outbound.id)}
                          aria-label={`Riwayat edit barang keluar ${outbound.id}`}
                          className="text-xs text-blue-600 underline"
                        >
                          Riwayat Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {!loading && !error && data?.rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    Tidak ada pengajuan edit.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={data?.total ?? 0} pageSize={20} onPageChange={setPage} />
      </div>
      {historyId !== null && (
        <RiwayatEditBarangKeluar id={historyId} onClose={() => setHistoryId(null)} />
      )}
    </div>
  );
}
