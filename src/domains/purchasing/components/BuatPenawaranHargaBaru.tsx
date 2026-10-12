"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function BuatSPHBaru() {

    const [formError, setFormError] = useState("");

    const header = (
        <div className="flex items-center gap-3 mb-6">
            <Link
                href="/dashboard/purchasing/transaksi/penawaran-harga"
                aria-label="Kembali"
                className="text-gray-800 hover:opacity-70 transition-opacity"
            >
                <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
            </Link>

            <h1 className="text-[18px] font-extrabold text-black tracking-wide">
                Penawaran Harga
            </h1>
        </div>
    );

    // const handleBuat = async (
    //     e: React.FormEvent<HTMLFormElement>
    // ) => {
    //     e.preventDefault();
    //     setFormError("");

    //     if (!tanggalPo) {
    //         setFormError("Tanggal PO wajib diisi.");
    //         return;
    //     }

    //     if (!supplier) {
    //         setFormError("Pilih supplier terlebih dahulu.");
    //         return;
    //     }

    //     if (!picSupplier.trim()) {
    //         setFormError("PIC supplier wajib diisi.");
    //         return;
    //     }

    //     if (barisBarang.length === 0) {
    //         setFormError("Tambahkan minimal satu barang.");
    //         return;
    //     }

    //     if (
    //         barang.some(
    //             (b) =>
    //                 !b.kodeBarang.trim() ||
    //                 !b.namaBarang.trim() ||
    //                 !b.satuan.trim()
    //         )
    //     ) {
    //         setFormError(
    //             "Kode barang, nama barang, dan satuan wajib diisi."
    //         );
    //         return;
    //     }

    //     if (
    //         barang.some(
    //             (b) => b.jumlah <= 0 || b.hargaSatuan <= 0
    //         )
    //     ) {
    //         setFormError(
    //             "Jumlah dan harga satuan setiap barang harus lebih dari 0."
    //         );
    //         return;
    //     }

    //     if (
    //         barang.some((b) => b.diskon < 0 || b.total < 0) ||
    //         toNumber(persenPpn) < 0 ||
    //         toNumber(persenPpn) > 100 ||
    //         toNumber(jasa) < 0
    //     ) {
    //         setFormError(
    //             "Diskon dan jasa tidak boleh minus, PPN maksimal 100%, dan diskon tidak boleh melebihi total harga barang."
    //         );
    //         return;
    //     }

    //     setSaving(true);

    //     try {
    //         /*
    //          * PO dibuat langsung tanpa approvalRequestId.
    //          * Pastikan tipe payload dan endpoint backend juga mendukung
    //          * pembuatan PO mandiri tanpa ID permintaan pembelian.
    //          */
    //         const payload = {
    //             tanggalPo,
    //             supplierId: supplier.id,
    //             picSupplier: picSupplier.trim(),
    //             barang: barang.map((b) => ({
    //                 kodeBarang: b.kodeBarang.trim(),
    //                 namaBarang: b.namaBarang.trim(),
    //                 satuan: b.satuan.trim(),
    //                 jumlah: b.jumlah,
    //                 hargaSatuan: b.hargaSatuan,
    //                 diskon: b.diskon,
    //             })),
    //             persenPpn: toNumber(persenPpn),
    //             jasa: toNumber(jasa),
    //         };

    //         const hasil = await createPurchaseOrder(
    //             payload as Parameters<typeof createPurchaseOrder>[0]
    //         );

    //         setDibuat(hasil);
    //     } catch (err) {
    //         setFormError(
    //             err instanceof ApiError
    //                 ? err.message
    //                 : "Gagal membuat PO."
    //         );
    //     } finally {
    //         setSaving(false);
    //     }
    // };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {header}

            <form
                // onSubmit={handleBuat}
                noValidate
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
                <h2 className="text-base font-bold text-gray-900 text-center mb-6">
                    Buat Penawaran Harga
                </h2>
            </form>
        </div>


    )
}