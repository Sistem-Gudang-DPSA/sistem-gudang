"use client";

import { useCan } from '@/domains/auth/user-context';
import React, { useState } from 'react';
import { Search, Plus, Filter, ScanLine, Printer, X } from 'lucide-react';
import { createInbound, createInboundReturn, getItem, listInbound } from '@/domains/inventory/api';
import type { InboundRow, StatusQc } from '@/domains/inventory/types';
import { useItemSearch } from '@/domains/inventory/use-item-search';
import { useSpkSearch } from '@/domains/ppic/use-spk-search';
import { displayDate, todayIso, toDateRange } from '@/domains/inventory/date';
import { toCsv } from '@/shared/lib/csv';
import { ApiError } from '@/shared/lib/api-client';
import { useApiData } from '@/shared/lib/use-api-data';
import Pagination from '@/shared/components/Pagination';
import { INTEGER_INPUT, digitsOnly } from '@/shared/lib/input';
import { ExportExcellButton } from '@/shared/components/Tombol';
import { countActiveFilters, emptyBarangFilters } from './BarangFilterPanel';
import SortableTh, { useSort } from '@/shared/components/SortableTh';
import { usePage } from '@/shared/lib/use-page';
import DateFilter from '@/shared/components/DateFilter';
import SearchableSelect from '@/shared/components/SearchableSelect';
import BarangMasukScan from './BarangMasukScan';
import { QC_STATUS } from '@/domains/inventory/status';

type PickedItem = { id: number; name: string; code: string | null };

const emptyBaru = { item: null as PickedItem | null, tanggal: todayIso(), jumlahKedatangan: "", jumlahRekap: "", statusQc: "PASS" as StatusQc };
const emptyKembali = { item: null as PickedItem | null, tanggal: todayIso(), jumlah: "", spk: "" };

const orangeButtonClass =
  "flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed";

// ---------- Cetak dokumen barang masuk ----------
type BarisCetak = { name: string; code: string | null | undefined; unit?: string; qty: number };
type DataCetakMasuk = { tanggal: string; supplier: string; baris: BarisCetak[] };

const FORMAT_DOKUMEN = {
  logo: "/logo-perusahaan.jpg",
  logoAlternatif: "/logo-perusahaan.png",
  judul: "SK PENERIMAAN BARANG",
  kode: "PPIC",
  nomor: "011",
  revisi: "00",
  terbit: "08/25",
  divisi: "DPSA",
};

