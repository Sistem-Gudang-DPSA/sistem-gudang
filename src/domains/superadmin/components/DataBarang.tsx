"use client";

import StockNotificationDetail from '@/domains/inventory/components/data-barang/StockNotificationDetail';

import StokMinimumCell from '@/domains/inventory/components/data-barang/StokMinimumCell';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuthUser, useCan } from '@/domains/auth/user-context';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Images, Trash2, Edit2, Truck } from 'lucide-react';
import { adjustItemStock, assignItemLocation, deleteItem, updateItem } from '@/domains/inventory/api';
import type { ItemListRow, UpdateItemInput } from '@/domains/inventory/types';
import { ApiError } from '@/shared/lib/api-client';
import { randomId } from '@/shared/lib/random-id';
import { ExportExcellButton } from '@/shared/components/Tombol';
import TableFooter from '@/shared/components/TableFooter';
import SelectionBanner from '@/shared/components/SelectionBanner';
import { ImportExcelButton, addReferenceColumns } from '@/shared/components/ImportExcelButton';
import ImportBarangMapping from './ImportBarangMapping';
const BulkPhotoModal = dynamic(() => import('@/domains/inventory/components/BulkPhotoModal'), { ssr: false });
import BarangFilterPanel, { countActiveFilters } from '@/domains/inventory/components/BarangFilterPanel';
import EditModeBar, { useBatchEdit } from '@/shared/components/EditModeBar';
import { kodeKategoriNotice, type CodeChange } from '@/domains/inventory/item-code-notice';
import { useDataBarang } from '@/domains/inventory/components/data-barang/useDataBarang';
import DataBarangTable, { type BarangColumn, HargaCell, KategoriBadge, StokCell } from '@/domains/inventory/components/data-barang/DataBarangTable';
import { totalStockValue } from '@/domains/inventory/components/data-barang/dummy-receipts';
import DataBarangToolbar, { FilterToggle } from '@/domains/inventory/components/data-barang/DataBarangToolbar';
import { useBulkSupplierAction, type SupplierMappingResult } from '@/domains/inventory/components/data-barang/useBulkSupplierAction';
import ActionMenu from '@/shared/components/ActionMenu';
import AdjustStokModal from '@/domains/inventory/components/data-barang/modals/AdjustStokModal';
import { MasterData, mstrDataTemplateExample, mstrDataTemplateHeaders, type MasterDataImportRow, MAX_IMPORT_ROWS } from '@/domains/inventory/components/data-barang/modals/ImportMasterData';

export { MasterData, mstrDataTemplateExample, mstrDataTemplateHeaders };
export type { MasterDataImportRow };

const cellInput = 'w-full min-w-28 border border-gray-200 rounded-lg py-1.5 px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500';
const idText = (v: number | null) => (v === null ? '' : String(v));

