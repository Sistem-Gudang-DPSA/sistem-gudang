import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi } from '@/test/fake-api';
import BulkPhotoModal from './BulkPhotoModal';

const MB = 1024 * 1024;
const file = (name: string, type = 'image/png', size = 1000) => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};
const items = [
  { id: 1, code: 'KB-1', name: 'Barang 1', photo: null },
  { id: 2, code: 'KB-2', name: 'Barang 2', photo: null },
];
const pick = (...files: File[]) => fireEvent.change(screen.getByLabelText('Pilih file foto'), { target: { files } });
const BULK = 'POST /api/v1/items/photos/bulk';

beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:mock'), writable: true, configurable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), writable: true, configurable: true });
});

describe('BulkPhotoModal', () => {
  it('lists rejected files with their reason and keeps them out of the tray', () => {
    installFakeApi({});
    render(<BulkPhotoModal items={items} onClose={() => {}} onDone={() => {}} />);
    pick(file('a.gif', 'image/gif'), file('b.jpg', 'image/jpeg', 11 * MB), file('ok.png'));
    expect(screen.getByText('2 ditolak: a.gif (format), b.jpg (> 10 MB)')).toBeTruthy();
    expect(screen.queryByAltText('a.gif')).toBeNull();
    expect(screen.queryByAltText('b.jpg')).toBeNull();
    expect(screen.getByAltText('ok.png')).toBeTruthy();
  });

  it('pairs in order, uploads one bulk request, and reports success', async () => {
    const api = installFakeApi({
      [BULK]: {
        uploaded: [
          { itemId: 1, photo: { thumb: '/t1', display: '/d1' } },
          { itemId: 2, photo: { thumb: '/t2', display: '/d2' } },
        ],
        failed: [],
      },
    });
    const onDone = vi.fn();
    render(<BulkPhotoModal items={items} onClose={() => {}} onDone={onDone} />);
    pick(file('a.png'), file('b.png'));
    fireEvent.click(screen.getByText('Pasangkan berurutan'));
    fireEvent.click(screen.getByText('Mulai Upload'));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(api.calls(BULK)).toHaveLength(1);
    expect(screen.getAllByText('Berhasil')).toHaveLength(2);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('2');
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('pairs only the file named after the item code', () => {
    installFakeApi({});
    render(<BulkPhotoModal items={items} onClose={() => {}} onDone={() => {}} />);
    pick(file('kb-2.png'), file('lain.png'));
    fireEvent.click(screen.getByText('Cocokkan kode'));
    expect(screen.getByText('1 dari 2 barang dipasangi foto')).toBeTruthy();
    expect(screen.queryByLabelText('Lepas foto Barang 1')).toBeNull();
    expect(screen.getByLabelText('Lepas foto Barang 2')).toBeTruthy();
  });

  it('shows the failure reason for a rejected item and offers a retry', async () => {
    installFakeApi({
      [BULK]: {
        uploaded: [{ itemId: 1, photo: { thumb: '/t1', display: '/d1' } }],
        failed: [{ itemId: 2, reason: 'not_found' }],
      },
    });
    render(<BulkPhotoModal items={items} onClose={() => {}} onDone={() => {}} />);
    pick(file('a.png'), file('b.png'));
    fireEvent.click(screen.getByText('Pasangkan berurutan'));
    fireEvent.click(screen.getByText('Mulai Upload'));

    expect(await screen.findByText('Gagal: Barang tidak ditemukan')).toBeTruthy();
    expect(screen.getByText('Berhasil')).toBeTruthy();
    expect(screen.getByText('Coba ulang yang gagal')).toBeTruthy();
  });
});
