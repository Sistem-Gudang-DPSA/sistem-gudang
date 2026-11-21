"use client";

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { useCan } from '@/domains/auth/user-context';
import { listItems } from '@/domains/inventory/api';
import type { ItemListRow } from '@/domains/inventory/types';
import { useApiData } from '@/shared/lib/use-api-data';
import { fetchAllPages } from '@/shared/lib/fetch-all';

export const isDiBawahMinimum = (item: ItemListRow) => item.minimumStock != null && item.stock <= item.minimumStock;

// Qty saran mengembalikan stok ke batas minimum; PPIC tetap bisa mengubahnya di baris form.
export const qtySaranRestock = (item: Pick<ItemListRow, 'stock' | 'minimumStock'>) =>
  Math.max(1, Math.ceil((item.minimumStock ?? 0) - item.stock));

const angka = (nilai: number) => nilai.toLocaleString('id-ID', { maximumFractionDigits: 3 });

export default function RekomendasiStokMinimum(props: { existingItemIds: Set<number>; onAdd: (item: ItemListRow) => void }) {
  return useCan('item.view') ? <Panel {...props} /> : null;
}

function Panel({ existingItemIds, onAdd }: {
  existingItemIds: Set<number>;
  onAdd: (item: ItemListRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data, loading, error } = useApiData(
    () => fetchAllPages((page, pageSize) => listItems({ page, pageSize })),
    'form-permintaan-rekomendasi-stok',
    'Gagal memuat rekomendasi stok.',
  );
  const items = useMemo(
    () => (data ?? [])
      .filter(isDiBawahMinimum)
      .sort((a, b) => (a.stock - (a.minimumStock ?? 0)) - (b.stock - (b.minimumStock ?? 0))),
    [data],
  );

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-amber-200 bg-amber-50/40">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
        <div>
          <p className="text-sm font-bold text-gray-900">Rekomendasi Restock</p>
          <p className="text-xs text-gray-600">
            {loading ? 'Memuat barang di bawah stok minimum...' : `${items.length} barang di bawah stok minimum`}
          </p>
        </div>
        {open ? <ChevronUp aria-hidden="true" className="h-4 w-4 text-gray-500" /> : <ChevronDown aria-hidden="true" className="h-4 w-4 text-gray-500" />}
      </button>
      {open && (
        <div className="border-t border-amber-200 px-5 py-4">
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {!error && !loading && items.length === 0 && <p className="text-sm text-gray-600">Tidak ada barang di bawah stok minimum.</p>}
          {items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs font-bold text-gray-700">
                  <tr>
                    {['Barang', 'Stok', 'Minimum', 'Satuan', 'Supplier', 'Saran QTY', ''].map((label, i) => (
                      <th key={`${label}-${i}`} className="border-b border-amber-200 px-2 py-2">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const sudahAda = existingItemIds.has(item.id);
                    return (
                      <tr key={item.id} className="border-b border-amber-100 last:border-0">
                        <td className="px-2 py-2">
                          <p className="font-medium text-gray-900">{item.name}</p>
                          {item.code && <p className="text-xs text-gray-500">{item.code}</p>}
                        </td>
                        <td className="px-2 py-2 font-semibold text-red-600">{angka(item.stock)}</td>
                        <td className="px-2 py-2">{angka(item.minimumStock ?? 0)}</td>
                        <td className="px-2 py-2">{item.unit}</td>
                        <td className="px-2 py-2 text-gray-600">{item.supplierName ?? 'Belum dipetakan'}</td>
                        <td className="px-2 py-2">{qtySaranRestock(item)}</td>
                        <td className="px-2 py-2 text-right">
                          <button type="button" disabled={sudahAda} onClick={() => onAdd(item)}
                            aria-label={`Tambah ${item.name} ke permintaan`}
                            className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white disabled:bg-gray-200 disabled:text-gray-500">
                            <Plus aria-hidden="true" className="h-3 w-3" />
                            {sudahAda ? 'Sudah ada' : 'Tambah'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
