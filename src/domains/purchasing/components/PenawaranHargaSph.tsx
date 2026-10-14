"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import type { StatusPenawaran } from '@/domains/ppic/data/penawaran-harga';
import { estimasiSphPath, listSph, tambahSph } from '@/domains/purchasing/data/penawaran-sph';

const headCellClass = 'px-4 py-3 border-b border-r border-gray-300';
const cellClass = 'px-4 py-1.5 h-9 border-b border-r border-gray-300';
const actionButtonClass = 'w-14 py-1 text-sm font-medium text-center rounded-md transition-colors';
// Tabel selalu terlihat minimal 8 baris, seperti di desain
const MIN_ROWS = 8;

const statusClass: Record<StatusPenawaran, string> = {
  Draft: 'bg-gray-200 text-gray-700',
  Publish: 'bg-[#FF8A00] text-white',
};

export default function PenawaranHargaSph() {
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState(listSph);
  const keyword = searchQuery.trim().toLowerCase();
  const rows = data.filter((item) => item.namaProjek.toLowerCase().includes(keyword));

  // State pop up Tambah Data
  const [showModal, setShowModal] = useState(false);
  const [namaProjek, setNamaProjek] = useState('');
  const [modalError, setModalError] = useState('');

  const bukaModal = () => {
    setNamaProjek('');
    setModalError('');
    setShowModal(true);
  };

  const tutupModal = () => setShowModal(false);

  // Tutup pop up dengan tombol Escape
  useEffect(() => {
    if (!showModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showModal]);

  const handleSimpan = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nama = namaProjek.trim();
    if (nama === '') {
      setModalError('Nama projek wajib diisi.');
      return;
    }
    tambahSph(nama);
    setData(listSph());
    setShowModal(false);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-[18px] font-extrabold text-black tracking-wide">Estimasi Penawaran Harga</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Pencarian & tambah data */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-1/2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              maxLength={100}
              placeholder="Cari Nama Projek"
              aria-label="Cari nama projek"
              className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-800 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={bukaModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Data</span>
          </button>
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto border-t border-l border-gray-300 rounded-sm">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="bg-gray-100 text-gray-900 font-bold text-base">
              <tr>
                <th scope="col" className={`${headCellClass} w-32`}>No Order</th>
                <th scope="col" className={headCellClass}>Nama Client</th>
                <th scope="col" className={`${headCellClass} w-56`}>Status</th>
                <th scope="col" className={`${headCellClass} w-56`}>Action</th>
              </tr>
            </thead>
            <tbody className="text-gray-800">
              {rows.map((item) => (
                <tr key={item.id} className="hover:bg-orange-50/20 transition-colors">
                  <td className={cellClass}>{item.noOrder}</td>
                  <td className={cellClass}>{item.namaProjek}</td>
                  <td className={`${cellClass} text-center`}>
                    <span className={`inline-block w-28 py-0.5 text-sm font-medium rounded-md ${statusClass[item.status]}`}>{item.status}</span>
                  </td>
                  <td className={cellClass}>
                    {/* Ketiga tombol membuka halaman Estimasi Penawaran Biaya yang sama */}
                    <div className="flex items-center gap-2">
                      <Link href={estimasiSphPath(item.id)} className={`${actionButtonClass} bg-[#F5FF3D] text-black hover:bg-yellow-300`}>Edit</Link>
                      <Link href={estimasiSphPath(item.id)} className={`${actionButtonClass} bg-[#0000FF] text-white hover:bg-blue-800`}>Detail</Link>
                      <Link href={estimasiSphPath(item.id)} className={`${actionButtonClass} bg-[#FF8A00] text-white hover:bg-orange-600`}>Rekap</Link>
                    </div>
                  </td>
                </tr>
              ))}
              {Array.from({ length: Math.max(0, MIN_ROWS - rows.length) }, (_, i) => (
                <tr key={`kosong-${i}`}>
                  <td className={cellClass} />
                  <td className={cellClass} />
                  <td className={cellClass} />
                  <td className={cellClass} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pop up Tambah Data */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={tutupModal}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-judul"
            onSubmit={handleSimpan}
            onClick={(e) => e.stopPropagation()}
            noValidate
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6"
          >
            <h2 id="modal-judul" className="text-base font-extrabold text-black mb-4">Nama Projek</h2>

            <label htmlFor="modal-nama-projek" className="block text-sm font-medium text-gray-800 mb-2">Nama Projek</label>
            <input
              id="modal-nama-projek"
              type="text"
              autoFocus
              maxLength={191}
              value={namaProjek}
              onChange={(e) => {
                setNamaProjek(e.target.value);
                if (modalError) setModalError('');
              }}
              placeholder="Masukan nama projek"
              aria-invalid={modalError !== ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
            />
            {modalError && <p className="mt-2 text-xs text-red-600">{modalError}</p>}

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={tutupModal}
                className="px-6 py-2 border border-[#FF8A00] text-[#FF8A00] bg-white text-sm font-semibold rounded-lg hover:bg-orange-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-[#FF8A00] text-white text-sm font-semibold rounded-lg hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-colors"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
