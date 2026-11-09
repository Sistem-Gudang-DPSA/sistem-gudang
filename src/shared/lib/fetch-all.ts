// Ambil semua halaman dari endpoint berhalaman sampai total terpenuhi.
export async function fetchAll<T>(fetchPage: (page: number) => Promise<{ rows: T[]; total: number }>) {
  const all: T[] = [];
  for (let page = 1; ; page++) {
    const res = await fetchPage(page);
    all.push(...res.rows);
    if (res.rows.length === 0 || all.length >= res.total) return all;
  }
}
