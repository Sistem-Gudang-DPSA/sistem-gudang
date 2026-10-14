"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getRequestMapping, listSuppliers, saveRequestMapping } from "@/domains/purchasing/api";
import type { MappingLine, MappingStatus, PurchaseRequestMapping, SaveMappingInput } from "@/domains/purchasing/types";
import { lihatPermintaanPath } from "@/domains/purchasing/data/pembelian";
import { useCan } from "@/domains/auth/user-context";
import { ApiError } from "@/shared/lib/api-client";
import { useApiData } from "@/shared/lib/use-api-data";
import { INTEGER_INPUT, digitsOnly } from "@/shared/lib/input";

const cellClass = "px-3 py-2 border-b border-r border-gray-300";
const headClass = "px-3 py-2 border-b border-r border-gray-300 text-center";
const fieldClass = "w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors disabled:bg-gray-50 disabled:cursor-default";
const orangeButtonClass = "min-w-24 px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm text-center disabled:opacity-50 disabled:cursor-not-allowed";
const ghostButtonClass = "px-3 py-1.5 border border-gray-300 text-gray-800 font-semibold rounded-lg hover:bg-gray-50 transition-all text-xs disabled:opacity-50";

const STATUS_LABEL: Record<MappingStatus, string> = { NOT_STARTED: "Belum dimulai", PARTIAL: "Sebagian", COMPLETE: "Lengkap" };
const STATUS_CLASS: Record<MappingStatus, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-700",
  PARTIAL: "bg-amber-100 text-amber-800",
  COMPLETE: "bg-green-100 text-green-700",
};

const poPath = (purchaseOrderId: number) => `/dashboard/purchasing/transaksi/po/${purchaseOrderId}`;

// Draft row: supplier and qty are kept as strings so the inputs stay controlled while typing.
interface DraftRow {
  supplierId: string;
  supplierName: string;
  qty: string;
  purchaseOrderId: number | null;
  nomorPo: string | null;
}

interface DraftLine {
  lineIndex: number;
  rows: DraftRow[];
}

const emptyRow = (): DraftRow => ({ supplierId: "", supplierName: "", qty: "", purchaseOrderId: null, nomorPo: null });

const toDraft = (mapping: PurchaseRequestMapping): DraftLine[] =>
  mapping.lines.map((line) => ({
    lineIndex: line.lineIndex,
    rows: line.mappings.map((m) => ({
      supplierId: String(m.supplierId),
      supplierName: m.supplierName,
      qty: String(m.qty),
      purchaseOrderId: m.purchaseOrderId,
      nomorPo: m.nomorPo,
    })),
  }));

const sigOf = (entries: { supplierId: number; qty: number }[]) =>
  entries.map((e) => `${e.supplierId}:${e.qty}`).sort().join("|");

// Live checks that mirror the BE rules. Locked rows count toward the line total.
function lineIssues(rows: DraftRow[], lineQty: number): string[] {
  const issues: string[] = [];
  rows.forEach((r) => {
    if (r.purchaseOrderId != null) return;
    if (!r.supplierId) issues.push("Pilih supplier untuk setiap baris.");
    if (!(Number(r.qty) > 0)) issues.push("Qty setiap supplier harus lebih dari 0.");
  });
  const chosen = rows.map((r) => r.supplierId).filter(Boolean);
  if (new Set(chosen).size !== chosen.length) issues.push("Supplier tidak boleh ganda dalam satu barang.");
  if (rows.reduce((t, r) => t + (Number(r.qty) || 0), 0) > lineQty) issues.push("Total qty melebihi qty diminta.");
  return [...new Set(issues)];
}

