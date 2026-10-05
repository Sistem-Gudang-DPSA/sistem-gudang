import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import Pagination from './Pagination';

const nav = () => screen.getByRole('navigation', { name: 'Halaman' });
const pageLabels = () => Array.from(nav().querySelectorAll('button')).map((b) => b.textContent);

describe('Pagination', () => {
  it('total 0 shows 0 sampai 0 dari 0, single page 1, both nav disabled', () => {
    render(<Pagination page={1} pageSize={10} total={0} onPageChange={() => {}} />);
    expect(screen.getByText(/Menampilkan/).textContent).toBe('Menampilkan 0 sampai 0 dari 0 data');
    expect(pageLabels()).toEqual(['Sebelumnya', '1', 'Selanjutnya']);
    expect((screen.getByText('Sebelumnya') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText('Selanjutnya') as HTMLButtonElement).disabled).toBe(true);
  });

  it('total 45 page 1 shows 1 to 10 and ellipsis before last page', () => {
    render(<Pagination page={1} pageSize={10} total={45} onPageChange={() => {}} />);
    expect(screen.getByText(/Menampilkan/).textContent).toBe('Menampilkan 1 sampai 10 dari 45 data');
    expect(pageLabels()).toEqual(['Sebelumnya', '1', '2', '5', 'Selanjutnya']);
    expect(nav().textContent).toContain('...');
    expect((screen.getByText('Sebelumnya') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText('Selanjutnya') as HTMLButtonElement).disabled).toBe(false);
  });

  it('last page clips "to" to total and disables next', () => {
    render(<Pagination page={5} pageSize={10} total={45} onPageChange={() => {}} />);
    expect(screen.getByText(/Menampilkan/).textContent).toBe('Menampilkan 41 sampai 45 dari 45 data');
    expect((screen.getByText('Selanjutnya') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText('Sebelumnya') as HTMLButtonElement).disabled).toBe(false);
  });

  it('middle page window has two ellipses and aria-current on active', () => {
    render(<Pagination page={5} pageSize={10} total={100} onPageChange={() => {}} />);
    expect(pageLabels()).toEqual(['Sebelumnya', '1', '4', '5', '6', '10', 'Selanjutnya']);
    expect(nav().querySelectorAll('span')).toHaveLength(2);
    expect(within(nav()).getByText('5').getAttribute('aria-current')).toBe('page');
    expect(within(nav()).getByText('4').getAttribute('aria-current')).toBeNull();
  });

  it('no ellipsis for adjacent pages', () => {
    render(<Pagination page={2} pageSize={10} total={30} onPageChange={() => {}} />);
    expect(pageLabels()).toEqual(['Sebelumnya', '1', '2', '3', 'Selanjutnya']);
    expect(nav().querySelectorAll('span')).toHaveLength(0);
  });

  it('calls onPageChange with the right page', () => {
    const fn = vi.fn();
    render(<Pagination page={3} pageSize={10} total={100} onPageChange={fn} />);
    fireEvent.click(screen.getByText('Sebelumnya'));
    fireEvent.click(screen.getByText('Selanjutnya'));
    fireEvent.click(within(nav()).getByText('10'));
    fireEvent.click(within(nav()).getByText('1'));
    expect(fn.mock.calls.map((c) => c[0])).toEqual([2, 4, 10, 1]);
  });

  it('applies custom activeClass', () => {
    render(<Pagination page={1} pageSize={10} total={10} onPageChange={() => {}} activeClass="bg-blue-600" />);
    expect(within(nav()).getByText('1').className).toContain('bg-blue-600');
  });
});
