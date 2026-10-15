"use client";

import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import Link from 'next/link';
import { createSupplier, deleteSupplier, listSuppliers, updateSupplier } from '@/domains/purchasing/api';
import type { Pajak } from '@/domains/purchasing/types';
import { ApiError } from '@/shared/lib/api-client';
import { useApiData } from '@/shared/lib/use-api-data';
import { useCan } from '@/domains/auth/user-context';
import Pagination from '@/shared/components/Pagination';
import SortableTh, { useSort } from '@/shared/components/SortableTh';
import EditModeBar, { useBatchEdit } from '@/shared/components/EditModeBar';
import { ImportExcelButton } from '@/shared/components/ImportExcelButton';
import { ExportExcellButton, PrintPdfButton } from '@/shared/components/Tombol';

// kolom teks yang bisa diubah langsung di tabel pada mode edit (batas panjang mengikuti kolom BE)
type TextKey = 'code' | 'name' | 'bank' | 'npwp' | 'phone' | 'address';

const emptyForm: { code: string; name: string; bank: string; npwp: string; phone: string; address: string; pajak: Pajak } = {
  code: '', name: '', bank: '', npwp: '', phone: '', address: '', pajak: 'NON_PKP',
};

export default function DataSupplierPurchasing() {
  const canCreate = useCan('supplier.create');
  const canUpdate = useCan('supplier.update');
  const canDelete = useCan('supplier.delete');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const edit = useBatchEdit();
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const [exporting, setExporting] = useState(false);

  const [actionError, setActionError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPajak, setFilterPajak] = useState<Pajak | ''>('');
  const { sort, toggle, reset: resetSort, params: sortParams } = useSort();

  const [page, setPage] = useState(1);
  const { data: loaded, loading, error: loadError, reload } = useApiData(
    () => listSuppliers({ search: searchTerm || undefined, pajak: filterPajak || undefined, page, pageSize: 20, ...sortParams }),
    `${searchTerm}|${filterPajak}|${JSON.stringify(sortParams)}|${page}`,
    "Gagal memuat data supplier.",
  );
  const dataSupplier = loaded?.rows ?? [];
  const error = actionError || loadError;

  const handleMulaiTambah = () => {
    setFormData(emptyForm);
    setModalError("");
    setIsModalOpen(true);
  };

  const simpanSemua = () =>
    edit.save((id, patch) => {
      if (Object.values(patch).some((v) => v.trim() === '')) return Promise.reject(new Error('Kolom tidak boleh kosong.'));
      return updateSupplier(id, patch as Partial<typeof emptyForm>).then(() => undefined);
    }, reload);

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
      await createSupplier(formData);
      reload();
      setIsModalOpen(false);
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
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                maxLength={100}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all shadow-sm"
                placeholder="Cari supplier, npwp, atau kode..."
              />
            </div>
            <select
              aria-label="Filter pajak"
              value={filterPajak}
              onChange={(e) => { setFilterPajak(e.target.value as Pajak | ''); setPage(1); }}
              className="py-2.5 pl-3 pr-8 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] shadow-sm"
            >
              <option value="">Semua pajak</option>
              <option value="PKP">PKP</option>
              <option value="NON_PKP">Non PKP</option>
            </select>
            {(searchTerm || filterPajak || sort) && (
              <button type="button" onClick={() => { setSearchTerm(''); setFilterPajak(''); resetSort(); setPage(1); }} className="text-sm text-gray-500 hover:underline">Reset</button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canUpdate && <EditModeBar editing={edit.editing} dirty={edit.dirty} saving={edit.saving} onToggle={edit.toggle} onSave={simpanSemua} onCancel={edit.cancel} />}
            {canCreate && <button
              onClick={handleMulaiTambah}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm shrink-0 w-full lg:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Data</span>
            </button>}
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
                <SortableTh label="Kode" sortKey="code" sort={sort} onSort={toggle} align="center" className="px-6 py-4 w-20" />
                <SortableTh label="Nama Supplier" sortKey="name" sort={sort} onSort={toggle} />
                <SortableTh label="Bank" sortKey="bank" sort={sort} onSort={toggle} align="center" />
                <SortableTh label="NPWP" sortKey="npwp" sort={sort} onSort={toggle} align="center" />
                <SortableTh label="Pajak" sortKey="pajak" sort={sort} onSort={toggle} align="center" />
                <SortableTh label="Kontak" sortKey="phone" sort={sort} onSort={toggle} align="center" />
                <SortableTh label="Alamat" sortKey="address" sort={sort} onSort={toggle} />
                <th scope="col" className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-600">
              {loading && (
                <tr><td colSpan={8} className="px-6 py-6 text-center text-gray-400">Memuat data...</td></tr>
              )}
              {!loading && dataSupplier.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-6 text-center text-gray-400">Belum ada data supplier.</td></tr>
              )}
              {!loading && dataSupplier.map((item, i) => {
                const cell = "w-full min-w-28 border border-gray-200 rounded-lg py-1.5 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500";
                const text = (key: TextKey, max: number) => edit.editing ? (
                  <input aria-label={`${key} ${item.name}`} className={cell} maxLength={max} value={edit.value(item.id, key, item[key])} onChange={(e) => edit.set(item.id, key, e.target.value, item[key])} />
                ) : item[key];
                return (
                  <tr key={item.id} className={`${edit.isDirty(item.id) ? "bg-amber-50" : i % 2 ? "bg-gray-50" : "bg-white"} hover:bg-[#FF8A00]/5 transition-colors group`}>
                    <td className="px-6 py-4 text-gray-500 text-center font-medium">{text('code', 20)}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {text('name', 191)}
                      {edit.errors[item.id] && <p className="text-xs font-normal text-red-600">{edit.errors[item.id]}</p>}
                    </td>
                    <td className="px-6 py-4 text-center">{text('bank', 100)}</td>
                    <td className="px-6 py-4 text-center font-mono text-xs">{text('npwp', 50)}</td>
                    <td className="px-6 py-4 text-center text-xs">
                      {edit.editing ? (
                        <select aria-label={`pajak ${item.name}`} className={cell} value={edit.value(item.id, 'pajak', item.pajak)} onChange={(e) => edit.set(item.id, 'pajak', e.target.value, item.pajak)}>
                          <option value="PKP">PKP</option>
                          <option value="NON_PKP">Non PKP</option>
                        </select>
                      ) : item.pajak === 'PKP' ? 'PKP' : 'Non PKP'}
                    </td>
                    <td className="px-6 py-4 text-center text-xs">{text('phone', 30)}</td>
                    <td className="px-6 py-4 max-w-xs truncate" title={item.address}>{text('address', 255)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/dashboard/purchasing/master/data-supplier/${item.id}/detail?from=superadmin`} className="px-3 py-1 bg-green-50 text-green-600 font-bold rounded-lg text-xs hover:bg-green-100 transition-all border border-green-100">
                          Detail Barang
                        </Link>
                        {canDelete && <button onClick={() => handleHapus(item.id)} className="px-3 py-1 bg-red-50 text-red-600 font-bold rounded-lg text-xs hover:bg-red-100 transition-all border border-red-100">
                          Hapus
                        </button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={20} total={loaded?.total ?? 0} onPageChange={setPage} activeClass="bg-teal-500 text-white border-teal-500" />
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
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, npwp: e.target.value.replace(/[^\d.\-]/g, "") })}
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
                  onChange={(e) => setFormData({ ...formData, pajak: e.target.value as Pajak })}
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
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^\d\s+\-()]/g, "") })}
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
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
