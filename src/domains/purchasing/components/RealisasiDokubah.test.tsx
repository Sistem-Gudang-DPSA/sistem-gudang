import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PurchasingReport from "@/app/dashboard/purchasing/laporan/realisasi-dokubah/page";
import GudangReport from "@/domains/inventory/components/DashboardRealisasiSpk";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  exportRealisasiExcel: vi.fn(),
  printRealisasiPdf: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }), usePathname: () => "/dashboard/purchasing/laporan/realisasi-dokubah" }));
vi.mock("@/domains/inventory/export/realisasi", () => ({
  exportRealisasiExcel: mocks.exportRealisasiExcel,
  printRealisasiPdf: mocks.printRealisasiPdf,
}));
vi.mock("@/domains/inventory/components/RealisasiSPK", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/domains/inventory/components/RealisasiSPK")>(),
  loadRealisasiList: vi.fn(async () => [
    { id: "SPK/01", noSpk: "SPK/01", client: "PT Maju", anggaran: null, realisasi: 450, sisa: null, status: null },
    { id: "SPK-02", noSpk: "SPK-02", client: "PT Jaya", anggaran: null, realisasi: 200, sisa: null, status: null },
  ]),
}));

afterEach(() => vi.clearAllMocks());

describe("Purchasing Realisasi Dokubah", () => {
  it("re-exports the Gudang screen and exports selected rows without navigating to another division", async () => {
    expect(PurchasingReport).toBe(GudangReport);
    render(<PurchasingReport />);
    const spk = await screen.findByText("SPK/01");
    fireEvent.click(spk);
    expect(mocks.push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText("Centang SPK/01"));
    fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
    await waitFor(() => expect(mocks.exportRealisasiExcel).toHaveBeenCalledWith([
      expect.objectContaining({ noSpk: "SPK/01", realisasi: 450 }),
    ], "Semua periode"));
    await waitFor(() => expect((screen.getByRole("button", { name: "Print" }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    await waitFor(() => expect(mocks.printRealisasiPdf).toHaveBeenCalledWith([
      expect.objectContaining({ noSpk: "SPK/01", realisasi: 450 }),
    ], "Semua periode"));
  });
});
