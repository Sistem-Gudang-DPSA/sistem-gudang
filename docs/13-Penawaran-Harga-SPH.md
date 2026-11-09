# Sistem Gudang — Penawaran Harga (SPH)

## Ringkasan

Layar Penawaran Harga dan Estimasi Penawaran Biaya buatan Imel di PPIC
disambungkan ke backend `/penawaran-harga`. Sebelumnya daftar dan estimasi
hanya data contoh di memori, dan tombol Tambah Data hanya mencetak ke
console. Dokumen ini juga mencatat keputusan bisnis yang menentukan bentuk
datanya.

## Keputusan

- Nama client dan nama projek adalah dua hal yang berbeda, jadi penawaran
  menyimpan `namaClient` dan `namaProyek`. Keduanya wajib saat membuat.
- Penawaran dibuat di PPIC saja. Nomor order dibuat backend, 10 digit
  berurutan seperti `0000000015`.
- Publish dilakukan PPIC tanpa approval. Setelah Publish dokumen terkunci
  dan backend menolak perubahan dengan 409.
- Bahan berupa teks bebas dan tidak terhubung ke SPK, supplier, maupun items.
- Rumus total mengikuti rancangan Imel dan dihitung backend. Total baris
  adalah jumlah order dikali harga satuan, dibulatkan. Subtotal adalah
  jumlah total baris per kategori, dan grand total adalah jumlah subtotal.
  Panjang, lebar, tinggi, dan jumlah satuan tidak ikut dihitung.

## Yang Dikerjakan

- Daftar memuat dari `GET /penawaran-harga` dengan paginasi 20 baris,
  pencarian nomor order, client, dan projek, serta kolom Nama Projek.
- Modal Tambah Data meminta nama client dan nama projek, membuat penawaran
  Draft, lalu membuka halaman Estimasi miliknya.
- Estimasi membaca `GET /penawaran-harga/{id}` dan menyimpan seluruh header
  dan baris lewat `PUT`. Baris yang seluruh kolomnya kosong dibuang sebelum
  dikirim, dan baris yang dipakai wajib punya nama bahan.
- Tombol Publish menyimpan lebih dulu, lalu memanggil `/publish` setelah
  konfirmasi. Penawaran yang sudah Publish tampil terkunci.
- Subtotal per kategori dan grand total ditambahkan di layar sebagai
  pratinjau. Angka yang tersimpan adalah hasil hitung backend.
- Dimensi, jumlah satuan, dan jumlah order menerima angka desimal, harga
  satuan menerima angka bulat, dan teks dibatasi sesuai kontrak.
- Menu Penawaran Harga hanya tampil untuk permission `penawaran-harga.view`.

## Yang Belum Jelas

- Arti tombol Rekap di daftar belum ditentukan. Edit, Detail, dan Rekap
  masih menuju halaman yang sama.
- Halaman lama `penawaran-harga/detail-permintaan` tidak lagi tertaut dari
  daftar dan bisa dihapus.
- Belum ada hapus penawaran dan belum ada jalur kembali dari Publish ke Draft.
- Permission `penawaran-harga.*` harus ada di database agar role PPIC bisa
  mengakses menu dan endpoint.

## Hasil Uji

Diuji lewat API dengan akun superadmin karena permission belum ada di role
PPIC pada database dev. Penawaran dibuat dengan nomor order dari backend.
Simpan dengan dua bahan di kategori berbeda menghasilkan subtotal 2.625.000
dan 450.000 serta grand total 3.075.000, sesuai hitungan manual. Publish
berhasil, dan simpan setelah Publish ditolak 409. Layar di browser belum diuji.
