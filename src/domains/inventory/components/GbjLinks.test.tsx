import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { installFakeApi, paged } from "@/test/fake-api";
import { AuthUserProvider } from "@/domains/auth/user-context";
import { canAccess } from "@/domains/auth/nav";
import type { AuthUser } from "@/domains/auth/types";
import GudangDashboard from "./GudangDashboard";
import StockOpname from "./StockOpname";
import RekapDokubah from "./RekapDokubah";
import DetailRekapDokubah from "./DetailRekapDokubah";

const nav = vi.hoisted(() => ({ pathname: "" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname, useRouter: () => ({ push: vi.fn() }), useParams: () => ({ id: "7" }) }));

const dokubah = {
  id: 7, noSpk: "SPK-007", client: "PT Maju", tanggalMulai: "2026-05-01", tanggalSelesai: "2026-05-31",
  status: "APPROVED", fileDokubah: null, totalAnggaran: 100000, createdBy: 1, createdAt: "", updatedAt: "",
  totalKuota: 0, totalRealisasi: 0, totalRealisasiNilai: 0, bahan: [],
};

const user = (domainCode: string): AuthUser => ({
  id: 1, username: "u", email: "u@x", roleId: 1, roleName: "r", isSuperadmin: false, domainCode,
  permissions: ["item.view", "report.view", "stock-opname.create", "stock-opname.view", "dokubah.view"],
});

describe.each([
  ["inventory", "/dashboard/gudang"],
  ["gudang-barang-jadi", "/dashboard/gudang-barang-jadi"],
])("%s screens", (domainCode, base) => {
  const u = user(domainCode);
  const wrap = (ui: React.ReactElement) => render(<AuthUserProvider user={u}>{ui}</AuthUserProvider>);

  it("dashboard links stay in the division and are accessible", async () => {
    nav.pathname = base;
    installFakeApi({ "GET /api/v1/items": paged([]), "GET /api/v1/reports/inbound": paged([]), "GET /api/v1/reports/outbound": paged([]), "GET /api/v1/reports/requests": paged([]) });
    wrap(<GudangDashboard />);
    const hrefs = (await screen.findAllByRole("link")).map((a) => a.getAttribute("href")!);
    expect(hrefs.length).toBeGreaterThanOrEqual(4);
    for (const h of hrefs) {
      expect(h.startsWith(base + "/")).toBe(true);
      expect(canAccess(u, h)).toBe(true);
    }
  });

  it("Tambah stock opname opens the division route", async () => {
    nav.pathname = `${base}/transaksi/stock-opname`;
    installFakeApi({ "GET /api/v1/stock-opname": paged([]) });
    wrap(<StockOpname />);
    const href = (await screen.findByRole("link", { name: /Tambah/ })).getAttribute("href")!;
    expect(href).toBe(`${base}/transaksi/stock-opname/tambah`);
    expect(canAccess(u, href)).toBe(true);
  });

  it("Rekap Dokubah row link opens the division detail route", async () => {
    nav.pathname = `${base}/laporan/dokubah`;
    installFakeApi({ "GET /api/v1/dokubah": paged([dokubah]) });
    wrap(<RekapDokubah />);
    const href = (await screen.findByRole("link", { name: "SPK-007" })).getAttribute("href")!;
    expect(href).toBe(`${base}/laporan/dokubah/detail-dokubah/7`);
    expect(canAccess(u, href)).toBe(true);
  });

  it("Detail Rekap Dokubah goes back to the division list", async () => {
    nav.pathname = `${base}/laporan/dokubah/detail-dokubah/7`;
    installFakeApi({ "GET /api/v1/dokubah/7": dokubah });
    wrap(<DetailRekapDokubah />);
    const back = await screen.findByRole("link", { name: "Kembali" });
    expect(back.getAttribute("href")).toBe(`${base}/laporan/dokubah`);
    expect(screen.getByRole("link", { name: "Kembali ke Rekap Dokubah" }).getAttribute("href")).toBe(`${base}/laporan/dokubah`);
  });
});
