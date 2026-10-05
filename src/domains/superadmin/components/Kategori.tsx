"use client";

import React, { useState } from "react";
import { Search, Tags } from "lucide-react";
import { listItems } from "@/domains/inventory/api";
import type { ItemListRow } from "@/domains/inventory/types";
import { useApiData } from "@/shared/lib/use-api-data";

interface CategoryRow {
  name: string;
  jenis: number;
  stock: number;
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
  const [searchQuery, setSearchQuery] = useState("");
  const { data: items, loading, error } = useApiData(loadAllItems, "kategori", "Gagal memuat data kategori.");

  const categories = groupByCategory(items ?? []);
  const q = searchQuery.trim().toLowerCase();
  const shown = q ? categories.filter((c) => c.name.toLowerCase().includes(q)) : categories;

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
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600">
            {categories.length} kategori
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider text-xs font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 w-16">No</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4 text-right">Jenis Barang</th>
                <th className="px-6 py-4 text-right">Total Stok</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr><td colSpan={4} className="px-6 py-6 text-center text-gray-400">Memuat data...</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={4} className="px-6 py-6 text-center text-red-500">{error}</td></tr>
              )}
              {!loading && !error && shown.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-6 text-center text-gray-400">Belum ada kategori.</td></tr>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
