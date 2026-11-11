import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeApi, paged } from "@/test/fake-api";
import LaporanMasalahSaya from "./LaporanMasalahSaya";

const report = {
  id: 1,
  description: "Tombol tidak jalan",
  pageUrl: "http://localhost/dashboard",
  userAgent: "test",
  screenshot: null,
  status: "OPEN",
  reporterName: "Admin",
  reporterRole: "Admin Gudang",
  handledByName: null,
  itNote: null,
  createdAt: "2026-11-09T02:00:00Z",
  updatedAt: "2026-11-09T02:00:00Z",
};

describe("Laporan Masalah Saya page", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
  });

  it("lists my reports with status and IT note", async () => {
    const api = installFakeApi({
      "GET /api/v1/bug-reports/mine": paged([{ ...report, status: "SELESAI", itNote: "Sudah diperbaiki, coba lagi" }]),
    });
    render(<LaporanMasalahSaya />);
    expect(await screen.findByText("Tombol tidak jalan")).toBeTruthy();
    expect(screen.getByText("Selesai")).toBeTruthy();
    expect(screen.getByText("Sudah diperbaiki, coba lagi")).toBeTruthy();
    expect(api.calls("GET /api/v1/bug-reports/mine")[0].query.get("pageSize")).toBe("20");
  });

  it("shows the empty state", async () => {
    installFakeApi({ "GET /api/v1/bug-reports/mine": paged([]) });
    render(<LaporanMasalahSaya />);
    expect(await screen.findByText("Belum ada laporan")).toBeTruthy();
  });

  it("submits from the modal and refreshes the list", async () => {
    const api = installFakeApi({
      "GET /api/v1/bug-reports/mine": paged([]),
      "POST /api/v1/bug-reports": report,
    });
    render(<LaporanMasalahSaya />);
    await screen.findByText("Belum ada laporan");
    fireEvent.click(screen.getByRole("button", { name: "Lapor Masalah" }));
    fireEvent.change(screen.getByLabelText("Deskripsi"), { target: { value: "Tombol tidak jalan" } });
    fireEvent.click(screen.getByRole("button", { name: "Kirim Laporan" }));

    expect(await screen.findByText("Laporan terkirim. Terima kasih.")).toBeTruthy();
    await waitFor(() => expect(api.calls("GET /api/v1/bug-reports/mine")).toHaveLength(2));
    expect(api.calls("POST /api/v1/bug-reports")).toHaveLength(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
