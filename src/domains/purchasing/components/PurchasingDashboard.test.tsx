import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import PurchasingDashboard from "./PurchasingDashboard";
import { AuthUserProvider } from "@/domains/auth/user-context";
import { installFakeApi, paged } from "@/test/fake-api";
import type { AuthUser } from "@/domains/auth/types";

afterEach(() => vi.unstubAllGlobals());

const approval = (id: number, bagian = "Produksi") => ({
  id, type: "purchase-request", status: "pending", createdAt: "2026-10-01T00:00:00Z",
  payload: { bagian, tanggalPengajuan: "2026-10-01", items: [] },
});
const po = (id: number, approvalRequestId: number) => ({
  id, nomorPo: `PO-${id}`, approvalRequestId, tanggalPo: "2026-10-01", supplierName: `Supplier ${id}`, grandTotal: 1500000,
});
const card = (label: string) => screen.getByText(label).closest("div")!.parentElement!;

const routes = (over: Record<string, unknown> = {}) => ({
  "GET /api/v1/approvals": (req: { query: URLSearchParams }) =>
    req.query.get("hasPurchaseOrder") === "false"
      ? paged([], { total: 2 })
      : req.query.get("status") === "approved"
        ? paged([approval(1), approval(2), approval(3)])
        : paged([approval(7, "Gudang")], { total: 9 }),
  "GET /api/v1/purchase-orders": (req: { query: URLSearchParams }) =>
    req.query.get("startDate") ? paged([], { total: 4 }) : paged([po(10, 2)]),
  "GET /api/v1/suppliers": paged([], { total: 33 }),
  ...over,
});

const user = (permissions: string[]): AuthUser =>
  ({ id: 1, username: "u", email: "u@x", roleId: 1, roleName: "r", isSuperadmin: false, permissions }) as AuthUser;

describe("PurchasingDashboard", () => {
  it("shows numbers from the API and reads the approved-without-PO count from the backend", async () => {
    const api = installFakeApi(routes());
    render(<PurchasingDashboard />);
    expect(screen.getByText("Dashboard Purchasing")).toBeTruthy();
    expect(await within(card("Menunggu Persetujuan")).findByText("9")).toBeTruthy();
    expect(await within(card("Disetujui, Belum Dibuat PO")).findByText("2")).toBeTruthy();
    const q = api.calls("GET /api/v1/approvals").map((c) => c.query).find((x) => x.get("hasPurchaseOrder"))!;
    expect([q.get("type"), q.get("status"), q.get("hasPurchaseOrder"), q.get("pageSize")]).toEqual(["purchase-request", "approved", "false", "1"]);
    expect(await within(card("PO Bulan Ini")).findByText("4")).toBeTruthy();
    expect(await within(card("Total Supplier")).findByText("33")).toBeTruthy();
  });

  it("queries purchase orders for the current month", async () => {
    const api = installFakeApi(routes());
    render(<PurchasingDashboard />);
    await screen.findByText("PO-10");
    const q = api.calls("GET /api/v1/purchase-orders").map((c) => c.query).find((x) => x.get("startDate"))!;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    expect(q.get("startDate")).toBe(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`);
    expect(q.get("endDate")).toBe(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
  });

  it("lists latest POs and pending requests with a detail link", async () => {
    installFakeApi(routes());
    render(<PurchasingDashboard />);
    expect(await screen.findByText("PO-10")).toBeTruthy();
    expect(screen.getByText("Supplier 10")).toBeTruthy();
    expect(screen.getByText("Rp. 1.500.000")).toBeTruthy();
    expect(screen.getByText("Gudang")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Tinjau" }).getAttribute("href")).toBe("/dashboard/purchasing/laporan/rekap-pembelian/permintaan-pembelian/7");
  });

  it("shows empty states", async () => {
    installFakeApi(routes({ "GET /api/v1/approvals": paged([]), "GET /api/v1/purchase-orders": paged([]) }));
    render(<PurchasingDashboard />);
    expect(await screen.findByText("Belum ada purchase order.")).toBeTruthy();
    expect(await screen.findByText("Tidak ada permintaan pembelian yang menunggu.")).toBeTruthy();
  });

  it("a failing endpoint shows its error while other cards still render", async () => {
    installFakeApi(routes({ "GET /api/v1/suppliers": { __fail: true, status: 500, message: "Supplier rusak" } }));
    render(<PurchasingDashboard />);
    expect(await within(card("Total Supplier")).findByText("Supplier rusak")).toBeTruthy();
    expect(await within(card("PO Bulan Ini")).findByText("4")).toBeTruthy();
  });

  it("renders only what the user's permissions allow", async () => {
    installFakeApi(routes());
    render(<AuthUserProvider user={user(["supplier.view"])}><PurchasingDashboard /></AuthUserProvider>);
    expect(await within(card("Total Supplier")).findByText("33")).toBeTruthy();
    expect(screen.queryByText("Menunggu Persetujuan")).toBeNull();
    expect(screen.queryByText("PO Bulan Ini")).toBeNull();
    expect(screen.queryByText("PO Terbaru")).toBeNull();
    expect(screen.queryByText("Perlu Tindakan")).toBeNull();
  });
});
