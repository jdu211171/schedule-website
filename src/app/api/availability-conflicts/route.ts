// src/app/api/availability-conflicts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { getDetailedSharedAvailability } from "@/lib/enhanced-availability";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { addDays, format, getDay, differenceInDays } from "date-fns";

const conflictAnalysisSchema = z.object({
  teacherId: z.string(),
  studentId: z.string(),
  startDate: z.string(), // YYYY-MM-DD
  endDate: z.string(), // YYYY-MM-DD
  daysOfWeek: z.array(z.number().min(0).max(6)),
  startTime: z.string(), // HH:MM
  endTime: z.string(), // HH:MM
});

export const POST = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const result = conflictAnalysisSchema.safeParse(body);

      if (!result.success) {
        return NextResponse.json(
          { error: "Invalid parameters", details: result.error.errors },
          { status: 400 }
        );
      }

      const {
        teacherId,
        studentId,
        startDate,
        endDate,
        daysOfWeek,
        startTime,
        endTime,
      } = result.data;

      // Get teacher and student user IDs
      const [teacher, student] = await Promise.all([
        prisma.teacher.findUnique({
          where: { teacherId },
          select: { userId: true, name: true },
        }),
        prisma.student.findUnique({
          where: { studentId },
          select: { userId: true, name: true },
        }),
      ]);

      if (!teacher || !student) {
        return NextResponse.json(
          { error: "Teacher or student not found" },
          { status: 404 }
        );
      }

      // Generate all dates in the range that match the requested days of week
      const startDateObj = new Date(startDate + "T00:00:00.000Z");
      const endDateObj = new Date(endDate + "T00:00:00.000Z");
      const days = differenceInDays(endDateObj, startDateObj) + 1;

      const targetDates: Date[] = [];
      for (let i = 0; i < days; i++) {
        const currentDate = addDays(startDateObj, i);
        const dayOfWeek = getDay(currentDate);

        if (daysOfWeek.includes(dayOfWeek)) {
          targetDates.push(new Date(currentDate));
        }
      }

      if (targetDates.length === 0) {
        return NextResponse.json({
          success: true,
          conflicts: [],
          summary: {
            totalRequestedDates: 0,
            conflictDates: 0,
            availableDates: 0,
          },
          message: "指定された日付範囲内に該当する曜日がありません",
        });
      }

      // Analyze each date for conflicts and availability
      const conflictAnalysis = [];
      const availableDates = [];

      for (const date of targetDates) {
        const requestedStartTime = createDateTime(
          format(date, "yyyy-MM-dd"),
          startTime
        );
        const requestedEndTime = createDateTime(
          format(date, "yyyy-MM-dd"),
          endTime
        );

        const analysis = await getDetailedSharedAvailability(
          teacher.userId,
          student.userId,
          date,
          requestedStartTime,
          requestedEndTime
        );

        const dateStr = format(date, "yyyy-MM-dd");
        const dayOfWeek = getDayOfWeekFromDate(date);

        if (!analysis.available) {
          // This date has conflicts
          const conflictReasons = [];

          if (!analysis.user1.available) {
            conflictReasons.push({
              type:
                analysis.user1.conflictType === "UNAVAILABLE"
                  ? "TEACHER_UNAVAILABLE"
                  : "TEACHER_WRONG_TIME",
              participant: {
                id: teacherId,
                name: teacher.name,
                role: "teacher" as const,
              },
              hasExceptions: analysis.user1.hasExceptions,
              hasRegular: analysis.user1.hasRegular,
              exceptionSlots: analysis.user1.exceptionSlots,
              regularSlots: analysis.user1.regularSlots,
              effectiveSlots: analysis.user1.effectiveSlots,
            });
          }

          if (!analysis.user2.available) {
            conflictReasons.push({
              type:
                analysis.user2.conflictType === "UNAVAILABLE"
                  ? "STUDENT_UNAVAILABLE"
                  : "STUDENT_WRONG_TIME",
              participant: {
                id: studentId,
                name: student.name,
                role: "student" as const,
              },
              hasExceptions: analysis.user2.hasExceptions,
              hasRegular: analysis.user2.hasRegular,
              exceptionSlots: analysis.user2.exceptionSlots,
              regularSlots: analysis.user2.regularSlots,
              effectiveSlots: analysis.user2.effectiveSlots,
            });
          }

          conflictAnalysis.push({
            date: dateStr,
            dayOfWeek,
            requestedTime: `${startTime}-${endTime}`,
            conflicts: conflictReasons,
            sharedAvailableSlots: analysis.sharedSlots,
            strategy: analysis.strategy,
            message: analysis.message,
          });
        } else {
          // This date is available
          availableDates.push({
            date: dateStr,
            dayOfWeek,
            sharedSlots: analysis.sharedSlots,
            strategy: analysis.strategy,
          });
        }
      }

      return NextResponse.json({
        success: true,
        conflicts: conflictAnalysis,
        availableDates,
        summary: {
          totalRequestedDates: targetDates.length,
          conflictDates: conflictAnalysis.length,
          availableDates: availableDates.length,
        },
        participants: {
          teacher: { id: teacherId, name: teacher.name },
          student: { id: studentId, name: student.name },
        },
      });
    } catch (error) {
      console.error("Error analyzing availability conflicts:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);

// Helper functions
function createDateTime(dateStr: string, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date(dateStr + "T00:00:00.000Z");
  date.setUTCHours(hours, minutes, 0, 0);
  return date;
}

function getDayOfWeekFromDate(date: Date): string {
  const days = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];
  return days[date.getUTCDay()];
}
