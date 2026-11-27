"use client";

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCan } from '@/domains/auth/user-context';
import { approveApproval } from '@/domains/ppic/api';
import { fetchPermintaan, type PermintaanPembelian } from '@/domains/ppic/data/pembelian';
import { formatAngka, formatTanggal } from '@/domains/ppic/data/dokubah';
import { getItem, listItems } from '@/domains/inventory/api';
import type { Item, ItemSupplier } from '@/domains/inventory/types';
import SearchableSelect from '@/shared/components/SearchableSelect';
import { useApiData } from '@/shared/lib/use-api-data';
import { fetchAllPages } from '@/shared/lib/fetch-all';
import { INTEGER_INPUT, digitsOnly } from '@/shared/lib/input';
import { getPurchaseRequestMapping, getSupplier, savePurchaseRequestMapping } from '../api';
import { buatPoPath } from '../data/pembelian';
import { savePoPreparation, type PreparedPoLine } from '../po-preparation';
import type { PurchaseRequestMapping, Supplier } from '../types';
import { lineSudahDipesan, usePoPermintaan } from '../use-po-permintaan';
import { useSupplierSearch } from '../use-supplier-search';
import { addMaterialSupplier, materialSuppliers } from '../material-suppliers';

const cellClass = 'px-3 py-3 border-b border-r border-gray-300 align-top';
const fieldClass = 'w-full min-w-24 rounded-lg border border-gray-300 px-2 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500';

type Props = { permintaan: PermintaanPembelian; fromPoBarang: boolean };
type ItemLookup = { id: number; code: string | null; stock: number; price: number; suppliers: ItemSupplier[] } | null;
type RowDraft = { supplier: Supplier | null; qty: string; harga: string | null };
type SupplierNotice = { error: boolean; message: string; retry?: { supplier: Supplier; rowIndex: number } };

export default function RincianPermintaanPurchasing(props: Props) {
  const canCreate = useCan('purchase-order.create');
  const readyForPurchasing = props.permintaan.statusApi === 'approved' || (props.permintaan.statusApi === 'pending' && props.permintaan.currentStepOrder === 3);
  return canCreate && readyForPurchasing
    ? <RincianEditor {...props} />
    : <TabelRincian {...props} />;
}

function RincianEditor(props: Props) {
  const poState = usePoPermintaan(props.permintaan.id);
  const supplierState = useSupplierSearch({ loadAll: true });
  return <TabelRincian {...props} poState={poState} supplierState={supplierState} />;
}

async function loadMaster(request: PermintaanPembelian): Promise<ItemLookup[]> {
  const lookup = (item: Pick<Item, 'id' | 'code' | 'stock' | 'price' | 'suppliers' | 'supplierId'> & { supplierName?: string | null }): ItemLookup => ({ id: item.id, code: item.code, stock: item.stock, price: item.price, suppliers: materialSuppliers({ ...item, supplierId: item.supplierId ?? null }) });
  const byId = new Map<number, Promise<ItemLookup>>();
  const byName = new Map<string, Promise<ItemLookup>>();
  return Promise.all(request.barang.map(async (line) => {
    try {
      if (line.itemId !== undefined) {
        if (!byId.has(line.itemId)) byId.set(line.itemId, getItem(line.itemId).then(lookup).catch(() => null));
        return await byId.get(line.itemId) ?? null;
      }
      // Permintaan lama belum menyimpan itemId. Hanya gunakan kecocokan nama dan satuan yang unik.
      const key = JSON.stringify([line.namaBarang, line.satuan]);
      if (!byName.has(key)) {
        byName.set(key, fetchAllPages((page, pageSize) => listItems({ search: line.namaBarang, page, pageSize })).then((items) => {
          const matches = items.filter((item) => item.name.trim().toLowerCase() === line.namaBarang.trim().toLowerCase() && item.unit.trim().toLowerCase() === line.satuan.trim().toLowerCase());
          return matches.length === 1 ? lookup(matches[0]) : null;
        }).catch(() => null));
      }
      return await byName.get(key) ?? null;
    } catch {
      return null;
    }
  }));
}

