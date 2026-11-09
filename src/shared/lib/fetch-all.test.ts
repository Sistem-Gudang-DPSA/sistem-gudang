import { describe, expect, it } from 'vitest';
import { fetchAllPages } from './fetch-all';

// 10 rows, page size 2: five pages answered out of order with a small delay.
const pager = (total: number) => {
  let inFlight = 0;
  let peak = 0;
  const calls: number[] = [];
  const load = async (page: number, size: number) => {
    calls.push(page);
    inFlight++;
    peak = Math.max(peak, inFlight);
    await new Promise((r) => setTimeout(r, (7 - page) % 3));
    inFlight--;
    const start = (page - 1) * size;
    return { rows: Array.from({ length: Math.max(0, Math.min(size, total - start)) }, (_, i) => start + i), total };
  };
  return { load, calls, peak: () => peak };
};

describe('fetchAllPages', () => {
  it('returns every row in page order', async () => {
    const p = pager(10);
    expect(await fetchAllPages(p.load, 2)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect([...p.calls].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('keeps at most `concurrency` requests in flight', async () => {
    const p = pager(40);
    await fetchAllPages(p.load, 2, 3);
    expect(p.peak()).toBe(3);
  });

  it('makes one call for an empty or single-page result', async () => {
    const empty = pager(0);
    expect(await fetchAllPages(empty.load, 2)).toEqual([]);
    expect(empty.calls).toEqual([1]);
  });

  it('rejects when a page fails', async () => {
    const load = async (page: number) => {
      if (page === 3) throw new Error('boom');
      return { rows: [page], total: 5 };
    };
    await expect(fetchAllPages(load, 1)).rejects.toThrow('boom');
  });
});
