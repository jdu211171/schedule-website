// src/app/api/class-sessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  classSessionCreateSchema,
  classSessionFilterSchema,
} from "@/schemas/class-session.schema";
import { ClassSession } from "@prisma/client";
import {
  addDays,
  format,
  parse,
  parseISO,
  differenceInDays,
  getDay,
} from "date-fns";
import { v4 as uuidv4 } from "uuid";

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

// GET - List class sessions with pagination and filters
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest, session, branchId) => {
    // Parse query parameters
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    // Validate and parse filter parameters
    const result = classSessionFilterSchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json(
        { error: "フィルターパラメータが無効です" }, // "Invalid filter parameters"
        { status: 400 }
      );
    }

    const {
      page,
      limit,
      teacherId,
      studentId,
      subjectId,
      classTypeId,
      boothId,
      startDate,
      endDate,
      seriesId,
    } = result.data;

    // Build filter conditions
    const where: any = {};

    // If a specific branchId is provided in the request, use that
    if (result.data.branchId) {
      where.branchId = result.data.branchId;
    }
    // Otherwise use the user's current branch unless they are an admin
    else if (session.user?.role !== "ADMIN") {
      where.branchId = branchId;
    }

    if (teacherId) {
      where.teacherId = teacherId;
    }

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

    if (startDate) {
      where.date = {
        ...(where.date || {}),
        gte: parseISO(startDate),
      };
    }

    if (endDate) {
      where.date = {
        ...(where.date || {}),
        lte: parseISO(endDate),
      };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch total count
    const total = await prisma.classSession.count({ where });

    // Fetch class sessions with related entities
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
      skip,
      take: limit,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    // Format class sessions
    const formattedClassSessions = classSessions.map(formatClassSession);

    return NextResponse.json({
      data: formattedClassSessions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }
);

// POST - Create a new class session or series of recurring sessions
export const POST = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = classSessionCreateSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "入力データが無効です" }, // "Invalid input data"
          { status: 400 }
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
        isRecurring,
        startDate,
        endDate,
        daysOfWeek,
      } = result.data;

      // For admin users, allow specifying branch. For others, use current branch
      const sessionBranchId =
        session.user?.role === "ADMIN" && result.data.branchId
          ? result.data.branchId
          : branchId;

      // Convert string times to Date objects
      const dateObj = parseISO(date);
      const startDateTime = createDateTime(date, startTime);
      const endDateTime = createDateTime(date, endTime);

      // Check if endTime is after startTime
      if (endDateTime <= startDateTime) {
        return NextResponse.json(
          { error: "終了時間は開始時間より後でなければなりません" },
          { status: 400 }
        );
      }

      // Calculate duration if not provided
      const calculatedDuration =
        duration ||
        Math.round(
          (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60)
        );

      // Base data for class session creation
      const sessionData = {
        teacherId,
        studentId,
        subjectId,
        classTypeId,
        boothId,
        branchId: sessionBranchId,
        duration: calculatedDuration,
        notes,
      };

      // Handle one-time or recurring sessions
      if (!isRecurring) {
        // Create a single class session
        const newClassSession = await prisma.classSession.create({
          data: {
            ...sessionData,
            seriesId: null,
            date: dateObj,
            startTime: startDateTime,
            endTime: endDateTime,
          },
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

        const formattedSession = formatClassSession(newClassSession);

        return NextResponse.json(
          {
            data: [formattedSession],
            message: "クラスセッションを作成しました",
            pagination: {
              total: 1,
              page: 1,
              limit: 1,
              pages: 1,
            },
          },
          { status: 201 }
        );
      } else {
        // Validate recurring session parameters
        if (!endDate) {
          return NextResponse.json(
            { error: "繰り返しクラスでは終了日が必要です" },
            { status: 400 }
          );
        }

        if (!daysOfWeek || daysOfWeek.length === 0) {
          return NextResponse.json(
            { error: "繰り返しクラスでは曜日を選択する必要があります" },
            { status: 400 }
          );
        }

        // Use startDate if provided, otherwise use date as the start date
        const effectiveStartDate = startDate ? parseISO(startDate) : dateObj;
        const effectiveEndDate = parseISO(endDate);

        // Adjust times to avoid timezone issues
        effectiveStartDate.setHours(0, 0, 0, 0);
        effectiveEndDate.setHours(23, 59, 59, 999);

        if (effectiveEndDate < effectiveStartDate) {
          return NextResponse.json(
            { error: "終了日は開始日より後でなければなりません" },
            { status: 400 }
          );
        }

        // Generate a unique series ID
        const seriesId = uuidv4();

        const days = differenceInDays(effectiveEndDate, effectiveStartDate) + 1;
        const sessionDates: Date[] = [];

        // Find all matching dates
        for (let i = 0; i < days; i++) {
          const currentDate = addDays(effectiveStartDate, i);
          const dayOfWeek = getDay(currentDate); // 0 = Sunday, 6 = Saturday

          if (daysOfWeek.includes(dayOfWeek)) {
            sessionDates.push(new Date(currentDate));
          }
        }

        if (sessionDates.length === 0) {
          return NextResponse.json(
            { error: "指定された日付範囲内に該当する曜日がありません" },
            { status: 400 }
          );
        }

        // Create class sessions for all dates
        const createdSessions = await prisma.$transaction(
          sessionDates.map((sessionDate) => {
            const sessionStartTime = createDateTime(
              format(sessionDate, "yyyy-MM-dd"),
              startTime
            );
            const sessionEndTime = createDateTime(
              format(sessionDate, "yyyy-MM-dd"),
              endTime
            );

            return prisma.classSession.create({
              data: {
                ...sessionData,
                seriesId,
                date: sessionDate,
                startTime: sessionStartTime,
                endTime: sessionEndTime,
              },
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

        const formattedSessions = createdSessions.map(formatClassSession);

        return NextResponse.json(
          {
            data: formattedSessions,
            message: `${formattedSessions.length}件の繰り返しクラスセッションを作成しました`,
            pagination: {
              total: formattedSessions.length,
              page: 1,
              limit: formattedSessions.length,
              pages: 1,
            },
            seriesId,
          },
          { status: 201 }
        );
      }
    } catch (error) {
      console.error("Error creating class session:", error);
      return NextResponse.json(
        { error: "クラスセッションの作成に失敗しました" },
        { status: 500 }
      );
    }
  }
);
