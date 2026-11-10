import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeApi, type FakeRequest } from "@/test/fake-api";
import NotificationBell from "./NotificationBell";

const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const note = (id: number, over = {}) => ({
  id,
  type: "BUG_REPORT_UPDATED",
  title: `Judul ${id}`,
  body: `Isi ${id}`,
  link: `/dashboard/x/${id}`,
  readAt: null,
  createdAt: "2026-11-09T02:00:00Z",
  ...over,
});

let unread: number;
let rows: ReturnType<typeof note>[];

const setup = () =>
  installFakeApi({
    "GET /api/v1/notifications/unread-count": () => ({ count: unread }),
    "GET /api/v1/notifications": (req: FakeRequest) => {
      const pageSize = Number(req.query.get("pageSize"));
      return { rows: rows.slice(0, pageSize), total: rows.length, page: 1, pageSize, unreadCount: unread };
    },
    "POST /api/v1/notifications/1/read": note(1, { readAt: "2026-11-09T03:00:00Z" }),
    "POST /api/v1/notifications/3/read": note(3, { readAt: "2026-11-09T03:00:00Z" }),
    "POST /api/v1/notifications/read-all": { updated: 2 },
  });

beforeEach(() => {
  unread = 2;
  rows = [note(1), note(2, { readAt: "2026-11-09T03:00:00Z" })];
  router.push.mockClear();
});

describe("NotificationBell", () => {
  it("shows the unread count, capped at 9+", async () => {
    setup();
    render(<NotificationBell />);
    expect(await screen.findByText("2")).toBeTruthy();
  });

  it("shows 9+ when more than 9 are unread", async () => {
    unread = 12;
    setup();
    render(<NotificationBell />);
    expect(await screen.findByText("9+")).toBeTruthy();
  });

  it("lists rows; clicking an unread row marks it read and opens its link", async () => {
    const api = setup();
    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifikasi" }));
    fireEvent.click(await screen.findByText("Judul 1"));

    await waitFor(() => expect(api.calls("POST /api/v1/notifications/1/read")).toHaveLength(1));
    expect(router.push).toHaveBeenCalledWith("/dashboard/x/1");
    expect(screen.queryByText("Judul 1")).toBeNull();
  });

  it("marks all as read", async () => {
    const api = setup();
    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifikasi" }));
    fireEvent.click(await screen.findByRole("button", { name: "Tandai semua dibaca" }));

    await waitFor(() => expect(api.calls("POST /api/v1/notifications/read-all")).toHaveLength(1));
    await waitFor(() => expect(screen.queryByText("2")).toBeNull());
  });

  it("shows the empty state when there are no notifications", async () => {
    rows = [];
    unread = 0;
    setup();
    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifikasi" }));
    expect(await screen.findByText("Belum ada notifikasi")).toBeTruthy();
  });

  it("does not toast on the first load, but toasts the newest title when a later poll shows one more", async () => {
    const api = setup();
    render(<NotificationBell />);
    expect(await screen.findByText("2")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();

    unread = 3;
    rows = [note(3, { title: "Permintaan disetujui" }), ...rows];
    fireEvent(window, new Event("focus"));

    expect(await screen.findByRole("status")).toHaveProperty("textContent", "Permintaan disetujui");
    expect(api.calls("GET /api/v1/notifications")[0].query.get("pageSize")).toBe("1");
    fireEvent.click(screen.getByRole("button", { name: "Permintaan disetujui" }));
    expect(router.push).toHaveBeenCalledWith("/dashboard/x/3");
    // Opening a notification from the toast also marks it read
    await waitFor(() => expect(api.calls("POST /api/v1/notifications/3/read")).toHaveLength(1));
  });

  it("toasts the count when more than one notification arrived", async () => {
    setup();
    render(<NotificationBell />);
    expect(await screen.findByText("2")).toBeTruthy();

    unread = 5;
    fireEvent(window, new Event("focus"));
    expect(await screen.findByRole("status")).toHaveProperty("textContent", "3 notifikasi baru");
    // Several new ones: the toast opens the list instead of a single link
    fireEvent.click(screen.getByRole("button", { name: "3 notifikasi baru" }));
    expect(await screen.findByText("Tandai semua dibaca")).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
  });
});
