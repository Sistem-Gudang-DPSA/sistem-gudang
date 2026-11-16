# Sistem Gudang — Batasan Input Form

## Ringkasan

Input angka dan teks di form sekarang dibatasi sesuai kontrak backend.
Sebelumnya `type="number"` masih menerima huruf `e`, tanda plus, tanda
minus, dan desimal, padahal backend menolaknya untuk semua field integer.
Teks juga bisa diketik tanpa batas panjang, sehingga kesalahan baru
terlihat setelah dikirim.

## Aturan

- Field integer seperti qty, kuota, dan harga memakai `INTEGER_INPUT` dan
  `digitsOnly` dari `src/shared/lib/input.ts`, dengan batas 9 digit
  supaya aman dari batas integer backend. Input ini hanya menerima angka
  dan menampilkan keypad numerik di ponsel.
- Jumlah fisik di Tambah Stock Opname memakai `PHYSICAL_QTY_INPUT` dan
  `decimalOnlyMax(value, 3)`: koma atau titik sebagai pemisah desimal,
  maksimal 3 angka di belakangnya. `physicalQtyValid` menolak nilai di atas
  1.000.000 saat Simpan, sesuai `multipleOf 0.001` di backend.
- Qty barang keluar (form dan edit) boleh desimal, maksimal 3 angka di
  belakang koma dan maksimal 1.000.000, sama dengan backend (`MAX_QTY`).
  Nilai 1.000.001 ditolak. Aturannya ada di `jumlahValid`
  (`barang-keluar/form-utils.ts`).
- Field `delta` di penyesuaian stok boleh diawali satu tanda minus.
- Field teks memakai `maxLength` sesuai batas di OpenAPI, misalnya nama 191,
  kode 20, catatan 500. Kotak pencarian dibatasi 100.
- Telepon supplier hanya menerima angka, spasi, plus, strip, dan kurung.
  NPWP hanya menerima angka, titik, dan strip.
- Form login membatasi email 191 dan password 100. Username minimal 3 dan
  password minimal 8 mengikuti backend.
- Dokubah dan SPK Internal yang tadinya memakai `step="any"` kini integer,
  karena kuota dan harga satuan di backend memang integer.

## Yang Belum Dibatasi

- Form PO, histori harga supplier, dan SPH, karena aturannya baru ditentukan
  atau masih ditunda.
- Batas panjang di form Permintaan Pembelian memakai angka perkiraan, karena
  payload `purchase-request` tidak punya batas di OpenAPI.
- Pesan error validasi masih berasal dari backend, bukan dari FE.
