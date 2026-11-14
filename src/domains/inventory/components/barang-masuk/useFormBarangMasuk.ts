import { useEffect, useRef, useState } from 'react';
import { getItemByCode } from '@/domains/inventory/api';
import { todayIso } from '@/domains/inventory/date';
import type { CreateInboundBatchInput } from '@/domains/inventory/types';
import { useItemSearch } from '@/domains/inventory/use-item-search';
import { useSupplierSearch } from '@/domains/purchasing/use-supplier-search';
import { ApiError } from '@/shared/lib/api-client';
import { randomId } from '@/shared/lib/random-id';
import type { BarisBarangMasuk, SupplierTerpilih } from './types';

export const MAX_QTY = 100000;
export const MAX_LINES = 200;

export type SaveBarangMasuk = (input: CreateInboundBatchInput, key: string, printAfter: boolean) => Promise<void>;

export function useFormBarangMasuk(onSave: SaveBarangMasuk) {
  const [supplier, setSupplier] = useState<SupplierTerpilih | null>(null);
  const [tanggal, setTanggal] = useState(todayIso);
  const [baris, setBaris] = useState<BarisBarangMasuk[]>([]);
  const [preview, setPreview] = useState(false);
  const [printAfter, setPrintAfter] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [scanValue, setScanValue] = useState('');
  const [scanError, setScanError] = useState('');
  const [pendingScans, setPendingScans] = useState(0);
  const [cameraOn, setCameraOn] = useState(false);
  const [lockedName, setLockedName] = useState('');
  const itemSearch = useItemSearch(supplier?.id);
  const supplierSearch = useSupplierSearch();
  const supplierRef = useRef(supplier);
  const rowsRef = useRef(baris);
  const scanSession = useRef(0);
  const pendingRef = useRef(0);
  const activeRef = useRef(false);
  const previewRef = useRef(false);
  const savingRef = useRef(false);
  const scanOpenRef = useRef(false);
  const submissionRef = useRef<{ body: string; key: string } | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; scanSession.current += 1; };
  }, []);
  useEffect(() => {
    if (scanOpen && !preview) scanRef.current?.focus();
  }, [scanOpen, preview]);

  const updateRows = (update: (rows: BarisBarangMasuk[]) => BarisBarangMasuk[]) => {
    const next = update(rowsRef.current);
    rowsRef.current = next;
    setBaris(next);
    setError('');
  };

  const pilihSupplier = (id: string) => {
    const selected = supplierSearch.suppliers.find((candidate) => String(candidate.id) === id)
      ?? (String(supplier?.id) === id ? supplier : null);
    if (selected?.id === supplierRef.current?.id) return;
    scanSession.current += 1;
    pendingRef.current = 0;
    scanOpenRef.current = false;
    supplierRef.current = selected ? { id: selected.id, name: selected.name } : null;
    setSupplier(supplierRef.current);
    setPendingScans(0);
    setScanOpen(false);
    setCameraOn(false);
    setScanValue('');
    setLockedName('');
    setScanError('');
    setError('');
    itemSearch.onSearch('');
  };

  const tambahManual = () => {
    if (!supplierRef.current || savingRef.current || previewRef.current) return;
    if (rowsRef.current.length >= MAX_LINES) { setError('Maksimal 200 jenis barang dalam satu form.'); return; }
    updateRows((rows) => [...rows, {
      key: randomId(), manual: true, itemId: null, code: null, name: '', unit: '', supplierId: null,
      qtyArrived: '1', qtyPurchased: '',
    }]);
  };

  const patchBaris = (key: string, patch: Partial<Pick<BarisBarangMasuk, 'qtyArrived' | 'qtyPurchased'>>) =>
    updateRows((rows) => rows.map((row) => row.key === key ? { ...row, ...patch } : row));
  const hapusBaris = (key: string) => updateRows((rows) => rows.filter((row) => row.key !== key));

  const pilihMaterial = (key: string, id: string) => {
    setScanError('');
    const item = itemSearch.items.find((candidate) => String(candidate.id) === id);
    if (!item) return;
    // Endpoint batch mengambil supplier dari master barang; pilihan header harus cocok dengan mapping tersebut.
    if (item.supplierId !== supplierRef.current?.id) {
      setError(`Barang "${item.name}" bukan dari supplier yang dipilih.`);
      return;
    }
    const duplicate = rowsRef.current.findIndex((row) => row.key !== key && row.itemId === item.id);
    if (duplicate !== -1) { setError(`Barang "${item.name}" sudah ada di baris ${duplicate + 1}. Ubah jumlah di baris tersebut.`); return; }
    updateRows((rows) => rows.map((row) => row.key === key ? {
      ...row, itemId: item.id, code: item.code, name: item.name, unit: item.unit, supplierId: item.supplierId,
    } : row));
  };

  const bukaScan = () => {
    if (!supplierRef.current || savingRef.current || previewRef.current) return;
    scanOpenRef.current = true;
    setScanOpen(true);
    scanRef.current?.focus();
  };

  const tambahHasilScan = (item: Awaited<ReturnType<typeof getItemByCode>>) => {
    if (item.supplierId !== supplierRef.current?.id) {
      setScanError(item.supplierId === null
        ? `Barang "${item.name}" belum memiliki supplier.`
        : `Barang "${item.name}" bukan dari supplier yang dipilih.`);
      return;
    }
    const existing = rowsRef.current.find((row) => row.itemId === item.id);
    if (existing) {
      if (Number(existing.qtyArrived) >= MAX_QTY) { setScanError('Jumlah kedatangan maksimal 100.000 per barang.'); return; }
      patchBaris(existing.key, { qtyArrived: String((Number(existing.qtyArrived) || 0) + 1) });
    } else {
      if (rowsRef.current.length >= MAX_LINES) { setScanError('Maksimal 200 jenis barang dalam satu form.'); return; }
      updateRows((rows) => [...rows, {
        key: randomId(), manual: false, itemId: item.id, code: item.code, name: item.name, unit: item.unit,
        supplierId: item.supplierId, qtyArrived: '1', qtyPurchased: '',
      }]);
    }
    setLockedName(item.name);
  };

  const readCode = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code || !activeRef.current || !scanOpenRef.current || !supplierRef.current || previewRef.current || savingRef.current) return;
    const session = scanSession.current;
    setScanError('');
    setLockedName('');
    const existing = rowsRef.current.find((row) => row.code === code);
    if (existing && existing.supplierId === supplierRef.current.id) {
      if (Number(existing.qtyArrived) >= MAX_QTY) { setScanError('Jumlah kedatangan maksimal 100.000 per barang.'); return; }
      patchBaris(existing.key, { qtyArrived: String((Number(existing.qtyArrived) || 0) + 1) });
      setLockedName(existing.name);
      return;
    }
    pendingRef.current += 1;
    setPendingScans(pendingRef.current);
    try {
      const item = await getItemByCode(code);
      if (!activeRef.current || session !== scanSession.current) return;
      tambahHasilScan(item);
    } catch (err) {
      if (!activeRef.current || session !== scanSession.current) return;
      setScanError(err instanceof ApiError && err.status === 404
        ? `Kode "${code}" tidak dikenal.`
        : err instanceof ApiError ? err.message : 'Gagal membaca kode barang.');
    } finally {
      if (activeRef.current && session === scanSession.current) {
        pendingRef.current = Math.max(0, pendingRef.current - 1);
        setPendingScans(pendingRef.current);
        scanRef.current?.focus();
      }
    }
  };

  const bacaInputScan = () => { const code = scanValue; setScanValue(''); void readCode(code); scanRef.current?.focus(); };

  const openPreview = (cetak: boolean) => {
    if (pendingRef.current > 0 || savingRef.current) return;
    if (!supplier || !tanggal) { setError('Nama supplier dan tanggal wajib diisi.'); return; }
    if (baris.length === 0) { setError('Tambahkan minimal satu barang.'); return; }
    for (const [index, row] of baris.entries()) {
      const prefix = `Baris ${index + 1}${row.name ? ` (${row.name})` : ''}: `;
      if (!row.itemId) { setError(`${prefix}pilih material terlebih dahulu.`); return; }
      if (row.supplierId !== supplier.id) { setError(`${prefix}barang bukan dari supplier yang dipilih. Ganti material atau hapus baris ini.`); return; }
      const arrived = Number(row.qtyArrived);
      if (row.qtyArrived === '' || !Number.isInteger(arrived) || arrived < 1 || arrived > MAX_QTY) {
        setError(`${prefix}jumlah kedatangan harus antara 1 dan 100.000.`); return;
      }
      const purchased = Number(row.qtyPurchased);
      if (row.qtyPurchased === '' || !Number.isSafeInteger(purchased) || purchased < 0) {
        setError(`${prefix}isi jumlah rekap pembelian dengan bilangan bulat minimal 0.`); return;
      }
    }
    scanSession.current += 1;
    previewRef.current = true;
    setCameraOn(false);
    setScanError('');
    setError('');
    setPrintAfter(cetak);
    setPreview(true);
  };

  const kembaliEdit = () => { previewRef.current = false; setError(''); setPreview(false); };

  const confirmSave = async () => {
    if (savingRef.current || !previewRef.current) return;
    const input: CreateInboundBatchInput = {
      date: tanggal,
      source: 'SUPPLIER',
      lines: baris.map((row) => ({ itemId: row.itemId!, qtyArrived: Number(row.qtyArrived), qtyPurchased: Number(row.qtyPurchased), statusQc: 'PASS' })),
    };
    const body = JSON.stringify(input);
    if (submissionRef.current?.body !== body) submissionRef.current = { body, key: randomId() };
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      await onSave(input, submissionRef.current.key, printAfter);
    } catch (err) {
      const messages = err instanceof ApiError && err.errors && !Array.isArray(err.errors)
        ? Object.entries(err.errors).map(([field, values]) => {
          const match = /^lines\.(\d+)\./.exec(field);
          const row = match ? baris[Number(match[1])] : null;
          return `${row ? `${row.name}: ` : ''}${values.join(', ')}`;
        }) : [];
      setError(messages.length > 0 ? messages.join('; ') : err instanceof ApiError ? err.message : 'Gagal menyimpan barang masuk.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const pilihanMaterial = (row: BarisBarangMasuk) => {
    const label = (item: { name: string; code: string | null }) => item.code ? `${item.name} (${item.code})` : item.name;
    return [
      ...(row.itemId !== null && !itemSearch.items.some((item) => item.id === row.itemId) ? [{ value: String(row.itemId), label: label(row) }] : []),
      ...itemSearch.items.map((item) => ({ value: String(item.id), label: label(item) })),
    ];
  };
  const pilihanSupplier = [
    ...(supplier && !supplierSearch.suppliers.some((candidate) => candidate.id === supplier.id) ? [{ value: String(supplier.id), label: supplier.name }] : []),
    ...supplierSearch.suppliers.map((candidate) => ({ value: String(candidate.id), label: candidate.name })),
  ];

  return {
    supplier, tanggal, setTanggal, baris, preview, printAfter, saving, error, itemSearch, supplierSearch,
    scanOpen, scanValue, setScanValue, scanError, setScanError, pendingScans, cameraOn, setCameraOn, lockedName, scanRef,
    pilihSupplier, tambahManual, patchBaris, hapusBaris, pilihMaterial, pilihanMaterial, pilihanSupplier,
    bukaScan, readCode, bacaInputScan, openPreview, kembaliEdit, confirmSave,
  };
}
