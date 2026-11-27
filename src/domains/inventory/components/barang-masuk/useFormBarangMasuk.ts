import { useEffect, useRef, useState } from 'react';
import { getItemByCode } from '@/domains/inventory/api';
import { todayIso } from '@/domains/inventory/date';
import type { CreateInboundBatchInput } from '@/domains/inventory/types';
import { barisPoTersedia, usePoPenerimaan, type BarisPoPenerimaan } from '@/domains/inventory/use-po-penerimaan';
import { ApiError } from '@/shared/lib/api-client';
import { randomId } from '@/shared/lib/random-id';
import type { BarisBarangMasuk, PoTerpilih } from './types';

export const MAX_QTY = 100000;
export const MAX_LINES = 200;

export function peringatanJumlahMasuk(value: string, field: 'kedatangan' | 'rekap'): string {
  const label = field === 'kedatangan' ? 'kedatangan' : 'rekap pembelian';
  if (!value) return `Isi jumlah ${label}.`;
  const valid = /^(?:\d{1,9}(?:\.\d{1,3})?|\.\d{1,3})$/.test(value);
  const qty = Number(value);
  if (/^\d*\.$/.test(value)) return 'Lengkapi angka desimal.';
  if (!valid) return 'Maksimal 3 angka desimal.';
  if (field === 'kedatangan' && qty <= 0) return 'Harus lebih dari 0.';
  if (field === 'kedatangan' && qty > MAX_QTY) return 'Maksimal 100.000.';
  if (qty < 0) return 'Minimal 0.';
  if (qty > 999_999_999) return 'Maksimal 999.999.999.';
  return '';
}

export type SaveBarangMasuk = (input: CreateInboundBatchInput, key: string, printAfter: boolean) => Promise<void>;

const labelBaris = (baris: { name?: string; code?: string | null; namaBarang?: string; kodeBarang?: string; noSpk?: string | null }) => {
  const nama = baris.name ?? baris.namaBarang ?? '';
  const kode = baris.code ?? baris.kodeBarang;
  const spk = baris.noSpk ? ` · ${baris.noSpk}` : '';
  return kode ? `${nama} (${kode})${spk}` : `${nama}${spk}`;
};

