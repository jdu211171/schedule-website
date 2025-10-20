// src/lib/enhanced-availability.ts
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { DayOfWeek, UserAvailability } from "@prisma/client";

export interface TimeSlot {
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
}

export interface AvailabilityDetails {
  available: boolean;
  hasExceptions: boolean;
  hasRegular: boolean;
  exceptionSlots: TimeSlot[];
  regularSlots: TimeSlot[];
  effectiveSlots: TimeSlot[]; // What's actually used (exceptions override regular)
  conflictType?: "UNAVAILABLE" | "WRONG_TIME";
}

/**
 * Enhanced availability check that provides full details about user availability
 */
export async function getDetailedUserAvailability(
  userId: string,
  date: Date,
  requestedStartTime?: Date,
  requestedEndTime?: Date
): Promise<AvailabilityDetails> {
  const dayOfWeek = getDayOfWeekFromDate(date);

  // Get both exception and regular availability
  const [exceptionAvailability, regularAvailability, absenceAvailability] =
    await Promise.all([
      prisma.userAvailability.findMany({
        where: {
          userId,
          type: "EXCEPTION",
          status: "APPROVED",
          date,
        },
        orderBy: { startTime: "asc" },
      }),
      prisma.userAvailability.findMany({
        where: {
          userId,
          type: "REGULAR",
          status: "APPROVED",
          dayOfWeek: dayOfWeek as DayOfWeek,
        },
        orderBy: { startTime: "asc" },
      }),
      prisma.userAvailability.findMany({
        where: {
          userId,
          type: "ABSENCE",
          status: "APPROVED",
          date,
        },
        orderBy: { startTime: "asc" },
      }),
    ]);

  const exceptionSlots = convertAvailabilityToTimeSlots(exceptionAvailability);
  const regularSlots = convertAvailabilityToTimeSlots(regularAvailability);
  const absenceSlots = convertAvailabilityToTimeSlots(absenceAvailability);

  // Determine effective slots (exceptions override regular)
  let effectiveSlots =
    exceptionSlots.length > 0 ? exceptionSlots : regularSlots;

  // Apply absences by subtracting them from effective slots
  if (absenceSlots.length > 0) {
    effectiveSlots = subtractTimeSlots(effectiveSlots, absenceSlots);
  }

  // Check if requested time is available (if provided)
  let available = effectiveSlots.length > 0;
  let conflictType: "UNAVAILABLE" | "WRONG_TIME" | undefined;

  if (requestedStartTime && requestedEndTime && effectiveSlots.length > 0) {
    const requestedStart =
      requestedStartTime.getUTCHours() * 60 +
      requestedStartTime.getUTCMinutes();
    const requestedEnd =
      requestedEndTime.getUTCHours() * 60 + requestedEndTime.getUTCMinutes();

    available = effectiveSlots.some((slot) => {
      const slotStart = timeToMinutes(slot.startTime);
      const slotEnd = timeToMinutes(slot.endTime);
      return requestedStart >= slotStart && requestedEnd <= slotEnd;
    });

    if (!available) {
      conflictType = effectiveSlots.length > 0 ? "WRONG_TIME" : "UNAVAILABLE";
    }
  } else if (effectiveSlots.length === 0) {
    available = false;
    conflictType = "UNAVAILABLE";
  }

  return {
    available,
    hasExceptions: exceptionSlots.length > 0,
    hasRegular: regularSlots.length > 0,
    exceptionSlots,
    regularSlots,
    effectiveSlots,
    conflictType,
  };
}

/**
 * Find shared availability with detailed breakdown
 */
