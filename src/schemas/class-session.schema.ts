import { z } from "zod";

// Complete ClassSessionSchema with all required fields
export const ClassSessionSchema = z.object({
  classId: z.string(),
  date: z.date(),
  startTime: z.date(),
  endTime: z.date(),
  duration: z.date().optional(),
  teacherId: z.string().max(50),
  studentId: z.string().max(50),
  subjectId: z.string().max(50),
  subjectTypeId: z.string().max(50), // <-- required
  boothId: z.string().max(50),
  classTypeId: z.string().max(50),
  templateId: z.string().max(50).optional(),
  notes: z.string().max(255).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for creating a new standalone class session
export const CreateClassSessionSchema = z.object({
  date: z
    .string()
    .transform((val) => new Date(val)),
  startTime: z.string(),
  endTime: z.string(),
  teacherId: z.string().max(50),
  studentId: z.string().max(50),
  subjectId: z.string().max(50),
  subjectTypeId: z.string().max(50), // Added subjectTypeId to align with schema.prisma
  boothId: z.string().max(50),
  classTypeId: z.string().max(50),
  notes: z.string().max(255).optional(),
}).strict();

// Schema for creating a new class session from a template
export const CreateClassSessionFromTemplateSchema = z.object({
  templateId: z.string().max(50),
  date: z
    .string()
    .transform((val) => new Date(val)),
  startTime: z.string().optional(), // Optional override
  endTime: z.string().optional(), // Optional override
  boothId: z.string().max(50).optional(), // Optional override
  notes: z.string().max(255).optional(),
}).strict();

// Schema for updating a standalone class session (all fields can be modified)
export const UpdateStandaloneClassSessionSchema = z.object({
  classId: z.string(),
  date: z
    .string()
    .transform((val) => new Date(val))
    .optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  teacherId: z.string().max(50).optional(),
  studentId: z.string().max(50).optional(),
  subjectId: z.string().max(50).optional(),
  subjectTypeId: z.string().max(50).optional(), // <-- Add this line
  boothId: z.string().max(50).optional(),
  classTypeId: z.string().max(50).optional(),
  notes: z.string().max(255).optional(),
}).strict();

// Schema for updating a template-based class session (only specific fields can be modified)
export const UpdateTemplateClassSessionSchema = z.object({
  classId: z.string(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  boothId: z.string().max(50).optional(),
  subjectTypeId: z.string().max(50).optional(),
  notes: z.string().max(255).optional(),
}).strict();

// Schema for retrieving a single class session by ID
export const ClassSessionIdSchema = z.object({
  classId: z.string(),
}).strict();

// Schema for querying class sessions with filtering, pagination, and sorting
// Updated to support both single values and arrays of values for filter fields
export const ClassSessionQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  date: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  teacherId: z.union([z.string(), z.array(z.string())]).optional(),
  studentId: z.union([z.string(), z.array(z.string())]).optional(),
  subjectId: z.union([z.string(), z.array(z.string())]).optional(),
  subjectTypeId: z.union([z.string(), z.array(z.string())]).optional(), // Fixed missing optional()
  boothId: z.union([z.string(), z.array(z.string())]).optional(),
  classTypeId: z.union([z.string(), z.array(z.string())]).optional(),
  templateId: z.union([z.string(), z.array(z.string())]).optional(),
  dayOfWeek: z.union([
    z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
    z.array(z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]))
  ]).optional(),
  isTemplateInstance: z.enum(["true", "false"]).optional(),
  sort: z.enum(["date", "startTime", "endTime", "createdAt", "updatedAt"]).optional().default("date"),
  order: z.enum(["asc", "desc"]).optional().default("asc"),
}).strict();

// TypeScript types derived from the schemas
export type ClassSession = z.infer<typeof ClassSessionSchema>;
export type CreateClassSessionInput = z.infer<typeof CreateClassSessionSchema>;
export type CreateClassSessionFromTemplateInput = z.infer<typeof CreateClassSessionFromTemplateSchema>;
export type UpdateStandaloneClassSessionInput = z.infer<typeof UpdateStandaloneClassSessionSchema>;
export type UpdateTemplateClassSessionInput = z.infer<typeof UpdateTemplateClassSessionSchema>;
export type ClassSessionQuery = z.infer<typeof ClassSessionQuerySchema>;
