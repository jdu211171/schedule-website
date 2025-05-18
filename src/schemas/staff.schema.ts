// src/schemas/staff.schema.ts
import { z } from "zod";

export const staffCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email format"),
});

export const staffUpdateSchema = staffCreateSchema.partial().extend({
  id: z.string(),
});

export const staffFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  name: z.string().optional(),
});

export type StaffCreate = z.infer<typeof staffCreateSchema>;
export type StaffUpdate = z.infer<typeof staffUpdateSchema>;
export type StaffFilter = z.infer<typeof staffFilterSchema>;
