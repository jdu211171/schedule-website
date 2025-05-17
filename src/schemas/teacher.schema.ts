// src/schemas/teacher.schema.ts
import { z } from "zod";

export const teacherCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  kanaName: z.string().max(100).optional().nullable(),
  email: z.string().email("Invalid email format").optional().nullable(),
  lineId: z.string().max(50).optional().nullable(),
  notes: z.string().max(255).optional().nullable(),
  // User account related fields
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const teacherUpdateSchema = teacherCreateSchema.partial().extend({
  teacherId: z.string(),
});

export const teacherFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  name: z.string().optional(),
});

export type TeacherCreate = z.infer<typeof teacherCreateSchema>;
export type TeacherUpdate = z.infer<typeof teacherUpdateSchema>;
export type TeacherFilter = z.infer<typeof teacherFilterSchema>;
