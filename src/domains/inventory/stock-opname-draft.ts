export type OpnameDraftRow = { itemId: string; itemName: string; code: string | null; unit: string; category: string; price: number; stock: number; jumlah: string; keterangan: string };
export type OpnameDraft = { version: 1; month: string; year: string; rows: OpnameDraftRow[]; savedAt: string };

export const opnameDraftKey = (base: string, userId: number | undefined) => `stock-opname-draft:v1:${base}:${userId ?? 'current'}`;

export type SavedOpnameDraft = OpnameDraft & { id: string };

const storageKey = (key: string, id: string) => id === 'legacy' ? key : `${key}:draft:${encodeURIComponent(id)}`;

export function readOpnameDraft(key: string, id: string): OpnameDraft | null {
  const raw = localStorage.getItem(storageKey(key, id));
  if (!raw) return null;
  const draft = JSON.parse(raw) as OpnameDraft;
  if (!draft || draft.version !== 1 || !/^\d+$/.test(draft.month) || Number(draft.month) < 1 || Number(draft.month) > 12 || !/^\d{4}$/.test(draft.year) || !Array.isArray(draft.rows) || typeof draft.savedAt !== 'string' || !Number.isFinite(Date.parse(draft.savedAt)) || draft.rows.some((row) =>
    !row || typeof row.itemId !== 'string' || typeof row.itemName !== 'string' || typeof row.unit !== 'string' || typeof row.category !== 'string' || typeof row.jumlah !== 'string' || typeof row.keterangan !== 'string' || typeof row.stock !== 'number' || typeof row.price !== 'number' || (row.code !== null && typeof row.code !== 'string')
  )) throw new Error('Draft stok opname tidak dapat dibaca.');
  return draft;
}

export function writeOpnameDraft(key: string, id: string, draft: OpnameDraft) {
  localStorage.setItem(storageKey(key, id), JSON.stringify(draft));
}

export function clearOpnameDraft(key: string, id: string) {
  localStorage.removeItem(storageKey(key, id));
}

// Keep each draft in its own entry so saving another form cannot replace it.
// The former single-draft entry remains readable without a destructive migration.
export function listOpnameDrafts(key: string): { drafts: SavedOpnameDraft[]; errors: string[] } {
  const ids = new Set<string>();
  const prefix = `${key}:draft:`;
  const errors: string[] = [];
  if (localStorage.getItem(key) !== null) ids.add('legacy');
  for (let index = 0; index < localStorage.length; index++) {
    const entry = localStorage.key(index);
    if (entry?.startsWith(prefix)) {
      try { ids.add(decodeURIComponent(entry.slice(prefix.length))); } catch {
        errors.push('Identitas salah satu draft tidak dapat dibaca. Data tetap disimpan di browser.');
      }
    }
  }
  const drafts: SavedOpnameDraft[] = [];
  for (const id of ids) {
    try {
      const draft = readOpnameDraft(key, id);
      if (draft) drafts.push({ ...draft, id });
    } catch {
      errors.push(`Draft ${id === 'legacy' ? 'lama' : id} tidak dapat dibaca. Data tetap disimpan di browser.`);
    }
  }
  drafts.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  return { drafts, errors };
}
