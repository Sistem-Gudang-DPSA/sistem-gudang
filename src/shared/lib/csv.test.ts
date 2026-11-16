import { afterEach, expect, it, vi } from 'vitest';
import { downloadCsv, toCsv } from './csv';

it('quotes every field, doubles quotes, keeps commas and newlines inside', () => {
  expect(toCsv([['a', 'b,"c"', 1, null], ['x\ny', undefined, 0, '']])).toBe('"a","b,""c""","1",""\r\n"x\ny","","0",""');
});

it('neutralises leading formula characters in text but keeps numbers, phone-like values and a lone dash', () => {
  expect(toCsv([['=SUM(A1)', '@cmd', '+A1', '-A1+1', '-x', '-', 'ok', -5]])).toBe(`"'=SUM(A1)","'@cmd","'+A1","'-A1+1","'-x","-","ok","-5"`);
  expect(toCsv([['+62 812-3456', '-5', '1.234,5', '(021) 555-1234']])).toBe('"+62 812-3456","-5","1.234,5","(021) 555-1234"');
});

// jsdom has no URL.createObjectURL; stub it for this file only.
const urlApi = URL as unknown as { createObjectURL?: unknown; revokeObjectURL?: unknown };
afterEach(() => {
  delete urlApi.createObjectURL;
  delete urlApi.revokeObjectURL;
  vi.restoreAllMocks();
});

it('downloadCsv saves the CSV as a utf-8 text blob under the given filename', async () => {
  const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:csv');
  const revokeObjectURL = vi.fn();
  urlApi.createObjectURL = createObjectURL;
  urlApi.revokeObjectURL = revokeObjectURL;
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.href).toBe('blob:csv');
    expect(this.download).toBe('Data_Barang_Masuk_halaman-2.csv');
  });

  downloadCsv('Data_Barang_Masuk_halaman-2.csv', [['a', 'b']]);

  const blob = createObjectURL.mock.calls[0][0] as Blob;
  expect(blob.type).toBe('text/csv;charset=utf-8;');
  expect(await blob.text()).toBe('"a","b"');
  expect(click).toHaveBeenCalledOnce();
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:csv');
});
