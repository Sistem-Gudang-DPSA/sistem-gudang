import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { installFakeApi, paged } from "@/test/fake-api";
import SidebarNav from "@/domains/auth/components/SidebarNav";
import type { AuthUser } from "@/domains/auth/types";
import LogAktivitas from "./LogAktivitas";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const row = {
  id: 9,
  userId: 1,
  username: "superadmin",
  action: "UPDATE",
  tableName: "items",
  recordId: 42,
  oldValues: { name: "Baut M8" },
  newValues: { name: "Baut M10" },
  createdAt: "2026-11-14T02:00:00Z",
};

describe("Log Aktivitas (superadmin)", () => {
  it("lists entries and shows the before and after values", async () => {
    installFakeApi({
      "GET /api/v1/audit-logs": paged([row]),
      "GET /api/v1/audit-logs/tables": ["items", "suppliers"],
    });
    render(<LogAktivitas />);
    expect(await screen.findByText("superadmin")).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Ubah" })).toBeTruthy();
    expect(screen.queryByText(/Baut M8/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Detail" }));
    expect(screen.getByText(/Baut M8/)).toBeTruthy();
    expect(screen.getByText(/Baut M10/)).toBeTruthy();
  });

  it("sends the chosen filters to the API", async () => {
    const api = installFakeApi({
      "GET /api/v1/audit-logs": paged([row]),
      "GET /api/v1/audit-logs/tables": ["items", "suppliers"],
    });
    render(<LogAktivitas />);
    await screen.findByRole("option", { name: "suppliers" });

    fireEvent.change(screen.getByLabelText("Tabel"), { target: { value: "suppliers" } });
    fireEvent.change(screen.getByLabelText("Aksi"), { target: { value: "DELETE" } });
    fireEvent.change(screen.getByLabelText("Dari"), { target: { value: "2026-11-01" } });
    fireEvent.change(screen.getByLabelText("Sampai"), { target: { value: "2026-11-14" } });

    await waitFor(() => {
      const query = api.calls("GET /api/v1/audit-logs").at(-1)!.query;
      expect(query.get("tableName")).toBe("suppliers");
      expect(query.get("action")).toBe("DELETE");
      expect(query.get("startDate")).toBe("2026-11-01");
      expect(query.get("endDate")).toBe("2026-11-14");
    });
  });
});

describe("Log Aktivitas menu", () => {
  const user = (isSuperadmin: boolean) => ({ isSuperadmin, permissions: [] }) as unknown as AuthUser;

  it("is shown to the superadmin only", () => {
    const { unmount } = render(<SidebarNav user={user(true)} pathname="/dashboard" />);
    expect(screen.getByRole("link", { name: "Log Aktivitas" }).getAttribute("href")).toBe("/dashboard/superadmin/log-aktivitas");
    unmount();
    render(<SidebarNav user={user(false)} pathname="/dashboard" />);
    expect(screen.queryByRole("link", { name: "Log Aktivitas" })).toBeNull();
  });
});
