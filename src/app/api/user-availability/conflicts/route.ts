// src/app/api/user-availability/conflicts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { availabilityConflictCheckSchema } from "@/schemas/user-availability.schema";
import { DayOfWeek } from "@prisma/client";

type AvailabilitySlot = {
  type: "REGULAR" | "EXCEPTION";
  startTime: string | null;
  endTime: string | null;
  fullDay?: boolean | null;
  dayOfWeek?: DayOfWeek | null;
  date?: string;
  reason?: string | null;
  notes?: string | null;
};

// Helper function to create time from string (consistent with class session time handling)
const createTimeFromString = (timeString: string): Date => {
  const [hours, minutes] = timeString.split(":").map(Number);
  // Use epoch date for time-only storage - Prisma extracts time component for @db.Time(6)
  return new Date(Date.UTC(2000, 0, 1, hours, minutes, 0, 0));
};

// Helper function to create UTC date from date string or Date object (matching class session pattern)
const createUTCDate = (dateInput: string | Date): Date => {
  if (dateInput instanceof Date) {
    // If it's already a Date object, extract the date parts and create UTC date
    const year = dateInput.getFullYear();
    const month = dateInput.getMonth();
    const day = dateInput.getDate();
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  } else {
    // If it's a string, parse it and create UTC date
    const [year, month, day] = dateInput.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }
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

// Helper function to check if a user is available at a specific time
const checkUserAvailability = async (
  userId: string,
  date: Date,
  startTime: Date,
  endTime: Date
): Promise<{
  available: boolean;
  conflictingAvailability?: AvailabilitySlot[];
  availableSlots?: AvailabilitySlot[];
  warnings?: string[];
}> => {
  const dayOfWeek = getDayOfWeekFromDate(date);
  const warnings: string[] = [];

  // Get all approved availability for this user
  const regularAvailability = await prisma.userAvailability.findMany({
    where: {
      userId,
      type: "REGULAR",
      status: "APPROVED",
      dayOfWeek: dayOfWeek as DayOfWeek,
    },
    orderBy: { startTime: "asc" },
  });

  const exceptionAvailability = await prisma.userAvailability.findMany({
    where: {
      userId,
      type: "EXCEPTION",
      status: "APPROVED",
      date,
    },
    orderBy: { startTime: "asc" },
  });

  // For scheduling logic:
  // - Recurring classes: Use only regular availability
  // - One-time classes: Use intersection of regular and exception availability

  // Check for conflicts first
  const conflictingAvailability = [];

  // Check regular availability conflicts
  for (const regular of regularAvailability) {
    if (!regular.startTime || !regular.endTime) continue; // Skip full-day or unavailable slots

    // Extract hours and minutes for reliable comparison (avoiding epoch date issues)
    const availableStartHour = regular.startTime.getUTCHours();
    const availableStartMin = regular.startTime.getUTCMinutes();
    const availableEndHour = regular.endTime.getUTCHours();
    const availableEndMin = regular.endTime.getUTCMinutes();

    const requestedStartHour = startTime.getUTCHours();
    const requestedStartMin = startTime.getUTCMinutes();
    const requestedEndHour = endTime.getUTCHours();
    const requestedEndMin = endTime.getUTCMinutes();

    // Convert to minutes since midnight for easier comparison
    const availableStart = availableStartHour * 60 + availableStartMin;
    const availableEnd = availableEndHour * 60 + availableEndMin;
    const requestedStart = requestedStartHour * 60 + requestedStartMin;
    const requestedEnd = requestedEndHour * 60 + requestedEndMin;

    // Check if requested time overlaps with available time
    if (requestedStart < availableEnd && requestedEnd > availableStart) {
      // There's some overlap, but check if it's fully contained
      if (requestedStart >= availableStart && requestedEnd <= availableEnd) {
        // Fully available in this slot
        continue;
      } else {
        // Partial overlap - this is a conflict
        conflictingAvailability.push({
          type: "REGULAR" as const,
          dayOfWeek: regular.dayOfWeek,
          startTime: `${String(availableStartHour).padStart(2, "0")}:${String(
            availableStartMin
          ).padStart(2, "0")}`,
          endTime: `${String(availableEndHour).padStart(2, "0")}:${String(
            availableEndMin
          ).padStart(2, "0")}`,
          fullDay: regular.fullDay,
        });
      }
    }
  }

  // Check exception availability conflicts
  for (const exception of exceptionAvailability) {
    if (!exception.startTime || !exception.endTime) continue;

    // Extract hours and minutes for reliable comparison (avoiding epoch date issues)
    const availableStartHour = exception.startTime.getUTCHours();
    const availableStartMin = exception.startTime.getUTCMinutes();
    const availableEndHour = exception.endTime.getUTCHours();
    const availableEndMin = exception.endTime.getUTCMinutes();

    const requestedStartHour = startTime.getUTCHours();
    const requestedStartMin = startTime.getUTCMinutes();
    const requestedEndHour = endTime.getUTCHours();
    const requestedEndMin = endTime.getUTCMinutes();

    // Convert to minutes since midnight for easier comparison
    const availableStart = availableStartHour * 60 + availableStartMin;
    const availableEnd = availableEndHour * 60 + availableEndMin;
    const requestedStart = requestedStartHour * 60 + requestedStartMin;
    const requestedEnd = requestedEndHour * 60 + requestedEndMin;

    if (requestedStart < availableEnd && requestedEnd > availableStart) {
      if (requestedStart >= availableStart && requestedEnd <= availableEnd) {
        continue;
      } else {
        conflictingAvailability.push({
          type: "EXCEPTION" as const,
          date: exception.date?.toISOString().split("T")[0],
          startTime: `${String(availableStartHour).padStart(2, "0")}:${String(
            availableStartMin
          ).padStart(2, "0")}`,
          endTime: `${String(availableEndHour).padStart(2, "0")}:${String(
            availableEndMin
          ).padStart(2, "0")}`,
          fullDay: exception.fullDay,
        });
      }
    }
  }

  // Check if user is actually available during the requested time
  let available = false;

  // Check regular availability first
  for (const regular of regularAvailability) {
    if (regular.fullDay) {
      available = true;
      break;
    }

    if (!regular.startTime || !regular.endTime) continue;

    // Extract hours and minutes for reliable comparison (avoiding epoch date issues)
    const availableStartHour = regular.startTime.getUTCHours();
    const availableStartMin = regular.startTime.getUTCMinutes();
    const availableEndHour = regular.endTime.getUTCHours();
    const availableEndMin = regular.endTime.getUTCMinutes();

    const requestedStartHour = startTime.getUTCHours();
    const requestedStartMin = startTime.getUTCMinutes();
    const requestedEndHour = endTime.getUTCHours();
    const requestedEndMin = endTime.getUTCMinutes();

    // Convert to minutes since midnight for easier comparison
    const availableStart = availableStartHour * 60 + availableStartMin;
    const availableEnd = availableEndHour * 60 + availableEndMin;
    const requestedStart = requestedStartHour * 60 + requestedStartMin;
    const requestedEnd = requestedEndHour * 60 + requestedEndMin;

    // Check if requested time is fully contained within available time
    if (requestedStart >= availableStart && requestedEnd <= availableEnd) {
      available = true;
      break;
    }
  }

  // If there are exceptions for this date, they override regular availability
  if (exceptionAvailability.length > 0) {
    available = false; // Reset and check exceptions

    for (const exception of exceptionAvailability) {
      if (exception.fullDay) {
        available = true;
        break;
      }

      if (!exception.startTime || !exception.endTime) continue;

      // Extract hours and minutes for reliable comparison (avoiding epoch date issues)
      const availableStartHour = exception.startTime.getUTCHours();
      const availableStartMin = exception.startTime.getUTCMinutes();
      const availableEndHour = exception.endTime.getUTCHours();
      const availableEndMin = exception.endTime.getUTCMinutes();

      const requestedStartHour = startTime.getUTCHours();
      const requestedStartMin = startTime.getUTCMinutes();
      const requestedEndHour = endTime.getUTCHours();
      const requestedEndMin = endTime.getUTCMinutes();

      // Convert to minutes since midnight for easier comparison
      const availableStart = availableStartHour * 60 + availableStartMin;
      const availableEnd = availableEndHour * 60 + availableEndMin;
      const requestedStart = requestedStartHour * 60 + requestedStartMin;
      const requestedEnd = requestedEndHour * 60 + requestedEndMin;

      if (requestedStart >= availableStart && requestedEnd <= availableEnd) {
        available = true;
        break;
      }
    }
  }

  // Generate warnings
  if (!available) {
    warnings.push("ユーザーは指定された時間帯に利用可能ではありません");
  }

  if (regularAvailability.length === 0) {
    warnings.push("ユーザーの定期的な利用可能時間が設定されていません");
  }

  // Get available slots for reference
  const availableSlots = [];

  // Add regular slots
  for (const regular of regularAvailability) {
    availableSlots.push({
      type: "REGULAR" as const,
      dayOfWeek: regular.dayOfWeek,
      startTime: regular.startTime
        ? `${String(regular.startTime.getUTCHours()).padStart(2, "0")}:${String(
            regular.startTime.getUTCMinutes()
          ).padStart(2, "0")}`
        : null,
      endTime: regular.endTime
        ? `${String(regular.endTime.getUTCHours()).padStart(2, "0")}:${String(
            regular.endTime.getUTCMinutes()
          ).padStart(2, "0")}`
        : null,
      fullDay: regular.fullDay,
    });
  }

  // Add exception slots
  for (const exception of exceptionAvailability) {
    availableSlots.push({
      type: "EXCEPTION" as const,
      date: exception.date?.toISOString().split("T")[0],
      startTime: exception.startTime
        ? `${String(exception.startTime.getUTCHours()).padStart(
            2,
            "0"
          )}:${String(exception.startTime.getUTCMinutes()).padStart(2, "0")}`
        : null,
      endTime: exception.endTime
        ? `${String(exception.endTime.getUTCHours()).padStart(2, "0")}:${String(
            exception.endTime.getUTCMinutes()
          ).padStart(2, "0")}`
        : null,
      fullDay: exception.fullDay,
    });
  }

  return {
    available,
    conflictingAvailability:
      conflictingAvailability.length > 0 ? conflictingAvailability : undefined,
    availableSlots,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
};

// POST - Check for availability conflicts
export const POST = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = availabilityConflictCheckSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "入力データが無効です", details: result.error.errors },
          { status: 400 }
        );
      }

      const { userId, date, startTime, endTime } = result.data;

      // Convert inputs
      const dateUTC = createUTCDate(date);
      const startTimeUTC = createTimeFromString(startTime);
      const endTimeUTC = createTimeFromString(endTime);

      // Check user availability
      const availabilityCheck = await checkUserAvailability(
        userId,
        dateUTC,
        startTimeUTC,
        endTimeUTC
      );

      return NextResponse.json({
        userId,
        date: dateUTC.toISOString().split("T")[0],
        startTime,
        endTime,
        ...availabilityCheck,
      });
    } catch (error) {
      console.error("Error checking availability conflicts:", error);
      return NextResponse.json(
        { error: "利用可能時間の競合チェックに失敗しました" },
        { status: 500 }
      );
    }
  }
);

