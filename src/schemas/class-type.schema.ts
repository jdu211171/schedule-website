// src/schemas/class-type.schema.ts
import { z } from "zod";

export const classTypeCreateSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(100),
  notes: z.string().max(255).optional().nullable(),
  parentId: z.string().optional().nullable(),
});

export const classTypeUpdateSchema = z.object({
  classTypeId: z.string(),
  name: z.string().min(1, "名前は必須です").max(100).optional(),
  notes: z.string().max(255).optional().nullable(),
  parentId: z.string().optional().nullable(),
});

export const classTypeFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  name: z.string().optional(),
  parentId: z.string().optional().nullable(), // Filter by parent ID
  includeChildren: z.coerce.boolean().default(false), // Include children in response
  includeParent: z.coerce.boolean().default(false), // Include parent in response
});

export type ClassTypeCreate = z.infer<typeof classTypeCreateSchema>;
export type ClassTypeUpdate = z.infer<typeof classTypeUpdateSchema>;
export type ClassTypeFilter = z.infer<typeof classTypeFilterSchema>;
