// Fetches every page of a paged endpoint. The first page gives the total; the rest
// are fetched with at most `concurrency` requests in flight, so a big list does not
// fire dozens of requests at once (backend rate limit). Rows keep page order.

export type PageResult<T> = { rows: T[]; total: number };

export type AllPagesResult<T, M = unknown> = { rows: T[]; total: number; first: PageResult<T> & M };

// Same as fetchAllPages, but also returns the first page envelope (summary, filteredSummary, ...).
export async function fetchAllPagesResult<T, M = unknown>(
  load: (page: number, pageSize: number) => Promise<PageResult<T> & M>,
  pageSize = 100,
  concurrency = 4,
): Promise<AllPagesResult<T, M>> {
  const first = await load(1, pageSize);
  const pages = Math.ceil(first.total / pageSize);
  const results: T[][] = [first.rows];
  let next = 2;
  const worker = async () => {
    while (next <= pages) {
      const page = next++;
      results[page - 1] = (await load(page, pageSize)).rows;
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(0, pages - 1)) }, worker));
  return { rows: results.flat(), total: first.total, first };
}

export async function fetchAllPages<T>(
  load: (page: number, pageSize: number) => Promise<{ rows: T[]; total: number }>,
  pageSize = 100,
  concurrency = 4,
): Promise<T[]> {
  return (await fetchAllPagesResult(load, pageSize, concurrency)).rows;
}
