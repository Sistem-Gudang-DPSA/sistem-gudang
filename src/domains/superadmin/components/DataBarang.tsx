"use client";

import dynamic from 'next/dynamic';
import { useAuthUser, useCan } from '@/domains/auth/user-context';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Images, RefreshCw, Trash2, Edit2 } from 'lucide-react';
import { adjustItemStock, assignItemLocation, bulkRecodeItems, deleteItem, listItems, recodeItem, updateItem } from '@/domains/inventory/api';
import type { ItemListRow, UpdateItemInput } from '@/domains/inventory/types';
import { ApiError } from '@/shared/lib/api-client';
import Pagination from '@/shared/components/Pagination';
import { fetchAllPages } from '@/shared/lib/fetch-all';
import { ExportExcellButton } from '@/shared/components/Tombol';
import { ImportExcelButton, addReferenceColumns } from '@/shared/components/ImportExcelButton';
import ImportBarangMapping from './ImportBarangMapping';
const BulkPhotoModal = dynamic(() => import('@/domains/inventory/components/BulkPhotoModal'), { ssr: false });
import BarangFilterPanel, { countActiveFilters, toItemFilterParams } from '@/domains/inventory/components/BarangFilterPanel';
import EditModeBar, { useBatchEdit } from '@/shared/components/EditModeBar';
import { kodeKategoriNotice, type CodeChange } from '@/domains/inventory/item-code-notice';
import { printItemLabels } from '@/domains/inventory/label-print';
import { useDataBarang } from '@/domains/inventory/components/data-barang/useDataBarang';
import DataBarangTable, { type BarangColumn, KategoriBadge, StokCell, SupplierCell } from '@/domains/inventory/components/data-barang/DataBarangTable';
import DataBarangToolbar, { FilterToggle } from '@/domains/inventory/components/data-barang/DataBarangToolbar';
import AdjustStokModal from '@/domains/inventory/components/data-barang/modals/AdjustStokModal';
import RecodeNotice from '@/domains/inventory/components/data-barang/modals/RecodeModal';
import { MasterData, mstrDataTemplateExample, mstrDataTemplateHeaders, type MasterDataImportRow } from '@/domains/inventory/components/data-barang/modals/ImportMasterData';

export { MasterData, mstrDataTemplateExample, mstrDataTemplateHeaders };
export type { MasterDataImportRow };

const PAGE_SIZE_OPTIONS = [20, 50, 100];

type CodeLabel = { code: string | null; name: string; externalCode?: string | null; locationCode: string };

const cellInput = 'w-full min-w-28 border border-gray-200 rounded-lg py-1.5 px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500';
const idText = (v: number | null) => (v === null ? '' : String(v));

