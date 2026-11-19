import { useId, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import { useCan } from '@/domains/auth/user-context';
import { updateItem } from '@/domains/inventory/api';
import type { ItemListRow } from '@/domains/inventory/types';
import Modal from '@/shared/components/Modal';
import JumlahInput from '../JumlahInput';

export function peringatanStokMinimum(value: string): string {
  if (!value) return '';
  if (/^\d*\.$/.test(value)) return 'Lengkapi angka desimal.';
  if (Number(value) > 999_999_999) return 'Maksimal 999.999.999.';
  return /^(?:\d{1,9}(?:\.\d{1,3})?|\.\d{1,3})$/.test(value) ? '' : 'Maksimal 3 angka desimal.';
}

export default function StokMinimumCell({ item, onSaved, readOnly = false }: { item: ItemListRow; onSaved: () => void; readOnly?: boolean }) {
  const canUpdate = useCan('item.update') && !readOnly;
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const inputId = useId();

  const close = () => { if (!submitting.current) setOpen(false); };
  const save = async () => {
    if (submitting.current) return;
    const warning = peringatanStokMinimum(value);
    if (warning) { setError(warning); return; }
    submitting.current = true;
    setSaving(true);
    setError('');
    try {
      await updateItem(item.id, { minimumStock: value === '' ? null : Number(value) });
      onSaved();
      setOpen(false);
      window.dispatchEvent(new Event('stock-notifications-changed'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan stok minimum.');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <>
      <span className="inline-flex items-center gap-2 text-sm text-gray-600">
        {item.minimumStock == null ? 'Belum diatur' : item.minimumStock.toLocaleString('id-ID', { maximumFractionDigits: 3 })}
        {canUpdate && <button type="button" aria-label={`Atur stok minimum ${item.name}`}
          onClick={() => { setValue(item.minimumStock == null ? '' : String(item.minimumStock)); setError(''); setOpen(true); }}
          className="rounded-md p-1.5 text-orange-500 hover:bg-orange-50">
          <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
        </button>}
      </span>
      {open && <Modal title="Stok minimum" onClose={close} size="sm" footer={
        <>
          <button type="button" disabled={saving} onClick={close} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600">Batal</button>
          <button type="button" disabled={saving || !!peringatanStokMinimum(value)} onClick={() => void save()} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan'}</button>
        </>
      }>
        <p className="mb-4 text-sm font-medium text-gray-800">{item.name}</p>
        <label htmlFor={inputId} className="mb-2 block text-sm text-gray-600">Batas stok minimum ({item.unit})</label>
        <JumlahInput id={inputId} value={value} onValueChange={(next) => { setValue(next); setError(''); }} validate={peringatanStokMinimum} disabled={saving}
          placeholder="Contoh: 10" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <p className="mt-3 text-xs leading-relaxed text-gray-500">Notifikasi muncul jika stok sama dengan atau di bawah batas ini. Kosongkan untuk menonaktifkan.</p>
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      </Modal>}
    </>
  );
}
