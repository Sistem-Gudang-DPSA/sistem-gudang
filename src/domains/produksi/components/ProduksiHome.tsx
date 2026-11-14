import { redirect } from "next/navigation";

export default function ProduksiHome() {
  redirect("/dashboard/produksi/laporan/data-barang");
}
