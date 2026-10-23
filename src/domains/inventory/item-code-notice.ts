// Kode barang bisa berubah saat kategorinya diganti: BE memberi kode baru dari prefix kategori baru bila barang belum punya transaksi.
export type CodeChange = { from: string | null; to: string | null };

export function kodeKategoriNotice(changes: CodeChange[]): string {
  const changed = changes.filter((c) => c.from !== c.to);
  const kept = changes.filter((c) => c.from !== null && c.from === c.to);
  const parts: string[] = [];
  if (changed.length === 1) {
    parts.push(`Kode barang berubah dari ${changed[0].from ?? '-'} menjadi ${changed[0].to ?? '-'}. Cetak ulang label barang ini.`);
  } else if (changed.length > 1) {
    const list = changed.map((c) => `${c.from ?? '-'} menjadi ${c.to ?? '-'}`).join(', ');
    parts.push(`${changed.length} kode barang berubah: ${list}. Cetak ulang label barang tersebut.`);
  }
  if (kept.length) parts.push(`Kode barang tetap ${kept.map((c) => c.from).join(', ')} karena barang sudah punya transaksi.`);
  return parts.join(' ');
}
