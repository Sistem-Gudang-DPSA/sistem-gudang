// Menggabungkan fragmen kontrak API per area menjadi docs/api-1.json.
// Urutan fragmen di bawah adalah urutan path di kontrak: jangan diurutkan
// ulang hanya karena nama file, karena test kontrak membandingkan path apa
// adanya dan output harus tetap deterministik.

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = join(repoRoot, "docs", "api");
const outputPath = join(repoRoot, "docs", "api-1.json");

const FRAGMENTS = [
  "_meta.json",
  "auth.json",
  "superadmin.json",
  "approvals.json",
  "lokasi.json",
  "supplier.json",
  "purchasing.json",
  "item.json",
  "inbound.json",
  "outbound.json",
  "tracking.json",
  "dokubah.json",
  "penawaran-harga.json",
  "reports-ringkas.json",
  "ppic.json",
  "reports.json",
  "checklist-dokubah.json",
  "umum.json",
  "outbound-lanjutan.json",
  "inbound-lanjutan.json",
  "supplier-lanjutan.json",
  "audit-log.json",
] as const;

type Paths = Record<string, unknown>;

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(join(apiDir, file), "utf8")) as T;
}

const fileNames = new Set<string>(FRAGMENTS);
const unused = readdirSync(apiDir)
  .filter((file) => file.endsWith(".json") && !fileNames.has(file))
  .sort();
if (unused.length > 0) {
  throw new Error(`Fragmen belum terdaftar di FRAGMENTS: ${unused.join(", ")}`);
}

const [metaFile, ...pathFiles] = FRAGMENTS;
const document = readJson<Record<string, unknown>>(metaFile);
if ("paths" in document) {
  throw new Error(`${metaFile} hanya boleh berisi metadata, bukan paths`);
}

const paths: Paths = {};
for (const file of pathFiles) {
  const fragment = readJson<{ paths: Paths }>(file);
  for (const [path, definition] of Object.entries(fragment.paths)) {
    if (path in paths) {
      throw new Error(`Path duplikat: ${path} (${file})`);
    }
    paths[path] = definition;
  }
}

document.paths = paths;
writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
console.log(`docs/api-1.json ditulis dari ${FRAGMENTS.length} fragmen (${Object.keys(paths).length} path).`);
