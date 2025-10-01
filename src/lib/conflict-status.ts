import { prisma } from "./prisma";
import { getEffectiveSchedulingConfig, toPolicyShape } from "./scheduling-config";
import { hasHardConflict, isMarkedByPolicy } from "./conflict-types";

// Utility: minutes from midnight (UTC)
const minutesUTC = (d: Date) => d.getUTCHours() * 60 + d.getUTCMinutes();

export type SessionCtx = {
  classId: string;
  branchId: string | null;
  date: Date;
  startTime: Date;
  endTime: Date;
  teacherId: string | null;
  studentId: string | null;
  boothId: string | null;
};

function buildTimeOverlapWhere(start: Date, end: Date) {
  return {
    OR: [
      { AND: [{ startTime: { lte: start } }, { endTime: { gt: start } }] },
      { AND: [{ startTime: { lt: end } }, { endTime: { gte: end } }] },
      { AND: [{ startTime: { gte: start } }, { endTime: { lte: end } }] },
    ],
  } as const;
}

/**
 * Decide the next status (CONFIRMED/CONFLICTED) for a given session context.
 * Includes both hard-overlap checks and availability-based policy checks.
 */
export async function decideNextStatusForContext(ctx: SessionCtx): Promise<"CONFIRMED" | "CONFLICTED"> {
  const reasons: Array<{ type: string }> = [];

  // Hard overlaps teacher/student/booth (exclude self)
  if (ctx.teacherId || ctx.studentId || ctx.boothId) {
    const sameDay = await prisma.classSession.findMany({
      where: {
        isCancelled: false,
        date: ctx.date,
        classId: { not: ctx.classId },
        OR: [
          ctx.teacherId ? { teacherId: ctx.teacherId } : undefined,
          ctx.studentId ? { studentId: ctx.studentId } : undefined,
          ctx.boothId ? { boothId: ctx.boothId } : undefined,
        ].filter(Boolean) as any,
      },
      select: { startTime: true, endTime: true, teacherId: true, studentId: true, boothId: true },
    });
    const reqStartM = minutesUTC(ctx.startTime);
    const reqEndM = minutesUTC(ctx.endTime);
    for (const s of sameDay) {
      const sStartM = minutesUTC(s.startTime);
      const sEndM = minutesUTC(s.endTime);
      if (!(sStartM < reqEndM && sEndM > reqStartM)) continue;
      if (ctx.teacherId && s.teacherId === ctx.teacherId) reasons.push({ type: "TEACHER_CONFLICT" });
      if (ctx.studentId && s.studentId === ctx.studentId) reasons.push({ type: "STUDENT_CONFLICT" });
      if (ctx.boothId && s.boothId === ctx.boothId) reasons.push({ type: "BOOTH_CONFLICT" });
    }
  }

  // Availability-derived soft reasons (policy-marked)
  try {
    if (ctx.teacherId && ctx.studentId) {
      const [teacher, student] = await Promise.all([
        prisma.teacher.findUnique({ where: { teacherId: ctx.teacherId }, select: { userId: true } }),
        prisma.student.findUnique({ where: { studentId: ctx.studentId }, select: { userId: true } }),
      ]);
      if (teacher?.userId && student?.userId) {
        const { getDetailedSharedAvailability } = await import("./enhanced-availability");
        const avail = await getDetailedSharedAvailability(
          teacher.userId,
          student.userId,
          ctx.date,
          ctx.startTime,
          ctx.endTime,
          { skipVacationCheck: true }
        );
        if (!avail.available) {
          // Determine reason type and honor allowOutsideAvailability
          const eff = await getEffectiveSchedulingConfig(ctx.branchId || undefined);
          const policy = toPolicyShape(eff);
          const allowOutside = policy.allowOutsideAvailability || { teacher: false, student: false };
          let t: string = "NO_SHARED_AVAILABILITY";
          if (!avail.user1.available) t = avail.user1.conflictType === "UNAVAILABLE" ? "TEACHER_UNAVAILABLE" : "TEACHER_WRONG_TIME";
          else if (!avail.user2.available) t = avail.user2.conflictType === "UNAVAILABLE" ? "STUDENT_UNAVAILABLE" : "STUDENT_WRONG_TIME";
          const isTeacherType = t === "TEACHER_UNAVAILABLE" || t === "TEACHER_WRONG_TIME";
          const isStudentType = t === "STUDENT_UNAVAILABLE" || t === "STUDENT_WRONG_TIME";
          if (!((isTeacherType && allowOutside.teacher) || (isStudentType && allowOutside.student))) {
            reasons.push({ type: t });
          }
        }
      }
    }
  } catch {
    // Availability failures should not block status computation
  }

  // Resolve next status
  if (hasHardConflict(reasons)) return "CONFLICTED";
  const eff = await getEffectiveSchedulingConfig(ctx.branchId || undefined);
  const policy = toPolicyShape(eff);
  return isMarkedByPolicy(reasons, policy.markAsConflicted) ? "CONFLICTED" : "CONFIRMED";
}

