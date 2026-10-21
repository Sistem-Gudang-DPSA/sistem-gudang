"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Minus, PackageCheck, Plus, ScanLine, Trash2, Undo2 } from 'lucide-react';
import { createInboundScanBatch, getItemByCode } from '@/domains/inventory/api';
import { listSuppliers } from '@/domains/purchasing/api';
import type { Supplier } from '@/domains/purchasing/types';
import type { StatusQc } from '@/domains/inventory/types';
import { todayIso } from '@/domains/inventory/date';
import { ApiError } from '@/shared/lib/api-client';
import { INTEGER_INPUT, digitsOnly } from '@/shared/lib/input';
import { randomId } from '@/shared/lib/random-id';

type Kind = 'pass' | 'retur';
type Step = 'hub' | Kind | 'review';
type Line = { itemId: number; code: string; name: string; unit: string; stock: number; supplierId: number | null; qty: string; reason: string };
type Draft = { key: string; date: string; pass: Line[]; retur: Line[] };

const STORAGE_KEY = 'barang-masuk-scan-draft';
const MAX_QTY = 100000; // BE limit per line
const LARGE_QTY = 1000; // flagged on the review step
const CAMERA_COOLDOWN_MS = 2000; // a camera reads the same QR on every frame; ignore repeats of one code for this long
const KINDS: Kind[] = ['pass', 'retur'];
const KIND_LABEL: Record<Kind, string> = { pass: 'Barang Lolos QC', retur: 'Barang Retur' };

const newDraft = (): Draft => ({ key: randomId(), date: todayIso(), pass: [], retur: [] });

// The draft survives a reload, so a scan session is not lost halfway. Storage may be blocked, so every access is guarded.
function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw) as Draft;
      if (d && typeof d.key === 'string' && Array.isArray(d.pass)) return d;
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
const lineValid = (kind: Kind, l: Line) =>
  qtyValid(l) && (kind === 'pass' || (l.supplierId !== null && l.reason.trim() !== ''));
const units = (ls: Line[]) => ls.reduce((sum, l) => sum + (qtyValid(l) ? qtyOf(l) : 0), 0);

