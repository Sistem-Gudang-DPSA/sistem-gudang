"use client";

import { useState } from "react";
import Modal from "@/shared/components/Modal";
import SearchableSelect from "@/shared/components/SearchableSelect";

export const TANPA_SUPPLIER = "none";

export type SupplierReviewItem = {
  id: number;
  name: string;
  code: string | null;
  currentSupplier: string | null;
};

type Props = {
  items: SupplierReviewItem[];
  suppliers: { id: number; name: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  progress: { done: number; total: number } | null;
  error: string;
};

const cancelClass = "px-4 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm disabled:opacity-50";
const saveClass = "px-6 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-[#E67A00] shadow-sm transition-colors text-sm disabled:opacity-60";

// Beberapa supplier untuk semua barang yang dicentang. "Tanpa supplier" mengosongkan pemetaan.
// Sebelum menyimpan, pengguna meninjau daftar barang beserta supplier yang sekarang.
export default function SupplierBulkModal({
  items,
  suppliers,
  value,
  onChange,
  onSave,
  onClose,
  saving,
  progress,
  error,
}: Props) {
  const [step, setStep] = useState<"pilih" | "tinjau">("pilih");
  const count = items.length;
  const withSupplier = items.filter((item) => item.currentSupplier !== null).length;
  const targetName = value.includes(TANPA_SUPPLIER)
    ? "Tanpa supplier"
    : value.map((id) => suppliers.find((s) => String(s.id) === id)?.name ?? items[0]?.currentSupplier ?? `#${id}`).join(", ");
  const options = [
    ...suppliers.filter((s) => !value.includes(String(s.id))).map((s) => ({ value: String(s.id), label: s.name })),
    { value: TANPA_SUPPLIER, label: "— Kosongkan supplier —" },
  ];

  return (
    <Modal
      title={step === "pilih" ? `Edit Supplier · ${count} Barang` : `Tinjau Pemetaan · ${count} Barang`}
      onClose={onClose}
      footer={step === "pilih" ? (
        <>
          <button type="button" onClick={onClose} disabled={saving} className={cancelClass}>Batal</button>
          <button type="button" onClick={() => setStep("tinjau")} disabled={!value.length} className={saveClass}>
            {`Tinjau ${count} Barang`}
          </button>
        </>
      ) : (
        <>
          <button type="button" onClick={() => setStep("pilih")} disabled={saving} className={cancelClass}>Kembali</button>
          <button type="button" onClick={onSave} disabled={saving} className={saveClass}>
            {saving
              ? `Menyimpan ${progress?.done ?? 0}/${progress?.total ?? count}...`
              : `Simpan ${count} Barang`}
          </button>
        </>
      )}
    >
      {step === "pilih" ? (
        <>
          <p className="mb-2 text-sm font-semibold text-gray-700">Supplier</p>
          <SearchableSelect
            value=""
            onChange={(id) => onChange(id === TANPA_SUPPLIER ? [TANPA_SUPPLIER] : [...value.filter((v) => v !== TANPA_SUPPLIER), id])}
            options={options}
            placeholder="Pilih supplier"
            aria-label="Supplier"
            disabled={saving}
          />
          <div className="mt-3 space-y-2">
            {value.filter((id) => id !== TANPA_SUPPLIER).map((id) => (
              <label key={id} className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked disabled={saving} onChange={() => onChange(value.filter((v) => v !== id))} />
                {suppliers.find((s) => String(s.id) === id)?.name ?? items[0]?.currentSupplier ?? `#${id}`}
              </label>
            ))}
            {value.includes(TANPA_SUPPLIER) && <p className="text-sm text-gray-700">Tanpa supplier</p>}
          </div>
          <p className="mt-2 text-xs text-gray-500">Pilih satu atau beberapa supplier. Semua barang yang dicentang akan memakai daftar supplier ini.</p>

          {withSupplier > 0 && (
            <div className="mt-4 p-3 bg-amber-50 text-amber-700 text-sm rounded-lg">
              {withSupplier} barang sudah punya supplier. Daftar suppliernya akan diganti sesuai pilihan.
            </div>
          )}
        </>
      ) : (
        <>
          <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Supplier tujuan</dt>
              <dd className="font-semibold text-gray-900">{targetName}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Jumlah barang</dt>
              <dd className="font-semibold text-gray-900">{count}</dd>
            </div>
          </dl>
          {value.includes(TANPA_SUPPLIER) && withSupplier > 0 && (
            <div className="mb-3 p-3 bg-amber-50 text-amber-700 text-sm rounded-lg">
              Supplier pada {withSupplier} barang akan dikosongkan.
            </div>
          )}
          <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-gray-50 text-gray-600">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">Barang</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Kode</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Supplier saat ini</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-gray-900">{item.name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-500">{item.code ?? "-"}</td>
                    <td className="px-3 py-2 text-gray-600">{item.currentSupplier ?? "Belum ada"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {error && <div role="alert" className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
    </Modal>
  );
}
