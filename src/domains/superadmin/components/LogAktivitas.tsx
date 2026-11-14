"use client";

import { Fragment, useState } from "react";
import { ChevronDown, RotateCw } from "lucide-react";
import { useApiData } from "@/shared/lib/use-api-data";
import { usePage } from "@/shared/lib/use-page";
import Pagination from "@/shared/components/Pagination";
import StatusBadge, { type BadgeTone } from "@/shared/components/StatusBadge";
import { listAuditLogs, listAuditTables } from "@/domains/superadmin/api";
import type { AuditAction, AuditLog } from "@/domains/superadmin/types";

const PAGE_SIZE = 20;

const ACTIONS: Record<AuditAction, { label: string; tone: BadgeTone }> = {
  CREATE: { label: "Tambah", tone: "green" },
  UPDATE: { label: "Ubah", tone: "blue" },
  DELETE: { label: "Hapus", tone: "red" },
  CANCEL: { label: "Batal", tone: "amber" },
};

// Backend table names in words people use; unknown tables fall back to the raw name.
const TABLES: Record<string, string> = {
  items: "Barang",
  locations: "Lokasi",
  suppliers: "Supplier",
  item_supplier_prices: "Harga Supplier",
  inbound_transactions: "Barang Masuk",
  inbound_returns: "Retur Barang Masuk",
  outbound_transactions: "Barang Keluar",
  stock_opnames: "Stock Opname",
  material_requests: "Permintaan Barang",
  approval_requests: "Persetujuan",
  dokubah: "Dokubah",
  dokubah_checklists: "Checklist Dokubah",
  spk_internal: "SPK Internal",
  spk_internal_lines: "Baris SPK Internal",
  penawaran_harga: "Penawaran Harga",
  purchase_mappings: "Mapping Pembelian",
  purchase_orders: "Purchase Order",
};

const FIELDS: Record<string, string> = {
  stock: "Stok",
  reason: "Alasan",
  name: "Nama",
  code: "Kode",
  status: "Status",
  qty: "Jumlah",
  price: "Harga",
  locationId: "Lokasi",
  supplierId: "Supplier",
  categoryId: "Kategori",
  unitId: "Satuan",
  note: "Catatan",
  notes: "Catatan",
};

const tableLabel = (t: string) => TABLES[t] ?? t;
// camelCase / snake_case key to "Sentence case" when it has no label.
const fieldLabel = (k: string) =>
  FIELDS[k] ?? k.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());

const tanggal = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
const jam = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Jakarta" });

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return v.toLocaleString("id-ID");
  if (typeof v === "boolean") return v ? "Ya" : "Tidak";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : v == null ? {} : { nilai: v };

