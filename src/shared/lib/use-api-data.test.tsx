import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from './api-client';
import { useApiData } from './use-api-data';

function Probe({ fetcher, k, msg }: { fetcher: () => Promise<string>; k: string; msg?: string }) {
  const { data, loading, error, reload } = useApiData(fetcher, k, msg);
  return (
    <div>
      <span data-testid="state">{loading ? 'loading' : 'idle'}</span>
      <span data-testid="data">{data ?? ''}</span>
      <span data-testid="error">{error}</span>
      <button onClick={reload}>reload</button>
    </div>
  );
}
const text = (id: string) => screen.getByTestId(id).textContent;

describe('useApiData', () => {
  it('loads data', async () => {
    render(<Probe fetcher={() => Promise.resolve('hello')} k="a" />);
    expect(text('state')).toBe('loading');
    await waitFor(() => expect(text('state')).toBe('idle'));
    expect(text('data')).toBe('hello');
    expect(text('error')).toBe('');
  });

  it('shows ApiError message', async () => {
    render(<Probe fetcher={() => Promise.reject(new ApiError('Tidak boleh', 403))} k="a" />);
    await waitFor(() => expect(text('error')).toBe('Tidak boleh'));
  });

  it('shows fallback message for other errors (default and custom)', async () => {
    const { unmount } = render(<Probe fetcher={() => Promise.reject(new Error('boom'))} k="a" />);
    await waitFor(() => expect(text('error')).toBe('Gagal memuat data.'));
    unmount();
    render(<Probe fetcher={() => Promise.reject(new Error('boom'))} k="a" msg="Custom gagal" />);
    await waitFor(() => expect(text('error')).toBe('Custom gagal'));
  });

  it('reload re-fetches', async () => {
    let n = 0;
    const fetcher = vi.fn(() => Promise.resolve(`v${++n}`));
    render(<Probe fetcher={fetcher} k="a" />);
    await waitFor(() => expect(text('data')).toBe('v1'));
    fireEvent.click(screen.getByText('reload'));
    await waitFor(() => expect(text('data')).toBe('v2'));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('refetches when key changes and ignores the stale response', async () => {
    const resolvers: Record<string, (v: string) => void> = {};
    const mk = (name: string) => () => new Promise<string>((r) => (resolvers[name] = r));
    const { rerender } = render(<Probe fetcher={mk('one')} k="one" />);
    rerender(<Probe fetcher={mk('two')} k="two" />);
    await waitFor(() => expect(resolvers.two).toBeDefined());
    await act(async () => resolvers.two('second'));
    await waitFor(() => expect(text('data')).toBe('second'));
    await act(async () => resolvers.one('first'));
    expect(text('data')).toBe('second');
    expect(text('state')).toBe('idle');
  });

  it('is loading again after key change', async () => {
    const { rerender } = render(<Probe fetcher={() => Promise.resolve('a')} k="a" />);
    await waitFor(() => expect(text('state')).toBe('idle'));
    rerender(<Probe fetcher={() => new Promise<string>(() => {})} k="b" />);
    expect(text('state')).toBe('loading');
    expect(text('error')).toBe('');
  });
});
