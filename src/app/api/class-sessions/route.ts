// src/app/api/class-sessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  classSessionCreateSchema,
  classSessionFilterSchema,
  classSessionBulkDeleteSchema,
  ConflictInfo,
  SessionAction,
} from "@/schemas/class-session.schema";
import { ClassSession } from "@prisma/client";
import { addDays, format, parseISO, differenceInDays, getDay } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { getDetailedSharedAvailability } from "@/lib/enhanced-availability";

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

// Helper function to check if a date conflicts with any vacations
const checkVacationConflict = async (
  date: Date,
  branchId: string
): Promise<boolean> => {
  const vacations = await prisma.vacation.findMany({
    where: {
      OR: [
        { branchId: branchId },
        { branchId: null }, // Global vacations
      ],
      AND: [{ startDate: { lte: date } }, { endDate: { gte: date } }],
    },
  });

  return vacations.length > 0;
};

// Helper function to get day of week from date
const getDayOfWeekFromDate = (date: Date): string => {
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
};

// Enhanced conflict detection using shared availability
const checkEnhancedAvailabilityConflicts = async (
  teacherId: string | null,
  studentId: string | null,
  date: Date,
  startTime: Date,
  endTime: Date
): Promise<ConflictInfo | null> => {
  // If either teacher or student is missing, we can't check shared availability
  if (!teacherId || !studentId) {
    return null;
  }

  // Get teacher and student user IDs and names
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
    return null;
  }

  try {
    // Use enhanced shared availability to get detailed conflict information
    const availabilityDetails = await getDetailedSharedAvailability(
      teacher.userId,
      student.userId,
      date,
      startTime,
      endTime
    );

    if (!availabilityDetails.available) {
      const dateStr = format(date, "yyyy-MM-dd");
      const dayOfWeek = getDayOfWeekFromDate(date);

      // Determine conflict type based on individual user availability
      let conflictType: ConflictInfo["type"] = "NO_SHARED_AVAILABILITY";
      let details = "";
      let participant: ConflictInfo["participant"] | undefined;

      // Check specific reasons for unavailability
      if (
        !availabilityDetails.user1.available &&
        !availabilityDetails.user2.available
      ) {
        // Both unavailable - choose the more specific error
        if (availabilityDetails.user1.conflictType === "UNAVAILABLE") {
          conflictType = "TEACHER_UNAVAILABLE";
          details = `${teacher.name}先生はこの日に利用可能時間が設定されていません`;
          participant = {
            id: teacherId,
            name: teacher.name,
            role: "teacher",
          };
        } else {
          conflictType = "STUDENT_UNAVAILABLE";
          details = `${student.name}さんはこの日に利用可能時間が設定されていません`;
          participant = {
            id: studentId,
            name: student.name,
            role: "student",
          };
        }
      } else if (!availabilityDetails.user1.available) {
        // Teacher unavailable
        if (availabilityDetails.user1.conflictType === "UNAVAILABLE") {
          conflictType = "TEACHER_UNAVAILABLE";
          details = `${teacher.name}先生はこの日に利用可能時間が設定されていません`;
        } else {
          conflictType = "TEACHER_WRONG_TIME";
          details = `${teacher.name}先生は指定された時間帯に利用できません。利用可能な時間帯をご確認ください。`;
        }
        participant = {
          id: teacherId,
          name: teacher.name,
          role: "teacher",
        };
      } else if (!availabilityDetails.user2.available) {
        // Student unavailable
        if (availabilityDetails.user2.conflictType === "UNAVAILABLE") {
          conflictType = "STUDENT_UNAVAILABLE";
          details = `${student.name}さんはこの日に利用可能時間が設定されていません`;
        } else {
          conflictType = "STUDENT_WRONG_TIME";
          details = `${student.name}さんは指定された時間帯に利用できません。利用可能な時間帯をご確認ください。`;
        }
        participant = {
          id: studentId,
          name: student.name,
          role: "student",
        };
      } else {
        // Both are individually available but no shared slots
        conflictType = "NO_SHARED_AVAILABILITY";
        details =
          "講師と生徒の利用可能時間に重複がありません。別の時間帯をご選択ください。";
      }

      return {
        date: dateStr,
        dayOfWeek,
        type: conflictType,
        details,
        participant,
        sharedAvailableSlots: availabilityDetails.sharedSlots,
        teacherSlots: availabilityDetails.user1.effectiveSlots,
        studentSlots: availabilityDetails.user2.effectiveSlots,
        availabilityStrategy: availabilityDetails.strategy,
        // For backward compatibility
        availableSlots: availabilityDetails.sharedSlots,
      };
    }

    return null; // No conflicts
  } catch (error) {
    console.error("Error checking enhanced availability:", error);
    // Fallback to simpler conflict detection
    return null;
  }
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
      hasTeacher,
      hasStudent,
      hasSubject,
      hasBooth,
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

    // Add filters for unset parameters
    if (hasTeacher !== undefined) {
      where.teacherId = hasTeacher ? { not: null } : null;
    }

    if (hasStudent !== undefined) {
      where.studentId = hasStudent ? { not: null } : null;
    }

    if (hasSubject !== undefined) {
      where.subjectId = hasSubject ? { not: null } : null;
    }

    if (hasBooth !== undefined) {
      where.boothId = hasBooth ? { not: null } : null;
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

      // Validate request body - extended with new fields
      const extendedSchema = classSessionCreateSchema.extend({
        checkAvailability: z.boolean().optional().default(true),
        skipConflicts: z.boolean().optional().default(false),
        forceCreate: z.boolean().optional().default(false),
      });

      const result = extendedSchema.safeParse(body);
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
        checkAvailability,
        skipConflicts,
        forceCreate,
        sessionActions,
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
        // Handle single session
        const conflicts: ConflictInfo[] = [];

        // Check vacation conflict
        const hasVacationConflict = await checkVacationConflict(
          dateObj,
          sessionBranchId
        );

        if (hasVacationConflict) {
          conflicts.push({
            date: format(dateObj, "yyyy-MM-dd"),
            dayOfWeek: getDayOfWeekFromDate(dateObj),
            type: "VACATION",
            details: "指定された日付は休日期間中です",
          });
        }

        // Enhanced availability check
        if (checkAvailability && teacherId && studentId) {
          const availabilityConflict = await checkEnhancedAvailabilityConflicts(
            teacherId,
            studentId,
            dateObj,
            startDateTime,
            endDateTime
          );

          if (availabilityConflict) {
            conflicts.push(availabilityConflict);
          }
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

        // Check for booth conflicts if booth is specified
        if (boothId) {
          const boothConflict = await prisma.classSession.findFirst({
            where: {
              boothId,
              date: dateObj,
              OR: [
                // Session starts during existing session
                {
                  AND: [
                    { startTime: { lte: startDateTime } },
                    { endTime: { gt: startDateTime } },
                  ],
                },
                // Session ends during existing session
                {
                  AND: [
                    { startTime: { lt: endDateTime } },
                    { endTime: { gte: endDateTime } },
                  ],
                },
                // Session completely contains existing session
                {
                  AND: [
                    { startTime: { gte: startDateTime } },
                    { endTime: { lte: endDateTime } },
                  ],
                },
              ],
            },
            include: {
              teacher: {
                select: { name: true },
              },
              student: {
                select: { name: true },
              },
              booth: {
                select: { name: true },
              },
            },
          });

          if (boothConflict) {
            const conflictStartTime = format(boothConflict.startTime, "HH:mm");
            const conflictEndTime = format(boothConflict.endTime, "HH:mm");
            const boothName = boothConflict.booth?.name || "不明なブース";

            if (!forceCreate) {
              conflicts.push({
                date: format(dateObj, "yyyy-MM-dd"),
                dayOfWeek: getDayOfWeekFromDate(dateObj),
                type: "BOOTH_CONFLICT",
                details: `ブース「${boothName}」は${conflictStartTime}-${conflictEndTime}に既に使用されています`,
                conflictingSession: {
                  classId: boothConflict.classId,
                  teacherName: boothConflict.teacher?.name || "不明",
                  studentName: boothConflict.student?.name || "不明",
                  startTime: conflictStartTime,
                  endTime: conflictEndTime,
                },
              });
            }
          }
        }

        // Handle conflicts based on user preference
        if (conflicts.length > 0 && !forceCreate) {
          return NextResponse.json(
            {
              conflicts,
              message:
                "スケジュールの競合が見つかりました。利用可能な時間帯から選択するか、競合を無視して作成してください。",
              requiresConfirmation: true,
            },
            { status: 400 }
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
            message:
              conflicts.length > 0
                ? "クラスセッションを作成しました（競合あり）"
                : "クラスセッションを作成しました",
            conflicts: conflicts.length > 0 ? conflicts : undefined,
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
        // Recurring sessions logic...
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

        // Create a map of session actions if provided
        const sessionActionMap = new Map<string, SessionAction>();
        if (sessionActions) {
          sessionActions.forEach((action) => {
            sessionActionMap.set(action.date, action);
          });
        }

        // Check for conflicts on all dates
        const allConflicts: ConflictInfo[] = [];
        const sessionConflictMap = new Map<string, ConflictInfo[]>();
        const validSessionDates: Date[] = [];
        const skippedDates: Date[] = [];
        const forcedDates: Date[] = [];
        const alternativeDates: Array<{
          date: Date;
          newStartTime: string;
          newEndTime: string;
        }> = [];

        for (const sessionDate of sessionDates) {
          const dateConflicts: ConflictInfo[] = [];
          const formattedSessionDate = format(sessionDate, "yyyy-MM-dd");

          // Check if user provided specific action for this date
          const userAction = sessionActionMap.get(formattedSessionDate);

          // Determine times to use (original or alternative)
          let effectiveStartTime = startTime;
          let effectiveEndTime = endTime;

          if (
            userAction?.action === "USE_ALTERNATIVE" &&
            userAction.alternativeStartTime &&
            userAction.alternativeEndTime
          ) {
            effectiveStartTime = userAction.alternativeStartTime;
            effectiveEndTime = userAction.alternativeEndTime;
            alternativeDates.push({
              date: sessionDate,
              newStartTime: effectiveStartTime,
              newEndTime: effectiveEndTime,
            });
          }

          const sessionStartTime = createDateTime(
            formattedSessionDate,
            effectiveStartTime
          );
          const sessionEndTime = createDateTime(
            formattedSessionDate,
            effectiveEndTime
          );

          // Handle user actions first
          if (userAction) {
            switch (userAction.action) {
              case "SKIP":
                skippedDates.push(sessionDate);
                continue;
              case "FORCE_CREATE":
                forcedDates.push(sessionDate);
                validSessionDates.push(sessionDate);
                continue;
              // USE_ALTERNATIVE continues to conflict checking with new times
            }
          }

          // Check vacation conflict
          const hasVacationConflict = await checkVacationConflict(
            sessionDate,
            sessionBranchId
          );

          if (hasVacationConflict) {
            dateConflicts.push({
              date: formattedSessionDate,
              dayOfWeek: getDayOfWeekFromDate(sessionDate),
              type: "VACATION",
              details: "指定された日付は休日期間中です",
            });
          }

          // Enhanced availability check
          if (checkAvailability && teacherId && studentId) {
            const availabilityConflict =
              await checkEnhancedAvailabilityConflicts(
                teacherId,
                studentId,
                sessionDate,
                sessionStartTime,
                sessionEndTime
              );

            if (availabilityConflict) {
              dateConflicts.push(availabilityConflict);
            }
          }

          // Check for existing session conflict
          const existingSession = await prisma.classSession.findFirst({
            where: {
              teacherId,
              date: sessionDate,
              startTime: sessionStartTime,
              endTime: sessionEndTime,
            },
          });

          if (existingSession) {
            skippedDates.push(sessionDate);
            continue;
          }

          // Check for booth conflicts if booth is specified
          if (boothId) {
            const boothConflict = await prisma.classSession.findFirst({
              where: {
                boothId,
                date: sessionDate,
                OR: [
                  {
                    AND: [
                      { startTime: { lte: sessionStartTime } },
                      { endTime: { gt: sessionStartTime } },
                    ],
                  },
                  {
                    AND: [
                      { startTime: { lt: sessionEndTime } },
                      { endTime: { gte: sessionEndTime } },
                    ],
                  },
                  {
                    AND: [
                      { startTime: { gte: sessionStartTime } },
                      { endTime: { lte: sessionEndTime } },
                    ],
                  },
                ],
              },
              include: {
                teacher: {
                  select: { name: true },
                },
                student: {
                  select: { name: true },
                },
                booth: {
                  select: { name: true },
                },
              },
            });

            if (boothConflict) {
              const conflictStartTime = format(
                boothConflict.startTime,
                "HH:mm"
              );
              const conflictEndTime = format(boothConflict.endTime, "HH:mm");
              const boothName = boothConflict.booth?.name || "不明なブース";

              dateConflicts.push({
                date: formattedSessionDate,
                dayOfWeek: getDayOfWeekFromDate(sessionDate),
                type: "BOOTH_CONFLICT",
                details: `ブース「${boothName}」は${conflictStartTime}-${conflictEndTime}に既に使用されています`,
                conflictingSession: {
                  classId: boothConflict.classId,
                  teacherName: boothConflict.teacher?.name || "不明",
                  studentName: boothConflict.student?.name || "不明",
                  startTime: conflictStartTime,
                  endTime: conflictEndTime,
                },
              });
            }
          }

          // Handle conflicts
          if (dateConflicts.length > 0) {
            allConflicts.push(...dateConflicts);
            sessionConflictMap.set(formattedSessionDate, dateConflicts);

            if (skipConflicts) {
              skippedDates.push(sessionDate);
            } else {
              validSessionDates.push(sessionDate);
            }
          } else {
            validSessionDates.push(sessionDate);
          }
        }

        // If there are conflicts and user hasn't provided session actions, and not skipping/forcing
        if (
          allConflicts.length > 0 &&
          !sessionActions &&
          !skipConflicts &&
          !forceCreate
        ) {
          // Group conflicts by date for better presentation
          const conflictsByDate = allConflicts.reduce((acc, conflict) => {
            if (!acc[conflict.date]) {
              acc[conflict.date] = [];
            }
            acc[conflict.date].push(conflict);
            return acc;
          }, {} as Record<string, ConflictInfo[]>);

          return NextResponse.json(
            {
              conflicts: allConflicts,
              conflictsByDate,
              message: `繰り返しクラスの作成中に${
                Object.keys(conflictsByDate).length
              }日分で競合が見つかりました。各日について対応方法を選択してください。`,
              requiresConfirmation: true,
              summary: {
                totalSessions: sessionDates.length,
                sessionsWithConflicts: Object.keys(conflictsByDate).length,
                validSessions: validSessionDates.length,
              },
            },
            { status: 400 }
          );
        }

        // If all dates were filtered out, return appropriate message
        if (validSessionDates.length === 0) {
          return NextResponse.json(
            {
              data: [],
              message:
                "すべての日付で競合が発生したため、クラスセッションを作成できませんでした",
              conflicts: allConflicts,
              pagination: {
                total: 0,
                page: 1,
                limit: 0,
                pages: 0,
              },
            },
            { status: 200 }
          );
        }

        // Create class sessions for all valid dates
        const createdSessions = await prisma.$transaction(
          validSessionDates.map((sessionDate) => {
            const formattedSessionDate = format(sessionDate, "yyyy-MM-dd");

            // Find if this date has alternative times
            const alternativeInfo = alternativeDates.find(
              (alt) => format(alt.date, "yyyy-MM-dd") === formattedSessionDate
            );

            const effectiveStartTime =
              alternativeInfo?.newStartTime || startTime;
            const effectiveEndTime = alternativeInfo?.newEndTime || endTime;

            const sessionStartTime = createDateTime(
              formattedSessionDate,
              effectiveStartTime
            );
            const sessionEndTime = createDateTime(
              formattedSessionDate,
              effectiveEndTime
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

        // Create response message based on what happened
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
          conflicts: allConflicts.length > 0 ? allConflicts : undefined,
          skipped:
            skippedDates.length > 0
              ? {
                  count: skippedDates.length,
                  dates: skippedDates.map((date) => format(date, "yyyy-MM-dd")),
                }
              : undefined,
          forced:
            forcedDates.length > 0
              ? {
                  count: forcedDates.length,
                  dates: forcedDates.map((date) => format(date, "yyyy-MM-dd")),
                }
              : undefined,
          alternatives:
            alternativeDates.length > 0
              ? {
                  count: alternativeDates.length,
                  dates: alternativeDates.map((alt) => ({
                    date: format(alt.date, "yyyy-MM-dd"),
                    originalTime: `${startTime}-${endTime}`,
                    newTime: `${alt.newStartTime}-${alt.newEndTime}`,
                  })),
                }
              : undefined,
        };

        // Add appropriate message based on actions taken
        const actionMessages = [];
        if (skippedDates.length > 0) {
          actionMessages.push(`${skippedDates.length}件をスキップ`);
        }
        if (forcedDates.length > 0) {
          actionMessages.push(`${forcedDates.length}件を強制作成`);
        }
        if (alternativeDates.length > 0) {
          actionMessages.push(`${alternativeDates.length}件で代替時間を使用`);
        }

        if (actionMessages.length > 0) {
          message += `（${actionMessages.join("、")}）`;
        }

        responseData.message = message;

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
