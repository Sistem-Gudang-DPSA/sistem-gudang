"use client";

import React, { useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { formatAngka } from '@/domains/ppic/data/dokubah';
import { approveApproval } from '@/domains/ppic/api';
import { fetchPermintaan, type PermintaanPembelian } from '@/domains/ppic/data/pembelian';
import { useApiData } from '@/shared/lib/use-api-data';
import { createPurchaseOrder, savePurchaseRequestMapping, submitPurchaseOrder } from '@/domains/purchasing/api';
import { todayIso } from '@/domains/inventory/date';
import { useSupplierSearch } from '@/domains/purchasing/use-supplier-search';
import SearchableSelect from '@/shared/components/SearchableSelect';
import { INTEGER_INPUT, decimalOnly, digitsOnly, parsePpn } from '@/shared/lib/input';
import { lihatPermintaanPath, lihatPermintaanPoPath, po_barang_path, rekap_pembelian_path } from '@/domains/purchasing/data/pembelian';
import type { PurchaseOrder, Supplier } from '@/domains/purchasing/types';
import { useCan } from '@/domains/auth/user-context';
import { lineSudahDipesan, usePoPermintaan } from '@/domains/purchasing/use-po-permintaan';
import { printPurchaseOrder } from '@/domains/purchasing/export/print-po';
import { PurchaseOrderParties, PurchaseOrderTotalsSection } from './PurchaseOrderSections';
import { purchaseOrderTotals } from '../po-totals';
import { groupPoPreparation, readPoPreparation, type PreparedPoLine } from '../po-preparation';

type BarisHarga = { kodeBarang: string; harga: string; diskon: string };

const cellClass = 'px-3 py-2 border-b border-r border-gray-300';
const fieldClass = 'w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors';
const cellInputClass = 'w-full min-w-24 px-2 py-1 bg-white border border-gray-300 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors';
const orangeButtonClass = 'min-w-24 px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm text-center';
const dividerClass = 'border-t border-gray-400 my-6';

// Input kosong atau bukan angka dihitung 0
const toNumber = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export default function PemesananPembelianPurchasing() {
  const { id } = useParams<{ id: string }>();
  const preparationToken = useSearchParams().get('draft');
  const canCreate = useCan('purchase-order.create');
  const { data: permintaan, loading, error } = useApiData(() => fetchPermintaan(id), id, 'Gagal memuat permintaan pembelian.');

  if (loading || error) {
    return <div className="py-10 text-center text-sm text-gray-400 italic">{error || 'Memuat data...'}</div>;
  }

  if (permintaan && permintaan.statusApi !== 'approved' && !(permintaan.statusApi === 'pending' && permintaan.currentStepOrder === 3)) {
    return <div className="py-10 text-center text-sm text-gray-500">PO baru bisa dibuat setelah permintaan pembelian disetujui PPIC.</div>;
  }

  if (!canCreate) {
    return <div className="py-10 text-center text-sm text-gray-500">Anda tidak memiliki izin untuk membuat PO.</div>;
  }

  if (!permintaan) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        <div className="flex items-center gap-3 mb-6">
          <Link href={rekap_pembelian_path} aria-label="Kembali" className="text-gray-800 hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
          </Link>
          <h1 className="text-[18px] font-extrabold text-black tracking-wide">Rekap Pembelian Gudang</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-10 text-center text-gray-400 italic">
          Permintaan pembelian tidak ditemukan.
        </div>
      </div>
    );
  }

  // Formnya baru dibuat setelah permintaan siap, supaya baris harga awal sesuai jumlah barang.
  return <KelompokPemesanan key={`${id}|${preparationToken}`} permintaan={permintaan} />;
}

