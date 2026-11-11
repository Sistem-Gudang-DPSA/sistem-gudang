"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCan } from '@/domains/auth/user-context';
import NoPermission from './NoPermission';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createPurchaseRequest, editPurchaseRequest, resubmitApproval } from '@/domains/ppic/api';
import { permintaan_pembelian_path, type PermintaanPembelian } from '@/domains/ppic/data/pembelian';
import { todayIso } from '@/domains/inventory/date';
import { ApiError } from '@/shared/lib/api-client';
import { INTEGER_INPUT, digitsOnly } from '@/shared/lib/input';
import { useItemSearch } from '@/domains/inventory/use-item-search';

const emptyRow = { itemId: undefined as number | undefined, tanggal: "", supplier: "", keterangan: "", deadlineTanggal: "", namaBarang: "", qty: "", satuan: "", proyek: "", client: "", noSpk: "" };
type Row = typeof emptyRow;

const kolomWajib = (r: Row) => [r.namaBarang, r.qty, r.satuan, r.proyek];
const barisTerisi = (r: Row) => [r.namaBarang, r.qty, r.satuan, r.proyek, r.tanggal, r.supplier, r.keterangan, r.deadlineTanggal].some(Boolean);

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
    const rows = (permintaan?.barang ?? []).map((b) => ({ ...emptyRow, ...b, noSpk: b.noSpk ?? "", supplier: b.supplier ?? "", keterangan: b.keterangan ?? "", tanggal: b.tanggal ?? "", deadlineTanggal: b.deadlineTanggal ?? "", qty: String(b.qty) }));
    return [...rows, ...Array.from({ length: Math.max(8 - rows.length, 0) }, () => ({ ...emptyRow }))];
  });
  const submitting = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Server errors per row, keyed by the row index in tableData.
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const { items: dataBarang, onSearch: searchItems, error: itemError } = useItemSearch();

  const handleChange = (index: number, field: keyof Row, value: string) => {
    setTableData((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value, ...(field === 'namaBarang' ? { itemId: undefined } : {}) } : row)));
  };

  const patchRow = (index: number, patch: Partial<Row>) =>
    setTableData((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

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
          deadlineTanggal: row.deadlineTanggal || undefined,
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
              <input aria-label="Bagian / Sub Bagian" type="text"  value={header.bagian} maxLength={100} onChange={(e) => setHeader({ ...header, bagian: e.target.value })} className="flex-1 border border-gray-200 bg-gray-50/50 rounded-lg py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white text-gray-800 placeholder-gray-400 transition-all duration-200" />
            </div>
            <div className="flex items-center">
              <span className="w-45 text-[15px] font-semibold text-gray-700">Nama</span>
              <span className="w-8 text-center text-gray-700 font-semibold">:</span>
              <input aria-label="Nama pemohon" type="text"  value={header.namaPemohon} maxLength={191} onChange={(e) => setHeader({ ...header, namaPemohon: e.target.value })} className="flex-1 border border-gray-200 bg-gray-50/50 rounded-lg py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white text-gray-800 placeholder-gray-400 transition-all duration-200" />
            </div>
            <div className="flex items-center">
              <span className="w-45 text-[15px] font-semibold text-gray-700">Jabatan</span>
              <span className="w-8 text-center text-gray-700 font-semibold">:</span>
              <input aria-label="Jabatan" type="text"  value={header.jabatan} maxLength={100} onChange={(e) => setHeader({ ...header, jabatan: e.target.value })} className="flex-1 border border-gray-200 bg-gray-50/50 rounded-lg py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white text-gray-800 placeholder-gray-400 transition-all duration-200" />
            </div>
            <div className="flex items-center">
              <span className="w-45 text-[15px] font-semibold text-gray-700">Tanggal Pengajuan</span>
              <span className="w-8 text-center text-gray-700 font-semibold">:</span>
              <input aria-label="Tanggal Pengajuan" type="date" placeholder="DD/MM/YYYY" value={header.tanggalPengajuan} onChange={(e) => setHeader({ ...header, tanggalPengajuan: e.target.value })} className="flex-1 border border-gray-200 bg-gray-50/50 rounded-lg py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white text-gray-800 placeholder-gray-400 transition-all duration-200" />
            </div>
          </div>

          <label className="flex items-center gap-4 mb-6 text-sm font-semibold text-gray-700">Periode
            <input aria-label="Periode" value={header.periode} maxLength={100} onChange={(e) => setHeader({ ...header, periode: e.target.value })} placeholder="Contoh: November 2026" className="border border-gray-200 rounded-lg py-2 px-4 font-normal" />
          </label>
          {editing && <p className="mb-4 text-sm text-gray-500">Perubahan akan mengulang proses persetujuan permintaan.</p>}
          {/* Divider Custom */}
          <div className="w-full h-px bg-gray-200 mb-8 mt-2"></div>

          <div className="mb-4 text-left">
            <h3 className="text-[16px] font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-6 bg-[#FF8A00] rounded-full"></span>
              Rincian Daftar Barang
            </h3>
          </div>

          {/* Table List Data */}
          <div className="overflow-hidden w-full border border-gray-200/80 rounded-xl shadow-sm">
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[1100px] table-fixed text-left text-sm border-collapse">
                <colgroup>
                  {[4, 12, 13, 24, 6, 6, 13, 11, 11].map((width, i) => <col key={i} style={{ width: `${width}%` }} />)}
                </colgroup>
                <thead className="bg-gray-50 text-gray-700 text-xs font-bold">
                  <tr>
                    {['No', 'Tanggal', 'Supplier', 'Nama Barang', 'QTY', 'SAT', 'Proyek', 'Keterangan', 'Deadline Tanggal'].map((label) => (
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
                      <td className="p-0 border border-gray-300"><input aria-label={`Supplier baris ${i + 1}`} value={row.supplier} maxLength={191} onChange={(e) => handleChange(i, 'supplier', e.target.value)} placeholder="Nama supplier" className="w-full min-w-0 bg-transparent px-2 py-2.5 focus:outline-orange-400" /></td>
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

                              handleChange(i, 'namaBarang', keyword);

                              // Kosongkan satuan ketika nama barang diubah.
                              handleChange(i, 'satuan', '');

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

                                        patchRow(i, { itemId: item.id, namaBarang: item.name, satuan: item.unit ?? '' });

                                        setBarisAktif(null);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          patchRow(i, { itemId: item.id, namaBarang: item.name, satuan: item.unit ?? '' });

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
                      {(['proyek', 'keterangan', 'deadlineTanggal'] as const).map((field) => (
                        <td key={field} className="p-0 border border-gray-300"><input aria-label={`${field === 'deadlineTanggal' ? 'Deadline' : field === 'proyek' ? 'Proyek' : 'Keterangan'} baris ${i + 1}`} type={field === 'deadlineTanggal' ? 'date' : 'text'} value={row[field]} maxLength={field === 'keterangan' ? 500 : 191} onChange={(e) => handleChange(i, field, e.target.value)} className="w-full min-w-0 bg-transparent px-2 py-2.5 focus:outline-orange-400" /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <button type="button" onClick={() => setTableData((rows) => [...rows, { ...emptyRow }])} className="mb-6 text-sm font-semibold text-orange-600">+ Tambah Baris</button>
        <div className="grid grid-cols-2 gap-8 mb-8 text-center text-sm text-gray-600">
          <div>Dibuat<p className="mt-12 font-semibold">{header.namaPemohon || 'Nama pemohon'}</p></div>
          <div>Disetujui Oleh<p className="mt-12 text-xs">Mengikuti proses persetujuan sistem</p></div>
        </div>
        {/* Submit Action */}
        {(error || itemError) && <p className="text-sm text-red-500 text-right mb-3">{error || itemError}</p>}
        {Object.entries(rowErrors).map(([i, msg]) => <p key={i} className="text-sm text-red-500 text-right mb-1">Baris {Number(i) + 1}: {msg}</p>)}
        <div className="flex justify-end w-full">
          <button onClick={handleSubmit} disabled={saving} className="disabled:opacity-60 px-8 py-2.5 bg-[#ff8a00] text-white rounded-lg hover:bg-[#eb7d00] transition-all duration-200 font-semibold text-[14px] shadow-sm hover:shadow-md hover:-translate-y-0.5">
            {saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : permintaan ? 'Kirim Ulang' : 'Ajukan Permintaan Pembelian'}
          </button>
        </div>
      </div>
    </div>
  );
}