export function useFormBarangMasuk(onSave: SaveBarangMasuk) {
  const { pos, loading: poLoading, error: poError } = usePoPenerimaan();
  const [po, setPo] = useState<PoTerpilih | null>(null);
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
  const poRef = useRef(po);
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

  const barisPoSaatIni = () => {
    const selected = pos.find((candidate) => candidate.id === poRef.current?.id);
    return selected ? barisPoTersedia(selected) : [];
  };

  const pilihPo = (id: string) => {
    const selected = pos.find((candidate) => String(candidate.id) === id);
    if (!selected || selected.id === poRef.current?.id) return;
    // Baris lama tetap ada (satu batch boleh campur PO), tetapi scan yang sedang
    // berjalan tidak boleh jatuh ke PO yang baru dipilih.
    scanSession.current += 1;
    pendingRef.current = 0;
    scanOpenRef.current = false;
    poRef.current = { id: selected.id, nomorPo: selected.nomorPo, supplierName: selected.supplierName };
    setPo(poRef.current);
    setPendingScans(0);
    setScanOpen(false);
    setCameraOn(false);
    setScanValue('');
    setLockedName('');
    setScanError('');
    setError('');
  };

  const tambahManual = () => {
    if (!poRef.current || poLoading || savingRef.current || previewRef.current) return;
    if (rowsRef.current.length >= MAX_LINES) { setError('Maksimal 200 jenis barang dalam satu form.'); return; }
    updateRows((rows) => [...rows, {
      key: randomId(), manual: true, itemId: null, code: null, name: '', unit: '',
      purchaseOrderId: poRef.current!.id, purchaseOrderLineId: 0, poNumber: poRef.current!.nomorPo,
      supplierName: poRef.current!.supplierName, noSpk: null,
      qtyArrived: '1', qtyPurchased: '', sisa: 0,
    }]);
  };

  const patchBaris = (key: string, patch: Partial<Pick<BarisBarangMasuk, 'qtyArrived'>>) =>
    updateRows((rows) => rows.map((row) => row.key === key ? { ...row, ...patch } : row));
  const hapusBaris = (key: string) => updateRows((rows) => rows.filter((row) => row.key !== key));

  const pakaiBarisPo = (key: string, line: BarisPoPenerimaan) => {
    const duplicate = rowsRef.current.findIndex((row) => row.key !== key && row.purchaseOrderLineId === line.purchaseOrderLineId);
    if (duplicate !== -1) {
      setError(`Barang "${line.namaBarang}" sudah ada di baris ${duplicate + 1}. Ubah jumlah di baris tersebut.`);
      return;
    }
    updateRows((rows) => rows.map((row) => row.key === key ? {
      ...row,
      itemId: line.itemId!, code: line.kodeBarang, name: line.namaBarang, unit: line.satuan,
      purchaseOrderId: line.purchaseOrderId, purchaseOrderLineId: line.purchaseOrderLineId,
      poNumber: line.nomorPo, supplierName: line.supplierName, noSpk: line.noSpk ?? null,
      qtyPurchased: String(line.jumlah), sisa: line.sisa,
    } : row));
  };

  const pilihMaterial = (key: string, id: string) => {
    setScanError('');
    const line = barisPoSaatIni().find((candidate) => String(candidate.purchaseOrderLineId) === id);
    if (!line) return;
    pakaiBarisPo(key, line);
  };

  const tambahHasilScan = (item: Awaited<ReturnType<typeof getItemByCode>>) => {
    const cocok = barisPoSaatIni().filter((candidate) => candidate.itemId === item.id);
    if (cocok.length === 0) {
      setScanError(`Barang "${item.name}" tidak ada di PO yang dipilih.`);
      return;
    }
    const existing = rowsRef.current.find((row) => cocok.some((candidate) => candidate.purchaseOrderLineId === row.purchaseOrderLineId));
    if (existing) {
      const batas = Math.min(existing.sisa, MAX_QTY);
      if (Number(existing.qtyArrived) >= batas) {
        setScanError(`Jumlah kedatangan "${item.name}" maksimal ${batas} sesuai sisa PO.`);
        return;
      }
      patchBaris(existing.key, { qtyArrived: String(Number(Math.min(Number(existing.qtyArrived) + 1, batas).toFixed(3))) });
    } else {
      if (rowsRef.current.length >= MAX_LINES) { setScanError('Maksimal 200 jenis barang dalam satu form.'); return; }
      const line = cocok[0];
      updateRows((rows) => [...rows, {
        key: randomId(), manual: false, itemId: item.id, code: item.code, name: line.namaBarang,
        unit: line.satuan, purchaseOrderId: line.purchaseOrderId, purchaseOrderLineId: line.purchaseOrderLineId,
        poNumber: line.nomorPo, supplierName: line.supplierName, noSpk: line.noSpk ?? null,
        qtyArrived: String(Number(Math.min(1, line.sisa).toFixed(3))),
        qtyPurchased: String(line.jumlah), sisa: line.sisa,
      }]);
    }
    setLockedName(item.name);
  };

  const bukaScan = () => {
    if (!poRef.current || poLoading || savingRef.current || previewRef.current) return;
    scanOpenRef.current = true;
    setScanOpen(true);
    scanRef.current?.focus();
  };

  const readCode = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code || !activeRef.current || !scanOpenRef.current || !poRef.current || previewRef.current || savingRef.current) return;
    const session = scanSession.current;
    setScanError('');
    setLockedName('');
    const existing = rowsRef.current.find((row) =>
      row.code === code && row.purchaseOrderId === poRef.current?.id && Number(row.qtyArrived) < Math.min(row.sisa, MAX_QTY));
    if (existing) {
      const batas = Math.min(existing.sisa, MAX_QTY);
      patchBaris(existing.key, { qtyArrived: String(Number(Math.min(Number(existing.qtyArrived) + 1, batas).toFixed(3))) });
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
    if (!po || !tanggal) { setError('Nomor PO dan tanggal wajib diisi.'); return; }
    if (baris.length === 0) { setError('Tambahkan minimal satu barang.'); return; }
    for (const [index, row] of baris.entries()) {
      const prefix = `Baris ${index + 1}${row.name ? ` (${row.name})` : ''}: `;
      if (!row.itemId || !row.purchaseOrderLineId) { setError(`${prefix}pilih material terlebih dahulu.`); return; }
      const warning = peringatanJumlahMasuk(row.qtyArrived, 'kedatangan') || peringatanJumlahMasuk(row.qtyPurchased, 'rekap');
      if (warning) { setError(`${prefix}${warning}`); return; }
      if (Number(row.qtyArrived) > row.sisa) { setError(`${prefix}jumlah kedatangan melebihi sisa PO (${row.sisa}).`); return; }
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
      lines: baris.map((row) => ({
        itemId: row.itemId!, purchaseOrderId: row.purchaseOrderId,
        purchaseOrderLineId: row.purchaseOrderLineId,
        qtyArrived: Number(row.qtyArrived), qtyPurchased: Number(row.qtyPurchased), statusQc: 'PASS',
      })),
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
    const opsi = barisPoSaatIni().map((line) => ({ value: String(line.purchaseOrderLineId), label: labelBaris(line) }));
    const milikSendiri = row.purchaseOrderLineId > 0 && !opsi.some((option) => option.value === String(row.purchaseOrderLineId))
      ? [{ value: String(row.purchaseOrderLineId), label: `${labelBaris(row)} (${row.poNumber})` }] : [];
    return [...milikSendiri, ...opsi];
  };
  const pilihanPo = [
    ...(po && !pos.some((candidate) => candidate.id === po.id) ? [{ value: String(po.id), label: `${po.nomorPo} — ${po.supplierName}` }] : []),
    ...pos.map((candidate) => ({ value: String(candidate.id), label: `${candidate.nomorPo} — ${candidate.supplierName}` })),
  ];

  return {
    po, poLoading, poError, tanggal, setTanggal, baris, preview, printAfter, saving, error,
    scanOpen, scanValue, setScanValue, scanError, setScanError, pendingScans, cameraOn, setCameraOn, lockedName, scanRef,
    pilihPo, tambahManual, patchBaris, hapusBaris, pilihMaterial, pilihanMaterial, pilihanPo,
    bukaScan, readCode, bacaInputScan, openPreview, kembaliEdit, confirmSave,
  };
}
