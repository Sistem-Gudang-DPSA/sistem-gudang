import { permintaan_pembelian_path } from '../data/pembelian';
import PermintaanPembelianTambahDariAkun from './PermintaanPembelianTambahDariAkun';

export default function PermintaanPembelianPengajuanPpic() {
  return <PermintaanPembelianTambahDariAkun basePath={permintaan_pembelian_path} fallbackBagian="PPIC" />;
}
