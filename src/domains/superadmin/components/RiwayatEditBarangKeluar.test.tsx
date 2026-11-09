import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { fail, installFakeApi, paged } from "@/test/fake-api";
import RiwayatEditBarangKeluar from "./RiwayatEditBarangKeluar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/superadmin/laporan/riwayat-edit-barang-keluar",
}));

const request = {
  id: 3,
  outboundId: 8,
  status: "USED",
  requestedBy: 1,
  requestedAt: "2026-11-09T01:00:00Z",
  reviewedBy: 2,
  reviewedAt: "2026-11-09T02:00:00Z",
  editedAt: "2026-11-09T03:00:00Z",
};
const before = {
  id: 8,
  noTransaksi: "OUT-000008",
  date: "2026-11-09",
  clientName: "PT Jaya",
  spk: "SPK-1",
  itemName: "Meja",
  warehouseType: "BAHAN_BAKU",
  recipientType: "PRODUKSI",
  notes: null,
  createdBy: 1,
  createdAt: "2026-11-09T00:00:00Z",
  lines: [
    { itemId: 1, itemCode: "BRG-1", itemName: "Triplex", locationCode: null, qty: 4, pic: "Andi" },
  ],
};
const row = { request, outbound: before, requestedByName: "Admin Gudang" };
const history = {
  ...request,
  requestedByName: "Admin Gudang",
  reviewedByName: "Superadmin",
  beforeValues: before,
  afterValues: { ...before, lines: [{ ...before.lines[0], qty: 7 }] },
};

