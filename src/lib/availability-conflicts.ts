// Enhanced conflict detection for UserAvailability
// This should be added to your existing conflict detection logic

import { prisma } from "@/lib/prisma";
import { DayOfWeek, Prisma } from "@prisma/client";

export const checkAdvancedTimeConflicts = async (
  userId: string,
  dayOfWeek: string | null,
  date: Date | null,
  startTime: Date | null,
  endTime: Date | null,
  type: 'REGULAR' | 'EXCEPTION',
  fullDay: boolean = false,
  excludeId?: string
): Promise<{
  hasConflict: boolean;
  conflictType: string | null;
  conflictingRecords: any[];
}> => {
  const conflicts: any[] = [];

  // 1. Check for exact duplicate time slots
  const exactDuplicateWhere: Prisma.UserAvailabilityWhereInput = {
    userId,
    type,
    status: { in: ["PENDING", "APPROVED"] },
  };

  if (excludeId) {
    exactDuplicateWhere.id = { not: excludeId };
  }

  if (type === 'REGULAR') {
    exactDuplicateWhere.dayOfWeek = dayOfWeek as DayOfWeek;
    exactDuplicateWhere.date = null;
  } else {
    exactDuplicateWhere.date = date;
    exactDuplicateWhere.dayOfWeek = null;
  }

  if (fullDay) {
    exactDuplicateWhere.fullDay = true;
  } else if (startTime && endTime) {
    exactDuplicateWhere.startTime = startTime;
    exactDuplicateWhere.endTime = endTime;
  }

  const exactDuplicates = await prisma.userAvailability.findMany({
    where: exactDuplicateWhere,
  });

  if (exactDuplicates.length > 0) {
    return {
      hasConflict: true,
      conflictType: 'EXACT_DUPLICATE',
      conflictingRecords: exactDuplicates,
    };
  }

  // 2. Check for time overlaps (only for time-specific availability)
  if (!fullDay && startTime && endTime) {
    const overlapWhere: Prisma.UserAvailabilityWhereInput = {
      userId,
      status: { in: ["PENDING", "APPROVED"] },
      startTime: { not: null },
      endTime: { not: null },
      fullDay: { not: true },
    };

    if (excludeId) {
      overlapWhere.id = { not: excludeId };
    }

    if (type === 'REGULAR') {
      overlapWhere.dayOfWeek = dayOfWeek as DayOfWeek;
      overlapWhere.date = null;
    } else {
      overlapWhere.date = date;
      overlapWhere.dayOfWeek = null;
    }

    const potentialOverlaps = await prisma.userAvailability.findMany({
      where: overlapWhere,
    });

    for (const existing of potentialOverlaps) {
      if (!existing.startTime || !existing.endTime) continue;

      const existingStart = existing.startTime.getTime();
      const existingEnd = existing.endTime.getTime();
      const newStart = startTime.getTime();
      const newEnd = endTime.getTime();

      // Check for any overlap
      if (newStart < existingEnd && newEnd > existingStart) {
        conflicts.push({
          ...existing,
          conflictType: 'TIME_OVERLAP',
        });
      }
    }
  }

  // 3. Check for fullDay conflicts with time-specific availability
  if (fullDay) {
    const timeSpecificWhere: Prisma.UserAvailabilityWhereInput = {
      userId,
      status: { in: ["PENDING", "APPROVED"] },
      fullDay: { not: true },
      startTime: { not: null },
      endTime: { not: null },
    };

    if (excludeId) {
      timeSpecificWhere.id = { not: excludeId };
    }

    if (type === 'REGULAR') {
      timeSpecificWhere.dayOfWeek = dayOfWeek as DayOfWeek;
      timeSpecificWhere.date = null;
    } else {
      timeSpecificWhere.date = date;
      timeSpecificWhere.dayOfWeek = null;
    }

    const timeSpecificAvailability = await prisma.userAvailability.findMany({
      where: timeSpecificWhere,
    });

    if (timeSpecificAvailability.length > 0) {
      conflicts.push(...timeSpecificAvailability.map(record => ({
        ...record,
        conflictType: 'FULLDAY_VS_TIMESPECIFIC',
      })));
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflictType: conflicts.length > 0 ? conflicts[0].conflictType : null,
    conflictingRecords: conflicts,
  };
};

// Batch conflict resolution for exception handling
export const batchResolveExceptionConflicts = async (
  userId: string,
  exceptions: Array<{
    date: Date;
    startTime?: Date | null;
    endTime?: Date | null;
    fullDay?: boolean;
  }>,
  overwriteExisting: boolean = false
): Promise<{
  successfulCreations: number;
  conflicts: any[];
  resolutions: any[];
}> => {
  const conflicts: any[] = [];
  const resolutions: any[] = [];
  let successfulCreations = 0;

  for (const exception of exceptions) {
    const conflictCheck = await checkAdvancedTimeConflicts(
      userId,
      null, // no dayOfWeek for exceptions
      exception.date,
      exception.startTime || null,
      exception.endTime || null,
      'EXCEPTION',
      exception.fullDay || false
    );

    if (conflictCheck.hasConflict) {
      if (overwriteExisting) {
        // Delete conflicting records
        await prisma.userAvailability.deleteMany({
          where: {
            id: { in: conflictCheck.conflictingRecords.map(r => r.id) },
          },
        });

        resolutions.push({
          date: exception.date,
          action: 'OVERWRITTEN',
          deletedRecords: conflictCheck.conflictingRecords.length,
        });

        successfulCreations++;
      } else {
        conflicts.push({
          date: exception.date,
          conflictType: conflictCheck.conflictType,
          conflictingRecords: conflictCheck.conflictingRecords,
        });
      }
    } else {
      successfulCreations++;
    }
  }

  return {
    successfulCreations,
    conflicts,
    resolutions,
  };
};
