// src/app/api/class-sessions/[classId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classSessionUpdateSchema } from "@/schemas/class-session.schema";
import { ClassSession } from "@prisma/client";
import { parse, format, parseISO } from "date-fns";
import { SPECIAL_CLASS_COLOR_HEX } from "@/lib/special-class-constants";
import { CANCELLED_CLASS_COLOR_HEX } from "@/lib/cancelled-class-constants";
import { isSpecialClassType } from "@/lib/special-class-server";
import { recomputeNeighborsForChange, recomputeAndUpdateSessionStatus } from "@/lib/conflict-status";

type FormattedClassSession = {
  classId: string;
  seriesId: string | null;
  teacherId: string | null;
  teacherName: string | null;
  studentId: string | null;
  studentName: string | null;
  studentGradeYear: number | null;
  studentTypeName: string | null;
  subjectId: string | null;
  subjectName: string | null;
  classTypeId: string | null;
  classTypeName: string | null;
  status: ClassSession["status"];
  boothId: string | null;
  boothName: string | null;
  branchId: string | null;
  branchName: string | null;
  date: string;
  startTime: string;
  endTime: string;
  duration: number | null;
  notes: string | null;
  classTypeColor?: string | null;
  // Cancellation metadata
  isCancelled?: boolean;
  cancelledAt?: string | null;
  cancelledByUserId?: string | null;
  cancelledByName?: string | null;
  createdAt: string;
  updatedAt: string;
};

// Helper function to format class session response
const formatClassSession = (
  classSession: ClassSession & {
    teacher?: { name: string } | null;
    student?: { name: string; gradeYear: number | null; studentType?: { name: string } | null } | null;
    subject?: { name: string } | null;
    classType?: { name: string } | null;
    booth?: { name: string } | null;
    branch?: { name: string } | null;
    cancelledBy?: { id: string; name: string | null; username: string | null; email: string | null } | null;
  }
): FormattedClassSession => {
  // Get UTC values from the date
  const dateUTC = new Date(classSession.date);
  const year = dateUTC.getUTCFullYear();
  const month = String(dateUTC.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dateUTC.getUTCDate()).padStart(2, "0");
  const formattedDate = `${year}-${month}-${day}`;

  // Get UTC values from the start time
  const startUTC = new Date(classSession.startTime);
  const startHour = String(startUTC.getUTCHours()).padStart(2, "0");
  const startMinute = String(startUTC.getUTCMinutes()).padStart(2, "0");
  const formattedStartTime = `${startHour}:${startMinute}`;

  // Get UTC values from the end time
  const endUTC = new Date(classSession.endTime);
  const endHour = String(endUTC.getUTCHours()).padStart(2, "0");
  const endMinute = String(endUTC.getUTCMinutes()).padStart(2, "0");
  const formattedEndTime = `${endHour}:${endMinute}`;

  return {
    classId: classSession.classId,
    seriesId: classSession.seriesId,
    teacherId: classSession.teacherId,
    teacherName: classSession.teacher?.name || null,
    studentId: classSession.studentId,
    studentName: classSession.student?.name || null,
    studentGradeYear: classSession.student?.gradeYear || null,
    studentTypeName: classSession.student?.studentType?.name || null,
    subjectId: classSession.subjectId,
    subjectName: classSession.subject?.name || null,
    classTypeId: classSession.classTypeId,
    classTypeName: classSession.classType?.name || null,
    classTypeColor: (classSession as any).classType?.color ?? null,
    status: classSession.status,
    boothId: classSession.boothId,
    boothName: classSession.booth?.name || null,
    branchId: classSession.branchId,
    branchName: classSession.branch?.name || null,
    date: formattedDate,
    startTime: formattedStartTime,
    endTime: formattedEndTime,
    duration: classSession.duration,
    notes: classSession.notes,
    isCancelled: (classSession as any).isCancelled ?? false,
    cancelledAt: (classSession as any).cancelledAt
      ? format((classSession as any).cancelledAt, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
      : null,
    cancelledByUserId: (classSession as any).cancelledByUserId ?? null,
    cancelledByName:
      classSession.cancelledBy?.name ||
      classSession.cancelledBy?.username ||
      classSession.cancelledBy?.email ||
      null,
    createdAt: format(classSession.createdAt, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    updatedAt: format(classSession.updatedAt, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
  };
};

// Helper function to create a DateTime from date and time string
const createDateTime = (dateStr: string, timeString: string): Date => {
  // Parse the date string to get year, month, day
  const dateParts = dateStr.split("-").map(Number);
  const year = dateParts[0];
  const month = dateParts[1] - 1; // JavaScript months are 0-based
  const day = dateParts[2];

  // Parse the time string to get hours and minutes
  const timeParts = timeString.split(":").map(Number);
  const hours = timeParts[0];
  const minutes = timeParts[1];

  // Create a UTC date object to avoid timezone conversion
  const date = new Date(Date.UTC(year, month, day, hours, minutes, 0, 0));

  return date;
};

// Helper function to check if a date conflicts with any vacations
const checkVacationConflict = async (date: Date, branchId: string): Promise<boolean> => {
  const vacations = await prisma.vacation.findMany({
    where: {
      OR: [
        { branchId: branchId },
      ],
      AND: [
        { startDate: { lte: date } },
        { endDate: { gte: date } },
      ],
    },
  });

  return vacations.length > 0;
};

// GET a specific class session by ID
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest, session, branchId) => {
    const classId = request.url.split("/").pop();

    if (!classId) {
      return NextResponse.json(
        { error: "クラスIDが必要です" },
        { status: 400 }
      );
    }

    const classSession = await prisma.classSession.findUnique({
      where: { classId },
      include: {
        teacher: {
          select: {
            name: true,
          },
        },
        student: {
          select: {
            name: true,
            gradeYear: true,
            studentType: {
              select: {
                name: true,
              },
            },
          },
        },
        subject: {
          select: {
            name: true,
          },
        },
          classType: {
            select: {
              name: true,
              color: true,
            },
          },
        booth: {
          select: {
            name: true,
          },
        },
    branch: {
      select: {
        name: true,
      },
    },
    cancelledBy: {
      select: { id: true, name: true, username: true, email: true },
    },
  },
});

    if (!classSession) {
      return NextResponse.json(
        { error: "授業が見つかりません" },
        { status: 404 }
      );
    }

    // Check if user has access to this class session's branch (non-admin users)
    if (
      classSession.branchId &&
      classSession.branchId !== branchId &&
      session.user?.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "この授業にアクセスする権限がありません" },
        { status: 403 }
      );
    }

    // Format response
    const formattedClassSession = formatClassSession(classSession);
    // Do not override class type color for special classes; use stored color
    if ((classSession as any).isCancelled) {
      formattedClassSession.classTypeColor = CANCELLED_CLASS_COLOR_HEX;
    }

    return NextResponse.json({
      data: formattedClassSession,
    });
  }
);

  // PATCH - Update a class session
