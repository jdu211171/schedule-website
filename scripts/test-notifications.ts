#!/usr/bin/env node

/**
 * Local testing script for LINE notifications
 * This script allows testing notification sending without waiting for cron jobs
 */

import { PrismaClient } from "@prisma/client";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { format } from "date-fns";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

interface TestOptions {
  testMode?: boolean; // If true, sends test notifications to a specific LINE ID
  forceNotifications?: boolean; // If true, ignores timing restrictions
  targetUserId?: string; // Specific user ID to send notifications to
  targetSessionId?: string; // Specific session ID to send notifications for
  notificationType?: "ONE_DAY_BEFORE" | "THIRTY_MIN_BEFORE" | "BOTH";
}

/**
 * Send a direct test message to verify LINE integration
 */
async function sendTestMessage(lineId: string) {
  try {
    console.log(`\n📱 Sending test message to LINE ID: ${lineId}`);
    
    const response = await axios.post(
      "https://api.line.me/v2/bot/message/push",
      {
        to: lineId,
        messages: [
          {
            type: "text",
            text: `🧪 Test Message\n\nThis is a test notification from the Schedule Website.\n\nTime: ${new Date().toISOString()}\n\nIf you see this message, LINE notifications are working correctly! ✅`,
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
      }
    );

    console.log("✅ Test message sent successfully!");
    return true;
  } catch (error) {
    console.error("❌ Failed to send test message:", error);
    if (axios.isAxiosError(error) && error.response) {
      console.error("Response data:", error.response.data);
    }
    return false;
  }
}

/**
 * Call the notification API endpoint
 */
async function callNotificationAPI(options: TestOptions = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/send-notifications`;
  
  try {
    console.log(`\n🔔 Calling notification API: ${url}`);
    console.log("Options:", options);
    
    const response = await axios.post(
      url,
      {
        testMode: options.testMode,
        forceNotifications: options.forceNotifications,
        targetUserId: options.targetUserId,
        targetSessionId: options.targetSessionId,
        notificationType: options.notificationType,
      },
      {
        headers: {
          "x-cron-secret": process.env.CRON_SECRET || "test-secret",
          "Content-Type": "application/json",
        },
      }
    );

    console.log("\n✅ API Response:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error("\n❌ API Error:", error);
    if (axios.isAxiosError(error) && error.response) {
      console.error("Response data:", error.response.data);
    }
    throw error;
  }
}

/**
 * List upcoming sessions for debugging
 */
async function listUpcomingSessions() {
  const now = new Date();
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  const sessions = await prisma.classSession.findMany({
    where: {
      date: {
        gte: now,
        lte: twoDaysFromNow,
      },
    },
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
    },
    orderBy: {
      date: "asc",
    },
    take: 10,
  });

  console.log("\n📅 Upcoming Sessions:");
  console.log("=".repeat(80));
  
  sessions.forEach((session, index) => {
    console.log(`\n${index + 1}. Session ID: ${session.classId}`);
    console.log(`   Date: ${format(session.date, "yyyy-MM-dd (EEEE)")}`);
    console.log(`   Time: ${format(session.startTime, "HH:mm")} - ${format(session.endTime, "HH:mm")}`);
    console.log(`   Subject: ${session.subject?.name || "N/A"}`);
    console.log(`   Teacher: ${session.teacher?.user?.name || session.teacher?.name || "N/A"} (LINE: ${session.teacher?.lineId ? "✓" : "✗"})`);
    console.log(`   Student: ${session.student?.user?.name || session.student?.name || "N/A"} (LINE: ${session.student?.lineId ? "✓" : "✗"})`);
    console.log(`   Booth: ${session.booth?.name || "N/A"}`);
  });
  
  console.log("\n" + "=".repeat(80));
  return sessions;
}

/**
 * List users with LINE IDs
 */
async function listUsersWithLineIds() {
  const teachers = await prisma.teacher.findMany({
    where: {
      lineId: {
        not: null,
      },
    },
    include: {
      user: true,
    },
  });

  const students = await prisma.student.findMany({
    where: {
      lineId: {
        not: null,
      },
    },
    include: {
      user: true,
    },
  });

  console.log("\n👥 Users with LINE IDs:");
  console.log("=".repeat(80));
  
  console.log("\nTeachers:");
  teachers.forEach((teacher) => {
    console.log(`- ${teacher.user?.name || teacher.name} (ID: ${teacher.userId}, LINE: ${teacher.lineId})`);
  });

  console.log("\nStudents:");
  students.forEach((student) => {
    console.log(`- ${student.user?.name || student.name} (ID: ${student.userId}, LINE: ${student.lineId})`);
  });
  
  console.log("\n" + "=".repeat(80));
}

/**
 * Main CLI function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log("\n🚀 LINE Notification Testing Tool");
  console.log("================================\n");

  // Check if LINE token is configured
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    console.error("❌ Error: LINE_CHANNEL_ACCESS_TOKEN not found in environment variables");
    console.error("Please add it to your .env.local file");
    process.exit(1);
  }

  try {
    switch (command) {
      case "test-message":
        const lineId = args[1];
        if (!lineId) {
          console.error("❌ Please provide a LINE ID: npm run test:notifications test-message <LINE_ID>");
          process.exit(1);
        }
        await sendTestMessage(lineId);
        break;

      case "list-sessions":
        await listUpcomingSessions();
        break;

      case "list-users":
        await listUsersWithLineIds();
        break;

      case "send-all":
        console.log("Sending notifications for all eligible sessions...");
        await callNotificationAPI();
        break;

      case "send-forced":
        console.log("Sending notifications with forced timing (ignoring time restrictions)...");
        await callNotificationAPI({ forceNotifications: true });
        break;

      case "send-user":
        const userId = args[1];
        if (!userId) {
          console.error("❌ Please provide a user ID: npm run test:notifications send-user <USER_ID>");
          process.exit(1);
        }
        console.log(`Sending notifications for user: ${userId}`);
        await callNotificationAPI({ targetUserId: userId, forceNotifications: true });
        break;

      case "send-session":
        const sessionId = args[1];
        if (!sessionId) {
          console.error("❌ Please provide a session ID: npm run test:notifications send-session <SESSION_ID>");
          process.exit(1);
        }
        console.log(`Sending notifications for session: ${sessionId}`);
        await callNotificationAPI({ targetSessionId: sessionId, forceNotifications: true });
        break;

      case "help":
      default:
        console.log("Available commands:");
        console.log("  test-message <LINE_ID>    - Send a test message to a specific LINE ID");
        console.log("  list-sessions            - List upcoming sessions");
        console.log("  list-users               - List users with LINE IDs");
        console.log("  send-all                 - Send all eligible notifications (respects timing)");
        console.log("  send-forced              - Send all notifications (ignores timing)");
        console.log("  send-user <USER_ID>      - Send notifications for a specific user");
        console.log("  send-session <SESSION_ID> - Send notifications for a specific session");
        console.log("  help                     - Show this help message");
        break;
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the main function
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});