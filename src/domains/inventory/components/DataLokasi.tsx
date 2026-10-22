"use client";

import { useCan } from '@/domains/auth/user-context';
import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { createLocation, deleteLocation, importLocationData, listLocations, updateLocation } from '../api';
import Pagination from '@/shared/components/Pagination';
import SortableTh, { useSort } from '@/shared/components/SortableTh';
import EditModeBar, { useBatchEdit } from '@/shared/components/EditModeBar';
import { ApiError } from '@/shared/lib/api-client';
import { useApiData } from '@/shared/lib/use-api-data';
import { ImportExcelButton } from '@/shared/components/ImportExcelButton';
import BatchLokasiModal from './BatchLokasiModal';

// ---------- Import Excel ----------
export type LocationDataImportRow = {
  code?: string;
  NamaRak: string;
  NomorRak: string; // contoh "1.2" (kolom.baris)
  description?: string;
};

export const LocationTemplateHeaders = ['Nama Rak', 'Kolom', 'Baris'];
export const LocationTemplateExample = ['A', 1, 1];

export function LocationData(r: Record<string, unknown>, rowNumber: number): LocationDataImportRow {
  const NamaRak = String(r['Nama Rak'] ?? '').trim().toUpperCase();
  const kolom = String(r['Kolom'] ?? '').trim() || '1'; // kosong = kolom 1
  const baris = String(r['Baris'] ?? '').trim();

  if (!/^[A-Z]+$/.test(NamaRak)) throw new Error(`Baris ${rowNumber}: Nama Rak harus huruf kapital, contoh A`);
  if (!/^[1-9]\d*$/.test(kolom)) throw new Error(`Baris ${rowNumber}: Kolom harus angka mulai dari 1`);
  if (!/^[1-9]\d*$/.test(baris)) throw new Error(`Baris ${rowNumber}: Baris harus angka mulai dari 1`);

  return { code: `${NamaRak}.${kolom}.${baris}`, NamaRak, NomorRak: `${kolom}.${baris}` };
}

// ---------- Kode lokasi ----------
// Format: [nama rak].[kolom (opsional, default 1)].[baris]. Kolom dan baris minimal 1, tanpa nol di depan.
const KODE_LOKASI = /^([A-Z]+)\.(?:([1-9]\d*)\.)?([1-9]\d*)$/;
const CONTOH_KODE = 'Contoh: A.2 (kolom otomatis 1) atau A.3.2 (rak A, kolom 3, baris 2). Kolom dan baris mulai dari 1.';

function parseKodeLokasi(raw: string) {
  const m = KODE_LOKASI.exec(raw.trim().toUpperCase());
  if (!m) return null;
  const [, rackName, kolomRaw, baris] = m;
  const kolom = kolomRaw ?? '1';
  return {
    rackName,
    kolom,
    baris,
    kolomOtomatis: kolomRaw === undefined,
    rackNumber: `${kolom}.${baris}`,        // contoh "1.2"
    code: `${rackName}.${kolom}.${baris}`,   // contoh "A.1.2"
  };
}

const emptyModal = { kode: "", keterangan: "" };

