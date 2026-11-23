export type OpnameDraftRow = { itemId: string; itemName: string; code: string | null; unit: string; category: string; price: number; stock: number; jumlah: string; keterangan: string };
export type OpnameDraft = { version: 1; month: string; year: string; rows: OpnameDraftRow[]; savedAt: string };

export const opnameDraftKey = (base: string, userId: number | undefined) => `stock-opname-draft:v1:${base}:${userId ?? 'current'}`;

export function readOpnameDraft(key: string): OpnameDraft | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const draft = JSON.parse(raw) as OpnameDraft;
  if (draft.version !== 1 || !/^\d+$/.test(draft.month) || Number(draft.month) < 1 || Number(draft.month) > 12 || !/^\d{4}$/.test(draft.year) || !Array.isArray(draft.rows) || typeof draft.savedAt !== 'string' || draft.rows.some((row) =>
    !row || typeof row.itemId !== 'string' || typeof row.itemName !== 'string' || typeof row.unit !== 'string' || typeof row.category !== 'string' || typeof row.jumlah !== 'string' || typeof row.keterangan !== 'string' || typeof row.stock !== 'number' || typeof row.price !== 'number' || (row.code !== null && typeof row.code !== 'string')
  )) throw new Error('Draft stok opname tidak dapat dibaca.');
  return draft;
}

export function writeOpnameDraft(key: string, draft: OpnameDraft) {
  localStorage.setItem(key, JSON.stringify(draft));
}

export function clearOpnameDraft(key: string) {
  localStorage.removeItem(key);
}
