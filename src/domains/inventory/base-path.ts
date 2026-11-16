// Gudang screens are reused by Gudang Barang Jadi, so links keep the division of the page being viewed.
export const gudangBasePath = (pathname: string | null) =>
  pathname?.startsWith('/dashboard/gudang-barang-jadi') ? '/dashboard/gudang-barang-jadi' : '/dashboard/gudang';