describe("Superadmin warehouse edit history", () => {
  it("loads only saved edits and shows who edited and when", async () => {
    const api = installFakeApi({ "GET /api/v1/outbound/edit-requests": paged([row]) });
    render(<RiwayatEditBarangKeluar />);
    expect(await screen.findByText("OUT-000008")).toBeTruthy();
    expect(screen.getByText("Admin Gudang")).toBeTruthy();
    expect(screen.getByText(/10[.:]00[.:]00 WIB/)).toBeTruthy();
    const query = api.calls("GET /api/v1/outbound/edit-requests")[0].query;
    expect(query.get("status")).toBe("USED");
    expect(query.get("pageSize")).toBe("20");
    expect(screen.queryByRole("button", { name: /Setujui|Tolak/ })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Lihat Pengajuan Edit" }).getAttribute("href"),
    ).toContain("pengajuan-edit-barang-keluar");
  });

  it("shows exactly what the warehouse changed, with before/after values and reviewer", async () => {
    installFakeApi({
      "GET /api/v1/outbound/edit-requests": paged([row]),
      "GET /api/v1/outbound/8/edit-history": history,
    });
    render(<RiwayatEditBarangKeluar />);
    fireEvent.click(await screen.findByRole("button", { name: "Lihat perubahan barang keluar 8" }));
    const dialog = await screen.findByRole("dialog");
    const changes = await within(dialog).findByRole("table", {
      name: "Data yang diubah oleh gudang",
    });
    expect(within(changes).getAllByRole("row")).toHaveLength(2);
    expect(
      within(changes).getByRole("rowheader", { name: "Jumlah — Triplex (BRG-1)" }),
    ).toBeTruthy();
    expect(within(changes).getByRole("cell", { name: "4" })).toBeTruthy();
    expect(within(changes).getByRole("cell", { name: "7" })).toBeTruthy();
    expect(within(changes).queryByText("SPK")).toBeNull();
    expect(within(dialog).getByText(/Superadmin ·/)).toBeTruthy();
    expect(within(dialog).getByText("1 data diubah oleh gudang.")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Tutup riwayat edit" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("distinguishes a saved edit without value changes from missing historical snapshots", async () => {
    const api = installFakeApi({
      "GET /api/v1/outbound/edit-requests": paged([row]),
      "GET /api/v1/outbound/8/edit-history": { ...history, afterValues: before },
    });
    render(<RiwayatEditBarangKeluar />);
    fireEvent.click(await screen.findByRole("button", { name: "Lihat perubahan barang keluar 8" }));
    expect(await screen.findByText("Transaksi disimpan tanpa perubahan data.")).toBeTruthy();
    expect(api.calls("GET /api/v1/outbound/8/edit-history")).toHaveLength(1);
  });

  it("shows missing snapshot history without inventing edits", async () => {
    installFakeApi({
      "GET /api/v1/outbound/edit-requests": paged([row]),
      "GET /api/v1/outbound/8/edit-history": { ...history, beforeValues: null },
    });
    render(<RiwayatEditBarangKeluar />);
    fireEvent.click(await screen.findByRole("button", { name: "Lihat perubahan barang keluar 8" }));
    expect(
      await screen.findByText("Rincian perubahan belum tersedia untuk transaksi ini."),
    ).toBeTruthy();
    expect(screen.queryByRole("table", { name: "Data yang diubah oleh gudang" })).toBeNull();
  });

  it("paginates completed edits and resets the page when changing rows per page", async () => {
    const api = installFakeApi({
      "GET /api/v1/outbound/edit-requests": paged([row], { total: 121 }),
    });
    render(<RiwayatEditBarangKeluar />);
    await screen.findByText("OUT-000008");
    fireEvent.click(screen.getByRole("button", { name: "Selanjutnya" }));
    await waitFor(() =>
      expect(api.calls("GET /api/v1/outbound/edit-requests").at(-1)?.query.get("page")).toBe("2"),
    );
    expect(api.calls("GET /api/v1/outbound/edit-requests").at(-1)?.query.get("status")).toBe(
      "USED",
    );
    const select = screen.getByRole("combobox", { name: "Baris per halaman" });
    expect((select as HTMLSelectElement).value).toBe("20");
    expect(
      within(select)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["20", "50", "100"]);
    fireEvent.change(select, { target: { value: "50" } });
    await waitFor(() =>
      expect(api.calls("GET /api/v1/outbound/edit-requests").at(-1)?.query.get("pageSize")).toBe(
        "50",
      ),
    );
    expect(api.calls("GET /api/v1/outbound/edit-requests").at(-1)?.query.get("page")).toBe("1");
    expect(screen.getByRole("button", { name: "1" }).getAttribute("aria-current")).toBe("page");
    fireEvent.click(screen.getByRole("button", { name: "Selanjutnya" }));
    await waitFor(() =>
      expect(api.calls("GET /api/v1/outbound/edit-requests").at(-1)?.query.get("page")).toBe("2"),
    );
    expect(api.calls("GET /api/v1/outbound/edit-requests").at(-1)?.query.get("pageSize")).toBe(
      "50",
    );
    fireEvent.change(select, { target: { value: "100" } });
    await waitFor(() =>
      expect(api.calls("GET /api/v1/outbound/edit-requests").at(-1)?.query.get("pageSize")).toBe(
        "100",
      ),
    );
    expect(api.calls("GET /api/v1/outbound/edit-requests").at(-1)?.query.get("page")).toBe("1");
    expect(api.calls("GET /api/v1/outbound/edit-requests").at(-1)?.query.get("status")).toBe(
      "USED",
    );
  });

  it("explains an empty history", async () => {
    installFakeApi({ "GET /api/v1/outbound/edit-requests": paged([]) });
    render(<RiwayatEditBarangKeluar />);
    expect(
      await screen.findByText("Belum ada barang keluar yang diedit oleh gudang."),
    ).toBeTruthy();
  });

  it("allows retry when fetching history fails", async () => {
    let failed = true;
    const api = installFakeApi({
      "GET /api/v1/outbound/edit-requests": () =>
        failed ? fail(500, "Gagal memuat riwayat.") : paged([row]),
    });
    render(<RiwayatEditBarangKeluar />);
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Gagal memuat riwayat.");
    failed = false;
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(await screen.findByText("OUT-000008")).toBeTruthy();
    expect(api.calls("GET /api/v1/outbound/edit-requests")).toHaveLength(2);
  });
});
