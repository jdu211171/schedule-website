import { z } from "zod";

export const scheduleCreateSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:mm)"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:mm)"),
    teacherId: z.string().cuid(),
    boothId: z.string().cuid(),
    subjectId: z.string().cuid().optional(),
    classTypeId: z.string().cuid().optional(),
    notes: z.string().max(255).optional(),
    studentIds: z.array(z.string().cuid()).optional(),
});

export const availabilityCheckSchema = z.object({
    teacherId: z.string().cuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:mm)"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:mm)"),
});

export const scheduleUpdateSchema = scheduleCreateSchema.extend({
    classId: z.string().cuid(),
});

export type ScheduleCreateInput = z.infer<typeof scheduleCreateSchema>;
export type AvailabilityCheckInput = z.infer<typeof availabilityCheckSchema>;
export type ScheduleUpdateInput = z.infer<typeof scheduleUpdateSchema>;