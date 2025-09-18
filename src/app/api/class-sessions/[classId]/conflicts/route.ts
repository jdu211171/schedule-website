// src/app/api/class-sessions/[classId]/conflicts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ConflictInfo } from "@/schemas/class-session.schema";
import { getDetailedSharedAvailability } from "@/lib/enhanced-availability";

// Convert a Date to minutes from midnight (UTC)
const minutesUTC = (d: Date) => d.getUTCHours() * 60 + d.getUTCMinutes();

export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest, session, branchId) => {
    const classId = request.url.split("/").slice(-2)[0];
    if (!classId) {
      return NextResponse.json({ error: "classId is required" }, { status: 400 });
    }

    // Load target session
    const target = await prisma.classSession.findUnique({
      where: { classId },
      include: {
        teacher: { select: { userId: true, name: true } },
        student: { select: { userId: true, name: true } },
      },
    });
    if (!target) return NextResponse.json({ error: "授業が見つかりません" }, { status: 404 });

    // Branch access check (non-admin)
    if (target.branchId && target.branchId !== branchId && session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const date = target.date; // already stored as UTC midnight
    const start = target.startTime;
    const end = target.endTime;

    const conflicts: ConflictInfo[] = [];

    // Hard overlaps on same day, exclude self
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
        select: {
          classId: true,
          startTime: true,
          endTime: true,
          teacherId: true,
          studentId: true,
          boothId: true,
        },
      });

      const added = new Set<string>();
      for (const s of sameDay) {
        const sStartM = minutesUTC(s.startTime);
        const sEndM = minutesUTC(s.endTime);
        if (!(sStartM < reqEndM && sEndM > reqStartM)) continue;
        if (target.teacherId && s.teacherId === target.teacherId && !added.has("TEACHER_CONFLICT")) {
          conflicts.push({
            date: new Date(date).toISOString().slice(0, 10),
            dayOfWeek: ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"][date.getUTCDay()],
            type: "TEACHER_CONFLICT",
            details: "同一講師の同時間帯に別の授業が存在します。",
            conflictingSession: {
              classId: s.classId,
              teacherName: target.teacher?.name || "",
              studentName: target.student?.name || "",
              startTime: `${String(s.startTime.getUTCHours()).padStart(2, "0")}:${String(s.startTime.getUTCMinutes()).padStart(2, "0")}`,
              endTime: `${String(s.endTime.getUTCHours()).padStart(2, "0")}:${String(s.endTime.getUTCMinutes()).padStart(2, "0")}`,
            },
          });
          added.add("TEACHER_CONFLICT");
        }
        if (target.studentId && s.studentId === target.studentId && !added.has("STUDENT_CONFLICT")) {
          conflicts.push({
            date: new Date(date).toISOString().slice(0, 10),
            dayOfWeek: ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"][date.getUTCDay()],
            type: "STUDENT_CONFLICT",
            details: "同一生徒の同時間帯に別の授業が存在します。",
            conflictingSession: {
              classId: s.classId,
              teacherName: target.teacher?.name || "",
              studentName: target.student?.name || "",
              startTime: `${String(s.startTime.getUTCHours()).padStart(2, "0")}:${String(s.startTime.getUTCMinutes()).padStart(2, "0")}`,
              endTime: `${String(s.endTime.getUTCHours()).padStart(2, "0")}:${String(s.endTime.getUTCMinutes()).padStart(2, "0")}`,
            },
          });
          added.add("STUDENT_CONFLICT");
        }
        if (target.boothId && s.boothId === target.boothId && !added.has("BOOTH_CONFLICT")) {
          conflicts.push({
            date: new Date(date).toISOString().slice(0, 10),
            dayOfWeek: ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"][date.getUTCDay()],
            type: "BOOTH_CONFLICT",
            details: "同一ブースが同時間帯に予約済みです。",
            classId: s.classId,
          });
          added.add("BOOTH_CONFLICT");
        }
      }
    }

    // Detailed shared-availability check (soft conflicts)
    if (target.teacherId && target.studentId && target.teacher?.userId && target.student?.userId) {
      try {
        const availability = await getDetailedSharedAvailability(
          target.teacher.userId,
          target.student.userId,
          date,
          start,
          end,
          { skipVacationCheck: true }
        );

        if (!availability.available) {
          // Determine a specific type and participant
          let type: ConflictInfo["type"] = "NO_SHARED_AVAILABILITY";
          let details = "講師と生徒の利用可能時間に重複がありません。別の時間帯をご選択ください。";
          let participant: ConflictInfo["participant"] | undefined;
          if (!availability.user1.available) {
            type = availability.user1.conflictType === "UNAVAILABLE" ? "TEACHER_UNAVAILABLE" : "TEACHER_WRONG_TIME";
            details = type === "TEACHER_UNAVAILABLE" ? `${target.teacher?.name ?? "講師"}はこの日に利用可能時間が設定されていません` : `${target.teacher?.name ?? "講師"}は指定された時間帯に利用できません。`;
            participant = { id: target.teacherId!, name: target.teacher?.name || "", role: "teacher" };
          } else if (!availability.user2.available) {
            type = availability.user2.conflictType === "UNAVAILABLE" ? "STUDENT_UNAVAILABLE" : "STUDENT_WRONG_TIME";
            details = type === "STUDENT_UNAVAILABLE" ? `${target.student?.name ?? "生徒"}はこの日に利用可能時間が設定されていません` : `${target.student?.name ?? "生徒"}は指定された時間帯に利用できません。`;
            participant = { id: target.studentId!, name: target.student?.name || "", role: "student" };
          }
          conflicts.push({
            date: new Date(date).toISOString().slice(0, 10),
            dayOfWeek: ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"][date.getUTCDay()],
            type,
            details,
            participant,
            sharedAvailableSlots: availability.sharedSlots,
            teacherSlots: availability.user1.effectiveSlots,
            studentSlots: availability.user2.effectiveSlots,
            availabilityStrategy: availability.strategy,
          });
        }
      } catch (_) {
        // ignore availability errors for detail view
      }
    }

    const dateKey = new Date(date).toISOString().slice(0, 10);
    return NextResponse.json({
      conflicts,
      conflictsByDate: { [dateKey]: conflicts },
      total: conflicts.length,
    });
  }
);

