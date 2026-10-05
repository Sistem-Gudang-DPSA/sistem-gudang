# Sistem Gudang — Integrasi PPIC: Dokubah dan SPK Internal

## Ringkasan

Layar PPIC buatan imel disambungkan ke backend: Dokubah, SPK Internal,
Rekap Dokubah, Detail Rekap Dokubah, Rekap Mutasi Barang, dan Rekap Stok
Opname PPIC. Sebelumnya semua layar ini membaca data yang disimpan di
memori modul. Backend membangun endpoint `dokubah`, `spk-internal`,
`tracking`, dan `reports/mutations` untuk keperluan ini, dan
`docs/api-1.json` disinkronkan dengan spec backend terbaru sebanyak 54
path, sebelumnya 42.

## Latar Belakang

Layar PPIC sudah dirancang dan dibangun oleh tim frontend PPIC, sedangkan
backend belum punya satu pun endpoint untuk Dokubah maupun SPK Internal.
Pembagian tugasnya jelas: tampilan menjadi milik tim PPIC, sedangkan
penyambungan data dan penamaan field menjadi tanggung jawab kita bersama
backend. Karena itu backend menyesuaikan kontraknya dengan bentuk data
yang sudah dipakai layar, dan frontend hanya mengganti lapisan datanya.

## Keputusan

| Keputusan | Alasan |
|---|---|
| Komponen imel tidak diubah, kecuali bagian yang memuat dan menyimpan data | Tampilan menjadi milik tim PPIC dan masih berubah. Menyentuh markup akan menimbulkan konflik tiap kali imel mendorong perubahan. |
| Status Dokubah di layar tetap `Draft`, `Pending`, `Approved`, `Rejected`, sedangkan API memakai `DRAFT`, `PENDING`, `APPROVED`, `REJECTED` | Layar sudah memakai huruf kapital awal. Pemetaan dilakukan sekali di `ppic/api.ts`, jadi tidak ada komponen yang tahu bentuk API. |
| SPK dan nama client Dokubah berasal dari `GET /tracking/spk`, dan client dibuat oleh backend | Sumber kebenarannya sistem tracking. Backend memakai data tiruan sampai API tracking asli tersedia, dan bentuk respons tidak akan berubah saat itu. |
| SPK Internal adalah dokumen dengan baris, bukan satu baris per item | Form Buat SPK Internal imel punya header dan tabel barang. Nomor SPK Internal dibuat backend, misalnya `SPK-INT/2026/001`. |
| SPK Klien Induk dipilih dari `GET /tracking/spk`, dan Penanggung Jawab dari `GET /tracking/pic` | Keduanya adalah dropdown di desain imel yang sebelumnya kosong. Backend menolak nilai yang tidak ada di daftar itu. |
| Daftar SPK Internal berisi satu baris per baris dokumen, dan `id` baris dipakai oleh alokasi | Layar daftar dan layar Alokasikan Barang bekerja per barang. Awalnya `totalBisaPakai` sama dengan `alokasiStokBebas`, lalu berkurang oleh alokasi. Nilai 0 berarti `LOCKED`. Aturan ini asumsi backend dan perlu dikonfirmasi tim PPIC. |
| Rekap Mutasi diturunkan dari data inbound dan outbound yang sudah ada | Mutasi Masuk berasal dari barang masuk dan mutasi Keluar dari barang keluar, sehingga tidak perlu tabel baru. |
| Ringkasan Rekap Stok Opname mengikuti periode yang dipilih | Backend menghitungnya dari data stok opname lewat `GET /reports/stock-opname-summary` dengan parameter `month` dan `year`. |
| Daftar dimuat 100 baris pertama dan disaring di klien | Mengikuti kode imel dan pola halaman Gudang. Paginasi sungguhan menyusul. |
| Dropdown Tujuan Produksi sementara hanya berisi `STOCK` | Pilihan lain belum dikonfirmasi. Backend menerima teks bebas, jadi menambahkannya cukup satu baris di frontend. |

### Permission

