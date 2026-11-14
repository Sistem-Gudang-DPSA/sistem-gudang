## Tujuan

<!-- Satu kalimat. Satu PR untuk satu tujuan: fitur, perbaikan, refactor, atau format, tidak dicampur. -->

## Checklist (lihat `AGENTS.md`)

- [ ] Diff hanya berisi tujuan PR: tidak ada format ulang dan tidak ada perubahan berkas yang tak terkait.
- [ ] Helper dan komponen bersama di `src/shared` dipakai, tidak ditulis ulang.
- [ ] Nilai khusus divisi (link `?from=`, path, permission) sudah disesuaikan.
- [ ] `bun run lint` 0 error, `bunx tsc --noEmit` bersih, dan `bun run test` lulus.
- [ ] Test ditambah untuk perilaku baru, dan docs di `docs/` diperbarui.
