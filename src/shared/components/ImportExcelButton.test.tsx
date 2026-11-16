import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import * as XLSX from 'xlsx';
import { ImportExcelButton } from './ImportExcelButton';

const headers = ['Nama'];
const toFile = (aoa: unknown[][]) => {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(aoa), 'S');
  const buf = XLSX.write(book, { type: 'array', bookType: 'xlsx' });
  return new File([buf], 'a.xlsx');
};

function setup(maxRows?: number) {
  const { container } = render(
    <ImportExcelButton
      templateHeaders={headers}
      templateFilename="t.xlsx"
      previewColumns={[{ header: 'Nama', value: (r: string) => r }]}
      parseRow={(r, n) => {
        if (r['Nama'] === 'bad') throw new Error(`Baris ${n}: salah`);
        return String(r['Nama']);
      }}
      onSave={async () => {}}
      maxRows={maxRows}
    />,
  );
  fireEvent.click(screen.getByText('Import Excel'));
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

describe('ImportExcelButton', () => {
  it('nomor baris error = baris Excel sebenarnya meski ada baris kosong', async () => {
    const input = setup();
    fireEvent.change(input, { target: { files: [toFile([headers, ['a'], [], [], ['bad']])] } });
    expect(await screen.findByText('Baris 5: salah')).not.toBeNull();
  });

  it('menolak file melebihi maxRows', async () => {
    const input = setup(2);
    fireEvent.change(input, { target: { files: [toFile([headers, ['a'], ['b'], ['c']])] } });
    expect(await screen.findByText(/Maksimal 2 baris per import/)).not.toBeNull();
  });
});
