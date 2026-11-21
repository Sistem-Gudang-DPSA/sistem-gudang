"use client";

import { useId, useState } from 'react';
import Modal from '@/shared/components/Modal';
import { INTEGER_INPUT, digitsOnly } from '@/shared/lib/input';
import { printItemLabels } from '@/domains/inventory/label-print';
import type { ItemListRow } from '@/domains/inventory/types';

const MAX_COPIES = 100;

// Menentukan berapa label QR yang dicetak untuk tiap barang; stok fisik 5 kaleng butuh 5 label.
export default function PrintQrModal({ items, onClose }: { items: ItemListRow[]; onClose: () => void }) {
  const [copies, setCopies] = useState('1');
  const [error, setError] = useState('');
  const [printing, setPrinting] = useState(false);
  const inputId = useId();

  const jumlah = Number(copies);
  const valid = Number.isInteger(jumlah) && jumlah >= 1 && jumlah <= MAX_COPIES;
  const total = valid ? items.length * jumlah : 0;

  const cetak = async () => {
    if (!valid || printing) return;
    setPrinting(true);
    setError('');
    const gagal = await printItemLabels(items, jumlah);
    setPrinting(false);
    if (gagal) setError(gagal);
    else onClose();
  };

  return (
    <Modal title="Cetak label QR" onClose={onClose} size="sm" footer={
      <>
        <button type="button" disabled={printing} onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 disabled:opacity-50">Batal</button>
        <button type="button" disabled={printing || !valid} onClick={() => void cetak()} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{printing ? 'Menyiapkan...' : `Cetak ${total} label`}</button>
      </>
    }>
      <ul className="mb-4 max-h-32 overflow-y-auto rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
        {items.map((item) => <li key={item.id}>{item.code} — {item.name}</li>)}
      </ul>
      <label htmlFor={inputId} className="mb-2 block text-sm text-gray-600">Jumlah label per barang</label>
      <input
        id={inputId}
        {...INTEGER_INPUT}
        maxLength={3}
        value={copies}
        onChange={(e) => { setCopies(digitsOnly(e.target.value)); setError(''); }}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        aria-describedby={`${inputId}-hint`}
      />
      <p id={`${inputId}-hint`} className="mt-3 text-xs leading-relaxed text-gray-500">
        Contoh: 5 kaleng barang yang sama butuh 5 label. Maksimal {MAX_COPIES} label per barang. Total {valid ? `${items.length} barang × ${jumlah} = ${total} label` : 'belum dihitung'}.
      </p>
      {copies !== '' && !valid && <p role="alert" className="mt-3 text-sm text-red-600">Jumlah label harus bilangan bulat 1 sampai {MAX_COPIES}.</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </Modal>
  );
}
