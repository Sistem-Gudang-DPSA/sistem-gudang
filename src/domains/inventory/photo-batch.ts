import { ApiError } from "@/shared/lib/api-client";
import { uploadItemPhotosBulk, type BulkPhotoResult } from "./api";

export const BATCH_SIZE = 10;

export type PairStatus = "pending" | "uploading" | "done" | "failed";
export type PairState = { itemId: number; status: PairStatus; reason?: string };
export type Progress = { pairs: PairState[]; batch: number; totalBatches: number; waitingUntil: number | null };

const REASON_TEXT: Record<BulkPhotoResult["failed"][number]["reason"], string> = {
  not_found: "Barang tidak ditemukan",
  invalid_type: "Format tidak didukung",
  too_large: "Ukuran lebih dari 10 MB",
  unprocessable: "Foto tidak bisa diproses",
};

const MAX_RETRIES = 3;
const DEFAULT_RETRY_SECONDS = 60;

// Resolves after ms, or at once when signal aborts, so Batal does not wait out a long rate-limit window.
function waitOrAbort(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal?.aborted) return resolve();
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal?.addEventListener("abort", finish);
  });
}

// Gives up on a chunk after 3 rate-limit waits instead of retrying forever.
export async function runPhotoBatches(
  pairs: { itemId: number; file: File }[],
  opts: {
    upload?: typeof uploadItemPhotosBulk;
    onProgress: (p: Progress) => void;
    sleep?: (ms: number) => Promise<void>;
    signal?: AbortSignal;
    now?: () => number;
  },
): Promise<PairState[]> {
  const { upload = uploadItemPhotosBulk, onProgress, signal, now = Date.now } = opts;
  const sleep = opts.sleep ?? ((ms: number) => waitOrAbort(ms, signal));

  const states: PairState[] = pairs.map(({ itemId }) => ({ itemId, status: "pending" }));
  const totalBatches = Math.ceil(pairs.length / BATCH_SIZE);
  const report = (batch: number, waitingUntil: number | null) =>
    onProgress({ pairs: states.map((s) => ({ ...s })), batch, totalBatches, waitingUntil });

  // Strictly sequential: the server limits uploads per client, so parallel chunks would only trip it sooner.
  for (let batch = 0; batch < totalBatches && !signal?.aborted; batch++) {
    const start = batch * BATCH_SIZE;
    const chunk = pairs.slice(start, start + BATCH_SIZE);
    const rows = states.slice(start, start + BATCH_SIZE);
    for (const row of rows) row.status = "uploading";
    report(batch, null);

    try {
      let result: BulkPhotoResult | undefined;
      for (let retries = 0; !result; retries++) {
        try {
          result = await upload(chunk);
        } catch (err) {
          if (!(err instanceof ApiError) || err.status !== 429) throw err;
          if (retries === MAX_RETRIES) throw new Error("Batas server tercapai, coba ulang nanti");
          const ms = (err.retryAfter ?? DEFAULT_RETRY_SECONDS) * 1000;
          report(batch, now() + ms);
          await sleep(ms);
          if (signal?.aborted) {
            for (const row of rows) row.status = "pending";
            report(batch, null);
            return states;
          }
          report(batch, null);
        }
      }

      const uploaded = new Set(result.uploaded.map((u) => u.itemId));
      const failed = new Map(result.failed.map((f) => [f.itemId, REASON_TEXT[f.reason] ?? "Gagal mengunggah"]));
      for (const row of rows) {
        if (uploaded.has(row.itemId)) row.status = "done";
        else {
          row.status = "failed";
          row.reason = failed.get(row.itemId) ?? "Tidak ada respons";
        }
      }
    } catch (err) {
      const reason = err instanceof Error && err.message ? err.message : "Gagal mengunggah";
      for (const row of rows) {
        row.status = "failed";
        row.reason = reason;
      }
    }
    report(batch, null);
  }

  return states;
}
