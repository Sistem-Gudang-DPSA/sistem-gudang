"use client";

import { useId, type ReactNode } from 'react';
import { formatAngka } from '@/domains/ppic/data/dokubah';
import { INTEGER_INPUT } from '@/shared/lib/input';
import { PEMESAN } from '../data/pembelian';
import type { purchaseOrderTotals } from '../po-totals';
import type { Supplier } from '../types';

const cellClass = 'px-3 py-2 border-b border-r border-gray-300';
const infoLabelClass = `${cellClass} w-40 text-xs text-gray-800 align-top`;
const infoValueClass = `${cellClass} text-xs text-gray-800 whitespace-normal`;
const sectionTitleClass = 'text-xs font-bold text-gray-900 uppercase mb-3';
const fieldClass = 'w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500';
const inputClass = 'w-full min-w-24 px-2 py-1 bg-white border border-gray-300 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500';
const readOnlyClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white text-right cursor-default focus:outline-none';
const totalLabelClass = 'text-xs font-bold text-gray-900 uppercase';
const totalWidthClass = 'w-64 max-w-full shrink-0';

export function PurchaseOrderParties({ supplier, supplierControl, supplierError, pic, onPicChange, picLabel = 'PIC / Telp', project }: {
  supplier: Supplier | null;
  supplierControl: ReactNode;
  supplierError?: string;
  pic: string;
  onPicChange: (value: string) => void;
  picLabel?: string;
  project: ReactNode;
}) {
  const id = useId();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-6">
      <section aria-label="Tujuan Pemesanan (Supplier)">
        <h3 className={sectionTitleClass}>Tujuan Pemesanan (Supplier)</h3>
        <div className="border-t border-l border-gray-300 rounded-sm">
          <table aria-label="Data supplier PO" className="w-full text-left border-collapse">
            <thead className="bg-gray-100"><tr>
              <th scope="row" className={`${cellClass} w-40 text-xs font-bold text-gray-900 uppercase`}>Data Supplier</th>
              <td className={`${cellClass} font-normal`}><div className="relative">{supplierControl}</div></td>
            </tr></thead>
            <tbody>
              {[
                ['Nama Perusahaan', supplier?.name],
                ['Alamat / Telp', supplier && `${supplier.address} / ${supplier.phone}`],
                ['NPWP', supplier?.npwp],
                ['No A/C (Bank)', supplier?.bank],
              ].map(([label, value]) => <tr key={label}>
                <th scope="row" className={`${infoLabelClass} font-normal`}>{label}</th>
                <td className={infoValueClass}>{value}</td>
              </tr>)}
              <tr>
                <th scope="row" className={`${infoLabelClass} font-normal`}><label htmlFor={`${id}-pic`}>PIC / Telp</label></th>
                <td className={infoValueClass}><input id={`${id}-pic`} aria-label={picLabel} type="text" maxLength={191} value={pic} onChange={(event) => onPicChange(event.target.value)} className={inputClass} /></td>
              </tr>
            </tbody>
          </table>
        </div>
        {supplierError && <p role="alert" className="mt-2 text-xs text-red-600">{supplierError}</p>}
      </section>
      <section aria-label="Pemesan">
        <h3 className={sectionTitleClass}>Pemesan</h3>
        <div className="border-t border-l border-gray-300 rounded-sm">
          <table aria-label="Data pemesan PO" className="w-full text-left border-collapse">
            <thead className="bg-gray-100"><tr><th colSpan={2} className={`${cellClass} text-xs font-bold text-gray-900 text-center`}>{PEMESAN.nama}</th></tr></thead>
            <tbody>
              <tr><th scope="row" className={`${infoLabelClass} font-normal`}>NPWP</th><td className={infoValueClass}>{PEMESAN.npwp}</td></tr>
              <tr><th scope="row" className={`${infoLabelClass} font-normal`}>Alamat Pengiriman</th><td className={infoValueClass}>{PEMESAN.alamatPengiriman}</td></tr>
              <tr><th scope="row" className={`${infoLabelClass} font-normal`}>Kebutuhan Proyek</th><td className={infoValueClass}>{project}</td></tr>
              <tr><th scope="row" className={`${infoLabelClass} font-normal`}>PIC / Telp</th><td className={infoValueClass}>{PEMESAN.pic}</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function PurchaseOrderTotalsSection({ totals, ppn, onPpnChange, jasa, onJasaChange, ppnLabel = 'PPN (persen)', jasaMaxLength = 9 }: {
  totals: ReturnType<typeof purchaseOrderTotals>;
  ppn: string;
  onPpnChange: (value: string) => void;
  jasa: string;
  onJasaChange: (value: string) => void;
  ppnLabel?: string;
  jasaMaxLength?: number;
}) {
  const id = useId();
  return (
    <>
      <div className="flex items-center gap-4 mt-6">
        <span className={`${totalLabelClass} flex-1`}>Total Harga Setelah Diskon</span>
        <div className={totalWidthClass}><input type="text" readOnly value={formatAngka(totals.subtotal)} aria-label="Total harga setelah diskon" className={readOnlyClass} /></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-400 mt-4 py-4">
        <div className="flex items-center gap-4 min-w-0">
          <label htmlFor={`${id}-dpp`} className={`${totalLabelClass} whitespace-nowrap`}>DPP Lain :</label>
          <div className="w-64 min-w-0"><input id={`${id}-dpp`} type="text" readOnly value={formatAngka(totals.dppLain)} className={readOnlyClass} /></div>
        </div>
        <div className="flex items-center gap-4 min-w-0">
          <label htmlFor={`${id}-ppn`} className={`${totalLabelClass} whitespace-nowrap`}>PPN :</label>
          <div className="w-28 min-w-0"><input id={`${id}-ppn`} type="text" inputMode="decimal" maxLength={6} aria-label={ppnLabel} value={ppn} onChange={(event) => onPpnChange(event.target.value)} className={`${fieldClass} text-right`} /></div>
        </div>
        <div className={totalWidthClass}><input type="text" readOnly value={formatAngka(totals.nilaiPpn)} aria-label="Nilai PPN" className={readOnlyClass} /></div>
      </div>
      <div className="flex flex-col gap-3 border-t border-gray-400 pt-3">
        <div className="flex items-center gap-4"><span className={`${totalLabelClass} flex-1`}>Total Harga Setelah PPN</span><span className="text-sm font-bold text-gray-900">Rp.</span><div className={totalWidthClass}><input type="text" readOnly value={formatAngka(totals.totalSetelahPpn)} aria-label="Total harga setelah PPN" className={readOnlyClass} /></div></div>
        <div className="flex items-center gap-4"><label htmlFor={`${id}-jasa`} className={`${totalLabelClass} flex-1`}>Jasa</label><div className={totalWidthClass}><input id={`${id}-jasa`} {...INTEGER_INPUT} maxLength={jasaMaxLength} value={jasa} onChange={(event) => onJasaChange(event.target.value)} className={`${fieldClass} text-right`} /></div></div>
        <div className="flex items-center gap-4"><span className={`${totalLabelClass} flex-1`}>Grand Total</span><div className={totalWidthClass}><input type="text" readOnly value={formatAngka(totals.grandTotal)} aria-label="Grand total" className={`${readOnlyClass} font-bold`} /></div></div>
      </div>
    </>
  );
}
