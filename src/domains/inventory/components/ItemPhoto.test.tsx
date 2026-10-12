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

describe('ItemPhoto', () => {
  it('shows a placeholder and no upload button when view-only', () => {
    render(<ItemPhoto item={{ id: 1, name: 'Triplex', photoUrl: null }} />);
    expect(screen.getByLabelText('Belum ada foto Triplex')).toBeTruthy();
    expect(screen.queryByText('Upload')).toBeNull();
    expect(screen.queryByLabelText('Upload foto Triplex')).toBeNull();
  });

  it('prefixes a relative photo path with the API host and opens a larger preview', () => {
    render(<ItemPhoto item={{ id: 1, name: 'Triplex', photoUrl: '/uploads/items/1.jpg' }} />);
    const img = screen.getByAltText('Foto Triplex') as HTMLImageElement;
    expect(img.src).toMatch(/^https?:\/\/.+\/uploads\/items\/1\.jpg$/);
    fireEvent.click(screen.getByTitle('Lihat foto Triplex'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Tutup foto'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('uploads the picked file as multipart and reports back', async () => {
    const api = installFakeApi({ 'POST /api/v1/items/1/photo': { id: 1 } });
    const onUploaded = vi.fn();
    render(<ItemPhoto item={{ id: 1, name: 'Triplex', photoUrl: null }} canUpload onUploaded={onUploaded} />);
    const f = file();
    pick(f);
    await waitFor(() => expect(onUploaded).toHaveBeenCalled());
    const init = api.fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get('photo')).toBe(f);
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });

  it('labels the button Ganti when a photo exists', () => {
    render(<ItemPhoto item={{ id: 1, name: 'Triplex', photoUrl: 'https://cdn.example/1.jpg' }} canUpload />);
    expect(screen.getByText('Ganti')).toBeTruthy();
    expect((screen.getByAltText('Foto Triplex') as HTMLImageElement).src).toBe('https://cdn.example/1.jpg');
  });

  it('rejects wrong types and oversized files without calling the API', () => {
    const api = installFakeApi({});
    render(<ItemPhoto item={{ id: 1, name: 'Triplex' }} canUpload />);
    pick(file('application/pdf'));
    expect(screen.getByText('Foto harus berformat JPG, PNG, atau WEBP.')).toBeTruthy();
    pick(file('image/jpeg', 3 * 1024 * 1024));
    expect(screen.getByText('Ukuran foto maksimal 2 MB.')).toBeTruthy();
    expect(api.all()).toHaveLength(0);
    expect(photoError(file('image/webp'))).toBeNull();
  });

  it('shows the backend error', async () => {
    installFakeApi({ 'POST /api/v1/items/1/photo': fail(403, 'Missing permission: item.upload-photo') });
    const onUploaded = vi.fn();
    render(<ItemPhoto item={{ id: 1, name: 'Triplex' }} canUpload onUploaded={onUploaded} />);
    pick(file());
    expect(await screen.findByText('Missing permission: item.upload-photo')).toBeTruthy();
    expect(onUploaded).not.toHaveBeenCalled();
  });
});
