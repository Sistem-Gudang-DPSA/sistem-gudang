"use client";

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useCan } from '@/domains/auth/user-context';
import { formatAngka, formatRupiah } from '@/domains/ppic/data/dokubah';
import SearchableSelect from '@/shared/components/SearchableSelect';
import { useApiData } from '@/shared/lib/use-api-data';
import { INTEGER_INPUT, decimalOnly, digitsOnly, parsePpn } from '@/shared/lib/input';
import { getPurchaseOrder, updatePurchaseOrder } from '../api';
import { detailPoPath, po_barang_path } from '../data/pembelian';
import { purchaseOrderTotals } from '../po-totals';
import type { PurchaseOrder, PurchaseOrderLineInput, Supplier } from '../types';
import { useSupplierSearch } from '../use-supplier-search';
import { PurchaseOrderParties, PurchaseOrderTotalsSection } from './PurchaseOrderSections';

const fieldClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20';
const cellClass = 'px-3 py-2 border-b border-r border-gray-300';
const cellInputClass = 'w-full min-w-24 px-2 py-1 bg-white border border-gray-300 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500';
const dividerClass = 'border-t border-gray-400 my-6';
type DraftLine = { lineIndex?: number; kodeBarang: string; namaBarang: string; satuan: string; jumlah: string; hargaSatuan: string; diskon: string };

export default function EditPOBarang() {
  const { id } = useParams<{ id: string }>();
  const canView = useCan('purchase-order.view');
  const canUpdate = useCan('purchase-order.update');
  const allowed = canView && canUpdate;
  const { data: po, loading, error } = useApiData(() => allowed ? getPurchaseOrder(id) : Promise.resolve(null), `edit-po|${id}|${allowed}`, 'Gagal memuat PO untuk diedit.');
  return (
    <div className="pb-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href={po_barang_path} aria-label="Kembali ke PO Barang"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-xl font-extrabold text-gray-900">Edit PO Barang</h1>
      </div>
      {!allowed ? <p role="alert">Anda tidak memiliki izin untuk mengedit PO.</p>
        : loading ? <p role="status">Memuat data PO...</p>
        : error || !po ? <p role="alert" className="text-red-600">{error || 'PO tidak ditemukan.'}</p>
        : po.status !== 'ISSUED' ? <p role="alert">PO yang sudah dibatalkan tidak dapat diedit.</p>
        : <FormEditPO key={po.id} po={po} />}
    </div>
  );
}

