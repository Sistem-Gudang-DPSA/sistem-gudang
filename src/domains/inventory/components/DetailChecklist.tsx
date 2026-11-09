"use client";

import React, { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, X } from "lucide-react";
import { getChecklistDokubah, saveChecklistDokubah } from "@/domains/inventory/api";
import type { ChecklistDokubahDetail } from "@/domains/inventory/types";
import { ApiError } from "@/shared/lib/api-client";
import { useApiData } from "@/shared/lib/use-api-data";

type DataRealisasi = {
  tanggal: string;
  pengambil: string;
  jumlah: string;
};

type BarisMaterial = {
  material: string;
  dokubah: string;
  realisasi: Record<string, DataRealisasi>;
  selisih: string;
  keterangan: string;
};

const barisKosong = (): BarisMaterial => ({ material: "", dokubah: "", realisasi: {}, selisih: "", keterangan: "" });
const JUMLAH_BARIS_AWAL = 5;
const JUMLAH_REALISASI_AWAL = 3;

// Input kosong atau bukan angka dihitung 0
const toNumber = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const formatJumlah = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 2 });

const fieldClass = "w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors";
const subInputClass = "w-full px-2 py-1.5 bg-white border border-gray-300 rounded-md text-[11px] font-normal text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors";
const cellClass = "border-b border-r border-gray-300";
const headCellClass = `${cellClass} px-3 py-3 text-center font-bold text-gray-900`;
const cellInputClass = "w-full px-2 py-2 bg-transparent border-0 text-xs text-gray-800 focus:outline-none focus:bg-orange-50/40 focus:ring-1 focus:ring-orange-500/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
const orangeButtonClass = "min-w-24 px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm text-center";
const textButtonClass = "inline-flex items-center gap-1 text-xs font-semibold text-[#FF8A00] hover:underline";

function Field({ id, label, colon = false, labelClass = "w-32 text-left", children }: {
  id: string;
  label: string;
  colon?: boolean;
  labelClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className={`${labelClass} shrink-0 text-xs font-medium text-gray-800`}>
        {label}{colon ? " :" : ""}
      </label>
      <div className="w-56 max-w-full">{children}</div>
    </div>
  );
}

function DateInput({ id, value, onChange, placeholder, min, className = fieldClass, ariaLabel }: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  min?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      id={id}
      type={focused || value ? "date" : "text"}
      value={value}
      min={min}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={className}
    />
  );
}

const numStr = (n: number) => String(n);

// Prefill form dari data API: realisasi array per baris -> Record<kolomId, DataRealisasi>
function toForm(detail: ChecklistDokubahDetail) {
  const { dokubah, checklist: cl } = detail;
  const kolom = Array.from({ length: Math.max(JUMLAH_REALISASI_AWAL, cl?.kolomRealisasi ?? 0) }, (_, i) => ({ id: `r${i + 1}` }));
  const baris: BarisMaterial[] = (cl?.lines ?? []).map((l) => ({
    material: l.material,
    dokubah: l.dokubah,
    realisasi: Object.fromEntries(
      l.realisasi.map((r, i) => [`r${i + 1}`, { tanggal: r.tanggal ?? "", pengambil: r.pengambil, jumlah: numStr(r.jumlah) }]),
    ),
    selisih: l.selisih ?? "",
    keterangan: l.keterangan ?? "",
  }));
  while (baris.length < JUMLAH_BARIS_AWAL) baris.push(barisKosong());
  return {
    kepalaGroup: cl?.kepalaGroup ?? "",
    item: dokubah.namaItem,
    client: dokubah.namaClient,
    noSpk: dokubah.noSpk,
    tglMulai: cl?.tglMulai ?? "",
    tglSelesai: cl?.tglSelesai ?? "",
    kolom,
    baris,
  };
}

export default function ChecklistDokubahDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: detail, loading, error } = useApiData(
    () => getChecklistDokubah(Number(id)),
    id,
    "Gagal memuat checklist Dokubah.",
  );

  if (!detail) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        <div className="flex items-center gap-3 mb-6">
          <button type="button" onClick={() => router.back()} className="text-gray-800 hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-10 text-center text-gray-400 italic">
          {loading ? "Memuat..." : error || "Checklist Dokubah tidak ditemukan."}
        </div>
      </div>
    );
  }
  return <ChecklistForm detail={detail} />;
}

