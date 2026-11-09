import { displayDate } from "./date";
import type { OutboundLine, OutboundRow } from "./types";

export interface OutboundEditChange {
  field: string;
  before: string;
  after: string;
}

const materialName = (line: OutboundLine) =>
  line.itemCode ? `${line.itemName} (${line.itemCode})` : line.itemName;

const materialDetails = (line: OutboundLine) =>
  `${materialName(line)} · Jumlah: ${line.qty} · Pengambil: ${line.pic}`;

/** Compare stored snapshots, matching unchanged materials by ID rather than row order. */
export function outboundEditChanges(before: OutboundRow, after: OutboundRow): OutboundEditChange[] {
  const changes: OutboundEditChange[] = [];
  const add = (
    field: string,
    oldValue: string | number | null,
    newValue: string | number | null,
  ) => {
    const oldText = String(oldValue ?? "");
    const newText = String(newValue ?? "");
    if (oldText !== newText) changes.push({ field, before: oldText || "-", after: newText || "-" });
  };

  if (before.date.slice(0, 10) !== after.date.slice(0, 10)) {
    add("Tanggal", displayDate(before.date), displayDate(after.date));
  }
  add("Client", before.clientName, after.clientName);
  add("SPK", before.spk, after.spk);
  add("Nama Item/Projek", before.itemName, after.itemName);
  const recipients = { PRODUKSI: "Produksi", KLIEN: "Klien" };
  add("Tujuan / Penerima", recipients[before.recipientType], recipients[after.recipientType]);
  add("Catatan", before.notes, after.notes);

  const remainingAfter = new Set(after.lines.map((_, index) => index));
  const replacedBefore: { line: OutboundLine; index: number }[] = [];
  const compareLine = (oldLine: OutboundLine, newLine: OutboundLine, index: number) => {
    const label = materialName(oldLine);
    if (oldLine.itemId !== newLine.itemId) {
      add(`Material barang ${index + 1}`, label, materialName(newLine));
    }
    add(`Jumlah — ${label}`, oldLine.qty, newLine.qty);
    add(`Pengambil — ${label}`, oldLine.pic, newLine.pic);
  };

  before.lines.forEach((line, index) => {
    const match = [...remainingAfter].find((next) => after.lines[next].itemId === line.itemId);
    if (match === undefined) replacedBefore.push({ line, index });
    else {
      remainingAfter.delete(match);
      compareLine(line, after.lines[match], index);
    }
  });

  // Remaining lines are replacements, additions or removals, rather than reordered materials.
  const unmatchedAfter = [...remainingAfter].map((index) => after.lines[index]);
  replacedBefore.forEach(({ line, index }, offset) => {
    const replacement = unmatchedAfter[offset];
    if (replacement) compareLine(line, replacement, index);
    else add(`Barang dihapus — ${materialName(line)}`, materialDetails(line), null);
  });
  unmatchedAfter.slice(replacedBefore.length).forEach((line) => {
    add(`Barang ditambahkan — ${materialName(line)}`, null, materialDetails(line));
  });

  return changes;
}
