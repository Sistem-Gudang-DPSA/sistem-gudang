import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import { withUser } from '@/test/as-user';
import Purchasing from './DataSupplier';
import Superadmin from '@/domains/superadmin/components/DataSupplier';

const supplier = { id: 7, code: 'S7', name: 'PT Contoh', bank: 'BCA', npwp: '123', pic: 'Andi', phone: '0812', address: 'Jl. Lama\nBlok A', pajak: 'PKP' };
const address = 'Jl. Baru No. 20\nBlok B, Gudang 2';
const change = (placeholder: string, value: string) => fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });

for (const [division, Page] of [['Purchasing', Purchasing], ['Superadmin', Superadmin]] as const) {
  describe(`Form Supplier ${division}`, () => {
    it.each([
      [[], ['Detail Barang']],
      [['supplier.update'], ['Detail Barang', 'Edit']],
      [['supplier.delete'], ['Detail Barang', 'Hapus']],
      [['supplier.update', 'supplier.delete'], ['Detail Barang', 'Edit', 'Hapus']],
    ])('menampilkan ikon aksi sesuai permission %j dan tautan khusus divisi', async (permissions, labels) => {
      installFakeApi({ 'GET /api/v1/suppliers': paged([supplier]) });
      render(withUser(<Page />, ['supplier.view', ...permissions]));
      const trigger = await screen.findByRole('button', { name: 'Aksi PT Contoh' });
      expect(trigger.textContent).toBe('');
      expect(screen.queryByRole('menuitem')).toBeNull();
      fireEvent.click(trigger);
      const actions = screen.getAllByRole('menuitem');
      expect(actions.map((action) => action.getAttribute('aria-label'))).toEqual(labels);
      for (const action of actions) expect(action.querySelector('svg')).not.toBeNull();
      expect(screen.getByRole('menuitem', { name: 'Detail Barang' }).querySelector('.lucide-eye.text-blue-600')).not.toBeNull();
      if (labels.includes('Edit')) expect(screen.getByRole('menuitem', { name: 'Edit' }).querySelector('.lucide-pencil.text-amber-600')).not.toBeNull();
      const base = division.toLowerCase();
      expect(screen.getByRole('menuitem', { name: 'Detail Barang' }).getAttribute('href')).toBe(`/dashboard/${base}/master/data-supplier/7/detail?from=${base}`);
    });

    it('menyimpan alamat multiline dari textarea dan pajak yang dipilih lewat radio button', async () => {
      const api = installFakeApi({ 'GET /api/v1/suppliers': paged([]), 'POST /api/v1/suppliers': supplier });
      render(withUser(<Page />, ['supplier.view', 'supplier.create']));
      fireEvent.click(screen.getByRole('button', { name: 'Tambah Data' }));
      const tax = within(screen.getByRole('group', { name: 'Pajak Vendor' }));
      expect(tax.getByRole('radio', { name: 'Non PKP', checked: true })).toBeTruthy();
      expect(tax.getByRole('radio', { name: 'PKP', checked: false })).toBeTruthy();
      expect(tax.queryByRole('combobox')).toBeNull();
      fireEvent.click(tax.getByRole('radio', { name: 'PKP' }));
      expect(tax.getByRole('radio', { name: 'PKP', checked: true })).toBeTruthy();
      expect(tax.getByRole('radio', { name: 'Non PKP', checked: false })).toBeTruthy();
      expect(api.calls('POST /api/v1/suppliers')).toHaveLength(0);
      const textarea = screen.getByRole('textbox', { name: 'Alamat' });
      expect(textarea.tagName).toBe('TEXTAREA');
      expect(textarea).toHaveProperty('maxLength', 255);
      change('Masukan kode supplier', 'S7');
      change('Masukan nama supplier', 'PT Contoh');
      change('Masukan nama Bank', 'BCA');
      change('Masukan Npwp', '123');
      change('Masukan nama PIC', 'Budi');
      change('Masukan nomor kontak', '0812');
      fireEvent.change(textarea, { target: { value: address } });
      fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
      await waitFor(() => expect(api.calls('POST /api/v1/suppliers')).toHaveLength(1));
      expect(api.calls('POST /api/v1/suppliers')[0].body).toEqual({ code: 'S7', name: 'PT Contoh', bank: 'BCA', npwp: '123', pic: 'Budi', phone: '0812', address, pajak: 'PKP' });
    });

    it('membuka pilihan pajak dan alamat tersimpan lalu menyimpan perubahan melalui PUT', async () => {
      const api = installFakeApi({ 'GET /api/v1/suppliers': paged([supplier]), 'PUT /api/v1/suppliers/7': supplier });
      render(withUser(<Page />, ['supplier.view', 'supplier.update']));
      fireEvent.click(await screen.findByRole('button', { name: 'Aksi PT Contoh' }));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
      const tax = within(screen.getByRole('group', { name: 'Pajak Vendor' }));
      expect(tax.getByRole('radio', { name: 'PKP', checked: true })).toBeTruthy();
      expect(screen.getByRole('textbox', { name: 'Alamat' })).toHaveProperty('value', supplier.address);
      expect(screen.getByPlaceholderText('Masukan nama PIC')).toHaveProperty('value', supplier.pic);
      expect(screen.getByPlaceholderText('Masukan nomor kontak')).toHaveProperty('value', supplier.phone);
      fireEvent.click(tax.getByRole('radio', { name: 'Non PKP' }));
      expect(tax.getByRole('radio', { name: 'PKP', checked: false })).toBeTruthy();
      change('Masukan nama PIC', 'Rina');
      change('Masukan nomor kontak', '0813');
      fireEvent.change(screen.getByRole('textbox', { name: 'Alamat' }), { target: { value: address } });
      fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
      await waitFor(() => expect(api.calls('PUT /api/v1/suppliers/7')).toHaveLength(1));
      expect(api.calls('PUT /api/v1/suppliers/7')[0].body).toMatchObject({ pic: 'Rina', phone: '0813', address, pajak: 'NON_PKP' });
      expect(api.calls('POST /api/v1/suppliers')).toHaveLength(0);
    });

    it('mempertahankan alamat dan pajak pilihan ketika penyimpanan gagal', async () => {
      installFakeApi({ 'GET /api/v1/suppliers': paged([supplier]), 'PUT /api/v1/suppliers/7': fail(500, 'Supplier gagal disimpan') });
      render(withUser(<Page />, ['supplier.view', 'supplier.update']));
      fireEvent.click(await screen.findByRole('button', { name: 'Aksi PT Contoh' }));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
      const tax = within(screen.getByRole('group', { name: 'Pajak Vendor' }));
      fireEvent.click(tax.getByRole('radio', { name: 'Non PKP' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Alamat' }), { target: { value: address } });
      fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
      await screen.findByText('Supplier gagal disimpan');
      expect(screen.getByRole('textbox', { name: 'Alamat' })).toHaveProperty('value', address);
      expect(tax.getByRole('radio', { name: 'Non PKP', checked: true })).toBeTruthy();
    });
  });
}
