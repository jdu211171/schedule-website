// src/app/api/class-sessions/series/[seriesId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classSessionSeriesUpdateSchema } from "@/schemas/class-session.schema";
import { ClassSession } from "@prisma/client";
import { parse, format, parseISO } from "date-fns";
import { applySpecialClassColor } from "@/lib/special-class-server";

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
  boothId: string | null;
  boothName: string | null;
  branchId: string | null;
  branchName: string | null;
  date: string;
  startTime: string;
  endTime: string;
  duration: number | null;
  notes: string | null;
  status: string | null;
  isCancelled: boolean;
  cancellationReason: string | null;
  classTypeColor?: string | null;
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
    boothId: classSession.boothId,
    boothName: classSession.booth?.name || null,
    branchId: classSession.branchId,
    branchName: classSession.branch?.name || null,
    date: formattedDate,
    startTime: formattedStartTime,
    endTime: formattedEndTime,
    duration: classSession.duration,
    notes: classSession.notes,
    status: (classSession as any).status ?? null,
    isCancelled: (classSession as any).isCancelled ?? false,
    cancellationReason: (classSession as any).cancellationReason ?? null,
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

// GET all sessions in a series
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest, session, branchId) => {
    const seriesId = request.url.split("/").pop();

    if (!seriesId) {
      return NextResponse.json(
        { error: "シリーズIDが必要です" },
        { status: 400 }
      );
    }

    // Get the first class session to check branch access
    const firstSession = await prisma.classSession.findFirst({
      where: { seriesId },
    });

    if (!firstSession) {
      return NextResponse.json(
        { error: "シリーズが見つかりません" },
        { status: 404 }
      );
    }

    // Check if user has access to this series' branch (non-admin users)
    if (
      firstSession.branchId &&
      firstSession.branchId !== branchId &&
      session.user?.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "このシリーズにアクセスする権限がありません" },
        { status: 403 }
      );
    }

    // Fetch all sessions in the series
    const classSessions = await prisma.classSession.findMany({
      where: { seriesId },
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
      },
      orderBy: { date: "asc" },
    });

    // Format response
    const formattedClassSessions = classSessions.map(formatClassSession);
    await applySpecialClassColor(classSessions, formattedClassSessions);

    return NextResponse.json({
      data: formattedClassSessions,
      pagination: {
        total: formattedClassSessions.length,
        page: 1,
        limit: formattedClassSessions.length,
        pages: 1,
      },
    });
  }
);

