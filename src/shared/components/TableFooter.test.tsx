import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import TableFooter from './TableFooter';

describe('TableFooter', () => {
  it('shows the filtered total', () => {
    render(<TableFooter total={1234} unit="barang" />);
    expect(screen.getByText(/Total 1\.234 barang terfilter/)).toBeTruthy();
  });
});
