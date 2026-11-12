import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi } from '@/test/fake-api';
import ImportSupplierMapping from './ImportSupplierMapping';

const row = { name: 'PT Kayu', address: 'Jl', npwp: '1', npwpPerorangan: '', nik: '' };

describe('ImportSupplierMapping', () => {
  it('reports created and skipped counts to onDone', async () => {
    installFakeApi({
      'POST /api/v1/suppliers/bulk': { created: 1, skipped: [{ row: 2, code: 'S2', reason: 'Kode sudah ada' }] },
    });
    const onDone = vi.fn();
    render(<ImportSupplierMapping rows={[row, row]} onClose={vi.fn()} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'Simpan 2 Supplier' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(onDone).toHaveBeenCalledWith('1 supplier ditambahkan, 1 dilewati karena kode duplikat: S2');
  });
});