export default function MappingSupplier() {
  const { id } = useParams<{ id: string }>();
  const canView = useCan("purchase-order.view");
  const canCreate = useCan("purchase-order.create");

  const { data, loading, error } = useApiData(() => getRequestMapping(id), id, "Gagal memuat mapping.");
  const { data: suppliersData } = useApiData(() => listSuppliers({ pageSize: 100 }), "suppliers", "Gagal memuat supplier.");
  const suppliers = suppliersData?.rows ?? [];

  // Server state and editable draft. Both reset whenever a new mapping arrives from the API.
  const [seen, setSeen] = useState<PurchaseRequestMapping | undefined>(undefined);
  const [server, setServer] = useState<PurchaseRequestMapping | undefined>(undefined);
  const [draft, setDraft] = useState<DraftLine[]>([]);
  if (data && data !== seen) {
    setSeen(data);
    setServer(data);
    setDraft(toDraft(data));
  }

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState("");

  const updateRow = (lineIndex: number, idx: number, patch: Partial<DraftRow>) =>
    setDraft((prev) =>
      prev.map((dl) =>
        dl.lineIndex !== lineIndex ? dl : { ...dl, rows: dl.rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)) },
      ),
    );

  const addRow = (lineIndex: number) =>
    setDraft((prev) => prev.map((dl) => (dl.lineIndex !== lineIndex ? dl : { ...dl, rows: [...dl.rows, emptyRow()] })));

  const removeRow = (lineIndex: number, idx: number) =>
    setDraft((prev) =>
      prev.map((dl) => (dl.lineIndex !== lineIndex ? dl : { ...dl, rows: dl.rows.filter((_, i) => i !== idx) })),
    );

  if (!canView) {
    return <p className="text-sm text-gray-600">Anda tidak memiliki akses untuk melihat mapping supplier.</p>;
  }
  if (loading) return <p className="text-sm text-gray-600">Memuat mapping...</p>;
  if (error || !server) return <p role="alert" className="text-sm text-red-600">{error || "Mapping tidak ditemukan."}</p>;

  // Only lines whose unlocked rows differ from the loaded data are sent.
  const changed = server.lines.flatMap((line) => {
    const dl = draft.find((d) => d.lineIndex === line.lineIndex);
    if (!dl) return [];
    const next = dl.rows
      .filter((r) => r.purchaseOrderId == null)
      .map((r) => ({ supplierId: Number(r.supplierId), qty: Number(r.qty) }));
    const prev = line.mappings
      .filter((m) => m.purchaseOrderId == null)
      .map((m) => ({ supplierId: m.supplierId, qty: m.qty }));
    return sigOf(next) === sigOf(prev) ? [] : [{ lineIndex: line.lineIndex, suppliers: next }];
  });

  const issuesByLine = new Map<number, string[]>();
  server.lines.forEach((line) => {
    const dl = draft.find((d) => d.lineIndex === line.lineIndex);
    issuesByLine.set(line.lineIndex, dl ? lineIssues(dl.rows, line.qty) : []);
  });
  const hasIssues = [...issuesByLine.values()].some((list) => list.length > 0);

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    setSaveOk("");
    try {
      const input: SaveMappingInput = { lines: changed };
      const res = await saveRequestMapping(id, input);
      setServer(res);
      setDraft(toDraft(res));
      setSaveOk("Mapping supplier berhasil disimpan.");
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Gagal menyimpan mapping.");
    } finally {
      setSaving(false);
    }
  };

  // Summary matrix from the saved data: distinct suppliers become columns.
  const supplierCols: { id: number; name: string }[] = [];
  server.lines.forEach((line) =>
    line.mappings.forEach((m) => {
      if (!supplierCols.some((c) => c.id === m.supplierId)) supplierCols.push({ id: m.supplierId, name: m.supplierName });
    }),
  );
  const colTotals = supplierCols.map((c) =>
    server.lines.reduce((t, line) => t + (line.mappings.find((m) => m.supplierId === c.id)?.qty ?? 0), 0),
  );

  const renderLine = (line: MappingLine, idx: number) => {
    const dl = draft.find((d) => d.lineIndex === line.lineIndex);
    const rows = dl?.rows ?? [];
    const mapped = rows.reduce((t, r) => t + (Number(r.qty) || 0), 0);
    const remaining = line.qty - mapped;
    const issues = issuesByLine.get(line.lineIndex) ?? [];
    const over = mapped > line.qty;

    return (
      <tbody key={line.lineIndex}>
        <tr className={over ? "bg-red-50" : ""}>
          <td className={`${cellClass} text-center`}>{idx + 1}</td>
          <td className={cellClass}>{line.namaBarang}</td>
          <td className={`${cellClass} text-right`}>{line.qty}</td>
          <td className={cellClass}>{line.satuan}</td>
          <td className={cellClass}>{line.proyek}</td>
          <td className={cellClass}>{line.noSpk}</td>
          <td className={`${cellClass} text-right`}>
            <span className={over ? "text-red-600 font-semibold" : ""}>{mapped}</span> / sisa{" "}
            <span className={remaining < 0 ? "text-red-600 font-semibold" : ""}>{remaining}</span>
          </td>
        </tr>
        <tr>
          <td colSpan={7} className="px-4 py-3 border-b border-gray-300 bg-gray-50">
            <div className="flex flex-col gap-2">
              {rows.length === 0 && <p className="text-xs text-gray-500">Belum ada supplier.</p>}
              {rows.map((row, i) => {
                if (row.purchaseOrderId != null) {
                  return (
                    <div key={i} className="flex items-center gap-3 text-sm text-gray-800">
                      <span className="flex-1">{row.supplierName}</span>
                      <span className="w-28 text-right">{row.qty}</span>
                      <Link href={poPath(row.purchaseOrderId)} className="text-orange-600 hover:underline w-40">
                        {row.nomorPo ?? "Lihat PO"}
                      </Link>
                    </div>
                  );
                }
                const takenByOthers = rows.filter((_, j) => j !== i).map((r) => r.supplierId);
                const options = suppliers.filter((s) => String(s.id) === row.supplierId || !takenByOthers.includes(String(s.id)));
                const listed = suppliers.some((s) => String(s.id) === row.supplierId);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <select
                      aria-label="Supplier"
                      value={row.supplierId}
                      disabled={!canCreate}
                      onChange={(e) => {
                        const picked = suppliers.find((s) => String(s.id) === e.target.value);
                        updateRow(line.lineIndex, i, { supplierId: e.target.value, supplierName: picked?.name ?? "" });
                      }}
                      className={`${fieldClass} flex-1 appearance-none cursor-pointer`}
                    >
                      <option value="">Pilih supplier</option>
                      {!listed && row.supplierId && <option value={row.supplierId}>{row.supplierName}</option>}
                      {options.map((s) => (
                        <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                      ))}
                    </select>
                    <input
                      {...INTEGER_INPUT}
                      aria-label="Qty"
                      maxLength={9}
                      value={row.qty}
                      disabled={!canCreate}
                      placeholder="Qty"
                      onChange={(e) => updateRow(line.lineIndex, i, { qty: digitsOnly(e.target.value) })}
                      className={`${fieldClass} w-28 text-right`}
                    />
                    {canCreate && (
                      <button type="button" onClick={() => removeRow(line.lineIndex, i)} className={ghostButtonClass}>
                        Hapus
                      </button>
                    )}
                  </div>
                );
              })}
              {canCreate && (
                <div>
                  <button type="button" onClick={() => addRow(line.lineIndex)} className={ghostButtonClass}>
                    + Tambah supplier
                  </button>
                </div>
              )}
              {issues.map((msg) => (
                <p key={msg} className="text-xs text-red-600">{msg}</p>
              ))}
            </div>
          </td>
        </tr>
      </tbody>
    );
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <Link href={lihatPermintaanPath(id)} aria-label="Kembali" className="text-gray-800 hover:opacity-70 transition-opacity">
          <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
        </Link>
        <h1 className="text-[18px] font-extrabold text-black tracking-wide">Mapping Supplier</h1>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_CLASS[server.status]}`}>
          {STATUS_LABEL[server.status]}
        </span>
      </div>

      {!canCreate && (
        <p className="mb-4 text-sm text-gray-600">Anda hanya dapat melihat mapping. Mengubah mapping memerlukan izin Buat PO.</p>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
          <thead className="bg-gray-100 text-gray-900 font-bold text-xs">
            <tr>
              <th scope="col" className={`${headClass} w-12`}>No</th>
              <th scope="col" className={headClass}>Nama Barang</th>
              <th scope="col" className={headClass}>Qty diminta</th>
              <th scope="col" className={headClass}>Satuan</th>
              <th scope="col" className={headClass}>Proyek</th>
              <th scope="col" className={headClass}>No SPK</th>
              <th scope="col" className={headClass}>Sudah dipetakan / sisa</th>
            </tr>
          </thead>
          {server.lines.map((line, idx) => renderLine(line, idx))}
        </table>

        <div className="flex flex-col items-end gap-3 mt-6">
          {saveError && <p role="alert" className="text-sm text-red-600">{saveError}</p>}
          {saveOk && <p className="text-sm text-green-700">{saveOk}</p>}
          {canCreate && (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || changed.length === 0 || hasIssues}
              className={orangeButtonClass}
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          )}
        </div>
      </div>

      <h2 className="text-base font-bold text-gray-900 mt-8 mb-3">Ringkasan Mapping</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
          <thead className="bg-gray-100 text-gray-900 font-bold text-xs">
            <tr>
              <th scope="col" className={headClass}>Nama Barang</th>
              <th scope="col" className={headClass}>Qty diminta</th>
              {supplierCols.map((c) => (
                <th key={c.id} scope="col" className={headClass}>{c.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {server.lines.map((line) => (
              <tr key={line.lineIndex}>
                <td className={cellClass}>{line.namaBarang}</td>
                <td className={`${cellClass} text-right`}>{line.qty}</td>
                {supplierCols.map((c) => {
                  const m = line.mappings.find((x) => x.supplierId === c.id);
                  if (!m) return <td key={c.id} className={`${cellClass} text-center text-gray-400`}>-</td>;
                  return (
                    <td key={c.id} className={`${cellClass} text-right`}>
                      <div>{m.qty}</div>
                      {m.purchaseOrderId != null ? (
                        <Link href={poPath(m.purchaseOrderId)} className="text-xs text-orange-600 hover:underline">
                          {m.nomorPo ?? "Lihat PO"}
                        </Link>
                      ) : (
                        <div className="text-xs text-gray-500">Belum PO</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot className="font-bold text-xs">
            <tr>
              <td className={cellClass} colSpan={2}>Total</td>
              {colTotals.map((total, i) => (
                <td key={supplierCols[i].id} className={`${cellClass} text-right`}>{total}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
