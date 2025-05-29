// src/app/api/class-sessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  classSessionCreateSchema,
  classSessionFilterSchema,
  classSessionBulkDeleteSchema,
} from "@/schemas/class-session.schema";
import { ClassSession } from "@prisma/client";
import { addDays, format, parseISO, differenceInDays, getDay } from "date-fns";
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

// Helper function to create UTC date for filtering (fixes timezone issues)
const createUTCDateForFilter = (dateStr: string): Date => {
  const dateParts = dateStr.split("-").map(Number);
  const year = dateParts[0];
  const month = dateParts[1] - 1; // JavaScript months are 0-based
  const day = dateParts[2];

  // Create a UTC date object with time set to 00:00:00 to match database storage
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
};

// Helper function to check if a date conflicts with any events
const checkEventConflict = async (
  date: Date,
  branchId: string
): Promise<boolean> => {
  const events = await prisma.event.findMany({
    where: {
      OR: [
        { branchId: branchId },
        { branchId: null }, // Global events
      ],
      AND: [{ startDate: { lte: date } }, { endDate: { gte: date } }],
    },
  });

  return events.length > 0;
};

// GET - List class sessions with pagination and filters
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER", "STUDENT"],
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
      userId,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    // If a specific branchId is provided in the request, use that
    if (result.data.branchId) {
      where.branchId = result.data.branchId;
    }
    // Otherwise use the user's current branch unless they are an admin
    else if (session.user?.role !== "ADMIN") {
      where.branchId = branchId;
    }

    if (userId) {
      where.OR = [
        {
          teacher: {
            userId: userId,
          },
        },
        {
          student: {
            userId: userId,
          },
        },
      ];
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

    // Date range filtering - FIXED to use UTC dates
    if (startDate || endDate) {
      where.date = {};

      if (startDate) {
        // Create UTC date for start of day to match database storage
        where.date.gte = createUTCDateForFilter(startDate);
      }

      if (endDate) {
        // Create UTC date for end of day (23:59:59.999) to include the entire end date
        const endDateParts = endDate.split("-").map(Number);
        const endYear = endDateParts[0];
        const endMonth = endDateParts[1] - 1;
        const endDay = endDateParts[2];
        where.date.lte = new Date(
          Date.UTC(endYear, endMonth, endDay, 23, 59, 59, 999)
        );
      }
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

      // Convert date string to Date object using UTC to avoid timezone issues
      const [year, month, day] = date.split("-").map(Number);
      const dateObj = new Date(Date.UTC(year, month - 1, day));

      // Convert string times to Date objects
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
        // Check if the date conflicts with any events
        const hasEventConflict = await checkEventConflict(
          dateObj,
          sessionBranchId
        );

        if (hasEventConflict) {
          return NextResponse.json(
            {
              data: [],
              message:
                "指定された日付はイベント期間中のため、クラスセッションをスキップしました",
              pagination: {
                total: 0,
                page: 1,
                limit: 0,
                pages: 0,
              },
              skipped: {
                eventConflict: [format(dateObj, "yyyy年MM月dd日")],
              },
            },
            { status: 200 }
          );
        }

        // Check for existing session with same teacher, date, and time
        const existingSession = await prisma.classSession.findFirst({
          where: {
            teacherId,
            date: dateObj,
            startTime: startDateTime,
            endTime: endDateTime,
          },
        });

        if (existingSession) {
          return NextResponse.json(
            { error: "同じ講師、日付、時間のクラスセッションが既に存在します" },
            { status: 409 }
          );
        }

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
        let effectiveStartDate;
        if (startDate) {
          const [sYear, sMonth, sDay] = startDate.split("-").map(Number);
          effectiveStartDate = new Date(Date.UTC(sYear, sMonth - 1, sDay));
        } else {
          effectiveStartDate = dateObj;
        }

        // Convert endDate to Date object using UTC
        const [eYear, eMonth, eDay] = endDate.split("-").map(Number);
        const effectiveEndDate = new Date(Date.UTC(eYear, eMonth - 1, eDay));

        // Adjust times to avoid timezone issues
        effectiveStartDate.setUTCHours(0, 0, 0, 0);
        effectiveEndDate.setUTCHours(23, 59, 59, 999);

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

        // Filter out dates that conflict with events
        const validSessionDates: Date[] = [];
        const skippedEventDates: Date[] = [];

        for (const sessionDate of sessionDates) {
          const hasEventConflict = await checkEventConflict(
            sessionDate,
            sessionBranchId
          );

          if (hasEventConflict) {
            skippedEventDates.push(sessionDate);
          } else {
            validSessionDates.push(sessionDate);
          }
        }

        // If all dates were filtered out due to events, return appropriate message
        if (validSessionDates.length === 0) {
          return NextResponse.json(
            {
              data: [],
              message:
                "すべての日付がイベント期間中のため、クラスセッションをスキップしました",
              pagination: {
                total: 0,
                page: 1,
                limit: 0,
                pages: 0,
              },
              skipped: {
                eventConflict: skippedEventDates.map((date) =>
                  format(date, "yyyy年MM月dd日")
                ),
              },
            },
            { status: 200 }
          );
        }

        // Check for existing sessions that would conflict
        const conflictingSessions = [];
        for (const sessionDate of validSessionDates) {
          const formattedSessionDate = format(sessionDate, "yyyy-MM-dd");
          const sessionStartTime = createDateTime(
            formattedSessionDate,
            startTime
          );
          const sessionEndTime = createDateTime(formattedSessionDate, endTime);

          const existingSession = await prisma.classSession.findFirst({
            where: {
              teacherId,
              date: sessionDate,
              startTime: sessionStartTime,
              endTime: sessionEndTime,
            },
          });

          if (existingSession) {
            conflictingSessions.push(sessionDate);
          }
        }

        if (conflictingSessions.length > 0) {
          const conflictDates = conflictingSessions
            .map((date) => format(date, "yyyy年MM月dd日"))
            .join(", ");
          return NextResponse.json(
            {
              error: `次の日付で既存のクラスセッションと重複しています: ${conflictDates}`,
            },
            { status: 409 }
          );
        }

        // Create class sessions for all valid dates
        const createdSessions = await prisma.$transaction(
          validSessionDates.map((sessionDate) => {
            // Format the date to YYYY-MM-DD string
            const formattedSessionDate = format(sessionDate, "yyyy-MM-dd");

            // Create start and end times for this session using UTC
            const sessionStartTime = createDateTime(
              formattedSessionDate,
              startTime
            );
            const sessionEndTime = createDateTime(
              formattedSessionDate,
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

        // Create response message based on whether any dates were skipped
        let message = `${formattedSessions.length}件の繰り返しクラスセッションを作成しました`;
        const responseData = {
          data: formattedSessions,
          message,
          pagination: {
            total: formattedSessions.length,
            page: 1,
            limit: formattedSessions.length,
            pages: 1,
          },
          seriesId,
          skipped: undefined as { eventConflict: string[] } | undefined,
        };

        // Add skipped dates information if any
        if (skippedEventDates.length > 0) {
          message += `（${skippedEventDates.length}件の日付をイベント期間中のためスキップしました）`;
          responseData.message = message;
          responseData.skipped = {
            eventConflict: skippedEventDates.map((date) =>
              format(date, "yyyy年MM月dd日")
            ),
          };
        }

        return NextResponse.json(responseData, { status: 201 });
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

// DELETE - Bulk delete class sessions
export const DELETE = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = classSessionBulkDeleteSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "入力データが無効です" }, // "Invalid input data"
          { status: 400 }
        );
      }

      const { classIds } = result.data;

      // Fetch all class sessions to be deleted
      const classSessionsToDelete = await prisma.classSession.findMany({
        where: {
          classId: {
            in: classIds,
          },
        },
      });

      if (classSessionsToDelete.length === 0) {
        return NextResponse.json(
          { error: "削除対象のクラスセッションが見つかりません" },
          { status: 404 }
        );
      }

      // Check if user has access to all class sessions' branches (non-admin users)
      if (session.user?.role !== "ADMIN") {
        const unauthorizedSessions = classSessionsToDelete.filter(
          (session) => session.branchId && session.branchId !== branchId
        );

        if (unauthorizedSessions.length > 0) {
          return NextResponse.json(
            { error: "一部のクラスセッションにアクセスする権限がありません" },
            { status: 403 }
          );
        }
      }

      // Count sessions that actually exist and will be deleted
      const actualDeleteCount = classSessionsToDelete.length;

      // Delete the class sessions
      await prisma.classSession.deleteMany({
        where: {
          classId: {
            in: classIds,
          },
        },
      });

      return NextResponse.json(
        {
          data: [],
          message: `${actualDeleteCount}件のクラスセッションを削除しました`,
          deletedCount: actualDeleteCount,
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
      console.error("Error bulk deleting class sessions:", error);
      return NextResponse.json(
        { error: "クラスセッションの一括削除に失敗しました" },
        { status: 500 }
      );
    }
  }
);
