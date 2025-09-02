// src/app/api/user-availability/[availabilityId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userAvailabilityUpdateSchema } from "@/schemas/user-availability.schema";
import { UserAvailability, DayOfWeek, Prisma } from "@prisma/client";

type FormattedUserAvailability = {
  id: string;
  userId: string;
  userName: string | null;
  dayOfWeek: string | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  fullDay: boolean | null;
  type: string;
  status: string;
  reason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

// Helper function to format user availability response
const formatUserAvailability = (
  availability: UserAvailability & { user?: { name: string | null } | null }
): FormattedUserAvailability => {
  return {
    id: availability.id,
    userId: availability.userId,
    userName: availability.user?.name || null,
    dayOfWeek: availability.dayOfWeek,
    date: availability.date
      ? availability.date.toISOString().split("T")[0]
      : null,
    startTime: availability.startTime
      ? `${String(availability.startTime.getUTCHours()).padStart(
          2,
          "0"
        )}:${String(availability.startTime.getUTCMinutes()).padStart(2, "0")}`
      : null,
    endTime: availability.endTime
      ? `${String(availability.endTime.getUTCHours()).padStart(
          2,
          "0"
        )}:${String(availability.endTime.getUTCMinutes()).padStart(2, "0")}`
      : null,
    fullDay: availability.fullDay,
    type: availability.type,
    status: availability.status,
    reason: availability.reason,
    notes: availability.notes,
    createdAt: availability.createdAt.toISOString(),
    updatedAt: availability.updatedAt.toISOString(),
  };
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

// Helper function to check for availability conflicts within the same day
const checkAvailabilityConflicts = async (
  userId: string,
  dayOfWeek: string | null,
  date: Date | null,
  startTime: Date | null,
  endTime: Date | null,
  fullDay: boolean,
  currentType: "REGULAR" | "EXCEPTION" | "ABSENCE",
  excludeId?: string
): Promise<{
  hasConflict: boolean;
  conflictType?: string;
  conflictDetails?: string;
}> => {
  const where: Prisma.UserAvailabilityWhereInput = {
    userId,
    status: { in: ["PENDING", "APPROVED"] }, // Don't check against rejected availability
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  if (dayOfWeek) {
    where.dayOfWeek = dayOfWeek as DayOfWeek;
    where.date = null;
  } else if (date) {
    where.date = date;
    where.dayOfWeek = null;
  }

  const existingAvailability = await prisma.userAvailability.findMany({
    where,
  });

  // Check for full-day conflicts first
  if (fullDay) {
    // If trying to create full-day availability, check if there's any existing availability for the same day
    if (existingAvailability.length > 0) {
      const dayRef = dayOfWeek || date?.toISOString().split("T")[0];
      return {
        hasConflict: true,
        conflictType: "FULL_DAY_CONFLICT",
        conflictDetails: `既に${dayRef}の利用可能時間が設定されています。1日につき1つの利用可能時間設定のみ許可されています。`,
      };
    }
  } else {
    // If trying to create time-specific availability
    for (const existing of existingAvailability) {
      // Allow ABSENCE to overlap with any type and don't treat as conflict
      if (currentType === "ABSENCE" || existing.type === "ABSENCE") {
        continue;
      }
      // Check if there's already a full-day availability
      if (existing.fullDay) {
        const dayRef = dayOfWeek || date?.toISOString().split("T")[0];
        return {
          hasConflict: true,
          conflictType: "FULL_DAY_EXISTS",
          conflictDetails: `${dayRef}は既に終日利用可能に設定されています。時間指定の利用可能時間は追加できません。`,
        };
      }

      // Check for time overlaps with existing time-specific availability
      if (existing.startTime && existing.endTime && startTime && endTime) {
        // Extract hours and minutes for reliable comparison (avoiding epoch date issues)
        const existingStartHour = existing.startTime.getUTCHours();
        const existingStartMin = existing.startTime.getUTCMinutes();
        const existingEndHour = existing.endTime.getUTCHours();
        const existingEndMin = existing.endTime.getUTCMinutes();

        const newStartHour = startTime.getUTCHours();
        const newStartMin = startTime.getUTCMinutes();
        const newEndHour = endTime.getUTCHours();
        const newEndMin = endTime.getUTCMinutes();

        // Convert to minutes since midnight for easier comparison
        const existingStartMinutes = existingStartHour * 60 + existingStartMin;
        const existingEndMinutes = existingEndHour * 60 + existingEndMin;
        const newStartMinutes = newStartHour * 60 + newStartMin;
        const newEndMinutes = newEndHour * 60 + newEndMin;

        // Helper function to check if two time ranges overlap
        const checkOverlap = (
          start1: number,
          end1: number,
          start2: number,
          end2: number
        ): boolean => {
          return start1 < end2 && end1 > start2;
        };

        let hasOverlap = false;

        // Check if existing slot crosses midnight
        const existingCrossesMidnight =
          existingEndMinutes <= existingStartMinutes;
        // Check if new slot crosses midnight
        const newCrossesMidnight = newEndMinutes <= newStartMinutes;

        if (!existingCrossesMidnight && !newCrossesMidnight) {
          // Neither slot crosses midnight - simple comparison
          hasOverlap = checkOverlap(
            newStartMinutes,
            newEndMinutes,
            existingStartMinutes,
            existingEndMinutes
          );
        } else if (existingCrossesMidnight && !newCrossesMidnight) {
          // Existing slot crosses midnight, new slot doesn't
          // Check overlap with both parts: [existingStart-1440] and [0-existingEnd]
          hasOverlap =
            checkOverlap(
              newStartMinutes,
              newEndMinutes,
              existingStartMinutes,
              1440
            ) ||
            checkOverlap(newStartMinutes, newEndMinutes, 0, existingEndMinutes);
        } else if (!existingCrossesMidnight && newCrossesMidnight) {
          // New slot crosses midnight, existing slot doesn't
          // Check overlap with both parts: [newStart-1440] and [0-newEnd]
          hasOverlap =
            checkOverlap(
              existingStartMinutes,
              existingEndMinutes,
              newStartMinutes,
              1440
            ) ||
            checkOverlap(
              existingStartMinutes,
              existingEndMinutes,
              0,
              newEndMinutes
            );
        } else {
          // Both slots cross midnight
          // Check all combinations of parts
          hasOverlap =
            checkOverlap(newStartMinutes, 1440, existingStartMinutes, 1440) ||
            checkOverlap(newStartMinutes, 1440, 0, existingEndMinutes) ||
            checkOverlap(0, newEndMinutes, existingStartMinutes, 1440) ||
            checkOverlap(0, newEndMinutes, 0, existingEndMinutes);
        }

        if (hasOverlap) {
          const existingStartStr = `${String(existingStartHour).padStart(
            2,
            "0"
          )}:${String(existingStartMin).padStart(2, "0")}`;
          const existingEndStr = `${String(existingEndHour).padStart(
            2,
            "0"
          )}:${String(existingEndMin).padStart(2, "0")}`;
          return {
            hasConflict: true,
            conflictType: "TIME_OVERLAP",
            conflictDetails: `時間帯が既存の利用可能時間(${existingStartStr}-${existingEndStr})と重複しています。`,
          };
        }
      }
    }
  }

  return { hasConflict: false };
};

// GET a specific availability record by ID
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER", "STUDENT"],
  async (request: NextRequest, session, branchId) => {
    const availabilityId = request.url.split("/").pop();

    if (!availabilityId) {
      return NextResponse.json(
        { error: "利用可能時間IDが必要です" },
        { status: 400 }
      );
    }

    const availability = await prisma.userAvailability.findUnique({
      where: { id: availabilityId },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!availability) {
      return NextResponse.json(
        { error: "利用可能時間が見つかりません" },
        { status: 404 }
      );
    }

    // Check if user has access to this availability record
    if (
      session.user?.role !== "ADMIN" &&
      session.user?.role !== "STAFF" &&
      availability.userId !== session.user?.id
    ) {
      return NextResponse.json(
        { error: "この利用可能時間にアクセスする権限がありません" },
        { status: 403 }
      );
    }

    // Format response
    const formattedAvailability = formatUserAvailability(availability);

    return NextResponse.json({
      data: formattedAvailability,
    });
  }
);

// PATCH - Update an availability record
export const PATCH = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest, session, branchId) => {
    try {
      const availabilityId = request.url.split("/").pop();
      if (!availabilityId) {
        return NextResponse.json(
          { error: "利用可能時間IDが必要です" },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate request body
      const result = userAvailabilityUpdateSchema.safeParse({
        ...body,
        availabilityId,
      });
      if (!result.success) {
        return NextResponse.json(
          { error: "入力データが無効です", details: result.error.errors },
          { status: 400 }
        );
      }

      // Check if availability record exists
      const existingAvailability = await prisma.userAvailability.findUnique({
        where: { id: availabilityId },
      });

      if (!existingAvailability) {
        return NextResponse.json(
          { error: "利用可能時間が見つかりません" },
          { status: 404 }
        );
      }

      // Check if user has permission to update this record
      if (
        session.user?.role !== "ADMIN" &&
        session.user?.role !== "STAFF" &&
        existingAvailability.userId !== session.user?.id
      ) {
        return NextResponse.json(
          { error: "この利用可能時間を更新する権限がありません" },
          { status: 403 }
        );
      }

      const {
        dayOfWeek,
        date,
        startTime,
        endTime,
        fullDay,
        type,
        reason,
        notes,
      } = result.data;

      // Prepare update data
      const updateData: any = {
        dayOfWeek,
        reason,
        notes,
      };

      // Handle type and date/dayOfWeek updates
      if (type !== undefined) {
        updateData.type = type;
      }

      if (date !== undefined) {
        updateData.date = date ? createUTCDate(date) : null;
        updateData.dayOfWeek = null; // Clear dayOfWeek when setting date
      }

      if (dayOfWeek !== undefined) {
        updateData.dayOfWeek = dayOfWeek;
        updateData.date = null; // Clear date when setting dayOfWeek
      }

      if (fullDay !== undefined) {
        updateData.fullDay = fullDay;
      }

      // Handle time updates
      if (startTime !== undefined) {
        updateData.startTime = startTime
          ? createTimeFromString(startTime)
          : null;
      }

      if (endTime !== undefined) {
        updateData.endTime = endTime ? createTimeFromString(endTime) : null;
      }

      // Use existing values for conflict checking if not being updated
      const checkDayOfWeek =
        updateData.dayOfWeek !== undefined
          ? updateData.dayOfWeek
          : existingAvailability.dayOfWeek;
      const checkDate =
        updateData.date !== undefined
          ? updateData.date
          : existingAvailability.date;
      const checkStartTime =
        updateData.startTime !== undefined
          ? updateData.startTime
          : existingAvailability.startTime;
      const checkEndTime =
        updateData.endTime !== undefined
          ? updateData.endTime
          : existingAvailability.endTime;
      const checkFullDay =
        updateData.fullDay !== undefined
          ? updateData.fullDay
          : existingAvailability.fullDay;

      // Check for availability conflicts
      const checkType =
        updateData.type !== undefined
          ? (updateData.type as any)
          : (existingAvailability.type as any);
      const conflictCheck = await checkAvailabilityConflicts(
        existingAvailability.userId,
        checkDayOfWeek,
        checkDate,
        checkStartTime,
        checkEndTime,
        checkFullDay || false,
        checkType,
        availabilityId
      );

      if (conflictCheck.hasConflict) {
        return NextResponse.json(
          {
            error: conflictCheck.conflictDetails,
            conflictType: conflictCheck.conflictType,
          },
          { status: 409 }
        );
      }

      // For non-admin users, reset status to PENDING when they make changes
      if (session.user?.role !== "ADMIN" && session.user?.role !== "STAFF") {
        updateData.status = "PENDING";
      }

      // Update availability record
      const updatedAvailability = await prisma.userAvailability.update({
        where: { id: availabilityId },
        data: updateData,
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      });

      // Format response
      const formattedAvailability = formatUserAvailability(updatedAvailability);

      return NextResponse.json({
        data: formattedAvailability,
        message: "利用可能時間を更新しました",
      });
    } catch (error) {
      console.error("Error updating user availability:", error);
      return NextResponse.json(
        { error: "利用可能時間の更新に失敗しました" },
        { status: 500 }
      );
    }
  }
);

// DELETE - Delete an availability record
export const DELETE = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest, session, branchId) => {
    const availabilityId = request.url.split("/").pop();

    if (!availabilityId) {
      return NextResponse.json(
        { error: "利用可能時間IDが必要です" },
        { status: 400 }
      );
    }

    try {
      // Check if availability record exists
      const availability = await prisma.userAvailability.findUnique({
        where: { id: availabilityId },
      });

      if (!availability) {
        return NextResponse.json(
          { error: "利用可能時間が見つかりません" },
          { status: 404 }
        );
      }

      // Check if user has permission to delete this record
      if (
        session.user?.role !== "ADMIN" &&
        session.user?.role !== "STAFF" &&
        availability.userId !== session.user?.id
      ) {
        return NextResponse.json(
          { error: "この利用可能時間を削除する権限がありません" },
          { status: 403 }
        );
      }

      // Delete the availability record
      await prisma.userAvailability.delete({
        where: { id: availabilityId },
      });

      return NextResponse.json(
        {
          message: "利用可能時間を削除しました",
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error deleting user availability:", error);
      return NextResponse.json(
        { error: "利用可能時間の削除に失敗しました" },
        { status: 500 }
      );
    }
  }
);