// Layar Data Barang Superadmin: sama dengan Gudang, ditambah edit massal inline, ganti kode, hapus, sesuaikan stok, dan import Excel master data.
export default function DataBarangGudang() {
  const canCreate = useCan('item.create');
  const canAssign = useCan('item.assign-location');
  const canAdjust = useCan('item.adjust-stock');
  const canDelete = useCan('item.delete');
  const canView = useCan('item.view');
  const router = useRouter();
  // Detail sudah dipindah ke klik baris, jadi kolom Aksi hanya diperlukan untuk tombol yang tersisa.
  const showAksi = canAdjust || canDelete;
  // BE allows recode for a superadmin only; no user in context means the route guard already let us in, as in useCan
  const isSuperadmin = useAuthUser()?.isSuperadmin ?? true;
  const canUpdate = useCan('item.update');
  const canSetPrice = useCan('item.set-price');
  const canSetSupplier = useCan('item.set-supplier');
  const canUploadPhoto = useCan('item.upload-photo');
  const canAssignSupplier = canUpdate && canSetSupplier;
  // Pilihan baris dipakai Edit Supplier dan Pasang Foto Massal.
  const canSelect = canUploadPhoto || canAssignSupplier;
  const edit = useBatchEdit();
  const seen = useRef(new Map<number, ItemListRow>()); // semua baris yang pernah tampil, untuk menyimpan perubahan dari halaman lain
  const d = useDataBarang();
  const { dataBarang, total, selected, setSelected, clearSelection, toggleRow, toggleAll, allSelected, reload, loaded, locations, suppliers, categories, units, locationCode, debouncedSearch, filters } = d;

  const [pendingImport, setPendingImport] = useState<MasterDataImportRow[]>([]);
  const [importNote, setImportNote] = useState('');
  const [actionError, setActionError] = useState('');
  const [supplierNotice, setSupplierNotice] = useState<{ text: string; failed: boolean } | null>(null);

  const handleSupplierFinished = (result: SupplierMappingResult) => {
    const failedIds = new Set(result.failed.map((f) => f.id));
    // Barang yang gagal tetap tercentang supaya bisa dicoba ulang.
    setSelected(new Map([...selected.entries()].filter(([id]) => failedIds.has(id))));
    const failedText = result.failed.map((f) => `${f.name}: ${f.reason}`).join('; ');
    setSupplierNotice({
      text: `${result.assigned} barang dipetakan ke ${result.supplierName}.${failedText ? ` Gagal: ${failedText}` : ''}`,
      failed: result.failed.length > 0,
    });
    reload();
  };

  const supplierAction = useBulkSupplierAction({
    selected,
    suppliers,
    canAssignSupplier,
    onFinished: handleSupplierFinished,
  });

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockItem, setStockItem] = useState<ItemListRow | null>(null);
  // Satu key per penyesuaian: dipakai ulang saat retry, ganti kalau isinya berubah
  const stockKey = useRef({ key: '', payload: '' });
  const [stockDelta, setStockDelta] = useState("");
  const [stockReason, setStockReason] = useState("");
  const [stockSaving, setStockSaving] = useState(false);
  const [stockError, setStockError] = useState("");

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkUploaded, setBulkUploaded] = useState(false); // centangan dikosongkan hanya bila sudah ada upload
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
      const rows = dataBarang;
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

  const openStockModal = (item: ItemListRow) => {
    setStockItem(item);
    stockKey.current = { key: '', payload: '' };
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
      const payload = `${stockItem.id}|${delta}|${stockReason}`;
      if (!stockKey.current.key || stockKey.current.payload !== payload) stockKey.current = { key: randomId(), payload };
      await adjustItemStock(stockItem.id, { delta, reason: stockReason }, stockKey.current.key);
      stockKey.current = { key: '', payload: '' };
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

  // Semua barang sesuai pencarian/filter aktif sudah dimuat, jadi export mencakup seluruhnya.
  const handleExportExcel = async () => {
    setActionError('');
    try {
      const [XLSX, rows] = await Promise.all([
        import('xlsx'),
        Promise.resolve(dataBarang),
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
    { label: 'Stok', sortKey: 'stock', cell: (item) => <StokCell stock={item.stock} /> },
    { label: 'Stok Minimum', cell: (item) => <StokMinimumCell item={item} onSaved={reload} /> },
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
    { label: 'Harga Terbaru', sortKey: 'price', tdClassName: 'px-6 py-4 text-gray-700', cell: (item) => (
      edit.editing && canSetPrice ? (
        <input aria-label={`Harga ${item.name}`} inputMode="numeric" className={`${cellInput} min-w-24`} maxLength={9} value={edit.value(item.id, 'price', String(item.price))} onChange={(e) => edit.set(item.id, 'price', e.target.value.replace(/\D/g, ''), String(item.price))} />
      ) : <HargaCell price={item.price} updatedAt={item.priceUpdatedAt} />
    ) },
    { label: 'Nilai Stok', tdClassName: 'px-6 py-4 text-gray-700', cell: () => <span title="Data dummy: total nilai stok dari detail barang">{totalStockValue.toLocaleString('id-ID')}</span> },
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
      {canDelete && (
        <button
          onClick={() => handleHapus(item)}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-all duration-200 opacity-90 group-hover:opacity-100"
          title="Hapus barang (dobel/salah input)"
        >
          <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <StockNotificationDetail />
      {supplierAction.modal}
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
                maxRows={MAX_IMPORT_ROWS}
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
            <ActionMenu
              label="Aksi Massal"
              count={selected.size}
              items={[
                {
                  key: 'supplier',
                  label: 'Edit Supplier',
                  icon: <Truck className="w-4 h-4" />,
                  onClick: supplierAction.open,
                  hidden: !canAssignSupplier,
                  disabled: selected.size === 0,
                },
                {
                  key: 'photo',
                  label: 'Pasang Foto Massal',
                  icon: <Images className="w-4 h-4" />,
                  onClick: () => setBulkOpen(true),
                  hidden: !canUploadPhoto,
                  disabled: selected.size === 0,
                },
                {
                  // TEMP(hapus-semua): sementara untuk membersihkan data produksi; hapus item ini dan test-nya setelah selesai.
                  key: 'delete-all',
                  label: `Hapus Semua (${total})`,
                  icon: <Trash2 className="w-4 h-4" />,
                  onClick: handleHapusSemua,
                  hidden: !(isSuperadmin && canDelete),
                  disabled: !!deletingAll || total === 0,
                  danger: true,
                  separator: true,
                },
              ]}
            />
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

        <SelectionBanner count={selected.size} onClear={clearSelection} />

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

        {supplierNotice && (
          <div
            role="status"
            className={`mx-5 mt-5 p-3 text-sm rounded-lg ${supplierNotice.failed ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}
          >
            {supplierNotice.text}
          </div>
        )}

        {deletingAll && <div role="status" className="mx-5 mt-5 p-3 bg-amber-50 text-amber-700 text-sm rounded-lg">{deletingAll}</div>}

        {(d.error || actionError) && (
          <div className="mx-5 mt-5 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{d.error || actionError}</div>
        )}

        {/* Table Container */}
        <DataBarangTable
          rows={dataBarang}
          loading={d.loading}
          columns={columns}
          sort={d.sort}
          onSort={d.toggle}
          photo={{ canUpload: canUploadPhoto, onUploaded: reload }}
          selection={canSelect ? {
            selected,
            allSelected,
            onToggleRow: toggleRow,
            onToggleAll: toggleAll,
            checkboxClassName: 'w-4 h-4 rounded border-gray-300 text-[#FF8A00] focus:ring-[#FF8A00]',
          } : undefined}
          rowActions={showAksi ? renderRowActions : undefined}
          onRowClick={canView ? (item) => router.push(`/dashboard/superadmin/master/data-barang/${item.id}`) : undefined}
          rowClassName={(item, index) => `${edit.isDirty(item.id) ? 'bg-amber-50' : index % 2 ? 'bg-gray-50' : 'bg-white'} hover:bg-[#FF8A00]/5 transition-colors group${canView ? ' cursor-pointer' : ''}`}
        />

        <TableFooter total={total} unit="barang" />
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