export async function getDetailedSharedAvailability(
  user1Id: string,
  user2Id: string,
  date: Date,
  requestedStartTime?: Date,
  requestedEndTime?: Date,
  options?: { skipVacationCheck?: boolean }
): Promise<{
  user1: AvailabilityDetails;
  user2: AvailabilityDetails;
  sharedSlots: TimeSlot[];
  available: boolean;
  strategy: "EXCEPTION" | "REGULAR" | "MIXED" | "NONE";
  message?: string;
}> {
  // Check vacation conflicts first (can be disabled if caller already handled it)
  if (!options?.skipVacationCheck) {
    const vacationConflict = await checkVacationConflicts(date);
    if (vacationConflict.hasConflict) {
      const emptyDetails: AvailabilityDetails = {
        available: false,
        hasExceptions: false,
        hasRegular: false,
        exceptionSlots: [],
        regularSlots: [],
        effectiveSlots: [],
        conflictType: "UNAVAILABLE",
      };

      return {
        user1: emptyDetails,
        user2: emptyDetails,
        sharedSlots: [],
        available: false,
        strategy: "NONE",
        message: vacationConflict.message,
      };
    }
  }

  // Get detailed availability for both users
  const [user1Details, user2Details] = await Promise.all([
    getDetailedUserAvailability(
      user1Id,
      date,
      requestedStartTime,
      requestedEndTime
    ),
    getDetailedUserAvailability(
      user2Id,
      date,
      requestedStartTime,
      requestedEndTime
    ),
  ]);

  // Find intersection of effective slots
  const sharedSlots = findTimeSlotIntersection(
    user1Details.effectiveSlots,
    user2Details.effectiveSlots
  );

  // Determine strategy used
  let strategy: "EXCEPTION" | "REGULAR" | "MIXED" | "NONE" = "NONE";
  if (sharedSlots.length > 0) {
    if (user1Details.hasExceptions && user2Details.hasExceptions) {
      strategy = "EXCEPTION";
    } else if (!user1Details.hasExceptions && !user2Details.hasExceptions) {
      strategy = "REGULAR";
    } else {
      strategy = "MIXED";
    }
  }

  // Check if requested time is within shared slots
  let available = sharedSlots.length > 0;
  let message: string | undefined;

  if (requestedStartTime && requestedEndTime && sharedSlots.length > 0) {
    const requestedStart =
      requestedStartTime.getUTCHours() * 60 +
      requestedStartTime.getUTCMinutes();
    const requestedEnd =
      requestedEndTime.getUTCHours() * 60 + requestedEndTime.getUTCMinutes();

    available = sharedSlots.some((slot) => {
      const slotStart = timeToMinutes(slot.startTime);
      const slotEnd = timeToMinutes(slot.endTime);
      return requestedStart >= slotStart && requestedEnd <= slotEnd;
    });

    if (!available && sharedSlots.length > 0) {
      message =
        "指定された時間は共有利用可能時間外です。利用可能な時間帯から選択してください。";
    }
  } else if (sharedSlots.length === 0) {
    available = false;
    message = "指定された日付に両方のユーザーが利用できる時間帯がありません。";
  }

  return {
    user1: user1Details,
    user2: user2Details,
    sharedSlots,
    available,
    strategy,
    message,
  };
}

// Helper functions
function convertAvailabilityToTimeSlots(
  availability: UserAvailability[]
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  for (const slot of availability) {
    if (slot.fullDay) {
      slots.push({ startTime: "00:00", endTime: "23:59" });
    } else if (slot.startTime && slot.endTime) {
      const startHour = slot.startTime.getUTCHours();
      const startMin = slot.startTime.getUTCMinutes();
      const endHour = slot.endTime.getUTCHours();
      const endMin = slot.endTime.getUTCMinutes();

      slots.push({
        startTime: `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`,
        endTime: `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`,
      });
    }
  }

  return slots;
}

function findTimeSlotIntersection(
  slots1: TimeSlot[],
  slots2: TimeSlot[]
): TimeSlot[] {
  const intersection: TimeSlot[] = [];

  for (const slot1 of slots1) {
    for (const slot2 of slots2) {
      const overlap = getTimeSlotOverlap(slot1, slot2);
      if (overlap) {
        intersection.push(overlap);
      }
    }
  }

  return mergeOverlappingSlots(intersection);
}