function FormEditPO({ po }: { po: PurchaseOrder }) {
  const [tanggal, setTanggal] = useState(po.tanggalPo.slice(0, 10));
  const [supplier, setSupplier] = useState<Supplier>({ id: po.supplierId, code: '', name: po.supplierName, address: po.supplierAddress ?? '', phone: po.supplierPhone ?? '', bank: po.supplierBank ?? '', npwp: po.supplierNpwp ?? '', pajak: 'NON_PKP' });
  const { suppliers, onSearch, pending, error: supplierError } = useSupplierSearch();
  const options = suppliers.some((row) => row.id === supplier.id) ? suppliers : [supplier, ...suppliers];
  const [pic, setPic] = useState(po.picSupplier);
  const [proyek, setProyek] = useState(po.kebutuhanProyek ?? '');
  const [lines, setLines] = useState<DraftLine[]>(() => po.barang.map((line) => ({ ...line, ...(line.lineIndex == null ? { lineIndex: undefined } : {}), jumlah: String(line.jumlah), hargaSatuan: String(line.hargaSatuan), diskon: String(line.diskon) })));
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [ppn, setPpn] = useState(String(po.persenPpn));
  const [jasa, setJasa] = useState(String(po.jasa));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [saved, setSaved] = useState<PurchaseOrder | null>(null);
  const numericLines: PurchaseOrderLineInput[] = lines.map((line) => ({ ...line, jumlah: Number(line.jumlah), hargaSatuan: Number(line.hargaSatuan), diskon: Number(line.diskon) }));
  const chosenLines = lines.filter((_, index) => selected[index] ?? true);
  const orderLines = numericLines.filter((_, index) => selected[index] ?? true);
  const totals = purchaseOrderTotals(orderLines, parsePpn(ppn), Number(jasa));
  const patchLine = (index: number, key: keyof DraftLine, value: string) => setLines((prev) => prev.map((line, i) => i === index ? { ...line, [key]: value } : line));

  const save = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    if (!tanggal || !pic.trim()) { setError('Tanggal PO dan PIC supplier wajib diisi.'); return; }
    if (!chosenLines.length) { setError('Pilih minimal satu barang untuk PO ini.'); return; }
    if (chosenLines.some((line) => !line.kodeBarang.trim() || !line.namaBarang.trim() || !line.satuan.trim() || line.hargaSatuan.trim() === '')) { setError('Kode, nama, satuan, dan harga setiap barang wajib diisi.'); return; }
    if (orderLines.some((line) => !Number.isInteger(line.jumlah) || line.jumlah < 1 || line.jumlah > 1_000_000 || !Number.isInteger(line.hargaSatuan) || line.hargaSatuan < 0 || line.hargaSatuan > 2_000_000_000 || !Number.isInteger(line.diskon) || line.diskon < 0 || line.diskon > line.jumlah * line.hargaSatuan)) { setError('Periksa jumlah (1–1.000.000), harga (maksimal 2.000.000.000), dan diskon setiap barang. Diskon tidak boleh melebihi nilai barang.'); return; }
    const persenPpn = parsePpn(ppn);
    if (!Number.isFinite(persenPpn) || persenPpn < 0 || persenPpn > 100 || !Number.isInteger(Number(jasa)) || Number(jasa) < 0 || Number(jasa) > 2_000_000_000) { setError('PPN harus antara 0–100 persen dan jasa harus bilangan bulat antara 0–2.000.000.000.'); return; }
    submitting.current = true;
    setSaving(true);
    setError('');
    try {
      const updated = await updatePurchaseOrder(po.id, { tanggalPo: tanggal, supplierId: supplier.id, picSupplier: pic.trim(), kebutuhanProyek: proyek.trim(), barang: orderLines.map((line) => ({ ...line, kodeBarang: line.kodeBarang.trim(), namaBarang: line.namaBarang.trim(), satuan: line.satuan.trim() })), persenPpn, jasa: Number(jasa) });
      setSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan PO.');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  if (saved) return <div className="rounded-2xl border border-green-100 bg-white p-6">
    <p role="status" className="font-semibold text-green-700">Perubahan PO {saved.nomorPo} berhasil disimpan.</p>
    <p className="mt-2 text-sm">Supplier: {saved.supplierName} · Total: {formatRupiah(saved.grandTotal)}</p>
    <Link href={detailPoPath(saved.id)} className="mt-4 inline-block rounded-lg bg-orange-500 px-4 py-2 text-white">Lihat Detail PO</Link>
  </div>;

  return (
    <form aria-label={`Edit ${po.nomorPo}`} onSubmit={save} noValidate className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-base font-bold text-gray-900 text-center mb-6">Pemesanan Pembelian — {po.nomorPo}</h2>
      <fieldset disabled={saving}>
        <h3 className="mb-4 text-sm font-bold text-gray-900">Proyek: {proyek || 'Belum diisi'}</h3>
        <div className="flex flex-col gap-2 max-w-sm">
          <div className="flex items-center gap-2">
            <label htmlFor="edit-po-tanggal" className="w-24 shrink-0 text-sm font-medium text-gray-800">Tanggal PO</label>
            <span className="text-gray-800">:</span>
            <input id="edit-po-tanggal" type="date" value={tanggal} onChange={(event) => setTanggal(event.target.value)} className={fieldClass} />
          </div>
        </div>
        <hr className={dividerClass} />
        <PurchaseOrderParties
          supplier={supplier}
          supplierControl={<SearchableSelect aria-label="Data Supplier" value={String(supplier.id)} options={options.map((row) => ({ value: String(row.id), label: `${row.code ? `${row.code} - ` : ''}${row.name}` }))} onChange={(id) => { const chosen = options.find((row) => String(row.id) === id); if (chosen) setSupplier(chosen); }} onSearch={onSearch} pending={pending} disabled={saving} placeholder="Kode Supplier" className={cellInputClass} />}
          supplierError={supplierError}
          pic={pic}
          onPicChange={setPic}
          picLabel="PIC / Telp Supplier"
          project={<input aria-label="Kebutuhan Proyek" type="text" maxLength={191} value={proyek} onChange={(event) => setProyek(event.target.value)} className={cellInputClass} />}
        />
        <hr className={dividerClass} />
        <h3 className="text-xs font-bold text-gray-900 mb-3">Daftar / Spesifikasi Barang Yang Dipesan :</h3>
        <div className="overflow-x-auto border-t border-l border-gray-300 rounded-sm">
          <table aria-label="Daftar barang PO" className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="bg-gray-100 text-gray-900 font-bold text-xs"><tr>{['Pilih', 'No.', 'Kode Barang', 'Nama Item / Barang', 'Satuan', 'Jumlah', 'Harga / Sat (Rp)', 'Diskon (Rp)', 'Total Harga (Rp)'].map((title) => <th scope="col" key={title} className={`${cellClass} text-center ${title === 'Pilih' ? 'w-24' : title === 'No.' ? 'w-12' : ''}`}>{title}</th>)}</tr></thead>
            <tbody className="text-gray-800">{lines.map((line, index) => <tr key={index} className={(selected[index] ?? true) ? '' : 'opacity-50'}>
              <td className={`${cellClass} text-center`}><input type="checkbox" aria-label={`Pilih baris ${index + 1}`} checked={selected[index] ?? true} onChange={() => setSelected((prev) => ({ ...prev, [index]: !(prev[index] ?? true) }))} /></td>
              <td className={`${cellClass} text-center`}>{index + 1}.</td>
              {(['kodeBarang', 'namaBarang', 'satuan'] as const).map((key) => <td className={cellClass} key={key}><input type="text" aria-label={`${key === 'kodeBarang' ? 'Kode barang' : key === 'namaBarang' ? 'Nama barang' : 'Satuan'} baris ${index + 1}`} value={line[key]} maxLength={key === 'satuan' ? 50 : 191} onChange={(event) => patchLine(index, key, event.target.value)} className={cellInputClass} /></td>)}
              {(['jumlah', 'hargaSatuan', 'diskon'] as const).map((key) => <td className={cellClass} key={key}><input {...INTEGER_INPUT} aria-label={`${key === 'jumlah' ? 'Jumlah' : key === 'hargaSatuan' ? 'Harga satuan' : 'Diskon'} baris ${index + 1}`} value={line[key]} maxLength={key === 'jumlah' ? 7 : 10} onChange={(event) => patchLine(index, key, digitsOnly(event.target.value))} className={`${cellInputClass} text-right`} /></td>)}
              <td className={`${cellClass} text-right font-semibold`}>{formatAngka(numericLines[index].jumlah * numericLines[index].hargaSatuan - numericLines[index].diskon)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <PurchaseOrderTotalsSection
          totals={totals}
          ppn={ppn}
          onPpnChange={(value) => setPpn(decimalOnly(value.replace(',', '.')))}
          ppnLabel="PPN (%)"
          jasa={jasa}
          onJasaChange={(value) => setJasa(digitsOnly(value))}
          jasaMaxLength={10}
        />
        <div className="border-t-4 border-double border-gray-400 mt-6" />
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <Link href={po_barang_path} aria-disabled={saving} onClick={(event) => { if (saving) event.preventDefault(); }} className="rounded-lg border px-5 py-2">Batal</Link>
          <button type="submit" disabled={saving} className="rounded-lg bg-orange-500 px-5 py-2 font-semibold text-white disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
        </div>
      </fieldset>
    </form>
  );
}
