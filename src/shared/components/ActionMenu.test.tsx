import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ActionMenu, { type ActionMenuItem } from "./ActionMenu";

function items(over: Partial<ActionMenuItem> = {}): ActionMenuItem[] {
  return [
    { key: "a", label: "Aksi A", onClick: vi.fn(), ...over },
    { key: "b", label: "Aksi B", onClick: vi.fn(), disabled: true },
    { key: "c", label: "Hapus", onClick: vi.fn(), danger: true, separator: true },
    { key: "d", label: "Tersembunyi", onClick: vi.fn(), hidden: true },
  ];
}

describe("ActionMenu", () => {
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
});
