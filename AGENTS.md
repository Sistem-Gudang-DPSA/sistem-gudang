# sistem-gudang

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4. Package manager: bun (`bun.lock`), npm lockfile also present.

## Structure

- `src/app` — routes (App Router). Dashboard sub-routes per domain: `ppic`, `purchasing`, `superadmin`, `gudang`.
- `src/domains` — feature modules (`ppic`, `inventory`, `purchasing`, `superadmin`, `auth`), each with its own `components`. `inventory` holds the Gudang (warehouse) division screens and the item, location and stock transaction API shared with the other divisions, because the backend calls that domain Inventory. The route and menu name stay `gudang` (`src/app/dashboard/gudang`).
- `src/shared/lib` — shared utilities.

## Commands

- `npm run dev` — dev server
- `npm run build` / `npm run start` — production build/serve
- `npm run lint` — ESLint
- `npm run test` / `npm run test:watch` — Vitest (jsdom + Testing Library)

## Conventions

- Keep new code inside the relevant `src/domains/<domain>` module; put route-only glue in `src/app`.
- No custom framework deviations — standard Next.js App Router behavior applies.

## Rules (wajib sebelum push/PR ke `dev`)

- `src/app/**/page.tsx` hanya boleh re-export: `export { default } from "@/domains/<domain>/components/<Komponen>";`. Logika (termasuk `redirect`, fetch, JSX) taruh di komponen dalam `src/domains`. Dijaga oleh `src/test/integration/routes.test.ts`.
- Jalankan `bun run lint`, `bun run test`, dan `bunx tsc --noEmit` (atau `bun run build`) sebelum push. Lint 0 error, test lulus, type check bersih; Vercel gagal build jika ada type error yang tidak tertangkap lint/test. Laporkan hasil sebenarnya, jangan klaim lulus tanpa menjalankan.
- Perubahan baru wajib diverifikasi, bukan hanya "seharusnya jalan". Tambah/ubah test bila perilaku berubah.
- Jangan menghapus atau melemahkan test agar lulus. Test gagal = perbaiki kode, atau tanyakan dulu.
- Jangan commit/push sebelum diminta user. Jangan push ke `dev` langsung; pakai branch + PR.
- Jangan mengerjakan di luar permintaan (scope creep). Perubahan tak terkait dipisah ke PR lain.
- Agent wajib membaca aturan di file ini dan menaatinya; hasil agent tetap harus ditinjau manusia sebelum merge.

File ini adalah satu-satunya acuan aturan. `CLAUDE.md` dan `GEMINI.md` hanya mengimpornya, jadi ubah aturan di sini saja. Manusia dan agent memakai aturan yang sama. Checklist yang sama ada di `.github/pull_request_template.md`.

## Isi diff

- Satu PR untuk satu tujuan. Fitur, perbaikan bug, refactor, dan format ulang tidak boleh dicampur dalam satu commit atau PR.
- Jangan format ulang berkas yang sedang diubah. Ini mencakup ganti tanda kutip, pecah atau gabung JSX, urutan state, dan hapus komentar. Prettier belum dipakai dan akan dijalankan sekali di akhir (`docs/15-Catatan-Refactoring.md`).
- Sebelum push, baca `git diff dev` baris per baris. Setiap baris yang berubah harus bisa dijelaskan oleh tujuan PR. Baris yang tidak bisa dijelaskan harus dikembalikan.
- Hati-hati saat menyalin dari layar divisi lain. Sesuaikan nilai yang khusus divisi, seperti `?from=<divisi>`, path `/dashboard/<divisi>/...`, dan permission. Nilai yang ikut tersalin akan mengarahkan pengguna ke divisi yang salah.

## Pakai yang sudah ada

Cek `src/shared` dan layar kembar di divisi lain sebelum menulis kode baru. Jangan menulis ulang yang sudah ada:

- API: `src/shared/lib/api-client.ts` dan `api.ts` per domain. Jangan `fetch` langsung dari komponen.
- Data dan paginasi: `useApiData`, `usePage(resetKey)` untuk reset halaman saat filter berubah, `useClampPage`, `fetchAll`, dan `useDebouncedValue`.
- Cetak dan unduh: `cetakHtml` (`print-html.ts`), `escapeHtml`, `downloadBlob`, `csv.ts`, dan `export-excel.ts`. Jangan memakai `window.open` + `document.write` sendiri.
- Input: `digitsOnly`, `decimalOnly`, `INTEGER_INPUT`, dan `parsePpn` (`input.ts`).
- UI: `Modal`, `Pagination`, `SortableTh`, `EditModeBar`, `SearchableSelect`, `StatusBadge`, `StatCard`, `DateFilter`, dan `ImportExcelButton` di `src/shared/components`. Jangan memakai `window.confirm` atau `alert` untuk dialog baru.
- Layar yang sama di divisi lain, misalnya Data Supplier Purchasing dan Superadmin, harus memakai komponen bersama yang sama. Jangan menyalin isi komponennya.

## Perilaku pengguna

- Hasil aksi massal (import, bulk) wajib ditampilkan lengkap kepada pengguna, termasuk yang berhasil dan yang dilewati atau gagal. Data tidak boleh hilang tanpa pemberitahuan.
- Tombol aksi dijaga dengan permission yang sesuai endpoint backend.

## Test dan docs

- Fitur atau layar baru wajib punya test, termasuk layar kembar di divisi kedua. Minimal uji permission tombol dan link navigasi khusus divisi.
- Perubahan perilaku wajib memperbarui guide terkait di `docs/` dalam PR yang sama. Tulis keadaan sekarang, bukan catatan perubahan. Endpoint baru yang dipakai ditulis di docs integrasinya.

## Checklist sebelum PR

- [ ] Diff hanya berisi tujuan PR: tidak ada format ulang dan tidak ada perubahan berkas yang tak terkait.
- [ ] Helper dan komponen bersama dipakai, tidak ditulis ulang.
- [ ] Nilai khusus divisi (link, path, permission) sudah disesuaikan.
- [ ] `bun run lint` 0 error, `bunx tsc --noEmit` bersih, dan `bun run test` lulus.
- [ ] Test ditambah untuk perilaku baru, dan docs diperbarui.