function ChecklistForm({ detail }: { detail: ChecklistDokubahDetail }) {
  const router = useRouter();
  const [form, setForm] = useState(() => toForm(detail));
  const [saving, setSaving] = useState(false);
  const nextKolomId = useRef(form.kolom.length + 1);
  const [formError, setFormError] = useState("");

  const header = (
    <div className="flex items-center gap-3 mb-6">
      <button type="button" onClick={() => router.back()} className="text-gray-800 hover:opacity-70 transition-opacity">
        <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
      </button>
    </div>
  );

  const setField = (field: "kepalaGroup" | "item" | "client" | "noSpk" | "tglMulai" | "tglSelesai") =>
    (value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const updateBaris = (index: number, field: "material" | "dokubah" | "selisih" | "keterangan", value: string) =>
    setForm((prev) => ({
      ...prev,
      baris: prev.baris.map((b, i) => (i === index ? { ...b, [field]: value } : b)),
    }));

  const updateRealisasi = (index: number, kolomId: string, field: keyof DataRealisasi, value: string) =>
    setForm((prev) => ({
      ...prev,
      baris: prev.baris.map((b, i) => {
        if (i !== index) return b;
        const selRealisasi = b.realisasi[kolomId] || { tanggal: "", pengambil: "", jumlah: "" };
        return {
          ...b,
          realisasi: { ...b.realisasi, [kolomId]: { ...selRealisasi, [field]: value } }
        };
      }),
    }));

  const tambahBaris = () => setForm((prev) => ({ ...prev, baris: [...prev.baris, barisKosong()] }));

  const tambahKolom = () => {
    const kolomId = `r${nextKolomId.current++}`;
    setForm((prev) => ({ ...prev, kolom: [...prev.kolom, { id: kolomId }] }));
  };

  const hapusKolom = (kolomId: string) =>
    setForm((prev) => ({
      ...prev,
      kolom: prev.kolom.filter((k) => k.id !== kolomId),
      baris: prev.baris.map((b) => {
        const sisa = { ...b.realisasi };
        delete sisa[kolomId];
        return { ...b, realisasi: sisa };
      }),
    }));

  const totalBaris = (b: BarisMaterial) =>
    form.kolom.reduce((sum, k) => sum + toNumber(b.realisasi[k.id]?.jumlah ?? ""), 0);

  const handleSimpan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;
    if (form.tglMulai && form.tglSelesai && form.tglSelesai < form.tglMulai) {
      setFormError("Tgl Selesai Produksi tidak boleh lebih awal dari Tgl Mulai Produksi.");
      return;
    }
    setFormError("");
    setSaving(true);
    try {
      await saveChecklistDokubah(detail.dokubah.id, {
        kepalaGroup: form.kepalaGroup.trim() || null,
        tglMulai: form.tglMulai || null,
        tglSelesai: form.tglSelesai || null,
        kolomRealisasi: form.kolom.length,
        lines: form.baris.map((b) => ({
          material: b.material.trim(),
          dokubah: b.dokubah.trim(),
          selisih: b.selisih.trim() || null,
          realisasi: form.kolom.map((k) => {
            const r = b.realisasi[k.id];
            return { tanggal: r?.tanggal || null, pengambil: r?.pengambil.trim() ?? "", jumlah: toNumber(r?.jumlah ?? "") };
          }),
          keterangan: b.keterangan.trim() || null,
        })),
      });
      router.back();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Gagal menyimpan checklist Dokubah.");
      setSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {header}

      <form onSubmit={handleSimpan} noValidate className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-sm font-bold text-gray-900 text-center mb-8">Checklist Dokubah</h1>

        {/* Info pekerjaan */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-3 max-w-4xl mx-auto items-start">
          <div className="flex flex-col gap-3">
            <Field id="cl-kepala" label="Kepala Group Tukang">
              <input id="cl-kepala" type="text" value={form.kepalaGroup} onChange={(e) => setField("kepalaGroup")(e.target.value)} className={fieldClass} />
            </Field>
            <Field id="cl-item" label="Item/Proyek">
              <input id="cl-item" type="text" value={form.item} onChange={(e) => setField("item")(e.target.value)} className={fieldClass} />
            </Field>
            <Field id="cl-client" label="Nama Client">
              <input id="cl-client" type="text" value={form.client} onChange={(e) => setField("client")(e.target.value)} className={fieldClass} />
            </Field>
            <Field id="cl-spk" label="No. SPK">
              <input id="cl-spk" type="text" value={form.noSpk} onChange={(e) => setField("noSpk")(e.target.value)} className={fieldClass} />
            </Field>
          </div>
          <div className="flex flex-col gap-3">
            <Field id="cl-mulai" label="Tgl Mulai Produksi" colon labelClass="w-36 text-right">
              <DateInput id="cl-mulai" value={form.tglMulai} onChange={setField("tglMulai")} placeholder="Isi tanggal" />
            </Field>
            <Field id="cl-selesai" label="Tgl Selesai Produksi" colon labelClass="w-36 text-right">
              <DateInput id="cl-selesai" value={form.tglSelesai} onChange={setField("tglSelesai")} placeholder="Isi tanggal" min={form.tglMulai || undefined} />
            </Field>
          </div>
        </div>

        
        {/* Tabel material */}
        <div className="overflow-x-auto mt-6">
          <div className="border-t border-l border-gray-300 rounded-sm w-max min-w-full">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="text-xs">
                <tr>
                  <th scope="col" className={`${headCellClass} w-12`}>No</th>
                  <th scope="col" className={`${headCellClass} min-w-48`}>Material</th>
                  <th scope="col" className={`${headCellClass} min-w-28`}>Dokubah</th>
                  <th scope="colgroup" colSpan={form.kolom.length} className={`${headCellClass} min-w-[400px]`}>
                    <div className="flex items-center justify-center gap-2">
                      Realisasi
                      <button type="button" onClick={tambahKolom} title="Tambah Kolom Realisasi" className="p-1 bg-orange-100 text-orange-600 rounded-full hover:bg-orange-200">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                  <th scope="col" className={`${headCellClass} min-w-24`}>Sisa</th>
                  <th scope="col" className={`${headCellClass} min-w-24`}>Selisih</th>
                  <th scope="col" className={`${headCellClass} min-w-24`}>Total</th>
                  <th scope="col" className={`${headCellClass} min-w-40`}>Keterangan</th>
                </tr>
              </thead>
              <tbody className="text-gray-800">
                {form.baris.map((b, i) => {
                  const total = totalBaris(b);
                  const sisa = toNumber(b.dokubah) - total;
                  const kosong = b.dokubah === "" && total === 0;
                  
                  return (
                    <tr key={i}>
                      <td className={`${cellClass} px-2 text-center text-xs align-top pt-3`}>{i + 1}.</td>
                      <td className={`${cellClass} align-top`}>
                        <input type="text" value={b.material} onChange={(e) => updateBaris(i, "material", e.target.value)} className={`${cellInputClass} h-full min-h-[80px]`} />
                      </td>
                      <td className={`${cellClass} align-top`}>
                        <input type="number" min={0} step="any" value={b.dokubah} onChange={(e) => updateBaris(i, "dokubah", e.target.value)} className={`${cellInputClass} text-right`} />
                      </td>
                      
                      {/* Sel Realisasi yang berulang (Tampil di setiap baris) */}
                      {form.kolom.map((k) => (
                        <td key={k.id} className={`${cellClass} p-2 align-top min-w-40 bg-gray-50/20 relative group`}>
                           {/* Tombol hapus kolom khusus di baris pertama saja agar tidak menumpuk */}
                           {i === 0 && form.kolom.length > 1 && (
                            <button type="button" onClick={() => hapusKolom(k.id)} className="absolute -top-3 -right-2 bg-white border border-red-200 text-red-500 rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10" title="Hapus kolom ini">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                          <div className="flex flex-col gap-1.5">
                            <DateInput
                              value={b.realisasi[k.id]?.tanggal ?? ""}
                              onChange={(val) => updateRealisasi(i, k.id, "tanggal", val)}
                              placeholder="Tanggal"
                              className={subInputClass}
                            />
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={b.realisasi[k.id]?.pengambil ?? ""}
                                onChange={(e) => updateRealisasi(i, k.id, "pengambil", e.target.value)}
                                placeholder="Pengambil"
                                className={subInputClass}
                              />
                            </div>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={b.realisasi[k.id]?.jumlah ?? ""}
                              onChange={(e) => updateRealisasi(i, k.id, "jumlah", e.target.value)}
                              placeholder="Jml"
                              className={`${subInputClass} text-right font-medium text-orange-700 bg-orange-50 border-orange-200`}
                            />
                          </div>
                        </td>
                      ))}

                      <td className={`${cellClass} px-2 text-right text-xs align-top pt-3 ${sisa < 0 ? "text-red-600 font-semibold" : ""}`}>
                        {kosong ? "" : formatJumlah(sisa)}
                      </td>
                      <td className={`${cellClass} align-top`}>
                        <input type="number" step="any" value={b.selisih} onChange={(e) => updateBaris(i, "selisih", e.target.value)} className={`${cellInputClass} text-right`} />
                      </td>
                      <td className={`${cellClass} px-2 text-right text-xs font-semibold align-top pt-3`}>
                        {total === 0 ? "" : formatJumlah(total)}
                      </td>
                      <td className={`${cellClass} align-top`}>
                        <input type="text" value={b.keterangan} onChange={(e) => updateBaris(i, "keterangan", e.target.value)} className={`${cellInputClass} h-full min-h-[80px]`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-3">
          <button type="button" onClick={tambahBaris} className={textButtonClass}>
            <Plus className="w-3 h-3" />
            Tambah baris
          </button>
        </div>

        {formError && (
          <p role="alert" className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{formError}</p>
        )}

        <div className="flex justify-end mt-10">
          <button type="submit" disabled={saving} className={orangeButtonClass}>Simpan</button>
        </div>
      </form>
    </div>
  );
}