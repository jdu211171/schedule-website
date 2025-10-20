import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format, addHours, addMinutes, subMinutes } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const TIMEZONE = "Asia/Tokyo";

export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const nowJST = toZonedTime(now, TIMEZONE);

    // Calculate target times with ±5 minute windows
    const target24h = addHours(nowJST, 24);
    const target24hStart = subMinutes(target24h, 5);
    const target24hEnd = addMinutes(target24h, 5);

    const target30m = addMinutes(nowJST, 30);
    const target30mStart = subMinutes(target30m, 5);
    const target30mEnd = addMinutes(target30m, 5);

    // Format dates for querying
    const date24h = format(target24h, "yyyy-MM-dd");
    const date30m = format(nowJST, "yyyy-MM-dd");

    // Find sessions that would be notified
    const sessions24h = await prisma.classSession.findMany({
      where: {
        date: new Date(date24h),
        isCancelled: false,
        AND: [
          {
            startTime: {
              gte: new Date(`1970-01-01T${format(target24hStart, "HH:mm:ss")}`),
            },
          },
          {
            startTime: {
              lte: new Date(`1970-01-01T${format(target24hEnd, "HH:mm:ss")}`),
            },
          },
        ],
      },
      include: {
        teacher: {
          select: {
            name: true,
            lineId: true,
          },
        },
        student: {
          select: {
            name: true,
            lineId: true,
          },
        },
        subject: {
          select: {
            name: true,
          },
        },
      },
    });

    const sessions30m = await prisma.classSession.findMany({
      where: {
        date: new Date(date30m),
        isCancelled: false,
        AND: [
          {
            startTime: {
              gte: new Date(`1970-01-01T${format(target30mStart, "HH:mm:ss")}`),
            },
          },
          {
            startTime: {
              lte: new Date(`1970-01-01T${format(target30mEnd, "HH:mm:ss")}`),
            },
          },
        ],
      },
      include: {
        teacher: {
          select: {
            name: true,
            lineId: true,
          },
        },
        student: {
          select: {
            name: true,
            lineId: true,
          },
        },
        subject: {
          select: {
            name: true,
          },
        },
      },
    });

    // Get some upcoming sessions for context
    const upcomingSessions = await prisma.classSession.findMany({
      where: {
        date: {
          gte: new Date(format(nowJST, "yyyy-MM-dd")),
          lte: new Date(format(addHours(nowJST, 48), "yyyy-MM-dd")),
        },
        isCancelled: false,
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      include: {
        teacher: {
          select: {
            name: true,
            lineId: true,
          },
        },
        student: {
          select: {
            name: true,
            lineId: true,
          },
        },
        subject: {
          select: {
            name: true,
          },
        },
      },
      take: 10,
    });

    return NextResponse.json({
      currentTime: format(nowJST, "yyyy-MM-dd HH:mm:ss"),
      environment: {
        hasLineToken: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
        hasLineSecret: !!process.env.LINE_CHANNEL_SECRET,
        hasCronSecret: !!process.env.CRON_SECRET,
      },
      notifications: {
        "24h": {
          targetDate: date24h,
          targetTime: format(target24h, "HH:mm:ss"),
          window: `${format(target24hStart, "HH:mm:ss")} - ${format(target24hEnd, "HH:mm:ss")}`,
          sessionsFound: sessions24h.length,
          sessions: sessions24h.map((s) => ({
            date: format(s.date, "yyyy-MM-dd"),
            startTime: format(s.startTime, "HH:mm:ss"),
            subject: s.subject?.name,
            teacher: s.teacher?.name,
            teacherHasLineId: !!s.teacher?.lineId,
            student: s.student?.name,
            studentHasLineId: !!s.student?.lineId,
          })),
        },
        "30m": {
          targetDate: date30m,
          targetTime: format(target30m, "HH:mm:ss"),
          window: `${format(target30mStart, "HH:mm:ss")} - ${format(target30mEnd, "HH:mm:ss")}`,
          sessionsFound: sessions30m.length,
          sessions: sessions30m.map((s) => ({
            date: format(s.date, "yyyy-MM-dd"),
            startTime: format(s.startTime, "HH:mm:ss"),
            subject: s.subject?.name,
            teacher: s.teacher?.name,
            teacherHasLineId: !!s.teacher?.lineId,
            student: s.student?.name,
            studentHasLineId: !!s.student?.lineId,
          })),
        },
      },
      upcomingSessions: upcomingSessions.map((s) => ({
        date: format(s.date, "yyyy-MM-dd"),
        startTime: format(s.startTime, "HH:mm:ss"),
        subject: s.subject?.name,
        teacher: s.teacher?.name,
        teacherHasLineId: !!s.teacher?.lineId,
        student: s.student?.name,
        studentHasLineId: !!s.student?.lineId,
      })),
    });
  } catch (error) {
    console.error("Error in test notification endpoint:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
