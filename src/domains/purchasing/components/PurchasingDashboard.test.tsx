import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { installFakeApi, paged, fail, type FakeRequest } from "@/test/fake-api";
import { withUser } from "@/test/as-user";
import PurchasingDashboard from "./PurchasingDashboard";

const approval = (id: number, currentStepOrder: number, status = "pending") => ({
  id, type: "purchase-request", currentStepOrder, status, createdAt: "2026-11-24T00:00:00Z",
  payload: { bagian: `Bagian ${id}`, tanggalPengajuan: "2026-11-23" },
});

function setup(rows: ReturnType<typeof approval>[], permissions = ["purchase-order.create"], listError = false) {
  const api = installFakeApi({
    "GET /api/v1/approvals": (req: FakeRequest) => {
      const pageSize = Number(req.query.get("pageSize"));
      const page = Number(req.query.get("page") ?? 1);
      if (pageSize === 100 && listError) return fail(500, "Gagal membaca daftar permintaan");
      const filtered = rows.filter((row) => row.status === req.query.get("status"));
      return paged(filtered.slice((page - 1) * pageSize, page * pageSize), { total: filtered.length, page, pageSize });
    },
    "GET /api/v1/purchase-orders": paged([]),
  });
  render(withUser(<PurchasingDashboard />, permissions));
  return api;
}

const section = () => screen.getByRole("heading", { name: "Perlu Tindakan" }).parentElement!.parentElement!;

describe("Dashboard Purchasing: Perlu Tindakan", () => {
  it("hanya menampilkan permintaan yang sudah disetujui PPIC dan menunggu Purchasing", async () => {
    setup([approval(1, 1), approval(2, 2), approval(3, 3), approval(4, 3, "approved"), approval(5, 3, "rejected")]);
    expect(await screen.findByText("Bagian 3")).toBeTruthy();
    expect(screen.getByText("Siap Diproses")).toBeTruthy();
    expect(screen.queryByText("Menunggu Persetujuan")).toBeNull();
    for (const id of [1, 2, 4, 5]) expect(within(section()).queryByText(`Bagian ${id}`)).toBeNull();
    expect(within(section()).getByRole("link", { name: "Tinjau" }).getAttribute("href")).toBe("/dashboard/purchasing/laporan/rekap-pembelian/permintaan-pembelian/3");
  });

  it("membaca halaman berikutnya sebelum membatasi daftar menjadi lima permintaan Purchasing", async () => {
    const rows = [
      ...Array.from({ length: 100 }, (_, i) => approval(i + 1, 2)),
      ...Array.from({ length: 7 }, (_, i) => approval(i + 101, 3)),
    ];
    const api = setup(rows);
    await screen.findByText("Bagian 101");
    expect(within(section()).getAllByRole("link", { name: "Tinjau" })).toHaveLength(5);
    expect(within(section()).getByText("Bagian 105")).toBeTruthy();
    expect(within(section()).queryByText("Bagian 106")).toBeNull();
    const calls = api.calls("GET /api/v1/approvals").filter((req) => req.query.get("pageSize") === "100");
    expect(calls.map((req) => req.query.get("page"))).toEqual(["1", "2"]);
    expect(calls.every((req) => req.query.get("type") === "purchase-request" && req.query.get("status") === "pending")).toBe(true);
  });

  it("menampilkan keadaan kosong jika semua permintaan masih menunggu PPIC", async () => {
    setup([approval(1, 2)]);
    expect(await screen.findByText("Tidak ada permintaan pembelian yang sudah disetujui PPIC dan siap diproses Purchasing.")).toBeTruthy();
    expect(within(section()).queryByRole("link", { name: "Tinjau" })).toBeNull();
  });

  it("menampilkan kegagalan pemuatan tanpa menyatakan daftar kosong", async () => {
    setup([], undefined, true);
    expect(await within(section()).findByRole("alert")).toHaveProperty("textContent", "Gagal membaca daftar permintaan");
    expect(within(section()).queryByText(/Tidak ada permintaan/)).toBeNull();
  });

  it("tidak menampilkan daftar tindakan tanpa permission membuat PO", async () => {
    const api = setup([], ["purchase-order.view"]);
    await screen.findByText("Belum ada purchase order.");
    expect(screen.queryByRole("heading", { name: "Perlu Tindakan" })).toBeNull();
    expect(api.calls("GET /api/v1/approvals")).toHaveLength(0);
  });
});
