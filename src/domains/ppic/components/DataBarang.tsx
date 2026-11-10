"use client";

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useCan } from '@/domains/auth/user-context';
import { Plus, Edit2, Trash2, Filter, MoreHorizontal, Images } from 'lucide-react';
import { createItem, deleteItem, updateItem } from '@/domains/inventory/api';
import type { ItemListRow } from '@/domains/inventory/types';
import { toCsv } from '@/shared/lib/csv';
import { ApiError } from '@/shared/lib/api-client';
import Pagination from '@/shared/components/Pagination';
import { ExportExcellButton } from '@/shared/components/Tombol';
import { kodeKategoriNotice } from '@/domains/inventory/item-code-notice';
import { useDataBarang } from '@/domains/inventory/components/data-barang/useDataBarang';
import DataBarangTable, { type BarangColumn, KategoriBadge, StokCell, SupplierCell } from '@/domains/inventory/components/data-barang/DataBarangTable';
import DataBarangToolbar from '@/domains/inventory/components/data-barang/DataBarangToolbar';
import ItemFormModal, { type ItemForm } from '@/domains/inventory/components/data-barang/modals/ItemFormModal';
const BulkPhotoModal = dynamic(() => import('@/domains/inventory/components/BulkPhotoModal'), { ssr: false });

const emptyForm: ItemForm = { name: '', unit: '', category: '', price: '', supplierId: '' };

