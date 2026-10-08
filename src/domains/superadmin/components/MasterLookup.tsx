"use client";

import React, { useState } from "react";
import { Plus, Search, Tags } from "lucide-react";
import type { ItemLookup } from "@/domains/inventory/api";
import { useCan } from "@/domains/auth/user-context";
import { ApiError } from "@/shared/lib/api-client";
import { useApiData } from "@/shared/lib/use-api-data";
import SortableTh, { useSort } from "@/shared/components/SortableTh";
import EditModeBar, { useBatchEdit } from "@/shared/components/EditModeBar";

export type LookupConfig = {
  title: string; // "Kategori Barang"
  singular: string; // "Kategori"
  example: string;
  maxLength: number; // mengikuti kolom BE (kategori 100, satuan 50)
  list: () => Promise<ItemLookup[]>;
  create: (name: string) => Promise<ItemLookup>;
  rename: (id: number, name: string) => Promise<ItemLookup>;
  remove: (id: number) => Promise<void>;
};

// Master daftar nama yang dirujuk barang (kategori, satuan). Tambah dan hapus saja; nama yang masih dipakai barang ditolak BE.
export default function MasterLookup({ config }: { config: LookupConfig }) {
  const { title, singular, example, maxLength, list, create, rename, remove } = config;
  const canCreate = useCan("item.create");
  const canUpdate = useCan("item.update");
  const canDelete = useCan("item.delete");
  const { data, loading, error, reload } = useApiData(list, singular, `Gagal memuat data ${singular.toLowerCase()}.`);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const edit = useBatchEdit();
  const { sort, toggle } = useSort();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");

  const q = search.trim().toLowerCase();
  // Daftar kecil dan tidak dipaginasi, jadi diurutkan di sini
  const shown = (data ?? [])
    .filter((r) => !q || r.name.toLowerCase().includes(q))
    .sort((a, b) => {
      if (!sort) return 0;
      const d = sort.by === "itemCount" ? (a.itemCount ?? 0) - (b.itemCount ?? 0) : a.name.localeCompare(b.name);
      return sort.dir === "asc" ? d : -d;
    });

  const close = () => {
    setOpen(false);
    setName("");
    setFormError("");
  };

  const save = async () => {
    const nama = name.trim();
    if (!nama) return setFormError(`Nama ${singular.toLowerCase()} wajib diisi.`);
    setSaving(true);
    setFormError("");
    try {
      await create(nama);
      close();
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : `Gagal menyimpan ${singular.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  };

  const simpanSemua = () => edit.save((id, patch) => rename(id, patch.name.trim()).then(() => undefined), reload);

  const hapus = async (row: ItemLookup) => {
    if (!window.confirm(`Hapus ${singular.toLowerCase()} "${row.name}"?`)) return;
    setActionError("");
    try {
      await remove(row.id);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : `Gagal menghapus ${singular.toLowerCase()}.`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
          <Tags className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">{title}</h1>
          <p className="text-sm text-gray-500">Daftar {singular.toLowerCase()} yang bisa dipilih pada data barang.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="relative w-64 lg:w-72">
            <input
              type="text"
              value={search}
              maxLength={maxLength}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Cari ${singular.toLowerCase()}...`}
              className="w-full border border-gray-200 rounded-full py-2.5 pl-5 pr-10 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm text-gray-700 placeholder-gray-400 transition-all"
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canCreate && (
              <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#ff8a00] text-white rounded-lg hover:bg-[#eb7d00] hover:shadow-md transition-all duration-200 font-semibold text-sm shadow-sm"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                Tambah {singular}
              </button>
            )}
            {canUpdate && <EditModeBar editing={edit.editing} dirty={edit.dirty} saving={edit.saving} onToggle={edit.toggle} onSave={simpanSemua} onCancel={edit.cancel} />}
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600">
              {data?.length ?? 0} {singular.toLowerCase()}
            </span>
          </div>
        </div>

        {actionError && <div className="mx-5 mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{actionError}</div>}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider text-xs font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 w-16">No</th>
                <SortableTh label={singular} sortKey="name" sort={sort} onSort={toggle} />
                <SortableTh label="Jumlah Barang" sortKey="itemCount" sort={sort} onSort={toggle} align="right" />
                {canDelete && <th className="px-6 py-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="px-6 py-6 text-center text-gray-400">Memuat data...</td></tr>}
              {!loading && error && <tr><td colSpan={4} className="px-6 py-6 text-center text-red-500">{error}</td></tr>}
              {!loading && !error && shown.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-6 text-center text-gray-400">Belum ada {singular.toLowerCase()}.</td></tr>
              )}
              {!loading && !error && shown.map((r, i) => (
                <tr key={r.id} className={`${edit.isDirty(r.id) ? "bg-amber-50" : i % 2 ? "bg-gray-50" : "bg-white"} hover:bg-indigo-50/40 transition-colors`}>
                  <td className="px-6 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-6 py-3">
                    {edit.editing ? (
                      <div>
                        <input
                          aria-label={`Nama ${r.name}`}
                          value={edit.value(r.id, "name", r.name)}
                          maxLength={maxLength}
                          onChange={(e) => edit.set(r.id, "name", e.target.value, r.name)}
                          className="w-full min-w-48 border border-gray-200 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                        {edit.errors[r.id] && <p className="mt-1 text-xs text-red-600">{edit.errors[r.id]}</p>}
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-indigo-50 text-indigo-700 border-indigo-200/50">
                        {r.name}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-700 font-medium">{r.itemCount ?? "-"}</td>
                  {canDelete && (
                    <td className="px-6 py-3 text-right">
                      <button onClick={() => hapus(r)} aria-label={`Hapus ${r.name}`} className="px-3 py-1 bg-red-50 text-red-600 font-bold rounded-lg text-xs hover:bg-red-100 transition-all border border-red-100">
                        Hapus
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-120 p-8 relative" role="dialog" aria-modal="true" aria-label={`Tambah ${singular}`}>
            <button type="button" onClick={close} aria-label="Tutup" className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">✕</button>
            <h2 className="text-xl font-extrabold text-gray-900 mb-6 tracking-wide">TAMBAH {singular.toUpperCase()}</h2>
            <label htmlFor="lookup-name" className="block text-sm font-semibold text-gray-700 mb-2">Nama {singular}</label>
            <input
              id="lookup-name"
              type="text"
              value={name}
              maxLength={maxLength}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder={`Contoh: ${example}`}
              className="w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00]"
            />
            {formError && <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{formError}</div>}
            <div className="flex justify-end gap-2 pt-6">
              <button type="button" onClick={close} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Batal</button>
              <button type="button" onClick={save} disabled={saving} className="px-6 py-2 bg-[#FF8A00] text-white rounded-lg font-semibold text-sm hover:bg-orange-600 disabled:opacity-60">
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
