"use client";

import { useState } from 'react';
import { importLocationData } from '../api';
import type { LocationDataImportRow } from './DataLokasi';

export const MAX_LOKASI = 2000;
const MAX_KOLOM_BARIS = 99;
// Inputs keep the raw text so they can be cleared while typing; an empty field is NaN (invalid).
const toNum = (v: string) => (v.trim() === '' ? NaN : Math.min(MAX_KOLOM_BARIS, Math.max(1, Math.trunc(Number(v)) || 1)));

// "A-C, F" -> raks ["A","B","C","F"]; parts that are not a letter or letter range are returned in `ignored`.
export function parseRaks(input: string): { raks: string[]; ignored: string[] } {
  const out: string[] = [];
  const ignored: string[] = [];
  for (const part of input.toUpperCase().split(',')) {
    const m = /^\s*([A-Z])\s*(?:-\s*([A-Z]))?\s*$/.exec(part);
    if (!m) {
      if (part.trim()) ignored.push(part.trim());
      continue;
    }
    const a = m[1].charCodeAt(0);
    const b = (m[2] ?? m[1]).charCodeAt(0);
    for (let c = Math.min(a, b); c <= Math.max(a, b); c++) out.push(String.fromCharCode(c));
  }
  return { raks: [...new Set(out)], ignored };
}

// Code is RAK.KOLOM.BARIS (e.g. "A.1.1"); rackNumber holds "KOLOM.BARIS".
export function generateLocations(raks: string[], kolom: [number, number], baris: [number, number], description?: string): LocationDataImportRow[] {
  const rows: LocationDataImportRow[] = [];
  for (const rak of raks)
    for (let k = kolom[0]; k <= kolom[1]; k++)
      for (let b = baris[0]; b <= baris[1]; b++)
        rows.push({ code: `${rak}.${k}.${b}`, NamaRak: rak, NomorRak: `${k}.${b}`, ...(description && { description }) });
  return rows;
}

const input = "w-full border border-gray-200 bg-gray-50/50 rounded-lg py-2.5 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white text-sm";

export default function BatchLokasiModal({ onClose, onSaved }: { onClose: () => void; onSaved: (notice: string) => void }) {
  const [raks, setRaks] = useState("");
  const [kolomRaw, setKolom] = useState<[string, string]>(["1", "1"]);
  const [barisRaw, setBaris] = useState<[string, string]>(["1", "1"]);
  const kolom = kolomRaw.map(toNum) as [number, number];
  const baris = barisRaw.map(toNum) as [number, number];
  const [keterangan, setKeterangan] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const valid = kolom[0] >= 1 && kolom[0] <= kolom[1] && baris[0] >= 1 && baris[0] <= baris[1];
  const { raks: rakList, ignored } = parseRaks(raks);
  const total = valid ? rakList.length * (kolom[1] - kolom[0] + 1) * (baris[1] - baris[0] + 1) : 0;
  const tooMany = total > MAX_LOKASI;
  const rows = valid && !tooMany ? generateLocations(rakList, kolom, baris, keterangan.trim() || undefined) : [];

  const simpan = async () => {
    if (rows.length === 0) return setError("Isi rak, kolom, dan baris dengan benar.");
    setSaving(true);
    setError("");
    try {
      const res = await importLocationData(rows);
      const dilewati = res.skipped.length > 0 ? `, ${res.skipped.length} dilewati karena kodenya sudah ada: ${res.skipped.map((s) => s.code).join(", ")}` : "";
      onSaved(`${res.created} lokasi ditambahkan${dilewati}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan lokasi.");
    } finally {
      setSaving(false);
    }
  };

  const range = (label: string, val: [string, string], set: (v: [string, string]) => void) => (
    <div className="flex-1">
      <span className="block text-sm font-semibold text-gray-700 mb-2">{label}</span>
      <div className="flex items-center gap-2">
        <input type="number" min={1} max={99} aria-label={`${label} dari`} className={input} value={val[0]} onChange={(e) => set([e.target.value, val[1]])} />
        <span className="text-gray-400 text-sm">s/d</span>
        <input type="number" min={1} max={99} aria-label={`${label} sampai`} className={input} value={val[1]} onChange={(e) => set([val[0], e.target.value])} />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-150 p-8 relative animate-in zoom-in-95 duration-200">
        <button onClick={onClose} aria-label="Tutup" className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700">×</button>
        <h2 className="text-[20px] font-extrabold text-gray-900 mb-6 tracking-wide">TAMBAH LOKASI BATCH</h2>

        <div className="mb-5">
          <label htmlFor="batch-rak" className="block text-sm font-semibold text-gray-700 mb-2">Rak</label>
          <input id="batch-rak" className={input} placeholder="Contoh: A-C atau F,G,H,I" value={raks} onChange={(e) => setRaks(e.target.value)} />
        </div>
        <div className="flex flex-col sm:flex-row gap-6 mb-5">
          {range("Kolom", kolomRaw, setKolom)}
          {range("Baris", barisRaw, setBaris)}
        </div>
        <div className="mb-5">
          <label htmlFor="batch-ket" className="block text-sm font-semibold text-gray-700 mb-2">Keterangan <span className="font-normal text-gray-400">(opsional, untuk semua)</span></label>
          <input id="batch-ket" maxLength={255} className={input} value={keterangan} onChange={(e) => setKeterangan(e.target.value)} />
        </div>

        {ignored.length > 0 && <p role="status" className="mb-2 text-sm text-amber-700">{ignored.join(", ")} diabaikan (bukan huruf atau rentang huruf).</p>}
        {tooMany && <p role="alert" className="mb-2 text-sm text-red-600">Terlalu banyak lokasi ({total.toLocaleString("id-ID")}). Maksimal {MAX_LOKASI.toLocaleString("id-ID")} sekali buat.</p>}
        <p className="text-sm font-semibold text-gray-700 mb-2">Preview ({rows.length} lokasi)</p>
        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto mb-4 p-2 border border-gray-100 rounded-lg min-h-10">
          {rows.map((r) => <span key={r.code} className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs font-medium">{r.code}</span>)}
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

        <div className="flex justify-end pt-2 border-t border-gray-50">
          <button onClick={simpan} disabled={saving || rows.length === 0} className="px-8 py-2.5 bg-[#ff8a00] text-white rounded-lg shadow-sm hover:bg-[#f08000] font-semibold text-sm disabled:opacity-60">
            {saving ? "Menyimpan..." : `Simpan ${rows.length} lokasi`}
          </button>
        </div>
      </div>
    </div>
  );
}
