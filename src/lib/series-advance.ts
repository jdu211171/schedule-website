// src/lib/series-advance.ts
// Advanced generation utilities for class series
// Shared between API routes and scripts.

import type { PrismaClient } from "@prisma/client";

export type AdvanceResult = {
  seriesId: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  attempted: number;
  createdConfirmed: number;
  createdConflicted: number;
  skipped: number; // DB constraint or hard-end skips
};

type BranchVacation = { startDate: Date; endDate: Date; isRecurring: boolean };

const fmtYMD = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;

function addDaysUTC(date: Date, days: number): Date {
  const nd = new Date(date.getTime() + days * 24 * 3600 * 1000);
  nd.setUTCHours(0, 0, 0, 0);
  return nd;
}

export function computeAdvanceWindow(
  today: Date,
  lastGeneratedThrough: Date | null,
  startDate: Date,
  endDate: Date | null,
  leadDays: number
) {
  const day0 = new Date(today);
  day0.setUTCHours(0, 0, 0, 0);

  let baseline = lastGeneratedThrough
    ? addDaysUTC(lastGeneratedThrough, 1) // start day after last generated
    : new Date(Math.max(startDate.getTime(), day0.getTime()));
  // Always clamp to startDate and today to respect edited start boundaries
  const startBound = new Date(Math.max(startDate.getTime(), day0.getTime()));
  if (baseline < startBound) baseline = startBound;
  baseline.setUTCHours(0, 0, 0, 0);

  const target = addDaysUTC(day0, Math.max(1, leadDays));
  target.setUTCHours(23, 59, 59, 999);

  const hardEnd = endDate ? new Date(endDate) : null;
  if (hardEnd) {
    hardEnd.setUTCHours(23, 59, 59, 999);
  }
  const to = hardEnd && target > hardEnd ? hardEnd : target;

  return { from: baseline, to };
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

async function getBranchVacations(prisma: PrismaClient, branchId: string) {
  return prisma.vacation.findMany({
    where: { branchId },
    select: { startDate: true, endDate: true, isRecurring: true },
  });
}

function hasVacationConflictCached(date: Date, vacations: BranchVacation[]): boolean {
  const md = (d: Date) => (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  const targetMD = md(date);
  for (const v of vacations) {
    if (!v.isRecurring) {
      if (v.startDate <= date && v.endDate >= date) return true;
    } else {
      const startMD = md(v.startDate);
      const endMD = md(v.endDate);
      if (startMD <= endMD) {
        if (targetMD >= startMD && targetMD <= endMD) return true;
      } else {
        // wrap-around (e.g., Dec 25 - Jan 3)
        if (targetMD >= startMD || targetMD <= endMD) return true;
      }
    }
  }
  return false;
}

export async function advanceGenerateForSeries(
  prisma: PrismaClient,
  seriesId: string,
  opts?: { leadDays?: number }
): Promise<AdvanceResult> {
  const leadDays = Math.max(1, opts?.leadDays ?? 30);

  const series = await prisma.classSeries.findUnique({ where: { seriesId } });
  if (!series) throw new Error("Series not found");

  // Reject special class types (walk hierarchy to detect 特別授業)
  if (series.classTypeId) {
    try {
      let currentId: string | null | undefined = series.classTypeId;
      for (let i = 0; i < 10 && currentId; i++) {
        const ct: { name: string; parentId: string | null } | null =
          await prisma.classType.findUnique({
            where: { classTypeId: currentId },
            select: { name: true, parentId: true },
          });
        if (!ct) break;
        if (ct.name === "特別授業") {
          // Nothing to do; treat as no-op
          return {
            seriesId,
            fromDate: fmtYMD(series.startDate),
            toDate: fmtYMD(series.lastGeneratedThrough ?? series.startDate),
            attempted: 0,
            createdConfirmed: 0,
            createdConflicted: 0,
            skipped: 0,
          };
        }
        currentId = ct.parentId;
      }
    } catch {
      // ignore
    }
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const { from, to } = computeAdvanceWindow(
    today,
    series.lastGeneratedThrough,
    series.startDate,
    series.endDate,
    leadDays
  );

  if (series.endDate && from > series.endDate) {
    // Already beyond hard end → mark ENDED for clarity
    await prisma.classSeries.update({ where: { seriesId: series.seriesId }, data: { status: 'ENDED' } }).catch(() => {});
    return {
      seriesId,
      fromDate: fmtYMD(from),
      toDate: fmtYMD(to),
      attempted: 0,
      createdConfirmed: 0,
      createdConflicted: 0,
      skipped: 0,
    };
  }

  // Collect candidate dates by series.daysOfWeek
  const dowsRaw = series.daysOfWeek as unknown;
  const dows: number[] = Array.isArray(dowsRaw)
    ? dowsRaw.map((n: any) => Number(n)).filter((n: any) => Number.isFinite(n))
    : [];
  if (dows.length === 0) {
    return {
      seriesId,
      fromDate: fmtYMD(from),
      toDate: fmtYMD(to),
      attempted: 0,
      createdConfirmed: 0,
      createdConflicted: 0,
      skipped: 0,
    };
  }

  const candidateDates: Date[] = [];
  for (let d = new Date(from); d <= to; d = addDaysUTC(d, 1)) {
    if (dows.includes(d.getUTCDay())) candidateDates.push(new Date(d));
  }
  if (candidateDates.length === 0) {
    return {
      seriesId,
      fromDate: fmtYMD(from),
      toDate: fmtYMD(to),
      attempted: 0,
      createdConfirmed: 0,
      createdConflicted: 0,
      skipped: 0,
    };
  }

  const vacations = series.branchId
    ? await getBranchVacations(prisma, series.branchId)
    : [];

  // Prefetch same-day sessions to check overlap quickly
  const sameDaySessions = await prisma.classSession.findMany({
    where: {
      isCancelled: false,
      date: { in: candidateDates },
      OR: [
        series.teacherId ? { teacherId: series.teacherId } : undefined,
        series.studentId ? { studentId: series.studentId } : undefined,
        series.boothId ? { boothId: series.boothId } : undefined,
      ].filter(Boolean) as any,
    },
    select: {
      date: true,
      startTime: true,
      endTime: true,
      teacherId: true,
      studentId: true,
      boothId: true,
    },
  });

  const sessionsByDate = new Map<string, typeof sameDaySessions>();
  for (const s of sameDaySessions) {
    const k = fmtYMD(s.date);
    const arr = sessionsByDate.get(k) || [];
    arr.push(s);
    sessionsByDate.set(k, arr);
  }

  const sh = series.startTime.getUTCHours();
  const sm = series.startTime.getUTCMinutes();
  const eh = series.endTime.getUTCHours();
  const em = series.endTime.getUTCMinutes();

  let createdConfirmed = 0;
  let createdConflicted = 0;
  let skipped = 0;
  const attempted = candidateDates.length;

  for (const date of candidateDates) {
    const start = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        sh,
        sm,
        0,
        0
      )
    );
    const end = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        eh,
        em,
        0,
        0
      )
    );
    const duration = series.duration ?? Math.round((end.getTime() - start.getTime()) / (1000 * 60));

    const k = fmtYMD(date);
    const existing = sessionsByDate.get(k) || [];
    const timeConflict = existing.some((s) => overlaps(start, end, s.startTime, s.endTime));
    const vacationConflict = series.branchId
      ? hasVacationConflictCached(date, vacations)
      : false;

    const isConflict = timeConflict || vacationConflict;

    try {
      await prisma.classSession.create({
        data: {
          classTypeId: series.classTypeId ?? null,
          branchId: series.branchId ?? null,
          boothId: series.boothId ?? null,
          subjectId: series.subjectId ?? null,
          teacherId: series.teacherId ?? null,
          studentId: series.studentId ?? null,
          seriesId: series.seriesId,
          date,
          startTime: start,
          endTime: end,
          duration,
          notes: series.notes ?? null,
          status: isConflict ? "CONFLICTED" : "CONFIRMED",
          // For conflicting placeholders, mark cancelled=true so calendars won’t show them
          isCancelled: isConflict ? true : false,
        },
      });
      if (isConflict) createdConflicted++; else createdConfirmed++;
    } catch (_) {
      // Unique constraint or other DB guard; count as skipped
      skipped++;
    }
  }

  // Update lastGeneratedThrough; flip to ENDED when hitting the hard end
  const last = candidateDates[candidateDates.length - 1];
  const updateData: any = { lastGeneratedThrough: last };
  if (series.endDate && last.getTime() >= series.endDate.getTime()) {
    updateData.status = 'ENDED';
  }
  await prisma.classSeries.update({ where: { seriesId: series.seriesId }, data: updateData });

  return {
    seriesId,
    fromDate: fmtYMD(candidateDates[0]),
    toDate: fmtYMD(candidateDates[candidateDates.length - 1]),
    attempted,
    createdConfirmed,
    createdConflicted,
    skipped,
  };
}
