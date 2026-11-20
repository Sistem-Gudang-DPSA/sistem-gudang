// Data dummy sementara, menunggu master PIC/Telp dari Purchasing.
// ID supplier menjaga kontak tetap sama walaupun urutan daftar berubah.
export function getDummyPicSupplier(supplierId: number) {
  const names = ['Andi', 'Siti', 'Budi', 'Dewi', 'Rina'];
  return `${names[(supplierId - 1) % names.length]} / 0812${String(supplierId).padStart(8, '0')}`;
}