| Permission | Pemegang | Dipakai untuk |
|---|---|---|
| `dokubah.view` | PPIC, Koor dan Staf Inventory | Menu Dokubah, Rekap Dokubah PPIC, dan Rekap Dokubah Gudang. |
| `dokubah.create`, `dokubah.update` | PPIC | Membuat Dokubah dan mengganti material. |
| `dokubah.approve` | Koor Inventory | Menyetujui atau menolak Dokubah. Belum ada layarnya. |
| `spk-internal.view` | PPIC, Koor dan Staf Inventory | Menu SPK Internal. |
| `spk-internal.create`, `spk-internal.allocate` | PPIC | Membuat dokumen, alokasi, dan daftar Penanggung Jawab. |
| `report.view` | ditambahkan ke PPIC | Rekap Mutasi dan Rekap Stok Opname PPIC. Akibatnya PPIC juga bisa membaca semua laporan Gudang. |

## Perubahan

### `src/domains/ppic/api.ts` dan `types.ts`

Fungsi untuk `/dokubah` meliputi `listDokubah`, `listDokubahRows`,
`getDokubah`, `createDokubah`, `replaceDokubahMaterials`, serta
`submitDokubah`, `approveDokubah`, dan `rejectDokubah`. Fungsi untuk
SPK Internal meliputi `listSpkInternal`, `createSpkInternal`, dan
`allocateSpkInternal`. Ada juga `listTrackingSpk`, `listTrackingPic`,
`listMutations`, dan `getStockOpnameSummary`. Hasil `listDokubah` sudah
berbentuk `DokubahItem` milik layar. `listDokubahRows` mengembalikan baris
mentah yang membawa `totalKuota`, `totalRealisasi`, dan
`totalRealisasiNilai`, dipakai oleh rekap.

### `src/domains/ppic/data/dokubah.ts` dan `spk-internal.ts`

Daftar dan fungsi ubah yang menyimpan data di memori dihapus. Yang
tertinggal adalah tipe, helper alamat halaman, dan fungsi format seperti
`formatTanggal` dan `formatRupiah`, karena komponen masih memakainya.

### `src/domains/auth/nav.ts`

Link PPIC ditambahkan di sini, bukan di `layout.tsx` seperti pada branch
imel, karena sidebar sekarang disaring permission. Link Dokubah dan Rekap
Dokubah memakai `dokubah.view`, SPK Internal memakai `spk-internal.view`,
serta Rekap Mutasi dan Rekap Stok Opname memakai `report.view`. Link
Rekap Dokubah Gudang juga berpindah dari `report.view` ke `dokubah.view`.

### Halaman

| Halaman | Endpoint | Catatan |
|---|---|---|
| Dokubah | `GET /dokubah` | Filter dan pencarian tetap di klien. |
| Buat Dokubah | `GET /tracking/spk`, `POST /dokubah` | Pilihan SPK berupa dropdown dan Nama Client terisi otomatis. Simpan Draft mengirim `DRAFT`, Rilis mengirim `PENDING`. |
| View Dokubah dan Edit Material | `GET /dokubah/{id}`, `PUT /dokubah/{id}/materials` | Edit ditolak backend dengan 409 jika status `APPROVED`. Pesannya tampil di form. |
| Rekap Dokubah dan Detail Rekap Dokubah | `GET /dokubah`, `GET /dokubah/{id}` | Realisasi dan sisa anggaran memakai `totalRealisasiNilai` dari baris list. Anggaran dihitung backend dari kuota dikali harga satuan. |
| SPK Internal | `GET /spk-internal` | Kartu ringkasan dihitung dari baris. Dropdown status berisi `BUFFER` dan `LOCKED`. |
| Buat SPK Internal | `POST /spk-internal` | Kode SKU dipilih dari daftar barang dan mengisi nama barang. Validasi frontend meniru backend, termasuk alokasi klien ditambah alokasi stok bebas harus sama dengan total. |
| Alokasikan Barang | `POST /spk-internal/{id}/allocate` | Hanya `jumlah` yang dikirim. SPK Klien dan catatan di form belum disimpan karena backend belum punya kolomnya. |
| Rekap Mutasi Barang | `GET /reports/mutations` | `id` berupa teks, misalnya `in-12`. Tanggal tidak punya jam sehingga kolomnya menampilkan tanggal saja. |
| Rekap Stok Opname PPIC | `GET /reports/mutations`, `GET /reports/stock-opname-summary` | Tiga kartu ringkasan mengikuti periode. |
| Rekap Dokubah Gudang | `GET /dokubah` | Menggantikan data tiruan. Opsi filter status berganti ke status API karena status SPK lama tidak ada di backend. |

