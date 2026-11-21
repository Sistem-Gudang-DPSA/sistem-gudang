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
- PO tidak dibuat mandiri: tombol **Buat Pesanan Baru** dan route form PO
  tanpa permintaan sudah dihapus. PO selalu dimulai dari permintaan
  pembelian PPIC.
- Role Purchasing membutuhkan permission `purchase-order.create`.

## Membagi permintaan menjadi beberapa PO

- Form Buat PO memuat semua baris permintaan. Purchasing memilih satu
  supplier untuk PO itu, lalu mencentang baris yang dibeli dari supplier
  tersebut; baris lain dibuat PO terpisah. Hanya baris yang dicentang yang
  dihitung pada total dan dikirim ke backend, masing-masing dengan
  `lineIndex` baris permintaannya.
- Baris yang sudah masuk PO aktif (bukan batal) ditandai **Sudah dipesan**
  dan tidak bisa dicentang lagi. Daftar PO aktif dibaca lewat
  `GET /purchase-orders?approvalRequestId=` lalu `GET /purchase-orders/{id}`
  untuk barisnya. Backend tetap menolak baris yang sudah dipesan dengan 409.
- Detail permintaan Purchasing menampilkan tabel PO milik permintaan
  (nomor, tanggal, supplier, grand total) dan progres `purchaseStatus`.
  Nomor PO di tabel membuka halaman Detail PO Barang untuk pengguna dengan
  `purchase-order.view`.
  Bila semua baris sudah dipesan, tombol Buat PO berganti menjadi keterangan
  bahwa semua barang sudah dipesan.
- Tombol **Lihat Permintaan** pada daftar PO Barang membuka
  `/dashboard/purchasing/transaksi/buat-po-barang/permintaan-pembelian/{id}`;
  panah kembali menuju daftar PO Barang. Detail permintaan dari Rekap
  Pembelian tetap memakai URL lama dan kembali ke Rekap Pembelian.
  Tombol hanya tampil untuk pengguna dengan `purchase-request.approve` atau
  `purchase-order.create`; pengguna `purchase-order.view` hanya melihat "-"
  pada kolom aksi.
- Baris yang permintaannya sudah disetujui dan belum dipesan semua juga
  menampilkan tombol **Buat PO** menuju form Buat PO permintaan tersebut
  dengan `?from=po-barang`. Tombol ini butuh `purchase-order.create`.
  Panah kembali dan tombol di layar sukses mengarah ke daftar PO Barang;
  tanpa parameter itu (dibuka dari detail permintaan) kembali ke detail
  permintaan.
- Di halaman Detail PO, tautan **Lihat Permintaan Pembelian Asal** memakai
  URL PO di atas, sehingga panah kembali menuju daftar PO Barang, bukan
  Rekap Pembelian.
- Daftar **Rekap Permintaan Pembelian** memakai gaya tabel yang sama dengan
  daftar lain: kartu putih, pencarian, baris bergaris tipis, badge status
  berwarna, dan paginasi.
- Status permintaan tampil sebagai badge di samping judul detail, sehingga
  tetap terlihat walau pengguna tidak memiliki tombol aksi (approve atau
  buat PO).
- Baris tombol aksi memakai `flex-wrap`, jadi tetap tersusun tanpa meluber
  di layar sempit.
- Setelah PO tersimpan, layar kembali ke detail permintaan.

## Detail PO dan cetak PO

- Halaman **Detail PO Barang** ada di
  `/dashboard/purchasing/transaksi/buat-po-barang/detail-po/{id}` dan membaca
  `GET /api/v1/purchase-orders/{id}`. Halaman butuh `purchase-order.view`;
  link ke permintaan asal hanya tampil untuk `purchase-request.approve`.
  Isinya mengikuti form Buat PO: nomor/tanggal dan status di atas, tabel
  Tujuan Pemesanan (Supplier) dan Pemesan berdampingan, rincian barang, lalu
  ringkasan biaya. Alamat, telepon, NPWP, dan bank supplier berasal dari data
  yang dikembalikan endpoint detail PO. PO batal menampilkan alasannya.
- Setelah PO tersimpan, layar sukses menampilkan nomor dan grand total serta
  tombol **Cetak PO**. Tombol ini hanya mencetak PO yang sudah tersimpan
  (`printPurchaseOrder`), termasuk saat mencetak ulang setelah dialog cetak
  gagal. Mencetak tidak membuat PO baru atau mengubah status PO.
- Template A4 portrait mengikuti dokumen PO: kop dan logo perusahaan,
  nomor/tanggal PO, tabel supplier dan pemesan, rincian barang dan harga,
  DPP/PPN/jasa/grand total, enam catatan pemesanan, dan kolom tanda tangan
  kosong. Angka dan total selalu berasal dari PO yang dibuat backend.

## Histori Harga Supplier

- Detail Data Barang ada di `/dashboard/purchasing/master/data-supplier/{id}/detail`
  karena halaman lama tidak tahu supplier mana yang dibuka. Superadmin memakai
  `/dashboard/superadmin/master/data-supplier/{id}/detail?from=superadmin` dengan komponen yang sama.
- Grid membaca `GET /suppliers/{id}/prices?tahun=` dan menyimpan lewat
  `PUT /suppliers/{id}/prices`. Pemilih tahun menentukan tahun yang diedit.
  Rata-rata tahun terpilih dan tahun sebelumnya dihitung backend.
- Sel yang diubah ditandai kuning dan baru dikirim saat Simpan Perubahan,
  dalam satu panggilan. Mengosongkan sel menghapus harganya.
- Supplier punya field Pajak Vendor, yaitu PKP atau Non PKP. Field itu ada
  di form dan tabel Data Supplier.

## Yang Belum Ada

- Layar daftar PO tersendiri. Saat ini PO hanya terlihat di detail
  permintaan pembelian Purchasing dan satu PO dapat dibuka lewat halaman
  Detail PO Barang; belum ada halaman daftar yang mengumpulkan semua PO.
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
