import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { fail, installFakeApi, paged } from "@/test/fake-api";
import PengajuanEditBarangKeluar from "./PengajuanEditBarangKeluar";

const row = {
  request: {
    id: 3,
    outboundId: 8,
    status: "PENDING",
    requestedBy: 1,
    requestedAt: "2026-11-09T02:00:00Z",
    reviewedBy: null,
    reviewedAt: null,
    editedAt: null,
  },
  outbound: {
    id: 8,
    noTransaksi: "OUT-000008",
    clientName: "PT Jaya",
    spk: "SPK-1",
    itemName: "Meja",
  },
  requestedByName: "Admin Gudang",
};

describe("Pengajuan Edit Barang Keluar", () => {
  it("lists pending requests and approves once without changing warehouse data", async () => {
    const api = installFakeApi({
      "GET /api/v1/outbound/edit-requests": paged([row]),
      "POST /api/v1/outbound/8/edit-request/approve": {},
    });
    render(<PengajuanEditBarangKeluar />);
    expect(await screen.findByText("OUT-000008")).toBeTruthy();
    expect(screen.getByText("Admin Gudang")).toBeTruthy();
    expect(api.calls("GET /api/v1/outbound/edit-requests")[0].query.get("status")).toBe("PENDING");
    const approve = screen.getByRole("button", { name: "Setujui edit barang keluar 8" });
    fireEvent.click(approve);
    fireEvent.click(approve);
    expect(await screen.findByRole("status")).toHaveProperty(
      "textContent",
      "Pengajuan disetujui. Admin pengaju dapat mengedit transaksi satu kali.",
    );
    expect(api.calls("POST /api/v1/outbound/8/edit-request/approve")).toHaveLength(1);
    expect(api.calls("PUT /api/v1/outbound/8")).toHaveLength(0);
  });

  it("rejects a request and exposes the server error on a review conflict", async () => {
    const api = installFakeApi({
      "GET /api/v1/outbound/edit-requests": paged([row]),
      "POST /api/v1/outbound/8/edit-request/reject": fail(409, "Pengajuan sudah ditinjau."),
    });
    render(<PengajuanEditBarangKeluar />);
    fireEvent.click(await screen.findByRole("button", { name: "Tolak edit barang keluar 8" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Pengajuan sudah ditinjau.",
    );
    expect(api.calls("POST /api/v1/outbound/8/edit-request/reject")).toHaveLength(1);
  });

  it("filters reviewed requests and hides approval actions after review", async () => {
    const api = installFakeApi({
      "GET /api/v1/outbound/edit-requests": paged([
        { ...row, request: { ...row.request, status: "USED" } },
      ]),
    });
    render(<PengajuanEditBarangKeluar />);
    await screen.findByText("OUT-000008");
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "USED" } });
    await waitFor(() =>
      expect(api.calls("GET /api/v1/outbound/edit-requests").at(-1)?.query.get("status")).toBe(
        "USED",
      ),
    );
    expect(screen.queryByRole("button", { name: "Setujui edit barang keluar 8" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Tolak edit barang keluar 8" })).toBeNull();
  });
});
