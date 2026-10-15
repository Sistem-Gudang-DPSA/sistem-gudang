"use client";

import { useCan } from '@/domains/auth/user-context';
import React, { useEffect, useRef, useState } from 'react';
import { Search, Filter, Edit2, Images } from 'lucide-react';
import { adjustItemStock, assignItemLocation, listItemCategories, listItemUnits, listItems, listLocations, suggestItemCode, updateItem } from '@/domains/inventory/api';
import type { ItemListRow, Location, UpdateItemInput } from '@/domains/inventory/types';
import { listSuppliers } from '@/domains/purchasing/api';
import type { Supplier } from '@/domains/purchasing/types';
import { ApiError } from '@/shared/lib/api-client';
import Pagination from '@/shared/components/Pagination';
import { useApiData } from '@/shared/lib/use-api-data';
import { ExportExcellButton } from '@/shared/components/Tombol';
import { ImportExcelButton } from '@/shared/components/ImportExcelButton';
import ImportBarangMapping from './ImportBarangMapping';
import ItemPhoto from '@/domains/inventory/components/ItemPhoto';
import BulkPhotoModal from '@/domains/inventory/components/BulkPhotoModal';
import BarangFilterPanel, { countActiveFilters, emptyBarangFilters, toItemFilterParams } from './BarangFilterPanel';
import SortableTh, { useSort } from '@/shared/components/SortableTh';
import EditModeBar, { useBatchEdit } from '@/shared/components/EditModeBar';
// Supplier, kategori, satuan dan lokasi dipetakan di langkah kedua (ImportBarangMapping), bukan di Excel.
export type MasterDataImportRow = {
  code: string;
  name: string;
  detail: string;
  price: number;
  stock: number;
};

export const mstrDataTemplateHeaders = ['Nama Barang', 'Kode Barang', 'Keterangan Barang', 'Harga', 'Stok'];
export const mstrDataTemplateExample = ['Light Green', 'TH 039 AA', 'TACO TH', 150000, 31.5];

const text = (v: unknown) => String(v ?? '').trim();
// Kosong dianggap 0; angka tidak valid atau negatif ditolak. Stok maks 2 desimal (kolom BE decimal(14,2)), harga bilangan bulat.
const amount = (v: unknown, label: string, rowNumber: number, decimals: 0 | 2) => {
  const n = v === '' || v == null ? 0 : Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error(`Baris ${rowNumber}: ${label} tidak valid`);
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
};

export function MasterData(r: Record<string, unknown>, rowNumber: number): MasterDataImportRow {
  const name = text(r['Nama Barang']);
  if (!name) throw new Error(`Baris ${rowNumber}: Nama Barang wajib diisi`);
  return {
    code: text(r['Kode Barang']),
    name,
    detail: text(r['Keterangan Barang']),
    price: amount(r['Harga'], 'Harga', rowNumber, 0),
    stock: amount(r['Stok'], 'Stok', rowNumber, 2),
  };
}

