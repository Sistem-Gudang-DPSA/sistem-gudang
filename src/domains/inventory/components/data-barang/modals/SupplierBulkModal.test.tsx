import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SupplierBulkModal from "./SupplierBulkModal";

const suppliers = [
  { id: 7, name: "PT Kayu" },
  { id: 8, name: "CV Baja" },
];

function setup(over: Partial<ComponentProps<typeof SupplierBulkModal>> = {}) {
  const props = {
    count: 2,
    withSupplier: 0,
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
  render(<SupplierBulkModal {...props} />);
  return props;
}

describe("SupplierBulkModal", () => {
  it("shows the item count and disables save until a supplier is chosen", () => {
    setup();
    expect(screen.getByText(/Atur Supplier · 2 Barang/i)).not.toBeNull();
    expect((screen.getByRole("button", { name: "Simpan 2 Barang" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("enables save and calls onSave once a value is chosen", () => {
    const props = setup({ value: "7" });
    fireEvent.click(screen.getByRole("button", { name: "Simpan 2 Barang" }));
    expect(props.onSave).toHaveBeenCalledOnce();
  });

  it("warns when selected items already have a supplier", () => {
    setup({ withSupplier: 1 });
    expect(screen.getByText("1 barang sudah punya supplier dan akan diganti.")).not.toBeNull();
  });

  it("shows progress while saving and blocks closing", () => {
    const props = setup({ saving: true, value: "7", progress: { done: 1, total: 2 } });
    expect((screen.getByRole("button", { name: "Menyimpan 1/2..." }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Batal" }));
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("shows the error message", () => {
    setup({ error: "Gagal menyimpan supplier." });
    expect(screen.getByRole("alert").textContent).toBe("Gagal menyimpan supplier.");
  });
});
