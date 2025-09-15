// src/app/api/class-series/[seriesId]/extend/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { DayOfWeek } from "@prisma/client";
import { normalizeMarkAsConflicted } from "@/lib/conflict-types";

type BranchVacation = { startDate: Date; endDate: Date; isRecurring: boolean };

const addMonthsUTC = (date: Date, months: number): Date => {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const nd = new Date(Date.UTC(y, m + months, d, 0, 0, 0, 0));
  return nd;
};

const combineDateAndTimeUTC = (date: Date, time: Date): { start: Date; end?: Date } => {
  const sh = time.getUTCHours();
  const sm = time.getUTCMinutes();
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), sh, sm, 0, 0));
  return { start };
};

// Compare only by minutes-from-midnight to avoid DATE anchor mismatches
const toMin = (d: Date) => d.getUTCHours() * 60 + d.getUTCMinutes();
const overlapsByMinutes = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => {
  const as = toMin(aStart);
  const ae = toMin(aEnd);
  const bs = toMin(bStart);
  const be = toMin(bEnd);
  return bs < ae && be > as; // [bs,be) intersects [as,ae)
};

// Helpers for availability/absence checks
type Slot = { startM: number; endM: number };
const hm = (d: Date) => d.getUTCHours() * 60 + d.getUTCMinutes();
const getDayOfWeek = (date: Date): DayOfWeek => {
  const days: DayOfWeek[] = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];
  return days[date.getUTCDay()];
};

const toSlots = (records: Array<{ fullDay: boolean | null; startTime: Date | null; endTime: Date | null }>): Slot[] => {
  const slots: Slot[] = [];
  for (const r of records) {
    if (r.fullDay) {
      slots.push({ startM: 0, endM: 24 * 60 - 1 });
    } else if (r.startTime && r.endTime) {
      slots.push({ startM: hm(r.startTime), endM: hm(r.endTime) });
    }
  }
  return slots;
};

const mergeSlots = (slots: Slot[]): Slot[] => {
  if (!slots.length) return [];
  const s = [...slots].sort((a, b) => a.startM - b.startM);
  const out: Slot[] = [s[0]];
  for (let i = 1; i < s.length; i++) {
    const last = out[out.length - 1];
    const cur = s[i];
    if (cur.startM <= last.endM) {
      last.endM = Math.max(last.endM, cur.endM);
    } else {
      out.push({ ...cur });
    }
  }
  return out;
};

const subtractSlots = (base: Slot[], subtract: Slot[]): Slot[] => {
  if (!base.length) return [];
  if (!subtract.length) return mergeSlots(base);
  let rem = mergeSlots(base);
  const subs = mergeSlots(subtract);
  for (const sub of subs) {
    const next: Slot[] = [];
    for (const b of rem) {
      if (sub.endM <= b.startM || sub.startM >= b.endM) {
        next.push(b);
        continue;
      }
      if (sub.startM <= b.startM && sub.endM >= b.endM) {
        continue;
      }
      if (sub.startM <= b.startM && sub.endM < b.endM) {
        next.push({ startM: sub.endM, endM: b.endM });
        continue;
      }
      if (sub.startM > b.startM && sub.endM >= b.endM) {
        next.push({ startM: b.startM, endM: sub.startM });
        continue;
      }
      if (sub.startM > b.startM && sub.endM < b.endM) {
        next.push({ startM: b.startM, endM: sub.startM });
        next.push({ startM: sub.endM, endM: b.endM });
      }
    }
    rem = mergeSlots(next);
    if (!rem.length) break;
  }
  return rem;
};

type CacheKey = string; // `${userId}|${YYYY-MM-DD}`
const availCache = new Map<CacheKey, Slot[]>();
const absenceCache = new Map<CacheKey, boolean>();

