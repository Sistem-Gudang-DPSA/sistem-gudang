import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import PenawaranHargaSph from './PenawaranHargaSph';
import EstimasiPenawaranBiayaSph from './EstimasiPenawaranBiayaSph';
import { getSph } from '@/domains/purchasing/data/penawaran-sph';

const push = vi.fn();
let params: { id: string } = { id: '1' };
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), useParams: () => params }));

describe('PenawaranHargaSph (dummy data)', () => {
  it('shows the dummy row with links to the estimasi page', () => {
    render(<PenawaranHargaSph />);
    const row = screen.getByText('Projek Hermina Tangerang').closest('tr')!;
    expect(within(row).getByText('0000000001')).not.toBeNull();
    expect(within(row).getByText('Publish')).not.toBeNull();
    expect(within(row).getByRole('link', { name: 'Detail' }).getAttribute('href'))
      .toBe('/dashboard/purchasing/transaksi/penawaran-harga/estimasi-penawaran-biaya/1');
  });

  it('requires a project name, then adds a Draft row from the pop up', () => {
    render(<PenawaranHargaSph />);
    fireEvent.click(screen.getByRole('button', { name: /Tambah Data/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(screen.getByText('Nama projek wajib diisi.')).not.toBeNull();

    fireEvent.change(screen.getByLabelText('Nama Projek', { selector: 'input' }), { target: { value: 'Projek Baru' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    const row = screen.getByText('Projek Baru').closest('tr')!;
    expect(within(row).getByText('0000000002')).not.toBeNull();
    expect(within(row).getByText('Draft')).not.toBeNull();
  });

  it('filters rows by project name', () => {
    render(<PenawaranHargaSph />);
    fireEvent.change(screen.getByLabelText('Cari nama projek'), { target: { value: 'hermina' } });
    expect(screen.getByText('Projek Hermina Tangerang')).not.toBeNull();
    expect(screen.queryByText('Projek Baru')).toBeNull();
  });
});

describe('EstimasiPenawaranBiayaSph (dummy data)', () => {
  it('saves the form and goes back to the list', () => {
    params = { id: '1' };
    render(<EstimasiPenawaranBiayaSph />);
    fireEvent.change(screen.getByLabelText('Pekerjaan :'), { target: { value: 'Lemari' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(getSph(1)?.form.pekerjaan).toBe('Lemari');
    expect(push).toHaveBeenCalledWith('/dashboard/purchasing/transaksi/penawaran-harga');
  });

  it('shows not found for an unknown id', () => {
    params = { id: '999' };
    render(<EstimasiPenawaranBiayaSph />);
    expect(screen.getByText('Penawaran harga tidak ditemukan.')).not.toBeNull();
  });
});
