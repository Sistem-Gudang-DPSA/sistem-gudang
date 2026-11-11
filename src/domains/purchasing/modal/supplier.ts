import type { Pajak } from '@/domains/purchasing/types';

export type SupplierImportRow = {
  name: string;
  address: string;
  npwp: string;            
  npwpPerorangan: string;  
  nik: string;             
};

export const supplierTemplateHeaders = ['Nama Supplier', 'Alamat Toko', 'NPWP BADAN', 'NPWP PERORANGAN', 'NO NIK'];
export const supplierTemplateExample = [
  'Bangun usaha Mulia',
  'Jln.Wonosari No KM 10, Dawukan Sendangtirto Kec Berbah, Kabupaten Sleman DIY',
  '0420025 00014187920',
  '',
  '',
];

const text = (v: unknown) => String(v ?? '').trim();
// Excel sering membaca angka panjang sebagai angka, dan spasi di NPWP ikut terbawa; rapikan keduanya
const digitsText = (v: unknown) => text(v).replace(/[^\d]/g, '');

export function parseSupplierRow(r: Record<string, unknown>, rowNumber: number): SupplierImportRow {
  const name = text(r['Nama Supplier']);
  if (!name) throw new Error(`Baris ${rowNumber}: Nama Supplier wajib diisi`);
  return {
    name,
    address: text(r['Alamat Toko']),
    npwp: digitsText(r['NPWP BADAN']),
    npwpPerorangan: digitsText(r['NPWP PERORANGAN']),
    nik: digitsText(r['NO NIK']),
  };
}