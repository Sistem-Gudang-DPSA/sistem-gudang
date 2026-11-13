"use client";

import { useCan } from '@/domains/auth/user-context';
import { useState } from 'react';
import { Search, Plus, Filter, Printer, X } from 'lucide-react';
import { createInboundBatch, getItem, listInbound } from '@/domains/inventory/api';
import type { CreateInboundBatchInput, InboundRow } from '@/domains/inventory/types';
import { displayDate, toDateRange } from '@/domains/inventory/date';
import { downloadCsv } from '@/shared/lib/csv';
import { useApiData } from '@/shared/lib/use-api-data';
import Pagination from '@/shared/components/Pagination';
import { ExportExcellButton } from '@/shared/components/Tombol';
import SortableTh, { useSort } from '@/shared/components/SortableTh';
import { useSelection } from '@/shared/lib/use-selection';
import { usePage } from '@/shared/lib/use-page';
import DateFilter from '@/shared/components/DateFilter';
import { BadgeDibatalkan } from './BatalkanTransaksi';
import FormBarangMasukModal from './barang-masuk/FormBarangMasukModal';
import { cetakFormulir, dokumenFormulir, lembarFormulir, lembarPerHalaman, tabelMaterial, type KopFormulir } from '@/domains/inventory/print-formulir';
import { escapeHtml } from '@/shared/lib/escape-html';

const PAGE_SIZE = 20;

// Nama supplier, atau nama klien bila barang masuk dari klien.
const namaSupplier = (r: InboundRow, kosong = '-') => r.supplierName ?? r.clientName ?? kosong;

const orangeButtonClass =
  "flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed";

// ---------- Cetak dokumen barang masuk ----------
type BarisCetak = { name: string; code: string | null | undefined; unit?: string; qty: number };
type DataCetakMasuk = { tanggal: string; supplier: string; baris: BarisCetak[] };

const FORMAT_DOKUMEN: KopFormulir = {
  judul: "SK PENERIMAAN BARANG",
  kode: "PPIC",
  nomor: "011",
  revisi: "00",
  terbit: "08/25",
  divisi: "DPSA",
};

function buatDokumenBarangMasuk(data: DataCetakMasuk): string {
  const halaman = lembarPerHalaman(data.baris, (isi, h) =>
    lembarFormulir(FORMAT_DOKUMEN, {
      halaman: h,
      informasi: `<table class="informasi">
        <colgroup><col style="width:18%" /><col style="width:2%" /><col style="width:80%" /></colgroup>
        <tbody>
          <tr><td class="label">SUPPLIER</td><td>:</td><td>${escapeHtml(data.supplier)}</td></tr>
          <tr><td class="label">TGL KEDATANGAN</td><td>:</td><td>${escapeHtml(displayDate(data.tanggal))}</td></tr>
        </tbody>
      </table>`,
      material: tabelMaterial(
        [8, 36, 10, 14, 14, 18],
        isi
          .map((b, rowIndex) => `<tr>
        <td class="tengah">${h.awal + rowIndex + 1}</td>
        <td>${escapeHtml(b.name)}</td>
        <td class="tengah">${escapeHtml(b.unit)}</td>
        <td class="tengah"></td>
        <td class="tengah">${escapeHtml(b.qty)}</td>
        <td></td>
      </tr>`)
          .join(""),
      ),
      keterangan: "Ket : Rangkap 3 (untuk Gudang, PPIC & Keuangan)",
      tandaTangan: ["PENERIMA", "GUDANG", "PPIC", "KEUANGAN"],
    }),
  );
  return dokumenFormulir(`${FORMAT_DOKUMEN.judul} - ${data.supplier}`, halaman);
}

// Satu formulir per baris; satuan diambil dari data barang.
async function cetakBarangMasuk(rows: InboundRow[]): Promise<void> {
  const itemIds = [...new Set(rows.map((r) => r.itemId))];
  const materials = await Promise.all(itemIds.map((id) => getItem(id)));
  const units = new Map(materials.map((m) => [m.id, m.unit]));
  await cetakFormulir(
    rows.map((r) =>
      buatDokumenBarangMasuk({
        tanggal: r.date,
        supplier: namaSupplier(r),
        baris: [{ name: r.itemName, code: r.itemCode, unit: units.get(r.itemId), qty: r.qtyArrived }],
      }),
    ),
    "barang masuk",
  );
}

