// src/lib/conflict-types.ts
// Central definitions and helpers for schedule conflict types and behaviors.

import type { ConflictInfo as SchemaConflictInfo } from "@/schemas/class-session.schema";

export type ConflictType =
  | SchemaConflictInfo["type"]
  | "TEACHER_CONFLICT"
  | "STUDENT_CONFLICT"
  | "BOOTH_CONFLICT";

// Availability-derived (soft) conflicts, controlled by the UI toggle 「利用可能エラーの表示」
export const AVAILABILITY_ERROR_TYPES = new Set<ConflictType>([
  "TEACHER_UNAVAILABLE",
  "STUDENT_UNAVAILABLE",
  "TEACHER_WRONG_TIME",
  "STUDENT_WRONG_TIME",
  "NO_SHARED_AVAILABILITY",
]);

// Hard overlaps that always surface and mark sessions as CONFLICTED
export const HARD_CONFLICT_TYPES = new Set<ConflictType>([
  "TEACHER_CONFLICT",
  "STUDENT_CONFLICT",
  "BOOTH_CONFLICT",
]);

// Special-cased: VACATION is always auto-skipped by the server; never shown as a conflict to resolve
export const AUTOSKIP_TYPES = new Set<ConflictType>(["VACATION"]);

// Generic shape guard
type AnyConflict = { type: string } & Record<string, unknown>;

export function isHardConflictType(t: string): boolean {
  return HARD_CONFLICT_TYPES.has(t as ConflictType);
}

export function isAvailabilityErrorType(t: string): boolean {
  return AVAILABILITY_ERROR_TYPES.has(t as ConflictType);
}

export function hasHardConflict(
  conflicts: Array<AnyConflict | SchemaConflictInfo>
): boolean {
  return (
    conflicts?.some((c) =>
      isHardConflictType(String((c as AnyConflict).type))
    ) ?? false
  );
}

export function filterByAvailabilityPreference<T extends AnyConflict>(
  conflicts: T[],
  includeAvailabilityErrors: boolean
): T[] {
  if (includeAvailabilityErrors) return conflicts;
  return conflicts.filter((c) => isHardConflictType(c.type));
}

// Default mapping for which types mark sessions as CONFLICTED in series generation.
// VACATION is auto-skipped and intentionally absent here.
export const DEFAULT_MARK_AS_CONFLICTED: Record<string, boolean> = {
  TEACHER_CONFLICT: true,
  STUDENT_CONFLICT: true,
  BOOTH_CONFLICT: true,
  TEACHER_UNAVAILABLE: false,
  STUDENT_UNAVAILABLE: false,
  TEACHER_WRONG_TIME: false,
  STUDENT_WRONG_TIME: false,
  NO_SHARED_AVAILABILITY: false,
};

export type ConflictMarkKey = keyof typeof DEFAULT_MARK_AS_CONFLICTED;
export type MarkAsConflictedMap = Record<ConflictMarkKey, boolean>;

export function normalizeMarkAsConflicted(
  mark?: Partial<Record<ConflictMarkKey, boolean>> | null
): MarkAsConflictedMap {
  const base: MarkAsConflictedMap = {
    ...DEFAULT_MARK_AS_CONFLICTED,
  } as MarkAsConflictedMap;
  if (mark) {
    for (const k of Object.keys(mark) as ConflictMarkKey[]) {
      if (typeof mark[k] === "boolean") base[k] = mark[k] as boolean;
    }
  }
  return base;
}

export function isMarkedByPolicy(
  reasons: { type: string }[],
  mark: Partial<Record<ConflictMarkKey, boolean>> | null | undefined
): boolean {
  const map = normalizeMarkAsConflicted(mark);
  return reasons.some((r) => Boolean(map[r.type]));
}
