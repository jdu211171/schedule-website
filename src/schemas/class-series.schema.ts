// src/schemas/class-series.schema.ts
import { z } from "zod";

// Conflict policy stored on ClassSeries to control how generation marks sessions
// as CONFLICTED. By default, only hard overlaps mark CONFLICTED; availability
// mismatches remain CONFIRMED but can be elevated via this policy.
export const seriesMarkAsConflictedSchema = z
  .object({
    TEACHER_CONFLICT: z.boolean().optional(),
    STUDENT_CONFLICT: z.boolean().optional(),
    BOOTH_CONFLICT: z.boolean().optional(),
    TEACHER_UNAVAILABLE: z.boolean().optional(),
    STUDENT_UNAVAILABLE: z.boolean().optional(),
    TEACHER_WRONG_TIME: z.boolean().optional(),
    STUDENT_WRONG_TIME: z.boolean().optional(),
    NO_SHARED_AVAILABILITY: z.boolean().optional(),
  })
  .partial()
  .default({});

export const classSeriesConflictPolicySchema = z
  .object({
    markAsConflicted: seriesMarkAsConflictedSchema.optional().default({}),
    // Optional: UI behavior knobs already used in code paths
    allowOutsideAvailability: z
      .object({
        teacher: z.boolean().optional(),
        student: z.boolean().optional(),
      })
      .partial()
      .optional(),
  })
  .partial()
  .optional()
  .nullable();

const timeRegex = /^\d{2}:\d{2}$/; // HH:mm
const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD

export const classSeriesCreateSchema = z.object({
  branchId: z.string().optional().nullable(),
  teacherId: z.string().optional().nullable(),
  studentId: z.string().optional().nullable(),
  subjectId: z.string().optional().nullable(),
  classTypeId: z.string().optional().nullable(),
  boothId: z.string().optional().nullable(),
  startDate: z.string().regex(dateRegex),
  endDate: z.string().regex(dateRegex).optional().nullable(),
  startTime: z.string().regex(timeRegex),
  endTime: z.string().regex(timeRegex),
  duration: z.number().int().optional().nullable(),
  daysOfWeek: z.array(z.number().int()).min(1),
  status: z.string().optional(),
  lastGeneratedThrough: z.string().regex(dateRegex).optional().nullable(),
  conflictPolicy: classSeriesConflictPolicySchema,
  notes: z.string().max(255).optional().nullable(),
});

export const classSeriesUpdateSchema = z.object({
  branchId: z.string().optional().nullable(),
  teacherId: z.string().optional().nullable(),
  studentId: z.string().optional().nullable(),
  subjectId: z.string().optional().nullable(),
  classTypeId: z.string().optional().nullable(),
  boothId: z.string().optional().nullable(),
  startDate: z.string().regex(dateRegex).optional(),
  endDate: z.string().regex(dateRegex).optional().nullable(),
  startTime: z.string().regex(timeRegex).optional(),
  endTime: z.string().regex(timeRegex).optional(),
  duration: z.number().int().optional().nullable(),
  daysOfWeek: z.array(z.number().int()).optional(),
  status: z.string().optional(),
  lastGeneratedThrough: z.string().regex(dateRegex).optional().nullable(),
  conflictPolicy: classSeriesConflictPolicySchema,
  notes: z.string().max(255).optional().nullable(),
});

export type ClassSeriesUpdate = z.infer<typeof classSeriesUpdateSchema>;
export type ClassSeriesCreate = z.infer<typeof classSeriesCreateSchema>;
export type ClassSeriesConflictPolicy = z.infer<
  typeof classSeriesConflictPolicySchema
>;
