# Sistem Gudang — Integrasi Modul Gudang

## Ringkasan

Seluruh halaman transaksi dan laporan divisi Gudang disambungkan ke
backend: Barang Masuk, Barang Keluar, Stock Opname, Permintaan
Pembelian, Laporan Barang Masuk, Laporan Barang Keluar, dan Rekap
Permintaan. Sebelumnya semua halaman ini memakai data dummy.
`docs/api-1.json` disinkronkan ulang dengan spec backend terbaru
(42 path, sebelumnya 24).

## Keputusan

| Keputusan | Alasan |
|---|---|
| Nama field mengikuti backend (`source`, `referenceNo`, `qtyArrived`, dan seterusnya), bukan istilah lama di UI | Backend membangkitkan spec dari skema validasinya, jadi tipe frontend yang mengikuti spec tidak bisa menyimpang diam-diam. |
| Harga di Stock Opname read-only, diambil dari harga master barang | Harga ditetapkan Purchasing. Petugas gudang hanya menghitung jumlah fisik. Backend mengisi `systemPrice` dan `physicalPrice` dari `items.price`. |
| Status QC (`PASS`, `PARTIAL_RETUR`) diisi saat barang tiba, di form Barang Masuk | Status ini hasil pengecekan manual quality assessor, bukan hasil hitung dari selisih jumlah. |
| Filter tanggal berupa rentang `startDate` dan `endDate` di semua halaman | Sepakat dengan backend. Berlaku juga untuk `GET /approvals`. |
| Export Excel dibuat backend, cetak PDF memakai `window.print()` | Data laporan dipaginasi, jadi export harus dari server. PDF cukup dari cetak browser. |
| Rekap Permintaan memakai tabel `material-requests` sendiri, bukan `approvals` | Kolomnya (SPK, klien, item produksi, group tukang, status) tidak cocok dengan `purchase-request`. |
| Checkbox "Pilih" di Rekap Permintaan hanya untuk export dan cetak | Ada baris terpilih: hanya baris itu yang diekspor dan dicetak. Tidak ada yang terpilih: seluruh hasil filter. |
| Hook `useApiData` menggantikan pola `setLoading(true)` di dalam `useEffect` | Aturan lint `react-hooks/set-state-in-effect` melarang pola lama. Status memuat dihitung dari respons terakhir. |
| Tipe `ItemListRow` dipisah dari `Item` | `GET /items` (list) mengembalikan `locationCode` dan `supplierName` tanpa `createdAt` dan `updatedAt`. Endpoint item lain kebalikannya. |

## Perubahan

### `src/domains/gudang/api.ts`, `types.ts`, `date.ts`

Fungsi dan tipe untuk `/inbound`, `/inbound/returns`, `/outbound`,
`/stock-opname`, `/approvals` (purchase-request), `/reports/inbound`,
`/reports/outbound`, `/reports/requests`, `/material-requests/{id}`, dan
tiga endpoint export. `date.ts` berisi `toDateRange()` yang mengubah
pilihan Tgl, Bulan, dan Tahun menjadi `startDate` dan `endDate`.

### `src/shared/lib/api-client.ts` dan `use-api-data.ts`

`downloadFile()` mengunduh file biner (xlsx), membaca nama file dari
`Content-Disposition`, dan mencoba refresh token sekali jika 401.
`useApiData()` menjalankan pengambilan data setiap kali kuncinya
berubah dan mengabaikan respons yang sudah kedaluwarsa.

### Halaman

| Halaman | Endpoint | Catatan |
|---|---|---|
| Barang Masuk | `/inbound`, `/inbound/returns` | Barang dan supplier dipilih dari dropdown (mengirim `itemId`, `supplierId`). Form Barang Baru punya input Status QC. Form Barang Kembali punya klien dan SPK opsional. |
| Barang Keluar | `/outbound` | Form punya Asal Gudang dan Tujuan/Penerima (wajib). Tabel diratakan satu baris per barang. |
| Stock Opname | `/stock-opname` | Daftar dengan filter bulan dan tahun dari server, dan detail berisi stok sistem, fisik, dan selisih. Form konfirmasi sebelum menyimpan karena stok disetel ke jumlah fisik. |
| Laporan Barang Masuk dan Keluar | `/reports/inbound`, `/reports/outbound` | Kartu total memakai `summary` dari backend (jumlah transaksi). Ada kolom Lokasi. |
| Rekap Permintaan | `/reports/requests`, `/material-requests/{id}` | Export mendukung mode filter dan mode `ids`. |

### Penggabungan branch `cal/updRabuGudang`

Tampilan laporan dari branch tersebut dipertahankan. Fungsi dan tipe
yang memanggil `/api/v1/gudang/laporan/...` tidak dibawa karena
endpoint itu tidak ada di backend. Branch itu juga menambah shadcn
(`components.json`, `ui/button.tsx`, `lib/utils.ts`) dan mengubah
`globals.css`. Font `body` dikembalikan ke Arial karena tema shadcn
menimpanya.

## Bug atau Celah

- `globals.css` dari shadcn menimpa `--border` dan aturan dark mode
  lama, sehingga warna border dan tema seluruh aplikasi bisa berubah.
  Tampilan semua halaman perlu diperiksa manual.
- Paket `cn@0.4.0` terpasang sebagai dependensi. Util `cn` biasanya
  dibuat dari `clsx` dan `tailwind-merge`. Perlu dicek.
- `GET /approvals` belum punya pencarian teks yang berfungsi.
- Daftar dimuat 100 baris pertama, belum ada paginasi.
- Stock Opname belum punya endpoint edit atau export, dan Permintaan
  Pembelian belum punya alur `resubmit` di frontend.
- Error lint `set-state-in-effect` masih ada di PPIC (`DataBarang`),
  Purchasing (`DataBarang`, `DataSupplier`), dan Superadmin (`Users`).
  Solusinya sama, pakai `useApiData`.
- Alur lewat browser dan penyimpanan ke backend belum diuji dari UI.
  Verifikasi baru sebatas `tsc`, tes unit, `next build`, dan pemanggilan
  GET serta validasi yang ditolak ke server backend.

## Status dan Langkah Berikutnya

Modul Gudang selesai tersambung. Berikutnya lihat
`04-Rencana-Selanjutnya.md`.

Permintaan Pembelian tidak lagi ada di Gudang. Halamannya pindah ke PPIC, lihat `09-Permintaan-Pembelian-PPIC-dan-Rekap-Pembelian.md`.
