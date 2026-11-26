# Sistem Gudang — Rencana Multi Supplier dan Harga

## Ringkasan

Satu barang dapat dipasok oleh banyak supplier dengan harga berbeda. Harga final ditetapkan Purchasing di baris PO, dikunci saat PO di-submit, dan dipakai sebagai nilai stok FIFO saat barang diterima. PPIC menentukan kebutuhan dan SPK, Gudang menerima barang per baris PO, dan laporan membaca nilai dari ledger biaya.

Sebagian besar fondasi ini sudah ada di backend. Pekerjaan yang tersisa adalah menyambung rantai yang masih putus, bukan membuat tabel baru. Dokumen ini dipakai untuk review. Belum ada kode yang diubah untuk rencana ini.

## Prinsip

```text
PPIC        → barang, qty, proyek, noSpk. Tanpa supplier, tanpa harga.
Purchasing  → supplier, qty, dan harga di PO. Harga beku setelah submit.
Gudang      → menerima per baris PO. Partial langsung disimpan.
Stok        → qty di items.stock, nilai di stock_cost_layers.
Opname      → mencatat fisik, tidak mengubah stok.
Pemutihan   → mengubah stok sekaligus layer.
Laporan     → membaca ledger biaya, bukan items.price.
```

`items.price` tinggal menjadi tampilan dan fallback. `items.supplierId` tetap dipakai sebagai supplier utama dan jembatan dummy. Grid harga bulanan hanya acuan pengisian PO, bukan sumber harga transaksi.

## Alur Hulu sampai Hilir

### 1. Permintaan pembelian

Ada dua pintu masuk, dengan PPIC tetap menjadi gerbang:

```text
Jalur utama  : PPIC → Purchasing
Jalur opsional: Gudang → PPIC → Purchasing
```

Gudang boleh mengajukan karena dialah yang tahu isi gudang, tetapi permintaannya tetap ditinjau PPIC dulu. Mesin approval sudah mendukung ini: langkah 1 PPIC otomatis hanya bila pemohonnya PPIC; bila pemohonnya Gudang, langkah 1 menjadi tinjauan manual PPIC.

Baris permintaan berisi `namaBarang`, `qty`, `satuan`, `proyek`, dan `noSpk`. `noSpk` opsional untuk form kertas, tetapi bila diisi harus dikenal layanan tracking. `clientName` diambil dari tracking, bukan dari body.

### 2. Mapping supplier

Satu baris permintaan boleh dibagi ke beberapa supplier. Mapping berbasis `lineIndex` dan sudah dikembalikan beserta `noSpk` oleh backend. Total qty mapping tidak boleh melebihi qty permintaan.

### 3. PO per supplier

Purchasing membuat satu PO untuk satu supplier. Pengelompokannya mengikuti `(proyek, noSpk)`, bukan proyek saja, karena satu client dapat memiliki banyak SPK.

```text
PO dibuat sebagai DRAFT  → harga masih bisa diedit
Submit PO (ttd basah)    → ISSUED, hargaSatuan dibekukan
                           submittedAt + submittedBy dicatat
```

Harga tidak digantung sampai barang datang. Setelah submit, koreksi harga wajib lewat batal PO dan PO baru. Data lama yang sudah `ISSUED` tidak perlu diubah ke `DRAFT`.

### 4. Barang masuk

Gudang memilih PO/baris PO, bukan memilih supplier terlebih dahulu. Supplier, qty beli, dan harga sudah melekat di baris PO. Inbound supplier wajib membawa `purchaseOrderId` dan `purchaseOrderLineId`; PO masih `DRAFT` ditolak.

Partial incoming disimpan langsung per kedatangan. Satu batch boleh mencampur baris dari beberapa PO dan supplier. Tiap penerimaan membuka layer biaya dengan `hargaSatuan` PO yang sudah beku, dan menyalin `noSpk` ke `inbound_transactions.spk`.

### 5. Stok dan FIFO

Barang keluar mengonsumsi layer tertua berdasarkan `createdAt` lalu `id`. Urutan fisik dan harga yang terpakai mengikuti layer yang sama. `stock_cost_layers` tidak perlu kolom `supplier_id` karena `source = INBOUND` dan `source_id` menuju baris inbound yang menyimpan supplier dan baris PO.

### 6. Produksi sebagai peminta bahan baku

Outbound sudah mengakomodasi produksi:

