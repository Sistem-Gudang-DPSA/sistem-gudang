import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import BatchLokasiModal from './BatchLokasiModal';

const setup = () => render(<BatchLokasiModal onClose={vi.fn()} onSaved={vi.fn()} />);
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('BatchLokasiModal', () => {
  it('clamps huge numbers to 99 and does not build a million rows', () => {
    setup();
    type('Rak', 'A');
    type('Kolom sampai', '999999');
    type('Baris sampai', '999999');
    expect((screen.getByLabelText('Kolom sampai') as HTMLInputElement).value).toBe('999999');
    expect(screen.getByText('Preview (0 lokasi)')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toMatch(/Terlalu banyak lokasi/);
    expect((screen.getByRole('button', { name: /Simpan/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('lets a field be cleared while typing and disables Simpan until it has a number', () => {
    setup();
    type('Rak', 'A');
    expect(screen.getByText('Preview (1 lokasi)')).toBeTruthy();
    type('Kolom sampai', '');
    expect((screen.getByLabelText('Kolom sampai') as HTMLInputElement).value).toBe('');
    expect(screen.getByText('Preview (0 lokasi)')).toBeTruthy();
    expect((screen.getByRole('button', { name: /Simpan/ }) as HTMLButtonElement).disabled).toBe(true);
    type('Kolom sampai', '3');
    expect(screen.getByText('Preview (3 lokasi)')).toBeTruthy();
  });

  it('names the ignored rak parts', () => {
    setup();
    type('Rak', 'A-C,F1');
    expect(screen.getByRole('status').textContent).toContain('F1 diabaikan');
    expect(screen.getByText('Preview (3 lokasi)')).toBeTruthy();
  });
});
