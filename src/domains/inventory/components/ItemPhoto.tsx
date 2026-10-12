"use client";

import React, { useRef, useState } from 'react';
import { ImageOff, Upload, X } from 'lucide-react';
import { uploadItemPhoto } from '@/domains/inventory/api';
import { ApiError, fileUrl } from '@/shared/lib/api-client';

export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

// Ditolak di sisi klien sebelum dikirim; backend tetap memvalidasi ulang.
export function photoError(file: File): string | null {
  if (!PHOTO_TYPES.includes(file.type)) return 'Foto harus berformat JPG, PNG, atau WEBP.';
  if (file.size > PHOTO_MAX_BYTES) return 'Ukuran foto maksimal 2 MB.';
  return null;
}

type Props = {
  item: { id: number; name: string; photoUrl?: string | null };
  // Hanya layar Superadmin dan PPIC yang mengisi ini; divisi lain cuma bisa melihat foto.
  canUpload?: boolean;
  onUploaded?: () => void;
};

// Sel kolom Foto di tabel Data Barang: thumbnail yang bisa diperbesar, plus tombol upload/ganti bila diizinkan.
export default function ItemPhoto({ item, canUpload = false, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const src = item.photoUrl ? fileUrl(item.photoUrl) : null;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // supaya file yang sama bisa dipilih lagi
    if (!file) return;
    const invalid = photoError(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setUploading(true);
    setError('');
    try {
      await uploadItemPhoto(item.id, file);
      onUploaded?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mengunggah foto.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {src ? (
        <button type="button" onClick={() => setPreview(true)} title={`Lihat foto ${item.name}`} className="shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 hover:ring-2 hover:ring-[#FF8A00]/40 transition">
          {/* eslint-disable-next-line @next/next/no-img-element -- foto dilayani oleh host API, bukan aset Next */}
          <img src={src} alt={`Foto ${item.name}`} loading="lazy" className="w-full h-full object-cover" />
        </button>
      ) : (
        <div className="shrink-0 w-12 h-12 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300" title="Belum ada foto">
          <ImageOff className="w-5 h-5" aria-label={`Belum ada foto ${item.name}`} />
        </div>
      )}

      {canUpload && (
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-60 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading ? 'Mengunggah...' : src ? 'Ganti' : 'Upload'}
          </button>
          <input ref={inputRef} type="file" accept={PHOTO_TYPES.join(',')} className="hidden" aria-label={`Upload foto ${item.name}`} onChange={handleFile} />
          {error && <span className="text-xs text-red-600 mt-0.5 max-w-40 whitespace-normal">{error}</span>}
        </div>
      )}

      {preview && src && (
        <div role="dialog" aria-label={`Foto ${item.name}`} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setPreview(false)}>
          <div className="relative bg-white rounded-2xl p-3 shadow-2xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setPreview(false)} aria-label="Tutup foto" className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 text-gray-500 hover:text-gray-800 shadow">
              <X className="w-4 h-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element -- foto dilayani oleh host API, bukan aset Next */}
            <img src={src} alt={`Foto ${item.name}`} className="w-full max-h-[75vh] object-contain rounded-xl" />
            <p className="mt-2 text-sm font-semibold text-gray-700 text-center whitespace-normal">{item.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}
