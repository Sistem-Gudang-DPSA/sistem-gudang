
"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Plus, Trash2 } from "lucide-react";
import { formatAngka } from "@/domains/ppic/data/dokubah";
import { createPurchaseOrder, listSuppliers } from "@/domains/purchasing/api";
import { digitsOnly } from "@/shared/lib/input";
import { PEMESAN } from "@/domains/purchasing/data/pembelian";
import type { PurchaseOrder, Supplier } from "@/domains/purchasing/types";
import { ApiError } from "@/shared/lib/api-client";
import { listItems } from '@/domains/inventory/api';
import { useApiData } from '@/shared/lib/use-api-data';
import { createPortal } from "react-dom";

type BarisBarang = {
    id: number;
    kodeBarang: string;
    namaBarang: string;
    satuan: string;
    jumlah: string;
    harga: string;
    diskon: string;
};

const cellClass = "px-3 py-2 border-b border-r border-gray-300";
const infoLabelClass = `${cellClass} w-40 text-xs text-gray-800 align-top`;
const infoValueClass = `${cellClass} text-xs text-gray-800 whitespace-normal`;
const sectionTitleClass = "text-xs font-bold text-gray-900 uppercase mb-3";
const fieldClass = "w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors";
const readOnlyFieldClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white text-right cursor-default focus:outline-none";
const cellInputClass = "w-full min-w-24 px-2 py-1 bg-white border border-gray-300 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors";
const totalLabelClass = "text-xs font-bold text-gray-900 uppercase";
const kotakTotalClass = "w-64 max-w-full shrink-0";
const orangeButtonClass = "min-w-24 px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm text-center";
const dividerClass = "border-t border-gray-400 my-6";

const toNumber = (value: string) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const buatBarisBarang = (): BarisBarang => ({
    id: Date.now() + Math.random(),
    kodeBarang: "",
    namaBarang: "",
    satuan: "",
    jumlah: "1",
    harga: "",
    diskon: "",
});