| Field | Nilai untuk produksi |
|---|---|
| `warehouseType` | `BAHAN_BAKU` |
| `recipientType` | `PRODUKSI` |
| `spk` | SPK tracking, wajib dikenal |
| `clientName` | Diambil dari SPK |

SPK internal PPIC adalah **jatah/alokasi**, bukan barang keluar. Alokasi tidak mengubah `items.stock`. Nomor SPK internal dibuat server dengan pola `SPK-INT/...` dan memiliki `spkKlienInduk` yang merujuk ke SPK tracking. Realisasi dokubah dihitung dari barang keluar yang `spk`-nya sama dengan `noSpk` dokubah dan barangnya sama.

Jadi rantai produksinya:

```text
Dokubah (noSpk tracking)
  → SPK internal (spkKlienInduk, alokasi jatah)
  → Outbound PRODUKSI (spk tracking, BAHAN_BAKU)
  → realisasi dokubah
```

Transaksi `INTERNAL` memakai `spk` teks bebas dan tidak masuk realisasi dokubah.

### 7. Opname dan pemutihan

Opname hanya snapshot fisik. Pemutihan yang mengubah stok:

| Kondisi | Perlakuan layer |
|---|---|
| Selisih kurang | Konsumsi FIFO. Nilai = jumlah × `unitPrice` layer yang benar-benar terpakai. |
| Selisih lebih | Layer baru dengan harga layer tersisa terakhir. Bila stok pernah nol, pakai harga konsumsi terakhir yang belum dibatalkan. |

Urutan sumber harga untuk selisih lebih:

```text
1. layer terakhir dengan remainingQty > 0
2. kalau tidak ada: stock_cost_consumptions.unitPrice terakhir
   dengan reversedAt null, diurutkan oleh createdAt lalu id
3. kalau barang belum pernah punya layer sama sekali:
   items.price dengan source OPENING dan ditandai sebagai harga awal
```

Keputusan poin 3 sudah final: `items.price` dipakai sebagai harga awal dengan `source = OPENING`, bukan dengan meminta input harga eksplisit saat pemutihan pertama kali.

Ini menutup kasus **setelah pemutihan mengosongkan stok**. Layer yang habis tidak dihapus, `remainingQty`-nya menjadi 0, dan `stock_cost_consumptions` tetap menyimpan `unitPrice` beserta `reversedAt`. Jadi harga barang yang dulu dibeli `@110.000` masih bisa dibuktikan dari ledger meski stoknya pernah nol.

`stock_reconciliation_lines.unitPrice` **bukan** alternatif untuk kasus ini. Nilainya disalin dari `items.price` saat opname di-submit (`stock-opname.repository.ts:149` lewat `physicalPrice`), jadi sumbernya tetap master price, bukan transaksi.

Nilai `totalAdjustmentNilai` harus dibaca dari `stock_cost_consumptions` dan `stock_cost_layers`, bukan dari `(fisik - sistem) × systemPrice`. Tanpa ini, keuntungan bergeser tanpa transaksi yang menjelaskannya.

### 8. Laporan dan realisasi

Realisasi SPK dan rekap bulanan menjumlahkan qty barang keluar per klien, SPK, dan barang. Nilai adjustment mengikuti ledger biaya. Supplier dummy tetap dipakai untuk master dan fallback, tidak dihapus, dan transaksi lama tidak ditulis ulang.

## Yang Sudah Ada di Backend

| Kemampuan | Status |
|---|---|
| Mapping satu baris PR ke banyak supplier | Sudah ada (`purchase_mappings`) |
| Banyak PO dari satu PR, satu PO per supplier | Sudah ada |
| Harga per baris PO | Sudah ada (`hargaSatuan`) |
| Partial incoming dan sisa qty PO | Sudah ada |
| Status PO dihitung dari inbound aktif | Sudah ada |
| Lock edit/cancel setelah ada inbound | Sudah ada |
| FIFO layer biaya dan jejak konsumsi | Sudah ada |
| Pemutihan PPIC dari opname | Sudah ada |
| Pembalikan layer saat inbound dibatalkan | Sudah ada |
| Kartu stok memuat penyesuaian pemutihan | Sudah ada |
| Validasi SPK tracking dan snapshot client | Sudah ada |
| SPK internal dan realisasi dokubah | Sudah ada |
| Outbound produksi dengan `BAHAN_BAKU` dan SPK tracking | Sudah ada |

