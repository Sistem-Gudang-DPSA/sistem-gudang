import { useEffect, useRef, useState } from "react";
import { ApiError } from "./api-client";

// Runs `fetcher` whenever `key` changes (or reload() is called). `loading` is derived
// from the key of the last settled response, so no setState happens inside the effect body.
export function useApiData<T>(fetcher: () => Promise<T>, key: string, errorMessage = "Gagal memuat data.") {
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState<{ key: string; data?: T; error?: string }>({ key: "" });
  const fetcherRef = useRef(fetcher);
  const fullKey = `${key}#${nonce}`;

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let cancelled = false;
    fetcherRef
      .current()
      .then((data) => !cancelled && setSettled({ key: fullKey, data }))
      .catch((err) =>
        !cancelled && setSettled({ key: fullKey, error: err instanceof ApiError ? err.message : errorMessage }),
      );
    return () => {
      cancelled = true;
    };
  }, [fullKey, errorMessage]);

  const loading = settled.key !== fullKey;
  return {
    data: settled.data,
    loading,
    error: loading ? "" : settled.error ?? "",
    reload: () => setNonce((n) => n + 1),
  };
}
