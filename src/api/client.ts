const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Mengambil detail berdasarkan ID
export async function fetchBarangById(id: string) {
  const res = await fetch(`${BASE_URL}/data/${id}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Gagal memuat detail barang');
  return res.json();
}

export async function createBarang(payload: { nama: string; stok: number; kategori: string }) {
  const res = await fetch(`${BASE_URL}/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Gagal menambahkan barang');
  return res.json();
}

export async function updateBarang(id: string, payload: Partial<{ nama: string; stok: number }>) {
  const res = await fetch(`${BASE_URL}/data/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Gagal memperbarui data barang');
  return res.json();
}

export async function deleteBarang(id: string) {
  const res = await fetch(`${BASE_URL}/data/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Gagal menghapus barang');
  return res.json();
}

function getHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}