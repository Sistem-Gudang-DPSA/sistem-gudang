import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import SortableTh, { useSort } from './SortableTh';

describe('useSort', () => {
  it('cycles asc, desc, then back to the default order; a new column starts at asc', () => {
    const { result } = renderHook(() => useSort());
    expect(result.current.params).toEqual({});
    act(() => result.current.toggle('name'));
    expect(result.current.params).toEqual({ sortBy: 'name', sortDir: 'asc' });
    act(() => result.current.toggle('name'));
    expect(result.current.params).toEqual({ sortBy: 'name', sortDir: 'desc' });
    act(() => result.current.toggle('name'));
    expect(result.current.params).toEqual({});
    act(() => result.current.toggle('name'));
    act(() => result.current.toggle('price'));
    expect(result.current.sort).toEqual({ by: 'price', dir: 'asc' });
  });
});

describe('SortableTh', () => {
  it('reports aria-sort for the active column only and calls onSort with its key', () => {
    let clicked = '';
    render(<table><thead><tr>
      <SortableTh label="Nama" sortKey="name" sort={{ by: 'name', dir: 'desc' }} onSort={(k) => { clicked = k; }} />
      <SortableTh label="Harga" sortKey="price" sort={{ by: 'name', dir: 'desc' }} onSort={() => {}} />
    </tr></thead></table>);
    expect(screen.getByText('Nama').closest('th')!.getAttribute('aria-sort')).toBe('descending');
    expect(screen.getByText('Harga').closest('th')!.getAttribute('aria-sort')).toBe('none');
    fireEvent.click(screen.getByText('Nama'));
    expect(clicked).toBe('name');
  });
});
