"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { formatAngka } from '@/domains/ppic/data/dokubah';
import { fetchPermintaan, type PermintaanPembelian } from '@/domains/ppic/data/pembelian';
import { useApiData } from '@/shared/lib/use-api-data';
import { listSuppliers } from '@/domains/purchasing/api';
import { addPo, lihatPermintaanPath, PEMESAN, rekap_pembelian_path } from '@/domains/purchasing/data/pembelian';
import type { Supplier } from '@/domains/purchasing/types';
import { ApiError } from '@/shared/lib/api-client';

type BarisHarga = { kodeBarang: string; harga: string; diskon: string };

const cellClass = 'px-3 py-2 border-b border-r border-gray-300';
const infoLabelClass = `${cellClass} w-40 text-xs text-gray-800 align-top`;
const infoValueClass = `${cellClass} text-xs text-gray-800 whitespace-normal`;
const sectionTitleClass = 'text-xs font-bold text-gray-900 uppercase mb-3';
const fieldClass = 'w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors';
const readOnlyFieldClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white text-right cursor-default focus:outline-none';
const cellInputClass = 'w-full min-w-24 px-2 py-1 bg-white border border-gray-300 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors';
const totalLabelClass = 'text-xs font-bold text-gray-900 uppercase';
// Kotak nilai di kolom kanan dibuat sama lebar supaya sejajar
const kotakTotalClass = 'w-64 max-w-full shrink-0';
const orangeButtonClass = 'min-w-24 px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm text-center';
const dividerClass = 'border-t border-gray-400 my-6';

// Input kosong atau bukan angka dihitung 0
const toNumber = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export default function PemesananPembelianPurchasing() {
  const { id } = useParams<{ id: string }>();
  const { data: permintaan, loading, error } = useApiData(() => fetchPermintaan(id), id, 'Gagal memuat permintaan pembelian.');

  if (loading || error) {
    return <div className="py-10 text-center text-sm text-gray-400 italic">{error || 'Memuat data...'}</div>;
  }

  if (permintaan && permintaan.statusApi !== 'approved') {
    return <div className="py-10 text-center text-sm text-gray-500">PO baru bisa dibuat setelah permintaan pembelian disetujui.</div>;
  }

  // Formnya baru dibuat setelah permintaan siap, supaya baris harga awal sesuai jumlah barang.
  return <FormPemesanan permintaan={permintaan ?? undefined} />;
}

