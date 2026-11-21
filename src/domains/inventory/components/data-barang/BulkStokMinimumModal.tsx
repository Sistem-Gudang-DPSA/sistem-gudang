"use client";

import { useId, useRef, useState } from 'react';
import Modal from '@/shared/components/Modal';
import { updateItem } from '@/domains/inventory/api';
import type { ItemListRow } from '@/domains/inventory/types';
import JumlahInput from '../JumlahInput';
import { peringatanStokMinimum } from './StokMinimumCell';

type Hasil = { berhasil: ItemListRow[]; gagal: { name: string; message: string }[] };

// Memetakan satu batas stok minimum ke banyak barang sekaligus dari pilihan checkbox di Data Barang.
export default function BulkStokMinimumModal({ items, onClose, onApplied }: {
  items: ItemListRow[];
  onClose: () => void;
  onApplied: () => void;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const submitting = useRef(false);
  const inputId = useId();

  const simpan = async () => {
    if (submitting.current) return;
    const warning = peringatanStokMinimum(value);
    if (warning) { setError(warning); return; }
    submitting.current = true;
    setSaving(true);
    setError('');
    const minimumStock = value === '' ? null : Number(value);
    const berhasil: ItemListRow[] = [];
    const gagal: { name: string; message: string }[] = [];
    for (const item of items) {
      try {
        await updateItem(item.id, { minimumStock });
        berhasil.push(item);
      } catch (err) {
        gagal.push({ name: item.name, message: err instanceof Error ? err.message : 'Gagal menyimpan.' });
      }
    }
    submitting.current = false;
    setSaving(false);
    setHasil({ berhasil, gagal });
    if (berhasil.length > 0) {
      window.dispatchEvent(new Event('stock-notifications-changed'));
      onApplied();
    }
  };

  return (
    <Modal title="Stok minimum massal" onClose={onClose} size="md" footer={hasil ? (
      <button type="button" onClick={onClose} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white">Tutup</button>
    ) : (
      <>
        <button type="button" disabled={saving} onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 disabled:opacity-50">Batal</button>
        <button type="button" disabled={saving || !!peringatanStokMinimum(value)} onClick={() => void simpan()} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? 'Menyimpan...' : `Simpan ke ${items.length} barang`}
        </button>
      </>
    )}>
      {hasil ? (
        <div className="space-y-4 text-sm">
          <p role="status" className="rounded-lg bg-green-50 p-3 text-green-700">
            Berhasil ({hasil.berhasil.length}): {hasil.berhasil.map((item) => item.name).join(', ') || 'tidak ada'}.{hasil.berhasil.length > 0 ? ` Batas stok minimum diset ke ${value === '' ? 'kosong (notifikasi off)' : value}.` : ''}
          </p>
          {hasil.gagal.length > 0 && (
            <div role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">
              <p className="font-semibold">Gagal ({hasil.gagal.length}):</p>
              <ul className="mt-1 list-disc pl-5">
                {hasil.gagal.map((row) => <li key={row.name}>{row.name}: {row.message}</li>)}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-gray-700">Atur batas stok minimum untuk {items.length} barang terpilih:</p>
          <ul className="mb-4 max-h-32 overflow-y-auto rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
            {items.map((item) => <li key={item.id}>{item.name}</li>)}
          </ul>
          <label htmlFor={inputId} className="mb-2 block text-sm text-gray-600">Batas stok minimum</label>
          <JumlahInput id={inputId} value={value} onValueChange={(next) => { setValue(next); setError(''); }} validate={peringatanStokMinimum} disabled={saving}
            placeholder="Contoh: 10" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <p className="mt-3 text-xs leading-relaxed text-gray-500">Nilai yang sama dipakai untuk semua barang terpilih. Kosongkan untuk menonaktifkan notifikasi.</p>
          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        </>
      )}
    </Modal>
  );
}
