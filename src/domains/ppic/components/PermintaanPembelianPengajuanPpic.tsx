import { redirect } from 'next/navigation';
import { permintaan_pembelian_path } from '../data/pembelian';

export default function PermintaanPembelianPengajuanPpic() {
  redirect(permintaan_pembelian_path);
}
