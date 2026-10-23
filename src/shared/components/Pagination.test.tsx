import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Pagination from './Pagination';

const route = vi.hoisted(() => ({ pathname: '' }));
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }));

describe('Pagination division colors', () => {
  it.each([
    ['gudang', 'orange'],
    ['superadmin', 'indigo'],
    ['gudang-barang-jadi', 'rose'],
    ['ppic', 'purple'],
    ['purchasing', 'teal'],
  ])('uses the %s theme even when the shared page passes another color', (division, color) => {
    route.pathname = `/dashboard/${division}/master/data-barang`;
    render(<Pagination page={1} pageSize={20} total={46} onPageChange={vi.fn()} activeClass="bg-blue-500" />);
    const active = screen.getByRole('button', { name: '1' });
    expect(active.classList.contains(`bg-${color}-500`)).toBe(true);
    expect(active.classList.contains(`border-${color}-500`)).toBe(true);
    expect(active.classList.contains('bg-blue-500')).toBe(false);
  });
});
