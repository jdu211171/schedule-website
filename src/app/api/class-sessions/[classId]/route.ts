// src/app/api/class-sessions/[classId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classSessionUpdateSchema } from "@/schemas/class-session.schema";
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
    subjectId: classSession.subjectId,
    subjectName: classSession.subject?.name || null,
    classTypeId: classSession.classTypeId,
    classTypeName: classSession.classType?.name || null,
    boothId: classSession.boothId,
    boothName: classSession.booth?.name || null,
    branchId: classSession.branchId,
    branchName: classSession.branch?.name || null,
    date: formattedDate,
    startTime: formattedStartTime,
    endTime: formattedEndTime,
    duration: classSession.duration,
    notes: classSession.notes,
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

// Helper function to check if a date conflicts with any events
const checkEventConflict = async (date: Date, branchId: string): Promise<boolean> => {
  const events = await prisma.event.findMany({
    where: {
      OR: [
        { branchId: branchId },
        { branchId: null }, // Global events
      ],
      AND: [
        { startDate: { lte: date } },
        { endDate: { gte: date } },
      ],
    },
  });

  return events.length > 0;
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

    if (!classSession) {
      return NextResponse.json(
        { error: "クラスセッションが見つかりません" },
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
        { error: "このクラスセッションにアクセスする権限がありません" },
        { status: 403 }
      );
    }

    // Format response
    const formattedClassSession = formatClassSession(classSession);

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
          { error: "クラスセッションが見つかりません" },
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
          { error: "このクラスセッションにアクセスする権限がありません" },
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
      } = {
        teacherId,
        studentId,
        subjectId,
        classTypeId,
        boothId,
        notes,
      };

      // Handle date updates and check for event conflicts
      if (date) {
        const newDate = parseISO(date);

        // Check if the new date conflicts with any events
        const hasEventConflict = await checkEventConflict(newDate, existingClassSession.branchId || branchId);

        if (hasEventConflict) {
          return NextResponse.json(
            { error: "指定された日付はイベント期間中のため、クラスセッションを更新できません" },
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

      // Update class session
      const updatedClassSession = await prisma.classSession.update({
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

      // Format response
      const formattedClassSession = formatClassSession(updatedClassSession);

      return NextResponse.json({
        data: formattedClassSession,
        message: "クラスセッションを更新しました",
      });
    } catch (error) {
      console.error("Error updating class session:", error);
      return NextResponse.json(
        { error: "クラスセッションの更新に失敗しました" },
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
          { error: "クラスセッションが見つかりません" },
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
          { error: "このクラスセッションにアクセスする権限がありません" },
          { status: 403 }
        );
      }

      // Delete the class session
      await prisma.classSession.delete({
        where: { classId },
      });

      return NextResponse.json(
        {
          data: [],
          message: "クラスセッションを削除しました",
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
        { error: "クラスセッションの削除に失敗しました" },
        { status: 500 }
      );
    }
  }
);
