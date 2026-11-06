// Indonesian labels for permission codes (e.g. "report.view" -> "Lihat Laporan") so non-technical admins can read them.
// Unknown actions or resources fall back to the BE description, then the raw code.

const ACTION: Record<string, string> = {
  view: "Lihat",
  create: "Tambah",
  update: "Ubah",
  edit: "Ubah",
  delete: "Hapus",
  approve: "Setujui",
  assign: "Atur",
  "assign-location": "Atur Lokasi",
  "adjust-stock": "Sesuaikan Stok",
  "set-price": "Atur Harga",
  "set-supplier": "Atur Supplier",
  "upload-photo": "Unggah Foto",
  publish: "Terbitkan",
  allocate: "Alokasikan",
  cancel: "Batalkan",
  import: "Impor",
  export: "Ekspor",
};

const RESOURCE: Record<string, string> = {
  role: "Role",
  "role-permission": "Hak Akses Role",
  user: "User",
  item: "Data Barang",
  location: "Lokasi",
  supplier: "Supplier",
  "purchase-order": "PO Barang",
  "purchase-request": "Permintaan Pembelian",
  "material-request": "Permintaan Material",
  inbound: "Barang Masuk",
  outbound: "Barang Keluar",
  "checklist-dokubah": "Checklist Dokubah",
  "stock-opname": "Stock Opname",
  dokubah: "Dokubah",
  "penawaran-harga": "Penawaran Harga",
  "spk-internal": "SPK Internal",
  report: "Laporan",
};

// Full codes whose composed label reads badly.
const OVERRIDE: Record<string, string> = {
  "item.assign-location": "Atur Lokasi Barang",
  "item.adjust-stock": "Sesuaikan Stok Barang",
  "item.set-price": "Atur Harga Barang",
  "item.set-supplier": "Atur Supplier Barang",
  "item.upload-photo": "Unggah Foto Barang",
  "role-permission.assign": "Atur Hak Akses Role",
  "material-request.update": "Ubah Status Permintaan Material",
};

export const resourceLabel = (resource: string) => RESOURCE[resource] ?? resource;

export function permissionLabel(p: { code: string; resource: string; action: string; description?: string | null }): string {
  const override = OVERRIDE[p.code];
  if (override) return override;
  const action = ACTION[p.action];
  const resource = RESOURCE[p.resource];
  if (action && resource) return `${action} ${resource}`;
  return p.description || p.code;
}
