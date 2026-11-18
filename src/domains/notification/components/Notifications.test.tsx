import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fail, installFakeApi, type FakeRequest } from "@/test/fake-api";
import Notifications from "./Notifications";

const router = { push: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/dashboard/notifications" }));
const note = (id: number) => ({
  id, type: id % 3 === 0 ? "LOW_STOCK" : id % 3 === 1 ? "BUG_REPORT_UPDATED" : "APPROVAL_APPROVED",
  sourceDomain: id % 3 === 0 ? "inventory" : "ppic",
  title: `Judul ${id}`, body: `Isi notifikasi ${id}`, link: "/dashboard/ppic/master/data-barang",
  readAt: id % 2 === 0 ? "2026-11-16T02:00:00Z" : null,
  createdAt: "2026-11-16T01:00:00Z",
});
let rows: ReturnType<typeof note>[];
beforeEach(() => {
  rows = Array.from({ length: 45 }, (_, i) => note(45 - i));
  router.push.mockReset();
});
function setup(extra: Record<string, unknown> = {}) {
  const api = installFakeApi({
    "GET /api/v1/notifications": (req: FakeRequest) => {
      const page = Number(req.query.get("page"));
      const pageSize = Number(req.query.get("pageSize"));
      const filtered = req.query.get("unreadOnly") === "true" ? rows.filter((row) => !row.readAt) : rows;
      return { rows: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize, unreadCount: rows.filter((row) => !row.readAt).length };
    },
    "POST /api/v1/notifications/read-all": () => {
      rows = rows.map((row) => ({ ...row, readAt: "2026-11-16T03:00:00Z" }));
      return { updated: rows.length };
    },
    "POST /api/v1/notifications/45/read": () => {
      rows = rows.map((row) => row.id === 45 ? { ...row, readAt: "2026-11-16T03:00:00Z" } : row);
      return rows.find((row) => row.id === 45);
    },
    ...extra,
  });
  render(<Notifications />);
  return api;
}

describe("Notifications page", () => {
  it("paginates all notifications and distinguishes types and source divisions", async () => {
    const api = setup();
    await screen.findByText("Judul 45");
    expect(screen.getByRole("heading", { name: "Notifications" })).toBeTruthy();
    expect(screen.queryByText("Judul 25")).toBeNull();
    expect(screen.getAllByText("Stok")[0].className).toContain("bg-amber-50");
    expect(screen.getAllByText("Laporan Masalah")[0].className).toContain("bg-rose-50");
    expect(screen.getAllByText("Persetujuan")[0].className).toContain("bg-teal-50");
    expect(screen.getAllByText("Gudang").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PPIC").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Selanjutnya" }));
    await screen.findByText("Judul 25");
    expect(api.calls("GET /api/v1/notifications").at(-1)?.query.get("page")).toBe("2");
  });

  it("resets to page one and requests the server's unread filter", async () => {
    const api = setup();
    await screen.findByText("Judul 45");
    fireEvent.click(screen.getByRole("button", { name: "Selanjutnya" }));
    await screen.findByText("Judul 25");
    fireEvent.click(screen.getByRole("button", { name: /^Belum dibaca/ }));
    await screen.findByText("Judul 45");
    expect(screen.queryByText("Judul 44")).toBeNull();
    const query = api.calls("GET /api/v1/notifications").at(-1)!.query;
    expect(query.get("unreadOnly")).toBe("true");
    expect(query.get("page")).toBe("1");
    fireEvent.click(screen.getByRole("button", { name: "Semua" }));
    await screen.findByText("Judul 44");
    expect(api.calls("GET /api/v1/notifications").at(-1)?.query.has("unreadOnly")).toBe(false);
  });

  it("marks a notification read before opening the division link", async () => {
    const api = setup();
    fireEvent.click(await screen.findByText("Judul 45"));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/dashboard/ppic/master/data-barang?itemId=45"));
    expect(api.calls("POST /api/v1/notifications/45/read")).toHaveLength(1);
  });

  it("marks all read and clears the unread filter results", async () => {
    const api = setup();
    await screen.findByText("Judul 45");
    fireEvent.click(screen.getByRole("button", { name: /^Belum dibaca/ }));
    await waitFor(() => expect(api.calls("GET /api/v1/notifications").at(-1)?.query.get("unreadOnly")).toBe("true"));
    await screen.findByText("Judul 45");
    fireEvent.click(screen.getByRole("button", { name: "Tandai semua dibaca" }));
    expect(await screen.findByText("Tidak ada notifikasi yang belum dibaca.")).toBeTruthy();
    expect(api.calls("POST /api/v1/notifications/read-all")).toHaveLength(1);
  });

  it("shows API failures", async () => {
    setup({ "GET /api/v1/notifications": fail(500, "Notifikasi tidak tersedia") });
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Notifikasi tidak tersedia");
  });

  it("keeps the notification visible and reports a failed read", async () => {
    setup({ "POST /api/v1/notifications/45/read": fail(500, "Gagal menandai dibaca") });
    fireEvent.click(await screen.findByText("Judul 45"));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Gagal menandai dibaca");
    expect(screen.getByText("Judul 45")).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("handles unknown notification types with an information label", async () => {
    rows = [{ ...note(1), type: "NEW_TYPE" }];
    setup();
    expect(await screen.findByText("Informasi")).toBeTruthy();
    expect(screen.getByText("Judul 1")).toBeTruthy();
  });
});
