import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSelection } from './use-selection';

describe('useSelection', () => {
  it('keeps the selection across pages but empties it when resetKey changes', () => {
    const { result, rerender } = renderHook(({ key }) => useSelection<{ id: number }>(key), { initialProps: { key: 'a' } });
    act(() => result.current.toggle({ id: 1 }));
    act(() => result.current.toggleMany([{ id: 2 }, { id: 3 }]));
    expect(result.current.size).toBe(3);
    rerender({ key: 'b' });
    expect(result.current.size).toBe(0);
    act(() => result.current.toggle({ id: 4 }));
    expect(result.current.rows).toEqual([{ id: 4 }]);
  });
});
