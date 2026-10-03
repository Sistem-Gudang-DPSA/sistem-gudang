"use client";

import React, { useRef, useState } from 'react';
import { Search, Calendar, Plus, AlertCircle, Download, X } from 'lucide-react';

type BarangKeluar = {
  id: number;
  noTransaksi: string;
  namaPengambil?: string;
  kodeBarang: string;
  namaClient: string;
  spk: string;
  tanggal: string; // YYYY-MM-DD
  namaItem: string;
  namaBarang: string;
  jumlah: number;
  pic?: string;
};

// Satu baris di tabel form; nilainya disimpan apa adanya dari input
type BarisForm = {
  spk: string;
  namaClient: string;
  namaItem: string;
  namaBarang: string;
  kodeBarang: string;
  jumlah: string;
  pic: string;
};

const KOLOM_FORM: { field: keyof BarisForm; label: string; lebar: string }[] = [
  { field: 'spk', label: 'No. SPK', lebar: 'min-w-36' },
  { field: 'namaClient', label: 'Nama Client', lebar: 'min-w-32' },
  { field: 'namaItem', label: 'Nama Item/Project', lebar: 'min-w-40' },
  { field: 'namaBarang', label: 'Nama Barang', lebar: 'min-w-32' },
  { field: 'kodeBarang', label: 'Kode', lebar: 'min-w-24' },
  { field: 'jumlah', label: 'Jumlah', lebar: 'w-24' },
  { field: 'pic', label: 'PIC', lebar: 'min-w-24' },
];

const barisKosong = (): BarisForm => ({ spk: '', namaClient: '', namaItem: '', namaBarang: '', kodeBarang: '', jumlah: '', pic: '' });

const formKosong = () => ({ noTransaksi: '', namaPengambil: '', tanggal: '', baris: [barisKosong(), barisKosong(), barisKosong()] });

// Data dummy, nanti ganti dengan data/API
const DATA_AWAL: BarangKeluar[] = [
  {
    id: 1,
    noTransaksi: "BK-2026-0001",
    kodeBarang: "BB-18-LBR-001-A04",
    namaClient: "Hermina Banyumanik",
    spk: "01/RSHB/III/2026",
    tanggal: "2026-04-12",
    namaItem: "Credensa Kulkas",
    namaBarang: "BB 18 mm",
    jumlah: 2,
  },
  {
    id: 2,
    noTransaksi: "BK-2026-0002",
    kodeBarang: "H-5555-LBR-002-C01",
    namaClient: "Hermina Banyumanik",
    spk: "01/RSHB/III/2026",
    tanggal: "2026-04-12",
    namaItem: "Credensa Kulkas",
    namaBarang: "HPL 5555",
    jumlah: 4,
  },
];

const cellClass = 'px-3 py-2.5 border-b border-r border-gray-300';
const formCellClass = 'border-b border-r border-gray-300';
const formInputClass = 'w-full px-2 py-2 bg-transparent text-sm text-gray-800 focus:outline-none focus:bg-orange-50/60';
const labelClass = 'block text-sm text-gray-800 mb-1.5';
const fieldClass = 'w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors';
const orangeButtonClass = 'flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed';

// YYYY-MM-DD -> DD-MM-YYYY tanpa lewat Date, supaya tidak bergeser karena timezone
const formatTanggal = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
};

