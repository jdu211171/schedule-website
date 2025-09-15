// src/app/api/class-series/[seriesId]/extend/preview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format, addMonths } from "date-fns";

type ConflictType =
  | "STUDENT_UNAVAILABLE"
  | "TEACHER_UNAVAILABLE"
  | "STUDENT_WRONG_TIME"
  | "TEACHER_WRONG_TIME"
  | "NO_SHARED_AVAILABILITY"
  | "BOOTH_CONFLICT"
  | "TEACHER_CONFLICT"
  | "STUDENT_CONFLICT";

type TimeSlot = { startTime: string; endTime: string };

type ConflictInfo = {
  date: string;
  dayOfWeek: string;
  type: ConflictType;
  details: string;
  participant?: { id: string; name: string; role: "student" | "teacher" };
  sharedAvailableSlots: TimeSlot[];
  teacherSlots: TimeSlot[];
  studentSlots: TimeSlot[];
  availabilityStrategy?: string;
  availableSlots?: TimeSlot[];
};

const dayName = (d: Date) =>
  [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ][d.getUTCDay()];

const toMin = (d: Date) => d.getUTCHours() * 60 + d.getUTCMinutes();
const overlapsByMinutes = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => {
  const as = toMin(aStart);
  const ae = toMin(aEnd);
  const bs = toMin(bStart);
  const be = toMin(bEnd);
  return bs < ae && be > as;
};

const minutesToHHmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export const GET = withBranchAccess(["ADMIN", "STAFF"], async (request: NextRequest, session, selectedBranchId) => {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const seriesId = parts[parts.length - 3]; // .../class-series/{seriesId}/extend/preview
    const months = Math.max(1, Math.min(6, Number(url.searchParams.get("months") ?? 1)));

    if (!seriesId) {
      return NextResponse.json({ error: "seriesId is required" }, { status: 400 });
    }

    const series = await prisma.classSeries.findUnique({ where: { seriesId } });
    if (!series) return NextResponse.json({ error: "Series not found" }, { status: 404 });
    if (session.user?.role !== "ADMIN") {
      if (series.branchId && series.branchId !== selectedBranchId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Determine range (same as extend)
    const today = new Date(); today.setUTCHours(0,0,0,0);
    const startBaseline = series.lastGeneratedThrough ? new Date(series.lastGeneratedThrough) : new Date(series.startDate);
    startBaseline.setUTCHours(0,0,0,0);
    let fromDate = series.lastGeneratedThrough ? new Date(startBaseline.getTime() + 86400000) : startBaseline;
    const minBound = new Date(series.startDate); minBound.setUTCHours(0,0,0,0);
    if (fromDate < minBound) fromDate = minBound;
    if (fromDate < today) fromDate = today;
    let toDate = addMonths(fromDate, months); toDate.setUTCHours(23,59,59,999);
    if (series.endDate) {
      const hardEnd = new Date(series.endDate); hardEnd.setUTCHours(23,59,59,999);
      if (toDate > hardEnd) toDate = hardEnd;
      if (fromDate > hardEnd) {
        return NextResponse.json({
          conflicts: [],
          conflictsByDate: {},
          message: "Series endDate is in the past; nothing to generate",
          requiresConfirmation: false,
          summary: { totalSessions: 0, sessionsWithConflicts: 0, validSessions: 0 }
        }, { status: 200 });
      }
    }

    // Build candidate dates matching daysOfWeek
    const dowsRaw = series.daysOfWeek as any;
    const dows: number[] = Array.isArray(dowsRaw) ? dowsRaw.map(Number).filter(Number.isFinite) : [];
    const candidates: Date[] = [];
    for (let d = new Date(fromDate); d <= toDate; d = new Date(d.getTime() + 86400000)) {
      if (dows.includes(d.getUTCDay())) candidates.push(new Date(d));
    }
    if (candidates.length === 0) {
      return NextResponse.json({ conflicts: [], conflictsByDate: {}, message: "No matching days in range", requiresConfirmation: false, summary: { totalSessions: 0, sessionsWithConflicts: 0, validSessions: 0 } });
    }

    // Prefetch same-day sessions for overlaps
    const sameDay = await prisma.classSession.findMany({
      where: {
        isCancelled: false,
        date: { in: candidates },
        OR: [
          series.teacherId ? { teacherId: series.teacherId } : undefined,
          series.studentId ? { studentId: series.studentId } : undefined,
          series.boothId ? { boothId: series.boothId } : undefined,
        ].filter(Boolean) as any,
      },
      select: { date: true, startTime: true, endTime: true, teacherId: true, studentId: true, boothId: true },
    });
    const byDate = new Map<string, typeof sameDay>();
    const fmt = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
    for (const s of sameDay) {
      const k = fmt(s.date);
      const arr = byDate.get(k) || [];
      arr.push(s);
      byDate.set(k, arr);
    }

    // Compute start/end minutes for series time
    const sh = series.startTime.getUTCHours();
    const sm = series.startTime.getUTCMinutes();
    const eh = series.endTime.getUTCHours();
    const em = series.endTime.getUTCMinutes();

    // Fetch userIds and names for participant labeling
    const [teacher, student] = await Promise.all([
      series.teacherId ? prisma.teacher.findUnique({ where: { teacherId: series.teacherId }, select: { userId: true, name: true } }) : Promise.resolve(null),
      series.studentId ? prisma.student.findUnique({ where: { studentId: series.studentId }, select: { userId: true, name: true } }) : Promise.resolve(null),
    ]);

    // Helper to get availability slots as HH:mm ranges
    async function slotsForUser(userId?: string | null, date?: Date): Promise<TimeSlot[]> {
      if (!userId || !date) return [];
      const recs = await prisma.userAvailability.findMany({
        where: {
          userId,
          status: "APPROVED",
          OR: [ { date }, { dayOfWeek: dayName(date) as any } ],
          NOT: { type: "ABSENCE" },
        },
        select: { fullDay: true, startTime: true, endTime: true },
        orderBy: { startTime: "asc" }
      });
      const slots: TimeSlot[] = [];
      for (const r of recs) {
        if (r.fullDay) slots.push({ startTime: "00:00", endTime: "23:59" });
        else if (r.startTime && r.endTime) {
          slots.push({ startTime: minutesToHHmm(toMin(r.startTime)), endTime: minutesToHHmm(toMin(r.endTime)) });
        }
      }
      return slots;
    }

    const conflicts: ConflictInfo[] = [];

    for (const date of candidates) {
      const dateStr = fmt(date);
      const day = dayName(date);
      const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), sh, sm, 0, 0));
      const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), eh, em, 0, 0));

      // Overlaps
      const sessions = byDate.get(dateStr) || [];
      const added = new Set<string>();
      for (const s of sessions) {
        if (!overlapsByMinutes(start, end, s.startTime, s.endTime)) continue;
        if (series.teacherId && s.teacherId === series.teacherId && !added.has("TEACHER_CONFLICT")) {
          conflicts.push({ date: dateStr, dayOfWeek: day, type: "TEACHER_CONFLICT", details: "同一講師の同時間帯に別の授業が存在します。", participant: teacher ? { id: series.teacherId!, name: teacher.name, role: "teacher" } : undefined, sharedAvailableSlots: [], teacherSlots: [], studentSlots: [] });
          added.add("TEACHER_CONFLICT");
        }
        if (series.studentId && s.studentId === series.studentId && !added.has("STUDENT_CONFLICT")) {
          conflicts.push({ date: dateStr, dayOfWeek: day, type: "STUDENT_CONFLICT", details: "同一生徒の同時間帯に別の授業が存在します。", participant: student ? { id: series.studentId!, name: student.name, role: "student" } : undefined, sharedAvailableSlots: [], teacherSlots: [], studentSlots: [] });
          added.add("STUDENT_CONFLICT");
        }
        if (series.boothId && s.boothId === series.boothId && !added.has("BOOTH_CONFLICT")) {
          conflicts.push({ date: dateStr, dayOfWeek: day, type: "BOOTH_CONFLICT", details: "同一ブースが同時間帯に予約済みです。", sharedAvailableSlots: [], teacherSlots: [], studentSlots: [] });
          added.add("BOOTH_CONFLICT");
        }
      }

      // Availability (soft) for teacher/student
      const tSlots = await slotsForUser(teacher?.userId, date);
      const sSlots = await slotsForUser(student?.userId, date);
      const reqS = sh*60+sm;
      const reqE = eh*60+em;
      const s2m = (s: string) => parseInt(s.slice(0,2))*60 + parseInt(s.slice(3,5));
      const inTeacher = tSlots.some((sl) => reqS >= s2m(sl.startTime) && reqE <= s2m(sl.endTime));
      const inStudent = sSlots.some((sl) => reqS >= s2m(sl.startTime) && reqE <= s2m(sl.endTime));
      if (teacher && !inTeacher) {
        const reason = tSlots.length === 0 ? "TEACHER_UNAVAILABLE" : "TEACHER_WRONG_TIME";
        conflicts.push({ date: dateStr, dayOfWeek: day, type: reason, details: `${teacher.name}先生は${reason === 'TEACHER_UNAVAILABLE' ? 'この日に利用可能時間が設定されていません' : '指定された時間帯に利用できません。'}`, participant: { id: series.teacherId!, name: teacher.name, role: "teacher" }, sharedAvailableSlots: [], teacherSlots: tSlots, studentSlots: sSlots });
      }
      // NO_SHARED_AVAILABILITY (preview only, informational)
      if (teacher && student) {
        const tCovers = tSlots.some((sl) => reqS >= s2m(sl.startTime) && reqE <= s2m(sl.endTime));
        const sCovers = sSlots.some((sl) => reqS >= s2m(sl.startTime) && reqE <= s2m(sl.endTime));
        let bothCoverWindow = false;
        if (tCovers && sCovers) {
          bothCoverWindow = tSlots.some((ta) => sSlots.some((sb) => Math.max(s2m(ta.startTime), s2m(sb.startTime)) <= reqS && Math.min(s2m(ta.endTime), s2m(sb.endTime)) >= reqE));
        }
        if (!bothCoverWindow && (tCovers || sCovers)) {
          conflicts.push({ date: dateStr, dayOfWeek: day, type: "NO_SHARED_AVAILABILITY", details: "講師と生徒の利用可能時間に重複がありません。別の時間帯をご選択ください。", participant: undefined, sharedAvailableSlots: [], teacherSlots: tSlots, studentSlots: sSlots });
        }
      }
      if (student && !inStudent) {
        const reason = sSlots.length === 0 ? "STUDENT_UNAVAILABLE" : "STUDENT_WRONG_TIME";
        conflicts.push({ date: dateStr, dayOfWeek: day, type: reason, details: `${student.name}さんは${reason === 'STUDENT_UNAVAILABLE' ? 'この日に利用可能時間が設定されていません' : '指定された時間帯に利用できません。'}`, participant: { id: series.studentId!, name: student.name, role: "student" }, sharedAvailableSlots: [], teacherSlots: tSlots, studentSlots: sSlots });
      }
    }

    const conflictsByDate: Record<string, ConflictInfo[]> = conflicts.reduce((acc, c) => {
      (acc[c.date] ||= []).push(c);
      return acc;
    }, {} as Record<string, ConflictInfo[]>);

    const summary = {
      totalSessions: candidates.length,
      sessionsWithConflicts: Object.keys(conflictsByDate).length,
      validSessions: candidates.length - Object.keys(conflictsByDate).length,
    };

    return NextResponse.json({
      conflicts,
      conflictsByDate,
      message: summary.sessionsWithConflicts > 0 ? `繰り返しクラスの作成中に${summary.sessionsWithConflicts}日分で競合が見つかりました。` : "競合は見つかりませんでした。",
      requiresConfirmation: summary.sessionsWithConflicts > 0,
      summary,
    });
  } catch (e) {
    console.error("Series preview error:", e);
    return NextResponse.json({ error: "Failed to preview series extension" }, { status: 500 });
  }
});
