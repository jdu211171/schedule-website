// src/schemas/class-session.schema.ts
import { z } from "zod";

// Schema for creating a new class session
export const classSessionCreateSchema = z.object({
  teacherId: z.string().optional().nullable(),
  studentId: z.string().optional().nullable(),
  subjectId: z.string().optional().nullable(),
  classTypeId: z.string().optional().nullable(),
  boothId: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
  date: z.string(), // Accept as string "YYYY-MM-DD"
  startTime: z.string(), // Format: "HH:MM"
  endTime: z.string(), // Format: "HH:MM"
  duration: z.number().int().optional(),
  notes: z.string().max(255).optional().nullable(),
  // Recurring session fields
  isRecurring: z.boolean().optional().default(false),
  startDate: z.string().optional(), // When recurring sessions begin "YYYY-MM-DD"
  endDate: z.string().optional(), // When recurring sessions end "YYYY-MM-DD"
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(), // 0 = Sunday, 6 = Saturday
});

// Schema for updating an existing class session
export const classSessionUpdateSchema = z.object({
  classId: z.string(),
  teacherId: z.string().optional().nullable(),
  studentId: z.string().optional().nullable(),
  subjectId: z.string().optional().nullable(),
  classTypeId: z.string().optional().nullable(),
  boothId: z.string().optional().nullable(),
  date: z.string().optional(), // "YYYY-MM-DD"
  startTime: z.string().optional(), // Format: "HH:MM"
  endTime: z.string().optional(), // Format: "HH:MM"
  duration: z.number().int().optional().nullable(),
  notes: z.string().max(255).optional().nullable(),
});

// Schema for updating a recurring class session series
export const classSessionSeriesUpdateSchema = z.object({
  seriesId: z.string(),
  teacherId: z.string().optional().nullable(),
  studentId: z.string().optional().nullable(),
  subjectId: z.string().optional().nullable(),
  classTypeId: z.string().optional().nullable(),
  boothId: z.string().optional().nullable(),
  startTime: z.string().optional(), // Format: "HH:MM"
  endTime: z.string().optional(), // Format: "HH:MM"
  duration: z.number().int().optional().nullable(),
  notes: z.string().max(255).optional().nullable(),
});

// Filters for querying class sessions
export const classSessionFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  userId: z.string().optional(),
  teacherId: z.string().optional(),
  studentId: z.string().optional(),
  subjectId: z.string().optional(),
  classTypeId: z.string().optional(),
  boothId: z.string().optional(),
  branchId: z.string().optional(),
  startDate: z.string().optional(), // "YYYY-MM-DD"
  endDate: z.string().optional(), // "YYYY-MM-DD"
  seriesId: z.string().optional(),
});

export type ClassSessionCreate = z.infer<typeof classSessionCreateSchema>;
export type ClassSessionUpdate = z.infer<typeof classSessionUpdateSchema>;
export type ClassSessionSeriesUpdate = z.infer<
  typeof classSessionSeriesUpdateSchema
>;
export type ClassSessionFilter = z.infer<typeof classSessionFilterSchema>;
