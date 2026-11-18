import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImportExcelButton } from './ImportExcelButton';
import { ExportExcellButton, PrintPdfButton } from './Tombol';

describe('Ikon aksi bersama', () => {
  it('menampilkan panah ke bawah untuk import dan unduh template', () => {
    render(<ImportExcelButton
      templateHeaders={['Nama']}
      templateFilename="template.xlsx"
      previewColumns={[]}
      parseRow={(row) => row}
      onSave={vi.fn()}
    />);
    const button = screen.getByRole('button', { name: 'Import Excel' });
    expect(button.querySelector('svg')?.classList.contains('lucide-file-down')).toBe(true);
    fireEvent.click(button);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Template' }).querySelector('svg')?.classList.contains('lucide-file-down')).toBe(true);
  });

  it('menampilkan panah ke atas untuk export dan printer untuk cetak, serta menjalankan aksi masing-masing', () => {
    const exportExcel = vi.fn();
    const print = vi.fn();
    const { rerender } = render(<>
      <ExportExcellButton onClick={exportExcel} />
      <PrintPdfButton onClick={print} />
    </>);
    const exportButton = screen.getByRole('button', { name: 'Export Excel' });
    const printButton = screen.getByRole('button', { name: 'Print' });
    expect(exportButton.querySelector('svg')?.classList.contains('lucide-file-up')).toBe(true);
    expect(printButton.querySelector('svg')?.classList.contains('lucide-printer')).toBe(true);
    fireEvent.click(exportButton);
    fireEvent.click(printButton);
    expect(exportExcel).toHaveBeenCalledTimes(1);
    expect(print).toHaveBeenCalledTimes(1);

    rerender(<>
      <ExportExcellButton onClick={exportExcel} disabled />
      <PrintPdfButton onClick={print} disabled />
    </>);
    fireEvent.click(screen.getByRole('button', { name: 'Export Excel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Print' }));
    expect(exportExcel).toHaveBeenCalledTimes(1);
    expect(print).toHaveBeenCalledTimes(1);
  });

});
