import { ApiError } from "@/shared/lib/api-client";
import { replaceItemSuppliers } from "./api";

// Replace the supplier set for each item atomically. An empty list clears all mappings.
// Failures are collected per item without stopping the other selected items.
export async function bulkAssignItemSupplier(
  itemIds: number[],
  supplierIds: number[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ assigned: number; failed: { id: number; reason: string }[] }> {
  const failed: { id: number; reason: string }[] = [];
  let done = 0;
  for (const id of itemIds) {
    try {
      await replaceItemSuppliers(id, supplierIds);
    } catch (err) {
      failed.push({ id, reason: err instanceof ApiError ? err.message : "Gagal menyimpan supplier." });
    }
    done += 1;
    onProgress?.(done, itemIds.length);
  }
  return { assigned: itemIds.length - failed.length, failed };
}
