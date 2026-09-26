"use client";

import React, { useEffect, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import Link from 'next/link';
import { createSupplier, deleteSupplier, listSuppliers, updateSupplier } from '@/domains/purchasing/api';
import type { Supplier } from '@/domains/purchasing/types';
import { ApiError } from '@/shared/lib/api-client';

const emptyForm = { code: '', name: '', bank: '', npwp: '', phone: '', address: '' };

export default function DataSupplierPurchasing() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const [dataSupplier, setDataSupplier] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const loadSuppliers = async (search: string) => {
    setLoading(true);
    try {
      const result = await listSuppliers({ search: search || undefined });
      setDataSupplier(result.rows);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat data supplier.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers(searchTerm);
  }, [searchTerm]);

  const handleMulaiTambah = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setModalError("");
    setIsModalOpen(true);
  };

  const handleEdit = (item: Supplier) => {
    setEditingId(item.id);
    setFormData({ code: item.code, name: item.name, bank: item.bank, npwp: item.npwp, phone: item.phone, address: item.address });
    setModalError("");
    setIsModalOpen(true);
  };

  const handleHapus = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    try {
      await deleteSupplier(id);
      setDataSupplier((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus supplier.");
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
        const updated = await updateSupplier(editingId, formData);
        setDataSupplier((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await createSupplier(formData);
        setDataSupplier((prev) => [created, ...prev]);
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData(emptyForm);
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : "Gagal menyimpan supplier.");
    } finally {
      setSaving(false);
    }
  };

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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all shadow-sm"
                placeholder="Cari supplier, npwp, atau kode..."
              />
            </div>
          </div>

          <button
            onClick={handleMulaiTambah}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm shrink-0 w-full lg:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Data</span>
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-5 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
        )}

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th scope="col" className="px-6 py-4 w-20 text-center">Kode</th>
                <th scope="col" className="px-6 py-4">Nama Supplier</th>
                <th scope="col" className="px-6 py-4 text-center">Bank</th>
                <th scope="col" className="px-6 py-4 text-center">NPWP</th>
                <th scope="col" className="px-6 py-4 text-center">Kontak</th>
                <th scope="col" className="px-6 py-4">Alamat</th>
                <th scope="col" className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-600">
              {loading && (
                <tr><td colSpan={7} className="px-6 py-6 text-center text-gray-400">Memuat data...</td></tr>
              )}
              {!loading && dataSupplier.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-6 text-center text-gray-400">Belum ada data supplier.</td></tr>
              )}
              {!loading && dataSupplier.map((item) => (
                <tr key={item.id} className="hover:bg-[#FF8A00]/5 transition-colors group">
                  <td className="px-6 py-4 text-gray-500 text-center font-medium">{item.code}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-center">{item.bank}</td>
                  <td className="px-6 py-4 text-center font-mono text-xs">{item.npwp}</td>
                  <td className="px-6 py-4 text-center text-xs">{item.phone}</td>
                  <td className="px-6 py-4 max-w-xs truncate" title={item.address}>{item.address}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                       <Link href="/dashboard/purchasing/master/data-supplier/detail" className="px-3 py-1 bg-green-50 text-green-600 font-bold rounded-lg text-xs hover:bg-green-100 transition-all border border-green-100">
                        Detail Barang
                      </Link>
                      <button onClick={() => handleEdit(item)} className="px-3 py-1 bg-amber-50 text-amber-600 font-bold rounded-lg text-xs hover:bg-amber-100 transition-all border border-amber-100">
                        Edit
                      </button>
                      <button onClick={() => handleHapus(item.id)} className="px-3 py-1 bg-red-50 text-red-600 font-bold rounded-lg text-xs hover:bg-red-100 transition-all border border-red-100">
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                  placeholder="Masukan nama Bank"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[15px] font-medium text-gray-800 mb-2">Npwp</label>
                <input
                  type="text"
                  value={formData.npwp}
                  onChange={(e) => setFormData({...formData, npwp: e.target.value})}
                  placeholder="Masukan Npwp"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[15px] font-medium text-gray-800 mb-2">No telf</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
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