function KelompokPemesanan({ permintaan }: { permintaan: PermintaanPembelian }) {
  const poState = usePoPermintaan(permintaan.id);
  const canApprove = useCan('purchase-request.approve');
  const approvalTask = useRef<Promise<void> | null>(null);
  const ensureApproved = () => {
    if (permintaan.statusApi === 'approved') return Promise.resolve();
    if (approvalTask.current) return approvalTask.current;
    approvalTask.current = (async () => {
      const latest = await fetchPermintaan(String(permintaan.id));
      if (latest.statusApi === 'approved') return;
      if (latest.statusApi !== 'pending' || latest.currentStepOrder !== 3) throw new Error('Permintaan belum disetujui PPIC atau statusnya sudah berubah. Muat ulang detail permintaan.');
      if (!canApprove) throw new Error('Akun ini belum memiliki izin menyelesaikan proses permintaan untuk membuat PO. Hubungi Superadmin.');
      await approveApproval(permintaan.id);
      const updated = await fetchPermintaan(String(permintaan.id));
      if (updated.statusApi !== 'approved') throw new Error('Status permintaan belum siap untuk PO. Muat ulang detail permintaan.');
    })().catch((err) => { approvalTask.current = null; throw err; });
    return approvalTask.current;
  };
  const params = useSearchParams();
  const token = params.get('draft');
  const [prepared] = useState(() => token ? readPoPreparation(token, permintaan) : null);
  if (token && !prepared) {
    const backPath = params.get('from') === 'permintaan-po-barang' ? lihatPermintaanPoPath(permintaan.id) : lihatPermintaanPath(permintaan.id);
    return <div role="alert" className="p-6 text-sm text-red-600">Data persiapan PO tidak tersedia atau permintaan sudah berubah. <Link href={backPath} className="underline">Kembali ke detail permintaan dan lengkapi ulang.</Link></div>;
  }
  const lokasi = Array.from(new Map(permintaan.barang.map((b) => {
    const proyek = b.proyek.trim();
    const noSpk = b.noSpk?.trim() ?? '';
    return [JSON.stringify([proyek, noSpk]), { proyek, noSpk }];
  })).values());
  if (prepared) {
    const groups = groupPoPreparation(permintaan, prepared.lines);
    return <>
      <p className="mb-4 text-sm text-gray-600">Barang dikelompokkan otomatis per supplier, proyek, dan SPK. Qty Beli digunakan sebagai jumlah pesanan. Lengkapi harga, tanggal PO, serta PIC lalu simpan setiap PO sebagai DRAFT; yang sudah final bisa di-submit agar harganya beku.</p>
      {groups.map((group, index) => <FormPemesanan key={JSON.stringify([group.proyek, group.noSpk, group.supplier.id])} permintaan={permintaan} proyek={group.proyek} noSpk={group.noSpk} initialSupplier={group.supplier} preparedLines={group.lines} showHeader={index === 0} poState={poState} ensureApproved={ensureApproved} />)}
    </>;
  }
  return (
    <>
      <p className="mb-4 text-sm text-gray-600">Barang dikelompokkan otomatis per proyek dan SPK. Lengkapi dan simpan setiap PO sebagai DRAFT secara terpisah. Untuk supplier berbeda, pilih sebagian barang lalu buat PO berikutnya pada proyek dan SPK yang sama.</p>
      {(lokasi.length ? lokasi : [{ proyek: '', noSpk: '' }]).map(({ proyek, noSpk }, index) => (
        <FormPemesanan key={JSON.stringify([proyek, noSpk])} permintaan={permintaan} proyek={proyek} noSpk={noSpk} showHeader={index === 0} poState={poState} ensureApproved={ensureApproved} />
      ))}
    </>
  );
}

