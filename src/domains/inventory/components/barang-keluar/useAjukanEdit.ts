import { useRef, useState } from "react";
import { requestOutboundEdit } from "@/domains/inventory/api";
import type { OutboundRow } from "@/domains/inventory/types";

// Mengajukan edit ke superadmin; satu pengajuan pada satu waktu.
export function useAjukanEdit({
  reload,
  setActionError,
  onUpdated,
}: {
  reload: () => void;
  setActionError: (message: string) => void;
  onUpdated: (trx: OutboundRow) => void;
}) {
  const [requesting, setRequesting] = useState<number | null>(null);
  const requestingRef = useRef(false);

  const ajukanEdit = async (trx: OutboundRow) => {
    if (requestingRef.current) return;
    requestingRef.current = true;
    setRequesting(trx.id);
    setActionError("");
    try {
      onUpdated(await requestOutboundEdit(trx.id));
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal mengajukan edit.");
    } finally {
      requestingRef.current = false;
      setRequesting(null);
    }
  };

  return { requesting, ajukanEdit };
}
