import { describe, it, expect, vi } from 'vitest';
import { ApiError } from '@/shared/lib/api-client';
import { runPhotoBatches, type Progress } from './photo-batch';
import type { uploadItemPhotosBulk } from './api';

type Pair = { itemId: number; file: File };
type Upload = typeof uploadItemPhotosBulk;

const makePairs = (n: number): Pair[] =>
  Array.from({ length: n }, (_, i) => ({ itemId: i + 1, file: new File(['x'], `${i + 1}.png`, { type: 'image/png' }) }));

const allUploaded = (pairs: Pair[]) => ({
  uploaded: pairs.map((p) => ({ itemId: p.itemId, photo: { thumb: 't', display: 'd' } })),
  failed: [],
});

const asUpload = (fn: (pairs: Pair[]) => unknown) => fn as unknown as Upload;
const rateLimit = (retryAfter?: number) => new ApiError('Terlalu banyak permintaan', 429, undefined, retryAfter);

describe('runPhotoBatches', () => {
  it('sends 23 pairs as sequential chunks of 10, 10, 3 and marks all done', async () => {
    const upload = vi.fn(async (pairs: Pair[]) => allUploaded(pairs));
    const result = await runPhotoBatches(makePairs(23), { upload: upload as unknown as Upload, onProgress: () => {} });

    expect(upload.mock.calls.map(([pairs]) => pairs.length)).toEqual([10, 10, 3]);
    expect(result.every((s) => s.status === 'done')).toBe(true);
  });

  it('maps partial failures to Indonesian reasons and marks missing ids as no response', async () => {
    const upload = asUpload(() => ({
      uploaded: [{ itemId: 1, photo: { thumb: 't', display: 'd' } }],
      failed: [{ itemId: 2, reason: 'too_large' }],
    }));
    const result = await runPhotoBatches(makePairs(3), { upload, onProgress: () => {} });

    expect(result).toEqual([
      { itemId: 1, status: 'done' },
      { itemId: 2, status: 'failed', reason: 'Ukuran lebih dari 10 MB' },
      { itemId: 3, status: 'failed', reason: 'Tidak ada respons' },
    ]);
  });

  it('waits out a 429 using Retry-After, reports the wait, then retries the same chunk', async () => {
    const upload = vi.fn()
      .mockRejectedValueOnce(rateLimit(5))
      .mockImplementationOnce(async (pairs: Pair[]) => allUploaded(pairs));
    const sleep = vi.fn(async () => {});
    const progress: Progress[] = [];

    const result = await runPhotoBatches(makePairs(2), {
      upload: upload as unknown as Upload,
      sleep,
      now: () => 1000,
      onProgress: (p) => progress.push(p),
    });

    expect(sleep).toHaveBeenCalledWith(5000);
    expect(progress.some((p) => p.waitingUntil === 6000)).toBe(true);
    expect(progress.at(-1)?.waitingUntil).toBeNull();
    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload.mock.calls[1][0]).toEqual(upload.mock.calls[0][0]);
    expect(result.every((s) => s.status === 'done')).toBe(true);
  });

  it('fails the chunk after 4 consecutive 429s and continues with the next chunk', async () => {
    const upload = vi.fn()
      .mockRejectedValueOnce(rateLimit(1))
      .mockRejectedValueOnce(rateLimit(1))
      .mockRejectedValueOnce(rateLimit(1))
      .mockRejectedValueOnce(rateLimit(1))
      .mockImplementation(async (pairs: Pair[]) => allUploaded(pairs));
    const sleep = vi.fn(async () => {});

    const result = await runPhotoBatches(makePairs(11), {
      upload: upload as unknown as Upload,
      sleep,
      onProgress: () => {},
    });

    expect(sleep).toHaveBeenCalledTimes(3);
    expect(result.slice(0, 10).every((s) => s.status === 'failed' && s.reason === 'Batas server tercapai, coba ulang nanti')).toBe(true);
    expect(result[10]).toEqual({ itemId: 11, status: 'done' });
  });

  it('fails only the chunk that hit a generic error', async () => {
    const upload = vi.fn()
      .mockRejectedValueOnce(new Error('Jaringan putus'))
      .mockImplementation(async (pairs: Pair[]) => allUploaded(pairs));

    const result = await runPhotoBatches(makePairs(11), { upload: upload as unknown as Upload, onProgress: () => {} });

    expect(result.slice(0, 10).every((s) => s.status === 'failed' && s.reason === 'Jaringan putus')).toBe(true);
    expect(result[10].status).toBe('done');
  });

  it('stops at once when aborted during a 429 wait and sets the chunk back to pending', async () => {
    const controller = new AbortController();
    const upload = vi.fn().mockRejectedValue(rateLimit(300));

    const result = await runPhotoBatches(makePairs(3), {
      upload: upload as unknown as Upload,
      signal: controller.signal,
      onProgress: (p) => {
        if (p.waitingUntil !== null) controller.abort();
      },
    });

    expect(upload).toHaveBeenCalledTimes(1);
    expect(result.every((s) => s.status === 'pending')).toBe(true);
  });

  it('stops before the next chunk when aborted and leaves the rest pending', async () => {
    const controller = new AbortController();
    const upload = vi.fn(async (pairs: Pair[]) => {
      controller.abort();
      return allUploaded(pairs);
    });

    const result = await runPhotoBatches(makePairs(15), {
      upload: upload as unknown as Upload,
      signal: controller.signal,
      onProgress: () => {},
    });

    expect(upload).toHaveBeenCalledTimes(1);
    expect(result.slice(0, 10).every((s) => s.status === 'done')).toBe(true);
    expect(result.slice(10).every((s) => s.status === 'pending')).toBe(true);
  });
});
