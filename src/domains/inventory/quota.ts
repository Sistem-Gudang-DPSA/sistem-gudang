export type QuotaStatus = "Approved" | "Perlu Approval" | "Belum Terdata";

// Approved: the dokubah still has quota for the requested qty. Out of quota needs PPIC + Gudang approval
// (the approval flow is built after all domains). No dokubah entry (null): not recorded.
export function getQuotaStatus(sisaKuota: number | null, qty: number): QuotaStatus {
  if (sisaKuota === null) return "Belum Terdata";
  return sisaKuota >= qty ? "Approved" : "Perlu Approval";
}