function keyFor(userId: string, date: Date): CacheKey {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${userId}|${y}-${m}-${d}`;
}

async function getAvailabilitySlotsForUser(userId: string, date: Date): Promise<Slot[]> {
  const k = keyFor(userId, date);
  const cached = availCache.get(k);
  if (cached) return cached;

  const [exceptions, regular, absences] = await Promise.all([
    prisma.userAvailability.findMany({
      where: { userId, type: "EXCEPTION", status: "APPROVED", date },
      select: { fullDay: true, startTime: true, endTime: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.userAvailability.findMany({
      where: { userId, type: "REGULAR", status: "APPROVED", dayOfWeek: getDayOfWeek(date) },
      select: { fullDay: true, startTime: true, endTime: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.userAvailability.findMany({
      where: { userId, type: "ABSENCE", status: "APPROVED", date },
      select: { fullDay: true, startTime: true, endTime: true },
      orderBy: { startTime: "asc" },
    }),
  ]);

  const base = toSlots(exceptions.length ? exceptions : regular);
  const minusAbsence = subtractSlots(base, toSlots(absences));
  const merged = mergeSlots(minusAbsence);
  availCache.set(k, merged);
  return merged;
}

async function hasAbsenceOverlap(userId: string, start: Date, end: Date, date: Date): Promise<boolean> {
  const k = keyFor(userId, date);
  const cached = absenceCache.get(k);
  if (cached !== undefined) return cached;

  const absences = await prisma.userAvailability.findMany({
    where: { userId, type: "ABSENCE", status: "APPROVED", date },
    select: { fullDay: true, startTime: true, endTime: true },
  });
  if (!absences.length) { absenceCache.set(k, false); return false; }
  const sM = hm(start);
  const eM = hm(end);
  for (const a of absences) {
    if (a.fullDay) return true;
    if (a.startTime && a.endTime) {
      const as = hm(a.startTime);
      const ae = hm(a.endTime);
      if (sM < ae && eM > as) return true;
    }
  }
  absenceCache.set(k, false);
  return false;
}

const getBranchVacations = async (branchId: string): Promise<BranchVacation[]> => {
  return prisma.vacation.findMany({
    where: { branchId },
    select: { startDate: true, endDate: true, isRecurring: true },
  });
};

const hasVacationConflictCached = (date: Date, vacations: BranchVacation[]): boolean => {
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
        if (targetMD >= startMD || targetMD <= endMD) return true;
      }
    }
  }
  return false;
};

export const POST = withBranchAccess(["ADMIN", "STAFF"], async (request: NextRequest, session, selectedBranchId) => {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const seriesId = parts[parts.length - 2]; // .../class-series/{seriesId}/extend
    if (!seriesId) {
      return NextResponse.json({ error: "seriesId is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const months = Math.max(1, Math.min(12, Number(body?.months ?? 1)));
    const sessionActions: Array<{ date: string; action: 'SKIP' | 'FORCE_CREATE' | 'USE_ALTERNATIVE'; alternativeStartTime?: string; alternativeEndTime?: string; }>
      = Array.isArray(body?.sessionActions) ? body.sessionActions : [];
    const actionMap = new Map<string, { action: string; alternativeStartTime?: string; alternativeEndTime?: string }>();
    for (const a of sessionActions) actionMap.set(a.date, a);

    const series = await prisma.classSeries.findUnique({ where: { seriesId } });
    if (!series) {
      return NextResponse.json({ error: "Series not found" }, { status: 404 });
    }

    // Branch access for non-admins
    if (session.user?.role !== "ADMIN") {
      if (series.branchId && series.branchId !== selectedBranchId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Prevent special class types (spec)
    if (series.classTypeId) {
      try {
        // Walk hierarchy to detect 特別授業
        let currentId: string | null | undefined = series.classTypeId;
        for (let i = 0; i < 10 && currentId; i++) {
          const ct: { name: string; parentId: string | null } | null = await prisma.classType.findUnique({ where: { classTypeId: currentId }, select: { name: true, parentId: true } });
          if (!ct) break;
          if (ct.name === "特別授業") {
            return NextResponse.json({ error: "Special class types are not supported for series generation" }, { status: 400 });
          }
          currentId = ct.parentId;
        }
      } catch {
        // ignore, treat as not special
      }
    }

    // Disallow generation when series is not ACTIVE
    if (series.status && series.status !== 'ACTIVE') {
      return NextResponse.json({ error: `Series status is ${series.status}; generation is paused/disabled` }, { status: 400 });
    }

    // Determine generation window
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const startBaseline = series.lastGeneratedThrough ? new Date(series.lastGeneratedThrough) : new Date(series.startDate);
    startBaseline.setUTCHours(0, 0, 0, 0);
    // Start from the day after lastGeneratedThrough (if present), else series.startDate
    let fromDate = series.lastGeneratedThrough ? new Date(startBaseline.getTime() + 24 * 3600 * 1000) : startBaseline;
    // Always respect series.startDate and today as lower bounds
    const startBound = new Date(series.startDate); startBound.setUTCHours(0,0,0,0);
    if (fromDate < startBound) fromDate = startBound;
    if (fromDate < today) fromDate = today;

    // Respect series endDate
    const hardEnd = series.endDate ? new Date(series.endDate) : null;
    if (hardEnd) hardEnd.setUTCHours(23, 59, 59, 999);

    let toDate = addMonthsUTC(fromDate, months);
    toDate.setUTCHours(23, 59, 59, 999);
    if (hardEnd && toDate > hardEnd) toDate = hardEnd;

    if (hardEnd && fromDate > hardEnd) {
      // If we're entirely past the end, mark series as ENDED for clarity
      await prisma.classSeries.update({ where: { seriesId }, data: { status: 'ENDED' } }).catch(() => {});
      return NextResponse.json({ error: "Series endDate is in the past; nothing to generate" }, { status: 400 });
    }

    // Build candidate dates matching series.daysOfWeek
    const dowsRaw = series.daysOfWeek as unknown;
    const dows: number[] = Array.isArray(dowsRaw) ? dowsRaw.map((n: any) => Number(n)).filter((n: any) => Number.isFinite(n)) : [];
    if (dows.length === 0) {
      return NextResponse.json({ error: "Series daysOfWeek not configured" }, { status: 400 });
    }

    const candidateDates: Date[] = [];
    for (let d = new Date(fromDate); d <= toDate; d = new Date(d.getTime() + 24 * 3600 * 1000)) {
      if (dows.includes(d.getUTCDay())) {
        candidateDates.push(new Date(d));
      }
    }

    if (candidateDates.length === 0) {
      return NextResponse.json({ count: 0, skipped: 0, message: "No matching days in range" }, { status: 200 });
    }

    const vacations = series.branchId ? await getBranchVacations(series.branchId) : [];

    // Prefetch same-day sessions for overlap checks
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
      select: { date: true, startTime: true, endTime: true, teacherId: true, studentId: true, boothId: true },
    });

    const sessionsByDate = new Map<string, typeof sameDaySessions>();
    const fmt = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    for (const s of sameDaySessions) {
      const k = fmt(s.date);
      const arr = sessionsByDate.get(k) || [];
      arr.push(s);
      sessionsByDate.set(k, arr);
    }

    const created: string[] = [];
    const skipped: { date: string; reason: string }[] = [];
    const conflicted: { date: string; reasons: string[]; cancelled?: boolean }[] = [];
    const softWarnings: { date: string; reasons: string[] }[] = [];

    const sh = series.startTime.getUTCHours();
    const sm = series.startTime.getUTCMinutes();
    const eh = series.endTime.getUTCHours();
    const em = series.endTime.getUTCMinutes();

    for (const date of candidateDates) {
      if (series.branchId && hasVacationConflictCached(date, vacations)) {
        skipped.push({ date: fmt(date), reason: "VACATION" });
        continue;
      }

      let start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), sh, sm, 0, 0));
      let end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), eh, em, 0, 0));
      const duration = series.duration ?? Math.round((end.getTime() - start.getTime()) / (1000 * 60));

      const k = fmt(date);
      const existing = sessionsByDate.get(k) || [];
      const conflictReasons: string[] = [];
      let cancelForTeacherAbsence = false;
      let cancelForStudentAbsence = false;

      // Overlap checks (create anyway, mark conflict)
      for (const s of existing) {
        if (!overlapsByMinutes(start, end, s.startTime, s.endTime)) continue;
        if (series.boothId && s.boothId === series.boothId) conflictReasons.push("BOOTH_CONFLICT");
        if (series.teacherId && s.teacherId === series.teacherId) conflictReasons.push("TEACHER_CONFLICT");
        if (series.studentId && s.studentId === series.studentId) conflictReasons.push("STUDENT_CONFLICT");
      }

      // Availability mismatch checks
      const policy = (series.conflictPolicy as any) || {};
      const allowOutside = policy.allowOutsideAvailability || {};
      const mark = normalizeMarkAsConflicted(policy.markAsConflicted);
      if (series.teacherId) {
        const slots = await getAvailabilitySlotsForUser(series.teacherId, date);
        const inside = slots.some((sl) => sl.startM <= hm(start) && hm(end) <= sl.endM);
        if (!inside && !allowOutside.teacher) {
          const reason = slots.length === 0 ? "TEACHER_UNAVAILABLE" : "TEACHER_WRONG_TIME";
          if (mark[reason]) conflictReasons.push(reason);
          else softWarnings.push({ date: k, reasons: [reason] });
        }
        // Teacher absence → cancel
        cancelForTeacherAbsence = await hasAbsenceOverlap(series.teacherId, start, end, date);
      }
      if (series.studentId) {
        const slots = await getAvailabilitySlotsForUser(series.studentId, date);
        const inside = slots.some((sl) => sl.startM <= hm(start) && hm(end) <= sl.endM);
        if (!inside && !allowOutside.student) {
          const reason = slots.length === 0 ? "STUDENT_UNAVAILABLE" : "STUDENT_WRONG_TIME";
          if (mark[reason]) conflictReasons.push(reason);
          else softWarnings.push({ date: k, reasons: [reason] });
        }
        // Student absence → cancel
        cancelForStudentAbsence = await hasAbsenceOverlap(series.studentId, start, end, date);
      }

      // NO_SHARED_AVAILABILITY for requested window: both individually available at some time, but no overlap covering the window
      if (series.teacherId && series.studentId) {
        const t = await getAvailabilitySlotsForUser(series.teacherId, date);
        const s = await getAvailabilitySlotsForUser(series.studentId, date);
        const teacherHasAny = t.length > 0;
        const studentHasAny = s.length > 0;
        if (teacherHasAny && studentHasAny) {
          const reqS = hm(start);
          const reqE = hm(end);
          const covers = (arr: Slot[]) => arr.some((sl) => sl.startM <= reqS && reqE <= sl.endM);
          const tCovers = covers(t);
          const sCovers = covers(s);
          let bothCoverWindow = false;
          if (tCovers && sCovers) {
            // Both cover individually; ensure overlap covers full window
            bothCoverWindow = t.some((ta) => s.some((sb) => Math.max(ta.startM, sb.startM) <= reqS && Math.min(ta.endM, sb.endM) >= reqE));
          }
          if (!bothCoverWindow && (tCovers || sCovers)) {
            if (mark["NO_SHARED_AVAILABILITY"]) conflictReasons.push("NO_SHARED_AVAILABILITY");
            else softWarnings.push({ date: k, reasons: ["NO_SHARED_AVAILABILITY"] });
          }
        }
      }

      // Apply sessionAction overrides (SKIP/FORCE/USE_ALTERNATIVE)
      const userAction = actionMap.get(k);
      if (userAction?.action === 'SKIP') {
        skipped.push({ date: k, reason: 'USER_SKIP' });
        continue;
      }
      if (userAction?.action === 'USE_ALTERNATIVE' && userAction.alternativeStartTime && userAction.alternativeEndTime) {
        const [ash, asm] = userAction.alternativeStartTime.split(':').map(Number);
        const [aeh, aem] = userAction.alternativeEndTime.split(':').map(Number);
        const nStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), ash, asm, 0, 0));
        const nEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), aeh, aem, 0, 0));
        // Re-run overlap marking using alternative (no re-checking absences/vacation here; relies on preview)
        conflictReasons.length = 0;
        for (const s of existing) {
          if (!overlapsByMinutes(nStart, nEnd, s.startTime, s.endTime)) continue;
          if (series.boothId && s.boothId === series.boothId) conflictReasons.push('BOOTH_CONFLICT');
          if (series.teacherId && s.teacherId === series.teacherId) conflictReasons.push('TEACHER_CONFLICT');
          if (series.studentId && s.studentId === series.studentId) conflictReasons.push('STUDENT_CONFLICT');
        }
        // Replace times
        start = nStart;
        end = nEnd;
      }

      // Cancel only for explicit ABSENCE cases (teacher or student)
      const shouldCancel = cancelForTeacherAbsence || cancelForStudentAbsence;

      try {
        const cs = await prisma.classSession.create({
          data: {
            classTypeId: series.classTypeId ?? null,
            branchId: series.branchId ?? null,
            boothId: series.boothId ?? null,
            subjectId: series.subjectId ?? null,
            teacherId: series.teacherId ?? null,
            studentId: series.studentId ?? null,
            seriesId,
            date,
            startTime: start,
            endTime: end,
            duration,
            // Do not write conflict details into notes for regular sessions
            notes: series.notes ?? null,
            // Mark statuses
            status: conflictReasons.length ? "CONFLICTED" : "CONFIRMED",
            isCancelled: shouldCancel ? true : false,
            cancellationReason: shouldCancel ? "ADMIN_CANCELLED" : null,
          },
        });
        created.push(cs.classId);
        if (conflictReasons.length) {
          conflicted.push({ date: k, reasons: conflictReasons, cancelled: shouldCancel });
        }
      } catch (e: any) {
        skipped.push({ date: k, reason: "DB_CONSTRAINT" });
      }
    }

    // Update lastGeneratedThrough to the end of attempted window
    const generatedThrough = candidateDates[candidateDates.length - 1];
    // Update lastGeneratedThrough; flip to ENDED if we hit the hard end
    const updates: any = { lastGeneratedThrough: generatedThrough };
    if (hardEnd && generatedThrough.getTime() >= hardEnd.getTime()) {
      updates.status = 'ENDED';
    }
    await prisma.classSeries.update({ where: { seriesId }, data: updates });

    return NextResponse.json({ count: created.length, skipped: skipped.length, conflicts: conflicted.length, createdIds: created, skippedDetails: skipped, conflictDetails: conflicted, softWarnings });
  } catch (error) {
    console.error("Error extending series:", error);
    return NextResponse.json({ error: "Failed to extend series" }, { status: 500 });
  }
});
