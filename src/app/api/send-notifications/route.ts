// src/app/api/send-notifications/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import {
  NotificationData,
  NotificationType,
  createNotificationMessage,
  sendLINEMessage,
  hasNotificationBeenSent,
  recordSentNotification,
  shouldSendNotification,
  combineDateTime,
} from "@/lib/line-notifications";

// Testing interface
interface TestOptions {
  testMode?: boolean;
  forceNotifications?: boolean;
  targetUserId?: string;
  targetSessionId?: string;
  notificationType?: "ONE_DAY_BEFORE" | "THIRTY_MIN_BEFORE" | "BOTH";
}

const prisma = new PrismaClient();

/**
 * Security check for cron job authentication
 */
function validateCronSecret(request: NextRequest): boolean {
  const cronSecret = request.headers.get("x-cron-secret");
  const envSecret = process.env.CRON_SECRET;
  
  // In development, allow "test-secret" as a fallback
  if (process.env.NODE_ENV !== "production" && cronSecret === "test-secret") {
    console.log("[AUTH] Using test secret in development mode");
    return true;
  }
  
  return cronSecret === envSecret;
}

/**
 * Get upcoming class sessions with optional filtering
 */
async function getUpcomingSessions(options?: {
  targetUserId?: string;
  targetSessionId?: string;
}) {
  const now = new Date();
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  const whereClause: any = {
    date: {
      gte: now,
      lte: twoDaysFromNow,
    },
  };

  // Add specific session filter if provided
  if (options?.targetSessionId) {
    whereClause.classId = options.targetSessionId;
  }

  // Add user filter if provided
  if (options?.targetUserId) {
    whereClause.OR = [
      { teacher: { userId: options.targetUserId } },
      { student: { userId: options.targetUserId } },
      {
        studentClassEnrollments: {
          some: {
            student: { userId: options.targetUserId },
          },
        },
      },
    ];
  }

  return await prisma.classSession.findMany({
    where: whereClause,
    include: {
      teacher: {
        include: {
          user: true,
        },
      },
      student: {
        include: {
          user: true,
        },
      },
      subject: true,
      booth: true,
      studentClassEnrollments: {
        include: {
          student: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Process notifications for a single user
 */
async function processUserNotification(
  notificationData: NotificationData,
  type: NotificationType,
  sessionDateTime: Date,
  forceNotification: boolean = false
): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  try {
    // Check if notification should be sent based on timing
    if (!forceNotification && !shouldSendNotification(sessionDateTime, type)) {
      console.log(
        `[SKIP] Not time to send ${type} notification for session ${notificationData.classSessionId}`
      );
      return { success: true, skipped: true }; // Not time to send yet, but not an error
    }

    // Check if notification already sent
    const alreadySent = await hasNotificationBeenSent(
      notificationData.classSessionId,
      notificationData.userId,
      type
    );

    if (alreadySent && !forceNotification) {
      console.log(
        `[SKIP] ${type} notification already sent for user ${notificationData.userId} session ${notificationData.classSessionId}`
      );
      return { success: true, skipped: true }; // Already sent, not an error
    }

    // Create and send notification message
    const message = createNotificationMessage(notificationData, type);
    console.log(
      `[SEND] Sending ${type} notification to ${notificationData.userName} (${notificationData.lineId})`
    );
    const sent = await sendLINEMessage(notificationData.lineId, message);

    // Record the notification attempt
    await recordSentNotification(
      notificationData.classSessionId,
      notificationData.userId,
      type,
      message,
      sent,
      sent ? undefined : "Failed to send LINE message"
    );

    return {
      success: sent,
      error: sent ? undefined : "Failed to send LINE message",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Record the failed attempt
    await recordSentNotification(
      notificationData.classSessionId,
      notificationData.userId,
      type,
      "",
      false,
      errorMessage
    );

    return { success: false, error: errorMessage };
  }
}

/**
 * Process notifications for a single class session
 */
async function processSessionNotifications(
  session: any,
  options: {
    forceNotifications?: boolean;
    notificationType?: "ONE_DAY_BEFORE" | "THIRTY_MIN_BEFORE" | "BOTH";
  } = {}
) {
  const sessionDateTime = combineDateTime(session.date, session.startTime);
  const results = {
    processed: 0,
    sent: 0,
    skipped: 0,
    errors: [] as string[],
  };

  console.log(
    `[SESSION] Processing notifications for session ${session.classId} at ${sessionDateTime.toISOString()}`
  );

  // Collect all users to notify (teacher + students)
  const usersToNotify: NotificationData[] = [];

  // Add teacher if they have LINE ID
  if (session.teacher?.lineId && session.teacher?.user) {
    usersToNotify.push({
      classSessionId: session.classId,
      userId: session.teacher.userId,
      lineId: session.teacher.lineId,
      userName: session.teacher.user.name || session.teacher.name,
      sessionDate: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      subjectName: session.subject?.name,
      boothName: session.booth?.name,
    });
  }

  // Add individual student if they have LINE ID
  if (session.student?.lineId && session.student?.user) {
    usersToNotify.push({
      classSessionId: session.classId,
      userId: session.student.userId,
      lineId: session.student.lineId,
      userName: session.student.user.name || session.student.name,
      sessionDate: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      subjectName: session.subject?.name,
      teacherName: session.teacher?.user?.name || session.teacher?.name,
      boothName: session.booth?.name,
    });
  }

  // Add enrolled students if they have LINE ID
  for (const enrollment of session.studentClassEnrollments || []) {
    if (enrollment.student?.lineId && enrollment.student?.user) {
      usersToNotify.push({
        classSessionId: session.classId,
        userId: enrollment.student.userId,
        lineId: enrollment.student.lineId,
        userName: enrollment.student.user.name || enrollment.student.name,
        sessionDate: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        subjectName: session.subject?.name,
        teacherName: session.teacher?.user?.name || session.teacher?.name,
        boothName: session.booth?.name,
      });
    }
  }

  // Process notifications for each user
  for (const userData of usersToNotify) {
    // Determine which notification types to send
    let notificationTypes: NotificationType[] = [];
    
    if (options.notificationType === "ONE_DAY_BEFORE") {
      notificationTypes = ["ONE_DAY_BEFORE"];
    } else if (options.notificationType === "THIRTY_MIN_BEFORE") {
      notificationTypes = ["THIRTY_MIN_BEFORE"];
    } else {
      notificationTypes = ["ONE_DAY_BEFORE", "THIRTY_MIN_BEFORE"];
    }

    for (const notificationType of notificationTypes) {
      results.processed++;

      const result = await processUserNotification(
        userData,
        notificationType,
        sessionDateTime,
        options.forceNotifications
      );

      if (result.success && !result.skipped) {
        results.sent++;
      } else if (result.skipped) {
        results.skipped++;
      } else if (result.error) {
        results.errors.push(
          `${userData.userName} (${notificationType}): ${result.error}`
        );
      }
    }
  }

  return results;
}

/**
 * Main POST handler for the cron job and manual testing
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let testOptions: TestOptions = {};

  try {
    // Validate cron secret
    if (!validateCronSecret(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse test options from request body if present
    try {
      const body = await request.json();
      testOptions = body || {};
    } catch {
      // No body or invalid JSON, continue with defaults
    }

    // Check if LINE token is configured
    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: "LINE_CHANNEL_ACCESS_TOKEN not configured" },
        { status: 500 }
      );
    }

    console.log(`[${new Date().toISOString()}] Starting notification check...`);
    if (Object.keys(testOptions).length > 0) {
      console.log("Test options:", testOptions);
    }

    // Get upcoming sessions with optional filtering
    const sessions = await getUpcomingSessions({
      targetUserId: testOptions.targetUserId,
      targetSessionId: testOptions.targetSessionId,
    });
    console.log(`Found ${sessions.length} upcoming sessions to check`);

    const summary = {
      sessionsChecked: sessions.length,
      totalProcessed: 0,
      totalSent: 0,
      totalSkipped: 0,
      errors: [] as string[],
      testMode: !!testOptions.forceNotifications || !!testOptions.targetUserId || !!testOptions.targetSessionId,
    };

    // Process each session
    for (const session of sessions) {
      const result = await processSessionNotifications(session, {
        forceNotifications: testOptions.forceNotifications,
        notificationType: testOptions.notificationType,
      });
      summary.totalProcessed += result.processed;
      summary.totalSent += result.sent;
      summary.totalSkipped += result.skipped;
      summary.errors.push(...result.errors);
    }

    const duration = Date.now() - startTime;
    console.log(
      `[${new Date().toISOString()}] Notification check complete in ${duration}ms:`,
      summary
    );

    return NextResponse.json(
      {
        message: "Notification check completed",
        summary,
        duration: `${duration}ms`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in send-notifications:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Allow GET requests for testing purposes (remove in production)
 */
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get("userId");
  const targetSessionId = searchParams.get("sessionId");

  // Return current time and next few sessions for debugging
  const now = new Date();
  const sessions = await getUpcomingSessions({
    targetUserId: targetUserId || undefined,
    targetSessionId: targetSessionId || undefined,
  });

  // Check notification timing for each session
  const sessionsWithTiming = sessions.map((session) => {
    const sessionDateTime = combineDateTime(session.date, session.startTime);
    const hoursUntilSession = (sessionDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return {
      classId: session.classId,
      date: session.date,
      startTime: session.startTime,
      sessionDateTime: sessionDateTime.toISOString(),
      teacher: session.teacher?.user?.name,
      student: session.student?.user?.name,
      subject: session.subject?.name,
      hoursUntilSession: Math.round(hoursUntilSession * 100) / 100,
      notifications: {
        oneDayBefore: {
          shouldSend: shouldSendNotification(sessionDateTime, "ONE_DAY_BEFORE", now),
          windowStart: new Date(sessionDateTime.getTime() - 25 * 60 * 60 * 1000).toISOString(),
          windowEnd: new Date(sessionDateTime.getTime() - 23 * 60 * 60 * 1000).toISOString(),
        },
        thirtyMinBefore: {
          shouldSend: shouldSendNotification(sessionDateTime, "THIRTY_MIN_BEFORE", now),
          windowStart: new Date(sessionDateTime.getTime() - 31 * 60 * 1000).toISOString(),
          windowEnd: new Date(sessionDateTime.getTime() - 29 * 60 * 1000).toISOString(),
        },
      },
    };
  });

  return NextResponse.json({
    currentTime: now.toISOString(),
    timeZone: "UTC",
    filters: {
      userId: targetUserId,
      sessionId: targetSessionId,
    },
    upcomingSessions: sessionsWithTiming,
  });
}
