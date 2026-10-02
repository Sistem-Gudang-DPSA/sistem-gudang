"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import PermintaanPembelianPPIC from '@/domains/ppic/components/PermintaanPembelian';
import { approveApproval, rejectApproval, requestApprovalRevision } from '@/domains/ppic/api';
import type { PermintaanPembelian } from '@/domains/ppic/data/pembelian';
import { buatPoPath, rekap_pembelian_path } from '@/domains/purchasing/data/pembelian';
import { ApiError } from '@/shared/lib/api-client';

const buttonClass = 'min-w-24 px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm text-center disabled:opacity-50';
const ghostClass = 'min-w-24 px-8 py-2.5 border border-gray-300 text-gray-800 font-semibold rounded-xl hover:bg-gray-50 transition-all text-sm disabled:opacity-50';

// Purchasing memutuskan permintaan yang masih menunggu. Setelah disetujui, tombol berganti menjadi Buat PO.
function AksiPurchasing({ permintaan, reload }: { permintaan: PermintaanPembelian; reload: () => void }) {
  const [mode, setMode] = useState<'revisi' | 'tolak' | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (permintaan.statusApi === 'approved') {
    return <Link href={buatPoPath(permintaan.id)} className={buttonClass}>Buat PO</Link>;
  }
  if (permintaan.statusApi !== 'pending') {
    return <p className="text-sm text-gray-600">Status permintaan: <span className="font-bold text-gray-900">{permintaan.status}</span></p>;
  }

  const jalankan = async (aksi: () => Promise<unknown>) => {
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
      <div className="flex items-center gap-4">
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

export default function PermintaanPembelianPurchasing() {
  return (
    <PermintaanPembelianPPIC
      backPath={rekap_pembelian_path}
      actions={(permintaan, reload) => <AksiPurchasing permintaan={permintaan} reload={reload} />}
    />
  );
}
