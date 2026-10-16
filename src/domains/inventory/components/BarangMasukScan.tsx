"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Minus, Plus, ScanLine, Trash2 } from 'lucide-react';
import { createInboundBatch, getItemByCode } from '@/domains/inventory/api';
import type { StatusQc } from '@/domains/inventory/types';
import { todayIso } from '@/domains/inventory/date';
import { ApiError } from '@/shared/lib/api-client';
import { INTEGER_INPUT, digitsOnly } from '@/shared/lib/input';

type Line = { itemId: number; code: string; name: string; unit: string; stock: number; qty: string; statusQc: StatusQc };
type Draft = { key: string; date: string; lines: Line[] };

const STORAGE_KEY = 'barang-masuk-scan-draft';
const MAX_QTY = 100000; // BE limit per line
const LARGE_QTY = 1000; // flagged on the review step
const CAMERA_COOLDOWN_MS = 2000; // a camera reads the same QR on every frame; ignore repeats of one code for this long

const newDraft = (): Draft => ({ key: crypto.randomUUID(), date: todayIso(), lines: [] });

// The draft survives a reload, so a scan session is not lost halfway. Storage may be blocked, so every access is guarded.
function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw) as Draft;
      if (d && typeof d.key === 'string' && Array.isArray(d.lines)) return d;
    }
  } catch { /* fall through to a fresh draft */ }
  return newDraft();
}
function saveDraft(d: Draft | null) {
  try {
    if (d) localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* storage unavailable: the draft just stays in memory */ }
}

const qtyOf = (l: Line) => Number(l.qty);
const bump = (ls: Line[], match: (l: Line) => boolean) =>
  ls.map((l) => (match(l) ? { ...l, qty: String(Math.min(qtyOf(l) + 1, MAX_QTY)) } : l));
const qtyValid = (l: Line) => Number.isInteger(qtyOf(l)) && qtyOf(l) >= 1 && qtyOf(l) <= MAX_QTY;

