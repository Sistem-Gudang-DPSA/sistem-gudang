"use client";

import { useEffect, useRef, useState } from "react";
import { fileUrl } from "@/shared/lib/api-client";
import { useApiData } from "@/shared/lib/use-api-data";
import Pagination from "@/shared/components/Pagination";
import { listBugReports, updateBugReportStatus } from "@/domains/superadmin/api";
import type { BugReport, BugReportStatus } from "@/domains/superadmin/types";
import { waktuEdit } from "@/domains/inventory/components/RiwayatEditBarangKeluar";

const statuses: Record<BugReportStatus, string> = {
  OPEN: "Baru",
  DIPROSES: "Diproses",
  SELESAI: "Selesai",
};

export default function LaporanMasalah() {
  const [status, setStatus] = useState<BugReportStatus | "">("OPEN");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<number | null>(null);
  const acting = useRef(false);
  const [actionError, setActionError] = useState("");
  const { data, loading, error, reload } = useApiData(
    () => listBugReports({ page, pageSize: 20, status: status || undefined }),
    `${page}|${status}`,
    "Gagal memuat laporan masalah.",
  );
  useEffect(() => {
    const timer = setInterval(reload, 15_000);
    window.addEventListener("focus", reload);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", reload);
    };
  }, [reload]);

  const changeStatus = async (id: number, next: BugReportStatus) => {
    if (acting.current) return;
    acting.current = true;
    setBusy(id);
    setActionError("");
    try {
      await updateBugReportStatus(id, next);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal mengubah status laporan.");
    } finally {
      acting.current = false;
      setBusy(null);
    }
  };

  return (
    <div className="pb-10">
      <h1 className="mb-5 text-lg font-extrabold uppercase">Laporan Masalah</h1>
      {actionError && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {actionError}
        </p>
      )}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-5">
          <label htmlFor="laporan-masalah-status" className="text-sm font-semibold">
            Status
          </label>
          <select
            id="laporan-masalah-status"
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
                {["Waktu", "Pelapor", "Halaman", "Deskripsi", "Screenshot", "Status", "Aksi"].map((label) => (
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
                    Memuat laporan...
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
                data?.rows.map((r: BugReport) => (
                  <tr key={r.id}>
                    <td className="px-5 py-4 whitespace-nowrap">{waktuEdit(r.createdAt)} WIB</td>
                    <td className="px-5 py-4">
                      {r.reporterName}
                      <br />
                      <span className="text-xs text-gray-500">{r.reporterRole}</span>
                    </td>
                    <td className="px-5 py-4 max-w-xs break-all">
                      <a href={r.pageUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">
                        {r.pageUrl}
                      </a>
                    </td>
                    <td className="px-5 py-4 max-w-sm whitespace-pre-wrap">{r.description}</td>
                    <td className="px-5 py-4">
                      {r.screenshot ? (
                        <a href={fileUrl(r.screenshot.display)} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={fileUrl(r.screenshot.thumb)} alt={`Screenshot laporan ${r.id}`} className="h-16 w-16 rounded object-cover" />
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-5 py-4">{statuses[r.status]}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {r.status !== "DIPROSES" && (
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => void changeStatus(r.id, "DIPROSES")}
                            className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-600 disabled:opacity-50"
                          >
                            Diproses
                          </button>
                        )}
                        {r.status !== "SELESAI" && (
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => void changeStatus(r.id, "SELESAI")}
                            className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            Selesai
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              {!loading && !error && data?.rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    Tidak ada laporan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={data?.total ?? 0} pageSize={20} onPageChange={setPage} />
      </div>
    </div>
  );
}
