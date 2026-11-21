"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCan } from '@/domains/auth/user-context';
import NoPermission from './NoPermission';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createPurchaseRequest, editPurchaseRequest, listTrackingSpk, resubmitApproval } from '@/domains/ppic/api';
import { permintaan_pembelian_path, type PermintaanPembelian } from '@/domains/ppic/data/pembelian';
import { PILIHAN_PEMOHON_PEMBELIAN } from '@/domains/ppic/data/pemohon-pembelian';
import { todayIso } from '@/domains/inventory/date';
import { ApiError } from '@/shared/lib/api-client';
import { INTEGER_INPUT, digitsOnly } from '@/shared/lib/input';
import { useItemSearch } from '@/domains/inventory/use-item-search';
import { useApiData } from '@/shared/lib/use-api-data';
import SearchableSelect from '@/shared/components/SearchableSelect';
import type { ItemListRow } from '@/domains/inventory/types';
import RekomendasiStokMinimum, { qtySaranRestock } from './RekomendasiStokMinimum';
import { cetakLaporan } from '@/shared/lib/print-laporan';
import { escapeHtml } from '@/shared/lib/escape-html';

const emptyRow = { itemId: undefined as number | undefined, tanggal: "", supplier: "", keterangan: "", dikirimTanggal: "", namaBarang: "", qty: "", satuan: "", proyek: "", client: "", noSpk: "" };
type Row = typeof emptyRow;

const kolomWajib = (r: Row) => [r.namaBarang, r.qty, r.satuan, r.proyek];
// Tanggal terbit formulir mengikuti tanggal surat (tanggal pengajuan), format MM/YY.
const tanggalTerbit = (iso: string) => {
  const [tahun, bulan] = iso.split('-');
  return tahun && bulan ? `${bulan}/${tahun.slice(-2)}` : '-';
};
const barisTerisi = (r: Row) => [r.namaBarang, r.qty, r.satuan, r.proyek, r.tanggal, r.supplier, r.keterangan, r.dikirimTanggal].some(Boolean);

