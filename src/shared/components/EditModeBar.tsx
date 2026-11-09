"use client";

import { useEffect, useState } from "react";
import { Eye, Pencil } from "lucide-react";
import { ApiError } from "@/shared/lib/api-client";

type Patch = Record<string, string>;

// Mode edit/preview untuk tabel master. Perubahan ditampung per baris (id -> field -> nilai baru) dan
// disimpan sekaligus; baris yang gagal tetap tertampung beserta pesan errornya.
export function useBatchEdit() {
  const [editing, setEditing] = useState(false);
  const [patches, setPatches] = useState<Record<number, Patch>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  const dirty = Object.keys(patches).length;
  const isDirty = (id: number) => id in patches;
  // nilai yang ditampilkan: perubahan yang belum disimpan, kalau tidak ada nilai aslinya
  const value = (id: number, key: string, original: string) => patches[id]?.[key] ?? original;
  const set = (id: number, key: string, next: string, original: string) =>
    setPatches((prev) => {
      const row = { ...prev[id] };
      if (next === original) delete row[key];
      else row[key] = next;
      const out = { ...prev };
      if (Object.keys(row).length) out[id] = row;
      else delete out[id];
      return out;
    });

  const cancel = () => {
    setPatches({});
    setErrors({});
  };
  const toggle = () => {
    if (editing && dirty > 0 && !window.confirm("Ada perubahan yang belum disimpan. Buang perubahan?")) return;
    cancel();
    setEditing((e) => !e);
  };

  // saver menyimpan satu baris; baris yang berhasil dikeluarkan dari tampungan
  const save = async (saver: (id: number, patch: Patch) => Promise<void>, onSaved: () => void) => {
    setSaving(true);
    const failed: Record<number, string> = {};
    const kept: Record<number, Patch> = {};
    for (const [key, patch] of Object.entries(patches)) {
      const id = Number(key);
      try {
        await saver(id, patch);
      } catch (err) {
        failed[id] = err instanceof ApiError || err instanceof Error ? err.message : "Gagal menyimpan.";
        kept[id] = patch;
      }
    }
    setPatches(kept);
    setErrors(failed);
    setSaving(false);
    onSaved();
  };

  return { editing, toggle, patches, dirty, isDirty, value, set, errors, saving, save, cancel };
}

type BarProps = { editing: boolean; dirty: number; saving: boolean; onToggle: () => void; onSave: () => void; onCancel: () => void };

export default function EditModeBar({ editing, dirty, saving, onToggle, onSave, onCancel }: BarProps) {
  // Ctrl+S menyimpan saat ada perubahan (keyboard-first)
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty > 0 && !saving) onSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, dirty, saving, onSave]);

  return (
    <div className="flex items-center gap-2">
      {editing && dirty > 0 && (
        <>
          <button type="button" onClick={onSave} disabled={saving} className="px-4 py-2 bg-[#FF8A00] text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-60">
            {saving ? "Menyimpan..." : `Simpan (${dirty})`}
          </button>
          <button type="button" onClick={onCancel} disabled={saving} className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Batal</button>
        </>
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={editing}
        className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${editing ? "bg-orange-50 border-orange-300 text-orange-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
      >
        {editing ? <Eye className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
        <span>{editing ? "Preview" : "Mode Edit"}</span>
      </button>
    </div>
  );
}
