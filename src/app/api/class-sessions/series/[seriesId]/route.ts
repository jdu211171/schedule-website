// src/app/api/class-sessions/series/[seriesId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classSessionSeriesUpdateSchema } from "@/schemas/class-session.schema";
import { ClassSession } from "@prisma/client";
import { parse, format, parseISO } from "date-fns";

type FormattedClassSession = {
  classId: string;
  seriesId: string | null;
  teacherId: string | null;
  teacherName: string | null;
  studentId: string | null;
  studentName: string | null;
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
  createdAt: string;
  updatedAt: string;
};

// Helper function to format class session response
const formatClassSession = (
  classSession: ClassSession & {
    teacher?: { name: string } | null;
    student?: { name: string } | null;
    subject?: { name: string } | null;
    classType?: { name: string } | null;
    booth?: { name: string } | null;
    branch?: { name: string } | null;
  }
): FormattedClassSession => ({
  classId: classSession.classId,
  seriesId: classSession.seriesId,
  teacherId: classSession.teacherId,
  teacherName: classSession.teacher?.name || null,
  studentId: classSession.studentId,
  studentName: classSession.student?.name || null,
  subjectId: classSession.subjectId,
  subjectName: classSession.subject?.name || null,
  classTypeId: classSession.classTypeId,
  classTypeName: classSession.classType?.name || null,
  boothId: classSession.boothId,
  boothName: classSession.booth?.name || null,
  branchId: classSession.branchId,
  branchName: classSession.branch?.name || null,
  date: format(classSession.date, "yyyy-MM-dd"),
  startTime: format(classSession.startTime, "HH:mm"),
  endTime: format(classSession.endTime, "HH:mm"),
  duration: classSession.duration,
  notes: classSession.notes,
  createdAt: format(classSession.createdAt, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
  updatedAt: format(classSession.updatedAt, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
});

// Helper function to create a DateTime from date and time string
const createDateTime = (dateStr: string, timeString: string): Date => {
  const date = parseISO(dateStr);
  const parsedTime = parse(timeString, "HH:mm", new Date());
  const hours = parsedTime.getHours();
  const minutes = parsedTime.getMinutes();

  const result = new Date(date);
  result.setHours(hours);
  result.setMinutes(minutes);
  result.setSeconds(0);
  result.setMilliseconds(0);

  return result;
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

      // Check today's date to only update future sessions
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Time handling
      const hasTimeUpdate = startTime !== undefined || endTime !== undefined;

      // If updating times, validate them
      if (startTime && endTime) {
        // We need a base date for parsing, but we'll update each session with its own date
        const baseDate = format(new Date(), "yyyy-MM-dd");
        const testStartTime = createDateTime(baseDate, startTime);
        const testEndTime = createDateTime(baseDate, endTime);

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

      // Get all future sessions in the series
      const futureSessions = await prisma.classSession.findMany({
        where: {
          seriesId,
          date: {
            gte: today,
          },
        },
      });

      if (futureSessions.length === 0) {
        return NextResponse.json(
          { error: "更新可能な未来のセッションがありません" },
          { status: 400 }
        );
      }

      // Update each future session
      const updatedSessions = await prisma.$transaction(
        futureSessions.map((session) => {
          // If updating times, calculate for each session's date
          if (hasTimeUpdate) {
            const sessionDateStr = format(session.date, "yyyy-MM-dd");

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

          return prisma.classSession.update({
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
        })
      );

      // Format response
      const formattedSessions = updatedSessions.map(formatClassSession);

      return NextResponse.json({
        data: formattedSessions,
        message: `${formattedSessions.length}件の未来のクラスセッションを更新しました`,
        pagination: {
          total: formattedSessions.length,
          page: 1,
          limit: formattedSessions.length,
          pages: 1,
        },
      });
    } catch (error) {
      console.error("Error updating class session series:", error);
      return NextResponse.json(
        { error: "クラスセッションシリーズの更新に失敗しました" },
        { status: 500 }
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

      // Check today's date to only delete future sessions
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Count future sessions
      const futureSessionsCount = await prisma.classSession.count({
        where: {
          seriesId,
          date: {
            gte: today,
          },
        },
      });

      if (futureSessionsCount === 0) {
        return NextResponse.json(
          { error: "削除可能な未来のセッションがありません" },
          { status: 400 }
        );
      }

      // Delete future sessions
      await prisma.classSession.deleteMany({
        where: {
          seriesId,
          date: {
            gte: today,
          },
        },
      });

      return NextResponse.json(
        {
          data: [],
          message: `${futureSessionsCount}件の未来のクラスセッションを削除しました`,
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
        { error: "クラスセッションシリーズの削除に失敗しました" },
        { status: 500 }
      );
    }
  }
);
