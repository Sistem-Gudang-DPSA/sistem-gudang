"use client";

import React, { useEffect, useState } from 'react';
import { Search, Plus, Download, Filter } from 'lucide-react';
import { listItems, listLocations, updateItem } from '@/domains/inventory/api';
import type { ItemListRow, Location } from '@/domains/inventory/types';
import { listSuppliers } from '@/domains/purchasing/api';
import type { Supplier } from '@/domains/purchasing/types';
import { ApiError } from '@/shared/lib/api-client';
import { useApiData } from '@/shared/lib/use-api-data';
import { digitsOnly, INTEGER_INPUT } from '@/shared/lib/input';
import { useCan } from '@/domains/auth/user-context';
import Pagination from '@/shared/components/Pagination';
import { ExportExcellButton } from '@/shared/components/Tombol';
import ItemPhoto from '@/domains/inventory/components/ItemPhoto';

export default function DataBarangPurchasing() {
  // PUT /items/:id needs item.update, and changing the price also needs item.set-price.
  const canUpdateItem = useCan('item.update');
  const canSetPrice = useCan('item.set-price');
  const canEditPrice = canUpdateItem && canSetPrice;
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [Exporting, setExporting] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ supplierId: '', price: '' });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const [searchTerm, setSearchTerm] = useState('');

  const [page, setPage] = useState(1);
  const { data: loaded, loading, error: loadError, reload } = useApiData(
    () => listItems({ search: searchTerm || undefined, page, pageSize: 20 }),
    `${searchTerm}|${page}`,
    "Gagal memuat data barang.",
  );
  const dataBarang = loaded?.rows ?? [];
  const error = loadError;

  useEffect(() => {
    listSuppliers().then((res) => setSuppliers(res.rows)).catch(() => {});
    listLocations().then((res) => setLocations(res.rows)).catch(() => {});
  }, []);

  const handleEdit = (item: ItemListRow) => {
    setEditingId(item.id);
    setFormData({ supplierId: item.supplierId === null ? '' : String(item.supplierId), price: String(item.price) });
    setModalError("");
    setIsModalOpen(true);
  };

  const handleSimpan = async () => {
    if (!editingId || !formData.supplierId || !formData.price) {
      setModalError('Mohon lengkapi semua data!');
      return;
    }
    setSaving(true);
    setModalError("");
    try {
      await updateItem(editingId, {
        price: Number(formData.price),
        supplierId: Number(formData.supplierId),
      });
      reload();
      setIsModalOpen(false);
      setEditingId(null);
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : "Gagal menyimpan data.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    setExporting(true);
    const headers = ['No,Kode Barang,Nama Barang,Supplier,Jumlah Stok,Satuan,Kategori,Harga,Lokasi'];
    const csvData = dataBarang.map((item, index) =>
      `${index + 1},${item.code ?? '-'},"${item.name}","${supplierName(item.supplierId)}",${item.stock},${item.unit},${item.category},${item.price},${locationCode(item.locationId)}`
    );
    const csvString = [...headers, ...csvData].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Data_Barang_Purchasing.csv');
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
          <p className="text-gray-500 text-sm">Kelola master data barang, material, dan stok inventaris Purchasing.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                maxLength={100}
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 sm:text-sm transition-all"
                placeholder="Cari kode atau nama barang..."
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ExportExcellButton onClick={handleExportCSV} disabled={Exporting || loading || dataBarang.length === 0} />
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
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
                <th scope="col" className="px-6 py-4">No</th>
                <th scope="col" className="px-6 py-4">Foto</th>
                <th scope="col" className="px-6 py-4">Informasi Barang</th>
                <th scope="col" className="px-6 py-4">Supplier</th>
                <th scope="col" className="px-6 py-4">Stok & Satuan</th>
                <th scope="col" className="px-6 py-4">Kategori</th>
                <th scope="col" className="px-6 py-4 text-right">Harga (Rp)</th>
                <th scope="col" className="px-6 py-4">Lokasi</th>
                <th scope="col" className="px-6 py-4">Keterangan</th>
                <th scope="col" className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={10} className="px-6 py-6 text-center text-gray-400">Memuat data...</td></tr>
              )}
              {!loading && dataBarang.length === 0 && (
                <tr><td colSpan={10} className="px-6 py-6 text-center text-gray-400">Belum ada data barang.</td></tr>
              )}
              {!loading && dataBarang.map((item, index) => (
                <tr key={item.id} className="hover:bg-purple-50/30 transition-colors group">
                  <td className="px-6 py-4 text-gray-500">{index + 1}</td>

                  {/* Foto */}
                  <td className="px-6 py-4">
                    <ItemPhoto item={item} />
                  </td>

                  {/* Informasi Barang */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{item.name}</span>
                      <span className="text-xs font-mono text-gray-500 mt-0.5">{item.code ?? '-'}</span>
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
                    {canEditPrice && <button
                      onClick={() => handleEdit(item)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#FF8A00] hover:bg-orange-600 rounded-lg transition-all shadow-sm w-full max-w-27.5 mx-auto"
                    >
                       <Plus className="w-3.5 h-3.5" />
                       Lengkapi
                    </button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={20} total={loaded?.total ?? 0} onPageChange={setPage} activeClass="bg-teal-500 text-white border-teal-500" />
      </div>

      {/* Modal Lengkapi Data */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6 uppercase tracking-wide">DATA BARANG</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-[15px] font-medium text-gray-800 mb-2 font-sans">Suplier</label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData({...formData, supplierId: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors font-sans"
                >
                  <option value="" disabled>Pilih supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[15px] font-medium text-gray-800 mb-2 font-sans">Harga</label>
                <input
                  {...INTEGER_INPUT}
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: digitsOnly(e.target.value)})}
                  maxLength={9}
                  placeholder="Masukan Jumlah"
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors font-sans"
                />
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{modalError}</div>
            )}

            <div className="flex justify-end gap-4 mt-2">
              <button
                onClick={() => { setIsModalOpen(false); setEditingId(null); }}
                className="px-8 py-2.5 border-2 border-[#FF8A00] text-[#FF8A00] font-semibold rounded-lg hover:bg-orange-50 transition-colors font-sans"
              >
                Batal
              </button>
              <button
                onClick={handleSimpan}
                disabled={saving}
                className="px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-lg hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-colors font-sans disabled:opacity-60"
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
