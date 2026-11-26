import type { PurchaseOrderLineInput } from './types';

export function purchaseOrderTotals(lines: Pick<PurchaseOrderLineInput, 'jumlah' | 'hargaSatuan' | 'diskon'>[], ppn: number, jasa: number) {
  const subtotal = lines.reduce((sum, line) => sum + line.jumlah * line.hargaSatuan - line.diskon, 0);
  const dppLain = Math.round((subtotal * 11) / 12);
  const nilaiPpn = Math.round((dppLain * (Number.isFinite(ppn) ? ppn : 0)) / 100);
  const totalSetelahPpn = subtotal + nilaiPpn;
  return { subtotal, dppLain, nilaiPpn, totalSetelahPpn, grandTotal: totalSetelahPpn + jasa };
}