// GET - Check availability for multiple users at once
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest) => {
    try {
      const url = new URL(request.url);
      const userIds = url.searchParams.get("userIds")?.split(",") || [];
      const date = url.searchParams.get("date");
      const startTime = url.searchParams.get("startTime");
      const endTime = url.searchParams.get("endTime");

      if (!date || !startTime || !endTime || userIds.length === 0) {
        return NextResponse.json(
          { error: "userIds, date, startTime, endTimeパラメータが必要です" },
          { status: 400 }
        );
      }

      // Convert inputs
      const dateUTC = createUTCDate(date);
      const startTimeUTC = createTimeFromString(startTime);
      const endTimeUTC = createTimeFromString(endTime);

      // Check availability for all users
      const availabilityChecks = await Promise.all(
        userIds.map(async (userId) => {
          const availabilityCheck = await checkUserAvailability(
            userId,
            dateUTC,
            startTimeUTC,
            endTimeUTC
          );

          return {
            userId,
            ...availabilityCheck,
          };
        })
      );

      return NextResponse.json({
        date: dateUTC.toISOString().split("T")[0],
        startTime,
        endTime,
        users: availabilityChecks,
        summary: {
          totalUsers: userIds.length,
          availableUsers: availabilityChecks.filter((check) => check.available)
            .length,
          unavailableUsers: availabilityChecks.filter(
            (check) => !check.available
          ).length,
          usersWithWarnings: availabilityChecks.filter(
            (check) => check.warnings && check.warnings.length > 0
          ).length,
        },
      });
    } catch (error) {
      console.error("Error checking batch availability conflicts:", error);
      return NextResponse.json(
        { error: "一括利用可能時間チェックに失敗しました" },
        { status: 500 }
      );
    }
  }
);
