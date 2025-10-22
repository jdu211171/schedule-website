// src/lib/shared-availability.ts
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { DayOfWeek, UserAvailability } from "@prisma/client";

export interface TimeSlot {
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
}

export interface SharedAvailabilityResult {
  available: boolean;
  sharedSlots: TimeSlot[];
  message?: string;
  strategy: "EXCEPTION" | "REGULAR" | "NONE";
}

/**
 * Find shared availability between two users for a specific date
 */
export async function findSharedAvailability(
  user1Id: string,
  user2Id: string,
  date: Date
): Promise<SharedAvailabilityResult> {
  // Check for vacation conflicts first
  const vacationConflict = await checkVacationConflicts(date);
  if (vacationConflict.hasConflict) {
    return {
      available: false,
      sharedSlots: [],
      message: vacationConflict.message,
      strategy: "NONE",
    };
  }

  // Step 1: Check for exceptional availability
  const user1Exceptions = await getUserExceptionAvailability(user1Id, date);
  const user2Exceptions = await getUserExceptionAvailability(user2Id, date);
  const user1Absences = await getUserAbsenceAvailability(user1Id, date);
  const user2Absences = await getUserAbsenceAvailability(user2Id, date);

  if (user1Exceptions.length > 0 || user2Exceptions.length > 0) {
    // At least one user has exceptions - use exception-based intersection
    let user1Slots =
      user1Exceptions.length > 0
        ? user1Exceptions
        : await getUserRegularAvailability(user1Id, date);

    let user2Slots =
      user2Exceptions.length > 0
        ? user2Exceptions
        : await getUserRegularAvailability(user2Id, date);

    // Apply absences
    if (user1Absences.length > 0) {
      user1Slots = subtractTimeSlots(user1Slots, user1Absences);
    }
    if (user2Absences.length > 0) {
      user2Slots = subtractTimeSlots(user2Slots, user2Absences);
    }

    const intersection = findTimeSlotIntersection(user1Slots, user2Slots);

    if (intersection.length > 0) {
      return {
        available: true,
        sharedSlots: intersection,
        strategy: "EXCEPTION",
      };
    }
  }

  // Step 2: Fall back to regular availability
  let user1Regular = await getUserRegularAvailability(user1Id, date);
  let user2Regular = await getUserRegularAvailability(user2Id, date);

  // Apply absences to regular baseline too
  if (user1Absences.length > 0) {
    user1Regular = subtractTimeSlots(user1Regular, user1Absences);
  }
  if (user2Absences.length > 0) {
    user2Regular = subtractTimeSlots(user2Regular, user2Absences);
  }

  const regularIntersection = findTimeSlotIntersection(
    user1Regular,
    user2Regular
  );

  if (regularIntersection.length > 0) {
    return {
      available: true,
      sharedSlots: regularIntersection,
      strategy: "REGULAR",
    };
  }

  // Step 3: No availability
  return {
    available: false,
    sharedSlots: [],
    message: "指定された日時に両方のユーザーが利用できる時間帯がありません",
    strategy: "NONE",
  };
}

/**
 * Get user's exception availability for a specific date
 */
async function getUserExceptionAvailability(
  userId: string,
  date: Date
): Promise<TimeSlot[]> {
  const exceptions = await prisma.userAvailability.findMany({
    where: {
      userId,
      type: "EXCEPTION",
      status: "APPROVED",
      date,
    },
    orderBy: { startTime: "asc" },
  });

  return convertAvailabilityToTimeSlots(exceptions);
}

/**
 * Get user's absence (date-specific unavailability) for a specific date
 */
async function getUserAbsenceAvailability(
  userId: string,
  date: Date
): Promise<TimeSlot[]> {
  const absences = await prisma.userAvailability.findMany({
    where: {
      userId,
      type: "ABSENCE",
      status: "APPROVED",
      date,
    },
    orderBy: { startTime: "asc" },
  });

  return convertAvailabilityToTimeSlots(absences);
}

/**
 * Get user's regular availability for a specific day of week
 */
async function getUserRegularAvailability(
  userId: string,
  date: Date
): Promise<TimeSlot[]> {
  const dayOfWeek = getDayOfWeekFromDate(date);

  const regular = await prisma.userAvailability.findMany({
    where: {
      userId,
      type: "REGULAR",
      status: "APPROVED",
      dayOfWeek: dayOfWeek as DayOfWeek,
    },
    orderBy: { startTime: "asc" },
  });

  return convertAvailabilityToTimeSlots(regular);
}

/**
 * Convert availability records to TimeSlot array
 */
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

/**
 * Find intersection of two time slot arrays
 */
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

  // Merge overlapping slots and sort
  return mergeOverlappingSlots(intersection);
}

/**
 * Find overlap between two time slots
 */
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

/**
 * Merge overlapping time slots
 */
function mergeOverlappingSlots(slots: TimeSlot[]): TimeSlot[] {
  if (slots.length === 0) return [];

  // Sort by start time
  const sorted = slots.sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );
  const merged: TimeSlot[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const lastMerged = merged[merged.length - 1];

    if (timeToMinutes(current.startTime) <= timeToMinutes(lastMerged.endTime)) {
      // Overlapping or adjacent slots - merge them
      lastMerged.endTime = minutesToTime(
        Math.max(
          timeToMinutes(lastMerged.endTime),
          timeToMinutes(current.endTime)
        )
      );
    } else {
      // Non-overlapping - add as new slot
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Subtract one set of time slots from another
 */
function subtractTimeSlots(
  base: TimeSlot[],
  toSubtract: TimeSlot[]
): TimeSlot[] {
  if (base.length === 0) return [];
  if (toSubtract.length === 0) return base;

  let remaining = mergeOverlappingSlots(base);
  const subtractors = mergeOverlappingSlots(toSubtract);

  for (const sub of subtractors) {
    const sStart = timeToMinutes(sub.startTime);
    const sEnd = timeToMinutes(sub.endTime);
    const nextRemaining: TimeSlot[] = [];

    for (const b of remaining) {
      const bStart = timeToMinutes(b.startTime);
      const bEnd = timeToMinutes(b.endTime);

      if (sEnd <= bStart || sStart >= bEnd) {
        nextRemaining.push(b);
        continue;
      }

      if (sStart <= bStart && sEnd >= bEnd) {
        continue;
      }

      if (sStart <= bStart && sEnd < bEnd) {
        nextRemaining.push({
          startTime: minutesToTime(sEnd),
          endTime: minutesToTime(bEnd),
        });
        continue;
      }

      if (sStart > bStart && sEnd >= bEnd) {
        nextRemaining.push({
          startTime: minutesToTime(bStart),
          endTime: minutesToTime(sStart),
        });
        continue;
      }

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

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * Get day of week from date
 */
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

/**
 * Check for vacation conflicts on the given date
 */
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
