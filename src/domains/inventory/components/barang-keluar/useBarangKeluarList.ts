import { useEffect, useState } from "react";
import { exportOutboundReport, listOutbound } from "@/domains/inventory/api";
import { toDateRange } from "@/domains/inventory/date";
import type { OutboundRow } from "@/domains/inventory/types";
import { useSort } from "@/shared/components/SortableTh";
import { ApiError } from "@/shared/lib/api-client";
import { useApiData } from "@/shared/lib/use-api-data";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { fetchAllPagesResult } from "@/shared/lib/fetch-all";
import { useSelection } from "@/shared/lib/use-selection";
import { cetakTransaksi } from "./cetak";

// Daftar transaksi: cari, filter tanggal, urut, pilihan baris, cetak, dan ekspor.
// Semua baris terfilter dimuat; visibleRows hanya mengatur tinggi area scroll.
export function useBarangKeluarList({ setActionError }: { setActionError: (message: string) => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery);
  const { sort, toggle, params: sortParams } = useSort();
  const [showFilter, setShowFilter] = useState(false);
  const [filterDay, setFilterDay] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const dateRange = toDateRange(filterDay, filterMonth, filterYear);

  const [visibleRows, setVisibleRows] = useState(20);
  const filterKey = JSON.stringify([debouncedSearch, filterDay, filterMonth, filterYear, sortParams]);
  const { data: result, loading, error, reload } = useApiData(
    () =>
      fetchAllPagesResult((page, pageSize) =>
        listOutbound({
          page,
          pageSize,
          search: debouncedSearch || undefined,
          ...dateRange,
          ...sortParams,
        }),
      ),
    `${filterKey}|all`,
    "Gagal memuat data barang keluar.",
  );
  const rows = result?.rows ?? [];
  const total = result?.total ?? 0;

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

  const selection = useSelection<OutboundRow>(filterKey);
  const allChecked = selection.allSelected(rows);
  const toggleSelected = selection.toggle;
  const toggleAllSelected = () => selection.toggleMany(rows);

  const [printing, setPrinting] = useState(false);
  const printSelected = async () => {
    if (printing) return;
    // Tanpa pilihan: cetak seluruh transaksi terfilter, bukan hanya yang tampak.
    const transactions = selection.size > 0 ? selection.rows : rows;
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
    visibleRows, setVisibleRows, rows, total, loading, error, reload,
    selectedCount: selection.size, isSelected: selection.isSelected, allChecked, toggleSelected, toggleAllSelected,
    printing, printSelected,
    downloading, downloadError, handleDownload,
  };
}
