"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Check, Upload, X } from 'lucide-react';
import { runPhotoBatches, type PairState, type Progress } from '@/domains/inventory/photo-batch';
import { PHOTO_TYPES, photoError } from '@/domains/inventory/components/ItemPhoto';
import { fileUrl } from '@/shared/lib/api-client';

type Item = { id: number; code: string | null; name: string; photo?: { thumb: string; display: string } | null };
type Entry = { file: File; url: string };
type Props = { items: Item[]; onClose: () => void; onDone: () => void };

const baseName = (name: string) => name.replace(/\.[^.]+$/, '').trim().toLowerCase();
const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

function StatusChip({ s }: { s: PairState }) {
  const cls =
    s.status === 'done' ? 'bg-green-50 text-green-700'
    : s.status === 'failed' ? 'bg-red-50 text-red-600'
    : s.status === 'uploading' ? 'bg-orange-50 text-orange-700'
    : 'bg-gray-100 text-gray-600';
  const label =
    s.status === 'done' ? 'Berhasil'
    : s.status === 'failed' ? `Gagal: ${s.reason}`
    : s.status === 'uploading' ? 'Mengunggah'
    : 'Menunggu';
  return <span className={`inline-flex mt-1 px-2 py-0.5 rounded-md text-xs font-medium ${cls}`}>{label}</span>;
}