export default function BarangMasukGudang() {
  const canCreate = useCan('inbound.create');
  const { sort, toggle, params: sortParams } = useSort();
  const [showFilter, setShowFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const jumlahFilterAktif = [filterDay, filterMonth, filterYear].filter(Boolean).length;

  const [isModalOpen, setIsModalOpen] = useState(false);

  const selection = useSelection<InboundRow>();
  const [printing, setPrinting] = useState(false);
  const [actionError, setActionError] = useState("");

  const dateRange = toDateRange(filterDay, filterMonth, filterYear);

  const filterKey = JSON.stringify([searchQuery, filterDay, filterMonth, filterYear, sortParams]);
  const [page, setPage] = usePage(filterKey);
  const { data: result, loading, error, reload } = useApiData(
    () => listInbound({ page, pageSize: PAGE_SIZE, search: searchQuery || undefined, ...dateRange, ...sortParams }),
    `${filterKey}|${page}`,
    'Gagal memuat data barang masuk.',
  );
  const rows = result?.rows ?? [];
  const total = result?.total ?? 0;

  const allChecked = selection.allSelected(rows);

  // Ekspor CSV untuk baris yang tampil di halaman ini
  const handleExportCsv = () => {
    downloadCsv(`Data_Barang_Masuk_halaman-${page}.csv`, [
      ['No', 'Tanggal', 'Kode Barang', 'Nama Barang', 'Supplier', 'Jumlah Kedatangan', 'Jumlah Rekap'],
      ...rows.map((r, i) => [i + 1, displayDate(r.date), r.itemCode ?? '', r.itemName, namaSupplier(r, ''), r.qtyArrived, r.qtyPurchased ?? '']),
    ]);
  };

  // Cetak: baris yang dicentang, atau semua baris yang tampil bila tidak ada yang dicentang.
  // Satu formulir per baris; satuan diambil dari data barang.
  const printSelected = async () => {
    if (printing) return;
    const sumber = selection.size > 0 ? selection.rows : rows;
    if (sumber.length === 0) return;

    setPrinting(true);
    setActionError("");
    try {
      await cetakBarangMasuk(sumber);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal menyiapkan dokumen cetak.");
    } finally {
      setPrinting(false);
    }
  };

  const openModal = () => setIsModalOpen(true);

  const handleSimpan = async (input: CreateInboundBatchInput, key: string, cetakSetelah: boolean) => {
    const saved = await createInboundBatch(input, key);
    setIsModalOpen(false);
    reload();
    if (cetakSetelah) {
      try {
        await cetakBarangMasuk(saved.items);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Gagal menyiapkan dokumen cetak.");
      }
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col justify-start mb-8 gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">DATA BARANG MASUK</h1>
        <p className="text-gray-500 text-sm">Kelola rincian kedatangan barang dan rekap pembelian inventaris.</p>
      </div>

      {actionError && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError("")} aria-label="Tutup pesan cetak"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="relative w-full max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                maxLength={100}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all shadow-sm"
                placeholder="Cari kode, nama barang, atau supplier..."
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 w-full lg:w-auto lg:justify-end">
            <button type="button" onClick={printSelected} disabled={printing || (selection.size === 0 && (loading || !!error || rows.length === 0))} className={orangeButtonClass}>
              <Printer className="w-4 h-4" />
              <span>{printing ? "Menyiapkan cetak..." : "Print"}</span>
            </button>
            {canCreate && (
              <button type="button" onClick={openModal} className={orangeButtonClass}>
                <Plus className="w-4 h-4" />
                <span>Barang Baru</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowFilter((v) => !v)}
              aria-expanded={showFilter}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors text-sm font-medium ${showFilter || jumlahFilterAktif > 0 ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <Filter className="w-4 h-4" />
              <span>Filter{jumlahFilterAktif > 0 ? ` (${jumlahFilterAktif})` : ''}</span>
            </button>
          </div>
        </div>

        {showFilter && (
          <DateFilter
            day={filterDay}
            month={filterMonth}
            year={filterYear}
            onDayChange={setFilterDay}
            onMonthChange={setFilterMonth}
            onYearChange={setFilterYear}
            onReset={() => { setFilterDay(''); setFilterMonth(''); setFilterYear(''); }}
          />
        )}

        {/* Tabel */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th scope="col" className="px-4 py-4">
                  <input type="checkbox" aria-label="Centang semua baris" checked={allChecked} onChange={() => selection.toggleMany(rows)} disabled={loading || !!error || rows.length === 0} className="w-4 h-4 accent-[#FF8A00]" />
                </th>
                <th scope="col" className="px-6 py-4">No</th>
                <SortableTh label="Tanggal" sortKey="date" sort={sort} onSort={toggle} />
                <SortableTh label="Informasi Barang" sortKey="itemName" sort={sort} onSort={toggle} />
                <th scope="col" className="px-6 py-4">Supplier</th>
                <th scope="col" className="px-6 py-4 text-center">Jml Kedatangan</th>
                <th scope="col" className="px-6 py-4 text-center">Jml Rekap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">Memuat data...</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-red-500">{error}</td></tr>
              )}
              {!loading && !error && rows.map((item, index) => (
                <tr key={item.id} className="hover:bg-[#FF8A00]/5 transition-colors group">
                  <td className="px-4 py-4">
                    <input type="checkbox" aria-label={`Centang ${item.itemName}`} checked={selection.isSelected(item.id)} onChange={() => selection.toggle(item)} className="w-4 h-4 accent-[#FF8A00]" />
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-center">{(page - 1) * PAGE_SIZE + index + 1}.</td>
                  <td className="px-6 py-4 text-gray-500">{displayDate(item.date)}</td>

                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{item.itemName}</span>
                      <span className="text-xs font-mono text-gray-500 mt-0.5">{item.itemCode ?? '-'}</span>
                      <BadgeDibatalkan row={item} />
                    </div>
                  </td>

                  <td className="px-6 py-4 text-gray-600">{item.supplierName ?? '-'}</td>
                  <td className="px-6 py-4 text-center font-bold text-gray-800">{item.qtyArrived}</td>
                  <td className="px-6 py-4 text-center font-bold text-[#FF8A00]">{item.qtyPurchased ?? '-'}</td>
                </tr>
              ))}
              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-400 italic">
                    Data tidak ditemukan untuk filter tersebut.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>

      {/* Export */}
      <div className="flex justify-end mt-6">
        <ExportExcellButton onClick={handleExportCsv} />
      </div>

      {isModalOpen && <FormBarangMasukModal onClose={() => setIsModalOpen(false)} onSave={handleSimpan} />}
    </div>
  );
}