### Perubahan tampilan imel yang terpaksa

- Kolom SPK di Buat Dokubah berubah dari input teks menjadi dropdown, dan
  Nama Client menjadi baca-saja.
- Kartu ringkasan SPK Internal berisi angka dari data, bukan teks tetap,
  dan dropdown status berisi opsi.
- Kolom Tanggal dan Jam di dua rekap mutasi hanya menampilkan tanggal.

## Bug atau Celah yang Ditemukan

- Branch imel berisi empat `page.tsx` kosong. File kosong bukan modul,
  sehingga `next build` gagal dengan pesan `is not a module`. Empat file
  itu dihapus saat penggabungan pertama. Dua di antaranya, `rekap-mutasi`
  dan `rekap-stock`, kemudian diisi imel dan dipakai apa adanya.
  Halaman Approval masih kosong dan tetap tidak ada.
- Kontrak backend berubah tiga kali selama pekerjaan ini. Yang paling
  penting, keputusan bahwa nomor SPK Internal berasal dari tracking
  dibatalkan. Yang berasal dari tracking adalah SPK Klien Induk.
  Perubahan seperti ini diselesaikan lewat tipe dan fungsi di
  `ppic/api.ts`, tanpa menyentuh komponen.
- `totalRealisasi` dari backend berupa jumlah barang, sedangkan kolom
  Realisasi di rekap berupa rupiah. Backend menambahkan
  `totalRealisasiNilai` setelah diminta.
- Backend belum menghubungkan realisasi Dokubah dengan barang keluar,
  sehingga nilainya selalu 0 kecuali di data seed.
- Halaman Penawaran Harga PPIC masih memakai data contoh dan dua
  `console.log`. Itu bukan bagian pekerjaan ini.
- Error lint `set-state-in-effect` masih ada di empat file lama, yaitu
  `ppic/DataBarang`, `purchasing/DataBarang`, `purchasing/DataSupplier`,
  dan `superadmin/Users`.

## Pengujian

| Cakupan | Hasil |
|---|---|
| `tsc --noEmit`, `next build`, tes unit | Bersih, sukses, dan 23 tes lulus. |
| Nama field, body, dan parameter terhadap `/openapi.json` backend yang hidup | Semua cocok. Kode frontend hanya memanggil path yang ada di `docs/api-1.json`. |
| Pemanggilan langsung ke backend dengan akun PPIC dan Inventory | 36 pemeriksaan lulus. Alurnya mencakup buat Dokubah, validasi 400 dan 409, edit lalu submit lalu approve, penolakan edit saat `APPROVED`, 403 untuk role yang tidak berhak, buat dokumen SPK Internal, alokasi sampai `LOCKED`, serta mutasi dan ringkasan stok opname. |

Tampilan di browser belum diuji oleh siapa pun. Pemeriksaan tadi hanya
sampai lapisan API. Akun tes memakai data seed lokal, dan beberapa
Dokubah serta satu dokumen SPK Internal uji tertinggal di database
pengembangan backend sampai seed ulang.

## Status dan Langkah Berikutnya

Dokubah, SPK Internal, dan rekap PPIC tersambung. Yang belum dikerjakan:

- Layar approve dan reject Dokubah, dan alur approval PPIC pada umumnya.
- Tombol Simpan Draft di Buat SPK Internal, karena API SPK Internal tidak
  punya status draft.
- Pilihan Tujuan Produksi selain `STOCK`.
- Konfirmasi tim PPIC atas asumsi `totalBisaPakai`.
- Paginasi di semua daftar.

Lanjutan di sisi Gudang ada di `08-Tampilan-Gudang-dan-Detail-Rekap-Permintaan.md`.
Daftar pekerjaan sisanya ada di `04-Rencana-Selanjutnya.md`.
