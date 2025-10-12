// src/lib/filter-class-type-options.ts
import type { ClassTypeOption } from "@/types/class-type";

export function applyHiddenClassTypes(options: ClassTypeOption[], hiddenIds: string[] | undefined): ClassTypeOption[] {
  if (!hiddenIds || hiddenIds.length === 0) return options;
  const hide = new Set(hiddenIds);
  return options.filter((o) => !hide.has(o.value));
}

