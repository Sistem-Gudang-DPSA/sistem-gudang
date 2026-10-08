"use client";

import React, { useState } from "react";
import { Plus, Search, Tags } from "lucide-react";
import { listItems } from "@/domains/inventory/api";
import type { ItemListRow } from "@/domains/inventory/types";
import { useApiData } from "@/shared/lib/use-api-data";
import { ImportExcelButton } from '@/components/ui/ImportExcelButton';
import { deleteCategory, importCategoryData } from '../api';
import { useCan } from "@/domains/auth/user-context";
import { ApiError } from '@/shared/lib/api-client';


interface CategoryRow {
  name: string;
  jenis: number;
  stock: number;
}

export type CategoryDataImportRow = {
  idKategori: string;
  namaKategori: string;
}

export const categoryTemplateHeaders = ['ID Kategori', 'Nama Kategori'];
export const categoryTemplateExample = ['1', 'Lembaran'];

export function CategoryData(r: Record<string, unknown>, rowNumber: number) : CategoryDataImportRow {
  const idKategori = String(r['ID Kategori'] ?? '').trim();
  const namaKategori = String(r['Nama Kategori'] ?? '').trim()

  if (!idKategori) throw new Error(`Baris ${rowNumber}: ID Kategori wajib diisi`);
  if (!namaKategori) throw new Error(`Baris ${rowNumber}: Nama Kategori wajib diisi`);

  return {idKategori, namaKategori};
}

// The backend has no category table: categories are the distinct `category` values of the items,
// so every page of items is loaded (100 per request, the largest page the API serves) and grouped here.
async function loadAllItems(): Promise<ItemListRow[]> {
  const rows: ItemListRow[] = [];
  for (let page = 1; ; page++) {
    const res = await listItems({ page, pageSize: 100 });
    rows.push(...res.rows);
    if (res.rows.length === 0 || rows.length >= res.total) return rows;
  }
}

function groupByCategory(items: ItemListRow[]): CategoryRow[] {
  const map = new Map<string, CategoryRow>();
  for (const item of items) {
    const name = item.category?.trim() || "Tanpa Kategori";
    const row = map.get(name) ?? { name, jenis: 0, stock: 0 };
    row.jenis += 1;
    row.stock += item.stock;
    map.set(name, row);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export default function Kategori() {
  const canDelete = useCan('item.delete');
  const canCreate = useCan('item.create');
  const [searchQuery, setSearchQuery] = useState("");
  const { data: items, loading, error, reload } = useApiData(loadAllItems, "kategori", "Gagal memuat data kategori.");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [namaKategori, setNamaKategori] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [localRows, setLocalRows] = useState<CategoryDataImportRow[]>([]);
  const [actionError, setActionError] = useState("");

  const categories = groupByCategory(items ?? []);
  const q = searchQuery.trim().toLowerCase();
  const shown = q ? categories.filter((c) => c.name.toLowerCase().includes(q)) : categories;

  const closeModal = () => {
    setIsModalOpen(false);
    setNamaKategori("");
    setFormError("");
  };

  const handleSimpan = async () => {
    const nama = namaKategori.trim();
    if (!nama) {
      setFormError("Nama kategori wajib diisi.");
      return;
    }
    const sudahAda = categories.some((c) => c.name.toLowerCase() === nama.toLowerCase());
    if (sudahAda) {
      setFormError("Kategori sudah ada.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      // TODO: ganti dengan API asli, misalnya await createCategory({ name: nama });
      await new Promise((r) => setTimeout(r, 400));
      setLocalRows((prev) => [...prev, { idKategori: String(Date.now()), namaKategori: nama }]);
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const handleHapus = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    try {
      await deleteCategory(id);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Gagal menghapus kategori.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
          <Tags className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Kategori Barang</h1>
          <p className="text-sm text-gray-500">Daftar kategori dari seluruh data barang.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="relative w-64 lg:w-72">
            <input
              type="text"
              value={searchQuery}
              maxLength={100}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kategori..."
              className="w-full border border-gray-200 rounded-full py-2.5 pl-5 pr-10 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm text-gray-700 placeholder-gray-400 transition-all"
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canCreate && <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#ff8a00] text-white rounded-lg hover:bg-[#eb7d00] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm shadow-sm"
            >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                Tambah Kategori
            </button>}
            {canCreate && (
              <ImportExcelButton 
                templateHeaders={categoryTemplateHeaders}
                templateExample={categoryTemplateExample}
                templateFilename="Template_Import_Kategori_Barang.xlsx"
                parseRow={CategoryData}
                previewColumns={[
                  { header: 'ID Kategori', value: (r) => r.idKategori},
                  { header: 'Nama Kategori', value: (r) => r.namaKategori}
                ]}
                onSave={importCategoryData}
                onSuccess={() => reload()}
              />
            )}
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600">
              {categories.length} kategori
            </span>
          </div>
          
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider text-xs font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 w-16">No</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4 text-right">Jenis Barang</th>
                <th className="px-6 py-4 text-right">Total Stok</th>
                {items?.length !== 0 && (
                  <th className="px-6 py-4 text-right">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr><td colSpan={5} className="px-6 py-6 text-center text-gray-400">Memuat data...</td></tr>
              )}
              {actionError && (
                <tr><td colSpan={5} className="px-6 py-3 text-center text-red-500">{actionError}</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={5} className="px-6 py-6 text-center text-red-500">{error}</td></tr>
              )}
              {!loading && !error && shown.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-6 text-center text-gray-400">Belum ada kategori.</td></tr>
              )}
              {!loading && !error && shown.map((c, i) => (
                <tr key={c.name} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-6 py-4 text-gray-500">{i + 1}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-indigo-50 text-indigo-700 border-indigo-200/50">
                      {c.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-700 font-medium">{c.jenis}</td>
                  <td className="px-6 py-4 text-right text-gray-700 font-medium">{c.stock.toLocaleString("id-ID")}</td>
                  <td className="px-6 py-4 text-right text-gray-700 font-medium">
                      {canDelete && <button onClick={() => handleHapus(c.jenis)} className=" px-3 py-1 bg-red-50 text-red-600 font-bold rounded-lg text-xs hover:bg-red-100 transition-all border border-red-100">
                        Hapus
                      </button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-120 p-8 relative animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={closeModal}
              aria-label="Tutup"
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              ✕
            </button>

            <h2 className="text-xl font-extrabold text-gray-900 mb-6 tracking-wide">TAMBAH KATEGORI</h2>

            <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Kategori</label>
            <input
              type="text"
              value={namaKategori}
              maxLength={100}
              autoFocus
              onChange={(e) => setNamaKategori(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSimpan()}
              placeholder="Contoh: Lembaran"
              className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00]"
            />

            {formError && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{formError}</div>
            )}

            <div className="flex justify-end gap-2 pt-6">
              <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Batal
              </button>
              <button
                type="button"
                onClick={handleSimpan}
                disabled={saving}
                className="px-6 py-2 bg-[#FF8A00] text-white rounded-lg font-semibold text-sm hover:bg-orange-600 disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
