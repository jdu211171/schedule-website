import { describe, it, expect } from "vitest";
import {
  computeBoothOverlap,
  computeStudentOverlap,
  computeTeacherOverlap,
  type Pos,
} from "@/components/admin-schedule/DayCalendar/overlap-utils";

describe("overlap-utils", () => {
  const sessionA: any = {
    classId: "A",
    boothId: "B1",
    teacherId: "T1",
    studentId: "S1",
    isCancelled: false,
  };
  const sessionB: any = {
    classId: "B",
    boothId: "B1",
    teacherId: "T2",
    studentId: "S2",
    isCancelled: true,
  };
  const sessionC: any = {
    classId: "C",
    boothId: "B1",
    teacherId: "T1",
    studentId: "S3",
    isCancelled: false,
  };
  const sessions = [sessionA, sessionB, sessionC];
  const pos = new Map<string, Pos>([
    ["A", { boothIndex: 0, start: 2, end: 3 }],
    ["B", { boothIndex: 0, start: 2, end: 3 }],
    ["C", { boothIndex: 0, start: 2, end: 3 }],
  ]);

  it("computeBoothOverlap ignores cancelled neighbors", () => {
    expect(computeBoothOverlap(sessionA, sessions, pos)).toBe(true); // overlaps with C
    // If only cancelled neighbor present, should be false
    expect(computeBoothOverlap(sessionA, [sessionA, sessionB], pos)).toBe(
      false
    );
  });

  it("computeTeacherOverlap requires same teacher and ignores cancelled", () => {
    expect(computeTeacherOverlap(sessionA, sessions, pos)).toBe(true); // C shares T1
    expect(computeTeacherOverlap(sessionA, [sessionA, sessionB], pos)).toBe(
      false
    );
  });

  it("computeStudentOverlap requires same student and ignores cancelled", () => {
    const sD: any = {
      classId: "D",
      boothId: "B2",
      teacherId: "T9",
      studentId: "S1",
      isCancelled: false,
    };
    const p2 = new Map<string, Pos>([
      ...pos,
      ["D", { boothIndex: 1, start: 2, end: 3 }],
    ]);
    expect(computeStudentOverlap(sessionA, [sessionA, sD], p2)).toBe(true);
  });
});