function FormPemesanan({ permintaan }: { permintaan?: PermintaanPembelian }) {
  const router = useRouter();

  const [nomorPo, setNomorPo] = useState('');
  const [tanggalPo, setTanggalPo] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierError, setSupplierError] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [picSupplier, setPicSupplier] = useState('');
  const [barisHarga, setBarisHarga] = useState<BarisHarga[]>(
    () => (permintaan?.barang ?? []).map(() => ({ kodeBarang: '', harga: '', diskon: '' })),
  );
  const [persenPpn, setPersenPpn] = useState('12');
  const [jasa, setJasa] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let aktif = true;
    listSuppliers({ pageSize: 100 })
      .then((result) => {
        if (aktif) setSuppliers(result.rows);
      })
      .catch((err) => {
        if (aktif) setSupplierError(err instanceof ApiError ? err.message : 'Gagal memuat data supplier.');
      });
    return () => {
      aktif = false;
    };
  }, []);

  const backPath = permintaan ? lihatPermintaanPath(permintaan.id) : rekap_pembelian_path;

  const header = (
    <div className="flex items-center gap-3 mb-6">
      <Link href={backPath} aria-label="Kembali" className="text-gray-800 hover:opacity-70 transition-opacity">
        <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
      </Link>
      <h1 className="text-[18px] font-extrabold text-black tracking-wide">Rekap Pembelian Gudang</h1>
    </div>
  );

  if (!permintaan) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        {header}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-10 text-center text-gray-400 italic">
          Permintaan pembelian tidak ditemukan.
        </div>
      </div>
    );
  }

  const supplier = suppliers.find((s) => String(s.id) === supplierId);
  const kebutuhanProyek = Array.from(new Set(permintaan.barang.map((b) => b.proyek))).join(', ');

  const barang = permintaan.barang.map((b, index) => {
    const baris = barisHarga[index];
    const hargaSatuan = toNumber(baris.harga);
    const diskon = toNumber(baris.diskon);
    return { ...b, kodeBarang: baris.kodeBarang, hargaSatuan, diskon, total: b.qty * hargaSatuan - diskon };
  });

  const totalSetelahDiskon = barang.reduce((sum, b) => sum + b.total, 0);
  // DPP nilai lain = 11/12 dari harga jual; PPN dihitung dari DPP ini
  const dppLain = Math.round((totalSetelahDiskon * 11) / 12);
  const nilaiPpn = Math.round((dppLain * toNumber(persenPpn)) / 100);
  const totalSetelahPpn = totalSetelahDiskon + nilaiPpn;
  const grandTotal = totalSetelahPpn + toNumber(jasa);

  const updateBaris = (index: number, field: keyof BarisHarga, value: string) => {
    setBarisHarga((prev) => prev.map((baris, i) => (i === index ? { ...baris, [field]: value } : baris)));
  };

  const handleBuat = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (nomorPo.trim() === '' || tanggalPo === '') {
      setFormError('Nomor PO dan Tanggal PO wajib diisi.');
      return;
    }
    if (!supplier) {
      setFormError('Pilih supplier terlebih dahulu.');
      return;
    }
    if (barang.some((b) => b.hargaSatuan <= 0)) {
      setFormError('Harga satuan setiap barang wajib diisi lebih dari 0.');
      return;
    }
    if (barang.some((b) => b.diskon < 0 || b.total < 0) || toNumber(persenPpn) < 0 || toNumber(jasa) < 0) {
      setFormError('Diskon, PPN, dan Jasa tidak boleh minus, dan diskon tidak boleh melebihi harga barang.');
      return;
    }
    addPo({
      permintaanId: permintaan.id,
      nomorPo: nomorPo.trim(),
      tanggalPo,
      supplierId: supplier.id,
      picSupplier: picSupplier.trim(),
      barang: barang.map((b) => ({
        kodeBarang: b.kodeBarang.trim(),
        namaBarang: b.namaBarang,
        satuan: b.satuan,
        jumlah: b.qty,
        hargaSatuan: b.hargaSatuan,
        diskon: b.diskon,
      })),
      dppLain,
      persenPpn: toNumber(persenPpn),
      jasa: toNumber(jasa),
      grandTotal,
    });
    router.replace(rekap_pembelian_path);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {header}

      <form onSubmit={handleBuat} noValidate className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-bold text-gray-900 text-center mb-6">Pemesanan Pembelian</h2>

        {/* Nomor & tanggal PO */}
        <div className="flex flex-col gap-2 max-w-sm">
          <div className="flex items-center gap-2">
            <label htmlFor="po-nomor" className="w-24 shrink-0 text-sm font-medium text-gray-800">Nomor PO</label>
            <span className="text-gray-800">:</span>
            <input id="po-nomor" type="text" value={nomorPo} onChange={(e) => setNomorPo(e.target.value)} className={fieldClass} />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="po-tanggal" className="w-24 shrink-0 text-sm font-medium text-gray-800">Tanggal PO</label>
            <span className="text-gray-800">:</span>
            <input id="po-tanggal" type="date" value={tanggalPo} onChange={(e) => setTanggalPo(e.target.value)} className={fieldClass} />
          </div>
        </div>

        <hr className={dividerClass} />

        {/* Supplier & pemesan */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-6">
          <div>
            <h3 className={sectionTitleClass}>Tujuan Pemesanan (Supplier)</h3>
            <div className="border-t border-l border-gray-300 rounded-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th scope="col" className={`${cellClass} w-40 text-xs font-bold text-gray-900 uppercase`}>
                      <label htmlFor="po-supplier">Data Supplier</label>
                    </th>
                    <th scope="col" className={`${cellClass} font-normal`}>
                      <div className="relative">
                        <select
                          id="po-supplier"
                          value={supplierId}
                          onChange={(e) => setSupplierId(e.target.value)}
                          className={`${cellInputClass} appearance-none pr-8 cursor-pointer`}
                        >
                          <option value="" disabled>Kode Supplier</option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={infoLabelClass}>Nama Perusahaan</td>
                    <td className={infoValueClass}>{supplier?.name}</td>
                  </tr>
                  <tr>
                    <td className={infoLabelClass}>Alamat / Telp</td>
                    <td className={infoValueClass}>{supplier && `${supplier.address} / ${supplier.phone}`}</td>
                  </tr>
                  <tr>
                    <td className={infoLabelClass}>NPWP</td>
                    <td className={infoValueClass}>{supplier?.npwp}</td>
                  </tr>
                  <tr>
                    <td className={infoLabelClass}>No A/C (Bank)</td>
                    <td className={infoValueClass}>{supplier?.bank}</td>
                  </tr>
                  <tr>
                    <td className={infoLabelClass}>
                      <label htmlFor="po-pic-supplier">PIC / Telp</label>
                    </td>
                    <td className={infoValueClass}>
                      <input
                        id="po-pic-supplier"
                        type="text"
                        value={picSupplier}
                        onChange={(e) => setPicSupplier(e.target.value)}
                        className={cellInputClass}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {supplierError && <p className="mt-2 text-xs text-red-600">{supplierError}</p>}
          </div>

          <div>
            <h3 className={sectionTitleClass}>Pemesan</h3>
            <div className="border-t border-l border-gray-300 rounded-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th scope="col" colSpan={2} className={`${cellClass} text-xs font-bold text-gray-900 text-center`}>{PEMESAN.nama}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={infoLabelClass}>NPWP</td>
                    <td className={infoValueClass}>{PEMESAN.npwp}</td>
                  </tr>
                  <tr>
                    <td className={infoLabelClass}>Alamat Pengiriman</td>
                    <td className={infoValueClass}>{PEMESAN.alamatPengiriman}</td>
                  </tr>
                  <tr>
                    <td className={infoLabelClass}>Kebutuhan Proyek</td>
                    <td className={infoValueClass}>{kebutuhanProyek}</td>
                  </tr>
                  <tr>
                    <td className={infoLabelClass}>PIC / Telp</td>
                    <td className={infoValueClass}>{PEMESAN.pic}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <hr className={dividerClass} />

        {/* Daftar barang */}
        <h3 className="text-xs font-bold text-gray-900 mb-3">Daftar / Spesifikasi Barang Yang Dipesan :</h3>
        <div className="overflow-x-auto border-t border-l border-gray-300 rounded-sm">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="bg-gray-100 text-gray-900 font-bold text-xs">
              <tr>
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
              {barang.map((b, index) => (
                <tr key={`${b.namaBarang}-${index}`}>
                  <td className={`${cellClass} text-center`}>{index + 1}.</td>
                  <td className={cellClass}>
                    <input
                      type="text"
                      value={barisHarga[index].kodeBarang}
                      onChange={(e) => updateBaris(index, 'kodeBarang', e.target.value)}
                      aria-label={`Kode barang ${b.namaBarang}`}
                      className={cellInputClass}
                    />
                  </td>
                  <td className={cellClass}>{b.namaBarang}</td>
                  <td className={`${cellClass} text-center`}>{b.satuan}</td>
                  <td className={`${cellClass} text-center`}>{formatAngka(b.qty)}</td>
                  <td className={cellClass}>
                    <input
                      type="number"
                      min={0}
                      value={barisHarga[index].harga}
                      onChange={(e) => updateBaris(index, 'harga', e.target.value)}
                      placeholder="0"
                      aria-label={`Harga satuan ${b.namaBarang}`}
                      className={`${cellInputClass} text-right`}
                    />
                  </td>
                  <td className={cellClass}>
                    <input
                      type="number"
                      min={0}
                      value={barisHarga[index].diskon}
                      onChange={(e) => updateBaris(index, 'diskon', e.target.value)}
                      placeholder="0"
                      aria-label={`Diskon ${b.namaBarang}`}
                      className={`${cellInputClass} text-right`}
                    />
                  </td>
                  <td className={`${cellClass} text-right font-semibold ${b.total < 0 ? 'text-red-600' : ''}`}>{formatAngka(b.total)}</td>
                </tr>
              ))}
              {barang.length === 0 && (
                <tr>
                  <td colSpan={8} className={`${cellClass} px-6 py-10 text-center text-gray-400 italic`}>
                    Belum ada barang pada permintaan ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Perhitungan total */}
        <div className="flex items-center gap-4 mt-6">
          <span className={`${totalLabelClass} flex-1`}>Total Harga Setelah Diskon</span>
          <div className={kotakTotalClass}>
            <input type="text" readOnly value={formatAngka(totalSetelahDiskon)} aria-label="Total harga setelah diskon" className={readOnlyFieldClass} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-gray-400 mt-4 py-4">
          <div className="flex items-center gap-4 min-w-0">
            <label htmlFor="po-dpp" className={`${totalLabelClass} whitespace-nowrap`}>DPP Lain :</label>
            <div className="w-64 min-w-0">
              <input id="po-dpp" type="text" readOnly value={formatAngka(dppLain)} className={readOnlyFieldClass} />
            </div>
          </div>
          <div className="flex items-center gap-4 min-w-0">
            <label htmlFor="po-ppn" className={`${totalLabelClass} whitespace-nowrap`}>PPN :</label>
            <div className="w-28 min-w-0">
              <input
                id="po-ppn"
                type="number"
                min={0}
                value={persenPpn}
                onChange={(e) => setPersenPpn(e.target.value)}
                aria-label="PPN (persen)"
                className={`${fieldClass} text-right`}
              />
            </div>
          </div>
          <div className="w-64 min-w-0">
            <input type="text" readOnly value={formatAngka(nilaiPpn)} aria-label="Nilai PPN" className={readOnlyFieldClass} />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-400 pt-3">
          <div className="flex items-center gap-4">
            <span className={`${totalLabelClass} flex-1`}>Total Harga Setelah PPN</span>
            <span className="text-sm font-bold text-gray-900">Rp.</span>
            <div className={kotakTotalClass}>
              <input type="text" readOnly value={formatAngka(totalSetelahPpn)} aria-label="Total harga setelah PPN" className={readOnlyFieldClass} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label htmlFor="po-jasa" className={`${totalLabelClass} flex-1`}>Jasa</label>
            <div className={kotakTotalClass}>
              <input
                id="po-jasa"
                type="number"
                min={0}
                value={jasa}
                onChange={(e) => setJasa(e.target.value)}
                className={`${fieldClass} text-right`}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className={`${totalLabelClass} flex-1`}>Grand Total</span>
            <div className={kotakTotalClass}>
              <input type="text" readOnly value={formatAngka(grandTotal)} aria-label="Grand total" className={`${readOnlyFieldClass} font-bold`} />
            </div>
          </div>
        </div>

        <div className="border-t-4 border-double border-gray-400 mt-6" />

        {formError && (
          <p className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{formError}</p>
        )}

        <div className="flex justify-end mt-8">
          <button type="submit" className={orangeButtonClass}>Buat</button>
        </div>
      </form>
    </div>
  );
}
