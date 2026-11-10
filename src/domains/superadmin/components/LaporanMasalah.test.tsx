import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { installFakeApi, paged } from "@/test/fake-api";
import LaporanMasalah from "./LaporanMasalah";

const row = {
  id: 3,
  description: "Tabel barang keluar kosong",
  pageUrl: "http://localhost/dashboard/gudang/transaksi/barang-keluar",
  userAgent: "Mozilla/5.0",
  screenshot: null,
  status: "OPEN",
  reporterName: "Admin Gudang",
  reporterRole: "Staf Gudang",
  handledByName: null,
  itNote: null,
  createdAt: "2026-11-09T02:00:00Z",
  updatedAt: "2026-11-09T02:00:00Z",
};

describe("Laporan Masalah (superadmin)", () => {
  it("lists open reports and marks one as done", async () => {
    const api = installFakeApi({
      "GET /api/v1/bug-reports": paged([row]),
      "PATCH /api/v1/bug-reports/3": { ...row, status: "SELESAI" },
    });
    render(<LaporanMasalah />);
    expect(await screen.findByText("Tabel barang keluar kosong")).toBeTruthy();
    expect(screen.getByText("Staf Gudang")).toBeTruthy();
    expect(api.calls("GET /api/v1/bug-reports")[0].query.get("status")).toBe("OPEN");

    fireEvent.click(screen.getByRole("button", { name: "Selesai" }));
    await waitFor(() =>
      expect(api.calls("PATCH /api/v1/bug-reports/3")[0]?.body).toEqual({ status: "SELESAI" }),
    );
    expect(api.calls("PATCH /api/v1/bug-reports/3")).toHaveLength(1);
  });

  it("saves the IT note typed in the textarea", async () => {
    const api = installFakeApi({
      "GET /api/v1/bug-reports": paged([{ ...row, itNote: "Catatan awal" }]),
      "PATCH /api/v1/bug-reports/3": { ...row, itNote: "Sudah dicek" },
    });
    render(<LaporanMasalah />);
    const note = (await screen.findByLabelText("Catatan IT laporan 3")) as HTMLTextAreaElement;
    expect(note.value).toBe("Catatan awal");

    fireEvent.change(note, { target: { value: "Sudah dicek" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan Catatan" }));
    await waitFor(() => expect(api.calls("PATCH /api/v1/bug-reports/3")[0]?.body).toEqual({ itNote: "Sudah dicek" }));
  });
});
