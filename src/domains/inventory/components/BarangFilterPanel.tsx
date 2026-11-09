"use client";

import type { ItemFilterParams } from "@/domains/inventory/types";

export type BarangFilters = { category: string; unit: string; supplier: string; location: string; stockEmpty: boolean };
export const emptyBarangFilters: BarangFilters = { category: "", unit: "", supplier: "", location: "", stockEmpty: false };

// supplier/location: "" semua, "none" belum ada, selain itu id
export const toItemFilterParams = (f: BarangFilters): ItemFilterParams => ({
  category: f.category || undefined,
  unit: f.unit || undefined,
  supplierId: f.supplier ? (f.supplier === "none" ? "none" : Number(f.supplier)) : undefined,
  locationId: f.location ? (f.location === "none" ? "none" : Number(f.location)) : undefined,
  stock: f.stockEmpty ? "empty" : undefined,
});

export const countActiveFilters = (f: BarangFilters) => Object.values(f).filter(Boolean).length;

type Props = {
  value: BarangFilters;
  onChange: (next: BarangFilters) => void;
  categories: string[];
  units: string[];
  suppliers: { id: number; name: string }[];
  locations: { id: number; code: string }[];
};

const selectClass = "py-2 pl-3 pr-8 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/30 focus:border-[#FF8A00]";

export default function BarangFilterPanel({ value, onChange, categories, units, suppliers, locations }: Props) {
  const set = (patch: Partial<BarangFilters>) => onChange({ ...value, ...patch });
  return (
    <div className="px-5 py-4 border-b border-gray-100 bg-white flex flex-wrap items-end gap-3" role="group" aria-label="Filter barang">
      <label className="text-xs font-semibold text-gray-500 flex flex-col gap-1">Kategori
        <select aria-label="Filter kategori" className={selectClass} value={value.category} onChange={(e) => set({ category: e.target.value })}>
          <option value="">Semua</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label className="text-xs font-semibold text-gray-500 flex flex-col gap-1">Satuan
        <select aria-label="Filter satuan" className={selectClass} value={value.unit} onChange={(e) => set({ unit: e.target.value })}>
          <option value="">Semua</option>
          {units.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </label>
      <label className="text-xs font-semibold text-gray-500 flex flex-col gap-1">Supplier
        <select aria-label="Filter supplier" className={selectClass} value={value.supplier} onChange={(e) => set({ supplier: e.target.value })}>
          <option value="">Semua</option>
          <option value="none">Belum ada supplier</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <label className="text-xs font-semibold text-gray-500 flex flex-col gap-1">Lokasi
        <select aria-label="Filter lokasi" className={selectClass} value={value.location} onChange={(e) => set({ location: e.target.value })}>
          <option value="">Semua</option>
          <option value="none">Belum ada lokasi</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.code}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-600 pb-2">
        <input type="checkbox" checked={value.stockEmpty} onChange={(e) => set({ stockEmpty: e.target.checked })} /> Stok kosong
      </label>
      {countActiveFilters(value) > 0 && (
        <button type="button" onClick={() => onChange(emptyBarangFilters)} className="pb-2 text-sm text-gray-500 hover:underline">Reset filter</button>
      )}
    </div>
  );
}
