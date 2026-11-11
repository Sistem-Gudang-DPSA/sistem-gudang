import { useEffect, useState } from "react";
import { exportOutboundReport, listOutbound } from "@/domains/inventory/api";
import { toDateRange } from "@/domains/inventory/date";
import type { OutboundRow } from "@/domains/inventory/types";
import { useSort } from "@/shared/components/SortableTh";
import { ApiError } from "@/shared/lib/api-client";
import { useApiData } from "@/shared/lib/use-api-data";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { useClampPage, usePage } from "@/shared/lib/use-page";
import { cetakTransaksi } from "./cetak";

export const PAGE_SIZE = 20;

// Daftar transaksi: cari, filter tanggal, urut, halaman, pilihan baris, cetak, dan ekspor.
export function useBarangKeluarList({ setActionError }: { setActionError: (message: string) => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery);
  const { sort, toggle, params: sortParams } = useSort();
  const [showFilter, setShowFilter] = useState(false);
  const [filterDay, setFilterDay] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const dateRange = toDateRange(filterDay, filterMonth, filterYear);

  const filterKey = JSON.stringify([debouncedSearch, filterDay, filterMonth, filterYear, sortParams]);
  const [page, setPage] = usePage(filterKey);
  const { data: result, loading, error, reload } = useApiData(
    () =>
      listOutbound({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        ...dateRange,
        ...sortParams,
      }),
    `${filterKey}|${page}`,
    "Gagal memuat data barang keluar.",
  );
  const rows = result?.rows ?? [];
  const total = result?.total ?? 0;
  useClampPage(page, total, PAGE_SIZE, setPage);

  // Persetujuan superadmin masuk saat tab kembali aktif, atau lewat polling selama ada pengajuan menunggu.
  const hasPendingEdit = rows.some((row) => row.editRequest?.status === "PENDING");
  useEffect(() => {
    const refresh = () => reload();
    window.addEventListener("focus", refresh);
    const timer = hasPendingEdit ? setInterval(refresh, 15_000) : undefined;
    return () => {
      window.removeEventListener("focus", refresh);
      if (timer) clearInterval(timer);
    };
  }, [hasPendingEdit, reload]);

  const [selected, setSelected] = useState<Map<number, OutboundRow>>(new Map());
  const allChecked = rows.length > 0 && rows.every((trx) => selected.has(trx.id));
  const toggleSelected = (trx: OutboundRow) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(trx.id)) next.delete(trx.id);
      else next.set(trx.id, trx);
      return next;
    });
  const toggleAllSelected = () =>
    setSelected((prev) => {
      const next = new Map(prev);
      rows.forEach((trx) => (allChecked ? next.delete(trx.id) : next.set(trx.id, trx)));
      return next;
    });

  const [printing, setPrinting] = useState(false);
  const printSelected = async () => {
    if (printing) return;
    const transactions =
      selected.size > 0
        ? [...selected.values()].map((trx) => rows.find((row) => row.id === trx.id) ?? trx)
        : rows;
    if (transactions.length === 0) return;
    setPrinting(true);
    setActionError("");
    try {
      await cetakTransaksi(transactions);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal menyiapkan dokumen cetak.");
    } finally {
      setPrinting(false);
    }
  };

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError("");
    try {
      await exportOutboundReport({ q: searchQuery || undefined, ...dateRange });
    } catch (err) {
      setDownloadError(err instanceof ApiError ? err.message : "Gagal mengunduh data barang keluar.");
    } finally {
      setDownloading(false);
    }
  };

  const resetDateFilter = () => {
    setFilterDay("");
    setFilterMonth("");
    setFilterYear("");
  };

  return {
    searchQuery, setSearchQuery,
    sort, toggle,
    showFilter, setShowFilter,
    filterDay, setFilterDay, filterMonth, setFilterMonth, filterYear, setFilterYear, resetDateFilter,
    page, setPage, rows, total, loading, error, reload,
    selected, allChecked, toggleSelected, toggleAllSelected,
    printing, printSelected,
    downloading, downloadError, handleDownload,
  };
}
