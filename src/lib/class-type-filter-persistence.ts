import { ClassTypeFilterState } from "@/types/class-type-filter";

const KEY_PREFIX = "filter:classTypes:";

export function getClassTypeSelection(role: string | undefined): string[] {
  if (typeof window === "undefined") return [];
  const k = KEY_PREFIX + (role || "UNKNOWN");
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ClassTypeFilterState;
    if (Array.isArray(parsed?.selectedClassTypeIds)) return parsed.selectedClassTypeIds;
  } catch {
    // ignore
  }
  return [];
}

export function setClassTypeSelection(role: string | undefined, ids: string[]): void {
  if (typeof window === "undefined") return;
  const k = KEY_PREFIX + (role || "UNKNOWN");
  const state: ClassTypeFilterState = {
    selectedClassTypeIds: Array.from(new Set(ids.filter(Boolean))),
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(k, JSON.stringify(state));
    // Notify other parts of the app (including other mounted tabs/views)
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const ch = new BroadcastChannel('class-type-filter');
        ch.postMessage({ type: 'classTypeSelectionChanged', role: role || 'UNKNOWN', ids: state.selectedClassTypeIds });
        ch.close();
      } catch {}
    }
  } catch {
    // ignore
  }
}