function getTimeSlotOverlap(slot1: TimeSlot, slot2: TimeSlot): TimeSlot | null {
  const start1 = timeToMinutes(slot1.startTime);
  const end1 = timeToMinutes(slot1.endTime);
  const start2 = timeToMinutes(slot2.startTime);
  const end2 = timeToMinutes(slot2.endTime);

  const overlapStart = Math.max(start1, start2);
  const overlapEnd = Math.min(end1, end2);

  if (overlapStart < overlapEnd) {
    return {
      startTime: minutesToTime(overlapStart),
      endTime: minutesToTime(overlapEnd),
    };
  }

  return null;
}

function mergeOverlappingSlots(slots: TimeSlot[]): TimeSlot[] {
  if (slots.length === 0) return [];

  const sorted = slots.sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );
  const merged: TimeSlot[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const lastMerged = merged[merged.length - 1];

    if (timeToMinutes(current.startTime) <= timeToMinutes(lastMerged.endTime)) {
      lastMerged.endTime = minutesToTime(
        Math.max(
          timeToMinutes(lastMerged.endTime),
          timeToMinutes(current.endTime)
        )
      );
    } else {
      merged.push(current);
    }
  }

  return merged;
}

// Subtract `toSubtract` intervals from `base` intervals
function subtractTimeSlots(
  base: TimeSlot[],
  toSubtract: TimeSlot[]
): TimeSlot[] {
  if (base.length === 0) return [];
  if (toSubtract.length === 0) return base;

  // Normalize/merge both sets
  let remaining = mergeOverlappingSlots(base);
  const subtractors = mergeOverlappingSlots(toSubtract);

  for (const sub of subtractors) {
    const sStart = timeToMinutes(sub.startTime);
    const sEnd = timeToMinutes(sub.endTime);
    const nextRemaining: TimeSlot[] = [];

    for (const b of remaining) {
      const bStart = timeToMinutes(b.startTime);
      const bEnd = timeToMinutes(b.endTime);

      // No overlap
      if (sEnd <= bStart || sStart >= bEnd) {
        nextRemaining.push(b);
        continue;
      }

      // Sub fully covers base -> remove entirely
      if (sStart <= bStart && sEnd >= bEnd) {
        continue;
      }

      // Overlap at start -> trim start
      if (sStart <= bStart && sEnd < bEnd) {
        nextRemaining.push({
          startTime: minutesToTime(sEnd),
          endTime: minutesToTime(bEnd),
        });
        continue;
      }

      // Overlap at end -> trim end
      if (sStart > bStart && sEnd >= bEnd) {
        nextRemaining.push({
          startTime: minutesToTime(bStart),
          endTime: minutesToTime(sStart),
        });
        continue;
      }

      // Middle split -> two intervals
      if (sStart > bStart && sEnd < bEnd) {
        nextRemaining.push({
          startTime: minutesToTime(bStart),
          endTime: minutesToTime(sStart),
        });
        nextRemaining.push({
          startTime: minutesToTime(sEnd),
          endTime: minutesToTime(bEnd),
        });
        continue;
      }
    }

    remaining = mergeOverlappingSlots(nextRemaining);
    if (remaining.length === 0) break;
  }

  return remaining;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function getDayOfWeekFromDate(date: Date): string {
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
}

async function checkVacationConflicts(date: Date): Promise<{
  hasConflict: boolean;
  message?: string;
}> {
  // Check for vacation periods that overlap this date
  const vacation = await prisma.vacation.findFirst({
    where: {
      startDate: { lte: date },
      endDate: { gte: date },
    },
  });

  if (vacation) {
    return {
      hasConflict: true,
      message: `${format(date, "yyyy-MM-dd")}は休暇期間（${vacation.name}）です`,
    };
  }

  return { hasConflict: false };
}
