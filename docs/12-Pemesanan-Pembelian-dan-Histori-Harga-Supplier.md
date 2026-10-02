# Sistem Gudang — Pemesanan Pembelian dan Histori Harga Supplier

## Ringkasan

Layar Buat PO di Purchasing dan grid harga bulanan di Detail Data Barang
supplier disambungkan ke backend. Sebelumnya PO hanya disimpan di memori
dan hilang saat halaman di-refresh, sedangkan grid harga memakai data
contoh dan tombol simpannya hanya menampilkan alert.

## Pemesanan Pembelian

- Buat PO memanggil `POST /purchase-orders`. Nomor PO dibuat backend dengan
  format `PO-001`, jadi kolom Nomor PO dihapus dari form. Setelah berhasil,
  layar menampilkan nomor PO dan grand total dari backend.
- Rumus pajak mengikuti rancangan Imel dan sudah dipakai backend. Subtotal
  adalah jumlah dikali harga satuan dikurangi diskon rupiah per baris. DPP
  nilai lain adalah 11/12 dari subtotal, PPN adalah DPP nilai lain dikali
  persen PPN, dan grand total adalah subtotal ditambah PPN dan jasa.
  Contoh: subtotal 1.200.000 dengan PPN 12 persen menghasilkan DPP nilai
  lain 1.100.000, PPN 132.000, dan grand total 1.332.000 sebelum jasa.
- Total di layar hanya pratinjau. Nilai yang tersimpan dan dikembalikan
  adalah hasil hitung backend. `dppLain` bukan lagi input, dan backend
  menolak body yang memuatnya.
- PO hanya bisa dibuat untuk permintaan pembelian berstatus Disetujui.
  Satu permintaan boleh punya beberapa PO. PIC supplier dan kode barang
  setiap baris sekarang wajib diisi karena backend mewajibkannya.
- Role Purchasing membutuhkan permission `purchase-order.create`.

## Histori Harga Supplier

- Detail Data Barang pindah ke `/dashboard/purchasing/master/data-supplier/{id}/detail`
  karena halaman lama tidak tahu supplier mana yang dibuka.
- Grid membaca `GET /suppliers/{id}/prices?tahun=` dan menyimpan lewat
  `PUT /suppliers/{id}/prices`. Pemilih tahun menentukan tahun yang diedit.
  Rata-rata tahun terpilih dan tahun sebelumnya dihitung backend.
- Sel yang diubah ditandai kuning dan baru dikirim saat Simpan Perubahan,
  dalam satu panggilan. Mengosongkan sel menghapus harganya.
- Supplier punya field Pajak Vendor, yaitu PKP atau Non PKP. Field itu ada
  di form dan tabel Data Supplier.

## Yang Belum Ada

- Layar daftar dan detail PO. Backend sudah menyediakan `GET /purchase-orders`
  dan `GET /purchase-orders/{id}`, tetapi FE belum punya layarnya.
- Tombol Download PDF di Detail Data Barang masih belum berfungsi.
- Penawaran Harga PPIC atau SPH ditunda sampai Imel memperbarui branch-nya.
- Tracking masih data tiruan di backend.

## Hasil Uji

Diuji lewat API dengan akun seed. Permintaan pembelian dibuat PPIC dan
disetujui Purchasing. PO sebelum disetujui ditolak 409, dan PO oleh PPIC
ditolak 403. PO yang dibuat menghasilkan subtotal 1.200.000, DPP nilai lain
1.100.000, PPN 132.000, dan grand total 1.337.000 dengan jasa 5.000, sama
dengan pratinjau di layar. Mengirim `dppLain` ditolak 400. Histori harga
diuji dengan GET, PUT, dan mengembalikan nilai awal. Layar di browser
belum diuji.