function Perubahan({ log }: { log: AuditLog }) {
  const before = asRecord(log.oldValues);
  const after = asRecord(log.newValues);
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  if (keys.length === 0) return <p className="text-sm text-gray-500">Tidak ada detail nilai yang disimpan.</p>;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-2.5 text-left font-semibold">Kolom</th>
            <th className="px-4 py-2.5 text-left font-semibold">Sebelum</th>
            <th className="px-4 py-2.5 text-left font-semibold">Sesudah</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {keys.map((k) => {
            const changed = JSON.stringify(before[k]) !== JSON.stringify(after[k]);
            return (
              <tr key={k} className={changed ? "bg-amber-50/60" : undefined}>
                <td className="px-4 py-2.5 font-medium text-gray-700">{fieldLabel(k)}</td>
                <td className={`px-4 py-2.5 break-all ${changed && k in before ? "text-red-600 line-through decoration-red-300" : "text-gray-600"}`}>
                  {k in before ? formatValue(before[k]) : "—"}
                </td>
                <td className={`px-4 py-2.5 break-all ${changed ? "font-semibold text-emerald-700" : "text-gray-600"}`}>
                  {k in after ? formatValue(after[k]) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function LogAktivitas() {
  const [tableName, setTableName] = useState("");
  const [action, setAction] = useState<AuditAction | "">("");
  const [recordId, setRecordId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const filterKey = [tableName, action, recordId, startDate, endDate].join("|");
  const [page, setPage] = usePage(filterKey);
  const filtered = filterKey !== "||||";

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

  const reset = () => {
    setTableName("");
    setAction("");
    setRecordId("");
    setStartDate("");
    setEndDate("");
  };

  const field =
    "h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
  const label = "flex flex-col gap-1.5 text-xs font-medium text-gray-500";

  return (
    <div className="pb-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Log Aktivitas</h1>
          <p className="mt-1 text-sm text-gray-500">Jejak setiap perubahan data: siapa, kapan, dan apa yang berubah.</p>
        </div>
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Muat ulang
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-end gap-3 border-b border-gray-100 p-5">
          <label className={label}>
            Data
            <select value={tableName} onChange={(e) => setTableName(e.target.value)} className={`${field} min-w-44`}>
              <option value="">Semua data</option>
              {tables
                ?.map((t) => [t, tableLabel(t)] as const)
                .sort((a, b) => a[1].localeCompare(b[1], "id"))
                .map(([t, l]) => (
                  <option key={t} value={t}>
                    {l}
                  </option>
                ))}
            </select>
          </label>
          <label className={label}>
            Aksi
            <select value={action} onChange={(e) => setAction(e.target.value as typeof action)} className={`${field} min-w-32`}>
              <option value="">Semua aksi</option>
              {Object.entries(ACTIONS).map(([value, a]) => (
                <option key={value} value={value}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            ID Data
            <input
              inputMode="numeric"
              placeholder="mis. 42"
              value={recordId}
              onChange={(e) => setRecordId(e.target.value.replace(/\D/g, ""))}
              className={`${field} w-28`}
            />
          </label>
          <label className={label}>
            Dari tanggal
            <input type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} className={field} />
          </label>
          <label className={label}>
            Sampai tanggal
            <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className={field} />
          </label>
          {filtered && (
            <button type="button" onClick={reset} className="h-10 px-2 text-sm font-medium text-gray-500 hover:text-gray-800">
              Hapus filter
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Waktu</th>
                <th className="px-5 py-3 font-semibold">Pengguna</th>
                <th className="px-5 py-3 font-semibold">Aksi</th>
                <th className="px-5 py-3 font-semibold">Data</th>
                <th className="w-12 px-5 py-3">
                  <span className="sr-only">Detail</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-gray-400">
                    Memuat log...
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td role="alert" colSpan={5} className="p-10 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                data?.rows.map((r) => {
                  const isOpen = open === r.id;
                  const a = ACTIONS[r.action] ?? { label: r.action, tone: "gray" as const };
                  const toggle = () => setOpen(isOpen ? null : r.id);
                  const at = new Date(r.createdAt);
                  return (
                    <Fragment key={r.id}>
                      <tr onClick={toggle} className={`cursor-pointer transition-colors hover:bg-gray-50 ${isOpen ? "bg-indigo-50/40" : ""}`}>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{tanggal.format(at)}</div>
                          <div className="text-xs text-gray-500">{jam.format(at)} WIB</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold uppercase text-indigo-700">
                              {(r.username ?? "?").slice(0, 1)}
                            </span>
                            <span className="font-medium text-gray-800">{r.username ?? "Pengguna terhapus"}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge tone={a.tone}>{a.label}</StatusBadge>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-gray-800">
                            {tableLabel(r.tableName)} <span className="font-normal text-gray-400">#{r.recordId}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-label={`Detail log ${r.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggle();
                            }}
                            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          >
                            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-gray-50/70">
                          <td colSpan={5} className="px-5 pt-1 pb-5">
                            <Perubahan log={r} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              {!loading && !error && data?.rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-gray-400">
                    {filtered ? "Tidak ada log yang cocok dengan filter." : "Belum ada log."}
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
