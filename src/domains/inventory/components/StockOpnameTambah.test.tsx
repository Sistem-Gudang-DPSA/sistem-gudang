import { AuthUserProvider } from "@/domains/auth/user-context";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { installFakeApi, paged, fail } from "@/test/fake-api";
import StockOpnameTambah from "./StockOpnameTambah";
import StockOpname from "./StockOpname";
import { opnameDraftKey, readOpnameDraft } from '../stock-opname-draft';

const nav = vi.hoisted(() => ({ pathname: '/dashboard/gudang/transaksi/stock-opname/tambah' }));
const push = vi.fn();
const back = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back }),
  useParams: () => ({}),
  usePathname: () => nav.pathname,
}));

const qr = vi.hoisted(() => ({
  cb: null as null | ((r: { data: string }) => void),
  start: vi.fn(async () => {}),
  stop: vi.fn(),
  destroy: vi.fn(),
}));
vi.mock("qr-scanner", () => ({
  default: class {
    constructor(_video: unknown, cb: (r: { data: string }) => void) {
      qr.cb = cb;
    }
    start = qr.start;
    stop = qr.stop;
    destroy = qr.destroy;
  },
}));

const items = paged([
  {
    id: 1,
    code: "BRG-1",
    name: "Triplex",
    unit: "lbr",
    category: "Bahan Baku",
    stock: 10,
    price: 1000,
  },
  {
    id: 2,
    code: "BRG-2",
    name: "Paku",
    unit: "kg",
    category: "Bahan Baku",
    stock: 5,
    price: 200,
  },
]);

const setSecure = (value: boolean) =>
  Object.defineProperty(window, "isSecureContext", {
    value,
    configurable: true,
  });

beforeEach(() => {
  localStorage.clear();
  nav.pathname = "/dashboard/gudang/transaksi/stock-opname/tambah";
  push.mockClear();
  back.mockClear();
  setSecure(true);
  qr.cb = null;
  qr.start.mockClear();
  qr.stop.mockClear();
  qr.destroy.mockClear();
});

async function setup(extra: Record<string, unknown> = {}, confirm = true) {
  const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(confirm);
  const api = installFakeApi({ "GET /api/v1/items": items, ...extra });
  render(<StockOpnameTambah />);
  await screen.findByText("Triplex");
  return { api, confirmSpy };
}
const qtys = () => screen.getAllByPlaceholderText("0") as HTMLInputElement[];
const submit = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  const confirm = screen.queryByRole('button', { name: 'Ya, Submit' });
  if (confirm) fireEvent.click(confirm);
};

