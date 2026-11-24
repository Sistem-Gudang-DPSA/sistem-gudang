"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCan } from '@/domains/auth/user-context';
import { getItem, listItems } from '@/domains/inventory/api';
import type { Item } from '@/domains/inventory/types';
import { formatAngka, formatTanggal } from '@/domains/ppic/data/dokubah';
import type { PermintaanPembelian } from '@/domains/ppic/data/pembelian';
import SearchableSelect from '@/shared/components/SearchableSelect';
import { useApiData } from '@/shared/lib/use-api-data';
import { fetchAllPages } from '@/shared/lib/fetch-all';
import { INTEGER_INPUT, digitsOnly } from '@/shared/lib/input';
import { buatPoPath } from '../data/pembelian';
import { savePoPreparation, type PreparedPoLine } from '../po-preparation';
import type { Supplier } from '../types';
import { lineSudahDipesan, usePoPermintaan } from '../use-po-permintaan';
import { useSupplierSearch } from '../use-supplier-search';

const cellClass = 'px-3 py-3 border-b border-r border-gray-300';
const fieldClass = 'w-full min-w-24 rounded-lg border border-gray-300 px-2 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500';

type Props = { permintaan: PermintaanPembelian; fromPoBarang: boolean };

export default function RincianPermintaanPurchasing(props: Props) {
  const canCreate = useCan('purchase-order.create');
  const readyForPurchasing = props.permintaan.statusApi === 'approved' || (props.permintaan.statusApi === 'pending' && props.permintaan.currentStepOrder === 3);
  return canCreate && readyForPurchasing
    ? <RincianEditor {...props} />
    : <TabelRincian {...props} />;
}

function RincianEditor(props: Props) {
  const poState = usePoPermintaan(props.permintaan.id);
  const supplierState = useSupplierSearch();
  return <TabelRincian {...props} poState={poState} supplierState={supplierState} />;
}

async function loadMaster(request: PermintaanPembelian) {
  const byId = new Map<number, Promise<Pick<Item, 'code' | 'stock'> | null>>();
  const byName = new Map<string, Promise<Pick<Item, 'code' | 'stock'> | null>>();
  return Promise.all(request.barang.map(async (line) => {
    try {
      if (line.itemId !== undefined) {
        if (!byId.has(line.itemId)) byId.set(line.itemId, getItem(line.itemId));
        return await byId.get(line.itemId) ?? null;
      }
      // Permintaan lama belum menyimpan itemId. Hanya gunakan kecocokan nama dan satuan yang unik.
      const key = JSON.stringify([line.namaBarang, line.satuan]);
      if (!byName.has(key)) {
        byName.set(key, fetchAllPages((page, pageSize) => listItems({ search: line.namaBarang, page, pageSize })).then((items) => {
          const matches = items.filter((item) => item.name.trim().toLowerCase() === line.namaBarang.trim().toLowerCase() && item.unit.trim().toLowerCase() === line.satuan.trim().toLowerCase());
          return matches.length === 1 ? matches[0] : null;
        }));
      }
      return await byName.get(key) ?? null;
    } catch {
      return null;
    }
  }));
}

function SupplierBaris({ value, onChange, label, search }: { value: Supplier | null; onChange: (supplier: Supplier) => void; label: string; search: ReturnType<typeof useSupplierSearch> }) {
  const { suppliers, onSearch, pending, error } = search;
  const options = value && !suppliers.some((s) => s.id === value.id) ? [value, ...suppliers] : suppliers;
  return (
    <>
      <SearchableSelect value={value ? String(value.id) : ''} onChange={(id) => { const supplier = options.find((s) => String(s.id) === id); if (supplier) onChange(supplier); }}
        options={options.map((s) => ({ value: String(s.id), label: `${s.code} - ${s.name}` }))}
        onSearch={onSearch} pending={pending} placeholder="Pilih supplier" aria-label={label} className={`${fieldClass} min-w-48`} />
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </>
  );
}

