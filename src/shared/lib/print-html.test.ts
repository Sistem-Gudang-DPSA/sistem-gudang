import { afterEach, expect, it, vi } from 'vitest';
import { cetakHtml } from './print-html';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

it('cetakHtml appends a hidden iframe with srcdoc and a Cetak title, no pop-up', () => {
  const open = vi.spyOn(window, 'open');
  void cetakHtml('<p>x</p>', 'rekap');
  const iframe = document.querySelector('iframe')!;
  expect(iframe.srcdoc).toBe('<p>x</p>');
  expect(iframe.title).toBe('Cetak rekap');
  expect(iframe.getAttribute('aria-hidden')).toBe('true');
  expect(open).not.toHaveBeenCalled();
});

it('cetakHtml removes the iframe and rejects when siapkan fails', async () => {
  const hasil = cetakHtml('<p>x</p>', 'rekap', async () => {
    throw new Error('gagal siap');
  });
  const iframe = document.querySelector('iframe')!;
  iframe.dispatchEvent(new Event('load'));
  await expect(hasil).rejects.toThrow('gagal siap');
  expect(document.querySelector('iframe')).toBeNull();
});
