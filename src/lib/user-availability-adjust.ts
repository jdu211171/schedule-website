// src/lib/user-availability-adjust.ts
import { Prisma, AvailabilityType } from "@prisma/client";

function toMinutesUTC(time: Date): number {
  return time.getUTCHours() * 60 + time.getUTCMinutes();
}

function fromMinutesUTC(mins: number): Date {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return new Date(Date.UTC(2000, 0, 1, h, m, 0, 0));
}

/**
 * Adjust existing opposite-type availability on the same date so that the new record
 * can be inserted as-is without unique conflicts or overlaps.
 *
 * Ladder rule: always insert the new record unchanged; shrink or delete existing.
 */
export async function adjustOppositeAvailabilityForNew(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    dateUTC: Date; // date at 00:00:00 UTC
    newType: AvailabilityType; // "EXCEPTION" or "ABSENCE"
    newFullDay: boolean;
    newStartTime?: Date | null; // time-only (UTC 2000-01-01)
    newEndTime?: Date | null; // time-only (UTC 2000-01-01)
  }
): Promise<void> {
  const { userId, dateUTC, newType, newFullDay, newStartTime, newEndTime } = params;
  const oppositeType: AvailabilityType = newType === "EXCEPTION" ? "ABSENCE" : "EXCEPTION";

  const existing = await tx.userAvailability.findMany({
    where: { userId, type: oppositeType, date: dateUTC },
    select: {
      id: true,
      fullDay: true,
      startTime: true,
      endTime: true,
    },
  });

  // Pre-compute new interval in minutes, if any
  const newStartMin = newFullDay || !newStartTime ? null : toMinutesUTC(newStartTime);
  const newEndMin = newFullDay || !newEndTime ? null : toMinutesUTC(newEndTime);

  for (const e of existing) {
    if (e.fullDay) {
      // Existing covers whole day
      if (newFullDay) {
        // New also full day: delete existing
        await tx.userAvailability.delete({ where: { id: e.id } });
      } else if (newStartMin !== null && newEndMin !== null) {
        // Keep the earlier segment [00:00, newStart)
        if (newStartMin <= 0) {
          // Nothing remains before; delete
          await tx.userAvailability.delete({ where: { id: e.id } });
        } else {
          await tx.userAvailability.update({
            where: { id: e.id },
            data: {
              fullDay: false,
              startTime: fromMinutesUTC(0),
              endTime: fromMinutesUTC(newStartMin),
            },
          });
        }
      }
      continue;
    }

    // Existing has specific time range
    if (!e.startTime || !e.endTime) {
      // Defensive: if malformed, delete it
      await tx.userAvailability.delete({ where: { id: e.id } });
      continue;
    }

    const a = toMinutesUTC(e.startTime);
    const b = toMinutesUTC(e.endTime);

    if (newFullDay) {
      // New covers whole day: delete existing
      await tx.userAvailability.delete({ where: { id: e.id } });
      continue;
    }

    if (newStartMin === null || newEndMin === null) {
      // No valid new interval; skip
      continue;
    }

    const c = newStartMin;
    const d = newEndMin;

    // No overlap
    if (b <= c || a >= d) {
      continue;
    }

    // New fully covers existing
    if (a >= c && b <= d) {
      await tx.userAvailability.delete({ where: { id: e.id } });
      continue;
    }

    // Existing fully covers new: choose larger remainder side to keep
    if (a < c && b > d) {
      const leftLen = c - a;
      const rightLen = b - d;
      if (leftLen >= rightLen) {
        // Keep left part: [a, c)
        if (c - a <= 0) {
          await tx.userAvailability.delete({ where: { id: e.id } });
        } else {
          await tx.userAvailability.update({
            where: { id: e.id },
            data: {
              fullDay: false,
              startTime: fromMinutesUTC(a),
              endTime: fromMinutesUTC(c),
            },
          });
        }
      } else {
        // Keep right part: [d, b)
        if (b - d <= 0) {
          await tx.userAvailability.delete({ where: { id: e.id } });
        } else {
          await tx.userAvailability.update({
            where: { id: e.id },
            data: {
              fullDay: false,
              startTime: fromMinutesUTC(d),
              endTime: fromMinutesUTC(b),
            },
          });
        }
      }
      continue;
    }

    // Partial overlaps
    // Overlap on the right of existing: [a, b) with [c, d) where a < c < b <= d
    if (a < c && b > c && b <= d) {
      const newEnd = c;
      if (newEnd - a <= 0) {
        await tx.userAvailability.delete({ where: { id: e.id } });
      } else {
        await tx.userAvailability.update({
          where: { id: e.id },
          data: {
            fullDay: false,
            startTime: fromMinutesUTC(a),
            endTime: fromMinutesUTC(newEnd),
          },
        });
      }
      continue;
    }

    // Overlap on the left of existing: [a, b) with [c, d) where c <= a < d < b
    if (a >= c && a < d && b > d) {
      const newStart = d;
      if (b - newStart <= 0) {
        await tx.userAvailability.delete({ where: { id: e.id } });
      } else {
        await tx.userAvailability.update({
          where: { id: e.id },
          data: {
            fullDay: false,
            startTime: fromMinutesUTC(newStart),
            endTime: fromMinutesUTC(b),
          },
        });
      }
      continue;
    }
  }
}