// Layar Data Barang Superadmin: sama dengan Gudang, ditambah edit massal inline, ganti kode, hapus, sesuaikan stok, dan import Excel master data.
export default function DataBarangGudang() {
  const canCreate = useCan('item.create');
  const canAssign = useCan('item.assign-location');
  const canAdjust = useCan('item.adjust-stock');
  const canDelete = useCan('item.delete');
  const showAksi = canAdjust || canDelete;
  // BE allows recode for a superadmin only; no user in context means the route guard already let us in, as in useCan
  const isSuperadmin = useAuthUser()?.isSuperadmin ?? true;
  const canUpdate = useCan('item.update');
  const canSetPrice = useCan('item.set-price');
  const canSetSupplier = useCan('item.set-supplier');
  const canUploadPhoto = useCan('item.upload-photo');
  const edit = useBatchEdit();
  const seen = useRef(new Map<number, ItemListRow>()); // semua baris yang pernah tampil, untuk menyimpan perubahan dari halaman lain
  const d = useDataBarang();
  const { dataBarang, total, page, pageSize, setPage, setPageSize, selected, setSelected, toggleRow, togglePage, pageAllSelected, reload, loaded, locations, suppliers, categories, units, supplierName, locationCode, sortParams, debouncedSearch, filters } = d;

  const [pendingImport, setPendingImport] = useState<MasterDataImportRow[]>([]);
  const [importNote, setImportNote] = useState('');
  const [codeNotice, setCodeNotice] = useState<{ headline: string; lines: string[]; labels: CodeLabel[] } | null>(null); // hasil Ganti kode, satu atau banyak barang
  const [actionError, setActionError] = useState('');

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockItem, setStockItem] = useState<ItemListRow | null>(null);
  const [stockDelta, setStockDelta] = useState("");
  const [stockReason, setStockReason] = useState("");
  const [stockSaving, setStockSaving] = useState(false);
  const [stockError, setStockError] = useState("");

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkUploaded, setBulkUploaded] = useState(false); // centangan dikosongkan hanya bila sudah ada upload
  // Semua barang sesuai pencarian/filter aktif (semua halaman); dipakai export dan pilih semua
  const fetchAllFiltered = () =>
    fetchAllPages((p) => listItems({ page: p, pageSize: 100, search: debouncedSearch || undefined, ...toItemFilterParams(filters), ...sortParams }));
  const [selectingAll, setSelectingAll] = useState(false);
  const selectAllFiltered = async () => {
    setSelectingAll(true);
    setActionError('');
    try {
      const rows = await fetchAllFiltered();
      setSelected((prev) => new Map([...prev, ...rows.map((r) => [r.id, r] as const)]));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Gagal memilih semua barang.');
    } finally {
      setSelectingAll(false);
    }
  };
  useEffect(() => {
    loaded?.rows.forEach((r) => seen.current.set(r.id, r));
  }, [loaded]);

  // Simpan perubahan satu barang: data master lewat PUT /items/:id, lokasi lewat assign-location.
  // Kode dari BE dibandingkan dengan kode sebelum simpan untuk notifikasi perubahan kategori.
  const simpanSemua = () => {
    const codeChanges: CodeChange[] = [];
    edit.save(async (id, patch) => {
      const before = seen.current.get(id);
      if (!before) return;
      const input: UpdateItemInput = {};
      if ('name' in patch) input.name = patch.name.trim();
      if ('detail' in patch) input.detail = patch.detail.trim() || null;
      if ('category' in patch) input.category = patch.category;
      if ('unit' in patch) input.unit = patch.unit;
      if ('price' in patch) input.price = Number(patch.price);
      if ('supplierId' in patch) input.supplierId = patch.supplierId === '' ? null : Number(patch.supplierId);
      if (input.name === '') throw new Error('Nama barang wajib diisi.');
      if (input.price !== undefined && (!Number.isInteger(input.price) || input.price < 0)) throw new Error('Harga harus bilangan bulat 0 atau lebih.');
      if (Object.keys(input).length > 0) {
        const updated = await updateItem(id, input);
        if (input.category !== undefined && input.category !== before.category) codeChanges.push({ from: before.code, to: updated.code });
      }
      if ('locationId' in patch && patch.locationId) {
        await assignItemLocation(id, { locationId: Number(patch.locationId) });
      }
    }, () => {
      reload();
      const note = kodeKategoriNotice(codeChanges);
      if (note) setImportNote(note);
    });
  };

  const handleGantiKode = async (item: ItemListRow) => {
    if (!window.confirm(`Ganti kode ${item.code}? Label lama tidak bisa di-scan lagi. Cetak ulang label setelah ini.`)) return;
    setActionError('');
    setCodeNotice(null);
    try {
      const updated = await recodeItem(item.id);
      reload();
      setCodeNotice({
        headline: `Kode barang berubah dari ${item.code ?? '-'} menjadi ${updated.code ?? '-'}.`,
        lines: [],
        labels: [{ code: updated.code, name: updated.name, externalCode: updated.externalCode, locationCode: locationCode(updated.locationId) }],
      });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal mengganti kode barang.');
    }
  };

  // Untuk barang dobel/salah input, satu per satu (sengaja tanpa hapus massal). BE menolak (409) barang yang sudah
  // dipakai transaksi atau punya riwayat harga supplier, supaya kartu stok tidak putus.
  const handleHapus = async (item: ItemListRow) => {
    if (!window.confirm(`Hapus barang "${item.name}"${item.code ? ` (${item.code})` : ''}? Tindakan ini tidak bisa dibatalkan.`)) return;
    setActionError('');
    setImportNote('');
    try {
      await deleteItem(item.id);
      setSelected((prev) => { const next = new Map(prev); next.delete(item.id); return next; });
      setImportNote(`Barang "${item.name}" dihapus.`);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError && err.status === 409
        ? `Barang "${item.name}" tidak bisa dihapus karena sudah dipakai transaksi.`
        : err instanceof Error ? err.message : 'Gagal menghapus barang.');
    }
  };

  // TEMP(hapus-semua): sementara untuk membersihkan data produksi; hapus blok ini, tombolnya, dan test-nya setelah selesai.
  // Menghapus semua barang sesuai pencarian/filter aktif (tanpa filter = semua barang). Barang yang sudah dipakai transaksi ditolak BE (409).
  const [deletingAll, setDeletingAll] = useState('');
  const handleHapusSemua = async () => {
    const scope = debouncedSearch || countActiveFilters(filters) ? ' sesuai pencarian/filter' : '';
    if (window.prompt(`Hapus SEMUA ${total} barang${scope}? Tindakan ini tidak bisa dibatalkan. Ketik HAPUS SEMUA untuk lanjut.`) !== 'HAPUS SEMUA') return;
    setActionError('');
    setImportNote('');
    let deleted = 0;
    let inUse = 0;
    const errors: string[] = [];
    try {
      const rows = await fetchAllFiltered();
      for (const [n, r] of rows.entries()) {
        setDeletingAll(`Menghapus ${n + 1}/${rows.length}...`);
        try {
          await deleteItem(r.id);
          deleted++;
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) inUse++;
          else errors.push(`${r.code ?? r.name}: ${err instanceof Error ? err.message : 'gagal'}`);
        }
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Gagal memuat daftar barang.');
    } finally {
      setDeletingAll('');
      setSelected(new Map());
      reload();
    }
    setImportNote(`${deleted} barang dihapus.${inUse ? ` ${inUse} barang dilewati karena sudah dipakai transaksi.` : ''}`);
    if (errors.length) setActionError(`${errors.length} barang gagal dihapus: ${errors.slice(0, 5).join('; ')}${errors.length > 5 ? '; ...' : ''}`);
  };

  const handleGantiKodeMassal = async () => {
    const rows = [...selected.values()];
    if (!window.confirm(`Ganti kode ${rows.length} barang? Label lama tidak bisa di-scan lagi. Cetak ulang label setelah ini.`)) return;
    setActionError('');
    setCodeNotice(null);
    try {
      const res = await bulkRecodeItems(rows.map((r) => r.id));
      const byId = new Map(rows.map((r) => [r.id, r]));
      reload();
      setSelected(new Map());
      setCodeNotice({
        headline: `${res.items.length} kode barang diganti.`,
        lines: [
          ...res.items.slice(0, 10).map((c) => `${c.oldCode} → ${c.newCode}`),
          ...(res.items.length > 10 ? [`dan ${res.items.length - 10} lainnya`] : []),
        ],
        labels: res.items.map((c) => {
          const row = byId.get(c.id);
          return { code: c.newCode, name: row?.name ?? '', externalCode: row?.externalCode ?? null, locationCode: locationCode(row?.locationId ?? null) };
        }),
      });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal mengganti kode barang massal.');
    }
  };

  const cetakLabel = async (labels: CodeLabel[]) => {
    setActionError(await printItemLabels(labels) ?? '');
  };

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

  const referenceLists = () => ({
    'Daftar Kategori': categories,
    'Daftar Satuan': units,
    'Daftar Lokasi': locations.map((l) => l.code),
    ...(canSetSupplier ? { 'Daftar Supplier': suppliers.map((x) => x.name) } : {}),
  });

  // Semua barang sesuai pencarian/filter aktif, bukan hanya halaman yang tampil
  const handleExportExcel = async () => {
    setActionError('');
    try {
      const [XLSX, rows] = await Promise.all([
        import('xlsx'),
        fetchAllFiltered(),
      ]);
      // Kode Barang (internal) dibuat sistem; ikut di-export sebagai info, diabaikan saat import
      const headers = [...mstrDataTemplateHeaders, 'Kode Barang'];
      const data = rows.map((i) => [i.externalCode ?? '', i.name, i.detail ?? '', i.category, i.unit, i.locationCode ?? '', i.supplierName ?? '', i.price, i.stock, i.code ?? '']);
      const sheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
      addReferenceColumns(XLSX, sheet, headers.length, referenceLists());
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, 'Data Barang');
      XLSX.writeFile(book, 'Data_Barang_Gudang.xlsx');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Gagal export data barang.');
    }
  };

  const setF = (item: ItemListRow, key: string, original: string) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => edit.set(item.id, key, e.target.value, original);

  const columns: BarangColumn[] = [
    { label: 'Kode Barang', tdClassName: 'px-6 py-4 font-mono text-xs text-gray-500', cell: (item) => item.code ?? '-' },
    { label: 'Nama Barang', sortKey: 'name', cell: (item) => (
      <div className="flex flex-col">
        {edit.editing && canUpdate ? (
          <input aria-label={`Nama ${item.name}`} className={cellInput} maxLength={191} value={edit.value(item.id, 'name', item.name)} onChange={setF(item, 'name', item.name)} />
        ) : (
          <span className="font-bold text-gray-900">{item.name}</span>
        )}
        {edit.errors[item.id] && <span className="text-xs text-red-600 mt-0.5 whitespace-normal">{edit.errors[item.id]}</span>}
      </div>
    ) },
    { label: 'Supplier', sortKey: 'supplierName', cell: (item) => (
      edit.editing && canSetSupplier ? (
        <select aria-label={`Supplier ${item.name}`} className={cellInput} value={edit.value(item.id, 'supplierId', idText(item.supplierId))} onChange={setF(item, 'supplierId', idText(item.supplierId))}>
          <option value="">Belum ada supplier</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      ) : (
        <SupplierCell name={supplierName(item.supplierId)} />
      )
    ) },
    { label: 'Stok', sortKey: 'stock', cell: (item) => <StokCell stock={item.stock} /> },
    { label: 'Satuan', tdClassName: 'px-6 py-4 text-gray-600', cell: (item) => item.unit },
    { label: 'Kategori', sortKey: 'category', cell: (item) => (
      edit.editing && canUpdate ? (
        <select aria-label={`Kategori ${item.name}`} className={cellInput} value={edit.value(item.id, 'category', item.category)} onChange={setF(item, 'category', item.category)}>
          {[...new Set([item.category, ...categories])].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      ) : (
        <KategoriBadge category={item.category} />
      )
    ) },
    { label: 'Harga', sortKey: 'price', tdClassName: 'px-6 py-4 text-gray-700', cell: (item) => (
      edit.editing && canSetPrice ? (
        <input aria-label={`Harga ${item.name}`} inputMode="numeric" className={`${cellInput} min-w-24`} maxLength={9} value={edit.value(item.id, 'price', String(item.price))} onChange={(e) => edit.set(item.id, 'price', e.target.value.replace(/\D/g, ''), String(item.price))} />
      ) : item.price.toLocaleString('id-ID')
    ) },
    // Lokasi: dipilih langsung di barisnya
    { label: 'Lokasi', sortKey: 'locationCode', cell: (item) => (
      edit.editing && canAssign ? (
        <select aria-label={`Lokasi ${item.name}`} className={cellInput} value={edit.value(item.id, 'locationId', idText(item.locationId))} onChange={setF(item, 'locationId', idText(item.locationId))}>
          {item.locationId === null && <option value="">Belum ada lokasi</option>}
          {locations.map((loc) => <option key={loc.id} value={loc.id} title={loc.description ?? undefined}>{loc.description ? `${loc.code} · ${loc.description}` : loc.code}</option>)}
        </select>
      ) : (
        <span className="inline-flex items-center gap-1 text-gray-600 font-medium">
          <div className="w-1.5 h-1.5 rounded-full bg-[#FF8A00]"></div>
          {locationCode(item.locationId)}
        </span>
      )
    ) },
    { label: 'Keterangan', sortKey: 'detail', tdClassName: 'px-6 py-4 text-gray-600', cell: (item) => (
      edit.editing && canUpdate ? (
        <input aria-label={`Keterangan ${item.name}`} className={cellInput} maxLength={255} value={edit.value(item.id, 'detail', item.detail ?? '')} onChange={setF(item, 'detail', item.detail ?? '')} />
      ) : (item.detail || '-')
    ) },
  ];

  const renderRowActions = (item: ItemListRow) => (
    <div className="flex items-center justify-center gap-2">
      {canAdjust && <button
        onClick={() => openStockModal(item)}
        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 transition-all duration-200 opacity-90 group-hover:opacity-100"
        title="Sesuaikan stok"
      >
        <Edit2 className="w-3.5 h-3.5" strokeWidth={2.5} />
        Stok
      </button>}
      {isSuperadmin && (
        <button
          onClick={() => handleGantiKode(item)}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-100 transition-all duration-200 opacity-90 group-hover:opacity-100"
          title="Ganti kode dari prefix kategori"
        >
          <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.5} />
          Ganti kode
        </button>
      )}
      {canDelete && (
        <button
          onClick={() => handleHapus(item)}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-all duration-200 opacity-90 group-hover:opacity-100"
          title="Hapus barang (dobel/salah input)"
        >
          <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
          Hapus
        </button>
      )}
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">Data Barang</h1>
          <p className="text-gray-500 text-sm">Kelola master data barang dan lokasi inventaris gudang.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <DataBarangToolbar
          searchValue={d.searchQuery}
          onSearchChange={d.setSearchQuery}
          bulkActions={<>
            {canCreate && (
              <ImportExcelButton
                templateHeaders={mstrDataTemplateHeaders}
                templateExample={mstrDataTemplateExample}
                templateFilename="Template_Import_Barang.xlsx"
                templateReference={referenceLists()}
                parseRow={MasterData}
                previewColumns={[
                  { header: 'Nama Barang', value: (r) => r.name },
                  { header: 'Kode Bawaan', value: (r) => r.code },
                  { header: 'Keterangan Barang', value: (r) => r.detail },
                  { header: 'Kategori', value: (r) => r.category },
                  { header: 'Satuan', value: (r) => r.unit },
                  { header: 'Lokasi', value: (r) => r.locationCode },
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
            {isSuperadmin && (
              <button
                type="button"
                onClick={handleGantiKodeMassal}
                disabled={selected.size === 0}
                className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                {`Ganti Kode Massal (${selected.size})`}
              </button>
            )}
            {/* TEMP(hapus-semua) */}
            {isSuperadmin && canDelete && (
              <button
                type="button"
                onClick={handleHapusSemua}
                disabled={!!deletingAll || total === 0}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {deletingAll || `Hapus Semua (${total})`}
              </button>
            )}
            <ExportExcellButton onClick={handleExportExcel} />
            {(canUpdate || canAssign) && <EditModeBar editing={edit.editing} dirty={edit.dirty} saving={edit.saving} onToggle={edit.toggle} onSave={simpanSemua} onCancel={edit.cancel} />}
          </>}
          filter={<FilterToggle open={d.showFilter} count={countActiveFilters(d.filters)} onToggle={() => d.setShowFilter((v) => !v)} />}
        />

        {d.showFilter && (
          <BarangFilterPanel
            value={d.filters}
            onChange={d.setFilters}
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

        {codeNotice && (
          <RecodeNotice headline={codeNotice.headline} lines={codeNotice.lines} onPrint={() => cetakLabel(codeNotice.labels)} />
        )}

        {(d.error || actionError) && (
          <div className="mx-5 mt-5 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{d.error || actionError}</div>
        )}

        {/* Table Container */}
        {pageAllSelected && total > dataBarang.length && (
          <div className="px-5 py-2 bg-orange-50 border-b border-orange-100 text-sm text-gray-700 flex flex-wrap items-center gap-3">
            <span>{selected.size} barang dipilih.</span>
            {selected.size < total && (
              <button type="button" onClick={selectAllFiltered} disabled={selectingAll} className="font-semibold text-[#FF8A00] hover:underline disabled:opacity-50">
                {selectingAll ? 'Memuat...' : `Pilih semua ${total} barang${debouncedSearch || countActiveFilters(filters) ? ' sesuai pencarian/filter' : ''}`}
              </button>
            )}
            <button type="button" onClick={() => setSelected(new Map())} className="font-semibold text-gray-500 hover:underline">Batalkan pilihan</button>
          </div>
        )}

        <DataBarangTable
          rows={dataBarang}
          loading={d.loading}
          colSpan={canUploadPhoto ? 13 : 12}
          columns={columns}
          sort={d.sort}
          onSort={d.toggle}
          numberOffset={(page - 1) * pageSize}
          photo={{ canUpload: canUploadPhoto, onUploaded: reload }}
          selection={canUploadPhoto ? {
            selected,
            allOnPage: pageAllSelected,
            onToggleRow: toggleRow,
            onToggleAll: togglePage,
            checkboxClassName: 'w-4 h-4 rounded border-gray-300 text-[#FF8A00] focus:ring-[#FF8A00]',
          } : undefined}
          rowActions={showAksi ? renderRowActions : undefined}
          rowClassName={(item, index) => `${edit.isDirty(item.id) ? 'bg-amber-50' : index % 2 ? 'bg-gray-50' : 'bg-white'} hover:bg-[#FF8A00]/5 transition-colors group`}
        />

        {total > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4">
            <label className="flex items-center justify-end gap-2 text-xs text-gray-500">
              Baris per halaman
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 bg-white border border-gray-200 rounded-md text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} activeClass="bg-indigo-500 text-white border-indigo-500" />
          </div>
        )}
      </div>

      {bulkOpen && (
        <BulkPhotoModal
          items={[...selected.values()]}
          onClose={() => { setBulkOpen(false); if (bulkUploaded) setSelected(new Map()); setBulkUploaded(false); }}
          onDone={() => { setBulkUploaded(true); reload(); }}
        />
      )}

      {isStockModalOpen && stockItem && (
        <AdjustStokModal
          item={stockItem}
          delta={stockDelta}
          setDelta={setStockDelta}
          reason={stockReason}
          setReason={setStockReason}
          error={stockError}
          saving={stockSaving}
          onSave={handleSimpanStok}
          onClose={() => setIsStockModalOpen(false)}
        />
      )}
    </div>
  );
}
