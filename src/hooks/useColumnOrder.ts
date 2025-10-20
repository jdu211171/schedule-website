"use client";

import * as React from "react";

/**
 * Manage a table column order persisted in localStorage.
 * - Filters out unknown ids
 * - Appends newly added ids to the end in the provided default order
 */
export function useColumnOrder(
  storageKey: string | undefined,
  allColumnIds: string[]
) {
  const stableIds = React.useMemo(
    () => Array.from(new Set(allColumnIds)),
    [allColumnIds]
  );

  const read = React.useCallback((): string[] => {
    if (!storageKey) return stableIds;
    try {
      const raw = (globalThis as any)?.localStorage?.getItem(storageKey);
      if (!raw) return stableIds;
      const parsed = Array.isArray(JSON.parse(raw))
        ? (JSON.parse(raw) as string[])
        : [];

      const valid = parsed.filter((id) => stableIds.includes(id));
      const missing = stableIds.filter((id) => !valid.includes(id));
      return [...valid, ...missing];
    } catch {
      return stableIds;
    }
  }, [stableIds, storageKey]);

  const [order, setOrder] = React.useState<string[]>(() => read());

  // When the available columns change (e.g., feature flag) reconcile order
  React.useEffect(() => {
    setOrder((prev) => {
      const valid = prev.filter((id) => stableIds.includes(id));
      const missing = stableIds.filter((id) => !valid.includes(id));
      const next = [...valid, ...missing];
      if (storageKey && (globalThis as any)?.localStorage) {
        try {
          (globalThis as any).localStorage.setItem(
            storageKey,
            JSON.stringify(next)
          );
        } catch {}
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(stableIds)]);

  const update = React.useCallback(
    (next: string[]) => {
      setOrder((prev) => {
        // Always normalize to known ids and preserve any new ids
        const filtered = next.filter((id) => stableIds.includes(id));
        const missing = stableIds.filter((id) => !filtered.includes(id));
        const merged = [...filtered, ...missing];
        if (storageKey && (globalThis as any)?.localStorage) {
          try {
            (globalThis as any).localStorage.setItem(
              storageKey,
              JSON.stringify(merged)
            );
          } catch {}
        }
        return merged;
      });
    },
    [stableIds, storageKey]
  );

  const reset = React.useCallback(() => {
    update(stableIds);
  }, [stableIds, update]);

  return { order, setOrder: update, reset } as const;
}
