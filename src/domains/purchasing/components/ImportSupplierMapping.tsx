"use client";

import { useMemo, useState } from 'react';
import Modal from '@/shared/components/Modal';
import { ApiError } from '@/shared/lib/api-client';
import { importSupplierData } from '@/domains/purchasing/api';
import type { Pajak } from '@/domains/purchasing/types';
import type { SupplierImportRow } from '@/domains/purchasing/modal/supplier';

type Map_ = { bank: string; pajak: Pajak; phone: string; code: string };
type Mapped = SupplierImportRow & Map_;

const BANK_OPTIONS = ['BCA', 'BRI', 'BNI', 'Mandiri', 'BSI', 'CIMB Niaga', 'Lainnya'];
const sel = 'w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500';
const inp = 'w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500';
const selTabel = 'min-w-36 px-2 py-1.5 border border-gray-300 rounded-md text-xs bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500';

export default function ImportSupplierMapping({ rows, onClose, onDone }: {
    rows: SupplierImportRow[];
    onClose: () => void;
    onDone: (note: string) => void;
}) {
    const [mapped, setMapped] = useState<Map_[]>(() => rows.map(() => ({ bank: '', pajak: 'NON_PKP', phone: '', code: '' })));
    const [checked, setChecked] = useState<Set<number>>(new Set());
    const [search, setSearch] = useState('');
    const [onlyIncomplete, setOnlyIncomplete] = useState(false);
    const [bulk, setBulk] = useState<Partial<Map_>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Baris dianggap lengkap bila bank dan kode sudah diisi
    const isComplete = (m: Map_) => !!m.bank && !!m.code.trim();
    const incompleteCount = mapped.filter((m) => !isComplete(m)).length;

    const visible = useMemo(() => rows
        .map((r, i) => ({ r, i }))
        .filter(({ r, i }) => {
            const q = search.trim().toLowerCase();
            if (q && !r.name.toLowerCase().includes(q) && !r.npwp.includes(q)) return false;
            if (onlyIncomplete && isComplete(mapped[i])) return false;
            return true;
        }), [rows, mapped, search, onlyIncomplete]);

    const patch = (i: number, p: Partial<Map_>) =>
        setMapped((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...p } : m)));

    const toggle = (i: number) =>
        setChecked((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
    const allVisibleChecked = visible.length > 0 && visible.every(({ i }) => checked.has(i));
    const toggleAll = () =>
        setChecked((prev) => {
            const n = new Set(prev);
            visible.forEach(({ i }) => (allVisibleChecked ? n.delete(i) : n.add(i)));
            return n;
        });

    // Terapkan nilai bulk ke baris yang dicentang
    const applyBulk = () => {
        setMapped((prev) => prev.map((m, i) => (checked.has(i) ? { ...m, ...bulk } : m)));
        setBulk({});
    };

    // Ctrl+D: salin nilai sel dari baris di atas
    const copyFromAbove = (i: number, key: keyof Map_) => (e: React.KeyboardEvent) => {
        if (!(e.ctrlKey && e.key.toLowerCase() === 'd') || i === 0) return;
        e.preventDefault();
        patch(i, { [key]: mapped[i - 1][key] } as Partial<Map_>);
    };

    const handleSimpan = async () => {
        setSaving(true);
        setError('');
        try {
            const payload: Mapped[] = rows.map((r, i) => ({ ...r, ...mapped[i], code: mapped[i].code.trim(), phone: mapped[i].phone.trim() }));
            const res = await importSupplierData(payload);
            const dilewati = res.skipped.length > 0
                ? `, ${res.skipped.length} dilewati karena duplikat: ${res.skipped.map((s) => s.code || s.name).join(', ')}`
                : '';
            onDone(`${res.created} supplier ditambahkan${dilewati}`);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Gagal menyimpan data supplier.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            title={`Mapping Supplier (${rows.length})`}
            onClose={onClose}
            size="xl"
            footer={
                <>
                    <button type="button" onClick={onClose} disabled={saving}
                        className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                        Kembali
                    </button>
                    <button type="button" onClick={handleSimpan} disabled={saving}
                        className="px-5 py-2 text-sm font-semibold text-white bg-[#FF8A00] rounded-lg hover:bg-orange-600 disabled:opacity-60">
                        {saving ? 'Menyimpan...' : `Simpan ${rows.length} Supplier`}
                    </button>
                </>
            }
        >
            <p className="text-xs text-gray-500 mb-4">
                Isi tiap sel dengan dropdown (Tab pindah sel, Ctrl+D salin dari baris atas), atau centang beberapa supplier lalu terapkan sekaligus. {incompleteCount} supplier belum lengkap.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-3">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama atau NPWP"
                    className="w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={onlyIncomplete} onChange={(e) => setOnlyIncomplete(e.target.checked)} />
                    Belum lengkap saja
                </label>
                <span className="ml-auto text-xs text-gray-500">{checked.size} dipilih dari {visible.length} tampil</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-4">
                <select className={`${sel} w-44`} value={bulk.bank ?? ''} onChange={(e) => setBulk({ ...bulk, bank: e.target.value || undefined })}>
                    <option value="">Bank (tidak diubah)</option>
                    {BANK_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
                <select className={`${sel} w-44`} value={bulk.pajak ?? ''} onChange={(e) => setBulk({ ...bulk, pajak: (e.target.value || undefined) as Pajak | undefined })}>
                    <option value="">Pajak (tidak diubah)</option>
                    <option value="NON_PKP">Non PKP</option>
                    <option value="PKP">PKP</option>
                </select>
                <button type="button" onClick={applyBulk} disabled={checked.size === 0 || Object.keys(bulk).length === 0}
                    className="px-4 py-2 text-sm font-semibold text-white bg-[#FF8A00] rounded-lg hover:bg-orange-600 disabled:opacity-40">
                    Terapkan ke yang dipilih
                </button>
            </div>

            <div className="max-h-[55vh] overflow-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-gray-100 text-gray-700 font-semibold text-xs sticky top-0 z-10">
                        <tr>
                            <th className="px-3 py-2"><input type="checkbox" checked={allVisibleChecked} onChange={toggleAll} aria-label="Pilih semua" /></th>
                            <th className="px-3 py-2">Nama Supplier</th>
                            <th className="px-3 py-2">NPWP Badan</th>
                            <th className="px-3 py-2">NIK</th>
                            <th className="px-3 py-2">Kode</th>
                            <th className="px-3 py-2">Telepon</th>
                            <th className="px-3 py-2">Bank</th>
                            <th className="px-3 py-2">Pajak</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs text-gray-700">
                        {visible.map(({ r, i }) => (
                            <tr key={i} className="border-t border-gray-100">
                                <td className="px-3 py-2"><input type="checkbox" checked={checked.has(i)} onChange={() => toggle(i)} aria-label={`Pilih ${r.name}`} /></td>
                                <td className="px-3 py-2 font-medium text-gray-900">{r.name}</td>
                                <td className="px-3 py-2 font-mono">{r.npwp || '-'}</td>
                                <td className="px-3 py-2 font-mono">{r.nik || '-'}</td>
                                <td className="px-3 py-2">
                                    <input className={inp} maxLength={20} value={mapped[i].code} placeholder="Kode"
                                        onChange={(e) => patch(i, { code: e.target.value })} onKeyDown={copyFromAbove(i, 'code')} />
                                </td>
                                <td className="px-3 py-2">
                                    <input className={inp} maxLength={30} inputMode="tel" value={mapped[i].phone} placeholder="-"
                                        onChange={(e) => patch(i, { phone: e.target.value.replace(/[^\d\s+\-()]/g, '') })} onKeyDown={copyFromAbove(i, 'phone')} />
                                </td>
                                <td className="px-3 py-2">
                                    <div className="flex items-center">
                                        <select className={selTabel} value={mapped[i].bank} onChange={(e) => patch(i, { bank: e.target.value })} onKeyDown={copyFromAbove(i, 'bank')}>
                                            <option value="">-</option>
                                            {BANK_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                    </div>
                                </td>
                                <td className="px-3 py-2">
                                    <div className="flex items-center">
                                        <select className={selTabel} value={mapped[i].pajak} onChange={(e) => patch(i, { pajak: e.target.value as Pajak })} onKeyDown={copyFromAbove(i, 'pajak')}>
                                            <option value="NON_PKP">Non PKP</option>
                                            <option value="PKP">PKP</option>
                                        </select>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {error && <p role="alert" className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</p>}
        </Modal>
    );
}