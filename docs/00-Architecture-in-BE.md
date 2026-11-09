# Sistem Gudang — Project Init

## Ringkasan

Dokumen ini membangun fondasi backend: struktur project, koneksi
database, error handling terpusat, dan test pertama. Middleware
keamanan, logging terstruktur, rate limiting, RBAC, dan modul auth belum
masuk pekerjaan ini. Semua itu dikerjakan di `02-Infrastructure-Hardening.md`.

## Keputusan

| Keputusan | Alasan |
|---|---|
| Bun untuk development, Node.js untuk produksi | Server produksi kemungkinan shared hosting yang hanya menyediakan Node, tanpa runtime Bun. Kode aplikasi harus portable ke Node murni, jadi hindari API native Bun seperti `Bun.serve`, `Bun.file`, `Bun.env`. Pakai API Node standar: `fs`, `process.env`, `express().listen()`. |
| Drizzle ORM, bukan Prisma | Drizzle tidak butuh binary engine terpisah, sehingga setup lebih transparan untuk kombinasi Bun dan Node. Prisma butuh step `generate` yang rawan platform mismatch. Schema Drizzle langsung berupa kode TypeScript yang typed sejak ditulis. |
| Domain layered, arah modular monolith | Kode dikelompokkan per modul atau fitur dulu, layer teknisnya ada di dalam tiap modul. Berbeda dari MVC tradisional yang memisahkan folder `controllers` dan `services` untuk semua modul sekaligus. |

## Arsitektur

Struktur satu modul:

```
src/modules/inventory/data-barang/
├── data-barang.route.ts
├── data-barang.controller.ts
├── data-barang.service.ts       # public interface modul ini
├── data-barang.repository.ts    # private, jangan diimpor modul lain
└── data-barang.schema.ts        # validasi Zod untuk request
```

Modul lain yang butuh data dari modul ini harus lewat fungsi yang
diekspor `*.service.ts`. Mengimpor `*.repository.ts` modul lain secara
langsung tidak diperbolehkan. Aturan ini masih dijaga manual, belum ada
tooling yang menegakkannya otomatis, dan menjadi prasyarat kalau suatu
saat proyek perlu naik jadi modular monolith penuh sehingga tiap modul
bisa diangkat jadi service terpisah tanpa rewrite besar.

Level arsitektur saat ini bukan clean architecture penuh. Untuk kebutuhan
CRUD-heavy tanpa business logic kompleks, clean architecture dianggap
overengineering. Layered dengan disiplin boundary sudah cukup.
Enforcement otomatis seperti ESLint boundaries baru ditambahkan kalau ada
gejala pelanggaran nyata.

Alur request:

```
Request → Route → Controller → Service → Repository → Database
```

Route mendaftarkan endpoint dan method, lalu memanggil controller yang
dibungkus `asyncHandler`. Controller hanya menangani `req` dan `res`,
tidak boleh berisi logika bisnis. Service berisi logika bisnis dan tidak
boleh mengimpor Express, supaya testable tanpa HTTP. Repository jadi
satu-satunya layer yang berbicara ke Drizzle dan database.

## Perubahan

### Struktur Folder

```
src/
├── app.ts              # setup Express: middleware, routes, 404, error handler. Ekspor app, tidak listen()
├── app.test.ts
├── server.ts            # entry point: bootstrap, testConnection, listen, graceful shutdown
├── config/
│   ├── env.ts           # validasi env vars pakai Zod, gagal jelas kalau salah
│   └── db.ts            # pool MySQL, instance Drizzle, testConnection()
├── db/
│   ├── schema/
│   │   ├── index.ts         # satu-satunya tempat mendaftarkan tiap schema baru
│   │   └── barang.schema.ts # tabel pertama
│   └── migrations/       # hasil drizzle-kit generate, jangan diedit manual
├── modules/              # kerangka kosong: inventory, ppic, purchasing, superadmin, auth
├── middlewares/
│   ├── error-handler.middleware.ts   # wajib posisi terakhir di app.ts
│   └── error-handler.middleware.test.ts
├── shared/
│   ├── errors/app-error.ts           # AppError dan turunannya
│   ├── types/api-response.type.ts
│   └── utils/
│       ├── response-formatter.ts     # sendSuccess dan sendError
│       └── async-handler.ts          # wrapper, auto-catch error di controller
└── routes/
    └── index.ts          # kerangka barrel untuk route modul, belum diisi
```

### Menambah Tabel Baru

