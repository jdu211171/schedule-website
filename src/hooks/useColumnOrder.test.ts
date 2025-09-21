import { describe, it, expect, beforeEach } from "vitest";
import * as React from "react";
import { renderHook, act } from "@testing-library/react";
import { useColumnOrder } from "@/hooks/useColumnOrder";

// Minimal localStorage polyfill for node environment
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

describe("useColumnOrder", () => {
  const KEY = "vitest.columnOrder.demo";
  const initial = ["a", "b", "c", "d"];

  beforeEach(() => {
    (globalThis as any).localStorage = new MemoryStorage();
  });

  it("initializes from defaults when empty", () => {
    const { result } = renderHook(() => useColumnOrder(KEY, initial));
    expect(result.current.order).toEqual(initial);
  });

  it("persists custom ordering", () => {
    const { result } = renderHook(() => useColumnOrder(KEY, initial));
    act(() => result.current.setOrder(["b", "a", "d", "c"]));

    // New instance should read persisted order
    const again = renderHook(() => useColumnOrder(KEY, initial));
    expect(again.result.current.order).toEqual(["b", "a", "d", "c"]);
  });

  it("appends newly added columns at the end", () => {
    const { result, rerender } = renderHook(({ ids }) => useColumnOrder(KEY, ids), {
      initialProps: { ids: initial },
    });

    act(() => result.current.setOrder(["b", "a", "d", "c"]));
    expect(result.current.order).toEqual(["b", "a", "d", "c"]);

    // Add a new column id; should be appended
    rerender({ ids: [...initial, "e"] });
    expect(result.current.order).toEqual(["b", "a", "d", "c", "e"]);
  });
});
/* @vitest-environment jsdom */
