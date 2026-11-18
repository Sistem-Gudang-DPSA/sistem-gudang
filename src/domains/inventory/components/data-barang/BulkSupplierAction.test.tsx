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
  it("is hidden without item.set-supplier", () => {
    renderAction({ canAssignSupplier: false });
    expect(screen.queryByRole("button", { name: /Atur Supplier/ })).toBeNull();
  });

  it("is disabled while nothing is selected", () => {
    renderAction({ selected: new Map() });
    expect((screen.getByRole("button", { name: "Atur Supplier (0)" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("maps every selected item to the chosen supplier and reports the result", async () => {
    const api = installFakeApi({
      "PUT /api/v1/items/1": { id: 1 },
      "PUT /api/v1/items/2": { id: 2 },
    });
    const { onFinished } = renderAction();

    fireEvent.click(screen.getByRole("button", { name: "Atur Supplier (2)" }));
    expect(screen.getByText("1 barang sudah punya supplier dan akan diganti.")).not.toBeNull();

    choose("PT Kayu");
    fireEvent.click(screen.getByRole("button", { name: "Simpan 2 Barang" }));

    await waitFor(() => expect(onFinished).toHaveBeenCalledOnce());
    expect(api.calls("PUT /api/v1/items/1")[0].body).toEqual({ supplierId: 7 });
    expect(api.calls("PUT /api/v1/items/2")[0].body).toEqual({ supplierId: 7 });
    expect(onFinished).toHaveBeenCalledWith({ supplierName: "PT Kayu", assigned: 2, failed: [] });
  });

  it("returns failed items with their names", async () => {
    installFakeApi({
      "PUT /api/v1/items/1": { id: 1 },
      "PUT /api/v1/items/2": fail(400, "Supplier tidak ditemukan."),
    });
    const { onFinished } = renderAction();

    fireEvent.click(screen.getByRole("button", { name: "Atur Supplier (2)" }));
    choose("PT Kayu");
    fireEvent.click(screen.getByRole("button", { name: "Simpan 2 Barang" }));

    await waitFor(() => expect(onFinished).toHaveBeenCalledOnce());
    expect(onFinished).toHaveBeenCalledWith({
      supplierName: "PT Kayu",
      assigned: 1,
      failed: [{ id: 2, name: "Paku", reason: "Supplier tidak ditemukan." }],
    });
  });

  it("clears the supplier with the empty option", async () => {
    const api = installFakeApi({ "PUT /api/v1/items/1": { id: 1 } });
    const { onFinished } = renderAction({ selected: new Map([[1, item(1, "Triplex", 7)]]) });

    fireEvent.click(screen.getByRole("button", { name: "Atur Supplier (1)" }));
    choose("— Kosongkan supplier —");
    fireEvent.click(screen.getByRole("button", { name: "Simpan 1 Barang" }));

    await waitFor(() => expect(onFinished).toHaveBeenCalledOnce());
    expect(api.calls("PUT /api/v1/items/1")[0].body).toEqual({ supplierId: null });
    expect(onFinished).toHaveBeenCalledWith({ supplierName: "Tanpa supplier", assigned: 1, failed: [] });
  });
});
