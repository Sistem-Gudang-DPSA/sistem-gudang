'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { importItems } from '@/domains/inventory/api';
import type { MasterDataImportRow } from './DataBarang';

type Mapping = { category: string; unit: string; locationCode: string; supplier: string };
type Options = { suppliers: string[]; categories: string[]; units: string[]; locations: string[] };
type Props = { rows: MasterDataImportRow[]; options: Options; canSetSupplier?: boolean; onClose: () => void; onDone: (note: string) => void };

const FIELDS = [
  ['category', 'Kategori', 'categories'],
  ['unit', 'Satuan', 'units'],
  ['locationCode', 'Lokasi', 'locations'],
  ['supplier', 'Supplier', 'suppliers'],
] as const;
const PAGE = 50;
const selectClass = 'px-2 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white';
// Kategori, satuan dan lokasi harus terisi. Supplier opsional: hanya pemetaan awal, keputusan pembelian selanjutnya di Purchasing.
const complete = (m: Mapping) => !!(m.category && m.unit && m.locationCode);

// Langkah kedua import barang: superadmin memetakan tiap barang ke supplier, kategori, satuan dan lokasi sebelum disimpan.
export default function ImportBarangMapping({ rows, options, canSetSupplier = true, onClose, onDone }: Props) {
  // Mengirim supplier butuh item.set-supplier (Purchasing/superadmin); tanpa izin itu kolomnya tidak ditampilkan
  const fields = FIELDS.filter(([key]) => key !== 'supplier' || canSetSupplier);
  const [maps, setMaps] = useState<Mapping[]>(() => rows.map(() => ({ category: '', unit: '', locationCode: '', supplier: '' })));
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulk, setBulk] = useState<Mapping>({ category: '', unit: '', locationCode: '', supplier: '' });
  const [search, setSearch] = useState('');
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [page, setPage] = useState(0);
  const [active, setActive] = useState<number | null>(null); // baris yang sedang difokus, supaya posisi isian terlihat
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const q = search.trim().toLowerCase();
  const visible = rows.map((_, i) => i).filter((i) => (!q || `${rows[i].name} ${rows[i].code} ${rows[i].detail}`.toLowerCase().includes(q)) && (!onlyIncomplete || !complete(maps[i])));
  const pages = Math.max(1, Math.ceil(visible.length / PAGE));
  const shown = visible.slice(Math.min(page, pages - 1) * PAGE, Math.min(page, pages - 1) * PAGE + PAGE);
  const incomplete = maps.filter((m) => !complete(m)).length;
  const allVisibleSelected = visible.length > 0 && visible.every((i) => selected.has(i));

  const toggle = (i: number) => setSelected((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  const toggleVisible = () => setSelected(allVisibleSelected ? new Set() : new Set(visible));
  // Hanya kolom bulk yang diisi yang menimpa; yang kosong dibiarkan
  const apply = () => setMaps((prev) => prev.map((m, i) => (selected.has(i) ? { ...m, ...Object.fromEntries(Object.entries(bulk).filter(([, v]) => v)) } : m)));

  const setCell = (i: number, key: keyof Mapping, value: string) => setMaps((prev) => prev.map((m, j) => (j === i ? { ...m, [key]: value } : m)));
  // Ctrl+D: salin nilai sel di atasnya (baris sebelumnya pada daftar yang tampil), seperti isi-ke-bawah di spreadsheet
  const fillDown = (e: React.KeyboardEvent, pos: number, key: keyof Mapping) => {
    if (!(e.ctrlKey && e.key.toLowerCase() === 'd') || pos === 0) return;
    e.preventDefault();
    setCell(shown[pos], key, maps[shown[pos - 1]][key]);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await importItems({ defaults: {}, items: rows.map((r, i) => ({ ...r, ...maps[i] })) });
      onDone(`${res.created} barang ditambahkan${res.skipped.length ? `, ${res.skipped.length} dilewati karena sudah ada (${res.skipped.slice(0, 5).map((x) => x.code ?? x.name).join(', ')}${res.skipped.length > 5 ? ', ...' : ''})` : ''}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan data.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-6xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-xl" role="dialog" aria-modal="true" aria-label="Mapping barang">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">Mapping Barang ({rows.length})</h2>
            <p className="text-xs text-gray-500">Isi tiap sel dengan dropdown (Tab pindah sel, ketik huruf untuk lompat ke opsi, Ctrl+D salin dari baris atas), atau centang beberapa barang lalu terapkan sekaligus. {incomplete} barang belum lengkap.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-3 border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Cari nama atau kode" aria-label="Cari barang" className={`${selectClass} w-56`} />
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              <input type="checkbox" checked={onlyIncomplete} onChange={(e) => { setOnlyIncomplete(e.target.checked); setPage(0); }} /> Belum lengkap saja
            </label>
            <span className="text-xs text-gray-500 ml-auto">{selected.size} dipilih dari {visible.length} tampil</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {fields.map(([key, label, opt]) => (
              <select key={key} aria-label={`${label} massal`} value={bulk[key]} onChange={(e) => setBulk((b) => ({ ...b, [key]: e.target.value }))} className={selectClass}>
                <option value="">{label} (tidak diubah)</option>
                {[...new Set(options[opt])].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ))}
            <button type="button" onClick={apply} disabled={selected.size === 0} className="px-3 py-2 text-sm font-semibold text-white bg-gray-800 rounded-lg disabled:opacity-50">Terapkan ke yang dipilih</button>
          </div>
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full text-xs text-left whitespace-nowrap border-collapse">
            <thead className="bg-gray-100 text-gray-700 font-semibold sticky top-0">
              <tr>
                <th className="px-3 py-2"><input type="checkbox" aria-label="Pilih semua yang tampil" checked={allVisibleSelected} onChange={toggleVisible} /></th>
                <th className="px-3 py-2">Nama Barang</th><th className="px-3 py-2">Kode</th><th className="px-3 py-2">Stok</th>
                {fields.map(([k, label]) => <th key={k} className="px-3 py-2">{k === 'supplier' ? 'Supplier (opsional)' : label}</th>)}
              </tr>
            </thead>
            <tbody className="text-gray-600">
              {shown.map((i, pos) => (
                <tr key={i} data-active={active === i} onFocus={() => setActive(i)} className={`${active === i ? 'bg-orange-100' : pos % 2 ? 'bg-gray-50' : 'bg-white'} hover:bg-orange-50/60`}>
                  <td className={`px-3 py-2 border-b border-gray-100 border-l-4 ${active === i ? 'border-l-orange-600' : complete(maps[i]) ? 'border-l-transparent' : 'border-l-orange-300'}`}><input type="checkbox" aria-label={`Pilih ${rows[i].name}`} checked={selected.has(i)} onChange={() => toggle(i)} /></td>
                  <td className="px-3 py-2 border-b border-gray-100">{rows[i].name}</td>
                  <td className="px-3 py-2 border-b border-gray-100">{rows[i].code}</td>
                  <td className="px-3 py-2 border-b border-gray-100">{rows[i].stock}</td>
                  {fields.map(([k, label, opt]) => (
                    <td key={k} className="px-1 py-1 border-b border-gray-100">
                      <select aria-label={`${label} ${rows[i].name}`} value={maps[i][k]} onChange={(e) => setCell(i, k, e.target.value)} onKeyDown={(e) => fillDown(e, pos, k)} className={`${selectClass} w-full min-w-32 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500`}>
                        <option value="">-</option>
                        {[...new Set(options[opt])].map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={fields.length + 4} className="px-3 py-6 text-center text-gray-400">Tidak ada barang.</td></tr>}
            </tbody>
          </table>
        </div>

        {error && <p className="mx-4 mt-3 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">{error}</p>}
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <button type="button" disabled={page <= 0} onClick={() => setPage(page - 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40">Sebelumnya</button>
            <span>{Math.min(page, pages - 1) + 1} / {pages}</span>
            <button type="button" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40">Berikutnya</button>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Batal</button>
            <button type="button" onClick={save} disabled={incomplete > 0 || saving} className="px-5 py-2 text-sm font-semibold text-white bg-[#FF8A00] rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed">{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
