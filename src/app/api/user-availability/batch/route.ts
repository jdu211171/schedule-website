// src/app/api/user-availability/batch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  userAvailabilityBatchCreateSchema,
  userAvailabilityBatchUpdateStatusSchema,
} from "@/schemas/user-availability.schema";
import {
  UserAvailability,
  AvailabilityStatus,
  DayOfWeek,
  Prisma,
} from "@prisma/client";

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
  excludeIds: string[] = []
): Promise<{
  hasConflict: boolean;
  conflictType?: string;
  conflictDetails?: string;
}> => {
  const where: Prisma.UserAvailabilityWhereInput = {
    userId,
    status: { in: ["PENDING", "APPROVED"] }, // Don't check against rejected availability
  };

  if (excludeIds.length > 0) {
    where.id = { notIn: excludeIds };
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

// POST - Batch create availability records
export const POST = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest, session) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = userAvailabilityBatchCreateSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "入力データが無効です", details: result.error.errors },
          { status: 400 }
        );
      }

      const { userId, type, availability, overwriteExisting } = result.data;

      // Determine the target user ID
      let targetUserId: string;
      if (session.user?.role === "ADMIN" || session.user?.role === "STAFF") {
        // Admin users must specify which user they're creating availability for
        if (!userId) {
          return NextResponse.json(
            {
              error:
                "管理者は利用可能時間を作成する対象ユーザーIDを指定する必要があります",
            },
            { status: 400 }
          );
        }
        targetUserId = userId;
      } else {
        // Teachers can only create availability for themselves
        targetUserId = session.user?.id || "";
      }

      if (!targetUserId) {
        return NextResponse.json(
          { error: "ユーザーIDが見つかりません" },
          { status: 400 }
        );
      }

      // Determine status - admins can create approved records directly, others need approval
      const recordStatus: AvailabilityStatus =
        session.user?.role === "ADMIN" || session.user?.role === "STAFF"
          ? "APPROVED"
          : "PENDING";

      // If overwriting existing, delete existing records of the same type
      if (overwriteExisting) {
        const deleteWhere: Prisma.UserAvailabilityWhereInput = {
          userId: targetUserId,
          type,
        };

        // For REGULAR type, delete all regular availability for this user
        // For EXCEPTION type, delete exceptions within the date range
        if (type === "EXCEPTION") {
          const dates = availability
            .map((item) => item.date)
            .filter((date) => date !== null && date !== undefined)
            .map((date) => createUTCDate(date!));

          if (dates.length > 0) {
            const minDate = new Date(
              Math.min(...dates.map((d) => d.getTime()))
            );
            const maxDate = new Date(
              Math.max(...dates.map((d) => d.getTime()))
            );
            deleteWhere.date = {
              gte: minDate,
              lte: maxDate,
            };
          }
        }

        await prisma.userAvailability.deleteMany({
          where: deleteWhere,
        });
      }

      // Prepare records for creation
      const recordsToCreate: Prisma.UserAvailabilityUncheckedCreateInput[] = [];
      const conflicts = [];

      for (const item of availability) {
        const { dayOfWeek, date, startTime, endTime, fullDay, reason, notes } =
          item;

        // Convert date and times
        let dateUTC: Date | null = null;
        let startTimeUTC: Date | null = null;
        let endTimeUTC: Date | null = null;

        if (date) {
          dateUTC = createUTCDate(date);
        }

        if (startTime) {
          startTimeUTC = createTimeFromString(startTime);
        }

        if (endTime) {
          endTimeUTC = createTimeFromString(endTime);
        }

        // Validate type consistency
        if (type === "REGULAR" && !dayOfWeek) {
          return NextResponse.json(
            { error: "REGULAR可用性には曜日が必要です" },
            { status: 400 }
          );
        }

        if (type === "EXCEPTION" && !date) {
          return NextResponse.json(
            { error: "EXCEPTION可用性には日付が必要です" },
            { status: 400 }
          );
        }

        // Check for conflicts if not overwriting
        if (!overwriteExisting) {
          const conflictCheck = await checkAvailabilityConflicts(
            targetUserId,
            dayOfWeek || null,
            dateUTC,
            startTimeUTC,
            endTimeUTC,
            fullDay || false
          );

          if (conflictCheck.hasConflict) {
            conflicts.push({
              dayOfWeek,
              date: date ? date.toString() : null,
              startTime,
              endTime,
              fullDay,
              conflictType: conflictCheck.conflictType,
              conflictDetails: conflictCheck.conflictDetails,
            });
            continue;
          }
        }

        recordsToCreate.push({
          userId: targetUserId,
          dayOfWeek: dayOfWeek as DayOfWeek | null,
          date: dateUTC,
          startTime: startTimeUTC,
          endTime: endTimeUTC,
          fullDay,
          type,
          status: recordStatus,
          reason,
          notes,
        });
      }

      // If there are conflicts and we're not overwriting, return conflict info
      if (conflicts.length > 0 && !overwriteExisting) {
        return NextResponse.json(
          {
            error: "一部の時間帯で既存の予定と重複があります",
            conflicts,
          },
          { status: 409 }
        );
      }

      // Create records in a transaction
      const createdRecords = await prisma.$transaction(
        recordsToCreate.map((record) =>
          prisma.userAvailability.create({
            data: record,
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          })
        )
      );

      // Format response
      const formattedRecords = createdRecords.map(formatUserAvailability);

      const message = overwriteExisting
        ? `${formattedRecords.length}件の利用可能時間を上書き作成しました`
        : `${formattedRecords.length}件の利用可能時間を作成しました`;

      return NextResponse.json(
        {
          data: formattedRecords,
          message,
          conflicts: conflicts.length > 0 ? conflicts : undefined,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error batch creating user availability:", error);
      return NextResponse.json(
        { error: "利用可能時間の一括作成に失敗しました" },
        { status: 500 }
      );
    }
  }
);

// PATCH - Batch update status of availability records
export const PATCH = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = userAvailabilityBatchUpdateStatusSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "入力データが無効です", details: result.error.errors },
          { status: 400 }
        );
      }

      const { availabilityIds, status, reason } = result.data;

      // Fetch records to verify they exist
      const availabilityRecords = await prisma.userAvailability.findMany({
        where: {
          id: { in: availabilityIds },
        },
      });

      if (availabilityRecords.length === 0) {
        return NextResponse.json(
          { error: "更新対象の利用可能時間が見つかりません" },
          { status: 404 }
        );
      }

      // Update records
      const updatedRecords = await prisma.$transaction(
        availabilityIds.map((id) =>
          prisma.userAvailability.update({
            where: { id },
            data: {
              status,
              reason: reason || undefined,
              updatedAt: new Date(),
            },
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          })
        )
      );

      // Format response
      const formattedRecords = updatedRecords.map(formatUserAvailability);

      const statusText =
        status === "APPROVED"
          ? "承認"
          : status === "REJECTED"
          ? "拒否"
          : "保留";

      return NextResponse.json({
        data: formattedRecords,
        message: `${formattedRecords.length}件の利用可能時间を${statusText}しました`,
      });
    } catch (error) {
      console.error("Error batch updating availability status:", error);
      return NextResponse.json(
        { error: "利用可能時間のステータス一括更新に失敗しました" },
        { status: 500 }
      );
    }
  }
);
