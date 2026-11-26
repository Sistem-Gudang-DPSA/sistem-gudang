// Data contoh yang sama untuk tabel detail dan nilai stok di daftar barang.
// Belum terhubung ke riwayat transaksi backend.
export const DUMMY_RECEIPTS = [
  { date: '2026-11-18', quantity: 25, remainingStock: 20, price: 125000, supplier: 'PT Sumber Material' },
  { date: '2026-11-10', quantity: 40, remainingStock: 10, price: 120000, supplier: 'CV Mitra Sejahtera' },
  { date: '2026-11-02', quantity: 15, remainingStock: 0, price: 122500, supplier: 'PT Sumber Material' },
];

export const totalStockValue = DUMMY_RECEIPTS.reduce((total, receipt) => total + receipt.remainingStock * receipt.price, 0);