export default function BarangMasukScan({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [step, setStep] = useState<Step>('hub');
  const [scanValue, setScanValue] = useState('');
  const [scanError, setScanError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef(draft);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastCameraRead = useRef({ code: '', at: 0 });
  const stepRef = useRef<Step>('hub');

  useEffect(() => { draftRef.current = draft; saveDraft(draft.pass.length + draft.retur.length > 0 ? draft : null); }, [draft]);
  useEffect(() => { stepRef.current = step; if (step === 'pass' || step === 'retur') inputRef.current?.focus();}, [step]);
  useEffect(() => { listSuppliers ({ pageSize: 100}).then((res) => setSuppliers(res.rows)).catch(() => {});}, []);

  const supplierName = (id: number | null) => id === null ? '-' : suppliers.find((s) => s.id === id)?.name ?? `#${id}`;
  const goTo = (next: Step) => {setCameraOn(false); setScanError(''); setError(''); setStep(next);};
  const setList = (kind: Kind, fn: (ls: Line[]) => Line[]) => setDraft((d) => ({ ...d, [kind]: fn(d[kind]) }));
  const patchLine = (kind: Kind, itemId: number, patch: Partial<Line>) => setList(kind, (ls) => ls.map((l) => (l.itemId === itemId ? { ...l, ...patch } : l)));

  const addCode = async (code: string) => {
    const kind = stepRef.current;
    if (kind !== 'pass' && kind !== 'retur') return;
    setScanError('');
    // Functional updates, so scans arriving faster than a render each still count.
    if (draftRef.current[kind].some((l) => l.code === code)) { setList(kind, (ls) => bump(ls, (l) => l.code === code)); return; }
    try {
      const item = await getItemByCode(code);
      setList(kind, (ls) =>
        ls.some((l) => l.itemId === item.id)
          ? bump(ls, (l) => l.itemId === item.id)
          : [...ls, {
              itemId: item.id, code, name: item.name, unit: item.unit, stock: item.stock,
              supplierId: item.supplierId ?? null, qty: '1', reason: '',
            }],
      );
    } catch (err) {
      setScanError(
        err instanceof ApiError && err.status === 404 ? `Kode "${code}" tidak dikenal.`
        : err instanceof ApiError ? err.message : 'Gagal membaca kode.',
      );
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

  const totalLines = draft.pass.length + draft.retur.length;
  const allValid = totalLines > 0 && KINDS.every((k) => draft[k].every((l) => lineValid(k, l)));
  const large = KINDS.flatMap((k) => draft[k].filter((l) => qtyOf(l) >= LARGE_QTY).map((l) => `${l.name} (${KIND_LABEL[k]}: ${qtyOf(l).toLocaleString('id-ID')})`),);

  const cancelSession = () => {
    if (totalLines > 0 && !window.confirm('Batalkan sesi scan? Semua baris yang belum disimpan akan dihapus.')) return;
    saveDraft(null);
    onClose();
  };

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await createInboundScanBatch(
        { date: draft.date, pass: draft.pass.map((l) => ({ itemId: l.itemId, qtyArrived: qtyOf(l)})),
          retur: draft.retur.map((l) => ({ itemId: l.itemId, qty: qtyOf(l), reason: l.reason.trim() })),
        },
        draft.key,
      );
      saveDraft(null);
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const lineErrors = Object.entries(err.errors ?? {})
          .map(([k, msgs]) => {
            const m = /^(pass|retur)\.(\d+)\./.exec(k);
            if (!m) return msgs.join(', ');
            const kind = m[1] as Kind;
            const i = Number(m[2]);
            return `${draft[kind][i]?.name ?? `Baris ${i + 1}`} (${KIND_LABEL[kind]}): ${msgs.join(', ')}`;
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

  const btnGhost = 'px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50';
  const btnPrimary = 'px-8 py-2.5 bg-[#ff8a00] text-white rounded-lg text-sm font-semibold hover:bg-[#eb7d00] disabled:opacity-50 disabled:cursor-not-allowed';

  const title =
    step === 'hub' ? 'Scan Barang Masuk'
    : step === 'review' ? 'Periksa Sebelum Simpan'
    : `Scan ${KIND_LABEL[step]}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 border border-white/20">
        <h2 className="text-[20px] font-extrabold text-gray-900 mb-6 tracking-wide uppercase">{title}</h2>

        {/* ===== HUB ===== */}
        {step === 'hub' && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <label htmlFor="scan-tanggal" className="text-sm font-medium text-gray-900">Tanggal</label>
              <input
                id="scan-tanggal"
                type="date"
                value={draft.date}
                onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                className="border border-gray-300 rounded-md py-2 px-3 text-sm text-gray-700"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-6 mt-2">
              {KINDS.map((k) => {
                const Icon = k === 'pass' ? PackageCheck : Undo2;
                const ls = draft[k];
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => goTo(k)}
                    className="text-left p-5 border border-gray-200 rounded-xl hover:border-[#FF8A00] hover:bg-orange-50/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="w-5 h-5 text-[#FF8A00]" />
                      <span className="font-bold text-gray-900">{KIND_LABEL[k]}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {k === 'pass' ? 'Stok bertambah setelah disimpan.' : 'Dibuat sebagai permintaan retur ke supplier.'}
                    </p>
                    <p className="mt-3 text-sm font-semibold text-gray-800">
                      {ls.length} jenis · {units(ls).toLocaleString('id-ID')} unit
                    </p>
                    {ls.some((l) => !lineValid(k, l)) && (
                      <p className="mt-1 text-xs text-amber-700">Ada baris yang belum lengkap.</p>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between gap-3">
              <button type="button" onClick={cancelSession} className={btnGhost}>Batalkan sesi</button>
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className={btnGhost}>Tutup (draft tersimpan)</button>
                <button type="button" onClick={() => goTo('review')} disabled={!allValid} className={btnPrimary}>
                  Tinjau &amp; Simpan
                </button>
              </div>
            </div>
          </>
        )}

        {/* ===== SCAN (lolos QC / retur) ===== */}
        {(step === 'pass' || step === 'retur') && (() => {
          const kind: Kind = step;
          const isRetur = kind === 'retur';
          const lines = draft[kind];
          const listOk = lines.every((l) => lineValid(kind, l));
          return (
            <>
              <div className="flex flex-col sm:flex-row gap-4 mb-5">
                <div className="flex-1 relative">
                  <ScanLine className="absolute ml-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
              </div>
              {cameraOn && <video ref={videoRef} muted playsInline className="mb-4 w-full max-w-sm rounded-xl bg-black" />}
              {scanError && <p className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg" role="alert">{scanError}</p>}

              <div className="border border-gray-200 rounded-xl overflow-x-auto mb-6 mt-4">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 font-semibold">
                    <tr>
                      <th className="px-4 py-3">No</th>
                      <th className="px-4 py-3">Kode</th>
                      <th className="px-4 py-3">Nama Barang</th>
                      <th className="px-4 py-3">Stok Kini</th>
                      <th className="px-4 py-3">Jumlah</th>
                      {isRetur && <th className="px-4 py-3">Supplier</th>}
                      {isRetur && <th className="px-4 py-3">Alasan Retur</th>}
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lines.length === 0 && (
                      <tr>
                        <td colSpan={isRetur ? 8 : 6} className="px-4 py-8 text-center text-gray-400">
                          Belum ada barang. Scan QR pada barang {isRetur ? 'yang akan diretur' : 'yang lolos QC'}.
                        </td>
                      </tr>
                    )}
                    {lines.map((l, i) => (
                      <tr key={l.itemId}>
                        <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{l.code}</td>
                        <td className="px-4 py-3 font-bold text-gray-900">{l.name}</td>
                        <td className="px-4 py-3 text-gray-600">{l.stock} {l.unit}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button type="button" aria-label={`Kurangi ${l.name}`} disabled={qtyOf(l) <= 1} onClick={() => patchLine(kind, l.itemId, { qty: String(Math.max(qtyOf(l) - 1, 1)) })} className="p-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-30"><Minus className="w-4 h-4" /></button>
                          <input
                            {...INTEGER_INPUT}
                            maxLength={6}
                            value={l.qty}
                            aria-label={`Jumlah ${l.name}`}
                            onChange={(e) => patchLine(kind, l.itemId, { qty: digitsOnly(e.target.value) })}
                            className={`w-20 border rounded-md py-2 px-2 text-center text-sm ${qtyValid(l) ? 'border-gray-300' : 'border-red-400 bg-red-50'}`}
                          />
                          <button type="button" aria-label={`Tambah ${l.name}`} disabled={qtyOf(l) >= MAX_QTY} onClick={() => setList(kind, (ls) => bump(ls, (x) => x.itemId === l.itemId))} className="p-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-30"><Plus className="w-4 h-4" /></button>
                        </td>
                        {isRetur && (
                          <td className={`px-4 py-3 ${l.supplierId === null ? 'text-red-600' : 'text-gray-600'}`}>
                            {l.supplierId === null ? 'Belum ada supplier' : supplierName(l.supplierId)}
                          </td>
                        )}
                        {isRetur && (
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              maxLength={191}
                              value={l.reason}
                              aria-label={`Alasan retur ${l.name}`}
                              placeholder="Contoh: rusak, tidak sesuai"
                              onChange={(e) => patchLine(kind, l.itemId, { reason: e.target.value })}
                              className={`w-56 border rounded-md py-2 px-2 text-sm ${l.reason.trim() ? 'border-gray-300' : 'border-red-400 bg-red-50'}`}
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 text-right">
                          <button type="button" aria-label={`Hapus ${l.name}`} onClick={() => setList(kind, (ls) => ls.filter((x) => x.itemId !== l.itemId))} className="text-gray-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-500">
                  {lines.length} jenis · {units(lines).toLocaleString('id-ID')} unit
                </p>
                <button type="button" onClick={() => goTo('hub')} disabled={!listOk} className={btnPrimary}>
                  Selesai, kembali
                </button>
              </div>
            </>
          );
        })()}

        {/* ===== TINJAU ===== */}
        {step === 'review' && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Tanggal {draft.date}. Stok belum berubah sampai Anda menekan Konfirmasi simpan.
            </p>
            {large.length > 0 && (
              <p className="mb-4 p-3 bg-amber-50 text-amber-800 text-sm rounded-lg">
                Periksa jumlah besar: {large.join(', ')}.
              </p>
            )}

            {KINDS.map((k) => {
              const ls = draft[k];
              const isRetur = k === 'retur';
              return (
                <section key={k} className="mb-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-1">
                    {KIND_LABEL[k]} ({ls.length} jenis, {units(ls).toLocaleString('id-ID')} unit)
                  </h3>
                  <p className="text-xs text-gray-500 mb-2">
                    {isRetur
                      ? 'Tidak menambah stok. Dibuat sebagai permintaan retur ke supplier.'
                      : 'Menambah stok barang setelah disimpan.'}
                  </p>
                  <div className="border border-gray-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-600 font-semibold">
                        <tr>
                          <th className="px-4 py-3">Kode</th>
                          <th className="px-4 py-3">Nama Barang</th>
                          <th className="px-4 py-3 text-right">Jumlah</th>
                          {isRetur ? (
                            <>
                              <th className="px-4 py-3">Supplier</th>
                              <th className="px-4 py-3">Alasan</th>
                            </>
                          ) : (
                            <th className="px-4 py-3 text-right">Stok Setelah</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {ls.length === 0 && (
                          <tr><td colSpan={isRetur ? 5 : 4} className="px-4 py-6 text-center text-gray-400">Tidak ada data.</td></tr>
                        )}
                        {ls.map((l) => (
                          <tr key={l.itemId}>
                            <td className="px-4 py-3 font-mono text-xs">{l.code}</td>
                            <td className="px-4 py-3 font-bold">{l.name}</td>
                            <td className="px-4 py-3 text-right">{qtyOf(l).toLocaleString('id-ID')} {l.unit}</td>
                            {isRetur ? (
                              <>
                                <td className="px-4 py-3 text-gray-600">{supplierName(l.supplierId)}</td>
                                <td className="px-4 py-3 text-gray-600">{l.reason}</td>
                              </>
                            ) : (
                              <td className="px-4 py-3 text-right text-gray-600">
                                {l.stock.toLocaleString('id-ID')} → <span className="font-bold text-gray-900">{(l.stock + qtyOf(l)).toLocaleString('id-ID')}</span>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}

            {error && <p className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg" role="alert">{error}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => goTo('hub')} disabled={saving} className={btnGhost}>Kembali</button>
              <button type="button" onClick={submit} disabled={saving} className={btnPrimary}>
                {saving ? 'Menyimpan...' : 'Konfirmasi simpan'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}