export default function DataLokasiGudang() {
  const canDelete = useCan('location.delete');
  const canCreate = useCan('location.create');
  const canUpdate = useCan('location.update');
  const { sort, toggle, params: sortParams } = useSort();
  const edit = useBatchEdit();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [modalData, setModalData] = useState(emptyModal);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const kodePreview = parseKodeLokasi(modalData.kode);

  // Timer otomatis untuk menghilangkan alert setelah 4 detik
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
    () => listLocations({ search: searchQuery || undefined, page, pageSize, ...sortParams }),
    `${searchQuery}|${JSON.stringify(sortParams)}|${page}`,
    "Gagal memuat data lokasi.",
  );
  const dataLokasi = loaded?.rows ?? [];
  const error = formError || loadError || actionError;

  // Baris yang diedit disimpan per id; pindah halaman, cari, atau urutkan membuat baris itu tidak tampil lagi, jadi tanya dulu.
  const leaveRows = (apply: () => void) => {
    if (edit.dirty > 0 && !window.confirm("Ada perubahan yang belum disimpan. Buang perubahan?")) return;
    edit.cancel();
    apply();
  };
  const sortBy = (by: string) => leaveRows(() => { toggle(by); setPage(1); });

  const closeModal = () => {
    setIsModalOpen(false);
    setFormError("");
    setModalData(emptyModal);
  };

  const handleSimpan = async () => {
    if (!kodePreview) {
      setFormError(`Format kode tidak sesuai. ${CONTOH_KODE}`);
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const { rackName, rackNumber, code } = kodePreview;
      await createLocation({
        code,
        rackName,
        rackNumber,
        ...(modalData.keterangan.trim() && { description: modalData.keterangan.trim() }),
      });
      closeModal();
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
      return updateLocation(id, {
        code: `${rackName}.${rackNumber}`,
        rackName,
        rackNumber,
        ...(description !== undefined && { description }),
      }).then(() => undefined);
    }, reload);

  const handleHapus = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    try {
      await deleteLocation(id);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Gagal menghapus lokasi.");
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
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
              onChange={(e) => leaveRows(() => { setSearchQuery(e.target.value); setPage(1); })}
              placeholder="Cari..."
              className="w-full border border-gray-200 rounded-full py-2.5 pl-5 pr-10 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 text-sm text-gray-700 placeholder-gray-400 transition-all duration-200"
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canCreate && (
              <ImportExcelButton
                templateHeaders={LocationTemplateHeaders}
                templateExample={LocationTemplateExample}
                templateFilename="Template_Import_Lokasi.xlsx"
                parseRow={LocationData}
                previewColumns={[
                  { header: 'Nama Rak', value: (r) => r.NamaRak },
                  { header: 'Nomor Rak', value: (r) => r.NomorRak },
                ]}
                onSave={async (rows) => {
                  const res = await importLocationData(rows);
                  const dilewati = res.skipped.length > 0
                    ? `, ${res.skipped.length} dilewati karena kodenya sudah ada: ${res.skipped.map((s) => s.code).join(", ")}`
                    : "";
                  setNotice(`${res.created} lokasi ditambahkan${dilewati}`);
                }}
                onSuccess={() => reload()}
              />
            )}
            {canUpdate && (
              <EditModeBar
                editing={edit.editing}
                dirty={edit.dirty}
                saving={edit.saving}
                onToggle={edit.toggle}
                onSave={simpanSemua}
                onCancel={edit.cancel}
              />
            )}
            {canCreate && (
              <button
                onClick={() => setIsBatchOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 border border-[#ff8a00] text-[#ff8a00] rounded-lg hover:bg-orange-50 transition-all duration-200 font-semibold text-sm"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                Tambah Batch
              </button>
            )}
            {canCreate && (
              <button
                onClick={() => { setModalData(emptyModal); setFormError(""); setIsModalOpen(true); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#ff8a00] text-white rounded-lg hover:bg-[#eb7d00] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm shadow-sm"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                Tambah Data
              </button>
            )}
          </div>
        </div>

        {notice && (
          <div className="mx-5 mt-5 p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-start justify-between gap-3">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Tutup notifikasi" className="font-bold leading-none text-green-700 hover:text-green-900">×</button>
          </div>
        )}

        {error && !isModalOpen && (
          <div className="mx-5 mt-5 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg font-medium transition-all duration-300 animate-in fade-in slide-in-from-top-1">{error}</div>
        )}

        {/* Table */}
        <div className="overflow-hidden w-full">
          <div className="overflow-x-auto">
            <table className="w-4xl m-auto text-left text-sm table-fixed md:table-auto">
              <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-4 w-16 text-center">No</th>
                  <SortableTh label="Kode Lokasi" sortKey="code" sort={sort} onSort={sortBy} className="px-6 py-4 w-40 whitespace-nowrap" />
                  <SortableTh label="Nama Rak" sortKey="rackName" sort={sort} onSort={sortBy} className="px-6 py-4 w-40 whitespace-nowrap" />
                  <SortableTh label="Nomer Rak" sortKey="rackNumber" sort={sort} onSort={sortBy} className="px-6 py-4 w-40 whitespace-nowrap" />
                  <SortableTh label="Keterangan" sortKey="description" sort={sort} onSort={sortBy} className="px-3 py-4 text-left min-w-30" />
                  {dataLokasi.length !== 0 && (
                    <th className="px-6 py-4 w-28 text-center whitespace-nowrap">Aksi</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading && (
                  <tr><td colSpan={6} className="px-6 py-6 text-center text-gray-400">Memuat data...</td></tr>
                )}
                {!loading && dataLokasi.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-6 text-center text-gray-400">Belum ada data lokasi.</td></tr>
                )}
                {!loading && dataLokasi.map((item, i) => {
                  const nama = edit.value(item.id, "rackName", item.rackName);
                  const nomor = edit.value(item.id, "rackNumber", item.rackNumber);
                  const sel = "w-full border border-gray-200 rounded-lg py-1.5 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500";
                  return (
                    <tr key={item.id} className={`${edit.isDirty(item.id) ? "bg-amber-50" : i % 2 ? "bg-gray-50" : "bg-white"} hover:bg-orange-50/50 transition-colors duration-200`}>
                      <td className="px-6 py-4 text-center text-gray-500">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-6 py-4 h-13 text-gray-700 font-medium whitespace-nowrap">
                        {edit.editing ? `${nama}.${nomor}` : item.code}
                        {edit.errors[item.id] && <p className="text-xs font-normal text-red-600">{edit.errors[item.id]}</p>}
                      </td>
                      <td className="px-6 py-3 text-gray-600 whitespace-nowrap">
                        {edit.editing ? (
                          <input aria-label={`Nama rak ${item.code}`} className={sel} maxLength={10} value={nama} onChange={(e) => edit.set(item.id, "rackName", e.target.value.toUpperCase(), item.rackName)} />
                        ) : item.rackName}
                      </td>
                      <td className="px-6 py-3 text-gray-600 whitespace-nowrap">
                        {edit.editing ? (
                          <input aria-label={`Nomer rak ${item.code}`} className={sel} maxLength={10} placeholder="Kolom.Baris" value={nomor} onChange={(e) => edit.set(item.id, "rackNumber", e.target.value, item.rackNumber)} />
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
                      <td className="px-6 py-4 text-gray-600 text-center whitespace-nowrap">
                        {canDelete && (
                          <button onClick={() => handleHapus(item.id)} className="px-3 py-1 bg-red-50 text-red-600 font-bold rounded-lg text-xs hover:bg-red-100 transition-all border border-red-100">
                            Hapus
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <Pagination page={page} pageSize={pageSize} total={loaded?.total ?? 0} onPageChange={(p) => leaveRows(() => setPage(p))} activeClass="bg-teal-500 text-white border-teal-500" />
      </div>

      {isBatchOpen && (
        <BatchLokasiModal
          onClose={() => setIsBatchOpen(false)}
          onSaved={(msg) => { setIsBatchOpen(false); setNotice(msg); reload(); }}
        />
      )}

      {/* Modal Tambah Data Lokasi */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md transition-opacity duration-300 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-137.5 p-8 border border-white/20 relative animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={closeModal}
              aria-label="Tutup"
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-[20px] font-extrabold text-gray-900 mb-8 tracking-wide">
              TAMBAH DATA LOKASI
            </h2>

            <div className="mb-6">
              <label htmlFor="lokasi-kode" className="block text-sm font-semibold text-gray-700 mb-2">Kode Lokasi</label>
              <input
                id="lokasi-kode"
                type="text"
                autoFocus
                autoComplete="off"
                maxLength={20}
                placeholder="Contoh: A.2 atau A.1.2"
                value={modalData.kode}
                onChange={(e) => setModalData({ ...modalData, kode: e.target.value.toUpperCase().replace(/[^A-Z0-9.]/g, '') })}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleSimpan(); } }}
                className="w-full border border-gray-200 bg-gray-50/50 rounded-lg py-3 px-4 font-mono text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white text-sm transition-all duration-200"
              />
              {modalData.kode && (
                kodePreview ? (
                  <p className="mt-2 text-xs text-gray-500">
                    Rak <b className="text-gray-800">{kodePreview.rackName}</b> · Kolom{' '}
                    <b className="text-gray-800">{kodePreview.kolom}</b>
                    {kodePreview.kolomOtomatis && ' (otomatis)'} · Baris <b className="text-gray-800">{kodePreview.baris}</b>
                    {' '}→ disimpan sebagai <b className="font-mono text-gray-800">{kodePreview.code}</b>
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-red-600">Format belum sesuai. {CONTOH_KODE}</p>
                )
              )}
            </div>

            <div className="mb-6">
              <label htmlFor="lokasi-keterangan" className="block text-sm font-semibold text-gray-700 mb-2">Keterangan <span className="font-normal text-gray-400">(opsional)</span></label>
              <input
                id="lokasi-keterangan"
                type="text"
                maxLength={255}
                placeholder="Contoh: Rak A baris 1, bahan lembaran"
                className="w-full border border-gray-200 bg-gray-50/50 rounded-lg py-3 px-4 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white text-sm transition-all duration-200"
                value={modalData.keterangan}
                onChange={(e) => setModalData({ ...modalData, keterangan: e.target.value })}
              />
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{formError}</div>
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