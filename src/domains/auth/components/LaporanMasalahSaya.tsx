"use client";

import { useState } from "react";
import { MessageSquareWarning } from "lucide-react";
import { fileUrl } from "@/shared/lib/api-client";
import { useApiData } from "@/shared/lib/use-api-data";
import Pagination from "@/shared/components/Pagination";
import { listMyBugReports } from "@/domains/superadmin/api";
import type { BugReport, BugReportStatus } from "@/domains/superadmin/types";
import { waktuEdit } from "@/domains/inventory/components/RiwayatEditBarangKeluar";
import LaporMasalahModal from "./LaporMasalahModal";

const PAGE_SIZE = 20;
const statusInfo: Record<BugReportStatus, { label: string; className: string }> = {
  OPEN: { label: "Baru", className: "bg-gray-100 text-gray-600" },
  DIPROSES: { label: "Diproses", className: "bg-amber-100 text-amber-700" },
  SELESAI: { label: "Selesai", className: "bg-green-100 text-green-700" },
};
const COLUMNS = ["Waktu", "Deskripsi", "Screenshot", "Status", "Catatan IT"];

export default function LaporanMasalahSaya() {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState("");
  const { data, loading, error, reload } = useApiData(
    () => listMyBugReports({ page, pageSize: PAGE_SIZE }),
    `laporan-saya|${page}`,
    "Gagal memuat laporan.",
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col justify-start mb-8 gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">LAPORAN MASALAH</h1>
        <p className="text-gray-500 text-sm">Riwayat laporan masalah Anda dan tanggapan dari tim IT.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between gap-4">
          {success ? (
            <p role="status" className="text-sm text-green-700">
              {success}
            </p>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => {
              setSuccess("");
              setOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 hover:bg-blue-700"
          >
            <MessageSquareWarning className="h-4 w-4" />
            Lapor Masalah
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {COLUMNS.map((label) => (
                  <th key={label} className="px-5 py-4">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={COLUMNS.length} className="p-8 text-center text-gray-400">
                    Memuat laporan...
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td role="alert" colSpan={COLUMNS.length} className="p-8 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                data?.rows.map((r: BugReport) => (
                  <tr key={r.id}>
                    <td className="px-5 py-4 whitespace-nowrap">{waktuEdit(r.createdAt)} WIB</td>
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
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusInfo[r.status].className}`}>
                        {statusInfo[r.status].label}
                      </span>
                    </td>
                    <td className="px-5 py-4 max-w-sm whitespace-pre-wrap">{r.itNote ?? "-"}</td>
                  </tr>
                ))}
              {!loading && !error && data?.rows.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="p-8 text-center text-gray-400">
                    Belum ada laporan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={data?.total ?? 0} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>

      {open && (
        <LaporMasalahModal
          onClose={() => setOpen(false)}
          onSent={() => {
            setOpen(false);
            setSuccess("Laporan terkirim. Terima kasih.");
            if (page === 1) reload();
            else setPage(1);
          }}
        />
      )}
    </div>
  );
}
