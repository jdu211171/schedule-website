// src/app/api/class-series/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Determine if a class type is under the 特別授業 lineage
async function buildSpecialClassTypeChecker() {
  const cache = new Map<string, boolean>();

  const isSpecial = async (classTypeId: string | null | undefined): Promise<boolean> => {
    if (!classTypeId) return false;
    if (cache.has(classTypeId)) return cache.get(classTypeId)!;

    let currentId: string | null | undefined = classTypeId;
    let special = false;
    for (let i = 0; i < 12 && currentId; i++) {
      const ct: { name: string; parentId: string | null } | null = await prisma.classType.findUnique({
        where: { classTypeId: currentId },
        select: { name: true, parentId: true },
      });
      if (!ct) break;
      if (ct.name === "特別授業") {
        special = true;
        break;
      }
      currentId = ct.parentId;
    }
    cache.set(classTypeId, special);
    return special;
  };

  return { isSpecial };
}

export const GET = withBranchAccess(["ADMIN", "STAFF", "TEACHER"], async (request: NextRequest, _session, selectedBranchId) => {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  const teacherId = searchParams.get("teacherId");
  const daysParam = searchParams.get("days") ?? searchParams.get("windowDays");
  const windowDays = Math.max(1, Math.min(365, Number(daysParam ?? 90)));

  if (!studentId && !teacherId) {
    return NextResponse.json({ error: "studentId or teacherId is required" }, { status: 400 });
  }

  // Build window [today, today + windowDays]
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const end = new Date(today.getTime() + windowDays * 24 * 3600 * 1000);
  end.setUTCHours(23, 59, 59, 999);

  // Fetch sessions for window and branch
  const whereSess: any = {
    isCancelled: false,
    branchId: selectedBranchId,
    date: { gte: today, lte: end },
  };
  if (studentId) whereSess.studentId = studentId;
  if (teacherId) whereSess.teacherId = teacherId;

  const sessions = await prisma.classSession.findMany({
    where: whereSess,
    select: { subjectId: true, classTypeId: true },
  });

  const { isSpecial } = await buildSpecialClassTypeChecker();

  // Precompute special flags per classTypeId
  const uniqueTypeIds = Array.from(new Set(sessions.map((s) => s.classTypeId).filter(Boolean))) as string[];
  await Promise.all(uniqueTypeIds.map((id) => isSpecial(id)));

  // Count totals and bySubject, excluding special classes
  let totalRegular = 0;
  const bySubjectMap = new Map<string, number>();

  for (const s of sessions) {
    const special = await isSpecial(s.classTypeId as string | undefined);
    if (special) continue;
    totalRegular += 1;
    if (s.subjectId) {
      bySubjectMap.set(s.subjectId, (bySubjectMap.get(s.subjectId) || 0) + 1);
    }
  }

  const bySubject = Array.from(bySubjectMap.entries())
    .map(([subjectId, count]) => ({ subjectId, count }))
    .sort((a, b) => b.count - a.count);

  // bySeries for the viewer (student or teacher)
  const whereSeries: any = { status: "ACTIVE" };
  if (selectedBranchId) whereSeries.branchId = selectedBranchId;
  if (studentId) whereSeries.studentId = studentId;
  if (teacherId) whereSeries.teacherId = teacherId;

  const seriesRows = await prisma.classSeries.findMany({
    where: whereSeries,
    orderBy: [{ updatedAt: "desc" }],
  });

  // Resolve names without relying on Prisma relations (not defined for ClassSeries)
  const teacherIds = Array.from(new Set(seriesRows.map((s) => s.teacherId).filter(Boolean))) as string[];
  const studentIds = Array.from(new Set(seriesRows.map((s) => s.studentId).filter(Boolean))) as string[];
  const subjectIds = Array.from(new Set(seriesRows.map((s) => s.subjectId).filter(Boolean))) as string[];

  const [teachers, students, subjects] = await Promise.all([
    teacherIds.length
      ? prisma.teacher.findMany({ where: { teacherId: { in: teacherIds } }, select: { teacherId: true, name: true } })
      : Promise.resolve([] as Array<{ teacherId: string; name: string }>),
    studentIds.length
      ? prisma.student.findMany({ where: { studentId: { in: studentIds } }, select: { studentId: true, name: true } })
      : Promise.resolve([] as Array<{ studentId: string; name: string }>),
    subjectIds.length
      ? prisma.subject.findMany({ where: { subjectId: { in: subjectIds } }, select: { subjectId: true, name: true } })
      : Promise.resolve([] as Array<{ subjectId: string; name: string }>),
  ]);

  const teacherMap = new Map(teachers.map((t) => [t.teacherId, t.name]));
  const studentMap = new Map(students.map((s) => [s.studentId, s.name]));
  const subjectMap = new Map(subjects.map((s) => [s.subjectId, s.name]));

  const bySeries = await Promise.all(
    seriesRows.map(async (s) => {
      const takenCount = await prisma.classSession.count({
        where: { seriesId: s.seriesId, isCancelled: false, date: { lt: today } },
      });
      const hh = (d: Date) => String(d.getUTCHours()).padStart(2, "0");
      const mm = (d: Date) => String(d.getUTCMinutes()).padStart(2, "0");
      return {
        seriesId: s.seriesId,
        teacherId: s.teacherId,
        teacherName: s.teacherId ? teacherMap.get(s.teacherId) ?? null : null,
        studentId: s.studentId,
        studentName: s.studentId ? studentMap.get(s.studentId) ?? null : null,
        subjectId: s.subjectId,
        subjectName: s.subjectId ? subjectMap.get(s.subjectId) ?? null : null,
        daysOfWeek: (s.daysOfWeek as any[]) || [],
        startTime: `${hh(s.startTime)}:${mm(s.startTime)}`,
        endTime: `${hh(s.endTime)}:${mm(s.endTime)}`,
        takenCountSoFar: takenCount,
      };
    })
  );

  return NextResponse.json({ totalRegular, bySubject, bySeries });
});