export default function BuatPOBaruPage() {
    const [saving, setSaving] = useState(false);
    const [dibuat, setDibuat] = useState<PurchaseOrder | null>(null);

    const [tanggalPo, setTanggalPo] = useState("");
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [supplierError, setSupplierError] = useState("");
    const [supplierId, setSupplierId] = useState("");
    const [picSupplier, setPicSupplier] = useState("");

    const [barisBarang, setBarisBarang] = useState<BarisBarang[]>([
        buatBarisBarang(),
    ]);

    const [kebutuhanProyek, setKebutuhanProyek] = useState("");
    const [persenPpn, setPersenPpn] = useState("12");
    const [jasa, setJasa] = useState("");
    const [formError, setFormError] = useState("");
    const [searchTerm, setSearchTerm] = useState('');

    const [pencarianBarang, setPencarianBarang] = useState("");
    const [hasilPencarian, setHasilPencarian] = useState<typeof dataBarang>([]);
    const [barisAktif, setBarisAktif] = useState<number | null>(null);

    const [page, setPage] = useState(1);
    const { data: loaded, loading, error: loadError, reload } = useApiData(
        () => listItems({ search: searchTerm || undefined, page, pageSize: 20 }),
        `${searchTerm}|${page}`,
        "Gagal memuat data barang.",
    );
    const dataBarang = loaded?.rows ?? [];
    const [posisiDropdown, setPosisiDropdown] = useState({ top: 0, left: 0, width: 0, });
    const inputBarangRefs = useRef<Record<number, HTMLInputElement | null>>({});

    useEffect(() => {
        let aktif = true;

        listSuppliers({ pageSize: 100 })
            .then((result) => {
                if (aktif) {
                    setSuppliers(result.rows);
                }
            })
            .catch((err) => {
                if (aktif) {
                    setSupplierError(
                        err instanceof ApiError
                            ? err.message
                            : "Gagal memuat data supplier."
                    );
                }
            });

        return () => {
            aktif = false;
        };
    }, []);

    const supplier = suppliers.find(
        (s) => String(s.id) === supplierId
    );

    const barang = barisBarang.map((b) => {
        const jumlah = toNumber(b.jumlah);
        const hargaSatuan = toNumber(b.harga);
        const diskon = toNumber(b.diskon);

        return {
            ...b,
            jumlah,
            hargaSatuan,
            diskon,
            total: jumlah * hargaSatuan - diskon,
        };
    });

    const totalSetelahDiskon = barang.reduce(
        (sum, b) => sum + b.total,
        0
    );

    // DPP nilai lain = 11/12 dari harga setelah diskon.
    const dppLain = Math.round((totalSetelahDiskon * 11) / 12);

    const nilaiPpn = Math.round(
        (dppLain * toNumber(persenPpn)) / 100
    );

    const totalSetelahPpn = totalSetelahDiskon + nilaiPpn;
    const grandTotal = totalSetelahPpn + toNumber(jasa);

    const updateBaris = (
        id: number,
        field: keyof Omit<BarisBarang, "id">,
        value: string
    ) => {
        setBarisBarang((prev) =>
            prev.map((b) =>
                b.id === id ? { ...b, [field]: value } : b
            )
        );
    };

    const tambahBarang = () => {
        setBarisBarang((prev) => [...prev, buatBarisBarang()]);
    };

    const hapusBarang = (id: number) => {
        setBarisBarang((prev) => prev.filter((b) => b.id !== id));
    };

    const header = (
        <div className="flex items-center gap-3 mb-6">
            <Link
                href="/dashboard/purchasing/transaksi/buat-po-barang"
                aria-label="Kembali"
                className="text-gray-800 hover:opacity-70 transition-opacity"
            >
                <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
            </Link>

            <h1 className="text-[18px] font-extrabold text-black tracking-wide">
                Rekap Pembelian Gudang
            </h1>
        </div>
    );

    const handleBuat = async (
        e: React.FormEvent<HTMLFormElement>
    ) => {
        e.preventDefault();
        setFormError("");

        if (!tanggalPo) {
            setFormError("Tanggal PO wajib diisi.");
            return;
        }

        if (!supplier) {
            setFormError("Pilih supplier terlebih dahulu.");
            return;
        }

        if (!picSupplier.trim()) {
            setFormError("PIC supplier wajib diisi.");
            return;
        }

        if (barisBarang.length === 0) {
            setFormError("Tambahkan minimal satu barang.");
            return;
        }

        if (
            barang.some(
                (b) =>
                    !b.kodeBarang.trim() ||
                    !b.namaBarang.trim() ||
                    !b.satuan.trim()
            )
        ) {
            setFormError(
                "Kode barang, nama barang, dan satuan wajib diisi."
            );
            return;
        }

        if (
            barang.some(
                (b) => b.jumlah <= 0 || b.hargaSatuan <= 0
            )
        ) {
            setFormError(
                "Jumlah dan harga satuan setiap barang harus lebih dari 0."
            );
            return;
        }

        if (
            barang.some((b) => b.diskon < 0 || b.total < 0) ||
            toNumber(persenPpn) < 0 ||
            toNumber(persenPpn) > 100 ||
            toNumber(jasa) < 0
        ) {
            setFormError(
                "Diskon dan jasa tidak boleh minus, PPN maksimal 100%, dan diskon tidak boleh melebihi total harga barang."
            );
            return;
        }

        setSaving(true);

        try {
            /*
             * PO dibuat langsung tanpa approvalRequestId.
             * Pastikan tipe payload dan endpoint backend juga mendukung
             * pembuatan PO mandiri tanpa ID permintaan pembelian.
             */
            const payload = {
                tanggalPo,
                supplierId: supplier.id,
                picSupplier: picSupplier.trim(),
                barang: barang.map((b) => ({
                    kodeBarang: b.kodeBarang.trim(),
                    namaBarang: b.namaBarang.trim(),
                    satuan: b.satuan.trim(),
                    jumlah: b.jumlah,
                    hargaSatuan: b.hargaSatuan,
                    diskon: b.diskon,
                })),
                persenPpn: toNumber(persenPpn),
                jasa: toNumber(jasa),
            };

            const hasil = await createPurchaseOrder(
                payload as Parameters<typeof createPurchaseOrder>[0]
            );

            setDibuat(hasil);
        } catch (err) {
            setFormError(
                err instanceof ApiError
                    ? err.message
                    : "Gagal membuat PO."
            );
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        const tutupDropdown = (e: MouseEvent) => {
            const target = e.target as Node;

            const klikInput = Object.values(inputBarangRefs.current).some(
                (input) => input?.contains(target)
            );

            const klikDropdown = document
                .getElementById("dropdown-autocomplete-barang")
                ?.contains(target);

            if (!klikInput && !klikDropdown) {
                setBarisAktif(null);
            }
        };

        document.addEventListener("mousedown", tutupDropdown);

        return () => {
            document.removeEventListener("mousedown", tutupDropdown);
        };
    }, []);

    if (dibuat) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                {header}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-10 text-center">
                    <p className="text-base font-bold text-gray-900">
                        PO {dibuat.nomorPo} berhasil dibuat
                    </p>

                    <p className="mt-2 text-sm text-gray-600">
                        Supplier {dibuat.supplierName}, grand total Rp.{" "}
                        {formatAngka(dibuat.grandTotal)}
                    </p>

                    <Link
                        href="/dashboard/purchasing/transaksi/buat-po-barang"
                        className={`${orangeButtonClass} inline-block mt-6`}
                    >
                        Kembali ke Rekap Pembelian
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {header}

            <form
                onSubmit={handleBuat}
                noValidate
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
                <h2 className="text-base font-bold text-gray-900 text-center mb-6">
                    Buat Pemesanan Pembelian
                </h2>

                {/* Tanggal PO */}
                <div className="flex flex-col gap-2 max-w-sm">
                    <div className="flex items-center gap-2">
                        <label
                            htmlFor="po-tanggal"
                            className="w-24 shrink-0 text-sm font-medium text-gray-800"
                        >
                            Tanggal PO
                        </label>

                        <span className="text-gray-800">:</span>

                        <input
                            id="po-tanggal"
                            type="date"
                            value={tanggalPo}
                            onChange={(e) => setTanggalPo(e.target.value)}
                            className={fieldClass}
                            required
                        />
                    </div>
                </div>

                <hr className={dividerClass} />

                {/* Supplier dan pemesan */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-6">
                    {/* Supplier */}
                    <div>
                        <h3 className={sectionTitleClass}>
                            Tujuan Pemesanan (Supplier)
                        </h3>

                        <div className="overflow-x-auto border-t border-l border-gray-300 rounded-sm">
                            <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th
                                            scope="col"
                                            className={`${cellClass} w-40 text-xs font-bold text-gray-900 uppercase`}
                                        >
                                            <label htmlFor="po-supplier">
                                                Data Supplier
                                            </label>
                                        </th>

                                        <th
                                            scope="col"
                                            className={`${cellClass} font-normal`}
                                        >
                                            <div className="relative">
                                                <select
                                                    id="po-supplier"
                                                    value={supplierId}
                                                    onChange={(e) =>
                                                        setSupplierId(e.target.value)
                                                    }
                                                    className={`${cellInputClass} appearance-none pr-8 cursor-pointer`}
                                                    required
                                                >
                                                    <option value="" disabled>
                                                        Pilih Supplier
                                                    </option>

                                                    {suppliers.map((s) => (
                                                        <option
                                                            key={s.id}
                                                            value={s.id}
                                                        >
                                                            {s.code} - {s.name}
                                                        </option>
                                                    ))}
                                                </select>

                                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                            </div>
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    <tr>
                                        <td className={infoLabelClass}>
                                            Nama Perusahaan
                                        </td>
                                        <td className={infoValueClass}>
                                            {supplier?.name || "-"}
                                        </td>
                                    </tr>

                                    <tr>
                                        <td className={infoLabelClass}>
                                            Alamat / Telp
                                        </td>
                                        <td className={infoValueClass}>
                                            {supplier
                                                ? `${supplier.address} / ${supplier.phone}`
                                                : "-"}
                                        </td>
                                    </tr>

                                    <tr>
                                        <td className={infoLabelClass}>NPWP</td>
                                        <td className={infoValueClass}>
                                            {supplier?.npwp || "-"}
                                        </td>
                                    </tr>

                                    <tr>
                                        <td className={infoLabelClass}>
                                            No A/C (Bank)
                                        </td>
                                        <td className={infoValueClass}>
                                            {supplier?.bank || "-"}
                                        </td>
                                    </tr>

                                    <tr>
                                        <td className={infoLabelClass}>
                                            <label htmlFor="po-pic-supplier">
                                                PIC / Telp
                                            </label>
                                        </td>
                                        <td className={infoValueClass}>
                                            <input
                                                id="po-pic-supplier"
                                                type="text"
                                                value={picSupplier}
                                                onChange={(e) =>
                                                    setPicSupplier(e.target.value)
                                                }
                                                className={cellInputClass}
                                                placeholder="Nama PIC / nomor telepon"
                                                required
                                            />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {supplierError && (
                            <p className="mt-2 text-xs text-red-600">
                                {supplierError}
                            </p>
                        )}
                    </div>

                    {/* Pemesan */}
                    <div>
                        <h3 className={sectionTitleClass}>Pemesan</h3>

                        <div className="border-t border-l border-gray-300 rounded-sm">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th
                                            scope="col"
                                            colSpan={2}
                                            className={`${cellClass} text-xs font-bold text-gray-900 text-center`}
                                        >
                                            {PEMESAN.nama}
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    <tr>
                                        <td className={infoLabelClass}>NPWP</td>
                                        <td className={infoValueClass}>
                                            {PEMESAN.npwp}
                                        </td>
                                    </tr>

                                    <tr>
                                        <td className={infoLabelClass}>
                                            Alamat Pengiriman
                                        </td>
                                        <td className={infoValueClass}>
                                            {PEMESAN.alamatPengiriman}
                                        </td>
                                    </tr>

                                    <tr>
                                        <td className={infoLabelClass}>
                                            Kebutuhan Proyek
                                        </td>
                                        <td className={infoValueClass}>
                                            <input
                                                type="text"
                                                value={kebutuhanProyek}
                                                onChange={(e) =>
                                                    setKebutuhanProyek(e.target.value)
                                                }
                                                className={cellInputClass}
                                                placeholder="Nama proyek / kebutuhan"
                                            />
                                        </td>
                                    </tr>

                                    <tr>
                                        <td className={infoLabelClass}>
                                            PIC / Telp
                                        </td>
                                        <td className={infoValueClass}>
                                            {PEMESAN.pic}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <hr className={dividerClass} />

                {/* Daftar barang */}
                <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h3 className="text-xs font-bold text-gray-900">
                        Daftar / Spesifikasi Barang Yang Dipesan :
                    </h3>
                </div>

                <div className="overflow-x-auto border-t border-l border-gray-300 rounded-sm">
                    <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                        <thead className="bg-gray-100 text-gray-900 font-bold text-xs">
                            <tr>
                                <th className={`${cellClass} text-center`}>
                                    No
                                </th>
                                <th className={cellClass}>Kode Barang</th>
                                <th className={cellClass}>Nama Item / Barang</th>
                                <th className={cellClass}>Satuan</th>
                                <th className={`${cellClass} text-right`}>
                                    Jumlah
                                </th>
                                <th className={`${cellClass} text-right`}>
                                    Harga/Sat
                                </th>
                                <th className={`${cellClass} text-right`}>
                                    Diskon
                                </th>
                                <th className={`${cellClass} text-right`}>
                                    Total Harga
                                </th>
                                <th className={`${cellClass} text-center`}>
                                    Aksi
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {barang.map((b, index) => (
                                <tr key={b.id}>
                                    <td
                                        className={`${cellClass} text-center text-xs`}
                                    >
                                        {index + 1}
                                    </td>

                                    <td className={cellClass}>
                                        <input
                                            type="text"
                                            value={b.kodeBarang}
                                            onChange={(e) =>
                                                updateBaris(
                                                    b.id,
                                                    "kodeBarang",
                                                    e.target.value
                                                )
                                            }
                                            className={cellInputClass}
                                            placeholder="Kode barang"
                                            required
                                        />
                                    </td>

                                    <td className={cellClass}>
                                        <div className="min-w-48">
                                            <input
                                                ref={(el) => {
                                                    inputBarangRefs.current[b.id] = el;
                                                }}
                                                type="text"
                                                value={b.namaBarang}
                                                onFocus={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect();

                                                    setPosisiDropdown({
                                                        top: rect.bottom + 4,
                                                        left: rect.left,
                                                        width: Math.max(rect.width, 280),
                                                    });

                                                    setBarisAktif(b.id);
                                                    setHasilPencarian(dataBarang);
                                                }}
                                                onChange={(e) => {
                                                    const keyword = e.target.value;

                                                    updateBaris(b.id, "namaBarang", keyword);
                                                    updateBaris(b.id, "kodeBarang", "");
                                                    updateBaris(b.id, "satuan", "");

                                                    const rect = e.currentTarget.getBoundingClientRect();

                                                    setPosisiDropdown({
                                                        top: rect.bottom + 4,
                                                        left: rect.left,
                                                        width: Math.max(rect.width, 280),
                                                    });

                                                    setBarisAktif(b.id);

                                                    setHasilPencarian(
                                                        dataBarang.filter((item) =>
                                                            item.name.toLowerCase().includes(keyword.toLowerCase())
                                                        )
                                                    );
                                                }}
                                                className={cellInputClass}
                                                placeholder="Ketik nama barang..."
                                                autoComplete="off"
                                                required
                                            />

                                            {barisAktif === b.id &&
                                                typeof document !== "undefined" &&
                                                createPortal(
                                                    <div
                                                        style={{
                                                            position: "fixed",
                                                            top: posisiDropdown.top,
                                                            left: posisiDropdown.left,
                                                            width: posisiDropdown.width,
                                                            zIndex: 99999,
                                                        }}
                                                        className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl"
                                                    >
                                                        {hasilPencarian.length > 0 ? (
                                                            hasilPencarian.map((item) => (
                                                                <div
                                                                    key={item.code ?? item.name}
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();

                                                                        updateBaris(b.id, "kodeBarang", item.code ?? "");
                                                                        updateBaris(b.id, "namaBarang", item.name);
                                                                        updateBaris(b.id, "satuan", item.unit ?? "");

                                                                        setBarisAktif(null);
                                                                        setHasilPencarian([]);
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter") {
                                                                            updateBaris(b.id, "kodeBarang", item.code ?? "");
                                                                            updateBaris(b.id, "namaBarang", item.name);
                                                                            updateBaris(b.id, "satuan", item.unit ?? "");

                                                                            setBarisAktif(null);
                                                                            setHasilPencarian([]);
                                                                        }
                                                                    }}
                                                                    className="block w-full px-3 py-2 text-left hover:bg-orange-50 cursor-pointer"
                                                                >
                                                                    <p className="text-sm font-medium text-gray-900">
                                                                        {item.name}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        {item.code} · {item.unit}
                                                                    </p>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="px-3 py-3 text-sm text-gray-500">
                                                                Barang tidak ditemukan.
                                                            </p>
                                                        )}

                                                    </div>,
                                                    document.body
                                                )}
                                        </div>
                                    </td>

                                    <td className={cellClass}>
                                        <input
                                            type="text"
                                            value={b.satuan}
                                            onChange={(e) =>
                                                updateBaris(
                                                    b.id,
                                                    "satuan",
                                                    e.target.value
                                                )
                                            }
                                            className={cellInputClass}
                                            placeholder="Pcs, unit, dll."
                                            required
                                        />
                                    </td>

                                    <td className={cellClass}>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={b.jumlah}
                                            onChange={(e) =>
                                                updateBaris(
                                                    b.id,
                                                    "jumlah",
                                                    digitsOnly(e.target.value)
                                                )
                                            }
                                            className={`${cellInputClass} text-right`}
                                            placeholder="0"
                                            required
                                        />
                                    </td>

                                    <td className={cellClass}>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={b.harga}
                                            onChange={(e) =>
                                                updateBaris(
                                                    b.id,
                                                    "harga",
                                                    digitsOnly(e.target.value).slice(0, 12)
                                                )
                                            }
                                            className={`${cellInputClass} text-right`}
                                            placeholder="0"
                                            required
                                        />
                                    </td>

                                    <td className={cellClass}>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={b.diskon}
                                            onChange={(e) =>
                                                updateBaris(
                                                    b.id,
                                                    "diskon",
                                                    digitsOnly(e.target.value).slice(0, 12)
                                                )
                                            }
                                            className={`${cellInputClass} text-right`}
                                            placeholder="0"
                                        />
                                    </td>

                                    <td
                                        className={`${cellClass} text-right text-xs`}
                                    >
                                        Rp {formatAngka(b.total)}
                                    </td>

                                    <td className={`${cellClass} text-center`}>
                                        <button
                                            type="button"
                                            onClick={() => hapusBarang(b.id)}
                                            disabled={barisBarang.length === 1}
                                            title="Hapus barang"
                                            className="inline-flex items-center justify-center p-2 text-red-500 hover:bg-red-50 rounded-md disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end mt-2">
                    <button
                        type="button"
                        onClick={tambahBarang}
                        className="inline-flex items-center justify-center gap-2 px-2 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-sm hover:bg-orange-100 transition-colors"
                        title="Tambah Barang"
                        aria-label="Tambah Barang"
                    >
                        <Plus className="w-3 h-3" />
                        Tambah Baris
                    </button>
                </div>

                {/* Total */}
                <div className="mt-2 flex flex-col items-end gap-4">
                    <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                        <label className={totalLabelClass}>
                            Total Setelah Diskon
                        </label>

                        <div className={kotakTotalClass}>
                            <input
                                type="text"
                                value={`Rp ${formatAngka(totalSetelahDiskon)}`}
                                readOnly
                                className={readOnlyFieldClass}
                            />
                        </div>
                    </div>

                    <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                        <label className={totalLabelClass}>DPP Nilai Lain</label>

                        <div className={kotakTotalClass}>
                            <input
                                type="text"
                                value={`Rp ${formatAngka(dppLain)}`}
                                readOnly
                                className={readOnlyFieldClass}
                            />
                        </div>
                    </div>

                    <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                        <label
                            htmlFor="po-ppn"
                            className={totalLabelClass}
                        >
                            PPN (%)
                        </label>

                        <div className={`${kotakTotalClass} flex gap-2`}>
                            <input
                                id="po-ppn"
                                type="text"
                                inputMode="decimal"
                                value={persenPpn}
                                onChange={(e) =>
                                    setPersenPpn(digitsOnly(e.target.value))
                                }
                                className={`${fieldClass} text-right`}
                            />

                            <input
                                type="text"
                                value={`Rp ${formatAngka(nilaiPpn)}`}
                                readOnly
                                className={readOnlyFieldClass}
                            />
                        </div>
                    </div>

                    <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                        <label className={totalLabelClass}> Total Setelah PPN </label>

                        <div className={kotakTotalClass}>
                            <input type="text" value={`Rp ${formatAngka(totalSetelahPpn)}`} readOnly className={readOnlyFieldClass} />
                        </div>
                    </div>

                    <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                        <label htmlFor="po-jasa" className={totalLabelClass}> Jasa </label>

                        <div className={kotakTotalClass}>
                            <input id="po-jasa" type="text" inputMode="numeric" value={jasa} onChange={(e) => setJasa(digitsOnly(e.target.value))}
                                className={`${fieldClass} text-right`}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="w-full border-t-4 border-double border-gray-500 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                        <label className={totalLabelClass}> Grand Total </label>
                        <div className={kotakTotalClass}>
                            <input type="text" value={`Rp ${formatAngka(grandTotal)}`} readOnly className={`${readOnlyFieldClass} font-bold`} />
                        </div>
                    </div>
                </div>

                {/* Error */}
                {formError && (
                    <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                        {formError}
                    </div>
                )}

                {/* Tombol submit */}
                <div className="mt-8 flex flex-col-reverse sm:flex-row justify-end gap-3">
                    <Link
                        href="/dashboard/purchasing/transaksi/buat-po-barang"
                        className="min-w-24 px-6 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all text-sm text-center"
                    >
                        Batal
                    </Link>

                    <button
                        type="submit"
                        disabled={saving}
                        className={`${orangeButtonClass} disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                        {saving ? "Menyimpan..." : "Buat Purchase Order"}
                    </button>
                </div>
            </form>
        </div>
    );
}