// PATCH - Update all future sessions in a series
export const PATCH = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    try {
      const seriesId = request.url.split("/").pop();
      if (!seriesId) {
        return NextResponse.json(
          { error: "シリーズIDが必要です" },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate request body
      const result = classSessionSeriesUpdateSchema.safeParse({
        ...body,
        seriesId,
      });
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      // Check if series exists
      const firstSession = await prisma.classSession.findFirst({
        where: { seriesId },
      });

      if (!firstSession) {
        return NextResponse.json(
          { error: "シリーズが見つかりません" },
          { status: 404 }
        );
      }

      // Check if user has access to this series' branch (non-admin users)
      if (
        firstSession.branchId &&
        firstSession.branchId !== branchId &&
        session.user?.role !== "ADMIN"
      ) {
        return NextResponse.json(
          { error: "このシリーズにアクセスする権限がありません" },
          { status: 403 }
        );
      }

      const {
        teacherId,
        studentId,
        subjectId,
        classTypeId,
        boothId,
        startTime,
        endTime,
        duration,
        notes,
        fromClassId,
      } = result.data;

      // Prepare update data
      const updateData: any = {
        teacherId,
        studentId,
        subjectId,
        classTypeId,
        boothId,
        notes,
      };

      // Determine pivot date: either from the specified instance or today (fallback)
      let pivotDate = new Date();
      pivotDate.setHours(0, 0, 0, 0);

      if (fromClassId) {
        const pivotSession = await prisma.classSession.findFirst({
          where: { classId: fromClassId, seriesId },
          select: { date: true },
        });
        if (!pivotSession) {
          return NextResponse.json(
            { error: "指定された授業インスタンスが見つかりません" },
            { status: 400 }
          );
        }
        // Normalize to start of day in UTC to match storage/formatting behavior
        const d = new Date(pivotSession.date);
        d.setUTCHours(0, 0, 0, 0);
        pivotDate = d;
      }

      // Time handling
      const hasTimeUpdate = startTime !== undefined || endTime !== undefined;

      // If updating times, validate them
      if (startTime && endTime) {
        // Use a test date to check time validity
        const testDate = "2000-01-01";
        const testStartTime = createDateTime(testDate, startTime);
        const testEndTime = createDateTime(testDate, endTime);

        if (testEndTime <= testStartTime) {
          return NextResponse.json(
            { error: "終了時間は開始時間より後でなければなりません" },
            { status: 400 }
          );
        }

        // Calculate duration if not explicitly provided
        if (duration === undefined) {
          updateData.duration = Math.round(
            (testEndTime.getTime() - testStartTime.getTime()) / (1000 * 60)
          );
        }
      } else if (duration !== undefined) {
        updateData.duration = duration;
      }

      // Get all sessions in the series from the pivot date (inclusive)
      const futureSessions = await prisma.classSession.findMany({
        where: {
          seriesId,
          date: {
            gte: pivotDate,
          },
        },
      });

      if (futureSessions.length === 0) {
        return NextResponse.json(
          { error: "更新対象のセッションがありません" },
          { status: 400 }
        );
      }

      // Update each future session within a single transaction
      const updatedSessions = await prisma.$transaction(async (tx) => {
        const results: ClassSession[] = [] as any;
        for (const session of futureSessions) {
          // If updating times, calculate for each session's date
          // Format date as YYYY-MM-DD for the current session (used for messages and time recompute)
          const sessionDateUTC = new Date(session.date);
          const sessionDateStr = `${sessionDateUTC.getUTCFullYear()}-${String(
            sessionDateUTC.getUTCMonth() + 1
          ).padStart(2, "0")}-${String(sessionDateUTC.getUTCDate()).padStart(2, "0")}`;

          if (hasTimeUpdate) {

            if (startTime) {
              const sessionStartTime = createDateTime(
                sessionDateStr,
                startTime
              );
              updateData.startTime = sessionStartTime;
            }
            if (endTime) {
              const sessionEndTime = createDateTime(sessionDateStr, endTime);
              updateData.endTime = sessionEndTime;
            }
          }

          // Overlap validation: compute effective values for this specific session
          const effTeacherId = updateData.teacherId ?? session.teacherId;
          const effStudentId = updateData.studentId ?? session.studentId;
          const effDate = updateData.date ?? session.date;
          const effStart = updateData.startTime ?? session.startTime;
          const effEnd = updateData.endTime ?? session.endTime;

          if (effTeacherId) {
            const teacherConflict = await tx.classSession.findFirst({
              where: {
                classId: { not: session.classId },
                teacherId: effTeacherId,
                date: effDate,
                isCancelled: false,
                OR: [
                  { AND: [{ startTime: { lte: effStart } }, { endTime: { gt: effStart } }] },
                  { AND: [{ startTime: { lt: effEnd } }, { endTime: { gte: effEnd } }] },
                  { AND: [{ startTime: { gte: effStart } }, { endTime: { lte: effEnd } }] },
                ],
              },
              select: { classId: true },
            });

            if (teacherConflict) {
              throw new Error(`講師の時間重複が検出されました（${sessionDateStr}）`);
            }
          }

          if (effStudentId) {
            const studentConflict = await tx.classSession.findFirst({
              where: {
                classId: { not: session.classId },
                studentId: effStudentId,
                date: effDate,
                isCancelled: false,
                OR: [
                  { AND: [{ startTime: { lte: effStart } }, { endTime: { gt: effStart } }] },
                  { AND: [{ startTime: { lt: effEnd } }, { endTime: { gte: effEnd } }] },
                  { AND: [{ startTime: { gte: effStart } }, { endTime: { lte: effEnd } }] },
                ],
              },
              select: { classId: true },
            });

            if (studentConflict) {
              throw new Error(`生徒の時間重複が検出されました（${sessionDateStr}）`);
            }
          }

          const updated = await tx.classSession.update({
            where: { classId: session.classId },
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
            },
          });

          results.push(updated as any);
        }

        return results as any;
      });

      // Format response
      const formattedSessions = updatedSessions.map(formatClassSession);
      await applySpecialClassColor(updatedSessions, formattedSessions);

      return NextResponse.json({
        data: formattedSessions,
        message: `${formattedSessions.length}件の未来の授業を更新しました`,
        pagination: {
          total: formattedSessions.length,
          page: 1,
          limit: formattedSessions.length,
          pages: 1,
        },
      });
  } catch (error) {
      console.error("Error updating class session series:", error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "授業シリーズの更新に失敗しました";
      const status = error instanceof Error && error.message ? 400 : 500;
      return NextResponse.json(
        { error: message },
        { status }
      );
    }
  }
);