const emptySupplier = (id: number, name: string): Supplier => ({ id, code: '', name, address: '', phone: '', bank: '', npwp: '', pajak: 'PKP' });

function SupplierBaris({ value, onChange, label, search, assignedSuppliers, disabled }: { value: Supplier | null; onChange: (supplier: Supplier) => void; label: string; search: ReturnType<typeof useSupplierSearch>; assignedSuppliers: ItemSupplier[] | undefined; disabled: boolean }) {
  const { suppliers, pending, error } = search;
  const catalogue = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  if (value && !catalogue.has(value.id)) catalogue.set(value.id, value);
  const mapped = new Map((assignedSuppliers ?? []).map((supplier) => [supplier.id, catalogue.get(supplier.id) ?? emptySupplier(supplier.id, supplier.name)]));
  const options = [...mapped.values(), ...[...catalogue.values()].filter((supplier) => !mapped.has(supplier.id))];
  return (
    <>
      <SearchableSelect value={value ? String(value.id) : ''} onChange={(id) => { const supplier = options.find((s) => String(s.id) === id); if (supplier) onChange(supplier); }}
        options={options.map((s) => ({ value: String(s.id), label: s.code ? `${s.code} - ${s.name}` : s.name, group: mapped.has(s.id) ? 'Supplier Material' : 'Supplier Lainnya' }))}
        groups={[{ label: 'Supplier Material', emptyText: assignedSuppliers ? 'Belum ada supplier yang dipetakan.' : 'Pemetaan material belum tersedia.' }, { label: 'Supplier Lainnya' }]}
        disabled={disabled} pending={pending} placeholder="Pilih supplier" aria-label={label} className={`${fieldClass} min-w-48`} />
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </>
  );
}