export default function DataBarangGudang() {
  const canCreate = useCan('item.create');
  const canAssign = useCan('item.assign-location');
  const canAdjust = useCan('item.adjust-stock');
  const canUpdate = useCan('item.update');
  const canSetPrice = useCan('item.set-price');
  const canSetSupplier = useCan('item.set-supplier');
  const canUploadPhoto = useCan('item.upload-photo');
  const { sort, toggle, params: sortParams } = useSort();
  const edit = useBatchEdit();
  const seen = useRef(new Map<number, ItemListRow>()); // semua baris yang pernah tampil, untuk menyimpan perubahan dari halaman lain
  const [filters, setFilters] = useState(emptyBarangFilters);
  const [showFilter, setShowFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [pendingImport, setPendingImport] = useState<MasterDataImportRow[]>([]);
  const [importNote, setImportNote] = useState('');

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockItem, setStockItem] = useState<ItemListRow | null>(null);
  const [stockDelta, setStockDelta] = useState("");
  const [stockReason, setStockReason] = useState("");
  const [stockSaving, setStockSaving] = useState(false);
  const [stockError, setStockError] = useState("");

  const filterKey = JSON.stringify([searchQuery, filters, sortParams]);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ key: filterKey, page: next });
  const { data: loaded, loading, error, reload } = useApiData(
    () => listItems({ page, pageSize: 20, search: searchQuery || undefined, ...toItemFilterParams(filters), ...sortParams }),
    `${filterKey}|${page}`,
    "Gagal memuat data barang.",
  );
  const dataBarang = loaded?.rows ?? [];

  // Pilihan disimpan per id agar tetap ada saat pindah halaman, cari, atau urutkan.
  const [selected, setSelected] = useState(new Map<number, ItemListRow>());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkUploaded, setBulkUploaded] = useState(false); // centangan dikosongkan hanya bila sudah ada upload
  const toggleRow = (item: ItemListRow) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.set(item.id, item);
      return next;
    });
  const pageAllSelected = dataBarang.length > 0 && dataBarang.every((i) => selected.has(i.id));
  const togglePage = () =>
    setSelected((prev) => {
      const next = new Map(prev);
      for (const i of dataBarang) {
        if (pageAllSelected) next.delete(i.id);
        else next.set(i.id, i);
      }
      return next;
    });
  const total = loaded?.total ?? 0;
  useEffect(() => {
    loaded?.rows.forEach((r) => seen.current.set(r.id, r));
  }, [loaded]);

  useEffect(() => {
    listLocations().then((res) => setLocations(res.rows)).catch(() => {});
    listSuppliers().then((res) => setSuppliers(res.rows)).catch(() => {});
    listItemCategories().then((res) => setCategories(res.map((c) => c.name))).catch(() => {});
    listItemUnits().then((res) => setUnits(res.map((u) => u.name))).catch(() => {});
  }, []);

  const supplierName = (id: number | null) => suppliers.find((s) => s.id === id)?.name ?? '-';
  const locationCode = (id: number | null) => (id === null ? '-' : locations.find((loc) => loc.id === id)?.code ?? `#${id}`);

  // Simpan perubahan satu barang: data master lewat PUT /items/:id, lokasi lewat assign-location.
  // Kode barang yang sudah ada (mis. kode resmi hasil import) dipertahankan; hanya barang tanpa kode yang memakai saran kode.
  const simpanSemua = () =>
    edit.save(async (id, patch) => {
      const row = seen.current.get(id);
      if (!row) return;
      const input: UpdateItemInput = {};
      if ('name' in patch) input.name = patch.name.trim();
      if ('detail' in patch) input.detail = patch.detail.trim() || null;
      if ('category' in patch) input.category = patch.category;
      if ('unit' in patch) input.unit = patch.unit;
      if ('price' in patch) input.price = Number(patch.price);
      if ('supplierId' in patch) input.supplierId = patch.supplierId === '' ? null : Number(patch.supplierId);
      if (input.name === '') throw new Error('Nama barang wajib diisi.');
      if (input.price !== undefined && (!Number.isInteger(input.price) || input.price < 0)) throw new Error('Harga harus bilangan bulat 0 atau lebih.');
      if (Object.keys(input).length > 0) await updateItem(id, input);
      if ('locationId' in patch && patch.locationId) {
        const locationId = Number(patch.locationId);
        const code = row.code ?? (await suggestItemCode(id, locationId)).code;
        await assignItemLocation(id, { code, locationId });
      }
    }, reload);

  const openStockModal = (item: ItemListRow) => {
    setStockItem(item);
    setStockDelta("");
    setStockReason("");
    setStockError("");
    setIsStockModalOpen(true);
  };

  const handleSimpanStok = async () => {
    const delta = Number(stockDelta);
    if (!stockItem || !stockDelta || Number.isNaN(delta) || delta === 0 || !stockReason) {
      setStockError("Isi jumlah perubahan (boleh negatif) dan alasan.");
      return;
    }
    setStockSaving(true);
    setStockError("");
    try {
      await adjustItemStock(stockItem.id, { delta, reason: stockReason });
      reload();
      setIsStockModalOpen(false);
    } catch (err) {
      setStockError(err instanceof ApiError ? err.message : "Gagal menyesuaikan stok.");
    } finally {
      setStockSaving(false);
    }
  };

  const getCategoryColor = (kategori: string) => {
    if (!kategori) return 'bg-gray-100 text-gray-700 border-gray-200/50';
    switch(kategori.toLowerCase()) {
      case 'lembaran': return 'bg-blue-100 text-blue-700 border-blue-200/50';
      case 'kayu solid': return 'bg-amber-100 text-amber-700 border-amber-200/50';
      case 'logam': return 'bg-slate-100 text-slate-700 border-slate-200/50';
      case 'finishing': return 'bg-teal-100 text-teal-700 border-teal-200/50';
      case 'aksesoris': return 'bg-pink-100 text-pink-700 border-pink-200/50';
      default: return 'bg-purple-100 text-purple-700 border-purple-200/50';
    }
  };

  const handleExportExcel = () => {
    const headers = ['No,Kode Barang,Nama Barang,Supplier,Jumlah Stok,Satuan,Kategori,Lokasi'];
    const csvData = dataBarang.map((item, index) =>
      `${index + 1},${item.code ?? '-'},"${item.name}","${supplierName(item.supplierId)}",${item.stock},${item.unit},${item.category},${locationCode(item.locationId)}`
    );
    const csvString = [...headers, ...csvData].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Data_Barang_Gudang.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">Data Barang</h1>
          <p className="text-gray-500 text-sm">Kelola master data barang dan lokasi inventaris gudang.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              maxLength={100}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all"
              placeholder="Cari kode atau nama barang..."
            />
          </div>
          <div className="flex items-center gap-2">
            {canCreate && (
                <ImportExcelButton
                    templateHeaders={mstrDataTemplateHeaders}
                    templateExample={mstrDataTemplateExample}
                    templateFilename="Template_Import_Barang.xlsx"
                    parseRow={MasterData}
                    previewColumns={[
                        { header: 'Nama Barang', value: (r) => r.name },
                        { header: 'Kode Barang', value: (r) => r.code },
                        { header: 'Keterangan Barang', value: (r) => r.detail },
                        { header: 'Harga', value: (r) => r.price },
                        { header: 'Stok', value: (r) => r.stock },
                    ]}
                    saveLabel="Lanjut ke Mapping"
                    onSave={async (rows) => setPendingImport(rows)}
                    />
                )}
            {canUploadPhoto && (
              <button
                type="button"
                onClick={() => setBulkOpen(true)}
                disabled={selected.size === 0}
                className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Images className="w-4 h-4" />
                {`Pasang Foto Massal (${selected.size})`}
              </button>
            )}
            <ExportExcellButton onClick={handleExportExcel} />
            {(canUpdate || canAssign) && <EditModeBar editing={edit.editing} dirty={edit.dirty} saving={edit.saving} onToggle={edit.toggle} onSave={simpanSemua} onCancel={edit.cancel} />}
            <button
              type="button"
              onClick={() => setShowFilter((v) => !v)}
              aria-expanded={showFilter}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors text-sm font-medium ${showFilter || countActiveFilters(filters) > 0 ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <Filter className="w-4 h-4" />
              <span>Filter{countActiveFilters(filters) > 0 ? ` (${countActiveFilters(filters)})` : ''}</span>
            </button>
          </div>
        </div>

        {showFilter && (
          <BarangFilterPanel
            value={filters}
            onChange={setFilters}
            categories={categories}
            units={units}
            suppliers={suppliers}
            locations={locations}
          />
        )}

        {pendingImport.length > 0 && (
          <ImportBarangMapping
            rows={pendingImport}
            canSetSupplier={canSetSupplier}
            options={{ suppliers: suppliers.map((x) => x.name), categories, units, locations: locations.map((l) => l.code) }}
            onClose={() => setPendingImport([])}
            onDone={(note) => { setPendingImport([]); setImportNote(note); reload(); }}
          />
        )}

        {importNote && <div className="mx-5 mt-5 p-3 bg-green-50 text-green-700 text-sm rounded-lg">{importNote}</div>}

        {error && (
          <div className="mx-5 mt-5 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
        )}

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                {canUploadPhoto && (
                  <th scope="col" className="px-4 py-4">
                    <input type="checkbox" aria-label="Pilih semua barang di halaman ini" checked={pageAllSelected} onChange={togglePage} className="w-4 h-4 rounded border-gray-300 text-[#FF8A00] focus:ring-[#FF8A00]" />
                  </th>
                )}
                <th scope="col" className="px-6 py-4">No</th>
                <th scope="col" className="px-6 py-4">Foto</th>
                <SortableTh label="Informasi Barang" sortKey="name" sort={sort} onSort={toggle} />
                <SortableTh label="Supplier" sortKey="supplierName" sort={sort} onSort={toggle} />
                <SortableTh label="Stok & Satuan" sortKey="stock" sort={sort} onSort={toggle} />
                <SortableTh label="Kategori" sortKey="category" sort={sort} onSort={toggle} />
                <SortableTh label="Harga" sortKey="price" sort={sort} onSort={toggle} />
                <SortableTh label="Lokasi" sortKey="locationCode" sort={sort} onSort={toggle} />
                <SortableTh label="Keterangan" sortKey="detail" sort={sort} onSort={toggle} />
                {canAdjust && <th scope="col" className="px-6 py-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={canUploadPhoto ? 11 : 10} className="px-6 py-6 text-center text-gray-400">Memuat data...</td></tr>
              )}
              {!loading && dataBarang.length === 0 && (
                <tr><td colSpan={canUploadPhoto ? 11 : 10} className="px-6 py-6 text-center text-gray-400">Belum ada data barang.</td></tr>
              )}
              {!loading && dataBarang.map((item, index) => {
                const v = (key: string, original: string) => edit.value(item.id, key, original);
                const setF = (key: string, original: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => edit.set(item.id, key, e.target.value, original);
                const cell = 'w-full min-w-28 border border-gray-200 rounded-lg py-1.5 px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500';
                const supplierId = item.supplierId === null ? '' : String(item.supplierId);
                const locationId = item.locationId === null ? '' : String(item.locationId);
                const editableLokasi = edit.editing && canAssign;
                return (
                <tr key={item.id} className={`${edit.isDirty(item.id) ? 'bg-amber-50' : index % 2 ? 'bg-gray-50' : 'bg-white'} hover:bg-[#FF8A00]/5 transition-colors group`}>
                  {canUploadPhoto && (
                    <td className="px-4 py-4">
                      <input type="checkbox" aria-label={`Pilih ${item.name}`} checked={selected.has(item.id)} onChange={() => toggleRow(item)} className="w-4 h-4 rounded border-gray-300 text-[#FF8A00] focus:ring-[#FF8A00]" />
                    </td>
                  )}
                  <td className="px-6 py-4 text-gray-500">{(page - 1) * 20 + index + 1}</td>

                  {/* Foto */}
                  <td className="px-6 py-4">
                    <ItemPhoto item={item} canUpload={canUploadPhoto} onUploaded={reload} />
                  </td>

                  {/* Informasi Barang */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      {edit.editing && canUpdate ? (
                        <input aria-label={`Nama ${item.name}`} className={cell} maxLength={191} value={v('name', item.name)} onChange={setF('name', item.name)} />
                      ) : (
                        <span className="font-bold text-gray-900">{item.name}</span>
                      )}
                      <span className="text-xs font-mono text-gray-500 mt-0.5">{item.code ?? '-'}</span>
                      {edit.errors[item.id] && <span className="text-xs text-red-600 mt-0.5 whitespace-normal">{edit.errors[item.id]}</span>} 
                    </div>
                  </td>

                  {/* Supplier */}
                  <td className="px-6 py-4">
                    {edit.editing && canSetSupplier ? (
                      <select aria-label={`Supplier ${item.name}`} className={cell} value={v('supplierId', supplierId)} onChange={setF('supplierId', supplierId)}>
                        <option value="">Belum ada supplier</option>
                        {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-600">
                        <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                          {supplierName(item.supplierId).charAt(0)}
                        </div>
                        <span>{supplierName(item.supplierId)}</span>
                      </div>
                    )}
                  </td>

                  {/* Stok & Satuan */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <span className={`font-bold ${item.stock < 20 ? 'text-red-600' : item.stock < 50 ? 'text-amber-600' : 'text-gray-800'}`}>
                         {item.stock}
                       </span>
                       {edit.editing && canUpdate ? (
                         <select aria-label={`Satuan ${item.name}`} className={`${cell} min-w-24`} value={v('unit', item.unit)} onChange={setF('unit', item.unit)}>
                           {[...new Set([item.unit, ...units])].map((u) => <option key={u} value={u}>{u}</option>)}
                         </select>
                       ) : (
                         <span className="text-gray-500 text-xs bg-gray-100 px-2 py-0.5 rounded-md">{item.unit}</span>
                       )}
                    </div>
                  </td>

                  {/* Kategori */}
                  <td className="px-6 py-4">
                    {edit.editing && canUpdate ? (
                      <select aria-label={`Kategori ${item.name}`} className={cell} value={v('category', item.category)} onChange={setF('category', item.category)}>
                        {[...new Set([item.category, ...categories])].map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor(item.category)}`}>
                        {item.category || '-'}
                      </span>
                    )}
                  </td>

                  {/* Harga */}
                  <td className="px-6 py-4 text-gray-700">
                    {edit.editing && canSetPrice ? (
                      <input aria-label={`Harga ${item.name}`} inputMode="numeric" className={`${cell} min-w-24`} maxLength={9} value={v('price', String(item.price))} onChange={(e) => edit.set(item.id, 'price', e.target.value.replace(/\D/g, ''), String(item.price))} />
                    ) : item.price.toLocaleString('id-ID')}
                  </td>

                  {/* Lokasi: dipilih langsung di barisnya */}
                  <td className="px-6 py-4">
                    {editableLokasi ? (
                      <select aria-label={`Lokasi ${item.name}`} className={cell} value={v('locationId', locationId)} onChange={setF('locationId', locationId)}>
                        {item.locationId === null && <option value="">Belum ada lokasi</option>}
                        {locations.map((loc) => <option key={loc.id} value={loc.id} title={loc.description ?? undefined}>{loc.description ? `${loc.code} · ${loc.description}` : loc.code}</option>)}
                      </select>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-600 font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF8A00]"></div>
                        {locationCode(item.locationId)}
                      </span>
                    )}
                  </td>

                  {/* Keterangan */}
                  <td className="px-6 py-4 text-gray-600">
                    {edit.editing && canUpdate ? (
                      <input aria-label={`Keterangan ${item.name}`} className={cell} maxLength={255} value={v('detail', item.detail ?? '')} onChange={setF('detail', item.detail ?? '')} />
                    ) : (item.detail || '-')}
                  </td>

                  {/* Aksi */}
                  {canAdjust && (
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => openStockModal(item)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 transition-all duration-200 opacity-90 group-hover:opacity-100"
                        title="Sesuaikan stok"
                      >
                        <Edit2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                        Stok
                      </button>
                    </td>
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
      </div>

      {bulkOpen && (
        <BulkPhotoModal
          items={[...selected.values()]}
          onClose={() => { setBulkOpen(false); if (bulkUploaded) setSelected(new Map()); setBulkUploaded(false); }}
          onDone={() => { setBulkUploaded(true); reload(); }}
        />
      )}

      {/* Modal Sesuaikan Stok */}
      {isStockModalOpen && stockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
                SESUAIKAN STOK · {stockItem.name}
              </h2>
              <button
                onClick={() => setIsStockModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              Stok saat ini: <span className="font-bold text-gray-800">{stockItem.stock} {stockItem.unit}</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-6 mb-6">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Perubahan Jumlah</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={10}
                  placeholder="Contoh: 10 atau -5"
                  className="w-full border border-gray-200 bg-gray-50/50 rounded-xl py-2.5 px-4 text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200"
                  value={stockDelta}
                  onChange={(e) => setStockDelta(e.target.value.replace(/(?!^-)\D/g, ""))}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Alasan</label>
                <input
                  type="text"
                  placeholder="Contoh: Penerimaan PO-2026-09-001"
                  className="w-full border border-gray-200 bg-gray-50/50 rounded-xl py-2.5 px-4 text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200"
                  value={stockReason}
                  maxLength={255}
                  onChange={(e) => setStockReason(e.target.value)}
                />
              </div>
            </div>

            {stockError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{stockError}</div>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={handleSimpanStok}
                disabled={stockSaving}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all text-sm disabled:opacity-60"
              >
                {stockSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
