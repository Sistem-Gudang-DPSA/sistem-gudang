import { useEffect, useState } from "react";

// Page number that falls back to 1 whenever `resetKey` (search/filter/sort) changes.
export function usePage(resetKey: string) {
  const [state, setState] = useState({ key: resetKey, page: 1 });
  const page = state.key === resetKey ? state.page : 1;
  return [page, (next: number) => setState({ key: resetKey, page: next })] as const;
}

// Steps back to the last page when the current one vanished (e.g. its last row was deleted).
export function useClampPage(page: number, total: number, pageSize: number, setPage: (page: number) => void) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    if (total > 0 && page > lastPage) setPage(lastPage);
  });
}