const escapeHtml = (value: string | number | null | undefined) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function buatDokumenBarangMasuk(data: DataCetakMasuk, logoUrl: string): string {
  const barisPerHalaman = 6;
  const jumlahHalaman = Math.max(1, Math.ceil(data.baris.length / barisPerHalaman));
  const halaman = Array.from({ length: jumlahHalaman }, (_, pageIndex) => {
    const awal = pageIndex * barisPerHalaman;
    const isiTabel = data.baris
      .slice(awal, awal + barisPerHalaman)
      .map((b, rowIndex) => `<tr>
        <td class="tengah">${awal + rowIndex + 1}</td>
        <td>${escapeHtml(b.name)}</td>
        <td class="tengah">${escapeHtml(b.unit)}</td>
        <td class="tengah"></td>
        <td class="tengah">${escapeHtml(b.qty)}</td>
        <td></td>
      </tr>`)
      .join("");

    return `<section class="lembar">
      <header class="kop">
        <img class="logo" src="${escapeHtml(logoUrl)}" alt="Logo perusahaan" />
        <h1>${escapeHtml(FORMAT_DOKUMEN.judul)}</h1>
        <div class="identitas-dokumen">
          <table class="kode-dokumen">
            <colgroup><col style="width:42%" /><col style="width:58%" /></colgroup>
            <tbody>
              <tr><td rowspan="2" class="tengah">${escapeHtml(FORMAT_DOKUMEN.kode)}<br />${escapeHtml(FORMAT_DOKUMEN.nomor)}</td><td>Rev:${escapeHtml(FORMAT_DOKUMEN.revisi)}</td></tr>
              <tr><td>Terbit:${escapeHtml(FORMAT_DOKUMEN.terbit)}</td></tr>
            </tbody>
          </table>
          <p class="divisi">${escapeHtml(FORMAT_DOKUMEN.divisi)}</p>
        </div>
      </header>

      <table class="informasi">
        <colgroup><col style="width:18%" /><col style="width:2%" /><col style="width:80%" /></colgroup>
        <tbody>
          <tr><td class="label">SUPPLIER</td><td>:</td><td>${escapeHtml(data.supplier)}</td></tr>
          <tr><td class="label">TGL KEDATANGAN</td><td>:</td><td>${escapeHtml(displayDate(data.tanggal))}</td></tr>
        </tbody>
      </table>

      <table class="material">
        <colgroup><col style="width:8%" /><col style="width:36%" /><col style="width:10%" /><col style="width:14%" /><col style="width:14%" /><col style="width:18%" /></colgroup>
        <thead>
          <tr><th rowspan="2" scope="col">No</th><th rowspan="2" scope="col">Nama Material</th><th rowspan="2" scope="col">sat/vol</th><th colspan="2" scope="colgroup">Jumlah</th><th rowspan="2" scope="col">Keterangan</th></tr>
          <tr><th scope="col">Dokubah</th><th scope="col">Pengambilan</th></tr>
        </thead>
        <tbody>${isiTabel}</tbody>
      </table>

      <footer class="pengesahan">
        <p class="catatan">Ket : Rangkap 3 (untuk Gudang, PPIC &amp; Keuangan)</p>
        <table class="tanda-tangan"><tbody><tr>
          ${["PENERIMA", "GUDANG", "PPIC", "KEUANGAN"].map((label) => `<td>${label}<div class="ruang-tanda-tangan"></div>(____________________)</td>`).join("")}
        </tr></tbody></table>
        ${jumlahHalaman > 1 ? `<p class="nomor-halaman">Halaman ${pageIndex + 1} dari ${jumlahHalaman}</p>` : ""}
      </footer>
    </section>`;
  }).join("");

  return `<!doctype html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(FORMAT_DOKUMEN.judul)} - ${escapeHtml(data.supplier)}</title>
        <style>
          @page { size: A4 landscape; margin: 5mm; }
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; }
          body { font: 7pt/1.2 Arial, sans-serif; color: #000; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .kertas { display: grid; grid-template-columns: repeat(2, 138mm); grid-auto-rows: minmax(95mm, auto); gap: 5mm; align-items: start; break-after: page; page-break-after: always; }
          .kertas:last-child { break-after: auto; page-break-after: auto; }
          .lembar { width: 138mm; max-width: 100%; break-inside: avoid; page-break-inside: avoid; }
          .kop { height: 18mm; position: relative; }
          .logo { position: absolute; top: 0; left: 0; width: 16mm; height: 16mm; object-fit: contain; }
          h1 { margin: 0 27mm 0 17mm; padding-top: 5mm; text-align: center; font-size: 8pt; line-height: 1.2; font-weight: 700; text-decoration: underline; text-underline-offset: 0.5mm; }
          .identitas-dokumen { position: absolute; top: 1mm; right: 0; width: 26mm; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          .kode-dokumen { font-size: 6pt; }
          .kode-dokumen tr { height: 4mm; }
          .kode-dokumen td { border: 1px solid #000; padding: 0.5mm 1mm; white-space: nowrap; }
          .divisi { margin: 1mm 0 0; text-align: center; font-size: 6pt; font-weight: 700; }
          .informasi { margin: 0; font-size: 6.5pt; }
          .informasi td { height: 4.5mm; padding: 0.5mm; border-bottom: 1px solid #000; vertical-align: middle; overflow-wrap: anywhere; }
          .informasi .label { font-weight: 700; white-space: nowrap; }
          .material { margin-top: 1mm; font-size: 7pt; }
          .material th, .material td { border: 1px solid #000; padding: 0.5mm; vertical-align: middle; overflow-wrap: anywhere; }
          .material thead tr { height: 4mm; }
          .material th { text-align: center; font-weight: 700; }
          .material tbody tr { height: 5mm; break-inside: avoid; page-break-inside: avoid; }
          .material thead { display: table-header-group; }
          .tengah { text-align: center; }
          .pengesahan { break-inside: avoid; page-break-inside: avoid; }
          .catatan { margin: 2mm 0 1mm; font-size: 6pt; }
          .tanda-tangan { font-size: 6pt; }
          .tanda-tangan td { width: 25%; border: 0; padding: 0; text-align: center; vertical-align: top; }
          .ruang-tanda-tangan { height: 8mm; }
          .nomor-halaman { margin: 1mm 0 0; font-size: 6pt; text-align: right; }
        </style>
      </head>
      <body>${halaman}</body>
    </html>`;
}