## Yang Perlu Disambung

| No | Perubahan | Tempat | Alasan |
|---|---|---|---|
| 1 | Inbound supplier wajib `purchaseOrderLineId`; PO `DRAFT` ditolak | BE | Supplier dan harga tidak boleh datang dari master lagi |
| 2 | Layer inbound memakai `poLine.hargaSatuan` | BE | Nilai stok mengikuti harga yang disetujui Purchasing |
| 3 | Pemutihan lebih memakai harga layer/konsumsi terakhir; `items.price` hanya untuk barang tanpa riwayat layer | BE | Menutup kasus stok pernah nol tanpa mengarang harga |
| 4 | `totalAdjustmentNilai` membaca ledger | BE | Laba/rugi tidak punya selisih misterius |
| 5 | Status `DRAFT`, endpoint submit, `submittedAt`, `submittedBy` | BE | Harga beku saat ttd, bukan saat barang datang |
| 6 | `purchase-request.approve` untuk PPIC | Konfigurasi | Jalur Gudang harus bisa ditinjau PPIC |
| 7 | `noSpk` tersimpan di PO line dan tersalin ke inbound | BE | Rantai SPK putus di tengah |
| 8 | PO dikelompokkan per `(proyek, noSpk)` | FE | Satu client bisa punya banyak SPK |
| 9 | Form Barang Masuk memilih PO/baris PO, bukan filter supplier | FE | Gudang tidak menentukan supplier dan harga |

Poin 6 tidak memerlukan kode baru. Permission `purchase-request.approve` sudah terdaftar. Pengaturannya bisa dilakukan manual dari Superadmin → Roles. Endpoint yang dipakai adalah `PUT /api/v1/superadmin/roles/{id}/permissions` dan bersifat **replace-all**, jadi seluruh permission PPIC yang sudah ada harus tetap dicentang saat menambah permission ini.

## Yang Sengaja Tidak Dibuat

```text
Tidak ada tabel item_suppliers baru
Tidak ada kolom qty_received atau price_locked baru
Tidak ada tabel stock_lots / outbound_allocations baru
Tidak ada penulisan ulang transaksi lama
Tidak ada source: PRODUKSI sebagai jalan pintas penerimaan supplier
Tidak ada grid bulanan sebagai sumber harga transaksi
Tidak ada alur invoice, pembayaran, atau hutang
```

Alasannya: backend sudah memiliki padanannya. `purchase_mappings` adalah relasi barang ke banyak supplier, inbound aktif adalah `qty_received`, adanya submit PO adalah kunci harga, dan `stock_cost_layers` dengan `stock_cost_consumptions` adalah lot serta alokasi FIFO.

Lini Keuangan memang sudah ada sebagai domain, tetapi untuk sementara tidak berperan dalam alur ini. Cukup dibiarkan, tidak perlu dibahas dalam rencana ini.

## Rencana Bertahap

Satu PR untuk satu tujuan. Backend dikerjakan lebih dulu karena frontend bergantung pada kontraknya. Gudang dikerjakan terakhir karena modulnya sudah berjalan dan diuji.

| Tahap | Repo | Tujuan | Isi | Gate |
|---|---|---|---|---|
| 0 | FE/BE | Kunci keputusan dan akses | Setujui dokumen ini, centang manual `purchase-request.approve` untuk Koor PPIC, dan selesaikan PR #170 di jalur prod | Tidak ada kode yang diubah |
| 1 | BE | PO sebagai sumber harga | `noSpk` di PO line dan pengelompokan per `(proyek, noSpk)`, status `DRAFT` + submit, inbound wajib PO line, layer dari `hargaSatuan` | Test BE hijau, `docs/05`, `09`, `10`, `11`, `12` |
| 2 | BE | Nilai pemutihan konsisten | Urutan harga layer/konsumsi, `unitPrice` diteruskan ke layer, `totalAdjustmentNilai` dari ledger | Test after-zeroing hijau, `docs/07`, `08` |
| 3 | FE | Purchasing mengikuti PO | Angkat potongan mapping dari branch lama, tombol Simpan Draft dan Submit PO, harga read-only setelah submit, tampilkan SPK | `lint`, `tsc`, `test` hijau, `docs/12`, `api-1.json` |
| 4 | FE | Gudang memilih PO | Form terima per baris PO, hapus filter supplier, scan per PO line, batch boleh campur PO | Regresi Gudang hijau, `docs/02`, `06` |
| 5 | FE/BE | Penutupan | Rapikan seluruh docs terkait dan jalankan 15 skenario uji | Semua test dan type check hijau |