// Pilih foto di kiri, pasangkan ke barang di kanan, lalu unggah per batch. Hasil tetap tampil sampai ditutup.
export default function BulkPhotoModal({ items, onClose, onDone }: Props) {
  const [files, setFiles] = useState<Map<string, Entry>>(new Map());
  const [pairs, setPairs] = useState<Map<number, string>>(new Map()); // itemId -> file key
  const [selected, setSelected] = useState<string | null>(null);
  const [rejected, setRejected] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<Map<number, PairState>>(new Map());
  const [progress, setProgress] = useState<Progress | null>(null);
  const [running, setRunning] = useState(false);
  const [nowTick, setNowTick] = useState(0);
  const seq = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const urlsRef = useRef(new Set<string>());

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      abortRef.current?.abort();
      urls.forEach((u) => URL.revokeObjectURL(u));
      urls.clear();
    };
  }, []);

  const waiting = progress?.waitingUntil ?? null;
  useEffect(() => {
    if (waiting === null) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [waiting]);

  const dropStatus = (ids: number[]) =>
    setStatuses((prev) => {
      const next = new Map(prev);
      for (const id of ids) next.delete(id);
      return next;
    });

  const addFiles = (list: FileList | File[]) => {
    if (running) return;
    const rej: string[] = [];
    const next = new Map(files);
    for (const file of Array.from(list)) {
      if (photoError(file)) {
        rej.push(`${file.name} (${PHOTO_TYPES.includes(file.type) ? '> 10 MB' : 'format'})`);
        continue;
      }
      const url = URL.createObjectURL(file);
      urlsRef.current.add(url);
      next.set(`f${seq.current++}`, { file, url });
    }
    setFiles(next);
    setRejected(rej);
  };

  const removeFile = (key: string) => {
    const entry = files.get(key);
    if (!entry) return;
    URL.revokeObjectURL(entry.url);
    urlsRef.current.delete(entry.url);
    const owners = [...pairs].filter(([, k]) => k === key).map(([id]) => id);
    setFiles((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
    setPairs((prev) => {
      const next = new Map(prev);
      for (const id of owners) next.delete(id);
      return next;
    });
    dropStatus(owners);
    setSelected((s) => (s === key ? null : s));
  };

  const pairTo = (itemId: number, key: string) => {
    if (running) return;
    const owners = [...pairs].filter(([id, k]) => k === key || id === itemId).map(([id]) => id);
    setPairs((prev) => {
      const next = new Map(prev);
      for (const [id, k] of prev) if (k === key) next.delete(id);
      next.set(itemId, key);
      return next;
    });
    dropStatus([itemId, ...owners]);
  };

  const unpair = (itemId: number) => {
    if (running) return;
    setPairs((prev) => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
    dropStatus([itemId]);
  };

  const applyPairs = (entries: [number, string][]) => {
    if (entries.length === 0) return;
    setPairs((prev) => {
      const next = new Map(prev);
      for (const [id, key] of entries) next.set(id, key);
      return next;
    });
    dropStatus(entries.map(([id]) => id));
  };

  const pairSequential = () => {
    const used = new Set(pairs.values());
    const freeKeys = [...files.keys()].filter((k) => !used.has(k));
    const freeRows = items.filter((i) => !pairs.has(i.id));
    const n = Math.min(freeKeys.length, freeRows.length);
    applyPairs(Array.from({ length: n }, (_, i): [number, string] => [freeRows[i].id, freeKeys[i]]));
  };

  const matchCode = () => {
    const used = new Set(pairs.values());
    const entries: [number, string][] = [];
    for (const item of items) {
      if (pairs.has(item.id) || !item.code) continue;
      const code = item.code.trim().toLowerCase();
      const hit = [...files].find(
        ([k, e]) => !used.has(k) && !entries.some(([, ek]) => ek === k) && baseName(e.file.name) === code,
      );
      if (hit) entries.push([item.id, hit[0]]);
    }
    applyPairs(entries);
  };

  const clearAll = () => {
    if (running) return;
    setPairs(new Map());
    setStatuses(new Map());
    setSelected(null);
  };

  const onSlot = (itemId: number) => {
    if (running || !selected) return;
    pairTo(itemId, selected);
    setSelected(null);
  };

  const start = async (onlyIds?: number[]) => {
    const only = onlyIds ? new Set(onlyIds) : null;
    const list = [...pairs]
      .filter(([id]) => (only ? only.has(id) : statuses.get(id)?.status !== 'done'))
      .map(([itemId, key]) => ({ itemId, file: files.get(key)!.file }));
    if (list.length === 0) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    await runPhotoBatches(list, {
      signal: controller.signal,
      onProgress: (p) => {
        setProgress(p);
        setStatuses((prev) => {
          const next = new Map(prev);
          for (const s of p.pairs) next.set(s.itemId, s);
          return next;
        });
        if (p.waitingUntil !== null) setNowTick(Date.now());
      },
    });
    abortRef.current = null;
    setRunning(false);
    onDone();
  };

  const pairedCount = items.filter((i) => pairs.has(i.id)).length;
  const pendingCount = [...pairs.keys()].filter((id) => statuses.get(id)?.status !== 'done').length;
  const failedIds = [...statuses.values()].filter((s) => s.status === 'failed' && pairs.has(s.itemId)).map((s) => s.itemId);
  const total = progress?.pairs.length ?? 0;
  const finished = progress?.pairs.filter((p) => p.status === 'done' || p.status === 'failed').length ?? 0;
  const pairedKeys = new Set(pairs.values());
  const remaining = waiting === null ? 0 : Math.max(0, Math.ceil((waiting - nowTick) / 1000));
  const pct = total ? (finished / total) * 100 : 0;
  const btnTool = 'px-3 py-1.5 border border-gray-200 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors';

  return (
    <div role="dialog" aria-modal="true" aria-label="Pasang Foto Massal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Pasang Foto Massal</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-6 flex-1 min-h-0 overflow-hidden">
          {/* Kiri: foto */}
          <section className="flex flex-col min-h-0">
            <h3 className="font-semibold text-gray-800 mb-3">Foto</h3>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
              className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center bg-gray-50/50"
            >
              <p className="text-sm text-gray-500 mb-3">Seret foto ke sini (JPG, PNG, WEBP, maks 10 MB per foto)</p>
              <button
                type="button"
                disabled={running}
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-sm font-semibold hover:bg-orange-100 disabled:opacity-60 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Pilih foto
              </button>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={PHOTO_TYPES.join(',')}
                className="hidden"
                aria-label="Pilih file foto"
                disabled={running}
                onChange={(e) => { addFiles(e.target.files ?? []); e.target.value = ''; }}
              />
              {rejected.length > 0 && (
                <p className="text-sm text-red-600 mt-3">{`${rejected.length} ditolak: ${rejected.join(', ')}`}</p>
              )}
            </div>

            {files.size === 0 ? (
              <p className="text-sm text-gray-400 mt-4">Belum ada foto.</p>
            ) : (
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-3 overflow-y-auto min-h-0">
                {[...files].map(([key, { file, url }]) => {
                  const paired = pairedKeys.has(key);
                  const isSel = selected === key;
                  return (
                    <div
                      key={key}
                      draggable={!running}
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', key)}
                      onClick={() => !running && setSelected(isSel ? null : key)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (!running) setSelected(isSel ? null : key);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSel}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer bg-gray-50 ${isSel ? 'border-[#FF8A00] ring-2 ring-[#FF8A00]/30' : 'border-gray-200'} ${paired ? 'opacity-40' : ''}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- blob URL lokal, bukan aset Next */}
                      <img src={url} alt={file.name} loading="lazy" className="w-full h-full object-cover" />
                      {paired && (
                        <span className="absolute bottom-1 left-1 bg-white rounded-full p-0.5 text-green-600 shadow">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                      <button
                        type="button"
                        aria-label={`Hapus ${file.name}`}
                        disabled={running}
                        onClick={(e) => { e.stopPropagation(); removeFile(key); }}
                        className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-white/90 text-gray-600 hover:text-red-600 shadow disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Kanan: barang terpilih */}
          <section className="flex flex-col min-h-0">
            <h3 className="font-semibold text-gray-800 mb-3">{`Barang terpilih (${items.length})`}</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              <button type="button" className={btnTool} disabled={running || files.size === 0} onClick={pairSequential}>Pasangkan berurutan</button>
              <button type="button" className={btnTool} disabled={running || files.size === 0} onClick={matchCode}>Cocokkan kode</button>
              <button type="button" className={btnTool} disabled={running || pairs.size === 0} onClick={clearAll}>Lepas semua</button>
            </div>
            <ul className="space-y-2 overflow-y-auto min-h-0 pr-1">
              {items.map((item) => {
                const key = pairs.get(item.id);
                const paired = key !== undefined ? files.get(key) : undefined;
                const s = statuses.get(item.id);
                return (
                  <li key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono text-gray-500">{item.code ?? '—'}</p>
                      <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                      {item.photo && (
                        <p className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          {/* eslint-disable-next-line @next/next/no-img-element -- foto dilayani oleh host API, bukan aset Next */}
                          <img src={fileUrl(item.photo.thumb)} alt="" loading="lazy" className="w-8 h-8 rounded-md object-cover border border-gray-200" />
                          akan diganti
                        </p>
                      )}
                      {s && <StatusChip s={s} />}
                    </div>
                    <div
                      role="button"
                      tabIndex={running ? -1 : 0}
                      aria-label={`Slot foto ${item.name}`}
                      onClick={() => onSlot(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSlot(item.id);
                        }
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const k = e.dataTransfer.getData('text/plain');
                        if (files.has(k)) pairTo(item.id, k);
                      }}
                      className={`relative shrink-0 w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center text-xs text-center overflow-hidden ${selected && !paired ? 'border-[#FF8A00] bg-orange-50 text-orange-700 cursor-pointer' : 'border-gray-200 bg-gray-50 text-gray-400'} ${running ? 'pointer-events-none' : ''}`}
                    >
                      {paired ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element -- blob URL lokal, bukan aset Next */}
                          <img src={paired.url} alt={paired.file.name} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            aria-label={`Lepas foto ${item.name}`}
                            disabled={running}
                            onClick={(e) => { e.stopPropagation(); unpair(item.id); }}
                            className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-white/90 text-gray-600 hover:text-red-600 shadow disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        'Seret atau klik foto'
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-6 bg-gray-50/50 space-y-3">
          <div className="flex items-center justify-between text-sm gap-3">
            <p className="text-gray-700">{`${pairedCount} dari ${items.length} barang dipasangi foto`}</p>
            {progress && progress.totalBatches > 0 && (
              <p className="text-gray-500">{`Batch ${progress.batch + 1} dari ${progress.totalBatches}`}</p>
            )}
          </div>
          <div role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={finished} className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#FF8A00] transition-all" style={{ width: `${pct}%` }} />
          </div>
          {waiting !== null && (
            <p className="text-sm text-amber-700">{`Menunggu batas server, lanjut dalam ${fmt(remaining)}`}</p>
          )}
          <div className="flex justify-end gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => (running ? abortRef.current?.abort() : onClose())}
              className="px-5 py-2 border border-orange-500 text-orange-500 font-medium rounded-xl hover:bg-orange-50 transition-colors text-sm"
            >
              Batal
            </button>
            {failedIds.length > 0 && !running && (
              <button
                type="button"
                onClick={() => start(failedIds)}
                className="px-5 py-2 border border-red-500 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors text-sm"
              >
                Coba ulang yang gagal
              </button>
            )}
            {progress && !running && (
              <button type="button" onClick={onClose} className="px-5 py-2 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition-colors text-sm">
                Tutup
              </button>
            )}
            <button
              type="button"
              onClick={() => start()}
              disabled={running || pendingCount === 0}
              className="px-5 py-2.5 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/30 transition-all text-sm disabled:opacity-60"
            >
              Mulai Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
