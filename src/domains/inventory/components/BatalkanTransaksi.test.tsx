import { AuthUserProvider } from '@/domains/auth/user-context';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, fail } from '@/test/fake-api';
import { cancelInbound } from '@/domains/inventory/api';
import type { InboundRow } from '@/domains/inventory/types';
import BatalkanTransaksi, { BadgeDibatalkan } from './BatalkanTransaksi';

const row = (over: Partial<InboundRow> = {}) =>
  ({ id: 5, cancelledAt: null, cancelledByName: null, cancelReason: null, ...over }) as InboundRow;
const user = (isSuperadmin: boolean) => ({ id: 1, username: 'u', email: 'u@x.id', roleId: 1, roleName: 'R', isSuperadmin, permissions: [] });
const view = (r: InboundRow, isSuperadmin = true, onDone: (u: unknown) => void = () => {}) =>
  render(
    <AuthUserProvider user={user(isSuperadmin)}>
      <BatalkanTransaksi row={r} cancel={cancelInbound} onDone={onDone} label="barang masuk" />
    </AuthUserProvider>,
  );

describe('BatalkanTransaksi', () => {
  it('shows the button only to a superadmin and only while not cancelled', () => {
    view(row(), false);
    expect(screen.queryByRole('button', { name: 'Batalkan' })).toBeNull();
  });

  it('hides the button for a cancelled row', () => {
    view(row({ cancelledAt: '2026-03-06T03:00:00.000Z' }));
    expect(screen.queryByRole('button', { name: 'Batalkan' })).toBeNull();
  });

  it('warns about stock, requires a reason, then posts the trimmed reason', async () => {
    const api = installFakeApi({ 'POST /api/v1/inbound/5/cancel': { id: 5 } });
    let done: unknown;
    view(row(), true, (u) => (done = u));
    fireEvent.click(screen.getByRole('button', { name: 'Batalkan' }));
    expect(screen.getByText(/Stok akan disesuaikan/)).toBeTruthy();
    const submit = screen.getByRole('button', { name: 'Batalkan Transaksi' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Alasan pembatalan'), { target: { value: ' Salah catat ' } });
    fireEvent.click(submit);
    await screen.findByRole('status');
    expect(api.calls('POST /api/v1/inbound/5/cancel')[0].body).toEqual({ reason: 'Salah catat' });
    expect(done).toEqual({ id: 5 });
  });

  it('shows the backend message on a 409', async () => {
    installFakeApi({ 'POST /api/v1/inbound/5/cancel': fail(409, 'Stok sudah terpakai') });
    view(row());
    fireEvent.click(screen.getByRole('button', { name: 'Batalkan' }));
    fireEvent.change(screen.getByLabelText('Alasan pembatalan'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Batalkan Transaksi' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Stok sudah terpakai'));
  });

  it('renders the badge only for cancelled rows', () => {
    const { rerender } = render(<BadgeDibatalkan row={row({ cancelledAt: '2026-03-06T03:00:00.000Z' })} />);
    expect(screen.getByText('Dibatalkan superadmin')).toBeTruthy();
    rerender(<BadgeDibatalkan row={row()} />);
    expect(screen.queryByText('Dibatalkan superadmin')).toBeNull();
  });
});
