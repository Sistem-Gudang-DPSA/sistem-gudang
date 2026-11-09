import { describe, expect, it } from "vitest";
import { outboundEditChanges } from "./outbound-edit-history";
import type { OutboundRow } from "./types";

const before: OutboundRow = {
  id: 8,
  date: "2026-11-09",
  clientName: "PT Jaya",
  spk: "SPK-1",
  itemName: "Meja",
  warehouseType: "BAHAN_BAKU",
  recipientType: "PRODUKSI",
  notes: null,
  createdBy: 1,
  createdAt: "2026-11-09T02:00:00Z",
  lines: [
    { itemId: 1, itemCode: "BRG-1", itemName: "Triplex", locationCode: null, qty: 4, pic: "Andi" },
    { itemId: 2, itemCode: "BRG-2", itemName: "Paku", locationCode: null, qty: 9, pic: "Andi" },
  ],
};

describe("outbound edit changes", () => {
  it("shows changed header and quantity values without unchanged fields", () => {
    const after = {
      ...before,
      spk: "SPK-2",
      itemName: "Lemari",
      lines: [{ ...before.lines[0], qty: 7 }, before.lines[1]],
    };
    expect(outboundEditChanges(before, after)).toEqual([
      { field: "SPK", before: "SPK-1", after: "SPK-2" },
      { field: "Nama Item/Projek", before: "Meja", after: "Lemari" },
      { field: "Jumlah — Triplex (BRG-1)", before: "4", after: "7" },
    ]);
  });

  it("matches reordered materials by ID and ignores equivalent date formats", () => {
    expect(
      outboundEditChanges(before, {
        ...before,
        date: "2026-11-09T00:00:00Z",
        lines: [before.lines[1], before.lines[0]],
      }),
    ).toEqual([]);
    expect(
      outboundEditChanges(before, {
        ...before,
        lines: [{ ...before.lines[1], qty: 6 }, before.lines[0]],
      }),
    ).toEqual([{ field: "Jumlah — Paku (BRG-2)", before: "9", after: "6" }]);
  });

  it("shows a material replacement and changed quantity and collector", () => {
    const after = {
      ...before,
      lines: [
        { ...before.lines[0], itemId: 3, itemCode: "BRG-3", itemName: "HPL", qty: 2, pic: "Budi" },
        before.lines[1],
      ],
    };
    expect(outboundEditChanges(before, after)).toEqual([
      { field: "Material barang 1", before: "Triplex (BRG-1)", after: "HPL (BRG-3)" },
      { field: "Jumlah — Triplex (BRG-1)", before: "4", after: "2" },
      { field: "Pengambil — Triplex (BRG-1)", before: "Andi", after: "Budi" },
    ]);
  });

  it("records removed and added materials with their quantities", () => {
    const removed = outboundEditChanges(before, { ...before, lines: [before.lines[0]] });
    expect(removed).toEqual([
      {
        field: "Barang dihapus — Paku (BRG-2)",
        before: "Paku (BRG-2) · Jumlah: 9 · Pengambil: Andi",
        after: "-",
      },
    ]);
    const added = outboundEditChanges({ ...before, lines: [before.lines[0]] }, before);
    expect(added).toEqual([
      {
        field: "Barang ditambahkan — Paku (BRG-2)",
        before: "-",
        after: "Paku (BRG-2) · Jumlah: 9 · Pengambil: Andi",
      },
    ]);
  });

  it("includes changed date, client, recipient and cleared notes", () => {
    const changes = outboundEditChanges(
      { ...before, notes: "Catatan lama" },
      { ...before, date: "2026-11-10", clientName: "CV Maju", recipientType: "KLIEN" },
    );
    expect(changes).toEqual([
      { field: "Tanggal", before: "09-11-2026", after: "10-11-2026" },
      { field: "Client", before: "PT Jaya", after: "CV Maju" },
      { field: "Tujuan / Penerima", before: "Produksi", after: "Klien" },
      { field: "Catatan", before: "Catatan lama", after: "-" },
    ]);
  });

  it("does not treat current warehouse location as an edit to the transaction", () => {
    expect(
      outboundEditChanges(before, {
        ...before,
        lines: before.lines.map((line) => ({ ...line, locationCode: "A-01" })),
      }),
    ).toEqual([]);
  });
});
