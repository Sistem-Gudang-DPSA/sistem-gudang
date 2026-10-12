"use client";

import { useCan } from '@/domains/auth/user-context';
import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { createLocation, deleteLocation, listLocations, updateLocation } from '@/domains/inventory/api';
import { ApiError } from '@/shared/lib/api-client';
import SortableTh, { useSort } from '@/shared/components/SortableTh';
import { useApiData } from '@/shared/lib/use-api-data';
import { useBatchEdit } from '@/shared/components/EditModeBar';

const RAK_NAMA = ['A', 'B', 'C'];
const RAK_NOMOR = ['01', '02', '03', '04'];

export default function DataLokasiGudang() {
  const canCreate = useCan('location.create');
  const { sort, toggle, params: sortParams } = useSort();
  const edit = useBatchEdit();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ namaRak: "", nomerRak: "", keterangan: ""});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  React.useEffect(() => {
    if (formError || actionError) {
      const timer = setTimeout(() => {
        setFormError("");
        setActionError("");
      }, 4000); 

      return () => clearTimeout(timer); 
    }
  }, [formError, actionError]);

  const { data: loaded, loading, error: loadError, reload } = useApiData(
    () => listLocations({ search: searchQuery || undefined, ...sortParams }),
    `${searchQuery}|${JSON.stringify(sortParams)}`,
    "Gagal memuat data lokasi.",
  );
  const dataLokasi = loaded?.rows ?? [];
  const error = formError || loadError || actionError;

  const handleSimpan = async () => {
    if (!modalData.namaRak || !modalData.nomerRak) {
      setFormError("Lengkapi nama rak dan nomer rak.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const input = {
        code: `${modalData.namaRak}${modalData.nomerRak}`,
        rackName: modalData.namaRak,
        rackNumber: modalData.nomerRak,
        ...(modalData.keterangan.trim() && { description: modalData.keterangan.trim() }),
      };
      await createLocation(input);
      setIsModalOpen(false);
      setModalData({ namaRak: "", nomerRak: "", keterangan: ""});
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Gagal menyimpan lokasi.");
    } finally {
      setSaving(false);
    }
  };

    const simpanSemua = () =>
      edit.save((id, patch) => {
        const row = dataLokasi.find((l) => l.id === id);
        if (!row) return Promise.resolve();
        const rackName = patch.rackName ?? row.rackName;
        const rackNumber = patch.rackNumber ?? row.rackNumber;
        const description = 'description' in patch ? patch.description.trim() || null : undefined;
        return updateLocation(id, { code: `${rackName}${rackNumber}`, rackName, rackNumber, ...(description !== undefined && { description }) }).then(() => undefined);
      }, reload);

  const handleHapus = async (id: number) => {
      if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
      try {
        await deleteLocation(id);
        reload();
      } catch (err) {
        setActionError(err instanceof ApiError ? err.message : "Gagal menghapus supplier.");
      }
    };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Title */}
      <div className="flex flex-col justify-start mb-8 gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">DATA LOKASI</h1>
        <p className="text-gray-500 text-sm">Kelola kode lokasi rak penyimpanan beserta keterangannya.</p>
      </div>

      <div className="bg-white w-5xl rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative w-64 lg:w-72">
            <input
              type="text"
              value={searchQuery}
              maxLength={100}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari..."
              className="w-full border border-gray-200 rounded-full py-2.5 pl-5 pr-10 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 text-sm text-gray-700 placeholder-gray-400 transition-all duration-200"
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" strokeWidth={2.5} />
            </div>
          </div>
          {canCreate && <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#ff8a00] text-white rounded-lg hover:bg-[#eb7d00] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Tambah Data
          </button>}
        </div>

        {error && !isModalOpen && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
        )}

        {/* Table */}
        <div className="overflow-hidden w-full">
          <div className="overflow-x-auto">
            <table className="w-4xl m-auto text-left text-sm table-fixed md:table-auto">
              <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <SortableTh label="Kode Lokasi" sortKey="code" sort={sort} onSort={toggle} className="px-6 py-4 w-40 whitespace-nowrap" />
                  <SortableTh label="Nama Rak" sortKey="rackName" sort={sort} onSort={toggle} className="px-6 py-4 w-40 whitespace-nowrap" />
                  <SortableTh label="Nomer Rak" sortKey="rackNumber" sort={sort} onSort={toggle} className="px-6 py-4 w-40 whitespace-nowrap" />
                  <SortableTh label="Keterangan" sortKey="description" sort={sort} onSort={toggle} className="px-3 py-4 text-left min-w-30" />
                  {/* {dataLokasi.length !== 0 && (
                    <th className="px-6 py-4 w-28 text-center whitespace-nowrap">Aksi</th>
                  )} */}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading && (
                  <tr><td colSpan={4} className="px-6 py-6 text-center text-gray-400">Memuat data...</td></tr>
                )}
                {!loading && dataLokasi.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-6 text-center text-gray-400">Belum ada data lokasi.</td></tr>
                )}
                {!loading && dataLokasi.map((item, i) => {
                  const nama = edit.value(item.id, "rackName", item.rackName);
                  const nomor = edit.value(item.id, "rackNumber", item.rackNumber);
                  const sel = "w-full border border-gray-200 rounded-lg py-1.5 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500";
                  return (
                    <tr key={item.id} className={`${edit.isDirty(item.id) ? "bg-amber-50" : i % 2 ? "bg-gray-50" : "bg-white"} hover:bg-orange-50/50 transition-colors duration-200`}>
                      <td className="px-6 py-4 h-13 text-gray-700 font-medium whitespace-nowrap">
                        {edit.editing ? `${nama}${nomor}` : item.code}
                        {edit.errors[item.id] && <p className="text-xs font-normal text-red-600">{edit.errors[item.id]}</p>}
                      </td>
                      <td className="px-6 py-3 text-gray-600 whitespace-nowrap">
                        {edit.editing ? (
                          <select aria-label={`Nama rak ${item.code}`} className={sel} value={nama} onChange={(e) => edit.set(item.id, "rackName", e.target.value, item.rackName)}>
                            {[...new Set([item.rackName, ...RAK_NAMA])].map((v) => <option key={v} value={v}>{v}</option>)}
                          </select>
                        ) : item.rackName}
                      </td>
                      <td className="px-6 py-3 text-gray-600 whitespace-nowrap">
                        {edit.editing ? (
                          <select aria-label={`Nomer rak ${item.code}`} className={sel} value={nomor} onChange={(e) => edit.set(item.id, "rackNumber", e.target.value, item.rackNumber)}>
                            {[...new Set([item.rackNumber, ...RAK_NOMOR])].map((v) => <option key={v} value={v}>{v}</option>)}
                          </select>
                        ) : item.rackNumber}
                      </td>
                      <td className="px-3 py-2 text-gray-600 max-w-50 min-w-30 w-auto">
                        {edit.editing ? (
                          <input aria-label={`Keterangan ${item.code}`} className={`${sel} w-full text-sm px-2 py-1`} maxLength={255} placeholder="Opsional" value={edit.value(item.id, "description", item.description ?? "")} onChange={(e) => edit.set(item.id, "description", e.target.value, item.description ?? "")} />
                        ) : (
                          <span className="block text-sm wrap-break-word whitespace-normal">
                            {item.description || "-"}
                          </span>
                        )}
                      </td>
                      {/* <td className="px-6 py-4 text-gray-600 text-center whitespace-nowrap">
                        {canDelete && <button onClick={() => handleHapus(item.id)} className=" px-3 py-1 bg-red-50 text-red-600 font-bold rounded-lg text-xs hover:bg-red-100 transition-all border border-red-100">
                          Hapus
                        </button>}
                      </td> */}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Tambah Data Lokasi */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md transition-opacity duration-300">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-137.5 p-8 border border-white/20 relative animate-in zoom-in-95 duration-200">
            {/* Close Button at top-right */}
            <button
              onClick={() => { setIsModalOpen(false); setFormError(""); }}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-[20px] font-extrabold text-gray-900 mb-8 tracking-wide">
              TAMBAH DATA LOKASI
            </h2>

            <div className="flex flex-col sm:flex-row gap-6 mb-6">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Rak</label>
                <div className="relative">
                  <select
                    className="w-full border border-gray-200 bg-gray-50/50 rounded-lg py-3 pl-4 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white appearance-none text-sm transition-all duration-200"
                    style={{ backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%20%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')", backgroundRepeat: "no-repeat", backgroundPosition: "right 1rem center", backgroundSize: "1.2em" }}
                    value={modalData.namaRak}
                    onChange={(e) => setModalData({ ...modalData, namaRak: e.target.value })}
                  >
                    <option value="" disabled>Pilih nama rak</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nomer Rak</label>
                <div className="relative">
                  <select
                    className="w-full border border-gray-200 bg-gray-50/50 rounded-lg py-3 pl-4 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white appearance-none text-sm transition-all duration-200"
                    style={{ backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%20%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')", backgroundRepeat: "no-repeat", backgroundPosition: "right 1rem center", backgroundSize: "1.2em" }}
                    value={modalData.nomerRak}
                    onChange={(e) => setModalData({ ...modalData, nomerRak: e.target.value })}
                  >
                    <option value="" disabled>Pilih nomer rak</option>
                    <option value="01">01</option>
                    <option value="02">02</option>
                    <option value="03">03</option>
                    <option value="04">04</option>
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
            )}

            <div className="flex justify-end pt-2 border-t border-gray-50 mt-4">
              <button
                onClick={handleSimpan}
                disabled={saving}
                className="px-8 py-2.5 bg-[#ff8a00] text-white rounded-lg shadow-sm hover:shadow-md hover:bg-[#f08000] hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm disabled:opacity-60"
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
