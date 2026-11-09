import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { addReferenceColumns } from '@/shared/components/ImportExcelButton';
import { MasterData, mstrDataTemplateHeaders } from './DataBarang';

describe('Excel data barang', () => {
  it('reference lists sit right of the data and parse back as plain rows', () => {
    const sheet = XLSX.utils.aoa_to_sheet([mstrDataTemplateHeaders, ['K1', 'Lem', '', 'Bahan', 'pcs', 'A1', '', 1000, 2]]);
    addReferenceColumns(XLSX, sheet, mstrDataTemplateHeaders.length, { 'Daftar Kategori': ['Bahan', 'Alat', 'Kain'] });
    expect(sheet[XLSX.utils.encode_cell({ r: 0, c: mstrDataTemplateHeaders.length + 3 })].v).toBe('Daftar Kategori');

    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
      .filter((r) => mstrDataTemplateHeaders.some((h) => String(r[h] ?? '').trim() !== ''));
    expect(raw).toHaveLength(1); // rows holding only reference values are skipped
    expect(MasterData(raw[0], 2)).toMatchObject({ code: 'K1', name: 'Lem', category: 'Bahan', unit: 'pcs', locationCode: 'A1', price: 1000, stock: 2 });
  });
});
