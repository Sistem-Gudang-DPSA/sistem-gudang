"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Edit2, Trash2, Eye } from 'lucide-react';
import { createSupplier, deleteSupplier, listSuppliers, updateSupplier } from '@/domains/purchasing/api';
import type { Pajak, Supplier } from '@/domains/purchasing/types';
import { ApiError } from '@/shared/lib/api-client';
import { useApiData } from '@/shared/lib/use-api-data';
import { useCan } from '@/domains/auth/user-context';
import Pagination from '@/shared/components/Pagination';

import { DataTable, type Column } from '@/shared/components/DataTable';

const PAGE_SIZE = 20;

const emptyForm: { code: string; name: string; bank: string; npwp: string; phone: string; address: string; pajak: Pajak } = {
  code: '', name: '', bank: '', npwp: '', phone: '', address: '', pajak: 'NON_PKP',
};

export default function DataSupplierPurchasing() {
  const canCreate = useCan('supplier.create');
  const canUpdate = useCan('supplier.update');
  const canDelete = useCan('supplier.delete');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const [actionError, setActionError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [page, setPage] = useState(1);
  const { data: loaded, loading, error: loadError, reload } = useApiData(
    () => listSuppliers({ search: searchTerm || undefined, page, pageSize: PAGE_SIZE }),
    `${searchTerm}|${page}`,
    "Gagal memuat data supplier.",
  );
  const total = loaded?.total ?? 0;
  const dataSupplier = loaded?.rows ?? [];

  const handleMulaiTambah = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setModalError("");
    setIsModalOpen(true);
  };

  const handleEdit = (item: Supplier) => {
    setEditingId(item.id);
    setFormData({ code: item.code, name: item.name, bank: item.bank, npwp: item.npwp, phone: item.phone, address: item.address, pajak: item.pajak });
    setModalError("");
    setIsModalOpen(true);
  };

  const handleHapus = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    try {
      await deleteSupplier(id);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Gagal menghapus supplier.");
    }
  };

  const handleSimpan = async () => {
    if (!formData.code || !formData.name || !formData.bank || !formData.npwp || !formData.phone || !formData.address) {
      setModalError("Data belum lengkap!");
      return;
    }
    setSaving(true);
    setModalError("");
    try {
      if (editingId) {
        await updateSupplier(editingId, formData);
      } else {
        await createSupplier(formData);
      }
      reload();
      setIsModalOpen(false);
      setEditingId(null);
      setFormData(emptyForm);
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : "Gagal menyimpan supplier.");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Supplier>[] = [
    {
      key: 'no',
      header: 'No',
      className: 'text-gray-500',
      render: (_, i) => (page - 1) * PAGE_SIZE + i + 1,
    },
    {
      key: 'code',
      header: 'Kode',
      className: 'font-mono text-gray-600',
      render: (item) => item.code,
    },
    {
      key: 'name',
      header: 'Nama Supplier',
      render: (item) => <span className="font-bold text-gray-900">{item.name}</span>,
    },
    { key: 'bank', header: 'Bank', render: (item) => item.bank },
    { key: 'npwp', header: 'NPWP', render: (item) => item.npwp },
    { key: 'phone', header: 'Telepon', render: (item) => item.phone },
    {
      key: 'address',
      header: 'Alamat',
      className: 'max-w-xs truncate',
      render: (item) => item.address,
    },
    {
      key: 'pajak',
      header: 'Pajak',
      render: (item) => (
        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
          {item.pajak}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-2">
          <Link
            href={`/dashboard/purchasing/master/data-supplier/${item.id}/detail?from=superadmin`}
            title="Detail barang supplier"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" strokeWidth={2.5} /> Detail
          </Link>
          {canUpdate && (
            <button
              onClick={() => handleEdit(item)}
              title="Edit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" strokeWidth={2.5} /> Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => handleHapus(item.id)}
              title="Hapus"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} /> Hapus
            </button>
          )}
        </div>
      ),
    },
  ];
      

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col justify-start mb-8 gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">DATA SUPPLIER</h1>
        <p className="text-gray-500 text-sm">Kelola informasi mitra pemasok dan rincian kontak mereka.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="relative w-full max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                maxLength={100}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all shadow-sm"
                placeholder="Cari supplier, npwp, atau kode..."
              />
            </div>
          </div>

          {canCreate && <button
            onClick={handleMulaiTambah}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm shrink-0 w-full lg:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Data</span>
          </button>}
        </div>

        {actionError && (
          <div className="mx-5 mt-5 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{actionError}</div>
        )}

        <DataTable
          columns={columns}
          rows={dataSupplier}
          rowKey={(item) => item.id}
          loading={loading}
          error={loadError}
          emptyText="Belum ada data supplier."
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>

      {/* Modal Tambah/Edit Data */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6 uppercase tracking-wide">DATA SUPPLIER</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-6">
              <div>
                <label className="block text-[15px] font-medium text-gray-800 mb-2">Kode Supplier</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  maxLength={20}
                  placeholder="Masukan kode supplier"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[15px] font-medium text-gray-800 mb-2">Nama Supplier</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  maxLength={191}
                  placeholder="Masukan nama supplier"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[15px] font-medium text-gray-800 mb-2">Jenis Bank</label>
                <input
                  type="text"
                  value={formData.bank}
                  onChange={(e) => setFormData({...formData, bank: e.target.value})}
                  maxLength={100}
                  placeholder="Masukan nama Bank"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[15px] font-medium text-gray-800 mb-2">Npwp</label>
                <input
                  type="text"
                  value={formData.npwp}
                  onChange={(e) => setFormData({...formData, npwp: e.target.value.replace(/[^\d.\-]/g, "")})}
                  maxLength={50}
                  inputMode="numeric"
                  placeholder="Masukan Npwp"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="supplier-pajak" className="block text-[15px] font-medium text-gray-800 mb-2">Pajak Vendor</label>
                <select
                  id="supplier-pajak"
                  value={formData.pajak}
                  onChange={(e) => setFormData({...formData, pajak: e.target.value as Pajak})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                >
                  <option value="NON_PKP">Non PKP</option>
                  <option value="PKP">PKP</option>
                </select>
              </div>

              <div>
                <label className="block text-[15px] font-medium text-gray-800 mb-2">No telf</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/[^\d\s+\-()]/g, "")})}
                  maxLength={30}
                  inputMode="tel"
                  placeholder="Masukan no telepon"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-[15px] font-medium text-gray-800 mb-2">Alamat</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                maxLength={255}
                placeholder="Masukan alamat"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
              />
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{modalError}</div>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-8 py-2.5 border-2 border-[#FF8A00] text-[#FF8A00] font-semibold rounded-lg hover:bg-orange-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSimpan}
                disabled={saving}
                className="px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-lg hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-colors disabled:opacity-60"
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
