import { z } from "zod";

// Schema for creating an exceptional ClassSession (templateId is null)
export const classSessionCreateSchema = z.object({
  date: z.date({ message: "Date must be a valid date" }),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}:\d{2}$/, "Start time must be in HH:MM:SS format"),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}:\d{2}$/, "End time must be in HH:MM:SS format"),
  duration: z
    .string()
    .regex(/^\d{2}:\d{2}:\d{2}$/, "Duration must be in HH:MM:SS format")
    .optional(),
  teacherId: z.string().max(50, "Teacher ID must be 50 characters or less"),
  studentId: z.string().max(50, "Student ID must be 50 characters or less"), // For immediate enrollment
  subjectId: z.string().max(50, "Subject ID must be 50 characters or less"),
  boothId: z.string().max(50, "Booth ID must be 50 characters or less"),
  classTypeId: z
    .string()
    .max(50, "Class Type ID must be 50 characters or less"),
  templateId: z
    .string()
    .max(50, "Template ID must be 50 characters or less")
    .optional(),
  notes: z.string().max(255, "Notes must be 255 characters or less").optional(),
});

// Schema for updating a ClassSession
export const classSessionUpdateSchema = classSessionCreateSchema
  .partial()
  .extend({
    classId: z.string().cuid({ message: "Invalid Class ID" }),
  });

// Schema for generating ClassSessions from RegularClassTemplate
export const generateClassSessionsSchema = z.object({
  startDate: z.date({ message: "Start date must be a valid date" }),
  endDate: z.date({ message: "End date must be a valid date" }),
});

// Add a comprehensive ClassSession schema
export const classSessionSchema = z.object({
  classId: z.string(),
  date: z.date(),
  startTime: z.date(),
  endTime: z.date(),
  duration: z.date().nullable(),
  teacherId: z.string(),
  studentId: z.string(),
  subjectId: z.string(),
  boothId: z.string(),
  classTypeId: z.string(),
  templateId: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ClassSessionCreateInput = z.infer<typeof classSessionCreateSchema>;
export type ClassSessionUpdateInput = z.infer<typeof classSessionUpdateSchema>;
export type GenerateClassSessionsInput = z.infer<
  typeof generateClassSessionsSchema
>;
export type ClassSession = z.infer<typeof classSessionSchema>;
