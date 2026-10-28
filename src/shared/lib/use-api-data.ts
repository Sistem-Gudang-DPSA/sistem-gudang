import { useEffect, useRef, useState } from "react";
import { ApiError } from "./api-client";

const cache = new Map<string, { at: number; promise: Promise<unknown> }>();

// Drops cached entries whose key starts with `prefix` (all when omitted). Call after mutations.
export function invalidateApiData(prefix = "") {
  for (const k of [...cache.keys()]) if (k.startsWith(prefix)) cache.delete(k);
}

// Runs `fetcher` whenever `key` changes (or reload() is called). `loading` is derived
// from the key of the last settled response, so no setState happens inside the effect body.
export function useApiData<T>(fetcher: () => Promise<T>, key: string, errorMessage = "Gagal memuat data.", cacheTtlMs = 0) {
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState<{ key: string; data?: T; error?: string }>({ key: "" });
  const fetcherRef = useRef(fetcher);
  const fullKey = `${key}#${nonce}`;

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let cancelled = false;
    let promise: Promise<T>;
    const hit = cacheTtlMs > 0 ? cache.get(key) : undefined;
    if (hit && Date.now() - hit.at < cacheTtlMs && nonce === 0) promise = hit.promise as Promise<T>;
    else {
      promise = fetcherRef.current();
      if (cacheTtlMs > 0) {
        const entry = { at: Date.now(), promise };
        cache.set(key, entry);
        promise.catch(() => cache.get(key) === entry && cache.delete(key));
      }
    }
    promise
      .then((data) => !cancelled && setSettled({ key: fullKey, data }))
      .catch((err) =>
        !cancelled && setSettled({ key: fullKey, error: err instanceof ApiError ? err.message : errorMessage }),
      );
    return () => {
      cancelled = true;
    };
  }, [fullKey, errorMessage, key, nonce, cacheTtlMs]);

  const loading = settled.key !== fullKey;
  return {
    data: settled.data,
    loading,
    error: loading ? "" : settled.error ?? "",
    reload: () => setNonce((n) => n + 1),
  };
}
