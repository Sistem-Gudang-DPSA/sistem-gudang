import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, fail } from '@/test/fake-api';
import ItemPhoto, { photoError } from './ItemPhoto';

const file = (type = 'image/png', size = 1000) => {
  const f = new File(['x'], 'foto.png', { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};
const pick = (f: File) => fireEvent.change(screen.getByLabelText('Upload foto Triplex'), { target: { files: [f] } });
const MB = 1024 * 1024;

describe('ItemPhoto', () => {
  it('shows a placeholder and no upload button when view-only', () => {
    render(<ItemPhoto item={{ id: 1, name: 'Triplex', photo: null }} />);
    expect(screen.getByLabelText('Belum ada foto Triplex')).toBeTruthy();
    expect(screen.queryByText('Upload')).toBeNull();
    expect(screen.queryByLabelText('Upload foto Triplex')).toBeNull();
  });

  it('shows the thumb in the cell and the display image in the preview', () => {
    render(<ItemPhoto item={{ id: 1, name: 'Triplex', photo: { thumb: '/uploads/items/1-thumb.webp', display: '/uploads/items/1-display.webp' } }} />);
    const img = screen.getByAltText('Foto Triplex') as HTMLImageElement;
    expect(img.src).toMatch(/^https?:\/\/.+\/uploads\/items\/1-thumb\.webp$/);
    expect(img.getAttribute('loading')).toBe('lazy');
    fireEvent.click(screen.getByTitle('Lihat foto Triplex'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    const preview = screen.getByRole('dialog').querySelector('img') as HTMLImageElement;
    expect(preview.src).toMatch(/^https?:\/\/.+\/uploads\/items\/1-display\.webp$/);
    expect(preview.getAttribute('loading')).toBe('lazy');
    fireEvent.click(screen.getByLabelText('Tutup foto'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('uploads the picked file as multipart and reports back', async () => {
    const api = installFakeApi({ 'POST /api/v1/items/1/photo': { id: 1 } });
    const onUploaded = vi.fn();
    render(<ItemPhoto item={{ id: 1, name: 'Triplex', photo: null }} canUpload onUploaded={onUploaded} />);
    const f = file();
    pick(f);
    await waitFor(() => expect(onUploaded).toHaveBeenCalled());
    const init = api.fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get('photo')).toBe(f);
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });

  it('labels the button Ganti when a photo exists and keeps absolute URLs as is', () => {
    render(<ItemPhoto item={{ id: 1, name: 'Triplex', photo: { thumb: 'https://cdn.example/1-thumb.webp', display: 'https://cdn.example/1-display.webp' } }} canUpload />);
    expect(screen.getByText('Ganti')).toBeTruthy();
    expect((screen.getByAltText('Foto Triplex') as HTMLImageElement).src).toBe('https://cdn.example/1-thumb.webp');
  });

  it('rejects wrong types and files over 10 MB without calling the API', () => {
    const api = installFakeApi({});
    render(<ItemPhoto item={{ id: 1, name: 'Triplex' }} canUpload />);
    pick(file('application/pdf'));
    expect(screen.getByText('Foto harus berformat JPG, PNG, atau WEBP.')).toBeTruthy();
    pick(file('image/jpeg', 10 * MB + 1));
    expect(screen.getByText('Ukuran foto maksimal 10 MB.')).toBeTruthy();
    expect(api.all()).toHaveLength(0);
    expect(photoError(file('image/webp'))).toBeNull();
  });

  it('accepts a 3 MB file, which the old 2 MB limit rejected', async () => {
    const api = installFakeApi({ 'POST /api/v1/items/1/photo': { id: 1 } });
    const onUploaded = vi.fn();
    render(<ItemPhoto item={{ id: 1, name: 'Triplex' }} canUpload onUploaded={onUploaded} />);
    pick(file('image/jpeg', 3 * MB));
    await waitFor(() => expect(onUploaded).toHaveBeenCalled());
    expect(api.all()).toHaveLength(1);
  });

  it('shows the backend error', async () => {
    installFakeApi({ 'POST /api/v1/items/1/photo': fail(403, 'You do not have permission to perform this action') });
    const onUploaded = vi.fn();
    render(<ItemPhoto item={{ id: 1, name: 'Triplex' }} canUpload onUploaded={onUploaded} />);
    pick(file());
    expect(await screen.findByText('You do not have permission to perform this action')).toBeTruthy();
    expect(onUploaded).not.toHaveBeenCalled();
  });
});
