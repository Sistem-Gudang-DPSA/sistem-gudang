import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AccessDenied from './AccessDenied';
import type { AuthUser } from '../types';

const user = (permissions: string[], over: Partial<AuthUser> = {}): AuthUser => ({
  id: 1, username: 'u', email: 'u@x', roleId: 1, roleName: 'Staf PPIC', isSuperadmin: false, permissions, ...over,
});

describe('AccessDenied', () => {
  it('shows 403, the role name and a link to the first division the user may open', () => {
    render(<AccessDenied user={user(['purchase-request.create'])} />);
    expect(screen.getByText('Akses Ditolak')).not.toBeNull();
    expect(screen.getByText('403')).not.toBeNull();
    expect(screen.getByText('Staf PPIC')).not.toBeNull();
    expect(screen.getByText('Kembali ke Beranda').getAttribute('href')).toBe('/dashboard/ppic');
  });

  it('falls back to /dashboard when the user has no division', () => {
    render(<AccessDenied user={user([])} />);
    expect(screen.getByText('Kembali ke Beranda').getAttribute('href')).toBe('/dashboard');
  });
});
