"use client";

import { Fragment, useState } from "react";
import { useApiData } from "@/shared/lib/use-api-data";
import { usePage } from "@/shared/lib/use-page";
import Pagination from "@/shared/components/Pagination";
import { listAuditLogs, listAuditTables } from "@/domains/superadmin/api";
import type { AuditAction } from "@/domains/superadmin/types";
import { waktuEdit } from "@/domains/inventory/components/RiwayatEditBarangKeluar";

const PAGE_SIZE = 20;

const actions: Record<AuditAction, string> = {
  CREATE: "Tambah",
  UPDATE: "Ubah",
  DELETE: "Hapus",
  CANCEL: "Batal",
};

const json = (value: unknown) => (value == null ? "-" : JSON.stringify(value, null, 2));

export default function LogAktivitas() {
  const [tableName, setTableName] = useState("");
  const [action, setAction] = useState<AuditAction | "">("");
  const [recordId, setRecordId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const filterKey = [tableName, action, recordId, startDate, endDate].join("|");
  const [page, setPage] = usePage(filterKey);

  const { data: tables } = useApiData(listAuditTables, "audit-tables", "Gagal memuat daftar tabel.");
  const { data, loading, error, reload } = useApiData(
    () =>
      listAuditLogs({
        page,
        pageSize: PAGE_SIZE,
        tableName: tableName || undefined,
        action: action || undefined,
        recordId: Number(recordId) || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    `${page}|${filterKey}`,
    "Gagal memuat log aktivitas.",
  );

  const field = "rounded-lg border border-gray-200 px-3 py-2 text-sm";

  return (
    <div className="pb-10">
      <h1 className="mb-5 text-lg font-extrabold uppercase">Log Aktivitas</h1>
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-end gap-3 border-b border-gray-100 p-5 text-sm">
          <label className="flex flex-col gap-1 font-semibold">
            Tabel
            <select value={tableName} onChange={(e) => setTableName(e.target.value)} className={field}>
              <option value="">Semua</option>
              {tables?.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 font-semibold">
            Aksi
            <select value={action} onChange={(e) => setAction(e.target.value as typeof action)} className={field}>
              <option value="">Semua</option>
              {Object.entries(actions).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 font-semibold">
            ID Data
            <input
              inputMode="numeric"
              value={recordId}
              onChange={(e) => setRecordId(e.target.value.replace(/\D/g, ""))}
              className={`${field} w-28`}
            />
          </label>
          <label className="flex flex-col gap-1 font-semibold">
            Dari
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={field} />
          </label>
          <label className="flex flex-col gap-1 font-semibold">
            Sampai
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={field} />
          </label>
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="ml-auto font-semibold text-indigo-600 disabled:opacity-50"
          >
            Muat ulang
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {["Waktu", "Pengguna", "Aksi", "Tabel", "ID Data", ""].map((label, i) => (
                  <th key={i} className="px-5 py-4">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    Memuat log...
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td role="alert" colSpan={6} className="p-8 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                data?.rows.map((r) => (
                  <Fragment key={r.id}>
                    <tr>
                      <td className="px-5 py-4 whitespace-nowrap">{waktuEdit(r.createdAt)} WIB</td>
                      <td className="px-5 py-4">{r.username ?? "-"}</td>
                      <td className="px-5 py-4">{actions[r.action] ?? r.action}</td>
                      <td className="px-5 py-4 font-mono text-xs">{r.tableName}</td>
                      <td className="px-5 py-4">{r.recordId}</td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          aria-expanded={open === r.id}
                          onClick={() => setOpen(open === r.id ? null : r.id)}
                          className="text-xs font-semibold text-indigo-600"
                        >
                          {open === r.id ? "Tutup" : "Detail"}
                        </button>
                      </td>
                    </tr>
                    {open === r.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={6} className="px-5 py-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            {(
                              [
                                ["Sebelum", r.oldValues],
                                ["Sesudah", r.newValues],
                              ] as const
                            ).map(([label, value]) => (
                              <div key={label}>
                                <p className="mb-1 text-xs font-semibold text-gray-500">{label}</p>
                                <pre className="max-h-80 overflow-auto rounded-lg border border-gray-200 bg-white p-3 text-xs">
                                  {json(value)}
                                </pre>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              {!loading && !error && data?.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    Tidak ada log.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={data?.total ?? 0} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>
    </div>
  );
}
