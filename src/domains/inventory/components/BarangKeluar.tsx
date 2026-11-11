"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useAuthUser, useCan } from "@/domains/auth/user-context";
import type { OutboundRow } from "@/domains/inventory/types";
import { useItemSearch } from "@/domains/inventory/use-item-search";
import Pagination from "@/shared/components/Pagination";
import RiwayatEditBarangKeluar from "./RiwayatEditBarangKeluar";
import BarangKeluarTable from "./barang-keluar/BarangKeluarTable";
import BarangKeluarToolbar from "./barang-keluar/BarangKeluarToolbar";
import EditBarangKeluarModal from "./barang-keluar/modals/EditBarangKeluarModal";
import FormBarangKeluarModal from "./barang-keluar/modals/FormBarangKeluarModal";
import PeringatanEditModal from "./barang-keluar/modals/PeringatanEditModal";
import PreviewBarangKeluarModal from "./barang-keluar/modals/PreviewBarangKeluarModal";
import RincianTrxModal from "./barang-keluar/modals/RincianTrxModal";
import { useAjukanEdit } from "./barang-keluar/useAjukanEdit";
import { PAGE_SIZE, useBarangKeluarList } from "./barang-keluar/useBarangKeluarList";
import { useEditBarangKeluar } from "./barang-keluar/useEditBarangKeluar";
import { useFormBarangKeluar } from "./barang-keluar/useFormBarangKeluar";

export default function BarangKeluarGudang() {
  const canCreate = useCan("outbound.create");
  const canUpdate = useCan("outbound.update");
  const canExport = useCan("report.view");
  const userId = useAuthUser()?.id;
  // Pesan error di luar modal (mis. dialog cetak gagal dibuka setelah data tersimpan)
  const [actionError, setActionError] = useState("");
  const [historyId, setHistoryId] = useState<number | null>(null);
  // Transaksi yang rinciannya tampil di pop-up
  const [detailTrx, setDetailTrx] = useState<OutboundRow | null>(null);

  const list = useBarangKeluarList({ setActionError });
  // Satu pencarian barang dipakai bersama form tambah dan form edit.
  const itemSearch = useItemSearch();
  const form = useFormBarangKeluar({ itemSearch, reload: list.reload, setActionError });
  const edit = useEditBarangKeluar({ userId, itemSearch, reload: list.reload, setActionError });
  const { requesting, ajukanEdit } = useAjukanEdit({
    reload: list.reload,
    setActionError,
    onUpdated: (updated) => setDetailTrx((current) => (current?.id === updated.id ? updated : current)),
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {historyId !== null && <RiwayatEditBarangKeluar id={historyId} onClose={() => setHistoryId(null)} />}
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-[18px] font-extrabold text-black tracking-wide uppercase">
          Data Barang Keluar
        </h1>
      </div>

      <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Untuk mengedit barang keluar, ajukan edit ke superadmin maksimal 24 jam sejak transaksi dicatat.
        Setelah disetujui, transaksi hanya dapat diedit satu kali. Semua perubahan tersimpan dalam riwayat edit.
      </p>

      {actionError && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-3 p-3 bg-red-50 text-red-600 text-sm rounded-lg"
        >
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError("")} aria-label="Tutup pesan aksi">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {list.downloadError && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {list.downloadError}
        </p>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <BarangKeluarToolbar
          searchQuery={list.searchQuery}
          onSearch={list.setSearchQuery}
          printing={list.printing}
          printDisabled={list.printing || (list.selected.size === 0 && (list.loading || !!list.error || list.rows.length === 0))}
          onPrint={list.printSelected}
          canCreate={canCreate}
          onOpenForm={form.open}
          canExport={canExport}
          downloading={list.downloading}
          exportDisabled={list.downloading || list.total === 0}
          onExport={list.handleDownload}
          showFilter={list.showFilter}
          onToggleFilter={() => list.setShowFilter((v) => !v)}
          day={list.filterDay}
          month={list.filterMonth}
          year={list.filterYear}
          onDayChange={list.setFilterDay}
          onMonthChange={list.setFilterMonth}
          onYearChange={list.setFilterYear}
          onResetFilter={list.resetDateFilter}
        />

        <BarangKeluarTable
          rows={list.rows}
          page={list.page}
          pageSize={PAGE_SIZE}
          loading={list.loading}
          error={list.error}
          sort={list.sort}
          onSort={list.toggle}
          selected={list.selected}
          allChecked={list.allChecked}
          onToggle={list.toggleSelected}
          onToggleAll={list.toggleAllSelected}
          canUpdate={canUpdate}
          userId={userId}
          requesting={requesting}
          onRincian={setDetailTrx}
          onEdit={edit.open}
          onAjukan={ajukanEdit}
          onRiwayat={setHistoryId}
        />

        {form.previewOpen && (
          <PreviewBarangKeluarModal
            form={form.form}
            mode={form.modeKeluar}
            saving={form.saving}
            cetak={form.previewCetak}
            error={form.modalError}
            onBack={() => form.setPreviewOpen(false)}
            onConfirm={form.konfirmasiSimpan}
          />
        )}

        <Pagination page={list.page} pageSize={PAGE_SIZE} total={list.total} onPageChange={list.setPage} />
      </div>

      {form.isOpen && <FormBarangKeluarModal f={form} itemSearch={itemSearch} />}
      <EditBarangKeluarModal edit={edit} itemSearch={itemSearch} />
      {detailTrx && (
        <RincianTrxModal
          trx={detailTrx}
          canUpdate={canUpdate}
          userId={userId}
          requesting={requesting}
          onClose={() => setDetailTrx(null)}
          onCancelled={(updated) => {
            setDetailTrx(updated);
            list.reload();
          }}
          onEdit={edit.open}
          onAjukan={ajukanEdit}
          onRiwayat={setHistoryId}
        />
      )}
      {edit.peringatan && <PeringatanEditModal pesan={edit.peringatan} onClose={() => edit.setPeringatan("")} />}
    </div>
  );
}