export default function BarangKeluarGudang() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTanggal, setFilterTanggal] = useState("");
  const tanggalRef = useRef<HTMLInputElement>(null);
  const [dataBarangKeluar, setDataBarangKeluar] = useState<BarangKeluar[]>(DATA_AWAL);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(formKosong);
  const [formError, setFormError] = useState("");
  const formTanggalRef = useRef<HTMLInputElement>(null);

  const bukaForm = () => {
    setForm(formKosong());
    setFormError("");
    setIsModalOpen(true);
  };

  const updateBaris = (index: number, field: keyof BarisForm, value: string) => {
    setForm((prev) => ({ ...prev, baris: prev.baris.map((b, i) => (i === index ? { ...b, [field]: value } : b)) }));
  };

  const tambahBaris = () => {
    setForm((prev) => ({ ...prev, baris: [...prev.baris, barisKosong()] }));
  };

  const handleSimpan = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Baris yang belum diisi sama sekali diabaikan
    const barisTerisi = form.baris.filter((b) => Object.values(b).some((v) => v.trim() !== ""));
    if (form.noTransaksi.trim() === "" || form.namaPengambil.trim() === "" || form.tanggal === "") {
      setFormError("No. Transaksi, Nama Pengambil, dan Tanggal wajib diisi.");
      return;
    }
    if (barisTerisi.length === 0) {
      setFormError("Isi minimal satu barang yang keluar.");
      return;
    }
    if (barisTerisi.some((b) => !b.spk.trim() || !b.namaClient.trim() || !b.namaItem.trim() || !b.namaBarang.trim() || !b.kodeBarang.trim())) {
      setFormError("Lengkapi No. SPK, Nama Client, Nama Item/Project, Nama Barang, dan Kode di setiap baris yang diisi.");
      return;
    }
    if (barisTerisi.some((b) => b.jumlah.trim() === "" || !Number.isInteger(Number(b.jumlah)) || Number(b.jumlah) <= 0)) {
      setFormError("Jumlah wajib diisi dengan angka bulat lebih dari 0.");
      return;
    }
    setDataBarangKeluar((prev) => {
      let nextId = prev.reduce((max, item) => Math.max(max, item.id), 0) + 1;
      return [
        ...prev,
        ...barisTerisi.map((b) => ({
          id: nextId++,
          noTransaksi: form.noTransaksi.trim(),
          namaPengambil: form.namaPengambil.trim(),
          tanggal: form.tanggal,
          spk: b.spk.trim(),
          namaClient: b.namaClient.trim(),
          namaItem: b.namaItem.trim(),
          namaBarang: b.namaBarang.trim(),
          kodeBarang: b.kodeBarang.trim(),
          jumlah: Number(b.jumlah),
          pic: b.pic.trim(),
        })),
      ];
    });
    setIsModalOpen(false);
  };

  const filteredData = dataBarangKeluar.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = q === "" ||
      item.noTransaksi.toLowerCase().includes(q) ||
      item.namaClient.toLowerCase().includes(q) ||
      item.kodeBarang.toLowerCase().includes(q) ||
      item.spk.toLowerCase().includes(q) ||
      item.namaBarang.toLowerCase().includes(q) ||
      item.namaItem.toLowerCase().includes(q);
    const matchesTanggal = filterTanggal === "" || item.tanggal === filterTanggal;
    return matchesSearch && matchesTanggal;
  });

  // Download tabel sesuai hasil pencarian & filter tanggal
  const handleDownload = async () => {
    const XLSX = await import('xlsx');
    const rows = filteredData.map((item, index) => ({
      'No': index + 1,
      'No. Transaksi': item.noTransaksi,
      'Kode Barang': item.kodeBarang,
      'Nama Client': item.namaClient,
      'SPK': item.spk,
      'Tanggal': formatTanggal(item.tanggal),
      'Nama Item/Projek': item.namaItem,
      'Nama Barang': item.namaBarang,
      'Jumlah': item.jumlah,
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Barang Keluar');
    XLSX.writeFile(book, 'Data_Barang_Keluar.xlsx');
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-[18px] font-extrabold text-black tracking-wide uppercase">Data Barang Keluar</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Pencarian, filter tanggal & tambah data */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-full sm:w-64">
              <label htmlFor="barang-keluar-cari" className={labelClass}>Cari</label>
              <div className="relative">
                <input
                  id="barang-keluar-cari"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Silahkan cari data"
                  className={fieldClass}
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-800 pointer-events-none" />
              </div>
            </div>

            <div className="w-44">
              <label htmlFor="barang-keluar-tanggal" className={labelClass}>Tanggal</label>
              <div className="relative">
                <input
                  ref={tanggalRef}
                  id="barang-keluar-tanggal"
                  type="date"
                  value={filterTanggal}
                  onChange={(e) => setFilterTanggal(e.target.value)}
                  className={`${fieldClass} [&::-webkit-calendar-picker-indicator]:hidden`}
                />
                <button
                  type="button"
                  aria-label="Pilih tanggal"
                  onClick={() => tanggalRef.current?.showPicker()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-800 hover:opacity-70"
                >
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
            </div>

            {filterTanggal && (
              <button
                type="button"
                onClick={() => setFilterTanggal("")}
                className="text-xs text-orange-600 font-bold hover:underline pb-2.5"
              >
                Reset
              </button>
            )}
          </div>

          <button type="button" onClick={bukaForm} className={orangeButtonClass}>
            <Plus className="w-4 h-4" />
            <span>Barang Keluar</span>
          </button>
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto border-t border-l border-gray-300 rounded-sm">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="bg-gray-100 text-gray-900 font-semibold text-xs">
              <tr>
                <th scope="col" className={`${cellClass} w-12`}>No</th>
                <th scope="col" className={cellClass}>No. Transaksi</th>
                <th scope="col" className={cellClass}>Kode Barang</th>
                <th scope="col" className={cellClass}>Nama Client</th>
                <th scope="col" className={cellClass}>SPK</th>
                <th scope="col" className={cellClass}>Tanggal</th>
                <th scope="col" className={cellClass}>Nama Item/Projek</th>
                <th scope="col" className={cellClass}>Nama Barang</th>
                <th scope="col" className={`${cellClass} text-right`}>Jumlah</th>
              </tr>
            </thead>
            <tbody className="text-gray-800">
              {filteredData.map((item, index) => (
                <tr key={item.id} className="hover:bg-orange-50/20 transition-colors">
                  <td className={cellClass}>{index + 1}</td>
                  <td className={`${cellClass} font-semibold text-gray-900`}>{item.noTransaksi}</td>
                  <td className={`${cellClass} font-mono text-xs`}>{item.kodeBarang}</td>
                  <td className={cellClass}>{item.namaClient}</td>
                  <td className={cellClass}>{item.spk}</td>
                  <td className={cellClass}>{formatTanggal(item.tanggal)}</td>
                  <td className={cellClass}>{item.namaItem}</td>
                  <td className={cellClass}>{item.namaBarang}</td>
                  <td className={`${cellClass} text-right`}>{item.jumlah}</td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={9} className={`${cellClass} px-6 py-10 text-center text-gray-400 italic`}>
                    Data tidak ditemukan untuk filter tersebut.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-6">
          <button type="button" onClick={handleDownload} disabled={filteredData.length === 0} className={orangeButtonClass}>
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Modal Form Barang Keluar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md transition-opacity duration-300 p-4">
          <form
            onSubmit={handleSimpan}
            noValidate
            className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-full overflow-y-auto p-6 sm:p-8 relative animate-in zoom-in-95 duration-200"
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              aria-label="Tutup form"
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>

            <h2 className="text-[18px] font-extrabold text-black tracking-wide uppercase mb-6">Form Barang Keluar</h2>

            {/* Data transaksi */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mb-8">
              <div>
                <label htmlFor="form-bk-transaksi" className={labelClass}>No. Transaksi</label>
                <input
                  id="form-bk-transaksi"
                  type="text"
                  value={form.noTransaksi}
                  onChange={(e) => setForm((prev) => ({ ...prev, noTransaksi: e.target.value }))}
                  placeholder="Isi nomor transaksi"
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="form-bk-pengambil" className={labelClass}>Nama Pengambil</label>
                <input
                  id="form-bk-pengambil"
                  type="text"
                  value={form.namaPengambil}
                  onChange={(e) => setForm((prev) => ({ ...prev, namaPengambil: e.target.value }))}
                  placeholder="Isi nama pengambil"
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="form-bk-tanggal" className={labelClass}>Tanggal</label>
                <div className="relative">
                  <input
                    ref={formTanggalRef}
                    id="form-bk-tanggal"
                    type="date"
                    value={form.tanggal}
                    onChange={(e) => setForm((prev) => ({ ...prev, tanggal: e.target.value }))}
                    className={`${fieldClass} [&::-webkit-calendar-picker-indicator]:hidden`}
                  />
                  <button
                    type="button"
                    aria-label="Pilih tanggal"
                    onClick={() => formTanggalRef.current?.showPicker()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-800 hover:opacity-70"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Daftar barang yang keluar */}
            <div className="overflow-x-auto border-t border-l border-gray-300 rounded-sm">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 text-gray-900 font-medium text-base">
                  <tr>
                    <th scope="col" className={`${formCellClass} w-10 px-2 py-2.5`}>No</th>
                    {KOLOM_FORM.map((kolom) => (
                      <th key={kolom.field} scope="col" className={`${formCellClass} px-2 py-2.5 font-medium whitespace-nowrap ${kolom.lebar}`}>{kolom.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.baris.map((baris, index) => (
                    <tr key={index}>
                      <td className={`${formCellClass} text-center text-gray-700`}>{index + 1}</td>
                      {KOLOM_FORM.map((kolom) => (
                        <td key={kolom.field} className={formCellClass}>
                          <input
                            type={kolom.field === 'jumlah' ? 'number' : 'text'}
                            min={kolom.field === 'jumlah' ? 1 : undefined}
                            value={baris[kolom.field]}
                            onChange={(e) => updateBaris(index, kolom.field, e.target.value)}
                            aria-label={`${kolom.label} baris ${index + 1}`}
                            className={`${formInputClass} ${kolom.field === 'jumlah' ? 'text-right' : ''}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={tambahBaris}
              aria-label="Tambah baris barang"
              className="mt-2 flex items-center justify-center w-6 h-6 rounded-md border border-[#FF8A00] text-[#FF8A00] hover:bg-orange-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>

            {formError && (
              <p className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{formError}</p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 mt-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 rounded-full text-gray-800">
                <AlertCircle className="w-4 h-4" strokeWidth={2.2} />
                <span className="text-sm">Penulisan nama item tidak boleh disingkat</span>
              </div>
              <button type="submit" className={orangeButtonClass}>Simpan</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
