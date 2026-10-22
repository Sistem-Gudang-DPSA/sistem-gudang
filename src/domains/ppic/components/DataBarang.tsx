"use client";

import React, { useEffect, useState } from 'react';
import { useCan } from '@/domains/auth/user-context';
import { Search, Plus, Download, Edit2, Trash2, Filter, MoreHorizontal, Images } from 'lucide-react';
import { listItems, createItem, deleteItem, listLocations, updateItem, listItemCategories, listItemUnits } from '@/domains/inventory/api';
import type { ItemListRow, Location } from '@/domains/inventory/types';
import { listSuppliers } from '@/domains/purchasing/api';
import type { Supplier } from '@/domains/purchasing/types';
import { ApiError } from '@/shared/lib/api-client';
import { useApiData } from '@/shared/lib/use-api-data';
import Pagination from '@/shared/components/Pagination';
import { INTEGER_INPUT, digitsOnly } from '@/shared/lib/input';
import { ExportExcellButton } from '@/shared/components/Tombol';
import ItemPhoto from '@/domains/inventory/components/ItemPhoto';
import BulkPhotoModal from '@/domains/inventory/components/BulkPhotoModal';
import SortableTh, { useSort } from '@/shared/components/SortableTh';

const emptyForm = { name: '', unit: '', category: '', price: '', supplierId: '' };

