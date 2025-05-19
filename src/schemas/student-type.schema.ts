// src/schemas/studentType.schema.ts
import { z } from "zod";

export const studentTypeCreateSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(100),
  maxYears: z.number().int().min(1).optional().nullable(),
  description: z.string().max(255).optional().nullable(),
});

export const studentTypeUpdateSchema = z.object({
  studentTypeId: z.string(),
  name: z.string().min(1, "名前は必須です").max(100).optional(),
  maxYears: z.number().int().min(1).optional().nullable(),
  description: z.string().max(255).optional().nullable(),
});

export const studentTypeFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  name: z.string().optional(),
});

export type StudentTypeCreate = z.infer<typeof studentTypeCreateSchema>;
export type StudentTypeUpdate = z.infer<typeof studentTypeUpdateSchema>;
export type StudentTypeFilter = z.infer<typeof studentTypeFilterSchema>;