function TabelRincian({ permintaan, fromPoBarang, poState, supplierState }: Props & { poState?: ReturnType<typeof usePoPermintaan>; supplierState?: ReturnType<typeof useSupplierSearch> }) {
  const router = useRouter();
  const canViewItem = useCan('item.view');
  const [drafts, setDrafts] = useState<Record<number, { qty: string; supplier: Supplier | null }>>({});
  const [error, setError] = useState('');
  const { data: master, loading } = useApiData(
    () => canViewItem ? loadMaster(permintaan) : Promise.resolve([]),
    `rincian-master|${permintaan.id}|${JSON.stringify(permintaan.barang)}|${canViewItem}`,
    'Gagal memuat stok barang.',
  );
  const ordered = lineSudahDipesan(poState?.pos ?? []);
  const editable = !!poState && permintaan.purchaseStatus !== 'PURCHASED';
  const available = permintaan.barang.map((_, index) => index).filter((index) => !ordered.has(index));
  const draft = (index: number) => drafts[index] ?? { qty: String(permintaan.barang[index].qty), supplier: null };
  const update = (index: number, patch: Partial<ReturnType<typeof draft>>) => setDrafts((prev) => ({ ...prev, [index]: { ...draft(index), ...patch } }));

  const prepare = () => {
    if (!editable || poState.loading || poState.error) return;
    const lines: PreparedPoLine[] = [];
    for (const index of available) {
      const value = draft(index);
      if (!value.supplier) { setError(`Pilih supplier untuk baris ${index + 1}.`); return; }
      const qtyBeli = Number(value.qty);
      if (!Number.isInteger(qtyBeli) || qtyBeli <= 0 || qtyBeli > 1_000_000) { setError(`Qty Beli baris ${index + 1} harus bilangan bulat antara 1 dan 1.000.000.`); return; }
      if (!permintaan.barang[index].proyek.trim()) { setError(`Proyek baris ${index + 1} belum diisi.`); return; }
      lines.push({ lineIndex: index, qtyBeli, supplier: value.supplier, kodeBarang: master?.[index]?.code ?? '' });
    }
    if (!lines.length) { setError('Semua barang sudah masuk PO.'); return; }
    try {
      const token = savePoPreparation(permintaan, lines);
      const query = new URLSearchParams({ draft: token });
      if (fromPoBarang) query.set('from', 'permintaan-po-barang');
      router.push(`${buatPoPath(permintaan.id)}?${query}`);
    } catch {
      setError('Gagal menyiapkan form PO. Pastikan penyimpanan browser tersedia, lalu coba lagi.');
    }
  };

  return (
    <>
      <h2 className="text-base font-bold text-gray-900 mb-4">Rincian Daftar Barang</h2>
      <div className="overflow-x-auto border-t border-l border-gray-300 rounded-lg">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-gray-100 text-gray-800 font-semibold text-xs whitespace-nowrap"><tr>
            {['No', 'Tanggal', 'Supplier', 'Nama Barang', 'Stok Saat Ini', 'QTY', 'Qty Beli', 'SAT', 'Proyek', 'Keterangan', 'Dikirim Tanggal'].map((label) => <th key={label} scope="col" className={`${cellClass} text-center`}>{label}</th>)}
          </tr></thead>
          <tbody className="text-gray-600">
            {permintaan.barang.map((line, index) => {
              const value = draft(index);
              const canEdit = editable && !ordered.has(index) && !poState?.loading && !poState?.error;
              return (
                <tr key={index}>
                  <td className={cellClass}>{index + 1}</td>
                  <td className={`${cellClass} whitespace-nowrap`}>{line.tanggal ? formatTanggal(line.tanggal) : '-'}</td>
                  <td className={cellClass}>{canEdit && supplierState ? <SupplierBaris search={supplierState} value={value.supplier} onChange={(supplier) => update(index, { supplier })} label={`Supplier baris ${index + 1}`} /> : line.supplier || '-'}</td>
                  <td className={`${cellClass} min-w-48 font-semibold text-gray-900`}>{line.namaBarang}{ordered.has(index) && <p className="text-xs font-normal text-gray-500">Sudah dipesan</p>}</td>
                  <td className={`${cellClass} text-center`}>{!canViewItem ? 'Tidak memiliki izin melihat stok' : loading ? 'Memuat...' : master?.[index] ? formatAngka(master[index].stock) : <span title="Stok tidak tersedia atau barang belum terhubung ke satu master barang yang unik">Tidak tersedia</span>}</td>
                  <td className={`${cellClass} text-center`}>{formatAngka(line.qty)}</td>
                  <td className={cellClass}>{canEdit ? <input {...INTEGER_INPUT} maxLength={7} aria-label={`Qty Beli baris ${index + 1}`} value={value.qty} onChange={(e) => update(index, { qty: digitsOnly(e.target.value) })} className={`${fieldClass} text-right`} /> : ordered.has(index) ? '-' : formatAngka(line.qty)}</td>
                  <td className={`${cellClass} text-center`}>{line.satuan}</td>
                  <td className={`${cellClass} min-w-40`}>{line.proyek}</td>
                  <td className={`${cellClass} min-w-40`}>{line.keterangan || '-'}</td>
                  <td className={`${cellClass} whitespace-nowrap`}>{line.deadlineTanggal ? formatTanggal(line.deadlineTanggal) : '-'}</td>
                </tr>
              );
            })}
            {!permintaan.barang.length && <tr><td colSpan={11} className={`${cellClass} text-center text-gray-400`}>Belum ada barang pada permintaan ini.</td></tr>}
          </tbody>
        </table>
      </div>
      {poState?.error && <p role="alert" className="mt-3 text-sm text-red-600">{poState.error} <button type="button" onClick={poState.reload} className="underline">Coba lagi</button></p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      {editable && available.length > 0 && <div className="mt-4 flex justify-end"><button type="button" onClick={prepare} disabled={poState.loading || !!poState.error || loading} className="px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 text-sm disabled:opacity-50">Buat PO</button></div>}
    </>
  );
}
