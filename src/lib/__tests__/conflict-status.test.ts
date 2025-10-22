import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as conflict from "../conflict-status";
import { prisma } from "../prisma";

vi.mock("../prisma", async () => {
  const actual = await vi.importActual<any>("../prisma");
  return {
    ...actual,
    prisma: {
      ...actual.prisma,
      classSession: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      teacher: { findUnique: vi.fn() },
      student: { findUnique: vi.fn() },
    },
  };
});

describe("conflict-status helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recomputeNeighborsForChange queries neighbors once for given context", async () => {
    // One neighbor overlapping (we only assert that a neighbor query was attempted)
    (prisma.classSession.findMany as any).mockResolvedValueOnce([
      { classId: "N1" },
    ]);

    const ctx: conflict.SessionCtx = {
      classId: "X",
      branchId: "B",
      date: new Date("2025-01-01T00:00:00Z"),
      startTime: new Date("2025-01-01T09:00:00Z"),
      endTime: new Date("2025-01-01T10:00:00Z"),
      teacherId: "T1",
      studentId: "S1",
      boothId: "BOOTH-1",
    };

    await conflict.recomputeNeighborsForChange(ctx, null);

    expect(prisma.classSession.findMany).toHaveBeenCalledTimes(1);
  });

  it("recomputeNeighborsForCancelledContexts recomputes neighbors for each ctx", async () => {
    // Each ctx should trigger a neighbor query once
    (prisma.classSession.findMany as any).mockResolvedValue([]);
    const ctxs: conflict.SessionCtx[] = [
      {
        classId: "A",
        branchId: "B",
        date: new Date("2025-01-01T00:00:00Z"),
        startTime: new Date("2025-01-01T09:00:00Z"),
        endTime: new Date("2025-01-01T10:00:00Z"),
        teacherId: "T1",
        studentId: "S1",
        boothId: "BOOTH-1",
      },
      {
        classId: "C",
        branchId: "B",
        date: new Date("2025-01-02T00:00:00Z"),
        startTime: new Date("2025-01-02T11:00:00Z"),
        endTime: new Date("2025-01-02T12:00:00Z"),
        teacherId: "T2",
        studentId: "S2",
        boothId: "BOOTH-2",
      },
    ];

    await conflict.recomputeNeighborsForCancelledContexts(ctxs);

    expect(prisma.classSession.findMany).toHaveBeenCalledTimes(2);
  });

  it("recomputeNeighborsForReactivatedContexts triggers neighbor recompute for ctx", async () => {
    (prisma.classSession.findMany as any).mockResolvedValue([]);
    const ctx: conflict.SessionCtx = {
      classId: "R1",
      branchId: "B",
      date: new Date("2025-01-03T00:00:00Z"),
      startTime: new Date("2025-01-03T09:00:00Z"),
      endTime: new Date("2025-01-03T10:00:00Z"),
      teacherId: "T3",
      studentId: "S3",
      boothId: "BOOTH-3",
    };

    await conflict.recomputeNeighborsForReactivatedContexts([ctx]);

    expect(prisma.classSession.findMany).toHaveBeenCalledTimes(1);
  });
});
