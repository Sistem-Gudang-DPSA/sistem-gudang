import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { fail, installFakeApi } from "@/test/fake-api";
import type { ItemListRow } from "@/domains/inventory/types";
import BulkSupplierAction from "./BulkSupplierAction";

const item = (id: number, name: string, supplierId: number | null = null): ItemListRow => ({
  id, code: `BRG-${id}`, name, category: "Bahan", unit: "pcs", price: 0, stock: 1,
  locationId: null, supplierId, locationCode: null, supplierName: null,
});

const suppliers = [
  { id: 7, name: "PT Kayu" },
  { id: 8, name: "CV Baja" },
];

const selected = new Map<number, ItemListRow>([
  [1, item(1, "Triplex")],
  [2, item(2, "Paku", 8)],
]);

function renderAction(over: Partial<Parameters<typeof BulkSupplierAction>[0]> = {}) {
  const onFinished = vi.fn();
  render(
    <BulkSupplierAction
      selected={selected}
      suppliers={suppliers}
      canAssignSupplier
      onFinished={onFinished}
      {...over}
    />,
  );
  return { onFinished };
}

const choose = (label: string) => {
  fireEvent.click(screen.getByRole("button", { name: "Supplier" }));
  fireEvent.click(screen.getByRole("option", { name: label }));
};

describe("BulkSupplierAction", () => {
  it("keeps the existing supplier when adding a second supplier to one material", async () => {
    const api = installFakeApi({ "PUT /api/v1/items/1/suppliers": { id: 1, suppliers } });
    const { onFinished } = renderAction({ selected: new Map([[1, { ...item(1, "Triplex", 7), suppliers: [suppliers[0]] }]]) });
    fireEvent.click(screen.getByRole("button", { name: "Edit Supplier (1)" }));
    expect((screen.getByRole("checkbox", { name: "PT Kayu" }) as HTMLInputElement).checked).toBe(true);
    choose("CV Baja");
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Tinjau 1 Barang" }));
    expect(screen.getByText("PT Kayu, CV Baja")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Simpan 1 Barang" }));
    await waitFor(() => expect(onFinished).toHaveBeenCalledOnce());
    expect(api.calls("PUT /api/v1/items/1/suppliers")[0].body).toEqual({ supplierIds: [7, 8] });
    expect(onFinished).toHaveBeenCalledWith({ supplierName: "PT Kayu, CV Baja", assigned: 1, failed: [] });
  });

  it("allows removing one mapping while preserving the other supplier", async () => {
    const api = installFakeApi({ "PUT /api/v1/items/1/suppliers": { id: 1, suppliers: [suppliers[1]] } });
    const { onFinished } = renderAction({ selected: new Map([[1, { ...item(1, "Triplex", 7), suppliers }]]) });
    fireEvent.click(screen.getByRole("button", { name: "Edit Supplier (1)" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "PT Kayu" }));
    fireEvent.click(screen.getByRole("button", { name: "Tinjau 1 Barang" }));
    fireEvent.click(screen.getByRole("button", { name: "Simpan 1 Barang" }));
    await waitFor(() => expect(onFinished).toHaveBeenCalledOnce());
    expect(api.calls("PUT /api/v1/items/1/suppliers")[0].body).toEqual({ supplierIds: [8] });
  });

  it("is hidden without item.set-supplier", () => {
    renderAction({ canAssignSupplier: false });
    expect(screen.queryByRole("button", { name: /Edit Supplier/ })).toBeNull();
  });

  it("is disabled while nothing is selected", () => {
    renderAction({ selected: new Map() });
    expect((screen.getByRole("button", { name: "Edit Supplier (0)" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("maps every selected item to the chosen supplier and reports the result", async () => {
    const api = installFakeApi({
      "PUT /api/v1/items/1/suppliers": { id: 1 },
      "PUT /api/v1/items/2/suppliers": { id: 2 },
    });
    const { onFinished } = renderAction();

    fireEvent.click(screen.getByRole("button", { name: "Edit Supplier (2)" }));
    expect(screen.getByText("1 barang sudah punya supplier. Daftar suppliernya akan diganti sesuai pilihan.")).not.toBeNull();

    choose("PT Kayu");
    fireEvent.click(screen.getByRole("button", { name: "Tinjau 2 Barang" }));
    fireEvent.click(screen.getByRole("button", { name: "Simpan 2 Barang" }));

    await waitFor(() => expect(onFinished).toHaveBeenCalledOnce());
    expect(api.calls("PUT /api/v1/items/1/suppliers")[0].body).toEqual({ supplierIds: [7] });
    expect(api.calls("PUT /api/v1/items/2/suppliers")[0].body).toEqual({ supplierIds: [7] });
    expect(onFinished).toHaveBeenCalledWith({ supplierName: "PT Kayu", assigned: 2, failed: [] });
  });

  it("returns failed items with their names", async () => {
    installFakeApi({
      "PUT /api/v1/items/1/suppliers": { id: 1 },
      "PUT /api/v1/items/2/suppliers": fail(400, "Supplier tidak ditemukan."),
    });
    const { onFinished } = renderAction();

    fireEvent.click(screen.getByRole("button", { name: "Edit Supplier (2)" }));
    choose("PT Kayu");
    fireEvent.click(screen.getByRole("button", { name: "Tinjau 2 Barang" }));
    fireEvent.click(screen.getByRole("button", { name: "Simpan 2 Barang" }));

    await waitFor(() => expect(onFinished).toHaveBeenCalledOnce());
    expect(onFinished).toHaveBeenCalledWith({
      supplierName: "PT Kayu",
      assigned: 1,
      failed: [{ id: 2, name: "Paku", reason: "Supplier tidak ditemukan." }],
    });
  });

  it("clears the supplier with the empty option", async () => {
    const api = installFakeApi({ "PUT /api/v1/items/1/suppliers": { id: 1 } });
    const { onFinished } = renderAction({ selected: new Map([[1, item(1, "Triplex", 7)]]) });

    fireEvent.click(screen.getByRole("button", { name: "Edit Supplier (1)" }));
    choose("— Kosongkan supplier —");
    fireEvent.click(screen.getByRole("button", { name: "Tinjau 1 Barang" }));
    fireEvent.click(screen.getByRole("button", { name: "Simpan 1 Barang" }));

    await waitFor(() => expect(onFinished).toHaveBeenCalledOnce());
    expect(api.calls("PUT /api/v1/items/1/suppliers")[0].body).toEqual({ supplierIds: [] });
    expect(onFinished).toHaveBeenCalledWith({ supplierName: "Tanpa supplier", assigned: 1, failed: [] });
  });
});