export default function TambahPermintaanPembelianPPIC({ permintaan, basePath = permintaan_pembelian_path, editing = false }: { permintaan?: PermintaanPembelian; basePath?: string; editing?: boolean }) {
  const router = useRouter();
  const canCreate = useCan("purchase-request.create");
  const [barisAktif, setBarisAktif] = useState<number | null>(null);

  const [posisiDropdown, setPosisiDropdown] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const inputBarangRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const [header, setHeader] = useState({
    periode: permintaan?.periode ?? "",
    bagian: permintaan?.bagian ?? "",
    namaPemohon: permintaan?.nama ?? "",
    jabatan: permintaan?.jabatan ?? "",
    tanggalPengajuan: permintaan?.tanggal ?? todayIso(),
  });

  const [tableData, setTableData] = useState<Row[]>(() => {
    const rows = (permintaan?.barang ?? []).map((b) => ({ ...emptyRow, ...b, noSpk: b.noSpk ?? "", supplier: b.supplier ?? "", keterangan: b.keterangan ?? "", tanggal: b.tanggal ?? "", dikirimTanggal: b.deadlineTanggal ?? "", qty: String(b.qty) }));
    return rows.length > 0 ? rows : [{ ...emptyRow }];
  });
  const submitting = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Server errors per row, keyed by the row index in tableData.
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const { items: dataBarang, onSearch: searchItems, error: itemError } = useItemSearch();

  const { data: daftarProyek, loading: proyekLoading, error: proyekError } = useApiData(
    () => canCreate ? listTrackingSpk() : Promise.resolve([]),
    `permintaan-daftar-proyek|${canCreate}`,
    'Gagal memuat daftar proyek.',
  );
  const pilihanProyek = [...new Set((daftarProyek ?? []).map((spk) => spk.projectName?.trim()).filter((name): name is string => !!name && name !== '-'))]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ value: name, label: name }));

  const handleChange = (index: number, field: keyof Row, value: string) => {
    setTableData((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value, ...(field === 'namaBarang' ? { itemId: undefined, satuan: '', supplier: '' } : {}) } : row)));
  };

  const patchRow = (index: number, patch: Partial<Row>) =>
    setTableData((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  // Supplier mengikuti master barang dan hanya Purchasing yang memutuskan supplier final di PO.
  const tambahDariRekomendasi = (item: ItemListRow) => {
    const barisBaru = { ...emptyRow, itemId: item.id, namaBarang: item.name, satuan: item.unit, supplier: item.supplierName ?? '', qty: String(qtySaranRestock(item)) };
    setTableData((rows) => {
      const kosong = rows.findIndex((row) => !barisTerisi(row));
      return kosong >= 0 ? rows.map((row, i) => (i === kosong ? barisBaru : row)) : [...rows, barisBaru];
    });
  };
  const itemIdsTerpilih = new Set(tableData.flatMap((row) => (row.itemId === undefined ? [] : [row.itemId])));

  // Mencetak isi form saat ini (baris yang sudah terisi), tanpa menunggu disimpan.
  const handleCetak = async () => {
    const isiBaris = tableData.filter(barisTerisi).map((row, i) => `<tr>
        <td class="c">${i + 1}</td>
        <td>${row.tanggal ? escapeHtml(row.tanggal) : '-'}</td>
        <td>${row.supplier ? escapeHtml(row.supplier) : '-'}</td>
        <td>${row.namaBarang ? escapeHtml(row.namaBarang) : '-'}</td>
        <td class="c">${row.qty ? escapeHtml(row.qty) : '-'}</td>
        <td class="c">${row.satuan ? escapeHtml(row.satuan) : '-'}</td>
        <td>${row.proyek ? escapeHtml(row.proyek) : '-'}</td>
        <td>${row.keterangan ? escapeHtml(row.keterangan) : '-'}</td>
        <td>${row.dikirimTanggal ? escapeHtml(row.dikirimTanggal) : '-'}</td>
      </tr>`).join('');
    const isi = `<table>
        <colgroup><col style="width:5%" /><col style="width:12%" /><col style="width:16%" /><col style="width:22%" /><col style="width:6%" /><col style="width:6%" /><col style="width:12%" /><col style="width:12%" /><col style="width:9%" /></colgroup>
        <thead><tr>
          <th class="c">No</th><th>Tanggal</th><th>Supplier</th><th>Nama Barang</th><th class="c">QTY</th><th class="c">SAT</th><th>Proyek</th><th>Keterangan</th><th>Dikirim Tanggal</th>
        </tr></thead>
        <tbody>${isiBaris || '<tr><td colspan="9" class="c">Belum ada barang.</td></tr>'}</tbody>
      </table>
      <table style="border:0; margin-top:14mm; font-size:12px;">
        <tbody><tr>
          <td style="border:0; text-align:center; width:50%;">Dibuat<div style="height:16mm"></div>Kepala Gudang</td>
          <td style="border:0; text-align:center; width:50%;">Disetujui Oleh<div style="height:16mm"></div>Bag. Purchasing</td>
        </tr></tbody>
      </table>`;
    try {
      await cetakLaporan('Form Permintaan Pembelian Bahan Baku', isi, {
        meta: [
          `Bagian/Sub bagian: ${header.bagian || '-'}`,
          `Nama: ${header.namaPemohon || '-'}  |  Jabatan: ${header.jabatan || '-'}`,
          `Tanggal Pengajuan: ${header.tanggalPengajuan || '-'}`,
          ...(header.periode.trim() ? [`Periode: ${header.periode.trim()}`] : []),
        ],
        label: 'permintaan pembelian',
        // Identitas formulir PPIC di kanan atas; tanggal terbit mengikuti tanggal surat.
        identitas: { kode: 'PPIC', nomor: '002', revisi: '00', terbit: tanggalTerbit(header.tanggalPengajuan || todayIso()) },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mencetak permintaan pembelian.');
    }
  };

  const handleSubmit = async () => {
    if (submitting.current) return;
    const { bagian, namaPemohon, jabatan, tanggalPengajuan, periode } = header;
    if (!bagian || !namaPemohon || !jabatan || !tanggalPengajuan) {
      setError("Lengkapi bagian, nama, jabatan, dan tanggal pengajuan.");
      return;
    }
    const filled = tableData.filter(barisTerisi); // UBAH
    if (filled.length === 0 || filled.some((row) => kolomWajib(row).some((v) => !v) || Number(row.qty) < 1)) { // UBAH
      setError("Lengkapi semua kolom di setiap baris barang yang dipakai (QTY minimal 1).");
      return;
    }
    submitting.current = true;
    setSaving(true);
    setError("");
    setRowErrors({});
    try {
      const payload = {
        bagian,
        namaPemohon,
        jabatan,
        tanggalPengajuan,
        periode: periode.trim() || undefined,
        items: filled.map((row) => ({
          ...(row.itemId !== undefined ? { itemId: row.itemId } : {}),
          namaBarang: row.namaBarang.trim(),
          satuan: row.satuan.trim(),
          proyek: row.proyek.trim(),
          noSpk: row.noSpk.trim() || undefined,
          supplier: row.supplier.trim() || undefined,
          keterangan: row.keterangan.trim() || undefined,
          tanggal: row.tanggal || undefined,
          deadlineTanggal: row.dikirimTanggal || undefined,
          qty: Number(row.qty),
        })),
        ...(permintaan?.catatan ? { notes: permintaan.catatan } : {}),
      };
      if (permintaan && editing) await editPurchaseRequest(permintaan.id, payload);
      else if (permintaan) await resubmitApproval(permintaan.id, payload);
      else await createPurchaseRequest(payload);
      router.push(basePath);
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        // The API indexes errors by the submitted (filled) rows; map them back to table rows.
        const filledIndexes = tableData.flatMap((row, i) => (barisTerisi(row) ? [i] : [])); // UBAH
        const mapped: Record<number, string> = {};
        for (const [key, msgs] of Object.entries(err.errors)) {
          const m = /^items\.(\d+)\./.exec(key);
          if (m) mapped[filledIndexes[Number(m[1])]] = msgs[0];
        }
        setRowErrors(mapped);
      }
      setError(err instanceof ApiError ? err.message : "Gagal mengirim permintaan pembelian.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  useEffect(() => {
    const tutupDropdown = (e: MouseEvent) => {
      const target = e.target as Node;

      const klikInput = Object.values(
        inputBarangRefs.current
      ).some((input) => input?.contains(target));

      const klikDropdown = document
        .getElementById('dropdown-autocomplete-barang')
        ?.contains(target);

      if (!klikInput && !klikDropdown) {
        setBarisAktif(null);
      }
    };

    document.addEventListener('mousedown', tutupDropdown);

    return () => {
      document.removeEventListener('mousedown', tutupDropdown);
    };
  }, []);

  if (!canCreate) return <NoPermission action="mengajukan permintaan pembelian" />;

  return (
    <div className="flex flex-col min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-800 hover:opacity-70 transition-opacity">
          <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
        </button>
        <h1 className="text-[18px] font-extrabold text-black tracking-wide">
          {editing ? 'Edit Permintaan Pembelian' : permintaan ? 'Perbaiki Permintaan Pembelian' : 'Ajukan Permintaan Pembelian'}
        </h1>
      </div>

      <div className="w-full">
        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 px-8 py-10 w-full mb-6 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-orange-400 to-amber-300 rounded-t-xl"></div>

          <div className="text-center mb-10 w-full">
            <h2 className="text-[18px] font-bold text-gray-900 tracking-wide">FORM PERMINTAAN PEMBELIAN BAHAN BAKU</h2>
          </div>

          {/* Form Inputs Header shrinked left align */}
          <div className="flex flex-col gap-5 mb-10 w-full max-w-lg">
            <div className="flex items-center">
              <span className="w-45 text-[15px] font-semibold text-gray-700">Bagian/Sub bagian</span>
              <span className="w-8 text-center text-gray-700 font-semibold">:</span>
              <select aria-label="Bagian / Sub Bagian" value={header.bagian} onChange={(e) => setHeader({ ...header, bagian: e.target.value })} className="flex-1 border border-gray-200 bg-gray-50/50 rounded-lg py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white text-gray-800 placeholder-gray-400 transition-all duration-200">
                <option value="">Pilih bagian / sub bagian</option>
                {header.bagian && !PILIHAN_PEMOHON_PEMBELIAN.bagian.includes(header.bagian) && <option value={header.bagian}>{header.bagian}</option>}
                {PILIHAN_PEMOHON_PEMBELIAN.bagian.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <div className="flex items-center">
              <span className="w-45 text-[15px] font-semibold text-gray-700">Nama</span>
              <span className="w-8 text-center text-gray-700 font-semibold">:</span>
              <select aria-label="Nama pemohon" value={header.namaPemohon} onChange={(e) => setHeader({ ...header, namaPemohon: e.target.value })} className="flex-1 border border-gray-200 bg-gray-50/50 rounded-lg py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white text-gray-800 placeholder-gray-400 transition-all duration-200">
                <option value="">Pilih nama</option>
                {header.namaPemohon && !PILIHAN_PEMOHON_PEMBELIAN.namaPemohon.includes(header.namaPemohon) && <option value={header.namaPemohon}>{header.namaPemohon}</option>}
                {PILIHAN_PEMOHON_PEMBELIAN.namaPemohon.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <div className="flex items-center">
              <span className="w-45 text-[15px] font-semibold text-gray-700">Jabatan</span>
              <span className="w-8 text-center text-gray-700 font-semibold">:</span>
              <select aria-label="Jabatan" value={header.jabatan} onChange={(e) => setHeader({ ...header, jabatan: e.target.value })} className="flex-1 border border-gray-200 bg-gray-50/50 rounded-lg py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white text-gray-800 placeholder-gray-400 transition-all duration-200">
                <option value="">Pilih jabatan</option>
                {header.jabatan && !PILIHAN_PEMOHON_PEMBELIAN.jabatan.includes(header.jabatan) && <option value={header.jabatan}>{header.jabatan}</option>}
                {PILIHAN_PEMOHON_PEMBELIAN.jabatan.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <div className="flex items-center">
              <span className="w-45 text-[15px] font-semibold text-gray-700">Tanggal Pengajuan</span>
              <span className="w-8 text-center text-gray-700 font-semibold">:</span>
              <input aria-label="Tanggal Pengajuan" type="date" placeholder="DD/MM/YYYY" value={header.tanggalPengajuan} onChange={(e) => setHeader({ ...header, tanggalPengajuan: e.target.value })} className="flex-1 border border-gray-200 bg-gray-50/50 rounded-lg py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white text-gray-800 placeholder-gray-400 transition-all duration-200" />
            </div>
          </div>
          {editing && <p className="mb-4 text-sm text-gray-500">Perubahan akan mengulang proses persetujuan permintaan.</p>}
          {/* Divider Custom */}
          <div className="w-full h-px bg-gray-200 mb-8 mt-2"></div>

          <RekomendasiStokMinimum existingItemIds={itemIdsTerpilih} onAdd={tambahDariRekomendasi} />

          <div className="mb-4 text-left">
            <h3 className="text-[16px] font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-6 bg-[#FF8A00] rounded-full"></span>
              Rincian Daftar Barang
            </h3>
          </div>

          {/* Table List Data */}
          <div className="overflow-hidden w-full border border-gray-200/80 rounded-xl shadow-sm">
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-275 table-fixed text-left text-sm border-collapse">
                <colgroup>
                  {[4, 12, 13, 24, 6, 6, 13, 11, 11].map((width, i) => <col key={i} style={{ width: `${width}%` }} />)}
                </colgroup>
                <thead className="bg-gray-50 text-gray-700 text-xs font-bold">
                  <tr>
                    {['No', 'Tanggal', 'Supplier', 'Nama Barang', 'QTY', 'SAT', 'Proyek', 'Keterangan', 'Dikirim Tanggal'].map((label) => (
                      <th key={label} className="border border-gray-300 px-2 py-3 text-center">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-gray-800">
                  {tableData.map((row, i) => (
                    <tr key={i} className="group bg-white hover:bg-orange-50/20 transition-colors duration-150">
                      <td className="relative p-0 text-center text-gray-700 h-11 border border-gray-300">
                        <span className="group-hover:opacity-0 group-focus-within:opacity-0">{i + 1}</span>
                        <button type="button" aria-label={`Hapus baris ${i + 1}`} title="Hapus baris" onClick={() => patchRow(i, { ...emptyRow })} className="absolute inset-0 flex items-center justify-center text-red-500 opacity-0 hover:bg-red-50 group-hover:opacity-100 focus:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                      </td>

                      <td className="p-0 border border-gray-300"><input aria-label={`Tanggal baris ${i + 1}`} type="date" value={row.tanggal} onChange={(e) => handleChange(i, 'tanggal', e.target.value)} className="w-full min-w-0 bg-transparent px-1 py-2.5 text-xs focus:outline-orange-400" /></td>
                      <td className="p-0 border border-gray-300"><input aria-label={`Supplier baris ${i + 1}`} value={row.supplier} readOnly tabIndex={-1} placeholder="Dari master barang" className="w-full min-w-0 cursor-default bg-gray-50/60 px-2 py-2.5 text-gray-600 focus:outline-none" /></td>
                      <td className="p-0 border border-gray-300">
                        <div className="w-full">
                          <input
                            ref={(el) => {
                              inputBarangRefs.current[i] = el;
                            }}
                            aria-label={`Nama Barang baris ${i + 1}`}
                            type="text"
                            value={row.namaBarang}
                            maxLength={191}
                            placeholder="Ketik nama barang..."
                            autoComplete="off"
                            onFocus={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();

                              setPosisiDropdown({
                                top: rect.bottom + 4,
                                left: rect.left,
                                width: Math.max(rect.width, 280),
                              });

                              setBarisAktif(i);
                              searchItems(row.namaBarang);
                            }}
                            onChange={(e) => {
                              const keyword = e.target.value;

                              // Nama barang berubah: satuan dan supplier ikut dikosongkan (lihat handleChange).
                              handleChange(i, 'namaBarang', keyword);

                              const rect = e.currentTarget.getBoundingClientRect();

                              setPosisiDropdown({
                                top: rect.bottom + 4,
                                left: rect.left,
                                width: Math.max(rect.width, 280),
                              });

                              setBarisAktif(i);
                              searchItems(keyword);
                            }}
                            className="w-full h-full min-h-11 px-2 text-left bg-transparent focus:outline-none focus:ring-1 focus:ring-inset focus:ring-orange-500/50 placeholder-gray-300 not-italic"
                          />

                          {barisAktif === i &&
                            typeof document !== 'undefined' &&
                            createPortal(
                              <div
                                id="dropdown-autocomplete-barang"
                                style={{
                                  position: 'fixed',
                                  top: posisiDropdown.top,
                                  left: posisiDropdown.left,
                                  width: posisiDropdown.width,
                                  zIndex: 99999,
                                }}
                                className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl"
                              >
                                {dataBarang.length > 0 ? (
                                  dataBarang.map((item) => (
                                    <div
                                      key={item.code ?? item.name}
                                      role="button"
                                      tabIndex={0}
                                      onMouseDown={(e) => {
                                        e.preventDefault();

                                        patchRow(i, { itemId: item.id, namaBarang: item.name, satuan: item.unit ?? '', supplier: item.supplierName ?? '' });

                                        setBarisAktif(null);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          patchRow(i, { itemId: item.id, namaBarang: item.name, satuan: item.unit ?? '', supplier: item.supplierName ?? '' });

                                          setBarisAktif(null);
                                        }
                                      }}
                                      className="block w-full px-3 py-2 text-left hover:bg-orange-50 cursor-pointer"
                                    >
                                      <p className="text-sm font-medium text-gray-900">
                                        {item.name}
                                      </p>

                                      <p className="text-xs text-gray-500">
                                        {item.code} · {item.unit}
                                      </p>
                                    </div>
                                  ))
                                ) : (
                                  <p className="px-3 py-3 text-sm text-gray-500">
                                    Barang tidak ditemukan.
                                  </p>
                                )}
                              </div>,
                              document.body
                            )}
                        </div>
                      </td>
                      <td className="p-0 border border-gray-300">
                        <input aria-label={`QTY baris ${i + 1}`} {...INTEGER_INPUT} maxLength={9} value={row.qty} placeholder="0" onChange={(e) => handleChange(i, 'qty', digitsOnly(e.target.value))} className="w-full h-full min-h-11 px-1 text-center bg-transparent focus:outline-none focus:ring-1 focus:ring-inset focus:ring-orange-500/50 placeholder-gray-300 not-italic [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      </td>
                      <td className="p-0 border border-gray-300">
                        <input aria-label={`Satuan baris ${i + 1}`} type="text" value={row.satuan} maxLength={50} placeholder="SAT" onChange={(e) => handleChange(i, 'satuan', e.target.value)} className="w-full h-full min-h-11 px-1 text-center bg-transparent focus:outline-none focus:ring-1 focus:ring-inset focus:ring-orange-500/50 placeholder-gray-300 not-italic" />
                      </td>
                      <td className="p-0 border border-gray-300">
                        <SearchableSelect
                          aria-label={`Proyek baris ${i + 1}`}
                          value={row.proyek}
                          onChange={(value) => patchRow(i, { proyek: value, ...(value !== row.proyek ? { noSpk: '' } : {}) })}
                          options={row.proyek && !pilihanProyek.some((option) => option.value === row.proyek) ? [{ value: row.proyek, label: row.proyek }, ...pilihanProyek] : pilihanProyek}
                          placeholder="Pilih proyek"
                          pending={proyekLoading}
                          emptyText={proyekError || 'Belum ada proyek tersedia.'}
                          className="w-full min-w-0 bg-transparent px-2 py-2.5 focus:outline-orange-400"
                        />
                      </td>
                      <td className="p-0 border border-gray-300"><input aria-label={`Keterangan baris ${i + 1}`} type="text" value={row.keterangan} maxLength={500} onChange={(e) => handleChange(i, 'keterangan', e.target.value)} className="w-full min-w-0 bg-transparent px-2 py-2.5 focus:outline-orange-400" /></td>
                      <td className="p-0 border border-gray-300"><input aria-label={`Dikirim Tanggal baris ${i + 1}`} type="date" value={row.dikirimTanggal} onChange={(e) => handleChange(i, 'dikirimTanggal', e.target.value)} className="w-full min-w-0 bg-transparent px-2 py-2.5 focus:outline-orange-400" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <button type="button" onClick={() => setTableData((rows) => [...rows, { ...emptyRow }])} className="mb-6 text-sm font-semibold text-orange-600">+ Tambah Baris</button>
        <div className="grid grid-cols-2 gap-8 mb-8 text-center text-sm text-gray-600">
          <div>Dibuat<p className="mt-12 font-semibold">Kepala Gudang</p></div>
          <div>Disetujui Oleh<p className="mt-12 font-semibold">Bag. Purchasing</p></div>
        </div>
        {/* Submit Action */}
        {proyekError && <p role="alert" className="text-sm text-red-500 text-right mb-3">{proyekError}</p>}
        {(error || itemError) && <p className="text-sm text-red-500 text-right mb-3">{error || itemError}</p>}
        {Object.entries(rowErrors).map(([i, msg]) => <p key={i} className="text-sm text-red-500 text-right mb-1">Baris {Number(i) + 1}: {msg}</p>)}
        <div className="flex justify-end w-full gap-3">
          <button type="button" onClick={() => void handleCetak()} className="px-6 py-2.5 border border-[#ff8a00] text-[#ff8a00] rounded-lg hover:bg-orange-50 transition-colors font-semibold text-[14px]">Cetak</button>
          <button onClick={handleSubmit} disabled={saving} className="disabled:opacity-60 px-8 py-2.5 bg-[#ff8a00] text-white rounded-lg hover:bg-[#eb7d00] transition-all duration-200 font-semibold text-[14px] shadow-sm hover:shadow-md hover:-translate-y-0.5">
            {saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : permintaan ? 'Kirim Ulang' : 'Ajukan Permintaan Pembelian'}
          </button>
        </div>
      </div>
    </div>
  );
}
