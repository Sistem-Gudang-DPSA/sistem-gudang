"use client";

import Modal from "@/shared/components/Modal";
import SearchableSelect from "@/shared/components/SearchableSelect";

export const TANPA_SUPPLIER = "none";

type Props = {
  count: number;
  withSupplier: number;
  suppliers: { id: number; name: string }[];
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  progress: { done: number; total: number } | null;
  error: string;
};

const cancelClass = "px-4 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm disabled:opacity-50";
const saveClass = "px-6 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-[#E67A00] shadow-sm transition-colors text-sm disabled:opacity-60";

// Satu supplier untuk semua barang yang dicentang. "Tanpa supplier" mengosongkan supplierId.
export default function SupplierBulkModal({
  count,
  withSupplier,
  suppliers,
  value,
  onChange,
  onSave,
  onClose,
  saving,
  progress,
  error,
}: Props) {
  const options = [
    ...suppliers.map((s) => ({ value: String(s.id), label: s.name })),
    { value: TANPA_SUPPLIER, label: "— Kosongkan supplier —" },
  ];

  return (
    <Modal
      title={`Atur Supplier · ${count} Barang`}
      onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} disabled={saving} className={cancelClass}>Batal</button>
        <button type="button" onClick={onSave} disabled={saving || !value} className={saveClass}>
          {saving
            ? `Menyimpan ${progress?.done ?? 0}/${progress?.total ?? count}...`
            : `Simpan ${count} Barang`}
        </button>
      </>}
    >
      <p className="mb-2 text-sm font-semibold text-gray-700">Supplier</p>
      <SearchableSelect
        value={value}
        onChange={onChange}
        options={options}
        placeholder="Pilih supplier"
        aria-label="Supplier"
        disabled={saving}
      />
      <p className="mt-2 text-xs text-gray-500">Semua barang yang dicentang akan memakai supplier ini.</p>

      {withSupplier > 0 && (
        <div className="mt-4 p-3 bg-amber-50 text-amber-700 text-sm rounded-lg">
          {withSupplier} barang sudah punya supplier dan akan diganti.
        </div>
      )}
      {error && <div role="alert" className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
    </Modal>
  );
}
