import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import LoginPage from "./page";

const { replaceMock, pushMock, refreshSessionMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  pushMock: vi.fn(),
  refreshSessionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
}));

vi.mock("@/domains/auth/api", () => ({
  refreshSession: refreshSessionMock,
  login: vi.fn(),
  dashboardPathFor: (user: { isSuperadmin: boolean; roleName: string }) =>
    user.isSuperadmin ? "/dashboard/superadmin" : `/dashboard/${user.roleName.toLowerCase()}`,
  safeNextPath: (next: string | null) => (next && next.startsWith("/dashboard") ? next : null),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    pushMock.mockReset();
    refreshSessionMock.mockReset();
  });

  it("redirects away without ever showing the login form when a session is already active", async () => {
    // Ini reproduksi bug yang dilaporkan: membuka tab baru saat sudah login
    // tidak boleh menampilkan form login lagi, karena login ulang merotasi
    // refresh token dan mencabut sesi yang sedang aktif di tab lain.
    refreshSessionMock.mockResolvedValue({ isSuperadmin: false, roleName: "gudang" });

    render(<LoginPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard/gudang"));
    expect(screen.queryByPlaceholderText("Email")).toBeNull();
  });

  it("sends an active session back to the page it was redirected from", async () => {
    window.history.pushState({}, "", "/?next=%2Fdashboard%2Fgudang%2Flaporan%2Fbarang-masuk");
    refreshSessionMock.mockResolvedValue({ isSuperadmin: false, roleName: "gudang" });

    render(<LoginPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard/gudang/laporan/barang-masuk"));
    window.history.pushState({}, "", "/");
  });

  it("shows the login form when there is no active session", async () => {
    refreshSessionMock.mockRejectedValue(new Error("no session"));

    render(<LoginPage />);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText("Email")).not.toBeNull();
    });
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