// DELETE - Delete all future sessions in a series
export const DELETE = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    const seriesId = request.url.split("/").pop();

    if (!seriesId) {
      return NextResponse.json(
        { error: "シリーズIDが必要です" },
        { status: 400 }
      );
    }

    try {
      // Check if series exists
      const firstSession = await prisma.classSession.findFirst({
        where: { seriesId },
      });

      if (!firstSession) {
        return NextResponse.json(
          { error: "シリーズが見つかりません" },
          { status: 404 }
        );
      }

      // Check if user has access to this series' branch (non-admin users)
      if (
        firstSession.branchId &&
        firstSession.branchId !== branchId &&
        session.user?.role !== "ADMIN"
      ) {
        return NextResponse.json(
          { error: "このシリーズにアクセスする権限がありません" },
          { status: 403 }
        );
      }

      // Optionally accept a pivot instance to define deletion start date
      let fromClassId: string | undefined;
      try {
        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const body = await request.json().catch(() => null);
          if (body && typeof body.fromClassId === 'string') {
            fromClassId = body.fromClassId;
          }
        }
      } catch (_) {
        // Ignore body parse errors; default behavior applies
      }

      // Determine pivot date: either from the specified instance or today (fallback)
      let pivotDate = new Date();
      pivotDate.setHours(0, 0, 0, 0);

      if (fromClassId) {
        const pivotSession = await prisma.classSession.findFirst({
          where: { classId: fromClassId, seriesId },
          select: { date: true },
        });
        if (!pivotSession) {
          return NextResponse.json(
            { error: "指定された授業インスタンスが見つかりません" },
            { status: 400 }
          );
        }
        // Normalize to start of day in UTC to match storage/formatting behavior
        const d = new Date(pivotSession.date);
        d.setUTCHours(0, 0, 0, 0);
        pivotDate = d;
      }

      // Count future sessions
      const futureSessionsCount = await prisma.classSession.count({
        where: {
          seriesId,
          date: {
            gte: pivotDate,
          },
        },
      });

      if (futureSessionsCount === 0) {
        return NextResponse.json(
          { error: "削除可能な未来のセッションがありません" },
          { status: 400 }
        );
      }

      // Delete future sessions and their enrollments in a transaction
      await prisma.$transaction(async (tx) => {
        // Get all future session IDs for this series
        const futureSessions = await tx.classSession.findMany({
          where: {
            seriesId,
            date: {
              gte: pivotDate,
            },
          },
          select: {
            classId: true,
          },
        });
        
        const sessionIds = futureSessions.map(session => session.classId);
        
        // First delete all enrollments for these sessions
        if (sessionIds.length > 0) {
          await tx.studentClassEnrollment.deleteMany({
            where: {
              classId: {
                in: sessionIds,
              },
            },
          });
        }
        
        // Then delete the future sessions
        await tx.classSession.deleteMany({
          where: {
            seriesId,
            date: {
              gte: pivotDate,
            },
          },
        });
      });

      return NextResponse.json(
        {
          data: [],
          message: `${futureSessionsCount}件の未来の授業を削除しました`,
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
      console.error("Error deleting class session series:", error);
      return NextResponse.json(
        { error: "授業シリーズの削除に失敗しました" },
        { status: 500 }
      );
    }
  }
);
