import { afterEach, expect, it, vi } from 'vitest';
import { downloadBlob } from './download';

// jsdom has no URL.createObjectURL; stub it for this file only.
const urlApi = URL as unknown as { createObjectURL?: unknown; revokeObjectURL?: unknown };
afterEach(() => {
  delete urlApi.createObjectURL;
  delete urlApi.revokeObjectURL;
  vi.restoreAllMocks();
});

it('downloadBlob clicks a temporary link with the blob URL and filename, then revokes the URL', () => {
  const blob = new Blob(['x'], { type: 'text/plain' });
  const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:file');
  const revokeObjectURL = vi.fn();
  urlApi.createObjectURL = createObjectURL;
  urlApi.revokeObjectURL = revokeObjectURL;
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.href).toBe('blob:file');
    expect(this.download).toBe('laporan.txt');
    expect(this.isConnected).toBe(true);
  });

  downloadBlob(blob, 'laporan.txt');

  expect(createObjectURL).toHaveBeenCalledWith(blob);
  expect(click).toHaveBeenCalledOnce();
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:file');
  expect(document.querySelectorAll('a[download]')).toHaveLength(0);
});
