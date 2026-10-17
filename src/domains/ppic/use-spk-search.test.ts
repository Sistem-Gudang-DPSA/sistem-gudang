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
});
