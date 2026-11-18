import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SupplierBulkModal from "./SupplierBulkModal";

const suppliers = [
  { id: 7, name: "PT Kayu" },
  { id: 8, name: "CV Baja" },
];
const items = [
  { id: 1, name: "Triplex", code: "BRG-1", currentSupplier: null },
  { id: 2, name: "Paku", code: "BRG-2", currentSupplier: "CV Baja" },
];

function setup(over: Partial<ComponentProps<typeof SupplierBulkModal>> = {}) {
  const props = {
    items,
    suppliers,
    value: "",
    onChange: vi.fn(),
    onSave: vi.fn(),
    onClose: vi.fn(),
    saving: false,
    progress: null,
    error: "",
    ...over,
  };
  const view = render(<SupplierBulkModal {...props} />);
  return { ...props, ...view };
}

describe("SupplierBulkModal", () => {
  it("shows the item count and disables review until a supplier is chosen", () => {
    setup();
    expect(screen.getByText(/Atur Supplier · 2 Barang/i)).not.toBeNull();
    expect((screen.getByRole("button", { name: "Tinjau 2 Barang" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("warns when selected items already have a supplier", () => {
    setup();
    expect(screen.getByText("1 barang sudah punya supplier dan akan diganti.")).not.toBeNull();
  });

  it("reviews item names and current suppliers before saving", () => {
    const props = setup({ value: "7" });
    fireEvent.click(screen.getByRole("button", { name: "Tinjau 2 Barang" }));

    expect(screen.getByText(/Tinjau Pemetaan · 2 Barang/i)).not.toBeNull();
    expect(screen.getByText("Supplier tujuan")).not.toBeNull();
    expect(screen.getByText("PT Kayu")).not.toBeNull();
    expect(screen.getByText("Triplex")).not.toBeNull();
    expect(screen.getByText("BRG-1")).not.toBeNull();
    expect(screen.getByText("CV Baja")).not.toBeNull();
    expect(screen.getByText("Belum ada")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Simpan 2 Barang" }));
    expect(props.onSave).toHaveBeenCalledOnce();
  });

  it("returns to the supplier step without saving", () => {
    const props = setup({ value: "7" });
    fireEvent.click(screen.getByRole("button", { name: "Tinjau 2 Barang" }));
    fireEvent.click(screen.getByRole("button", { name: "Kembali" }));

    expect(screen.getByText(/Atur Supplier · 2 Barang/i)).not.toBeNull();
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it("explains when the supplier will be cleared", () => {
    setup({ value: "none" });
    fireEvent.click(screen.getByRole("button", { name: "Tinjau 2 Barang" }));
    expect(screen.getByText("Supplier pada 1 barang akan dikosongkan.")).not.toBeNull();
    expect(screen.getByText("Tanpa supplier")).not.toBeNull();
  });

  it("blocks closing and saving while the request is running", () => {
    const props = setup({ saving: true, value: "7" });
    fireEvent.click(screen.getByRole("button", { name: "Batal" }));
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("shows the error message", () => {
    setup({ error: "Gagal menyimpan supplier." });
    expect(screen.getByRole("alert").textContent).toBe("Gagal menyimpan supplier.");
  });
});
