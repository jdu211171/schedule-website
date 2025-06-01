// src/app/api/user-availability/admin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { DayOfWeek, Prisma } from "@prisma/client";

const adminAvailabilityOverrideSchema = z.object({
  userId: z.string(),
  dayOfWeek: z
    .enum([
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
      "SUNDAY",
    ])
    .optional()
    .nullable(),
  date: z.coerce.date().optional().nullable(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  fullDay: z.boolean().optional().default(false),
  type: z.enum(["REGULAR", "EXCEPTION"]),
  status: z.enum(["APPROVED", "REJECTED"]).default("APPROVED"),
  reason: z.string().max(255).optional().nullable(),
  notes: z.string().max(255).optional().nullable(),
  overwriteExisting: z.boolean().optional().default(false),
});

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
  availability: any
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

// GET - Get pending approvals dashboard data
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    try {
      const url = new URL(request.url);
      const status = url.searchParams.get("status") || "PENDING";
      const type = url.searchParams.get("type");
      const userId = url.searchParams.get("userId");
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");

      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (type) {
        where.type = type;
      }

      if (userId) {
        where.userId = userId;
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Get total count
      const total = await prisma.userAvailability.count({ where });

      // Get availability records with user info
      const availabilityRecords = await prisma.userAvailability.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              role: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: [
          { createdAt: "desc" },
          { type: "asc" },
          { dayOfWeek: "asc" },
          { date: "asc" },
        ],
      });

      // Get summary statistics
      const stats = await prisma.userAvailability.groupBy({
        by: ["status", "type"],
        _count: {
          id: true,
        },
      });

      // Format statistics
      const summary = {
        pending: stats
          .filter((s) => s.status === "PENDING")
          .reduce((acc, s) => acc + s._count.id, 0),
        approved: stats
          .filter((s) => s.status === "APPROVED")
          .reduce((acc, s) => acc + s._count.id, 0),
        rejected: stats
          .filter((s) => s.status === "REJECTED")
          .reduce((acc, s) => acc + s._count.id, 0),
        regular: stats
          .filter((s) => s.type === "REGULAR")
          .reduce((acc, s) => acc + s._count.id, 0),
        exception: stats
          .filter((s) => s.type === "EXCEPTION")
          .reduce((acc, s) => acc + s._count.id, 0),
      };

      // Format availability records
      const formattedRecords = availabilityRecords.map(formatUserAvailability);

      return NextResponse.json({
        data: formattedRecords,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
        summary,
      });
    } catch (error) {
      console.error("Error fetching admin availability data:", error);
      return NextResponse.json(
        { error: "管理者用利用可能時間データの取得に失敗しました" },
        { status: 500 }
      );
    }
  }
);

// POST - Admin override/create availability directly (auto-approved)
export const POST = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = adminAvailabilityOverrideSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "入力データが無効です", details: result.error.errors },
          { status: 400 }
        );
      }

      const {
        userId,
        dayOfWeek,
        date,
        startTime,
        endTime,
        fullDay,
        type,
        status,
        reason,
        notes,
        overwriteExisting,
      } = result.data;

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

      // If overwriting existing, delete conflicting records
      if (overwriteExisting) {
        const deleteWhere: any = {
          userId,
          type,
        };

        if (type === "REGULAR" && dayOfWeek) {
          deleteWhere.dayOfWeek = dayOfWeek;
        } else if (type === "EXCEPTION" && dateUTC) {
          deleteWhere.date = dateUTC;
        }

        await prisma.userAvailability.deleteMany({
          where: deleteWhere,
        });
      } else {
        // Check for availability conflicts if not overwriting
        const conflictCheck = await checkAvailabilityConflicts(
          userId,
          dayOfWeek || null,
          dateUTC,
          startTimeUTC,
          endTimeUTC,
          fullDay || false
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
      }

      // Create the availability record
      const newAvailability = await prisma.userAvailability.create({
        data: {
          userId,
          dayOfWeek,
          date: dateUTC,
          startTime: startTimeUTC,
          endTime: endTimeUTC,
          fullDay,
          type,
          status, // Admin-created records can be directly approved/rejected
          reason,
          notes,
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      });

      // Format response
      const formattedAvailability = formatUserAvailability(newAvailability);

      const actionText = overwriteExisting ? "上書き作成" : "作成";

      return NextResponse.json(
        {
          data: formattedAvailability,
          message: `利用可能時間を管理者権限で${actionText}しました`,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error creating admin availability override:", error);
      return NextResponse.json(
        { error: "管理者権限での利用可能時間作成に失敗しました" },
        { status: 500 }
      );
    }
  }
);