Tahap 1 dan 2 boleh dikerjakan berdekatan, tetapi tetap dua commit dengan tujuan berbeda. Tahap 4 tidak dimulai sebelum tahap 1 dan 3 selesai, karena kontrak PO belum final.

Sebelum push atau PR, jalankan `bun run lint`, `bunx tsc --noEmit`, dan `bun run test`, lalu baca `git diff dev` baris per baris. Branch dibuat dari `dev`; tidak push langsung ke `dev`.

## Uji Coba Akhir Pekan

```text
1. PR dari PPIC → Purchasing tanpa tinjauan ulang PPIC
2. PR dari Gudang → tinjau PPIC → Purchasing
3. PR 1 baris → mapping ke 2 supplier → 2 PO
4. Edit harga saat DRAFT → berhasil
5. Submit PO → edit harga → ditolak
6. Inbound ke PO DRAFT → ditolak
7. PO-101 terima 40 pagi + 80 sore → sisa 0, dua layer, satu harga
8. Inbound tanpa purchaseOrderLineId → ditolak
9. Batch inbound berisi PO dari dua supplier → berhasil
10. Barang keluar 100 → FIFO memakai harga layer
11. Outbound PRODUKSI memakai SPK tracking dan BAHAN_BAKU
12. Opname kurang → nilai laporan sama dengan nilai konsumsi layer
13. Opname lebih → layer baru memakai harga layer tersisa
14. Realisasi dokubah terbaca per SPK dan barang
15. Pemutihan sampai stok nol, lalu opname lebih → layer baru memakai harga konsumsi terakhir, bukan `items.price`
```

Skenario 1, 2, 3, 10, 11, dan 14 bisa diuji dengan kode yang ada sekarang, asalkan permission PPIC sudah dicentang dan halaman mapping diangkat ke branch uji. Skenario 4 sampai 9, 12, 13, dan 15 baru bisa diuji setelah tahap 1 dan 2 backend selesai. Jadi untuk akhir pekan ini yang realistis adalah menguji enam skenario pertama dari kode lama sambil mencatat gap-nya, bukan menunggu seluruh tahap selesai.

## Dokumen yang Perlu Disesuaikan

Repo ini:

- `docs/09-Permintaan-Pembelian-PPIC-dan-Rekap-Pembelian.md` — dua jalur permintaan dan gerbang PPIC.
- `docs/12-Pemesanan-Pembelian-dan-Histori-Harga-Supplier.md` — DRAFT, submit, dan pengelompokan per SPK.
- `docs/06-Integrasi-Modul-Gudang.md` — nilai opname dan pemutihan dari ledger.
- `docs/api-1.json` — kontrak endpoint submit PO dan field baru.

Repo backend, lewat PR terpisah:

- `docs/05-Barang-Masuk.md` — inbound wajib PO line dan menolak PO draft.
- `docs/06-Barang-Keluar.md` — hubungan SPK internal, outbound produksi, dan realisasi.
- `docs/07-Operasional-Gudang.md` — nilai adjustment dari ledger.
- `docs/08-PPIC.md` — alokasi SPK internal dan realisasi dokubah.
- `docs/09-Purchasing.md` — lifecycle PO dan submit.
- `docs/10-Approval-Notifikasi-Laporan-Masalah.md` — jalur Gudang dan permission PPIC.
- `docs/11-Integrasi-Tracking.md` — SPK dari PR sampai inbound.
- `docs/12-Database.md` — status `DRAFT`, kolom submit, `no_spk` di PO, dan `spk` di inbound.

## Berkas Terkait

- `docs/api-1.json` sebagai kontrak backend.
- `src/domains/inventory/components/barang-masuk/useFormBarangMasuk.ts`.
- `src/domains/purchasing/components/PemesananPembelian.tsx`.
- `src/domains/ppic/components/AksiPersetujuanPembelian.tsx`.
- Branch lokal `mapping-supplier` yang tertinggal 307 commit dari `dev`; bagian fiturnya perlu diambil ke branch baru berbasis `dev`, bukan di-merge langsung.
