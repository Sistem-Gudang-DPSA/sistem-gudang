"use client";

import { useState } from "react";
import { bulkAssignItemSupplier } from "@/domains/inventory/item-supplier";
import type { ItemListRow } from "@/domains/inventory/types";
import SupplierBulkModal, { TANPA_SUPPLIER } from "./modals/SupplierBulkModal";

export type SupplierMappingResult = {
  supplierName: string;
  assigned: number;
  failed: { id: number; name: string; reason: string }[];
};

// State, modal, dan pemanggilan API untuk memetakan supplier ke banyak barang.
// Dipisah dari tombolnya supaya aksi ini bisa dipicu dari menu aksi massal.
export function useBulkSupplierAction({
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
  const [value, setValue] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");

  const items = [...selected.values()].map((item) => ({
    id: item.id,
    name: item.name,
    code: item.code,
    currentSupplier: item.suppliers?.length
      ? item.suppliers.map((supplier) => supplier.name).join(", ")
      : item.supplierId === null ? null : item.supplierName ?? suppliers.find((s) => s.id === item.supplierId)?.name ?? `#${item.supplierId}`,
  }));

  const buka = () => {
    const item = selected.size === 1 ? [...selected.values()][0] : undefined;
    setValue(item ? (item.suppliers?.map((supplier) => String(supplier.id)) ?? (item.supplierId === null ? [] : [String(item.supplierId)])) : []);
    setError("");
    setProgress(null);
    setOpen(true);
  };
  const tutup = () => {
    if (!saving) setOpen(false);
  };

  const simpan = async () => {
    if (!value.length) {
      setError("Pilih supplier dulu.");
      return;
    }
    const supplierIds = value.includes(TANPA_SUPPLIER) ? [] : value.map(Number);
    const supplierName = supplierIds.length === 0 ? "Tanpa supplier" : supplierIds.map((id) => suppliers.find((s) => s.id === id)?.name ?? `#${id}`).join(", ");
    const ids = [...selected.keys()];

    setSaving(true);
    setError("");
    setProgress({ done: 0, total: ids.length });
    try {
      const res = await bulkAssignItemSupplier(ids, supplierIds, (done, total) => setProgress({ done, total }));
      setOpen(false);
      setValue([]);
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

  return {
    allowed: canAssignSupplier,
    open: buka,
    modal: open ? (
      <SupplierBulkModal
        items={items}
        suppliers={suppliers}
        value={value}
        onChange={setValue}
        onSave={simpan}
        onClose={tutup}
        saving={saving}
        progress={progress}
        error={error}
      />
    ) : null,
  };
}
