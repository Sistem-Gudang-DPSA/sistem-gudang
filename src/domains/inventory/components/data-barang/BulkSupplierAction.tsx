"use client";

import { Truck } from "lucide-react";
import type { ItemListRow } from "@/domains/inventory/types";
import { useBulkSupplierAction, type SupplierMappingResult } from "./useBulkSupplierAction";

export type { SupplierMappingResult };

const buttonClass = "flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium disabled:opacity-50";

// Tombol Atur Supplier untuk layar yang tidak memakai menu aksi massal.
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
  const action = useBulkSupplierAction({ selected, suppliers, canAssignSupplier, onFinished });
  if (!action.allowed) return null;

  return (
    <>
      <button type="button" onClick={action.open} disabled={selected.size === 0} className={buttonClass}>
        <Truck className="w-4 h-4" />
        {`Atur Supplier (${selected.size})`}
      </button>
      {action.modal}
    </>
  );
}
