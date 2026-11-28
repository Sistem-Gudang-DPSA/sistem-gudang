import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ActionMenu, { type ActionMenuItem } from "./ActionMenu";
import { Pencil } from "lucide-react";

function items(over: Partial<ActionMenuItem> = {}): ActionMenuItem[] {
  return [
    { key: "a", label: "Aksi A", onClick: vi.fn(), ...over },
    { key: "b", label: "Aksi B", onClick: vi.fn(), disabled: true },
    { key: "c", label: "Hapus", onClick: vi.fn(), danger: true, separator: true },
    { key: "d", label: "Tersembunyi", onClick: vi.fn(), hidden: true },
  ];
}

describe("ActionMenu", () => {
  it("shows icons with accessible names and hover or keyboard labels in icon-only mode", () => {
    render(<ActionMenu label="Aksi Supplier" iconOnly items={[{ key: "edit", label: "Edit", icon: <Pencil />, onClick: vi.fn() }]} />);
    const trigger = screen.getByRole("button", { name: "Aksi Supplier" });
    expect(trigger.textContent).toBe("");
    expect(trigger.querySelector("svg")).not.toBeNull();
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(trigger);
    const item = screen.getByRole("menuitem", { name: "Edit" });
    expect(item.querySelector("svg")).not.toBeNull();
    expect(item.querySelector("span")?.classList.contains("opacity-0")).toBe(true);
    expect(item.querySelector("span")?.classList.contains("group-hover/action:opacity-100")).toBe(true);
    expect(item.querySelector("span")?.classList.contains("group-focus-visible/action:opacity-100")).toBe(true);
  });

  it("keeps navigation actions as links and closes the menu when selected", () => {
    render(<ActionMenu label="Aksi" items={[{ key: "detail", label: "Detail Barang", href: "/supplier/7" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Aksi" }));
    const link = screen.getByRole("menuitem", { name: "Detail Barang" });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/supplier/7");
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("does not expose a navigable link for disabled navigation actions", () => {
    render(<ActionMenu label="Aksi" items={[{ key: "detail", label: "Detail Barang", href: "/supplier/7", disabled: true }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Aksi" }));
    const item = screen.getByRole("menuitem", { name: "Detail Barang" });
    expect(item.hasAttribute("disabled")).toBe(true);
    expect(item.hasAttribute("href")).toBe(false);
    fireEvent.click(item);
    expect(screen.getByRole("menu")).not.toBeNull();
  });

  it("renders nothing when every item is hidden", () => {
    render(<ActionMenu label="Aksi Massal" items={[{ key: "x", label: "X", onClick: vi.fn(), hidden: true }]} />);
    expect(screen.queryByRole("button", { name: /Aksi Massal/ })).toBeNull();
  });

  it("shows the count on the trigger and opens the menu", () => {
    render(<ActionMenu label="Aksi Massal" count={2} items={items()} />);
    const trigger = screen.getByRole("button", { name: "Aksi Massal (2)" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Aksi A", "Aksi B", "Hapus"]);
  });

  it("runs an item and closes the menu", () => {
    const onClick = vi.fn();
    render(<ActionMenu label="Aksi" items={[{ key: "a", label: "Aksi A", onClick }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Aksi" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Aksi A" }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("does not run a disabled item", () => {
    const onClick = vi.fn();
    render(<ActionMenu label="Aksi" items={[{ key: "a", label: "Aksi A", onClick, disabled: true }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Aksi" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Aksi A" }));

    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("menu")).not.toBeNull();
  });

  it("marks the danger item in red", () => {
    render(<ActionMenu label="Aksi" items={items()} />);
    fireEvent.click(screen.getByRole("button", { name: "Aksi" }));
    expect(screen.getByRole("menuitem", { name: "Hapus" }).className).toContain("text-red-600");
  });

  it("closes on Escape and returns focus to the trigger", () => {
    render(<ActionMenu label="Aksi" items={items()} />);
    const trigger = screen.getByRole("button", { name: "Aksi" });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on a click outside", () => {
    render(<ActionMenu label="Aksi" items={items()} />);
    fireEvent.click(screen.getByRole("button", { name: "Aksi" }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes on window resize without treating the window as a DOM node", () => {
    render(<ActionMenu label="Aksi" items={items()} />);
    fireEvent.click(screen.getByRole("button", { name: "Aksi" }));
    fireEvent(window, new Event("resize"));
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