// Iframe tersembunyi: tidak diblokir pop-up, dan menu serta tombol halaman tidak ikut tercetak.
function cetakBarangMasuk(data: DataCetakMasuk | DataCetakMasuk[]): Promise<void> {
  const logoUrl = new URL(FORMAT_DOKUMEN.logo, window.location.origin).href;
  const iframe = document.createElement("iframe");
  iframe.title = "Cetak barang masuk";
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";

  return new Promise((resolve, reject) => {
    iframe.onload = async () => {
      const printWindow = iframe.contentWindow;
      const printDocument = iframe.contentDocument;
      if (!printWindow || !printDocument) {
        iframe.remove();
        reject(new Error("Dokumen cetak tidak dapat dibuka."));
        return;
      }
      printWindow.addEventListener("afterprint", () => iframe.remove(), { once: true });
      try {
        await Promise.all(
          Array.from(printDocument.images, (img) =>
            img.decode().catch(async () => {
              img.src = new URL(FORMAT_DOKUMEN.logoAlternatif, window.location.origin).href;
              try {
                await img.decode();
              } catch {
                throw new Error("Logo gagal dimuat. Letakkan logo di public/logo-perusahaan.jpg atau public/logo-perusahaan.png.");
              }
            }),
          ),
        );
        printWindow.focus();
        printWindow.print();
        resolve();
      } catch (err) {
        iframe.remove();
        reject(err);
      }
    };
    iframe.onerror = () => {
      iframe.remove();
      reject(new Error("Dokumen cetak gagal dimuat."));
    };

    const dokumen = (Array.isArray(data) ? data : [data]).map((d) =>
      new DOMParser().parseFromString(buatDokumenBarangMasuk(d, logoUrl), "text/html"),
    );
    const gabungan = dokumen[0];
    for (const lanjutan of dokumen.slice(1)) {
      gabungan.body.append(...Array.from(lanjutan.body.children));
    }
    // Setiap formulir tetap sendiri; muat hingga empat formulir per A4.
    const formulir = Array.from(gabungan.body.children);
    gabungan.body.replaceChildren();
    for (let index = 0; index < formulir.length; index += 4) {
      const kertas = gabungan.createElement("main");
      kertas.className = "kertas";
      kertas.append(...formulir.slice(index, index + 4));
      gabungan.body.append(kertas);
    }
    iframe.srcdoc = `<!doctype html>${gabungan.documentElement.outerHTML}`;
    document.body.appendChild(iframe);
  });
}