describe("StockOpnameTambah", () => {
  it("lists every item as a row, requests page 1 / pageSize 25, back button goes back", async () => {
    const { api } = await setup();
    expect(qtys().length).toBe(2);
    const q = api.calls("GET /api/v1/items")[0].query;
    expect(q.get("page")).toBe("1");
    expect(q.get("pageSize")).toBe("25");
    fireEvent.click(document.querySelector(".flex.items-center.gap-3 button")!);
    expect(back).toHaveBeenCalled();
  });

  it("shows item info and hides administration, difference, and notes before submit", async () => {
    await setup();
    expect(
      (screen.getAllByPlaceholderText("Unit")[0] as HTMLInputElement).value,
    ).toBe("lbr");
    expect(
      (screen.getAllByPlaceholderText("Kategori")[0] as HTMLInputElement).value,
    ).toBe("Bahan Baku");
    fireEvent.change(qtys()[0], { target: { value: "8" } });
    expect(screen.queryByText("-2")).toBeNull();
    expect(screen.queryByText("Administrasi")).toBeNull();
    expect(screen.queryByText("Selisih")).toBeNull();
    expect(screen.queryByPlaceholderText("Tambahkan catatan...")).toBeNull();
  });

  it("refuses an empty form and does not ask for confirmation", async () => {
    const { api, confirmSpy } = await setup();
    submit();
    expect(
      screen.getByText("Isi jumlah fisik minimal satu barang."),
    ).not.toBeNull();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(api.calls("POST /api/v1/stock-opname").length).toBe(0);
  });

  it("input restrictions: decimal with comma or dot, max 3 decimals, maxLength 11, and notes hidden", async () => {
    await setup();
    fireEvent.change(qtys()[0], { target: { value: "-1e2,5678" } });
    expect(qtys()[0].value).toBe("12,567");
    fireEvent.change(qtys()[0], { target: { value: "3.1234" } });
    expect(qtys()[0].value).toBe("3.123");
    expect(qtys()[0].maxLength).toBe(11);
    expect(screen.queryByPlaceholderText("Tambahkan catatan...")).toBeNull();
  });

  it("sends 31,5 as physicalQty 31.5", async () => {
    const { api } = await setup({ "POST /api/v1/stock-opname": { id: 1 } });
    fireEvent.change(qtys()[0], { target: { value: "31,5" } });
    submit();
    await waitFor(() => expect(api.calls("POST /api/v1/stock-opname").length).toBe(1));
    expect((api.calls("POST /api/v1/stock-opname")[0].body as { lines: unknown }).lines).toEqual([{ itemId: 1, physicalQty: 31.5 }]);
  });

  it("rejects a count above 1.000.000 with a message and does not post", async () => {
    const { api, confirmSpy } = await setup();
    fireEvent.change(qtys()[0], { target: { value: "1000001" } });
    submit();
    expect(screen.getByText(/0 sampai 1\.000\.000/)).not.toBeNull();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(api.calls("POST /api/v1/stock-opname").length).toBe(0);
  });

  it("does not post when confirm is cancelled", async () => {
    const { api, confirmSpy } = await setup({}, false);
    fireEvent.change(qtys()[0], { target: { value: "8" } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.getByRole('dialog')).not.toBeNull();
    expect(screen.getByText(/Stok 1 barang akan disetel/)).not.toBeNull();
    expect(confirmSpy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(api.calls("POST /api/v1/stock-opname").length).toBe(0);
  });

  it("posts only counted rows (empty rows are not zeroed), note omitted when empty, then redirects", async () => {
    const { api } = await setup({ "POST /api/v1/stock-opname": { id: 1 } });
    const now = new Date();
    fireEvent.change(qtys()[0], { target: { value: "10" } });
    submit();
    await waitFor(() =>
      expect(api.calls("POST /api/v1/stock-opname").length).toBe(1),
    );
    expect(api.calls("POST /api/v1/stock-opname")[0].body).toEqual({
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      lines: [{ itemId: 1, physicalQty: 10 }],
    });
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        "/dashboard/gudang/transaksi/stock-opname",
      ),
    );
  });

  it("sends a zero count without notes before submit", async () => {
    const { api } = await setup({ "POST /api/v1/stock-opname": { id: 1 } });
    fireEvent.change(qtys()[1], { target: { value: "0" } });
    submit();
    await waitFor(() =>
      expect(api.calls("POST /api/v1/stock-opname").length).toBe(1),
    );
    expect(
      (api.calls("POST /api/v1/stock-opname")[0].body as { lines: unknown })
        .lines,
    ).toEqual([{ itemId: 2, physicalQty: 0 }]);
  });

  it("uses chosen month/year", async () => {
    const { api } = await setup({ "POST /api/v1/stock-opname": { id: 1 } });
    const [month, year] = Array.from(document.querySelectorAll("select"));
    fireEvent.change(month, { target: { value: "2" } });
    fireEvent.change(year, {
      target: { value: String(new Date().getFullYear() - 1) },
    });
    fireEvent.change(qtys()[0], { target: { value: "1" } });
    submit();
    await waitFor(() =>
      expect(api.calls("POST /api/v1/stock-opname").length).toBe(1),
    );
    const b = api.calls("POST /api/v1/stock-opname")[0].body as {
      month: number;
      year: number;
    };
    expect(b.month).toBe(2);
    expect(b.year).toBe(new Date().getFullYear() - 1);
  });

  it("shows backend error, stays on page, disables button while saving", async () => {
    const { api } = await setup({
      "POST /api/v1/stock-opname": fail(409, "Periode sudah ada"),
    });
    fireEvent.change(qtys()[0], { target: { value: "10" } });
    submit();
    const btn = within(screen.getByRole("dialog")).getByRole("button", { name: "Mengirim..." }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect((await screen.findAllByText("Periode sudah ada")).length).toBeGreaterThan(0);
    expect(push).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Ya, Submit" }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect(api.calls("POST /api/v1/stock-opname").length).toBe(1);
  });

  it("shows error when items fail to load", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    installFakeApi({ "GET /api/v1/items": fail(500, "Item error") });
    render(<StockOpnameTambah />);
    expect(await screen.findByText("Item error")).not.toBeNull();
  });
});

