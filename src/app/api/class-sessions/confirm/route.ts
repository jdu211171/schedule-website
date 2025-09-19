// src/app/api/class-sessions/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasHardConflict } from "@/lib/conflict-types";

type Payload = { classIds: string[] };

const minutesUTC = (d: Date) => d.getUTCHours() * 60 + d.getUTCMinutes();

export const POST = withBranchAccess(["ADMIN", "STAFF"], async (request: NextRequest, session, selectedBranchId) => {
  let body: Payload | null = null;
  try {
    body = await request.json();
  } catch (_) {}
  if (!body || !Array.isArray(body.classIds) || body.classIds.length === 0) {
    return NextResponse.json({ error: 'classIds is required' }, { status: 400 });
  }

  const results: { updated: string[]; failed: { classId: string; reason: string }[] } = { updated: [], failed: [] };

  for (const classId of body.classIds) {
    try {
      const target = await prisma.classSession.findUnique({
        where: { classId },
        include: {
          teacher: { select: { userId: true, name: true } },
          student: { select: { userId: true, name: true } },
        },
      });
      if (!target) {
        results.failed.push({ classId, reason: '授業が見つかりません' });
        continue;
      }
      if (target.branchId && selectedBranchId && target.branchId !== selectedBranchId && session.user?.role !== 'ADMIN') {
        results.failed.push({ classId, reason: '権限がありません' });
        continue;
      }

      const date = target.date;
      const start = target.startTime;
      const end = target.endTime;

      // Build conflict list for this session (limited but sufficient for confirm gate)
      const reasons: Array<{ type: string }> = [];

      // Hard overlaps teacher/student/booth (exclude self)
      if (target.teacherId || target.studentId || target.boothId) {
        const reqStartM = minutesUTC(start);
        const reqEndM = minutesUTC(end);
        const sameDay = await prisma.classSession.findMany({
          where: {
            isCancelled: false,
            date,
            classId: { not: classId },
            OR: [
              target.teacherId ? { teacherId: target.teacherId } : undefined,
              target.studentId ? { studentId: target.studentId } : undefined,
              target.boothId ? { boothId: target.boothId } : undefined,
            ].filter(Boolean) as any,
          },
          select: { startTime: true, endTime: true, teacherId: true, studentId: true, boothId: true },
        });
        for (const s of sameDay) {
          const sStartM = minutesUTC(s.startTime);
          const sEndM = minutesUTC(s.endTime);
          if (!(sStartM < reqEndM && sEndM > reqStartM)) continue;
          if (target.teacherId && s.teacherId === target.teacherId) reasons.push({ type: 'TEACHER_CONFLICT' });
          if (target.studentId && s.studentId === target.studentId) reasons.push({ type: 'STUDENT_CONFLICT' });
          if (target.boothId && s.boothId === target.boothId) reasons.push({ type: 'BOOTH_CONFLICT' });
        }
      }

      // Gate: do not allow confirming while hard conflicts remain
      if (hasHardConflict(reasons)) {
        results.failed.push({ classId, reason: 'ハード競合が残っています' });
        continue;
      }

      // OK to confirm: mark as CONFIRMED regardless of soft conditions (staff override)
      await prisma.classSession.update({ where: { classId }, data: { status: 'CONFIRMED' } });
      results.updated.push(classId);
    } catch (e) {
      results.failed.push({ classId, reason: '更新に失敗しました' });
    }
  }

  return NextResponse.json({
    data: [],
    message: `${results.updated.length}件を確認済みにしました${results.failed.length ? `（失敗 ${results.failed.length}）` : ''}`,
    updatedCount: results.updated.length,
    failed: results.failed,
  });
});

