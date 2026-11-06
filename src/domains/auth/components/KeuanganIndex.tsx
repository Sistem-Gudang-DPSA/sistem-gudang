import { redirect } from "next/navigation";

export default function KeuanganIndex() {
  redirect("/dashboard/keuangan/laporan/barang-masuk");
}
