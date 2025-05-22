// src/schemas/student.schema.ts
import { z } from "zod";

export const studentBaseSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  kanaName: z.string().max(100).optional().nullable(),
  studentTypeId: z.string().optional().nullable(),
  gradeYear: z.number().int().positive().optional().nullable(),
  lineId: z.string().max(50).optional().nullable(),
  notes: z.string().max(255).optional().nullable(),
  // User account related fields
  username: z.string().min(3, "Username must be at least 3 characters"),
  // Password is optional in the base form schema, required by create/update schemas
  password: z
    .string()
    .refine((value) => value.length === 0 || value.length >= 6, {
      message:
        "Password must be at least 6 characters if provided, or leave empty to keep unchanged.",
    })
    .optional()
    .nullable(),
  email: z.string().email("Invalid email format").optional().nullable(),
  branchIds: z.array(z.string()).optional(),
});

export const studentFormSchema = studentBaseSchema.extend({
  studentId: z.string().optional(),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;

export const studentCreateSchema = studentBaseSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"), // Password is required for creation
});

export const studentUpdateSchema = studentBaseSchema
  .partial() // Make all base fields optional for update
  .extend({ // Ensure studentId is required for update
    studentId: z.string({ required_error: "Student ID is required for updates" }),
    // Password from studentBaseSchema.partial() is now correctly optional
    // and allows an empty string (for no change) or a min 6 char string if provided.
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
