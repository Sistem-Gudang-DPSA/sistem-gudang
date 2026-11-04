export async function fetchAllPages<T>(
  load: (page: number, pageSize: number) => Promise<{ rows: T[]; total: number }>,
  pageSize = 100,
): Promise<T[]> {
  const first = await load(1, pageSize);
  const pages = Math.ceil(first.total / pageSize);
  const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => load(i + 2, pageSize)));
  return [first, ...rest].flatMap((r) => r.rows);
}