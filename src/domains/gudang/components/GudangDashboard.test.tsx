import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { installFakeApi, paged } from "@/test/fake-api";
import { AuthUserProvider } from "@/domains/auth/user-context";
import { todayIso } from "../date";
import GudangDashboard from "./GudangDashboard";

afterEach(() => vi.unstubAllGlobals());

const inbound = { ...paged([
  { id: 1, date: "2026-10-01", createdAt: "2026-10-01T08:00:00Z", itemName: "Triplex", qtyArrived: 10, referenceNo: "PO-1" },
  { id: 2, date: "2026-09-29", createdAt: "2026-09-29T08:00:00Z", itemName: "Lem", qtyArrived: 4, referenceNo: null },
]), total: 7 };
const outbound = { ...paged([
  { id: 9, date: "2026-10-02", createdAt: "2026-10-02T08:00:00Z", itemName: "Paku", spk: "SPK-9", lines: [{ qty: 2 }, { qty: 3 }] },
]), total: 3 };

const routes = () => ({
  "GET /api/v1/items": { ...paged([]), total: 120 },
  "GET /api/v1/reports/inbound": inbound,
  "GET /api/v1/reports/outbound": outbound,
  "GET /api/v1/reports/requests": { ...paged([]), total: 11 },
});

describe("GudangDashboard", () => {
  it("shows API numbers, today's date and merged movements newest first", async () => {
    const api = installFakeApi(routes());
    render(<GudangDashboard />);
    expect(await screen.findByText("120")).toBeTruthy();
    expect(screen.getByText("Dashboard Gudang")).toBeTruthy();
    expect(await screen.findByText("Paku")).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.getByText("11")).toBeTruthy();
    const todayCall = api.calls("GET /api/v1/reports/inbound").find((c) => c.query.get("pageSize") === "1")!;
    expect(todayCall.query.get("startDate")).toBe(todayIso());
    expect(todayCall.query.get("endDate")).toBe(todayIso());
    expect(api.calls("GET /api/v1/reports/requests")[0].query.get("status")).toBe("PENDING");
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((r) => within(r).getAllByRole("cell")[2].textContent)).toEqual(["Paku", "Triplex", "Lem"]);
    expect(within(rows[0]).getByText("5")).toBeTruthy();
    expect(within(rows[0]).getByText("Keluar")).toBeTruthy();
  });

  it("shows empty state", async () => {
    installFakeApi({ ...routes(), "GET /api/v1/reports/inbound": paged([]), "GET /api/v1/reports/outbound": paged([]) });
    render(<GudangDashboard />);
    expect(await screen.findByText("Belum ada pergerakan barang.")).toBeTruthy();
  });

  it("a failing endpoint shows its error while other cards render", async () => {
    const { fail } = await import("@/test/fake-api");
    installFakeApi({ ...routes(), "GET /api/v1/items": fail(500, "Item rusak") });
    render(<GudangDashboard />);
    expect(await screen.findByText("Item rusak")).toBeTruthy();
    expect(await screen.findByText("11")).toBeTruthy();
  });

  it("does not request report data without report.view", async () => {
    const api = installFakeApi(routes());
    const user = { id: 1, username: "u", email: "u@x", roleId: 2, roleName: "R", isSuperadmin: false, permissions: ["item.view"] };
    render(<AuthUserProvider user={user}><GudangDashboard /></AuthUserProvider>);
    expect(await screen.findByText("120")).toBeTruthy();
    expect(api.calls("GET /api/v1/reports/inbound")).toHaveLength(0);
    expect(api.calls("GET /api/v1/reports/outbound")).toHaveLength(0);
    expect(api.calls("GET /api/v1/reports/requests")).toHaveLength(0);
    expect(screen.queryByText("Pergerakan Terakhir")).toBeNull();
  });
});
