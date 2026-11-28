import { describe, expect, it, vi } from 'vitest';
import { buildPurchaseOrderHtml, buildPurchaseOrdersHtml, printPurchaseOrder, printPurchaseOrders } from './print-po';
import type { PurchaseOrder } from '@/domains/purchasing/types';
import { tungguGambarCetak } from '@/shared/lib/print-laporan';

const print = vi.hoisted(() => ({ cetakHtml: vi.fn(async () => {}) }));
vi.mock('@/shared/lib/print-html', () => print);

const po: PurchaseOrder = {
  id: 54, nomorPo: 'PO-054', tanggalPo: '2026-11-20', approvalRequestId: null,
  supplierId: 1, supplierName: 'PT Kayu', supplierAddress: 'Jl Supplier', supplierPhone: '081234', supplierNpwp: '123.456', supplierBank: 'Bank A',
  picSupplier: 'Andi / 081234',
  subtotal: 39000, dppLain: 35750, persenPpn: 12, nilaiPpn: 4290, jasa: 1000, grandTotal: 44290,
  status: 'ISSUED', cancelledAt: null, cancelledBy: null, cancelReason: null, createdBy: 1, createdAt: '2026-11-20',
  barang: [{ id: 5401, kodeBarang: 'BRG-1', namaBarang: 'Triplex', satuan: 'Lembar', noSpk: 'SPK-1', jumlah: 2, hargaSatuan: 20000, diskon: 1000 }],
};

describe('Purchase order print template', () => {
  it('reserves 4 cm above the PO without a letterhead or PO number and retains the saved details on A4', () => {
    const html = buildPurchaseOrderHtml(po);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(html).toContain('A4 portrait');
    expect(html).toContain('@page { size: A4 portrait; margin: 40mm 16mm 10mm; }');
    expect(html).toContain('.po-title { text-align: center; text-decoration: underline; font-size: 12px; margin: 0 0 3mm; }');
    expect(doc.querySelector('.kop')).toBeNull();
    expect(doc.querySelector('img')).toBeNull();
    expect(doc.querySelector('.po-title')?.textContent).toBe('PURCHASE ORDER (PO)');
    const numberRow = doc.querySelector('.po-meta tr');
    expect(numberRow?.querySelector('td:first-child')?.textContent).toBe('Nomor PO');
    expect(numberRow?.querySelector('td:last-child')?.textContent).toBe('');
    expect(doc.body.textContent).not.toContain('PO-054');
    expect(doc.querySelector('.po-meta')?.textContent).toContain('20 November 2026');
    const parties = doc.querySelector('.parties')?.textContent;
    for (const value of ['PT Kayu', 'Jl Supplier / 081234', '123.456', 'Bank A', 'Andi / 081234', 'No SPK', 'SPK-1']) expect(parties).toContain(value);
    const items = doc.querySelector('.po-items tbody')?.textContent;
    for (const value of ['BRG-1', 'Triplex', 'Lembar', 'SPK-1', '20,000', '1,000', '39,000', '2.00']) expect(items).toContain(value);
    expect(doc.querySelector('.po-items thead')?.textContent).toContain('No SPK');
    expect(doc.querySelector('tfoot')?.textContent).toContain('44,290');
    expect(doc.querySelector('tfoot')?.textContent).toContain('35.750');
    expect(doc.querySelector('.notes')?.textContent).toContain('30 hari kerja');
    expect(doc.querySelector('.signatures')?.textContent).toContain('Direktur Utama');
    expect(doc.querySelector('.space')?.textContent).toBe('');
    expect(doc.querySelectorAll('.notes li')).toHaveLength(6);
    expect(doc.querySelector('.notes')?.textContent).toContain('Menyesuaikan Lokasi');
    expect(doc.querySelector('.doc-control')?.textContent).toContain('Rev: 00');
    expect(doc.querySelector('.doc-control')?.textContent).toContain('Terbit:08/25');
    expect(doc.querySelector('.dpp-formula')?.textContent).toContain('11/12');
    expect(Array.from(doc.querySelectorAll('.signature-name'), (node) => node.textContent)).toEqual(['', '', '', '', 'Yosef Boyke Dharma']);
    expect(doc.querySelector('.signatures')?.textContent).toContain('Yosef Boyke Dharma');
  });

  it('escapes PO, supplier and item text rather than inserting markup', () => {
    const html = buildPurchaseOrderHtml({ ...po, nomorPo: '<script>bad()</script>', supplierName: '<img src=x onerror=bad()>', barang: [{ ...po.barang[0], namaBarang: '<b>Triplex</b>', noSpk: 'Kantor & Gudang' }] });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelector('script')).toBeNull();
    expect(doc.querySelector('[onerror]')).toBeNull();
    expect(doc.querySelector('.po-items b')).toBeNull();
    expect(html).toContain('&lt;b&gt;Triplex&lt;/b&gt;');
    expect(html).toContain('Kantor &amp; Gudang');
  });

  it('combines selected POs into one print document with a page break between each PO', async () => {
    const second = { ...po, id: 55, nomorPo: 'PO-055', supplierName: 'Supplier kedua' };
    const html = buildPurchaseOrdersHtml([po, second]);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const sheets = doc.querySelectorAll('.po-sheet');
    expect(sheets).toHaveLength(2);
    for (const sheet of sheets) {
      expect(sheet.querySelector('.po-meta tr td:last-child')?.textContent).toBe('');
      expect(sheet.querySelector('.po-meta')?.textContent).toContain('Nomor PO');
    }
    expect(sheets[0].querySelector('.parties')?.textContent).toContain('PT Kayu');
    expect(sheets[1].querySelector('.parties')?.textContent).toContain('Supplier kedua');
    expect(doc.querySelectorAll('.kop')).toHaveLength(0);
    expect(doc.querySelectorAll('img')).toHaveLength(0);
    expect(doc.body.textContent).not.toMatch(/PO-054|PO-055/);
    expect(html).toContain('@page { size: A4 portrait; margin: 40mm 16mm 10mm; }');
    expect(html).toContain('break-after: page');
    await printPurchaseOrders([po, second]);
    expect(print.cetakHtml).toHaveBeenLastCalledWith(html, 'PO terpilih (2)', tungguGambarCetak);
  });

  it('does not accept an empty selection', () => {
    expect(() => buildPurchaseOrdersHtml([])).toThrow('Pilih minimal satu PO');
  });

  it('marks cancelled POs and escapes the cancellation reason', () => {
    const doc = new DOMParser().parseFromString(buildPurchaseOrderHtml({ ...po, status: 'CANCELLED', cancelReason: '<b>Batal</b>' }), 'text/html');
    expect(doc.querySelector('.cancelled')?.textContent).toBe('DIBATALKAN: <b>Batal</b>');
    expect(doc.querySelector('.cancelled b')).toBeNull();
  });

  it('marks draft POs as not yet submitted', () => {
    const doc = new DOMParser().parseFromString(buildPurchaseOrderHtml({ ...po, status: 'DRAFT' }), 'text/html');
    expect(doc.querySelector('.draft')?.textContent).toBe('DRAFT — belum disubmit');
    expect(doc.querySelector('.cancelled')).toBeNull();
  });

  it('uses the shared print helper with the PO number only as the print dialog label', async () => {
    await printPurchaseOrder(po);
    expect(print.cetakHtml).toHaveBeenCalledWith(buildPurchaseOrderHtml(po), 'PO PO-054', tungguGambarCetak);
  });
});
