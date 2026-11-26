import { ApiError } from "@/shared/lib/api-client";
import { updateItem } from "./api";

// One supplier for many items. There is no bulk endpoint yet, so each item is updated in turn and
// failures are collected instead of stopping the rest. `supplierId: null` clears the supplier.
export async function bulkAssignItemSupplier(
  itemIds: number[],
  supplierId: number | null,
  onProgress?: (done: number, total: number) => void,
): Promise<{ assigned: number; failed: { id: number; reason: string }[] }> {
  const failed: { id: number; reason: string }[] = [];
  let done = 0;
  for (const id of itemIds) {
    try {
      await updateItem(id, { supplierId });
    } catch (err) {
      failed.push({ id, reason: err instanceof ApiError ? err.message : "Gagal menyimpan supplier." });
    }
    done += 1;
    onProgress?.(done, itemIds.length);
  }
  return { assigned: itemIds.length - failed.length, failed };
}
