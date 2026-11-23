"use client";

import { useState } from 'react';
import { useCan } from '@/domains/auth/user-context';
import { ApiError } from '@/shared/lib/api-client';
import { approveApproval, rejectApproval, requestApprovalRevision } from '../api';
import type { PermintaanPembelian } from '../data/pembelian';

const buttonClass = 'min-w-24 px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm text-center disabled:opacity-50';
const ghostClass = 'min-w-24 px-8 py-2.5 border border-gray-300 text-gray-800 font-semibold rounded-xl hover:bg-gray-50 transition-all text-sm disabled:opacity-50';

// The same decisions are available to PPIC and Purchasing, only at their own step.
export default function AksiPersetujuanPembelian({ permintaan, reload, tahap }: { permintaan: PermintaanPembelian; reload: () => void; tahap: 'ppic' | 'purchasing' }) {
  const canApprove = useCan('purchase-request.approve');
  const [mode, setMode] = useState<'revisi' | 'tolak' | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (permintaan.statusApi !== 'pending') return <p className="text-sm text-gray-600">Status permintaan: <span className="font-bold text-gray-900">{permintaan.status}</span></p>;
  const step = tahap === 'ppic' ? 2 : 3;
  if (permintaan.currentStepOrder !== step) return <p className="text-sm text-gray-600">{permintaan.currentStepOrder === 3 ? 'Menunggu persetujuan Purchasing.' : 'Menunggu persetujuan PPIC.'}</p>;
  if (!canApprove) return <p className="text-sm text-gray-600">Anda tidak memiliki izin menyetujui permintaan pembelian.</p>;

  const jalankan = async (aksi: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await aksi();
      setMode(null);
      setNote('');
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memproses permintaan.');
    } finally {
      setBusy(false);
    }
  };

  const kirimCatatan = () => {
    if (!note.trim()) {
      setError('Catatan wajib diisi.');
      return;
    }
    void jalankan(() => (mode === 'tolak' ? rejectApproval(permintaan.id, note.trim()) : requestApprovalRevision(permintaan.id, note.trim())));
  };

  return (
    <div className="flex flex-col items-end gap-3 w-full">
      {mode && (
        <div className="w-full max-w-md flex flex-col gap-2">
          <label htmlFor="catatan-keputusan" className="text-sm font-medium text-gray-800">
            Catatan {mode === 'tolak' ? 'penolakan' : 'revisi'}
          </label>
          <textarea
            id="catatan-keputusan"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap items-center justify-end gap-4">
        {mode ? (
          <>
            <button type="button" disabled={busy} onClick={() => { setMode(null); setError(''); }} className={ghostClass}>Batal</button>
            <button type="button" disabled={busy} onClick={kirimCatatan} className={buttonClass}>Kirim</button>
          </>
        ) : (
          <>
            <button type="button" disabled={busy} onClick={() => setMode('tolak')} className={ghostClass}>Tolak</button>
            <button type="button" disabled={busy} onClick={() => setMode('revisi')} className={ghostClass}>Revisi</button>
            <button type="button" disabled={busy} onClick={() => void jalankan(() => approveApproval(permintaan.id))} className={buttonClass}>Setuju</button>
          </>
        )}
      </div>
    </div>
  );
}