describe("permissions", () => {
  const user = (permissions: string[], isSuperadmin = false) => ({
    id: 1,
    username: "u",
    email: "u@x.id",
    roleId: 2,
    roleName: "Staff",
    isSuperadmin,
    permissions,
  });
  const open = (u: ReturnType<typeof user>) => {
    installFakeApi({ "GET /api/v1/items": paged([]) });
    render(
      <AuthUserProvider user={u}>
        <StockOpnameTambah />
      </AuthUserProvider>,
    );
  };

  it("shows a no-permission message instead of the form", () => {
    open(user(["stock-opname.view"]));
    expect(screen.getByText(/Anda tidak punya izin/)).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Simpan Draft' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
  });

  it("shows the form with stock-opname.create or for a superadmin", async () => {
    open(user(["stock-opname.create"]));
    expect(await screen.findByText("Simpan Draft")).not.toBeNull();
  });

  it("shows the form to a superadmin", async () => {
    open(user([], true));
    expect(await screen.findByText("Simpan Draft")).not.toBeNull();
  });
});

describe("scan mode", () => {
  const lem = {
    id: 9,
    code: "LBR001",
    externalCode: "OLD-7",
    name: "Lem Kayu",
    unit: "kg",
    category: "Bahan Baku",
    stock: 4,
    price: 300,
    locationId: 1,
    supplierId: 7,
  };
  const routes = {
    "GET /api/v1/items/by-code/LBR001": lem,
    "GET /api/v1/items/by-code/BRG-1": { ...items.rows[0] },
    "GET /api/v1/items/by-code/NOPE": fail(404, "Item not found"),
  };
  const openScanner = async () => {
    fireEvent.click(screen.getByText("Scan QR"));
    await waitFor(() => expect(qr.start).toHaveBeenCalled());
  };
  const scanCode = (code: string) => qr.cb!({ data: code });

  it("scan finds an item not on this page: system stock is hidden and its jumlah is submitted", async () => {
    const { api } = await setup({
      ...routes,
      "POST /api/v1/stock-opname": { id: 1 },
    });
    await openScanner();
    scanCode("LBR001");
    expect(
      await screen.findByText("Lem Kayu", { selector: "dd" }),
    ).not.toBeNull();
    expect(screen.getByText("OLD-7")).not.toBeNull();
    expect(screen.queryByText("4 kg")).toBeNull();
    fireEvent.change(screen.getByLabelText("Jumlah fisik"), {
      target: { value: "3" },
    });
    expect(screen.queryByText("-1")).toBeNull();
    fireEvent.click(screen.getByText("Masukkan ke opname"));
    expect(screen.queryByText("Masukkan ke opname")).toBeNull();
    expect(
      screen.getByText("Lem Kayu dimasukkan ke opname: 3 kg."),
    ).not.toBeNull();

    submit();
    await waitFor(() =>
      expect(api.calls("POST /api/v1/stock-opname").length).toBe(1),
    );
    expect(
      (api.calls("POST /api/v1/stock-opname")[0].body as { lines: unknown })
        .lines,
    ).toEqual([{ itemId: 9, physicalQty: 3 }]);
  });

  it("scanning an item already entered pre-fills its jumlah instead of duplicating it", async () => {
    const { api } = await setup({
      ...routes,
      "POST /api/v1/stock-opname": { id: 1 },
    });
    fireEvent.change(qtys()[0], { target: { value: "8" } });
    await openScanner();
    scanCode("BRG-1");
    expect(
      await screen.findByText("Triplex", { selector: "dd" }),
    ).not.toBeNull();
    expect(
      (screen.getByLabelText("Jumlah fisik") as HTMLInputElement).value,
    ).toBe("8");
    fireEvent.change(screen.getByLabelText("Jumlah fisik"), {
      target: { value: "9" },
    });
    fireEvent.click(screen.getByText("Masukkan ke opname"));
    submit();
    await waitFor(() =>
      expect(api.calls("POST /api/v1/stock-opname").length).toBe(1),
    );
    expect(
      (api.calls("POST /api/v1/stock-opname")[0].body as { lines: unknown })
        .lines,
    ).toEqual([{ itemId: 1, physicalQty: 9 }]);
  });

  it("a scanned row from another page stays visible, can be emptied and then is not posted", async () => {
    const { api } = await setup({ ...routes, "POST /api/v1/stock-opname": { id: 1 } });
    await openScanner();
    scanCode("LBR001");
    await screen.findByText("Lem Kayu", { selector: "dd" });
    fireEvent.change(screen.getByLabelText("Jumlah fisik"), { target: { value: "3,5" } });
    fireEvent.click(screen.getByText("Masukkan ke opname"));
    expect(screen.getByText("Lem Kayu", { selector: "span" })).not.toBeNull();
    expect(qtys().length).toBe(3);
    fireEvent.change(qtys()[2], { target: { value: "" } });
    expect(qtys().length).toBe(2);
    fireEvent.change(qtys()[0], { target: { value: "1" } });
    submit();
    await waitFor(() => expect(api.calls("POST /api/v1/stock-opname").length).toBe(1));
    expect((api.calls("POST /api/v1/stock-opname")[0].body as { lines: unknown }).lines).toEqual([{ itemId: 1, physicalQty: 1 }]);
  });

  it("draft menyimpan hasil scan di luar halaman dan memulihkannya saat form dibuka kembali", async () => {
    const { api } = await setup(routes);
    await openScanner();
    scanCode("LBR001");
    await screen.findByText("Lem Kayu", { selector: "dd" });
    fireEvent.change(screen.getByLabelText("Jumlah fisik"), { target: { value: "3,5" } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Draft' }));
    expect(screen.getByText(/Masukkan hasil scan ke opname/)).not.toBeNull();
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Masukkan ke opname"));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Draft' }));
    expect(readOpnameDraft(opnameDraftKey('/dashboard/gudang', undefined))?.rows).toEqual([expect.objectContaining({ itemId: '9', jumlah: '3,5', itemName: 'Lem Kayu' })]);
    expect(api.calls('POST /api/v1/stock-opname')).toHaveLength(0);
    cleanup();
    render(<StockOpnameTambah />);
    await screen.findByText('Triplex');
    expect(screen.getByText('Lem Kayu', { selector: 'span' })).not.toBeNull();
    expect(qtys().some((input) => input.value === '3,5')).toBe(true);
  });

  it("when two scans answer out of order, the last scan wins", async () => {
    await setup({
      ...routes,
      "GET /api/v1/items/by-code/SLOW": { ...lem, id: 5, name: "Lama" },
    });
    // hold back the SLOW answer until the second scan has been answered
    const real = globalThis.fetch;
    let release!: () => void;
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
      String(input).includes("SLOW")
        ? new Promise((res) => { release = () => res(real(input, init)); })
        : real(input, init));
    await openScanner();
    scanCode("SLOW");
    fireEvent.click(await screen.findByText("Scan lagi"));
    scanCode("LBR001");
    await screen.findByText("Lem Kayu", { selector: "dd" });
    release();
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText("Lama", { selector: "dd" })).toBeNull();
    expect(screen.getByText("Lem Kayu", { selector: "dd" })).not.toBeNull();
  });

  it("unknown code shows the rejected message and no card", async () => {
    await setup(routes);
    await openScanner();
    scanCode("NOPE");
    expect(
      await screen.findByText('Kode "NOPE" tidak dikenal.'),
    ).not.toBeNull();
    expect(screen.queryByText("Masukkan ke opname")).toBeNull();
    expect(screen.queryByLabelText("Jumlah fisik")).toBeNull();
  });
});

