// src/lib/line-notifications.ts

import axios from "axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface NotificationData {
  classSessionId: string;
  userId: string;
  lineId: string;
  userName: string;
  sessionDate: Date;
  startTime: Date;
  endTime: Date;
  subjectName?: string;
  teacherName?: string;
  boothName?: string;
}

export type NotificationType = "ONE_DAY_BEFORE" | "THIRTY_MIN_BEFORE";

/**
 * Formats the class session time for display in JST
 */
function formatTimeJST(time: Date): string {
  return time.toLocaleTimeString("en-US", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Formats the class session date for display in JST
 */
function formatDateJST(date: Date): string {
  return date.toLocaleDateString("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

/**
 * Creates a notification message based on the type
 */
export function createNotificationMessage(
  data: NotificationData,
  type: NotificationType
): string {
  const dateStr = formatDateJST(data.sessionDate);
  const timeStr = formatTimeJST(data.startTime);
  const endTimeStr = formatTimeJST(data.endTime);

  const subjectInfo = data.subjectName ? ` (${data.subjectName})` : "";
  const teacherInfo = data.teacherName ? ` with ${data.teacherName}` : "";
  const boothInfo = data.boothName ? ` in ${data.boothName}` : "";

  if (type === "ONE_DAY_BEFORE") {
    return `🔔 Class Reminder\n\nHi ${data.userName}!\n\nYou have a class session tomorrow:\n📅 ${dateStr}\n⏰ ${timeStr} - ${endTimeStr}${subjectInfo}${teacherInfo}${boothInfo}\n\nPlease prepare accordingly!`;
  } else {
    return `⚡ Class Starting Soon!\n\nHi ${data.userName}!\n\nYour class session starts in 30 minutes:\n⏰ ${timeStr} - ${endTimeStr}${subjectInfo}${teacherInfo}${boothInfo}\n\nPlease get ready!`;
  }
}

/**
 * Sends a LINE push message with enhanced error handling
 */
export async function sendLINEMessage(
  lineId: string,
  message: string
): Promise<boolean> {
  const startTime = Date.now();
  
  try {
    console.log(`[LINE] Sending message to ${lineId.substring(0, 8)}...`);
    
    const response = await axios.post(
      "https://api.line.me/v2/bot/message/push",
      {
        to: lineId,
        messages: [
          {
            type: "text",
            text: message,
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        timeout: 10000, // 10 second timeout
      }
    );

    const duration = Date.now() - startTime;
    console.log(`[LINE] Message sent successfully in ${duration}ms`);
    return response.status === 200;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error(`[LINE] Error response (${duration}ms):`, {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        });
        
        // Handle specific LINE API errors
        if (error.response.status === 400) {
          console.error("[LINE] Bad request - Invalid LINE ID or message format");
        } else if (error.response.status === 401) {
          console.error("[LINE] Unauthorized - Check LINE_CHANNEL_ACCESS_TOKEN");
        } else if (error.response.status === 429) {
          console.error("[LINE] Rate limit exceeded");
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error(`[LINE] No response received (${duration}ms):`, error.message);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error(`[LINE] Request setup error (${duration}ms):`, error.message);
      }
    } else {
      console.error(`[LINE] Unknown error (${duration}ms):`, error);
    }
    
    return false;
  }
}

/**
 * Checks if a notification has already been sent
 */
export async function hasNotificationBeenSent(
  classSessionId: string,
  userId: string,
  type: NotificationType
): Promise<boolean> {
  try {
    const existing = await prisma.sentNotification.findUnique({
      where: {
        classSessionId_userId_type: {
          classSessionId,
          userId,
          type,
        },
      },
    });

    if (existing) {
      console.log(
        `[DB] Notification already sent: ${type} for user ${userId} session ${classSessionId} at ${existing.sentAt.toISOString()}`
      );
    }

    return !!existing;
  } catch (error) {
    console.error("[DB] Error checking sent notification:", error);
    // In case of error, return false to allow attempting to send
    return false;
  }
}

/**
 * Records a sent notification in the database
 */
export async function recordSentNotification(
  classSessionId: string,
  userId: string,
  type: NotificationType,
  messageContent: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    const record = await prisma.sentNotification.create({
      data: {
        classSessionId,
        userId,
        type,
        sentAt: new Date(),
        messageContent,
        success,
        errorMessage,
      },
    });
    
    console.log(
      `[DB] Recorded notification: ${type} for user ${userId} session ${classSessionId} - ${success ? "SUCCESS" : "FAILED"}`
    );
  } catch (error) {
    console.error("[DB] Error recording sent notification:", error);
    // Don't throw - we don't want to fail the entire process if recording fails
  }
}

/**
 * Calculates if it's time to send a notification
 */
export function shouldSendNotification(
  sessionDateTime: Date,
  type: NotificationType,
  currentTime: Date = new Date()
): boolean {
  const timeDiffMs = sessionDateTime.getTime() - currentTime.getTime();
  const hoursDiff = timeDiffMs / (1000 * 60 * 60);
  const minutesDiff = timeDiffMs / (1000 * 60);

  if (type === "ONE_DAY_BEFORE") {
    // Send between 23-25 hours before (1 day ± 1 hour buffer)
    const shouldSend = hoursDiff >= 23 && hoursDiff < 25;
    console.log(
      `[TIMING] ${type}: ${hoursDiff.toFixed(2)} hours until session - ${shouldSend ? "SEND" : "SKIP"}`
    );
    return shouldSend;
  } else if (type === "THIRTY_MIN_BEFORE") {
    // Send between 29-31 minutes before (30 min ± 1 min buffer)
    const shouldSend = minutesDiff >= 29 && minutesDiff < 31;
    console.log(
      `[TIMING] ${type}: ${minutesDiff.toFixed(2)} minutes until session - ${shouldSend ? "SEND" : "SKIP"}`
    );
    return shouldSend;
  }

  return false;
}

/**
 * Combines date and time fields into a single DateTime
 */
export function combineDateTime(date: Date, time: Date): Date {
  const combined = new Date(date);
  combined.setUTCHours(time.getUTCHours());
  combined.setUTCMinutes(time.getUTCMinutes());
  combined.setUTCSeconds(time.getUTCSeconds());
  combined.setUTCMilliseconds(time.getUTCMilliseconds());
  return combined;
}
