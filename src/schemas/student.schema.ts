// src/schemas/student.schema.ts
import { z } from "zod";

export const studentCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  kanaName: z.string().max(100).optional().nullable(),
  studentTypeId: z.string().optional().nullable(),
  gradeYear: z.number().int().positive().optional().nullable(),
  lineId: z.string().max(50).optional().nullable(),
  notes: z.string().max(255).optional().nullable(),
  // User account related fields
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email format").optional().nullable(),
  branchIds: z.array(z.string()).optional(),
});

export const studentUpdateSchema = studentCreateSchema.partial().extend({
  studentId: z.string(),
});

export const studentFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  name: z.string().optional(),
  studentTypeId: z.string().optional(),
  gradeYear: z.coerce.number().int().optional(),
});

export type StudentCreate = z.infer<typeof studentCreateSchema>;
export type StudentUpdate = z.infer<typeof studentUpdateSchema>;
export type StudentFilter = z.infer<typeof studentFilterSchema>;
