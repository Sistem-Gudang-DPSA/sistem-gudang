// domains/inventory/components/AdjustStockModal.tsx
"use client";
import { useState } from 'react';
import { adjustItemStock } from '@/domains/inventory/api';
import type { ItemListRow } from '@/domains/inventory/types';
import { ApiError } from '@/shared/lib/api-client';
import Modal from '@/shared/components/Modal';

const input = 'w-full border border-gray-200 bg-gray-50/50 rounded-xl py-2.5 px-4 text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200';

export default function AdjustStockModal({ item, onClose, onSaved }: { item: ItemListRow; onClose: () => void; onSaved: () => void }) {
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const n = Number(delta);
    if (!delta || Number.isNaN(n) || n === 0 || !reason) {
      setError('Isi jumlah perubahan (boleh negatif) dan alasan.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await adjustItemStock(item.id, { delta: n, reason });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menyesuaikan stok.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Sesuaikan Stok · ${item.name}`}
      onClose={onClose}
      footer={
        <button type="button" onClick={submit} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all text-sm disabled:opacity-60">
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      }
    >
      <p className="text-sm text-gray-500 mb-6">
        Stok saat ini: <span className="font-bold text-gray-800">{item.stock} {item.unit}</span>
      </p>
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="flex-1">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Perubahan Jumlah</label>
          <input type="text" inputMode="numeric" autoComplete="off" maxLength={10} placeholder="Contoh: 10 atau -5" className={input}
            value={delta} onChange={(e) => setDelta(e.target.value.replace(/(?!^-)\D/g, ''))} />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Alasan</label>
          <input type="text" maxLength={255} placeholder="Contoh: Penerimaan PO-2026-09-001" className={input}
            value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </div>
      {error && <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
    </Modal>
  );
}