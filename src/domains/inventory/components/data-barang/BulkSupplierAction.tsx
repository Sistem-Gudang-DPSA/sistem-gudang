"use client";

import { useState } from "react";
import { Truck } from "lucide-react";
import { bulkAssignItemSupplier } from "@/domains/inventory/item-supplier";
import type { ItemListRow } from "@/domains/inventory/types";
import SupplierBulkModal, { TANPA_SUPPLIER } from "./modals/SupplierBulkModal";

export type SupplierMappingResult = {
  supplierName: string;
  assigned: number;
  failed: { id: number; name: string; reason: string }[];
};

const buttonClass = "flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium disabled:opacity-50";

// Tombol, modal, dan pemanggilan API untuk memetakan supplier ke banyak barang sekaligus.
// Hasil dikembalikan ke layar supaya bisa ditampilkan lengkap dan barang yang gagal tetap tercentang.
export default function BulkSupplierAction({
  selected,
  suppliers,
  canAssignSupplier,
  onFinished,
}: {
  selected: Map<number, ItemListRow>;
  suppliers: { id: number; name: string }[];
  canAssignSupplier: boolean;
  onFinished: (result: SupplierMappingResult) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");

  if (!canAssignSupplier) return null;

  const withSupplier = [...selected.values()].filter((item) => item.supplierId !== null).length;

  const buka = () => {
    setValue("");
    setError("");
    setProgress(null);
    setOpen(true);
  };
  const tutup = () => {
    if (!saving) setOpen(false);
  };

  const simpan = async () => {
    if (!value) {
      setError("Pilih supplier dulu.");
      return;
    }
    const supplierId = value === TANPA_SUPPLIER ? null : Number(value);
    const supplierName = supplierId === null
      ? "Tanpa supplier"
      : suppliers.find((s) => s.id === supplierId)?.name ?? "-";
    const ids = [...selected.keys()];

    setSaving(true);
    setError("");
    setProgress({ done: 0, total: ids.length });
    try {
      const res = await bulkAssignItemSupplier(ids, supplierId, (done, total) => setProgress({ done, total }));
      setOpen(false);
      setValue("");
      onFinished({
        supplierName,
        assigned: res.assigned,
        failed: res.failed.map((f) => ({
          id: f.id,
          name: selected.get(f.id)?.name ?? `#${f.id}`,
          reason: f.reason,
        })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan supplier.");
    } finally {
      setSaving(false);
      setProgress(null);
    }
  };

  return (
    <>
      <button type="button" onClick={buka} disabled={selected.size === 0} className={buttonClass}>
        <Truck className="w-4 h-4" />
        {`Atur Supplier (${selected.size})`}
      </button>
      {open && (
        <SupplierBulkModal
          count={selected.size}
          withSupplier={withSupplier}
          suppliers={suppliers}
          value={value}
          onChange={setValue}
          onSave={simpan}
          onClose={tutup}
          saving={saving}
          progress={progress}
          error={error}
        />
      )}
    </>
  );
}
