// src/schemas/user-availability.schema.ts
import { z } from "zod";

export const dayOfWeekEnum = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

export const availabilityTypeEnum = z.enum(["REGULAR", "EXCEPTION", "ABSENCE"]);
export const availabilityStatusEnum = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const userAvailabilityCreateSchema = z
  .object({
    userId: z.string().optional(), // Required for ADMIN/STAFF users, optional for TEACHER users (validated at API level)
    dayOfWeek: dayOfWeekEnum.optional().nullable(),
    date: z.coerce.date().optional().nullable(),
    startTime: z.string().optional().nullable(), // Format: "HH:MM"
    endTime: z.string().optional().nullable(), // Format: "HH:MM"
    fullDay: z.boolean().optional().default(false),
    type: availabilityTypeEnum,
    reason: z.string().max(255).optional().nullable(),
    notes: z.string().max(255).optional().nullable(),
  })
  .refine(
    (data) => {
      // For REGULAR type, dayOfWeek is required and date should be null/undefined
      if (data.type === "REGULAR") {
        return (
          data.dayOfWeek !== null &&
          data.dayOfWeek !== undefined &&
          (data.date === null || data.date === undefined)
        );
      }
      // For EXCEPTION type, date is required and dayOfWeek should be null/undefined
      if (data.type === "EXCEPTION" || data.type === "ABSENCE") {
        return (
          data.date !== null &&
          data.date !== undefined &&
          (data.dayOfWeek === null || data.dayOfWeek === undefined)
        );
      }
      return true;
    },
    {
      message:
        "REGULAR availability requires dayOfWeek, EXCEPTION/ABSENCE availability requires date",
    }
  )
  .refine(
    (data) => {
      // If fullDay is false, either both startTime and endTime should be provided, or both should be null/undefined (unavailable)
      if (!data.fullDay) {
        return (
          (data.startTime !== null &&
            data.startTime !== undefined &&
            data.endTime !== null &&
            data.endTime !== undefined) ||
          ((data.startTime === null || data.startTime === undefined) &&
            (data.endTime === null || data.endTime === undefined))
        );
      }
      // If fullDay is true, startTime and endTime should be null/undefined
      return (
        (data.startTime === null || data.startTime === undefined) &&
        (data.endTime === null || data.endTime === undefined)
      );
    },
    {
      message: "Time slots must be consistent with fullDay setting",
    }
  )
  .refine(
    (data) => {
      // If startTime and endTime are provided, validate time logic
      if (data.startTime && data.endTime) {
        const [startHour, startMin] = data.startTime.split(":").map(Number);
        const [endHour, endMin] = data.endTime.split(":").map(Number);

        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        // Allow cross-midnight times (e.g., 14:00-00:00 for 2 PM to midnight)
        // Only reject if start and end are exactly the same
        return !(startMinutes === endMinutes);
      }
      return true;
    },
    {
      message: "Start time and end time cannot be identical",
    }
  );

export const userAvailabilityUpdateSchema = z
  .object({
    availabilityId: z.string(),
    dayOfWeek: dayOfWeekEnum.optional().nullable(),
    date: z.coerce.date().optional().nullable(),
    startTime: z.string().optional().nullable(),
    endTime: z.string().optional().nullable(),
    fullDay: z.boolean().optional(),
    type: availabilityTypeEnum.optional(),
    reason: z.string().max(255).optional().nullable(),
    notes: z.string().max(255).optional().nullable(),
  })
  .refine(
    (data) => {
      // Validate time consistency if provided
      if (data.startTime && data.endTime) {
        const [startHour, startMin] = data.startTime.split(":").map(Number);
        const [endHour, endMin] = data.endTime.split(":").map(Number);

        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        // Allow cross-midnight times (e.g., 14:00-00:00 for 2 PM to midnight)
        // Only reject if start and end are exactly the same
        return !(startMinutes === endMinutes);
      }
      return true;
    },
    {
      message: "Start time and end time cannot be identical",
    }
  );

export const userAvailabilityFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  userId: z.string().optional(),
  type: availabilityTypeEnum.optional(),
  status: availabilityStatusEnum.optional(),
  dayOfWeek: dayOfWeekEnum.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const userAvailabilityBatchCreateSchema = z.object({
  userId: z.string().optional(), // Required for ADMIN/STAFF users, optional for TEACHER users (validated at API level)
  type: availabilityTypeEnum,
  availability: z
    .array(
      z.object({
        dayOfWeek: dayOfWeekEnum.optional().nullable(),
        date: z.coerce.date().optional().nullable(),
        startTime: z.string().optional().nullable(),
        endTime: z.string().optional().nullable(),
        fullDay: z.boolean().optional().default(false),
        reason: z.string().max(255).optional().nullable(),
        notes: z.string().max(255).optional().nullable(),
      })
    )
    .min(1),
  overwriteExisting: z.boolean().optional().default(false),
});

export const userAvailabilityBatchUpdateStatusSchema = z.object({
  availabilityIds: z.array(z.string()).min(1),
  status: availabilityStatusEnum,
  reason: z.string().max(255).optional().nullable(),
});

export const userAvailabilityBatchDeleteSchema = z.object({
  availabilityIds: z.array(z.string()).min(1),
});

export const availabilityConflictCheckSchema = z.object({
  userId: z.string(),
  date: z.coerce.date(),
  startTime: z.string(),
  endTime: z.string(),
});

export type UserAvailabilityCreate = z.infer<
  typeof userAvailabilityCreateSchema
>;
export type UserAvailabilityUpdate = z.infer<
  typeof userAvailabilityUpdateSchema
>;
export type UserAvailabilityFilter = z.infer<
  typeof userAvailabilityFilterSchema
>;
export type UserAvailabilityBatchCreate = z.infer<
  typeof userAvailabilityBatchCreateSchema
>;
export type UserAvailabilityBatchUpdateStatus = z.infer<
  typeof userAvailabilityBatchUpdateStatusSchema
>;
export type UserAvailabilityBatchDelete = z.infer<
  typeof userAvailabilityBatchDeleteSchema
>;
export type AvailabilityConflictCheck = z.infer<
  typeof availabilityConflictCheckSchema
>;