export const PATCH = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    try {
      const classId = request.url.split("/").pop();
      if (!classId) {
        return NextResponse.json(
          { error: "クラスIDが必要です" },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate request body
      const result = classSessionUpdateSchema.safeParse({ ...body, classId });
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      // Check if class session exists
      const existingClassSession = await prisma.classSession.findUnique({
        where: { classId },
      });

      if (!existingClassSession) {
        return NextResponse.json(
          { error: "授業が見つかりません" },
          { status: 404 }
        );
      }

      // Check if user has access to this class session's branch (non-admin users)
      if (
        existingClassSession.branchId &&
        existingClassSession.branchId !== branchId &&
        session.user?.role !== "ADMIN"
      ) {
        return NextResponse.json(
          { error: "この授業にアクセスする権限がありません" },
          { status: 403 }
        );
      }

      const {
        teacherId,
        studentId,
        subjectId,
        classTypeId,
        boothId,
        date,
        startTime,
        endTime,
        duration,
        notes,
        isCancelled,
      } = result.data;

      // Prepare update data
      const updateData: {
        teacherId?: string | null;
        studentId?: string | null;
        subjectId?: string | null;
        classTypeId?: string | null;
        boothId?: string | null;
        notes?: string | null;
        date?: Date;
        startTime?: Date;
        endTime?: Date;
        duration?: number | null;
        isCancelled?: boolean;
        cancelledAt?: Date | null;
        cancelledByUserId?: string | null;
      } = {
        teacherId,
        studentId,
        subjectId,
        classTypeId,
        boothId,
        notes,
      };

      // Handle cancellation updates
      if (typeof isCancelled === 'boolean') {
        updateData.isCancelled = isCancelled;
        if (isCancelled) {
          updateData.cancelledAt = new Date();
          updateData.cancelledByUserId = session.user?.id ?? null;
        } else {
          // Clearing cancellation
          updateData.cancelledAt = null;
          updateData.cancelledByUserId = null;
        }
      }

      // Handle date updates and check for event conflicts
      if (date) {
        const newDate = parseISO(date);

        // Check if the new date conflicts with any events
        const hasVacationConflict = await checkVacationConflict(newDate, existingClassSession.branchId || branchId);

        if (hasVacationConflict) {
          return NextResponse.json(
            { error: "指定された日付は休日期間中のため、授業を更新できません" },
            { status: 400 }
          );
        }

        updateData.date = newDate;
      }

      // Get current date in YYYY-MM-DD format
      const existingDateUTC = new Date(existingClassSession.date);
      const baseDate = date
        ? date
        : `${existingDateUTC.getUTCFullYear()}-${String(
            existingDateUTC.getUTCMonth() + 1
          ).padStart(2, "0")}-${String(existingDateUTC.getUTCDate()).padStart(
            2,
            "0"
          )}`;

      if (startTime) {
        updateData.startTime = createDateTime(baseDate, startTime);
      }

      if (endTime) {
        updateData.endTime = createDateTime(baseDate, endTime);
      }

      // If both start and end times are provided, validate them
  if (startTime && endTime) {
        const newStartTime = createDateTime(baseDate, startTime);
        const newEndTime = createDateTime(baseDate, endTime);

        if (newEndTime <= newStartTime) {
          return NextResponse.json(
            { error: "終了時間は開始時間より後でなければなりません" },
            { status: 400 }
          );
        }

        // If duration is not explicitly provided, calculate it
        if (duration === undefined) {
          updateData.duration = Math.round(
            (newEndTime.getTime() - newStartTime.getTime()) / (1000 * 60)
          );
        }
      } else if (duration !== undefined) {
      updateData.duration = duration;
    }

    // Determine effective fields for conflict checks
    const effectiveDate = updateData.date ?? existingClassSession.date;
    const effectiveTeacherId =
      updateData.teacherId !== undefined
        ? updateData.teacherId
        : existingClassSession.teacherId;
    const effectiveStudentId =
      updateData.studentId !== undefined
        ? updateData.studentId
        : existingClassSession.studentId;
    const effectiveStart = updateData.startTime ?? existingClassSession.startTime;
    const effectiveEnd = updateData.endTime ?? existingClassSession.endTime;

    // Validate overlap conflicts for teacher
    if (effectiveTeacherId) {
      const teacherConflict = await prisma.classSession.findFirst({
        where: {
          classId: { not: classId },
          teacherId: effectiveTeacherId,
          date: effectiveDate,
          isCancelled: false,
          OR: [
            { AND: [{ startTime: { lte: effectiveStart } }, { endTime: { gt: effectiveStart } }] },
            { AND: [{ startTime: { lt: effectiveEnd } }, { endTime: { gte: effectiveEnd } }] },
            { AND: [{ startTime: { gte: effectiveStart } }, { endTime: { lte: effectiveEnd } }] },
          ],
        },
        include: {
          teacher: { select: { name: true } },
          student: { select: { name: true } },
        },
      });
      if (teacherConflict) {
        const conflictStart = format(teacherConflict.startTime, "HH:mm");
        const conflictEnd = format(teacherConflict.endTime, "HH:mm");
        return NextResponse.json(
          { error: `講師は${conflictStart}-${conflictEnd}に別の授業があります` },
          { status: 400 }
        );
      }
    }

    // Validate overlap conflicts for student
    if (effectiveStudentId) {
      const studentConflict = await prisma.classSession.findFirst({
        where: {
          classId: { not: classId },
          studentId: effectiveStudentId,
          date: effectiveDate,
          isCancelled: false,
          OR: [
            { AND: [{ startTime: { lte: effectiveStart } }, { endTime: { gt: effectiveStart } }] },
            { AND: [{ startTime: { lt: effectiveEnd } }, { endTime: { gte: effectiveEnd } }] },
            { AND: [{ startTime: { gte: effectiveStart } }, { endTime: { lte: effectiveEnd } }] },
          ],
        },
        include: {
          teacher: { select: { name: true } },
          student: { select: { name: true } },
        },
      });
      if (studentConflict) {
        const conflictStart = format(studentConflict.startTime, "HH:mm");
        const conflictEnd = format(studentConflict.endTime, "HH:mm");
        return NextResponse.json(
          { error: `生徒は${conflictStart}-${conflictEnd}に別の授業があります` },
          { status: 400 }
        );
      }
    }

    // Update class session
      let updatedClassSession = await prisma.classSession.update({
        where: { classId },
        data: updateData,
        include: {
          teacher: {
            select: {
              name: true,
            },
          },
          student: {
            select: {
              name: true,
              gradeYear: true,
              studentType: {
                select: {
                  name: true,
                },
              },
            },
          },
          subject: {
            select: {
              name: true,
            },
          },
          classType: {
            select: {
              name: true,
              color: true,
            },
          },
          booth: {
            select: {
              name: true,
            },
          },
          branch: {
            select: {
              name: true,
            },
          },
          cancelledBy: {
            select: { id: true, name: true, username: true, email: true },
          },
        },
      });

      // After update, recompute status: if no hard conflicts and no policy-marked soft conflicts, set CONFIRMED
      try {
        const date = updatedClassSession.date;
        const start = updatedClassSession.startTime;
        const end = updatedClassSession.endTime;
        const reasons: Array<{ type: string }> = [];
        // Hard overlaps teacher/student/booth (exclude self)
        const reqStartM = start.getUTCHours() * 60 + start.getUTCMinutes();
        const reqEndM = end.getUTCHours() * 60 + end.getUTCMinutes();
        if (updatedClassSession.teacherId || updatedClassSession.studentId || updatedClassSession.boothId) {
          const overlaps = await prisma.classSession.findMany({
            where: {
              isCancelled: false,
              date,
              classId: { not: classId },
              OR: [
                updatedClassSession.teacherId ? { teacherId: updatedClassSession.teacherId } : undefined,
                updatedClassSession.studentId ? { studentId: updatedClassSession.studentId } : undefined,
                updatedClassSession.boothId ? { boothId: updatedClassSession.boothId } : undefined,
              ].filter(Boolean) as any,
            },
            select: { startTime: true, endTime: true, teacherId: true, studentId: true, boothId: true },
          });
          for (const s of overlaps) {
            const sStartM = s.startTime.getUTCHours() * 60 + s.startTime.getUTCMinutes();
            const sEndM = s.endTime.getUTCHours() * 60 + s.endTime.getUTCMinutes();
            if (!(sStartM < reqEndM && sEndM > reqStartM)) continue;
            if (updatedClassSession.teacherId && s.teacherId === updatedClassSession.teacherId) reasons.push({ type: 'TEACHER_CONFLICT' });
            if (updatedClassSession.studentId && s.studentId === updatedClassSession.studentId) reasons.push({ type: 'STUDENT_CONFLICT' });
            if (updatedClassSession.boothId && s.boothId === updatedClassSession.boothId) reasons.push({ type: 'BOOTH_CONFLICT' });
          }
        }

        // Availability-derived soft reasons (policy-marked) – consult centralized policy
        const { getEffectiveSchedulingConfig, toPolicyShape } = await import("@/lib/scheduling-config");
        const eff = await getEffectiveSchedulingConfig(updatedClassSession.branchId || branchId);
        const policy = toPolicyShape(eff);
        const allowOutside = policy.allowOutsideAvailability || { teacher: false, student: false };
        if (updatedClassSession.teacherId && updatedClassSession.studentId) {
          try {
            const [teacher, student] = await Promise.all([
              prisma.teacher.findUnique({ where: { teacherId: updatedClassSession.teacherId }, select: { userId: true } }),
              prisma.student.findUnique({ where: { studentId: updatedClassSession.studentId }, select: { userId: true } }),
            ]);
            if (teacher?.userId && student?.userId) {
              const { getDetailedSharedAvailability } = await import("@/lib/enhanced-availability");
              const avail = await getDetailedSharedAvailability(teacher.userId, student.userId, date, start, end, { skipVacationCheck: true });
              if (!avail.available) {
                let t: string = 'NO_SHARED_AVAILABILITY';
                if (!avail.user1.available) t = avail.user1.conflictType === 'UNAVAILABLE' ? 'TEACHER_UNAVAILABLE' : 'TEACHER_WRONG_TIME';
                else if (!avail.user2.available) t = avail.user2.conflictType === 'UNAVAILABLE' ? 'STUDENT_UNAVAILABLE' : 'STUDENT_WRONG_TIME';
                // Respect allowOutsideAvailability (suppress when allowed)
                const isTeacherType = t === 'TEACHER_UNAVAILABLE' || t === 'TEACHER_WRONG_TIME';
                const isStudentType = t === 'STUDENT_UNAVAILABLE' || t === 'STUDENT_WRONG_TIME';
                if (!((isTeacherType && allowOutside.teacher) || (isStudentType && allowOutside.student))) {
                  reasons.push({ type: t });
                }
              }
            }
          } catch (_) {}
        }

        // Determine status
        const { hasHardConflict, isMarkedByPolicy } = await import("@/lib/conflict-types");
        const nextStatus = hasHardConflict(reasons)
          ? 'CONFLICTED'
          : isMarkedByPolicy(reasons as any, policy.markAsConflicted)
          ? 'CONFLICTED'
          : 'CONFIRMED';
        if (nextStatus !== updatedClassSession.status) {
          const reread = await prisma.classSession.update({
            where: { classId },
            data: { status: nextStatus },
            include: {
              teacher: { select: { name: true } },
              student: { select: { name: true, gradeYear: true, studentType: { select: { name: true } } } },
              subject: { select: { name: true } },
              classType: { select: { name: true, color: true } },
              booth: { select: { name: true } },
              branch: { select: { name: true } },
              cancelledBy: { select: { id: true, name: true, username: true, email: true } },
            }
          });
          updatedClassSession = reread;
        }
      } catch (_) {
        // If status recompute fails, proceed without blocking the update
      }

      // Neighbor recompute: if key placement fields changed, refresh neighbor statuses
      try {
        const changed =
          existingClassSession.date.getTime() !== (updatedClassSession.date as Date).getTime() ||
          existingClassSession.startTime.getTime() !== (updatedClassSession.startTime as Date).getTime() ||
          existingClassSession.endTime.getTime() !== (updatedClassSession.endTime as Date).getTime() ||
          existingClassSession.teacherId !== updatedClassSession.teacherId ||
          existingClassSession.studentId !== updatedClassSession.studentId ||
          existingClassSession.boothId !== updatedClassSession.boothId;
        if (changed) {
          const oldCtx = {
            classId,
            branchId: existingClassSession.branchId,
            date: existingClassSession.date as Date,
            startTime: existingClassSession.startTime as Date,
            endTime: existingClassSession.endTime as Date,
            teacherId: existingClassSession.teacherId,
            studentId: existingClassSession.studentId,
            boothId: existingClassSession.boothId,
          };
          const newCtx = {
            classId,
            branchId: updatedClassSession.branchId,
            date: updatedClassSession.date as Date,
            startTime: updatedClassSession.startTime as Date,
            endTime: updatedClassSession.endTime as Date,
            teacherId: updatedClassSession.teacherId,
            studentId: updatedClassSession.studentId,
            boothId: updatedClassSession.boothId,
          };
          await recomputeNeighborsForChange(oldCtx, newCtx);
          try {
            // Also recompute and persist the edited session's own status
            await recomputeAndUpdateSessionStatus(classId);
          } catch (_) {
            // Non-blocking: ignore self-recompute errors
          }
        }
      } catch (_) {
        // Do not block the main update on neighbor refresh errors
      }

      // Format response
      const formattedClassSession = formatClassSession(updatedClassSession);
      // Do not override class type color for special classes; use stored color
      if ((updatedClassSession as any).isCancelled) {
        formattedClassSession.classTypeColor = CANCELLED_CLASS_COLOR_HEX;
      }

      return NextResponse.json({
        data: formattedClassSession,
        message: "授業を更新しました",
      });
    } catch (error) {
      console.error("Error updating class session:", error);
      return NextResponse.json(
        { error: "授業の更新に失敗しました" },
        { status: 500 }
      );
    }
  }
);

