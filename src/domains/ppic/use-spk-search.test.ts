import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { listTrackingSpk } from '@/domains/ppic/api';
import { useSpkSearch } from './use-spk-search';

vi.mock('@/domains/ppic/api', () => ({
  listTrackingSpk: vi.fn(async () => [{ noSpk: 'SPK-1', client: 'Klien 1' }]),
  getTrackingSpk: vi.fn(),
}));

describe('useSpkSearch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends the typed text to listTrackingSpk after the debounce, with limit 50', async () => {
    const { result } = renderHook(() => useSpkSearch(''));
    await waitFor(() => expect(result.current.options).toEqual([{ noSpk: 'SPK-1', client: 'Klien 1' }]));
    act(() => result.current.onSearch(' maju '));
    expect(listTrackingSpk).not.toHaveBeenCalledWith('maju', 50, undefined);
    await waitFor(() => expect(listTrackingSpk).toHaveBeenCalledWith('maju', 50, undefined));
  });

  it('only offers SPKs belonging to the selected client', async () => {
    vi.mocked(listTrackingSpk).mockResolvedValueOnce([
      { noSpk: 'SPK-1', client: 'Klien 1' },
      { noSpk: 'SPK-2', client: 'Klien 2' },
    ]);
    const { result } = renderHook(() => useSpkSearch('', 'Klien 1'));
    await waitFor(() => expect(result.current.options).toEqual([{ noSpk: 'SPK-1', client: 'Klien 1' }]));
    expect(listTrackingSpk).toHaveBeenCalledWith(undefined, 50, 'Klien 1');
  });

  it('hides the old client SPKs immediately while the new client loads', async () => {
    const { result, rerender } = renderHook(({ client }) => useSpkSearch('', client), {
      initialProps: { client: 'Klien 1' },
    });
    await waitFor(() => expect(result.current.options).toHaveLength(1));
    vi.mocked(listTrackingSpk).mockImplementationOnce(() => new Promise(() => {}));
    rerender({ client: 'Klien 2' });
    expect(result.current.options).toEqual([]);
    rerender({ client: '' });
    expect(result.current.options).toEqual([]);
  });
});