export default function BarangMasukGudang() {
  const canCreate = useCan('inbound.create');
  const { sort, toggle, params: sortParams } = useSort();
  const [filters] = useState(emptyBarangFilters);
  const [showFilter, setShowFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState(emptyBaru);
  const [isModalKembaliOpen, setIsModalKembaliOpen] = useState(false);
  const [modalKembaliData, setModalKembaliData] = useState(emptyKembali);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const [selected, setSelected] = useState<Map<number, InboundRow>>(new Map());
  const [printing, setPrinting] = useState(false);
  const [actionError, setActionError] = useState("");

  const dateRange = toDateRange(filterDay, filterMonth, filterYear);

  const filterKey = JSON.stringify([searchQuery, filterDay, filterMonth, filterYear, sortParams]);
  const [page, setPage] = usePage(filterKey);
  const { data: result, loading, error, reload } = useApiData(
    () => listInbound({ page, pageSize: 20, search: searchQuery || undefined, ...dateRange, ...sortParams }),
    `${filterKey}|${page}`,
    'Gagal memuat data barang masuk.',
  );
  const rows = result?.rows ?? [];
  const total = result?.total ?? 0;

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleSelected = (row: InboundRow) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(row.id)) next.delete(row.id);
      else next.set(row.id, row);
      return next;
    });
  const toggleAllSelected = () =>
    setSelected((prev) => {
      const next = new Map(prev);
      rows.forEach((r) => (allChecked ? next.delete(r.id) : next.set(r.id, r)));
      return next;
    });

  const spkKembali = useSpkSearch(modalKembaliData.spk);

  // Barang dicari di server dan dipilih per id; yang terpilih disimpan di state modal (nama belum tentu unik).
  const { items, onSearch: searchItems, pending: itemPending, error: itemError } = useItemSearch();
  const itemBaru = modalData.item;
  const itemKembali = modalKembaliData.item;
  const label = (it: PickedItem) => (it.code ? `${it.name} (${it.code})` : it.name);
  const pilihanBarang = (picked: PickedItem | null) => [
    ...(picked && !items.some((it) => it.id === picked.id) ? [{ value: String(picked.id), label: label(picked) }] : []),
    ...items.map((it) => ({ value: String(it.id), label: label(it) })),
  ];
  const pilihBarang = (id: string, prev: PickedItem | null): PickedItem | null => {
    const it = items.find((x) => String(x.id) === id);
    return it ? { id: it.id, name: it.name, code: it.code } : prev && String(prev.id) === id ? prev : null;
  };

  // Ekspor CSV untuk baris yang tampil di halaman ini
  const handleExportCsv = () => {
    const csv = toCsv([
      ['No', 'Tanggal', 'Kode Barang', 'Nama Barang', 'Supplier', 'Jumlah Kedatangan', 'Jumlah Rekap'],
      ...rows.map((r, i) => [i + 1, displayDate(r.date), r.itemCode ?? '', r.itemName, r.supplierName ?? r.clientName ?? '', r.qtyArrived, r.qtyPurchased ?? '']),
    ]);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `Data_Barang_Masuk_halaman-${page}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Cetak: baris yang dicentang, atau semua baris yang tampil bila tidak ada yang dicentang.
  // Satu formulir per baris; satuan diambil dari data barang.
  const printSelected = async () => {
    if (printing) return;
    const sumber = selected.size > 0 ? [...selected.values()] : rows;
    if (sumber.length === 0) return;

    setPrinting(true);
    setActionError("");
    try {
      const itemIds = [...new Set(sumber.map((r) => r.itemId))];
      const materials = await Promise.all(itemIds.map((id) => getItem(id)));
      const units = new Map(materials.map((m) => [m.id, m.unit]));
      await cetakBarangMasuk(
        sumber.map((r): DataCetakMasuk => ({
          tanggal: r.date,
          supplier: r.supplierName ?? r.clientName ?? "-",
          baris: [{ name: r.itemName, code: r.itemCode, unit: units.get(r.itemId), qty: r.qtyArrived }],
        })),
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal menyiapkan dokumen cetak.");
    } finally {
      setPrinting(false);
    }
  };

  const openModal = () => { searchItems(''); setModalData({ ...emptyBaru, tanggal: todayIso() }); setModalError(""); setIsModalOpen(true); };
  const openModalKembali = () => { searchItems(''); setModalKembaliData({ ...emptyKembali, tanggal: todayIso() }); setModalError(""); setIsModalKembaliOpen(true); };

  const handleSimpan = async (cetakSetelah = false) => {
    const itemId = itemBaru?.id;
    const { tanggal, jumlahKedatangan, jumlahRekap, statusQc } = modalData;
    if (!itemId || !tanggal || !jumlahKedatangan || jumlahRekap === "") {
      setModalError("Lengkapi semua isian.");
      return;
    }
    setSaving(true);
    setModalError("");
    try {
      const saved = await createInbound({
        itemId,
        date: tanggal,
        qtyArrived: Number(jumlahKedatangan),
        qtyPurchased: Number(jumlahRekap),
        statusQc,
      });
      setIsModalOpen(false);
      reload();
      if (cetakSetelah) {
        try {
          const itemDetail = await getItem(saved.itemId);
          await cetakBarangMasuk({
            tanggal: saved.date,
            supplier: saved.supplierName ?? saved.clientName ?? "-",
            baris: [{ name: saved.itemName, code: saved.itemCode, unit: itemDetail.unit, qty: saved.qtyArrived }],
          });
        } catch (err) {
          setActionError(err instanceof Error ? err.message : "Gagal menyiapkan dokumen cetak.");
        }
      }
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : "Gagal menyimpan barang masuk.");
    } finally {
      setSaving(false);
    }
  };

  const handleSimpanKembali = async () => {
    const itemId = itemKembali?.id;
    const { tanggal, jumlah, spk } = modalKembaliData;
    if (!itemId || !tanggal || !jumlah) {
      setModalError("Barang, tanggal, dan jumlah wajib diisi.");
      return;
    }
    setSaving(true);
    setModalError("");
    try {
      await createInboundReturn({
        itemId,
        date: tanggal,
        qty: Number(jumlah),
        spk: spk || undefined,
      });
      setIsModalKembaliOpen(false);
      reload();
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : "Gagal menyimpan barang kembali.");
    } finally {
      setSaving(false);
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
            <button type="button" onClick={printSelected} disabled={printing || (selected.size === 0 && (loading || !!error || rows.length === 0))} className={orangeButtonClass}>
              <Printer className="w-4 h-4" />
              <span>{printing ? "Menyiapkan cetak..." : "Print"}</span>
            </button>
            {canCreate && (
              <button type="button" onClick={openModal} className={orangeButtonClass}>
                <Plus className="w-4 h-4" />
                <span>Barang Baru</span>
              </button>
            )}
            {canCreate && (
              <button type="button" onClick={() => setIsScanOpen(true)} className={orangeButtonClass}>
                <ScanLine className="w-4 h-4" />
                <span>Scan Barang</span>
              </button>
            )}
            {canCreate && (
              <button type="button" onClick={openModalKembali} className={orangeButtonClass}>
                <Plus className="w-4 h-4" />
                <span>Barang Kembali</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowFilter((v) => !v)}
              aria-expanded={showFilter}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors text-sm font-medium ${showFilter || countActiveFilters(filters) > 0 ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <Filter className="w-4 h-4" />
              <span>Filter{countActiveFilters(filters) > 0 ? ` (${countActiveFilters(filters)})` : ''}</span>
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
                  <input type="checkbox" aria-label="Centang semua baris" checked={allChecked} onChange={toggleAllSelected} disabled={loading || !!error || rows.length === 0} className="w-4 h-4 accent-[#FF8A00]" />
                </th>
                <th scope="col" className="px-6 py-4">No</th>
                <SortableTh label="Tanggal" sortKey="date" sort={sort} onSort={toggle} />
                <SortableTh label="Informasi Barang" sortKey="itemName" sort={sort} onSort={toggle} />
                <th scope="col" className="px-6 py-4 text-center">Jml Kedatangan</th>
                <th scope="col" className="px-6 py-4 text-center">Jml Rekap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Memuat data...</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-red-500">{error}</td></tr>
              )}
              {!loading && !error && rows.map((item, index) => (
                <tr key={item.id} className="hover:bg-[#FF8A00]/5 transition-colors group">
                  <td className="px-4 py-4">
                    <input type="checkbox" aria-label={`Centang ${item.itemName}`} checked={selected.has(item.id)} onChange={() => toggleSelected(item)} className="w-4 h-4 accent-[#FF8A00]" />
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-center">{(page - 1) * 20 + index + 1}.</td>
                  <td className="px-6 py-4 text-gray-500">{displayDate(item.date)}</td>

                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{item.itemName}</span>
                      <span className="text-xs font-mono text-gray-500 mt-0.5">{item.itemCode ?? '-'}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center font-bold text-gray-800">{item.qtyArrived}</td>
                  <td className="px-6 py-4 text-center font-bold text-[#FF8A00]">{item.qtyPurchased ?? '-'}</td>
                </tr>
              ))}
              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400 italic">
                    Data tidak ditemukan untuk filter tersebut.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
      </div>

      {/* Export */}
      <div className="flex justify-end mt-6">
        <ExportExcellButton onClick={handleExportCsv} />
      </div>

      {isScanOpen && <BarangMasukScan onClose={() => setIsScanOpen(false)} onSaved={reload} />}

      {/* Modal Form Barang Masuk */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md transition-opacity duration-300 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-187.5 p-8 border border-white/20 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-[20px] font-extrabold text-gray-900 mb-8 tracking-wide uppercase">
              FORM BARANG MASUK
            </h2>

            <div className="flex flex-col gap-6 mb-10">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Kode Barang</label>
                  <input
                    type="text"
                    disabled
                    placeholder="Isi Otomatis"
                    value={itemBaru?.code ?? ''}
                    className="w-full border border-gray-300 rounded-md py-3 px-4 text-gray-700 placeholder-gray-400 bg-[#f8f9fa] text-sm"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Nama Barang</label>
                  <SearchableSelect
                    value={itemBaru ? String(itemBaru.id) : ''}
                    onChange={(id) => setModalData((prev) => ({ ...prev, item: pilihBarang(id, prev.item) }))}
                    onSearch={searchItems}
                    pending={itemPending}
                    options={pilihanBarang(itemBaru)}
                    placeholder="Isi Nama Barang"
                    emptyText="Barang tidak ditemukan"
                    aria-label="Nama Barang"
                    className="w-full border border-gray-300 rounded-md py-3 pl-4 pr-3 text-gray-700 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Jumlah Sesuai Kedatangan</label>
                  <input
                    {...INTEGER_INPUT}
                    maxLength={9}
                    placeholder="0"
                    value={modalData.jumlahKedatangan}
                    onChange={(e) => setModalData({ ...modalData, jumlahKedatangan: digitsOnly(e.target.value) })}
                    className="w-full border border-gray-200 bg-gray-50/50 rounded-lg py-3 px-4 text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Jumlah Sesuai Rekap Pembelian</label>
                  <input
                    {...INTEGER_INPUT}
                    maxLength={9}
                    placeholder="0"
                    value={modalData.jumlahRekap}
                    onChange={(e) => setModalData({ ...modalData, jumlahRekap: digitsOnly(e.target.value) })}
                    className="w-full border border-gray-200 bg-gray-50/50 rounded-lg py-3 px-4 text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Tanggal</label>
                  <input
                    type="date"
                    value={modalData.tanggal}
                    onChange={(e) => setModalData({ ...modalData, tanggal: e.target.value })}
                    className="w-full border border-gray-300 rounded-md py-3 px-4 text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-sm"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Status QC</label>
                  <select
                    value={modalData.statusQc}
                    onChange={(e) => setModalData({ ...modalData, statusQc: e.target.value as StatusQc })}
                    className="w-full border border-gray-300 rounded-md py-3 px-4 text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-sm"
                  >
                    <option value="PASS">{QC_STATUS.PASS.label}</option>
                    <option value="PARTIAL_RETUR">{QC_STATUS.PARTIAL_RETUR.label}</option>
                  </select>
                </div>
              </div>
            </div>

            {(modalError || itemError) && <p className="text-sm text-red-500 mb-2 text-right">{modalError || itemError}</p>}
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => handleSimpan(false)}
                disabled={saving}
                className="px-8 py-2.5 bg-white text-[#ff8a00] border border-[#ff8a00] rounded-md hover:bg-orange-50 transition-colors font-medium text-[15px] shadow-sm"
              >
                Simpan
              </button>
              <button
                onClick={() => handleSimpan(true)}
                disabled={saving}
                className="flex items-center gap-2 px-8 py-2.5 bg-[#ff8a00] text-white rounded-md hover:bg-[#e07b00] transition-colors font-medium text-[15px] shadow-sm"
              >
                <Printer className="w-4 h-4" />
                Simpan + Cetak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Barang Kembali */}
      {isModalKembaliOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md transition-opacity duration-300 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-187.5 p-8 border border-white/20 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalKembaliOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-[20px] font-extrabold text-gray-900 mb-8 tracking-wide uppercase">
              FORM BARANG KEMBALI
            </h2>

            <div className="flex flex-col gap-6 mb-10">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Kode Barang</label>
                  <input
                    type="text"
                    disabled
                    placeholder="Isi Otomatis"
                    value={itemKembali?.code ?? ''}
                    className="w-full border border-gray-300 rounded-md py-3 px-4 text-gray-700 placeholder-gray-400 bg-[#f8f9fa] text-sm"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Nama Barang</label>
                  <SearchableSelect
                    value={itemKembali ? String(itemKembali.id) : ''}
                    onChange={(id) => setModalKembaliData((prev) => ({ ...prev, item: pilihBarang(id, prev.item) }))}
                    onSearch={searchItems}
                    pending={itemPending}
                    options={pilihanBarang(itemKembali)}
                    placeholder="Isi Nama Barang"
                    emptyText="Barang tidak ditemukan"
                    aria-label="Nama Barang"
                    className="w-full border border-gray-300 rounded-md py-3 pl-4 pr-3 text-gray-700 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Tanggal</label>
                  <input
                    type="date"
                    value={modalKembaliData.tanggal}
                    onChange={(e) => setModalKembaliData({ ...modalKembaliData, tanggal: e.target.value })}
                    className="w-full border border-gray-300 rounded-md py-3 pl-4 pr-10 text-gray-700 placeholder-gray-400 text-sm"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Jumlah</label>
                  <input
                    {...INTEGER_INPUT}
                    maxLength={9}
                    placeholder="0"
                    value={modalKembaliData.jumlah}
                    onChange={(e) => setModalKembaliData({ ...modalKembaliData, jumlah: digitsOnly(e.target.value) })}
                    className="w-full border border-gray-300 rounded-md py-3 px-4 text-gray-700 placeholder-gray-400 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">SPK (opsional)</label>
                  <SearchableSelect
                    value={modalKembaliData.spk}
                    onChange={(spk) => setModalKembaliData({ ...modalKembaliData, spk })}
                    onSearch={spkKembali.onSearch}
                    options={[{ value: '', label: 'Tanpa SPK' }, ...spkKembali.options.map((t) => ({ value: t.noSpk, label: `${t.noSpk} - ${t.client}` }))]}
                    placeholder="Tanpa SPK"
                    aria-label="SPK"
                    className="w-full border border-gray-300 rounded-md py-3 px-4 text-gray-700 bg-white text-sm"
                  />
                </div>
              </div>
            </div>

            {(modalError || itemError) && <p className="text-sm text-red-500 mb-2 text-right">{modalError || itemError}</p>}
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSimpanKembali}
                disabled={saving}
                className="px-8 py-2.5 bg-[#ff8a00] text-white rounded-md hover:bg-[#e07b00] transition-colors font-medium text-[15px] shadow-sm"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}