// DELETE - Delete a class session
export const DELETE = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    const classId = request.url.split("/").pop();

    if (!classId) {
      return NextResponse.json(
        { error: "クラスIDが必要です" },
        { status: 400 }
      );
    }

    try {
      // Check if class session exists
      const classSession = await prisma.classSession.findUnique({
        where: { classId },
      });

      if (!classSession) {
        return NextResponse.json(
          { error: "授業が見つかりません" },
          { status: 404 }
        );
      }

      // Check if user has access to this class session's branch (non-admin users)
      if (
        classSession.branchId &&
        classSession.branchId !== branchId &&
        session.user?.role !== "ADMIN"
      ) {
        return NextResponse.json(
          { error: "この授業にアクセスする権限がありません" },
          { status: 403 }
        );
      }

      // Delete the class session and its enrollments in a transaction
      await prisma.$transaction(async (tx) => {
        // First delete all enrollments for this class
        await tx.studentClassEnrollment.deleteMany({
          where: { classId }
        });

        // Then delete the class session
        await tx.classSession.delete({
          where: { classId }
        });
      });

      return NextResponse.json(
        {
          data: [],
          message: "授業を削除しました",
          pagination: {
            total: 0,
            page: 0,
            limit: 0,
            pages: 0,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error deleting class session:", error);
      return NextResponse.json(
        { error: "授業の削除に失敗しました" },
        { status: 500 }
      );
    }
  }
);