/**
 * Load a session by id, recompute its status, and persist if changed.
 * Returns the updated status (or null if not found).
 */
export async function recomputeAndUpdateSessionStatus(classId: string): Promise<"CONFIRMED" | "CONFLICTED" | null> {
  const s = await prisma.classSession.findUnique({ where: { classId }, select: { classId: true, branchId: true, date: true, startTime: true, endTime: true, teacherId: true, studentId: true, boothId: true, status: true, isCancelled: true } });
  if (!s) return null;
  if (s.isCancelled) return s.status as any;
  const ctx: SessionCtx = {
    classId: s.classId,
    branchId: s.branchId,
    date: s.date as Date,
    startTime: s.startTime as Date,
    endTime: s.endTime as Date,
    teacherId: s.teacherId,
    studentId: s.studentId,
    boothId: s.boothId,
  };
  const next = await decideNextStatusForContext(ctx);
  if (next !== s.status) {
    await prisma.classSession.update({ where: { classId }, data: { status: next } });
  }
  return next;
}

/**
 * Recompute neighbor statuses when a session moves or changes resources.
 * Only same-date sessions sharing teacher/student/booth and overlapping the
 * old or new time window are affected.
 */
export async function recomputeNeighborsForChange(oldCtx: SessionCtx | null, newCtx: SessionCtx | null): Promise<void> {
  const ids = new Set<string>();

  async function collect(ctx: SessionCtx) {
    const where: any = {
      isCancelled: false,
      date: ctx.date,
      classId: { not: ctx.classId },
      ...buildTimeOverlapWhere(ctx.startTime, ctx.endTime),
      OR: [
        ctx.teacherId ? { teacherId: ctx.teacherId } : undefined,
        ctx.studentId ? { studentId: ctx.studentId } : undefined,
        ctx.boothId ? { boothId: ctx.boothId } : undefined,
      ].filter(Boolean),
    };
    if (!where.OR || where.OR.length === 0) return;
    const neighbors = await prisma.classSession.findMany({ where, select: { classId: true } });
    for (const n of neighbors) ids.add(n.classId);
  }

  if (oldCtx) await collect(oldCtx);
  if (newCtx) await collect(newCtx);

  // Recompute each neighbor (sequential to avoid DB thrash; counts are small)
  for (const id of ids) {
    try { await recomputeAndUpdateSessionStatus(id); } catch {}
  }
}

/**
 * Convenience: given contexts for sessions that were removed (e.g., cancelled),
 * recompute neighbors as if those sessions disappeared from the grid.
 */
export async function recomputeNeighborsForCancelledContexts(ctxs: SessionCtx[]): Promise<void> {
  for (const ctx of ctxs) {
    try { await recomputeNeighborsForChange(ctx, null); } catch {}
  }
}

/**
 * Convenience: given contexts for sessions that were (re)added (e.g., reactivated),
 * recompute neighbors and the sessions themselves using the new placement.
 */
export async function recomputeNeighborsForReactivatedContexts(ctxs: SessionCtx[]): Promise<void> {
  for (const ctx of ctxs) {
    try {
      await recomputeNeighborsForChange(null, ctx);
    } catch {}
    try {
      await recomputeAndUpdateSessionStatus(ctx.classId);
    } catch {}
  }
}
