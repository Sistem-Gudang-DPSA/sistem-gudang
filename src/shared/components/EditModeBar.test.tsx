import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import EditModeBar, { useBatchEdit } from './EditModeBar';

describe('useBatchEdit', () => {
  it('collects patches per row, drops a field set back to its original, and counts dirty rows', () => {
    const { result } = renderHook(() => useBatchEdit());
    act(() => result.current.set(1, 'name', 'Baru', 'Lama'));
    act(() => result.current.set(2, 'unit', 'pcs', 'lembar'));
    expect(result.current.dirty).toBe(2);
    expect(result.current.value(1, 'name', 'Lama')).toBe('Baru');
    act(() => result.current.set(1, 'name', 'Lama', 'Lama'));
    expect(result.current.dirty).toBe(1);
    expect(result.current.isDirty(1)).toBe(false);
  });

  it('save keeps only the rows that failed, with their message', async () => {
    const { result } = renderHook(() => useBatchEdit());
    act(() => result.current.set(1, 'name', 'A', 'x'));
    act(() => result.current.set(2, 'name', 'B', 'y'));
    const saver = vi.fn(async (id: number) => { if (id === 2) throw new Error('Nama sudah ada'); });
    const onSaved = vi.fn();
    await act(async () => { await result.current.save(saver, onSaved); });
    expect(saver).toHaveBeenCalledTimes(2);
    expect(result.current.patches).toEqual({ 2: { name: 'B' } });
    expect(result.current.errors).toEqual({ 2: 'Nama sudah ada' });
    expect(onSaved).toHaveBeenCalled();
  });

  it('asks before leaving edit mode with unsaved changes', () => {
    const { result } = renderHook(() => useBatchEdit());
    act(() => result.current.toggle());
    act(() => result.current.set(1, 'name', 'A', 'x'));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    act(() => result.current.toggle());
    expect(result.current.editing).toBe(true);
    confirm.mockReturnValue(true);
    act(() => result.current.toggle());
    expect(result.current.editing).toBe(false);
    expect(result.current.dirty).toBe(0);
    confirm.mockRestore();
  });
});

describe('EditModeBar', () => {
  it('shows Simpan with the count only in edit mode with changes, and Ctrl+S saves', () => {
    const onSave = vi.fn();
    const { rerender } = render(<EditModeBar editing={false} dirty={0} saving={false} onToggle={vi.fn()} onSave={onSave} onCancel={vi.fn()} />);
    expect(screen.getByText('Mode Edit')).toBeTruthy();
    expect(screen.queryByText(/Simpan/)).toBeNull();
    rerender(<EditModeBar editing dirty={3} saving={false} onToggle={vi.fn()} onSave={onSave} onCancel={vi.fn()} />);
    expect(screen.getByText('Simpan (3)')).toBeTruthy();
    expect(screen.getByText('Preview')).toBeTruthy();
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