function FormPemesanan({ permintaan, proyek, noSpk, showHeader, poState, initialSupplier, preparedLines, ensureApproved }: { permintaan: PermintaanPembelian; proyek: string; noSpk: string; showHeader: boolean; poState: ReturnType<typeof usePoPermintaan>; initialSupplier?: Supplier; preparedLines?: PreparedPoLine[]; ensureApproved: () => Promise<void> }) {

  const idPrefix = useId();
  const canUpdate = useCan('purchase-order.update');
  const [pesanan, setPesanan] = useState<{ po: PurchaseOrder; indices: number[] }[]>([]);
  const [saving, setSaving] = useState(false);
  const [dibuat, setDibuat] = useState<PurchaseOrder | null>(null);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState('');
  const [tanggalPo, setTanggalPo] = useState(todayIso());
  const { suppliers, onSearch: cariSupplier, pending: supplierPending, error: supplierError } = useSupplierSearch();
  // Supplier terpilih disimpan sendiri supaya tetap ada walau di luar hasil pencarian terakhir.
  const [supplier, setSupplier] = useState<Supplier | null>(initialSupplier ?? null);
  const [picSupplier, setPicSupplier] = useState('');
  const [barisHarga, setBarisHarga] = useState<BarisHarga[]>(
    () => permintaan.barang.map((_, index) => {
      const prepared = preparedLines?.find((line) => line.lineIndex === index);
      return { kodeBarang: prepared?.kodeBarang ?? '', harga: prepared && prepared.harga > 0 ? String(prepared.harga) : '', diskon: '' };
    }),
  );
  const [persenPpn, setPersenPpn] = useState('12');
  const [jasa, setJasa] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Baris permintaan yang sudah masuk PO aktif tidak boleh dipesan lagi.
  // Pada draf Generate PO, satu baris boleh dipecah ke beberapa supplier, jadi kunci per baris tidak dipakai.
  const { pos, loading: poLoading, error: poError, reload } = poState;
  const sudahDipesan = preparedLines ? new Set<number>() : lineSudahDipesan(pos);
  pesanan.forEach(({ indices }) => indices.forEach((index) => sudahDipesan.add(index)));
  const [dipilih, setDipilih] = useState<Record<number, boolean>>({});
  const terpilih = (index: number) => preparedLines ? true : !sudahDipesan.has(index) && (dipilih[index] ?? true);

  // Asal halaman menentukan tujuan kembali: daftar PO Barang, detail permintaan versi PO Barang, atau detail Rekap.
  const from = useSearchParams().get('from');
  const backPath = from === 'po-barang'
    ? po_barang_path
    : from === 'permintaan-po-barang'
      ? lihatPermintaanPoPath(permintaan.id)
      : lihatPermintaanPath(permintaan.id);

  const header = (
    <div className="flex items-center gap-3 mb-6">
      <Link href={backPath} aria-label="Kembali" className="text-gray-800 hover:opacity-70 transition-opacity">
        <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
      </Link>
      <h1 className="text-[18px] font-extrabold text-black tracking-wide">Rekap Pembelian Gudang</h1>
    </div>
  );

  const barisSemua = permintaan.barang.map((b, index) => {
    const baris = barisHarga[index];
    const qty = preparedLines?.find((line) => line.lineIndex === index)?.qtyBeli ?? b.qty;
    const hargaSatuan = toNumber(baris.harga);
    const diskon = toNumber(baris.diskon);
    return { ...b, qty, index, kodeBarang: baris.kodeBarang, hargaSatuan, diskon, total: qty * hargaSatuan - diskon, dipilih: terpilih(index) };
  }).filter((b) => b.proyek.trim() === proyek && (b.noSpk?.trim() ?? '') === noSpk && (!preparedLines || preparedLines.some((line) => line.lineIndex === b.index)));
  const sisaBarang = barisSemua.filter((b) => !sudahDipesan.has(b.index));
  // Hanya baris yang dicentang yang masuk PO ini; sisanya untuk PO supplier lain.
  const barang = barisSemua.filter((b) => b.dipilih);

  const ppn = parsePpn(persenPpn);
  const { subtotal: totalSetelahDiskon, dppLain, nilaiPpn, totalSetelahPpn, grandTotal } = purchaseOrderTotals(
    barang.map((b) => ({ jumlah: b.qty, hargaSatuan: b.hargaSatuan, diskon: b.diskon })), ppn, toNumber(jasa),
  );

  const updateBaris = (index: number, field: keyof BarisHarga, value: string) => {
    setBarisHarga((prev) => prev.map((baris, i) => (i === index ? { ...baris, [field]: value } : baris)));
  };

  const handleBuat = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;
    if (poLoading || poError) {
      setFormError('Daftar PO sebelumnya harus berhasil dimuat sebelum membuat PO.');
      return;
    }
    if (!proyek) {
      setFormError('Proyek barang belum diisi. Perbaiki permintaan pembelian terlebih dahulu.');
      return;
    }
    if (barang.length === 0) {
      setFormError('Pilih minimal satu barang untuk PO ini.');
      return;
    }
    if (tanggalPo === '') {
      setFormError('Tanggal PO wajib diisi.');
      return;
    }
    if (!supplier) {
      setFormError('Pilih supplier terlebih dahulu.');
      return;
    }
    if (picSupplier.trim() === '') {
      setFormError('PIC supplier wajib diisi.');
      return;
    }
    if (barang.some((b) => b.kodeBarang.trim() === '')) {
      setFormError('Kode barang setiap baris wajib diisi.');
      return;
    }
    if (barang.some((b) => b.hargaSatuan <= 0)) {
      setFormError('Harga satuan setiap barang wajib diisi lebih dari 0.');
      return;
    }
    if (!Number.isFinite(ppn)) {
      setFormError('PPN harus berupa angka, misalnya 11 atau 11,5.');
      return;
    }
    if (barang.some((b) => b.diskon < 0 || b.total < 0) || ppn < 0 || ppn > 100 || toNumber(jasa) < 0) {
      setFormError('Diskon, PPN, dan Jasa tidak boleh minus, PPN maksimal 100, dan diskon tidak boleh melebihi harga barang.');
      return;
    }
    setSaving(true);
    setFormError('');
    setSubmitError('');
    try {
      await ensureApproved();
      // Mapping sudah disimpan saat Generate PO. Menyimpannya lagi di sini akan menimpa split supplier.
      if (!preparedLines) {
        // Backend mewajibkan supplier dan jumlah PO sesuai pemetaan setiap baris permintaan.
        await savePurchaseRequestMapping(permintaan.id, barang.map((b) => ({
          lineIndex: b.index,
          suppliers: [{ supplierId: supplier.id, qty: b.qty }],
        })));
      }
      // Totals shown on screen are a preview; the backend computes and stores the real ones.
      const po = await createPurchaseOrder({
          approvalRequestId: permintaan.id,
          tanggalPo,
          supplierId: supplier.id,
          picSupplier: picSupplier.trim(),
          barang: barang.map((b) => ({
            lineIndex: b.index,
            kodeBarang: b.kodeBarang.trim(),
            namaBarang: b.namaBarang,
            satuan: b.satuan,
            jumlah: b.qty,
            hargaSatuan: b.hargaSatuan,
            diskon: b.diskon,
          })),
          persenPpn: ppn,
          jasa: toNumber(jasa),
        });
      setPesanan((prev) => [...prev, { po, indices: barang.map((b) => b.index) }]);
      setDibuat(po);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal membuat PO.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (po: PurchaseOrder) => {
    if (submitting || !canUpdate) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const submitted = await submitPurchaseOrder(po.id);
      setDibuat(submitted);
      setPesanan((prev) => prev.map((entry) => entry.po.id === po.id ? { ...entry, po: submitted } : entry));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Gagal submit PO.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = async (po: PurchaseOrder) => {
    setPrinting(true);
    setPrintError('');
    try {
      await printPurchaseOrder(po);
    } catch {
      setPrintError('PO sudah tersimpan, tetapi dialog cetak gagal dibuka. Klik Cetak PO untuk mencoba lagi.');
    } finally {
      setPrinting(false);
    }
  };

  if (dibuat) {
    const isDraft = !dibuat.status || dibuat.status === 'DRAFT';
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        {showHeader && header}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-10 text-center">
          <p className="mb-2 text-sm font-semibold text-gray-900">Proyek: {proyek || 'Belum diisi'}{noSpk ? ` · No SPK: ${noSpk}` : ''}</p>
          <p className="text-base font-bold text-gray-900">PO {dibuat.nomorPo} berhasil disimpan sebagai {dibuat.status || 'DRAFT'}</p>
          <p className="mt-2 text-sm text-gray-600">Supplier {dibuat.supplierName}, grand total Rp. {formatAngka(dibuat.grandTotal)}</p>
          {isDraft && <p className="mt-4 text-sm text-amber-700">Harga masih bisa diedit. Submit PO untuk membekukan harga dan mengizinkan penerimaan barang.</p>}
          {submitError && <p role="alert" className="mt-4 text-sm text-red-600">{submitError}</p>}
          {!preparedLines && sisaBarang.length > 0 && (
            <button type="button" onClick={() => { setDibuat(null); setDipilih({}); setSupplier(initialSupplier ?? null); setPicSupplier(''); setJasa(''); }} className={`${orangeButtonClass} inline-block mt-6`}>Simpan Draft PO berikutnya untuk proyek ini ({sisaBarang.length} barang tersisa)</button>
          )}
          {printError && <p role="alert" className="mt-4 text-sm text-red-600">{printError}</p>}
          <button type="button" onClick={() => void handlePrint(dibuat)} disabled={printing} className={`${orangeButtonClass} inline-block mt-6 disabled:opacity-50`}>{printing ? 'Menyiapkan cetak...' : 'Cetak PO'}</button>
          {isDraft && canUpdate && <button type="button" onClick={() => void handleSubmit(dibuat)} disabled={submitting} className={`${orangeButtonClass} inline-block mt-6 ml-3 disabled:opacity-50`}>{submitting ? 'Mengirim...' : 'Submit PO'}</button>}
          <Link href={backPath} className={`${orangeButtonClass} inline-block mt-6 ml-3`}>Kembali ke {from === 'po-barang' ? 'PO Barang' : 'Detail Permintaan'}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {showHeader && header}

      <form aria-label={`PO ${proyek || 'Belum diisi'}${initialSupplier ? ` — ${initialSupplier.name}` : ''}`} onSubmit={handleBuat} noValidate className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-bold text-gray-900 text-center mb-6">Pemesanan Pembelian</h2>

        <h3 className="mb-4 text-sm font-bold text-gray-900">Proyek: {proyek || 'Belum diisi'}{noSpk ? ` — No SPK: ${noSpk}` : ''}{initialSupplier && ` — Supplier: ${initialSupplier.name}`}</h3>
        {pesanan.map(({ po }) => <p key={po.id} role="status" className="mb-3 text-sm text-green-700">PO {po.nomorPo} berhasil disimpan sebagai DRAFT untuk proyek {proyek}.</p>)}
        <fieldset disabled={saving}>
        {/* Nomor & tanggal PO */}
        <div className="flex flex-col gap-2 max-w-sm">
          <div className="flex items-center gap-2">
            <label htmlFor={`${idPrefix}-po-tanggal`} className="w-24 shrink-0 text-sm font-medium text-gray-800">Tanggal PO</label>
            <span className="text-gray-800">:</span>
            <input id={`${idPrefix}-po-tanggal`} type="date" value={tanggalPo} onChange={(e) => setTanggalPo(e.target.value)} className={fieldClass} />
          </div>
        </div>

        <hr className={dividerClass} />

        <PurchaseOrderParties
          supplier={supplier}
          supplierControl={
                        <SearchableSelect
                          disabled={!!preparedLines}
                          value={supplier ? String(supplier.id) : ''}
                          onChange={(v) => setSupplier((prev) => suppliers.find((s) => String(s.id) === v) ?? (prev && String(prev.id) === v ? prev : null))}
                          onSearch={cariSupplier}
                          pending={supplierPending}
                          options={[
                            ...(supplier && !suppliers.some((s) => s.id === supplier.id) ? [{ value: String(supplier.id), label: `${supplier.code} - ${supplier.name}` }] : []),
                            ...suppliers.map((s) => ({ value: String(s.id), label: `${s.code} - ${s.name}` })),
                          ]}
                          placeholder="Kode Supplier"
                          aria-label="Data Supplier"
                          className={cellInputClass}
                        />
          }
          supplierError={supplierError}
          pic={picSupplier}
          onPicChange={setPicSupplier}
          project={proyek}
        />

        <hr className={dividerClass} />

        {/* Daftar barang */}
        <h3 className="text-xs font-bold text-gray-900 mb-3">Daftar / Spesifikasi Barang Yang Dipesan :</h3>
        {poError && <p role="alert" className="mb-3 text-sm text-red-600">{poError} <button type="button" onClick={reload} className="underline">Coba lagi</button></p>}
        {!proyek && <p role="alert" className="mb-3 text-sm text-red-600">Proyek barang belum diisi. Perbaiki permintaan pembelian terlebih dahulu.</p>}
        {poLoading && <p className="mb-3 text-sm text-gray-500">Memuat PO sebelumnya...</p>}
        <div className="overflow-x-auto border-t border-l border-gray-300 rounded-sm">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="bg-gray-100 text-gray-900 font-bold text-xs">
              <tr>
                <th scope="col" className={`${cellClass} w-24 text-center`}>Pilih</th>
                <th scope="col" className={`${cellClass} w-12 text-center`}>No.</th>
                <th scope="col" className={`${cellClass} text-center`}>Kode Barang</th>
                <th scope="col" className={`${cellClass} text-center`}>Nama Item / Barang</th>
                <th scope="col" className={`${cellClass} text-center`}>Satuan</th>
                <th scope="col" className={`${cellClass} text-center`}>Jumlah</th>
                <th scope="col" className={`${cellClass} text-center`}>Harga / Sat (Rp)</th>
                <th scope="col" className={`${cellClass} text-center`}>Diskon (Rp)</th>
                <th scope="col" className={`${cellClass} text-center uppercase`}>Total Harga (Rp)</th>
              </tr>
            </thead>
            <tbody className="text-gray-800">
              {barisSemua.map((b) => {
                const sudah = sudahDipesan.has(b.index);
                return (
                  <tr key={`${b.namaBarang}-${b.index}`} className={b.dipilih ? '' : 'opacity-50'}>
                    <td className={`${cellClass} text-center`}>
                      {sudah ? (
                        <span className="text-xs text-gray-400">Sudah dipesan</span>
                      ) : preparedLines ? (
                        <span className="text-xs text-gray-600">Ya</span>
                      ) : (
                        <input type="checkbox" checked={b.dipilih} onChange={() => setDipilih((prev) => ({ ...prev, [b.index]: !b.dipilih }))}
                          aria-label={`Pilih ${b.namaBarang}`} />
                      )}
                    </td>
                    <td className={`${cellClass} text-center`}>{b.index + 1}.</td>
                    <td className={cellClass}>
                      <input
                        type="text"
                        maxLength={191}
                        value={barisHarga[b.index].kodeBarang}
                        onChange={(e) => updateBaris(b.index, 'kodeBarang', e.target.value)}
                        aria-label={`Kode barang ${b.namaBarang}`}
                        className={cellInputClass}
                      />
                    </td>
                    <td className={cellClass}>{b.namaBarang}</td>
                    <td className={`${cellClass} text-center`}>{b.satuan}</td>
                    <td className={`${cellClass} text-center`}>{formatAngka(b.qty)}</td>
                    <td className={cellClass}>
                      <input
                        {...INTEGER_INPUT}
                        maxLength={9}
                        value={barisHarga[b.index].harga}
                        onChange={(e) => updateBaris(b.index, 'harga', digitsOnly(e.target.value))}
                        placeholder="0"
                        aria-label={`Harga satuan ${b.namaBarang}`}
                        className={`${cellInputClass} text-right`}
                      />
                      {preparedLines && (() => {
                        const prepared = preparedLines.find((line) => line.lineIndex === b.index);
                        return prepared ? <span className="mt-1 block text-xs text-gray-500">Harga terbaru: {prepared.hargaTerbaru > 0 ? formatAngka(prepared.hargaTerbaru) : '-'}</span> : null;
                      })()}
                    </td>
                    <td className={cellClass}>
                      <input
                        {...INTEGER_INPUT}
                        maxLength={9}
                        value={barisHarga[b.index].diskon}
                        onChange={(e) => updateBaris(b.index, 'diskon', digitsOnly(e.target.value))}
                        placeholder="0"
                        aria-label={`Diskon ${b.namaBarang}`}
                        className={`${cellInputClass} text-right`}
                      />
                    </td>
                    <td className={`${cellClass} text-right font-semibold ${b.total < 0 ? 'text-red-600' : ''}`}>{formatAngka(b.total)}</td>
                  </tr>
                );
              })}
              {permintaan.barang.length === 0 && (
                <tr>
                  <td colSpan={9} className={`${cellClass} px-6 py-10 text-center text-gray-400 italic`}>
                    Belum ada barang pada permintaan ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {permintaan.barang.length > 0 && barang.length === 0 && (
          <p className="mt-3 text-sm text-gray-500">{sisaBarang.length === 0 ? 'Semua barang pada proyek ini sudah masuk PO.' : 'Belum ada barang yang dipilih untuk PO ini.'}</p>
        )}

        <PurchaseOrderTotalsSection
          totals={{ subtotal: totalSetelahDiskon, dppLain, nilaiPpn, totalSetelahPpn, grandTotal }}
          ppn={persenPpn}
          onPpnChange={(value) => setPersenPpn(decimalOnly(value.replace(',', '.')))}
          jasa={jasa}
          onJasaChange={(value) => setJasa(digitsOnly(value))}
        />

        <div className="border-t-4 border-double border-gray-400 mt-6" />

        {formError && (
          <p role="alert" className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{formError}</p>
        )}

        <div className="flex justify-end mt-8">
          <button type="submit" disabled={saving || poLoading || !!poError || sisaBarang.length === 0 || !proyek} className={`${orangeButtonClass} disabled:opacity-60`}>{saving ? 'Menyimpan...' : 'Simpan Draft'}</button>
        </div>
        </fieldset>
      </form>
    </div>
  );
}
