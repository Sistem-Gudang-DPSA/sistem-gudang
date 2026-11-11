import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fail, installFakeApi } from "@/test/fake-api";
import LaporMasalahModal from "./LaporMasalahModal";

const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

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

describe("Lapor Masalah modal", () => {
  // jsdom has no blob URLs; the thumbnail preview only needs a string
  const onClose = vi.fn();
  const onSent = vi.fn();
  beforeEach(() => {
    onClose.mockClear();
    onSent.mockClear();
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
  });

  it("sends a multipart report with description and page url", async () => {
    const api = installFakeApi({ "POST /api/v1/bug-reports": report });
    render(<LaporMasalahModal onClose={onClose} onSent={onSent} />);
    fireEvent.change(screen.getByLabelText("Deskripsi"), { target: { value: "Tombol tidak jalan" } });
    fireEvent.click(screen.getByRole("button", { name: "Kirim Laporan" }));

    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1));
    const [, init] = api.fetchMock.mock.calls[0];
    const form = init?.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get("description")).toBe("Tombol tidak jalan");
    expect(form.get("pageUrl")).toBe(window.location.href);
    expect(form.get("userAgent")).toBe(navigator.userAgent);
    expect(api.calls("POST /api/v1/bug-reports")).toHaveLength(1);
  });

  it("does not submit an empty description", () => {
    const api = installFakeApi({ "POST /api/v1/bug-reports": report });
    render(<LaporMasalahModal onClose={onClose} onSent={onSent} />);
    fireEvent.click(screen.getByRole("button", { name: "Kirim Laporan" }));
    expect(api.calls("POST /api/v1/bug-reports")).toHaveLength(0);
  });

  it("rejects a screenshot over 10 MB without submitting", async () => {
    const api = installFakeApi({ "POST /api/v1/bug-reports": report });
    render(<LaporMasalahModal onClose={onClose} onSent={onSent} />);
    fireEvent.change(screen.getByLabelText("Deskripsi"), { target: { value: "Foto besar" } });
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "besar.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Screenshot (opsional)"), { target: { files: [big] } });
    fireEvent.click(screen.getByRole("button", { name: "Kirim Laporan" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Screenshot maksimal 10 MB (JPEG/PNG/WebP).",
    );
    expect(api.calls("POST /api/v1/bug-reports")).toHaveLength(0);
  });

  it("shows the server error and keeps the dialog open", async () => {
    installFakeApi({ "POST /api/v1/bug-reports": fail(422, "Deskripsi wajib diisi.") });
    render(<LaporMasalahModal onClose={onClose} onSent={onSent} />);
    fireEvent.change(screen.getByLabelText("Deskripsi"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Kirim Laporan" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Deskripsi wajib diisi.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Kirim Laporan" })).toBeTruthy());
  });
});