export default function DataBarangPPIC() {
  const canCreate = useCan("item.create");
  const canUpdate = useCan("item.update");
  const canDelete = useCan("item.delete");
  const canUploadPhoto = useCan("item.upload-photo");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [actionError, setActionError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { sort, toggle, params: sortParams } = useSort();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const [page, setPage] = useState(1);
  const { data: loaded, loading, error: loadError, reload } = useApiData(
    () => listItems({ search: searchTerm || undefined, page, pageSize: 20, ...sortParams }),
    `${searchTerm}|${page}|${JSON.stringify(sortParams)}`,
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
  const error = actionError || loadError;

  const { data: units } = useApiData(() => listItemUnits(), 'units', 'Gagal memuat daftar satuan.');
  const { data: categories } = useApiData(() => listItemCategories(), 'categories', 'Gagal memuat daftar kategori.');

  useEffect(() => {
    listSuppliers().then((res) => setSuppliers(res.rows)).catch(() => {});
    listLocations().then((res) => setLocations(res.rows)).catch(() => {});
  }, []);

  const handleSimpan = async () => {
    if (!formData.name || !formData.unit || !formData.category || !formData.price || !formData.supplierId) {
      setModalError('Mohon lengkapi semua data!');
      return;
    }
    setSaving(true);
    setModalError("");
    try {
      if (editingId) {
        await updateItem(editingId, {
          name: formData.name,
          unit: formData.unit,
          category: formData.category,
          price: Number(formData.price),
          supplierId: Number(formData.supplierId),
        });
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
    const headers = ['No,Kode Barang,Kode Bawaan,Nama Barang,Supplier,Jumlah Stok,Satuan,Kategori,Harga,Lokasi'];
    const csvData = dataBarang.map((item, index) =>
      `${index + 1},${item.code ?? '-'},"${item.externalCode ?? '-'}","${item.name}","${supplierName(item.supplierId)}",${item.stock},${item.unit},${item.category},${item.price},${locationCode(item.locationId)}`
    );
    const csvString = [...headers, ...csvData].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Data_Barang_PPIC.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const supplierName = (id: number | null) => suppliers.find((s) => s.id === id)?.name ?? '-';
  const locationCode = (id: number | null) => (id === null ? '-' : locations.find((loc) => loc.id === id)?.code ?? `#${id}`);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">Data Barang</h1>
          <p className="text-gray-500 text-sm">Kelola master data barang, material, dan stok inventaris PPIC.</p>
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
              value={searchTerm}
              maxLength={100}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 sm:text-sm transition-all"
              placeholder="Cari kode atau nama barang..."
            />
          </div>
          <div className="flex items-center gap-2">
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
            <ExportExcellButton onClick={handleExportCSV} disabled={loading || dataBarang.length === 0} />
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
            {canCreate && (
              <button
                onClick={handleMulaiTambah}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#ff8a00] text-white rounded-lg hover:bg-[#eb7d00] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm shadow-sm"    
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Tambah Data</span>
              </button>
            )}
          </div>
        </div>

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
                <SortableTh label="Harga (Rp)" sortKey="price" sort={sort} onSort={toggle} align="right" />
                <SortableTh label="Lokasi" sortKey="locationCode" sort={sort} onSort={toggle} />
                <SortableTh label="Keterangan" sortKey="detail" sort={sort} onSort={toggle} />
                <th scope="col" className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={canUploadPhoto ? 10 : 9} className="px-6 py-6 text-center text-gray-400">Memuat data...</td></tr>
              )}
              {!loading && dataBarang.length === 0 && (
                <tr><td colSpan={canUploadPhoto ? 10 : 9} className="px-6 py-6 text-center text-gray-400">Belum ada data barang.</td></tr>
              )}
              {!loading && dataBarang.map((item, index) => (
                <tr key={item.id} className="hover:bg-purple-50/30 transition-colors group">
                  {canUploadPhoto && (
                    <td className="px-4 py-4">
                      <input type="checkbox" aria-label={`Pilih ${item.name}`} checked={selected.has(item.id)} onChange={() => toggleRow(item)} className="w-4 h-4 rounded border-gray-300 text-[#FF8A00] focus:ring-[#FF8A00]" />
                    </td>
                  )}
                  <td className="px-6 py-4 text-gray-500">{index + 1}</td>

                  {/* Foto */}
                  <td className="px-6 py-4">
                    <ItemPhoto item={item} canUpload={canUploadPhoto} onUploaded={reload} />
                  </td>

                  {/* Informasi Barang */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{item.name}</span>
                      <span className="text-xs font-mono text-gray-500 mt-0.5">{item.code ?? '-'}</span>
                      {item.externalCode && <span className="text-xs text-gray-400">Kode bawaan: {item.externalCode}</span>}
                    </div>
                  </td>

                  {/* Supplier */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                        {supplierName(item.supplierId).charAt(0)}
                      </div>
                      <span>{supplierName(item.supplierId)}</span>
                    </div>
                  </td>

                  {/* Stok & Satuan */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <span className={`font-bold ${item.stock < 20 ? 'text-red-600' : item.stock < 50 ? 'text-amber-600' : 'text-gray-800'}`}>
                         {item.stock}
                       </span>
                       <span className="text-gray-500 text-xs bg-gray-100 px-2 py-0.5 rounded-md">{item.unit}</span>
                    </div>
                  </td>

                  {/* Kategori */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor(item.category)}`}>
                      {item.category || '-'}
                    </span>
                  </td>

                  {/* Harga */}
                  <td className="px-6 py-4 text-right font-mono text-gray-700">
                    {item.price}
                  </td>

                  {/* Lokasi */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-gray-600 font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      {locationCode(item.locationId)}
                    </span>
                  </td>

                  {/* Keterangan */}
                  <td className="px-6 py-4 text-gray-600">{item.detail || '-'}</td>

                  {/* Aksi */}
                  <td className="px-6 py-4 text-center">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={20} total={loaded?.total ?? 0} onPageChange={setPage} activeClass="bg-purple-500 text-white border-purple-500" />
      </div>

      {bulkOpen && (
        <BulkPhotoModal
          items={[...selected.values()]}
          onClose={() => { setBulkOpen(false); if (bulkUploaded) setSelected(new Map()); setBulkUploaded(false); }}
          onDone={() => { setBulkUploaded(true); reload(); }}
        />
      )}

      {/* Modal Tambah Data */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6 uppercase tracking-wide">DATA BARANG</h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama</label>
                <input
                  type="text"
                  value={formData.name}
                  maxLength={191}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Masukan nama barang"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all sm:text-sm text-gray-900 placeholder:text-gray-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Satuan</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all appearance-none sm:text-sm text-gray-700 bg-white"
                  >
                    <option value="" disabled className="text-gray-400">Pilih satuan</option>
                    {(units ?? []).map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all appearance-none sm:text-sm text-gray-700 bg-white"
                  >
                    <option value="" disabled className="text-gray-400">Pilih Kategori</option>
                    {(categories ?? []).map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Harga</label>
                  <input
                  {...INTEGER_INPUT}
                  maxLength={9}
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: digitsOnly(e.target.value)})}
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all sm:text-sm text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Supplier</label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({...formData, supplierId: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all appearance-none sm:text-sm text-gray-700 bg-white"
                  >
                    <option value="" disabled className="text-gray-400">Pilih supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {modalError && (
              <div className="mt-5 p-3 bg-red-50 text-red-600 text-sm rounded-xl">{modalError}</div>
            )}

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => { setIsModalOpen(false); setEditingId(null); }}
                className="px-5 py-2 border border-orange-500 text-orange-500 font-medium rounded-xl hover:bg-orange-50 transition-colors text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleSimpan}
                disabled={saving}
                className="px-5 py-2.5 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/30 transition-all text-sm disabled:opacity-60"
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