export default function BarangMasukScan({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [step, setStep] = useState<'scan' | 'review'>('scan');
  const [scanValue, setScanValue] = useState('');
  const [scanError, setScanError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const linesRef = useRef(draft.lines);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastCameraRead = useRef({ code: '', at: 0 });

  useEffect(() => { linesRef.current = draft.lines; saveDraft(draft.lines.length > 0 ? draft : null); }, [draft]);
  useEffect(() => { if (step === 'scan') inputRef.current?.focus(); }, [step]);

  const setLines = (fn: (lines: Line[]) => Line[]) => setDraft((d) => ({ ...d, lines: fn(d.lines) }));
  const patchLine = (itemId: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.itemId === itemId ? { ...l, ...patch } : l)));

  const addCode = async (code: string) => {
    setScanError('');
    // Functional updates, so scans arriving faster than a render each still count.
    if (linesRef.current.some((l) => l.code === code)) { setLines((ls) => bump(ls, (l) => l.code === code)); return; }
    try {
      const item = await getItemByCode(code);
      // Merge on resolve: two quick scans of one new code both reach here before the first line exists.
      setLines((ls) => ls.some((l) => l.itemId === item.id)
        ? bump(ls, (l) => l.itemId === item.id)
        : [...ls, { itemId: item.id, code, name: item.name, unit: item.unit, stock: item.stock, qty: '1', statusQc: 'PASS' }]);
    } catch (err) {
      setScanError(err instanceof ApiError && err.status === 404 ? `Kode "${code}" tidak dikenal.` : err instanceof ApiError ? err.message : 'Gagal membaca kode.');
    }
  };

  // Phone camera: qr-scanner is loaded only when the camera is opened. Needs HTTPS (or localhost) for getUserMedia.
  useEffect(() => {
    if (!cameraOn || !videoRef.current) return;
    let stop = () => {};
    let cancelled = false;
    (async () => {
      if (!window.isSecureContext) {
        setScanError('Kamera hanya jalan di HTTPS atau localhost.');
        setCameraOn(false);
        return;
      }
      try {
        const { default: QrScanner } = await import('qr-scanner');
        if (cancelled || !videoRef.current) return;
        const scanner = new QrScanner(
          videoRef.current,
          (result) => {
            const code = result.data.trim();
            const last = lastCameraRead.current;
            const now = Date.now();
            if (!code || (code === last.code && now - last.at < CAMERA_COOLDOWN_MS)) return;
            lastCameraRead.current = { code, at: now };
            void addCode(code);
          },
          { preferredCamera: 'environment', highlightScanRegion: true, returnDetailedScanResult: true },
        );
        stop = () => { scanner.stop(); scanner.destroy(); };
        await scanner.start();
        if (cancelled) stop();
      } catch {
        if (!cancelled) {
          setScanError('Kamera tidak bisa dibuka. Periksa izin kamera di browser.');
          setCameraOn(false);
        }
      }
    })();
    return () => { cancelled = true; stop(); };
    // addCode only uses refs and functional state updates, so the scanner is not restarted on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn]);

  // The USB scanner types the code and presses Enter.
  const onScanKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const code = scanValue.trim();
    setScanValue('');
    if (code) void addCode(code);
    inputRef.current?.focus();
  };

  const cancelSession = () => {
    if (draft.lines.length > 0 && !window.confirm('Batalkan sesi scan? Semua baris yang belum disimpan akan dihapus.')) return;
    saveDraft(null);
    onClose();
  };

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await createInboundBatch(
        { date: draft.date, lines: draft.lines.map((l) => ({ itemId: l.itemId, qtyArrived: qtyOf(l), statusQc: l.statusQc })) },
        draft.key,
      );
      saveDraft(null);
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const lineErrors = Object.entries(err.errors ?? {})
          .map(([k, msgs]) => {
            const i = /^lines\.(\d+)\./.exec(k)?.[1];
            return i === undefined ? msgs.join(', ') : `${draft.lines[Number(i)]?.name ?? `Baris ${Number(i) + 1}`}: ${msgs.join(', ')}`;
          });
        setError(lineErrors.length > 0 ? lineErrors.join(' | ') : err.message);
      } else {
        // No response (timeout/offline): the batch may or may not have been saved. Retrying with the same key is safe.
        setError('Koneksi terputus. Tekan Konfirmasi simpan lagi; aman diulang, stok tidak akan bertambah dua kali.');
      }
    } finally {
      setSaving(false);
    }
  };

  const allValid = draft.lines.length > 0 && draft.lines.every(qtyValid);
  const totalUnits = draft.lines.reduce((sum, l) => sum + (qtyValid(l) ? qtyOf(l) : 0), 0);
  const large = draft.lines.filter((l) => qtyOf(l) >= LARGE_QTY);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 border border-white/20">
        <h2 className="text-[20px] font-extrabold text-gray-900 mb-6 tracking-wide uppercase">
          {step === 'scan' ? 'Scan Barang Masuk' : 'Periksa Sebelum Simpan'}
        </h2>

        {step === 'scan' && (
          <>
            <div className="flex flex-col sm:flex-row gap-4 mb-5">
              <div className="flex-1 relative">
                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  autoComplete="off"
                  maxLength={191}
                  value={scanValue}
                  onChange={(e) => setScanValue(e.target.value)}
                  onKeyDown={onScanKey}
                  placeholder="Arahkan scanner ke QR barang..."
                  aria-label="Hasil scan"
                  className="w-full border border-gray-300 rounded-md py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/30 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => { setScanError(''); setCameraOn((v) => !v); }}
                aria-pressed={cameraOn}
                className={`flex items-center justify-center gap-2 px-4 py-3 border rounded-md text-sm font-medium ${cameraOn ? 'bg-orange-50 border-orange-300 text-orange-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                <Camera className="w-4 h-4" />
                {cameraOn ? 'Matikan kamera' : 'Kamera'}
              </button>
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                aria-label="Tanggal"
                className="border border-gray-300 rounded-md py-3 px-4 text-sm text-gray-700"
              />
            </div>
            {cameraOn && <video ref={videoRef} muted playsInline className="mb-4 w-full max-w-sm rounded-xl bg-black" />}
            {scanError && <p className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg" role="alert">{scanError}</p>}

            <div className="border border-gray-200 rounded-xl overflow-x-auto mb-6">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-semibold">
                  <tr>
                    <th className="px-4 py-3">No</th><th className="px-4 py-3">Kode</th><th className="px-4 py-3">Nama Barang</th>
                    <th className="px-4 py-3">Stok Kini</th><th className="px-4 py-3">Jumlah Datang</th><th className="px-4 py-3">QC</th><th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {draft.lines.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Belum ada barang. Scan QR pada barang yang datang.</td></tr>
                  )}
                  {draft.lines.map((l, i) => (
                    <tr key={l.itemId}>
                      <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{l.code}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{l.name}</td>
                      <td className="px-4 py-3 text-gray-600">{l.stock} {l.unit}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button type="button" aria-label={`Kurangi ${l.name}`} disabled={qtyOf(l) <= 1} onClick={() => patchLine(l.itemId, { qty: String(Math.max(qtyOf(l) - 1, 1)) })} className="p-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-30"><Minus className="w-4 h-4" /></button>
                        <input
                          {...INTEGER_INPUT}
                          maxLength={6}
                          value={l.qty}
                          aria-label={`Jumlah ${l.name}`}
                          onChange={(e) => patchLine(l.itemId, { qty: digitsOnly(e.target.value) })}
                          className={`w-20 border rounded-md py-2 px-2 text-center text-sm ${qtyValid(l) ? 'border-gray-300' : 'border-red-400 bg-red-50'}`}
                        />
                        <button type="button" aria-label={`Tambah ${l.name}`} disabled={qtyOf(l) >= MAX_QTY} onClick={() => setLines((ls) => bump(ls, (x) => x.itemId === l.itemId))} className="p-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-30"><Plus className="w-4 h-4" /></button>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={l.statusQc}
                          aria-label={`Status QC ${l.name}`}
                          onChange={(e) => patchLine(l.itemId, { statusQc: e.target.value as StatusQc })}
                          className="border border-gray-300 rounded-md py-2 px-2 text-sm"
                        >
                          <option value="PASS">Pass</option>
                          <option value="PARTIAL_RETUR">Part (Retur)</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" aria-label={`Hapus ${l.name}`} onClick={() => setLines((ls) => ls.filter((x) => x.itemId !== l.itemId))} className="text-gray-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between gap-3">
              <button type="button" onClick={cancelSession} className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">Batalkan sesi</button>
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">Tutup (draft tersimpan)</button>
                <button type="button" onClick={() => { setError(''); setStep('review'); }} disabled={!allValid} className="px-8 py-2.5 bg-[#ff8a00] text-white rounded-lg text-sm font-semibold hover:bg-[#eb7d00] disabled:opacity-50 disabled:cursor-not-allowed">Periksa</button>
              </div>
            </div>
          </>
        )}

        {step === 'review' && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              {draft.lines.length} jenis barang, total {totalUnits.toLocaleString('id-ID')} unit, tanggal {draft.date}. Stok belum berubah sampai Anda menekan Konfirmasi simpan.
            </p>
            {large.length > 0 && (
              <p className="mb-4 p-3 bg-amber-50 text-amber-800 text-sm rounded-lg">
                Periksa jumlah besar: {large.map((l) => `${l.name} (${qtyOf(l).toLocaleString('id-ID')})`).join(', ')}.
              </p>
            )}
            <table className="w-full text-left text-sm mb-6 border border-gray-200 rounded-xl overflow-hidden">
              <thead className="bg-gray-50 text-gray-600 font-semibold">
                <tr><th className="px-4 py-3">Kode</th><th className="px-4 py-3">Nama Barang</th><th className="px-4 py-3 text-right">Jumlah</th><th className="px-4 py-3">QC</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {draft.lines.map((l) => (
                  <tr key={l.itemId}>
                    <td className="px-4 py-3 font-mono text-xs">{l.code}</td>
                    <td className="px-4 py-3 font-bold">{l.name}</td>
                    <td className="px-4 py-3 text-right">{qtyOf(l).toLocaleString('id-ID')} {l.unit}</td>
                    <td className="px-4 py-3">{l.statusQc === 'PASS' ? 'Pass' : 'Part (Retur)'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {error && <p className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg" role="alert">{error}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setStep('scan')} disabled={saving} className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Kembali</button>
              <button type="button" onClick={submit} disabled={saving} className="px-8 py-2.5 bg-[#ff8a00] text-white rounded-lg text-sm font-semibold hover:bg-[#eb7d00] disabled:opacity-60">{saving ? 'Menyimpan...' : 'Konfirmasi simpan'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
