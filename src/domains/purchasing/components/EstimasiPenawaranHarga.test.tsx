import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { installFakeApi, paged } from '@/test/fake-api';
import { downloadBlob } from '@/shared/lib/download';
import EstimasiPenawaranHarga from './EstimasiPenawaranHarga';

vi.mock('@/shared/lib/download', () => ({ downloadBlob: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard/purchasing/transaksi/estimasi-penawaran-harga' }));

describe('purchasing EstimasiPenawaranHarga export', () => {
  it('escapes fields and can export more than once', async () => {
    installFakeApi({ 'GET /api/v1/penawaran-harga': paged([{ id: 1, noOrder: 'PH-1', namaClient: 'PT "Maju", Jaya', status: 'DRAFT' }]) });
    render(<EstimasiPenawaranHarga />);
    await screen.findByText('PH-1');
    const btn = screen.getByRole('button', { name: /Export Excel/ });
    fireEvent.click(btn);
    fireEvent.click(btn);
    const calls = vi.mocked(downloadBlob).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][1]).toBe('Penawaran_Harga_halaman-1.csv');
    const [head, row] = (await (calls[0][0] as Blob).text()).split('\r\n');
    expect(head).toBe('"No","No. Order","Nama Client","Status"');
    expect(row).toBe('"1","PH-1","PT ""Maju"", Jaya","Draft"');
  });
});