function TabelRincian({ permintaan, fromPoBarang, poState, supplierState }: Props & { poState?: ReturnType<typeof usePoPermintaan>; supplierState?: ReturnType<typeof useSupplierSearch> }) {
  const router = useRouter();
  const canViewItem = useCan('item.view');
  const canViewMapping = useCan('purchase-order.view');
  const canApprove = useCan('purchase-request.approve');
  const canUpdateItem = useCan('item.update');
  const canSetSupplier = useCan('item.set-supplier');
  const [drafts, setDrafts] = useState<Record<number, RowDraft[]>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [supplierSaving, setSupplierSaving] = useState(false);
  const supplierSavingRef = useRef(false);
  const [savedSuppliers, setSavedSuppliers] = useState<Record<number, ItemSupplier[]>>({});
  const [supplierNotices, setSupplierNotices] = useState<Record<number, SupplierNotice | null>>({});
  const { data: master, loading } = useApiData(
    () => canViewItem ? loadMaster(permintaan) : Promise.resolve<ItemLookup[]>([]),
    `rincian-master|${permintaan.id}|${JSON.stringify(permintaan.barang)}|${canViewItem}`,
    'Gagal memuat stok barang.',
  );
  const { data: mapping, loading: mappingLoading, error: mappingError, reload: reloadMapping } = useApiData<PurchaseRequestMapping | null>(
    () => permintaan.statusApi === 'approved' && canViewMapping ? getPurchaseRequestMapping(permintaan.id) : Promise.resolve(null),
    `rincian-mapping|${permintaan.id}|${permintaan.statusApi}|${canViewMapping}`,
    'Gagal memuat pemetaan supplier.',
  );

  const ordered = lineSudahDipesan(poState?.pos ?? []);
  const mappingLines = new Map((mapping?.lines ?? []).map((line) => [line.lineIndex, line]));
  // PO mengunci per baris supplier. Baris permintaan yang dipecah masih bisa lanjut untuk supplier lain.
  const rowOrdered = (index: number, row: RowDraft) => {
    const mapped = mappingLines.get(index);
    if (mapped) {
      const match = mapped.mappings.find((m) => m.supplierId === row.supplier?.id);
      if (match) return match.purchaseOrderId != null;
    }
    return !mapped && ordered.has(index);
  };
  const lineLocked = (index: number) => {
    const mapped = mappingLines.get(index);
    if (mapped) return mapped.mappings.length > 0 && mapped.mappings.every((row) => row.purchaseOrderId != null);
    return ordered.has(index);
  };
  const editable = !!poState && permintaan.purchaseStatus !== 'PURCHASED';
  const available = permintaan.barang.map((_, index) => index).filter((index) => !lineLocked(index));
  const defaultRows = (index: number): RowDraft[] => [{ supplier: null, qty: String(permintaan.barang[index].qty), harga: null }];
  const rowsFor = (index: number): RowDraft[] => {
    if (drafts[index]) return drafts[index];
    const mapped = mappingLines.get(index);
    if (mapped?.mappings.length) {
      return mapped.mappings.map((row) => ({ supplier: emptySupplier(row.supplierId, row.supplierName), qty: String(row.qty), harga: null }));
    }
    return defaultRows(index);
  };
  const hargaValue = (index: number, row: RowDraft) => row.harga ?? (master?.[index] ? String(master[index].price) : '');
  const setRows = (index: number, rows: RowDraft[]) => setDrafts((prev) => ({ ...prev, [index]: rows }));
  const update = (index: number, rowIndex: number, patch: Partial<RowDraft>) => {
    setRows(index, rowsFor(index).map((row, i) => i === rowIndex ? { ...row, ...patch } : row));
  };
  const materialId = (index: number) => master?.[index]?.id ?? permintaan.barang[index].itemId;
  const assignedFor = (index: number) => {
    const id = materialId(index);
    return (id === undefined ? undefined : savedSuppliers[id]) ?? master?.[index]?.suppliers;
  };
  const chooseSupplier = async (index: number, rowIndex: number, supplier: Supplier) => {
    if (supplierSavingRef.current) return;
    update(index, rowIndex, { supplier });
    setSupplierNotices((prev) => ({ ...prev, [index]: null }));
    if (assignedFor(index)?.some((mapped) => mapped.id === supplier.id)) return;
    if (!canUpdateItem || !canSetSupplier) {
      setSupplierNotices((prev) => ({ ...prev, [index]: { error: true, message: 'Supplier dipilih untuk PO, tetapi akun ini belum memiliki izin menambah supplier material.' } }));
      return;
    }
    const id = materialId(index);
    if (!canViewItem || id === undefined) {
      setSupplierNotices((prev) => ({ ...prev, [index]: { error: true, message: 'Supplier dipilih untuk PO. Pemetaan belum disimpan karena material belum terhubung ke data barang yang dapat dibaca.' } }));
      return;
    }
    supplierSavingRef.current = true;
    setSupplierSaving(true);
    setSupplierNotices((prev) => ({ ...prev, [index]: { error: false, message: 'Menyimpan supplier material...' } }));
    try {
      const suppliers = await addMaterialSupplier(id, supplier);
      setSavedSuppliers((prev) => ({ ...prev, [id]: suppliers }));
      setSupplierNotices((prev) => ({ ...prev, [index]: { error: false, message: `${supplier.name} tersimpan sebagai supplier material.` } }));
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Gagal menyimpan supplier.';
      setSupplierNotices((prev) => ({ ...prev, [index]: { error: true, message: `${supplier.name} dipilih untuk PO, tetapi gagal disimpan sebagai supplier material: ${reason}`, retry: { supplier, rowIndex } } }));
    } finally {
      supplierSavingRef.current = false;
      setSupplierSaving(false);
    }
  };
  const addRow = (index: number) => setRows(index, [...rowsFor(index), { supplier: null, qty: '', harga: null }]);
  const removeRow = (index: number, rowIndex: number) => {
    const rows = rowsFor(index);
    if (rows.length > 1 && !rowOrdered(index, rows[rowIndex])) setRows(index, rows.filter((_, i) => i !== rowIndex));
  };

  const buildLines = () => {
    const lines: { lineIndex: number; suppliers: { supplierId: number; qty: number }[] }[] = [];
    for (const index of available) {
      const line = permintaan.barang[index];
      if (!line.proyek.trim()) throw new Error(`Proyek baris ${index + 1} belum diisi.`);
      const rows = rowsFor(index);
      const seen = new Set<number>();
      let total = 0;
      const suppliers = rows.map((row, rowIndex) => {
        const label = `baris ${index + 1} supplier ${rowIndex + 1}`;
        if (!row.supplier) throw new Error(`Pilih supplier untuk ${label}.`);
        const qty = Number(row.qty);
        if (seen.has(row.supplier.id)) throw new Error(`Supplier ${row.supplier.name} dipilih dua kali pada baris ${index + 1}.`);
        if (!rowOrdered(index, row)) {
          if (!Number.isInteger(qty) || qty <= 0 || qty > 1_000_000) throw new Error(`Qty Dibeli ${label} harus bilangan bulat antara 1 dan 1.000.000.`);
          const harga = Number(hargaValue(index, row) || 0);
          if (!Number.isInteger(harga) || harga < 0) throw new Error(`Harga Saat Ini ${label} harus bilangan bulat dan tidak minus.`);
        }
        seen.add(row.supplier.id);
        total += qty;
        if (total > 1_000_000) throw new Error(`Total Qty Dibeli baris ${index + 1} melebihi 1.000.000.`);
        return { supplierId: row.supplier.id, qty };
      });
      lines.push({ lineIndex: index, suppliers });
    }
    if (!lines.length) throw new Error('Semua barang sudah masuk PO.');
    return lines;
  };

  const ensureApproved = async () => {
    if (permintaan.statusApi === 'approved') return;
    const latest = await fetchPermintaan(String(permintaan.id));
    if (latest.statusApi === 'approved') return;
    if (latest.statusApi !== 'pending' || latest.currentStepOrder !== 3) throw new Error('Permintaan belum disetujui PPIC atau statusnya sudah berubah. Muat ulang detail permintaan.');
    if (!canApprove) throw new Error('Akun ini belum memiliki izin menyelesaikan proses permintaan untuk membuat PO. Hubungi Superadmin.');
    await approveApproval(permintaan.id);
    const updated = await fetchPermintaan(String(permintaan.id));
    if (updated.statusApi !== 'approved') throw new Error('Status permintaan belum siap untuk PO. Muat ulang detail permintaan.');
  };

  const prepare = async () => {
    if (!editable || saving || supplierSavingRef.current || poState?.loading || poState?.error) return;
    setError('');
    setSaving(true);
    let serverWrite = false;
    try {
      const lines = buildLines();
      await ensureApproved();
      serverWrite = true;
      await savePurchaseRequestMapping(permintaan.id, lines);
      const prepared = await buildPrepared(lines, master);
      const token = savePoPreparation(permintaan, prepared);
      const query = new URLSearchParams({ draft: token });
      if (fromPoBarang) query.set('from', 'permintaan-po-barang');
      router.push(`${buatPoPath(permintaan.id)}?${query}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyiapkan PO.');
      if (serverWrite && permintaan.statusApi === 'approved') reloadMapping();
    } finally {
      setSaving(false);
    }
  };

  const buildPrepared = async (lines: { lineIndex: number; suppliers: { supplierId: number; qty: number }[] }[], items: ItemLookup[] | null | undefined): Promise<PreparedPoLine[]> => {
    const suppliers = new Map<number, Supplier>();
    for (const line of lines) {
      for (const row of rowsFor(line.lineIndex)) if (row.supplier) suppliers.set(row.supplier.id, row.supplier);
    }
    await Promise.all([...suppliers.keys()].map(async (id) => {
      try {
        suppliers.set(id, await getSupplier(id));
      } catch {
        // Pakai data supplier dari pilihan sebelumnya bila detail gagal dimuat.
      }
    }));
    return lines.flatMap((line) => {
      const item = items?.[line.lineIndex] ?? null;
      return rowsFor(line.lineIndex).filter((row) => !rowOrdered(line.lineIndex, row)).map((row) => ({
        lineIndex: line.lineIndex,
        qtyBeli: Number(row.qty),
        supplier: suppliers.get(row.supplier!.id)!,
        kodeBarang: item?.code ?? '',
        itemId: permintaan.barang[line.lineIndex].itemId,
        noSpk: permintaan.barang[line.lineIndex].noSpk?.trim() ?? '',
        harga: Number(hargaValue(line.lineIndex, row) || 0),
        hargaTerbaru: item?.price ?? 0,
      }));
    });
  };

  const totals = (index: number) => rowsFor(index).reduce((sum, row) => sum + (Number(row.qty) || 0), 0);

  return (
    <>
      <h2 className="text-base font-bold text-gray-900 mb-4">Rincian Daftar Barang</h2>
      <div className="overflow-x-auto border-t border-l border-gray-300 rounded-lg">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-gray-100 text-gray-800 font-semibold text-xs whitespace-nowrap"><tr>
            {['No', 'Nama Barang', 'Satuan', 'No SPK', 'Stok Saat Ini', 'Supplier', 'Harga Terakhir', 'Harga Saat Ini', 'Qty Permintaan', 'Qty Dibeli', 'Keterangan', 'Tanggal Datang'].map((label) => <th key={label} scope="col" className={`${cellClass} text-center`}>{label}</th>)}
          </tr></thead>
          <tbody className="text-gray-600">
            {permintaan.barang.map((line, index) => {
              const rows = rowsFor(index);
              const canEdit = editable && !lineLocked(index) && !poState?.loading && !poState?.error && !mappingLoading;
              const total = totals(index);
              const firstName = line.namaBarang;
              const notice = supplierNotices[index];
              return rows.map((row, rowIndex) => {
                const lockedRow = rowOrdered(index, row);
                return (
                <tr key={`${index}-${rowIndex}`}>
                  {rowIndex === 0 && <>
                    <td rowSpan={rows.length} className={cellClass}>{index + 1}</td>
                    <td rowSpan={rows.length} className={`${cellClass} min-w-48 font-semibold text-gray-900`}>{firstName}{lineLocked(index) && <p className="text-xs font-normal text-gray-500">Sudah dipesan</p>}</td>
                    <td rowSpan={rows.length} className={`${cellClass} text-center`}>{line.satuan}</td>
                    <td rowSpan={rows.length} className={`${cellClass} text-center whitespace-nowrap`}>{line.noSpk || '-'}</td>
                    <td rowSpan={rows.length} className={`${cellClass} text-center`}>{!canViewItem ? 'Tidak memiliki izin melihat stok' : loading ? 'Memuat...' : master?.[index] ? formatAngka(master[index].stock) : <span title="Stok tidak tersedia atau barang belum terhubung ke satu master barang yang unik">Tidak tersedia</span>}</td>
                  </>}
                  <td className={cellClass}>
                    {canEdit && !lockedRow && supplierState ? <SupplierBaris search={supplierState} assignedSuppliers={assignedFor(index)} disabled={supplierSaving || saving} value={row.supplier} onChange={(supplier) => void chooseSupplier(index, rowIndex, supplier)} label={`Supplier baris ${index + 1} supplier ${rowIndex + 1}`} /> : (row.supplier?.name || line.supplier || '-')}
                    {rowIndex === 0 && notice && <div role={notice.error ? 'alert' : 'status'} className={`mt-1 max-w-64 text-xs ${notice.error ? 'text-red-600' : 'text-gray-500'}`}>
                      {notice.message}
                      {notice.retry && <button type="button" disabled={supplierSaving || saving} onClick={() => { if (notice.retry) void chooseSupplier(index, notice.retry.rowIndex, notice.retry.supplier); }} className="ml-1 underline disabled:opacity-50">Coba lagi simpan supplier material</button>}
                    </div>}
                    {lockedRow && !lineLocked(index) && <p className="mt-1 text-xs text-gray-500">Sudah dipesan</p>}
                    {canEdit && rowIndex === rows.length - 1 && (
                      <div className="mt-1 flex gap-3 text-xs">
                        <button type="button" disabled={supplierSaving || saving} onClick={() => addRow(index)} className="text-orange-600 hover:underline disabled:opacity-50" aria-label={`Tambah supplier baris ${index + 1}`}>+ Supplier</button>
                        {rows.length > 1 && !lockedRow && <button type="button" disabled={supplierSaving || saving} onClick={() => removeRow(index, rowIndex)} className="text-red-600 hover:underline disabled:opacity-50" aria-label={`Hapus supplier baris ${index + 1} supplier ${rowIndex + 1}`}>Hapus</button>}
                      </div>
                    )}
                  </td>
                  {rowIndex === 0 && <td rowSpan={rows.length} className={`${cellClass} whitespace-nowrap text-right`}>{!canViewItem ? '-' : loading ? 'Memuat...' : master?.[index] ? formatAngka(master[index].price) : '-'}</td>}
                  <td className={cellClass}>{canEdit && !lockedRow ? <input {...INTEGER_INPUT} maxLength={9} aria-label={`Harga Saat Ini baris ${index + 1} supplier ${rowIndex + 1}`} value={hargaValue(index, row)} onChange={(e) => update(index, rowIndex, { harga: digitsOnly(e.target.value) })} className={`${fieldClass} text-right`} /> : row.harga ?? (master?.[index] ? formatAngka(master[index].price) : '-')}</td>
                  {rowIndex === 0 && <td rowSpan={rows.length} className={`${cellClass} text-center whitespace-nowrap`}>
                    {formatAngka(line.qty)}
                    {lineLocked(index) ? null : total > line.qty ? <p className="text-xs text-amber-600">Lebih: {formatAngka(total - line.qty)}</p> : total < line.qty ? <p className="text-xs text-red-600">Sisa: {formatAngka(line.qty - total)}</p> : <p className="text-xs text-green-600">Pas</p>}
                  </td>}
                  <td className={cellClass}>{canEdit && !lockedRow ? <input {...INTEGER_INPUT} maxLength={7} aria-label={`Qty Dibeli baris ${index + 1} supplier ${rowIndex + 1}`} value={row.qty} onChange={(e) => update(index, rowIndex, { qty: digitsOnly(e.target.value) })} className={`${fieldClass} text-right`} /> : formatAngka(Number(row.qty) || 0)}</td>
                  {rowIndex === 0 && <td rowSpan={rows.length} className={`${cellClass} min-w-40`}>{line.keterangan || '-'}</td>}
                  {rowIndex === 0 && <td rowSpan={rows.length} className={`${cellClass} whitespace-nowrap`}>{line.deadlineTanggal ? formatTanggal(line.deadlineTanggal) : '-'}</td>}
                </tr>
                );
              });
            })}
            {!permintaan.barang.length && <tr><td colSpan={12} className={`${cellClass} text-center text-gray-400`}>Belum ada barang pada permintaan ini.</td></tr>}
          </tbody>
        </table>
      </div>
      {mappingError && <p role="alert" className="mt-3 text-sm text-red-600">{mappingError} <button type="button" onClick={reloadMapping} className="underline">Coba lagi</button></p>}
      {poState?.error && <p role="alert" className="mt-3 text-sm text-red-600">{poState.error} <button type="button" onClick={poState.reload} className="underline">Coba lagi</button></p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      {editable && available.length > 0 && <div className="mt-4 flex justify-end"><button type="button" onClick={() => void prepare()} disabled={saving || supplierSaving || poState?.loading || !!poState?.error || loading || mappingLoading} className="px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 text-sm disabled:opacity-50">{saving ? 'Membuat PO...' : 'Generate PO'}</button></div>}
    </>
  );
}