Buat `src/db/schema/nama-tabel.schema.ts`, lalu tambahkan
`export * from './nama-tabel.schema'` di `src/db/schema/index.ts`. File
`index.ts` ini satu-satunya tempat yang perlu diupdate karena
`drizzle.config.ts` dan `db.ts` sama-sama merujuk ke situ. Setelah itu
jalankan `bun run db:generate`, review SQL yang dihasilkan di
`src/db/migrations/`, baru jalankan `bun run db:migrate`.

Nama kolom pakai camelCase di TypeScript, contoh `createdAt`, dan
snake_case di database, contoh `created_at`. Tulis eksplisit tiap kolom
seperti `createdAt: timestamp('created_at')`, Drizzle menjembatani
pemetaan itu otomatis.

`z.string()` saja menerima string kosong sebagai valid. Field wajib harus
pakai `.min(1)` minimal. Secret harus pakai `.min(N)` sesuai kebutuhan
keamanan, bukan sekadar penanda wajib diisi.

### Response API

```ts
sendSuccess(res, data, 'Berhasil diambil');           // 200
sendSuccess(res, newData, 'Berhasil dibuat', 201);     // 201
sendError(res, 'Tidak ditemukan', 404);
```

Bentuk response:

```json
{ "success": true, "message": "...", "data": {} }
{ "success": false, "message": "...", "errors": {} }
```

Route yang tidak cocok dengan endpoint mana pun mengembalikan 404 dalam
format JSON yang sama. Catch-all handler ini ada di `app.ts`, dipasang
sebelum `errorHandler`, sehingga tidak ada halaman HTML default Express
yang bocor ke client.

### Error Handling

Service layer selalu throw, tidak pernah langsung memanggil `res.json()`.

```ts
import { NotFoundError } from '../../../shared/errors/app-error';

async function getBarangById(id: number) {
  const barang = await barangRepository.findById(id);
  if (!barang) throw new NotFoundError('Barang tidak ditemukan');
  return barang;
}
```

Controller wajib dibungkus `asyncHandler`:

```ts
router.get('/:id', asyncHandler(async (req, res) => {
  const barang = await barangService.getBarangById(Number(req.params.id));
  sendSuccess(res, barang);
}));
```

| Class | Status | Kapan dipakai |
|---|---|---|
| `NotFoundError` | 404 | Data tidak ditemukan |
| `BadRequestError` | 400 | Input tidak valid, bisa menyertakan detail `errors` |
| `UnauthorizedError` | 401 | Belum login atau token invalid |
| `ForbiddenError` | 403 | Sudah login tapi tidak punya akses |
| `ConflictError` | 409 | Data sudah ada, duplicate unique field |

### Environment dan Database Lokal

Environment variables divalidasi Zod di `config/env.ts`. Server gagal
start dengan pesan jelas kalau ada yang kosong atau salah, tidak diam-diam
jalan dengan konfigurasi rusak.

Database lokal memakai user aplikasi yang terpisah dari `root`, karena
root MariaDB memakai autentikasi unix_socket dan tidak bisa dipakai
aplikasi langsung dengan password:

```sql
CREATE USER 'gudang_app'@'localhost' IDENTIFIED BY '...';
GRANT ALL PRIVILEGES ON sistem_gudang.* TO 'gudang_app'@'localhost';
```

### Graceful Shutdown dan Deployment

`server.ts` menangkap sinyal `SIGTERM` dan `SIGINT`. HTTP server ditutup
lebih dulu sebelum `pool.end()` dipanggil, supaya koneksi database tidak
terputus paksa saat restart atau deploy.

Repo backend dan frontend dipisah, komunikasi lewat kontrak API. Build
memakai `tsup` menghasilkan JS plain ESM di `dist/`, dijalankan dengan
`node dist/server.js`.

## Pengujian

Test co-located: file `*.test.ts` bersebelahan dengan kode yang diuji,
bukan di folder `tests/` terpisah. Ini konsisten dengan prinsip domain
layered, dan Vitest otomatis mendeteksi test itu di mana pun letaknya.

```bash
bun run test        # jalankan sekali
bun run test:watch  # watch mode
```

Import `app` langsung dari `app.ts` tanpa memanggil `listen()`, supaya
test HTTP jalan tanpa server beneran menyala di suatu port.

## Status dan Langkah Berikutnya

Fondasi selesai dan teruji lewat test manual dan otomatis. CORS, helmet,
logging terstruktur, rate limiting, middleware validasi request generik,
RBAC, dan modul auth belum ada. Semua itu dikerjakan berikutnya, lihat
`02-Infrastructure-Hardening.md`.