describe.each(['/dashboard/gudang', '/dashboard/gudang-barang-jadi'])('draft lokal %s', (base) => {
  it('menyimpan seluruh hitungan termasuk nol, memulihkan periode, melanjutkan dari daftar, dan menghapus draft setelah submit', async () => {
    nav.pathname = `${base}/transaksi/stock-opname/tambah`;
    const api = installFakeApi({ 'GET /api/v1/items': items, 'GET /api/v1/stock-opname': paged([]), 'POST /api/v1/stock-opname': { id: 1 } });
    const first = render(<StockOpnameTambah />);
    await screen.findByText('Triplex');
    fireEvent.change(document.querySelectorAll('select')[0], { target: { value: '2' } });
    fireEvent.change(qtys()[0], { target: { value: '8,5' } });
    fireEvent.change(qtys()[1], { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Draft' }));
    expect(api.calls('POST /api/v1/stock-opname')).toHaveLength(0);
    const key = opnameDraftKey(base, undefined);
    expect(readOpnameDraft(key)?.rows.map((row) => row.jumlah)).toEqual(['8,5', '0']);
    expect(push).toHaveBeenCalledWith(`${base}/transaksi/stock-opname`);
    first.unmount();

    nav.pathname = `${base}/transaksi/stock-opname`;
    const list = render(<StockOpname />);
    expect((await screen.findByRole('link', { name: 'Lanjutkan Draft' })).getAttribute('href')).toBe(`${base}/transaksi/stock-opname/tambah`);
    expect(screen.queryByRole('button', { name: 'Download' })).toBeNull();
    list.unmount();

    nav.pathname = `${base}/transaksi/stock-opname/tambah`;
    render(<StockOpnameTambah />);
    await screen.findByText('Triplex');
    expect((document.querySelectorAll('select')[0] as HTMLSelectElement).value).toBe('2');
    expect(qtys().map((input) => input.value)).toEqual(['8,5', '0']);
    submit();
    await waitFor(() => expect(api.calls('POST /api/v1/stock-opname')).toHaveLength(1));
    expect(api.calls('POST /api/v1/stock-opname')[0].body).toMatchObject({ month: 2, lines: [{ itemId: 1, physicalQty: 8.5 }, { itemId: 2, physicalQty: 0 }] });
    await waitFor(() => expect(readOpnameDraft(key)).toBeNull());
  });
});

describe('draft lokal: kegagalan', () => {
  it('gagal menyimpan ke browser tidak menghapus isian atau mengirim transaksi', async () => {
    const { api } = await setup();
    fireEvent.change(qtys()[0], { target: { value: '8' } });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Draft' }));
    expect(screen.getByText(/Draft gagal disimpan/)).not.toBeNull();
    expect(qtys()[0].value).toBe('8');
    expect(push).not.toHaveBeenCalled();
    expect(api.calls('POST /api/v1/stock-opname')).toHaveLength(0);
  });

  it('draft rusak tidak mengunci form: form terbuka kosong dengan peringatan', async () => {
    localStorage.setItem(opnameDraftKey('/dashboard/gudang', undefined), '{not-json');
    installFakeApi({ "GET /api/v1/items": items });
    render(<StockOpnameTambah />);
    expect(await screen.findByText('Triplex')).not.toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('Draft stok opname tidak dapat dibaca');
    expect(screen.getByRole('button', { name: 'Simpan Draft' })).not.toBeNull();
    expect(qtys().map((input) => input.value)).toEqual(['', '']);
  });

  it('submit gagal mempertahankan draft agar bisa dilanjutkan', async () => {
    await setup({ 'POST /api/v1/stock-opname': fail(500, 'Gagal submit') });
    fireEvent.change(qtys()[0], { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Draft' }));
    const key = opnameDraftKey('/dashboard/gudang', undefined);
    submit();
    await screen.findAllByText('Gagal submit');
    expect(readOpnameDraft(key)?.rows[0].jumlah).toBe('9');
    expect(qtys()[0].value).toBe('9');
  });
});
