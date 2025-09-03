// src/app/api/teachers/me/class-sessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classSessionFilterSchema } from "@/schemas/class-session.schema";

// Helper function to create UTC date for filtering
const createUTCDateForFilter = (dateString: string): Date => {
  const dateParts = dateString.split("-").map(Number);
  return new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0, 0));
};

// Helper function to format class session response
const formatClassSession = (classSession: any) => {
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
    boothId: classSession.boothId,
    boothName: classSession.booth?.name || null,
    branchId: classSession.branchId,
    branchName: classSession.branch?.name || null,
    date: formattedDate,
    startTime: formattedStartTime,
    endTime: formattedEndTime,
    duration: classSession.duration,
    notes: classSession.notes,
    createdAt: classSession.createdAt.toISOString(),
    updatedAt: classSession.updatedAt.toISOString(),
  };
};

// GET - Get teacher's own class sessions
export const GET = withRole(
  ["TEACHER"],
  async (request: NextRequest, session) => {
    try {
      // Parse query parameters
      const url = new URL(request.url);
      const params = Object.fromEntries(url.searchParams.entries());

      // Remove teacherId from params since we'll use session data
      const { teacherId: _, ...filteredParams } = params;

      // Validate and parse filter parameters
      const result = classSessionFilterSchema.safeParse(filteredParams);
      if (!result.success) {
        return NextResponse.json(
          { error: "フィルターパラメータが無効です" }, // "Invalid filter parameters"
          { status: 400 }
        );
      }

      const {
        page,
        limit,
        startDate,
        endDate,
        studentId,
        subjectId,
        classTypeId,
        boothId,
        seriesId
      } = result.data;

      // Get the teacher record to ensure the user is a valid teacher
      const teacher = await prisma.teacher.findFirst({
        where: { userId: session.user?.id },
      });

      if (!teacher) {
        return NextResponse.json(
          { error: "講師アカウントが見つかりません" }, // "Teacher account not found"
          { status: 404 }
        );
      }

      // Build filter conditions - always filter by the authenticated teacher's ID
      const where: Record<string, any> = {
        teacherId: teacher.teacherId, // Use the authenticated teacher's ID from session
        isCancelled: false, // Do not include cancelled sessions in teacher self-view
      };

      // Apply additional filters
      if (studentId) {
        where.studentId = studentId;
      }

      if (subjectId) {
        where.subjectId = subjectId;
      }

      if (classTypeId) {
        where.classTypeId = classTypeId;
      }

      if (boothId) {
        where.boothId = boothId;
      }

      if (seriesId) {
        where.seriesId = seriesId;
      }

      // Date range filtering
      if (startDate || endDate) {
        where.date = {};

        if (startDate) {
          where.date.gte = createUTCDateForFilter(startDate);
        }

        if (endDate) {
          // Create UTC date for end of day (23:59:59.999) to include the entire end date
          const endDateParts = endDate.split("-").map(Number);
          const endYear = endDateParts[0];
          const endMonth = endDateParts[1] - 1;
          const endDay = endDateParts[2];
          where.date.lte = new Date(Date.UTC(endYear, endMonth, endDay, 23, 59, 59, 999));
        }
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Fetch total count
      const total = await prisma.classSession.count({ where });

      // Fetch class sessions with includes
      const classSessions = await prisma.classSession.findMany({
        where,
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
        orderBy: [
          { date: "asc" },
          { startTime: "asc" },
        ],
        skip,
        take: limit,
      });

      // Format response
      const formattedClassSessions = classSessions.map(formatClassSession);

      const pages = Math.ceil(total / limit);

      return NextResponse.json({
        data: formattedClassSessions,
        pagination: {
          total,
          page,
          limit,
          pages,
        },
      });
    } catch (error) {
      console.error("Error fetching teacher's class sessions:", error);
      return NextResponse.json(
        { error: "授業の取得に失敗しました" }, // "Failed to fetch class sessions"
        { status: 500 }
      );
    }
  }
);
