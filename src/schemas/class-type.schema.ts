// src/schemas/class-type.schema.ts
import { z } from "zod";

export const classTypeCreateSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(100),
  notes: z.string().max(255).optional().nullable(),
  branchId: z.string().optional(), // Optional for admin, will be populated from context
});

export const classTypeUpdateSchema = z.object({
  classTypeId: z.string(),
  name: z.string().min(1, "名前は必須です").max(100).optional(),
  notes: z.string().max(255).optional().nullable(),
});

export const classTypeFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  name: z.string().optional(),
  branchId: z.string().optional(),
});

export type ClassTypeCreate = z.infer<typeof classTypeCreateSchema>;
export type ClassTypeUpdate = z.infer<typeof classTypeUpdateSchema>;
export type ClassTypeFilter = z.infer<typeof classTypeFilterSchema>;