export default function DataBarangPPIC() {
  const canCreate = useCan("item.create");
  const canUpdate = useCan("item.update");
  const canDelete = useCan("item.delete");
  const canUploadPhoto = useCan("item.upload-photo");
  const d = useDataBarang({ cacheReferenceLists: true });
  const { dataBarang, total, page, setPage, selected, setSelected, reload, supplierName, locationCode } = d;

  const [actionError, setActionError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<ItemForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [notice, setNotice] = useState("");

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkUploaded, setBulkUploaded] = useState(false); // centangan dikosongkan hanya bila sudah ada upload
  const error = actionError || d.error;

  const handleSimpan = async () => {
    if (!formData.name || !formData.unit || !formData.category || !formData.price || !formData.supplierId) {
      setModalError('Mohon lengkapi semua data!');
      return;
    }
    setSaving(true);
    setModalError("");
    setNotice("");
    try {
      if (editingId) {
        const before = dataBarang.find((i) => i.id === editingId);
        const updated = await updateItem(editingId, {
          name: formData.name,
          unit: formData.unit,
          category: formData.category,
          price: Number(formData.price),
          supplierId: Number(formData.supplierId),
        });
        if (before && before.category !== formData.category) {
          setNotice(kodeKategoriNotice([{ from: before.code, to: updated.code }]));
        }
      } else {
        await createItem({
          name: formData.name,
          unit: formData.unit,
          category: formData.category,
          price: Number(formData.price),
          supplierId: Number(formData.supplierId),
        });
      }
      reload();
      setIsModalOpen(false);
      setEditingId(null);
      setFormData(emptyForm);
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : "Gagal menyimpan barang.");
    } finally {
      setSaving(false);
    }
  };

  const handleMulaiTambah = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setModalError("");
    setIsModalOpen(true);
  };

  const handleEdit = (item: ItemListRow) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      unit: item.unit,
      category: item.category,
      price: String(item.price),
      supplierId: item.supplierId === null ? '' : String(item.supplierId),
    });
    setModalError("");
    setIsModalOpen(true);
  };

  const handleHapus = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    try {
      await deleteItem(id);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Gagal menghapus barang.");
    }
  };

  const handleExportCSV = () => {
    const rows: unknown[][] = [['No', 'Kode Barang', 'Kode Bawaan', 'Nama Barang', 'Supplier', 'Jumlah Stok', 'Satuan', 'Kategori', 'Harga', 'Lokasi']];
    dataBarang.forEach((item, index) => rows.push([index + 1, item.code ?? '-', item.externalCode ?? '-', item.name, supplierName(item.supplierId), item.stock, item.unit, item.category, item.price, locationCode(item.locationId)]));
    const csvString = toCsv(rows);

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Data_Barang_PPIC_halaman-${page}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Kolom "Stok & Satuan" hanya kepala: di tabel PPIC asli ada dua header Stok tapi satu sel stok. Dipertahankan apa adanya.
  const columns: BarangColumn[] = [
    { label: 'Kode Barang', tdClassName: 'px-6 py-4 font-mono text-xs text-gray-500', cell: (item) => item.code ?? '-' },
    { label: 'Informasi Barang', sortKey: 'name', tdClassName: 'px-6 py-4 font-bold text-gray-900', cell: (item) => item.name },
    { label: 'Kode Bawaan', tdClassName: 'px-6 py-4 text-gray-600', cell: (item) => item.externalCode || '-' },
    { label: 'Supplier', sortKey: 'supplierName', cell: (item) => <SupplierCell name={supplierName(item.supplierId)} /> },
    { label: 'Stok & Satuan', sortKey: 'stock' },
    { label: 'Stok', sortKey: 'stock', cell: (item) => <StokCell stock={item.stock} /> },
    { label: 'Satuan', tdClassName: 'px-6 py-4 text-gray-600', cell: (item) => item.unit },
    { label: 'Kategori', sortKey: 'category', cell: (item) => <KategoriBadge category={item.category} /> },
    { label: 'Harga (Rp)', sortKey: 'price', align: 'right', tdClassName: 'px-6 py-4 text-right font-mono text-gray-700', cell: (item) => item.price },
    { label: 'Lokasi', sortKey: 'locationCode', cell: (item) => (
      <span className="inline-flex items-center gap-1 text-gray-600 font-medium">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
        {locationCode(item.locationId)}
      </span>
    ) },
    { label: 'Keterangan', sortKey: 'detail', tdClassName: 'px-6 py-4 text-gray-600', cell: (item) => item.detail || '-' },
  ];

  const renderRowActions = (item: ItemListRow) => (
    <>
      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {canUpdate && (
          <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Data">
            <Edit2 className="w-4 h-4" />
          </button>
        )}
        {canDelete && (
          <button onClick={() => handleHapus(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus Data">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      {/* Fallback for mobile/non-hover */}
      <button className="md:hidden p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
        <MoreHorizontal className="w-4 h-4" />
      </button>
    </>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">Data Barang</h1>
          <p className="text-gray-500 text-sm">Kelola master data barang, material, dan stok inventaris PPIC.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <DataBarangToolbar
          searchValue={d.searchQuery}
          onSearchChange={d.setSearchQuery}
          searchInputClassName="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 sm:text-sm transition-all"
          bulkActions={<>
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
            <ExportExcellButton onClick={handleExportCSV} disabled={d.loading || dataBarang.length === 0} />
          </>}
          filter={
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
          }
          trailing={canCreate && (
            <button
              onClick={handleMulaiTambah}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#ff8a00] text-white rounded-lg hover:bg-[#eb7d00] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Tambah Data</span>
            </button>
          )}
        />

        {notice && <div className="mx-5 mt-5 p-3 bg-green-50 text-green-700 text-sm rounded-lg">{notice}</div>}

        {error && (
          <div className="mx-5 mt-5 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
        )}

        <DataBarangTable
          rows={dataBarang}
          loading={d.loading}
          colSpan={canUploadPhoto ? 12 : 11}
          columns={columns}
          sort={d.sort}
          onSort={d.toggle}
          photo={{ canUpload: canUploadPhoto, onUploaded: reload }}
          selection={canUploadPhoto ? {
            selected,
            allOnPage: d.pageAllSelected,
            onToggleRow: d.toggleRow,
            onToggleAll: d.togglePage,
            checkboxClassName: 'w-4 h-4 rounded border-gray-300 text-[#FF8A00] focus:ring-[#FF8A00]',
          } : undefined}
          rowActions={renderRowActions}
          rowClassName={() => 'hover:bg-purple-50/30 transition-colors group'}
          tbodyClassName="divide-y divide-gray-50"
        />
        <Pagination page={page} pageSize={d.pageSize} total={total} onPageChange={setPage} activeClass="bg-purple-500 text-white border-purple-500" />
      </div>

      {bulkOpen && (
        <BulkPhotoModal
          items={[...selected.values()]}
          onClose={() => { setBulkOpen(false); if (bulkUploaded) setSelected(new Map()); setBulkUploaded(false); }}
          onDone={() => { setBulkUploaded(true); reload(); }}
        />
      )}

      {isModalOpen && (
        <ItemFormModal
          form={formData}
          setForm={setFormData}
          units={d.units}
          categories={d.categories}
          suppliers={d.suppliers}
          error={modalError}
          saving={saving}
          onSave={handleSimpan}
          onCancel={() => { setIsModalOpen(false); setEditingId(null); }}
        />
      )}
    </div>
  );
}
