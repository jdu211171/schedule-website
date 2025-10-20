import { describe, it, expect } from "vitest";
import {
  hasHardConflict,
  isHardConflictType,
  isAvailabilityErrorType,
  filterByAvailabilityPreference,
} from "@/lib/conflict-types";

describe("conflict-types helpers", () => {
  it("detects hard conflict types", () => {
    expect(isHardConflictType("TEACHER_CONFLICT")).toBe(true);
    expect(isHardConflictType("STUDENT_CONFLICT")).toBe(true);
    expect(isHardConflictType("BOOTH_CONFLICT")).toBe(true);
    expect(isHardConflictType("TEACHER_UNAVAILABLE")).toBe(false);
  });

  it("detects availability error types", () => {
    expect(isAvailabilityErrorType("TEACHER_UNAVAILABLE")).toBe(true);
    expect(isAvailabilityErrorType("STUDENT_WRONG_TIME")).toBe(true);
    expect(isAvailabilityErrorType("NO_SHARED_AVAILABILITY")).toBe(true);
    expect(isAvailabilityErrorType("BOOTH_CONFLICT")).toBe(false);
  });

  it("hasHardConflict returns true only when a hard conflict exists", () => {
    const conflicts = [
      { type: "TEACHER_UNAVAILABLE" },
      { type: "STUDENT_WRONG_TIME" },
    ];
    expect(hasHardConflict(conflicts)).toBe(false);

    conflicts.push({ type: "BOOTH_CONFLICT" });
    expect(hasHardConflict(conflicts)).toBe(true);
  });

  it("filterByAvailabilityPreference removes availability errors when disabled", () => {
    const conflicts = [
      { type: "TEACHER_UNAVAILABLE" },
      { type: "STUDENT_WRONG_TIME" },
      { type: "BOOTH_CONFLICT" },
    ];
    const filtered = filterByAvailabilityPreference(conflicts, false);
    expect(filtered).toEqual([{ type: "BOOTH_CONFLICT" }]);

    const keepAll = filterByAvailabilityPreference(conflicts, true);
    expect(keepAll.length).toBe(3);
  });
});
